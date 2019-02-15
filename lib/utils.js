'use strict'

const walletIntegration = require('./walletIntegration')
const txDatabase = require('./txDatabase')
const rp = require('request-promise-native')
const { BadRequest } = require('http-errors')

function getStatusUrl (tx) {
  return `${process.env.BASE_URL}/tx/${tx.id}/${tx.userSecret}`
}

function txProjection (tx) {
  return tx && {
    paymentId: tx.id,
    status: tx.status,
    createdAt: new Date(tx.createdAt).toISOString(),
    completedAt: tx.completedAt ? new Date(tx.completedAt).toISOString() : null,
    amount: tx.amount / walletIntegration.SATOSHI_MULTIPLIER,
    received: tx.received / walletIntegration.SATOSHI_MULTIPLIER,
    originalAmount: tx.originalAmount,
    originalCurrency: tx.originalCurrency,
    description: tx.description,
    customData: tx.customData,
    statusUrl: getStatusUrl(tx),
    recipientAddress: process.env.BTCN_WALLET_ADDRESS
  }
}

function generatePaymentId () {
  let id = ''
  for (let i = 0; i < 64; i++) id += Math.floor(Math.random() * 16).toString(16)
  return id
}

async function createTransactionFromRequest (params) {
  const tx = {
    id: generatePaymentId(),
    status: 'pending',
    createdAt: Date.now(),
    amount: undefined,
    received: 0,
    toBeRefunded: 0,
    originalAmount: Number(params.amount),
    originalCurrency: String(params.currency || 'BTCN').toUpperCase(),
    description: params.description ? String(params.description) : null,
    customData: params.customData,
    ipnUrl: params.ipnUrl ? String(params.ipnUrl) : null,
    successRedirectUrl: params.successRedirectUrl ? String(params.successRedirectUrl) : null,
    errorRedirectUrl: params.errorRedirectUrl ? String(params.errorRedirectUrl) : null,
    allowUserCancel: ['1', 'true'].includes(String(params.allowUserCancel).toLowerCase()),
    userSecret: String(Math.floor(Math.random() * 1e11)),
    ipnScheduled: false
  }

  if (!(tx.originalAmount > 0)) throw new BadRequest('Amount must be positive')

  if (tx.originalCurrency !== 'BTCN') {
    console.log(`Fetching rate for ${tx.originalCurrency} from CoinGecko...`)
    const geckoResp = await rp({
      uri: 'https://api.coingecko.com/api/v3/simple/price',
      qs: {
        ids: 'bitcoinote',
        vs_currencies: tx.originalCurrency.toLowerCase()
      },
      json: true
    })
    const rate = geckoResp.bitcoinote[tx.originalCurrency.toLowerCase()]
    if (!rate) throw new BadRequest('Unsupported currency')

    tx.amount = walletIntegration.SATOSHI_MULTIPLIER * tx.originalAmount / rate
  } else {
    tx.amount = walletIntegration.SATOSHI_MULTIPLIER * tx.originalAmount
  }

  tx.amount = Math.floor(tx.amount / 10000) * 10000

  console.log('Creating transaction', tx)
  await txDatabase.add(tx)
  return tx
}

async function getPoolBlockHeight () {
  try {
    const resp = await rp({
      uri: 'https://pool.bitcoinote.org/api/stats',
      json: true
    })

    return resp.network.height
  } catch (e) {
    console.warn('Error loading block height from official BTCN pool', e)
  }
}

async function isWalletInSync () {
  try {
    const walletHeight = await walletIntegration.getHeight()
    const poolHeight = await getPoolBlockHeight()
    if (walletHeight < poolHeight - 3) {
      console.warn(`Wallet not in sync: Height ${walletHeight} vs ${poolHeight} at pool.bitcoinote.org`)
      return false
    } else {
      return true
    }
  } catch (e) {
    console.warn('Error checking wallet sync', e)
    return false
  }
}

module.exports = { txProjection, createTransactionFromRequest, generatePaymentId, getStatusUrl, getPoolBlockHeight, isWalletInSync }
