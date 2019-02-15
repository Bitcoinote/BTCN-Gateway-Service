'use strict'

/*
 * Requires BTCN CLI simplewallet v2.0.0+
 * Must first start daemon (Bitcoinoted) and then simplewallet in RPC mode:
 *   simplewallet --rpc-bind-port 8071 --wallet-file path/to/wallet --password walletpass
 * Expects BTCN_WALLET_RPC_URL like "http://127.0.0.1:8071/json_rpc" and BTCN_WALLET_ADDRESS
 */

const { JsonRpcClient } = require('./jsonRpc')

if (!process.env.BTCN_WALLET_RPC_URL) throw new Error('BTCN Wallet RPC URL not defined in environment!')
if (!process.env.BTCN_WALLET_ADDRESS) throw new Error('BTCN Wallet address not defined in environment!')

class BitcoiNoteWalletIntegration {
  constructor () {
    this.rpc = new JsonRpcClient(process.env.BTCN_WALLET_RPC_URL)
    this.SATOSHI_MULTIPLIER = 10 ** 8
  }

  async getBalance ({ asSatoshi = false } = {}) {
    const response = await this.rpc.call('getbalance')

    return {
      available: response.available_balance / (asSatoshi ? 1 : this.SATOSHI_MULTIPLIER),
      locked: response.locked_amount / (asSatoshi ? 1 : this.SATOSHI_MULTIPLIER)
    }
  }

  async getHeight () {
    const { height } = await this.rpc.call('get_height')

    return height
  }

  async transfer ({ address, amount, fee = 0.03, mixin = 3, paymentId, asSatoshi = false } = {}) { // Note: fee is required to be specified if asSatoshi = true
    const txDetails = {
      destinations: [{ address, amount: Math.round(amount * (asSatoshi ? 1 : this.SATOSHI_MULTIPLIER)) }],
      fee: Math.round(fee * (asSatoshi ? 1 : this.SATOSHI_MULTIPLIER)),
      mixin,
      unlock_time: 0,
      payment_id: paymentId
    }
    console.log('BTCN transaction details:', txDetails)
    const response = await this.rpc.call('transfer', txDetails)

    console.log('BTCN transaction ID:', response.tx_hash)
    return response.tx_hash
  }

  async getPayments ({ paymentId, asSatoshi = false } = {}) {
    const { payments } = await this.rpc.call('get_payments', { payment_id: paymentId })
    return payments.filter(p => p.unlock_time === 0).map(p => ({ // We currently don't support transactions with unlock time
      amount: p.amount / (asSatoshi ? 1 : this.SATOSHI_MULTIPLIER),
      blockHeight: p.block_height,
      txId: p.tx_hash
    }))
  }

  async getWalletAddress () {
    return process.env.BTCN_WALLET_ADDRESS
  }
}

module.exports = new BitcoiNoteWalletIntegration()
