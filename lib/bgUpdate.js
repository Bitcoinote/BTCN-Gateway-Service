'use strict'

const txDatabase = require('./txDatabase')
const rp = require('request-promise-native')
const walletIntegration = require('./walletIntegration')
const crypto = require('crypto')
const { txProjection } = require('./utils')

function update () {
  if (update.running) return
  (async () => {
    try {
      update.running = true

      // Do sweep if needed
      if (process.env.SWEEP_MINIMUM && process.env.SWEEP_TARGET) {
        const balance = await walletIntegration.getBalance()
        if (balance.available > process.env.SWEEP_MINIMUM) {
          // Try with different mixins
          console.log(`Sweeping wallet - sending ${balance.available - 1} BTCN to ${process.env.SWEEP_TARGET}`)
          try {
            for (let mixin = 6; mixin >= 0; mixin--) {
              try {
                const txId = await walletIntegration.transfer({
                  address: process.env.SWEEP_TARGET,
                  amount: balance.available - 0.0101,
                  fee: 0.01,
                  mixin
                })
                console.log(`Sweep successful, BTCN TX ID: ${txId}`)
                break
              } catch (e) {
                if (e.rpcError && e.rpcError.code === -4) { // "Mixin too big" error
                  continue
                } else {
                  throw e
                }
              }
            }
          } catch (e) {
            console.error(`Sweeping wallet failed!`, e)
          }
        }
      }

      await txDatabase.load() // For good measure

      // Update TXs
      for (const tx of await txDatabase.getAll()) {
        // Delete old transactions
        if (tx.createdAt < Date.now() - process.env.TRANSACTIONS_TTL * 1000) {
          console.log(`Deleting old transaction ${tx.id}`)
          await txDatabase.deleteByPaymentId(tx.id)
          continue
        }

        // Check for expired transactions
        if (tx.status === 'pending' && tx.createdAt < Date.now() - process.env.TRANSACTIONS_EXPIRATION_TIMER * 1000) {
          console.log(`Expiring transaction ${tx.id}`)
          tx.status = 'expired'
          tx.toBeRefunded = tx.received
          await txDatabase.save()
          continue
        }

        // Update status of pending transactions
        if (tx.status === 'pending') {
          const payments = await walletIntegration.getPayments({ paymentId: tx.id, asSatoshi: true })
          tx.btcnTxIds = payments.map(p => p.txId)
          tx.received = payments.reduce((agg, curr) => agg + curr.amount, 0)
          if (tx.received >= tx.amount) {
            console.log(`Transaction ${tx.id} completed!`)
            tx.toBeRefunded = tx.received - tx.amount
            tx.status = 'completed'
            tx.completedAt = Date.now()
            if (tx.ipnUrl || process.env.IPN_URL) {
              tx.ipnScheduled = true
              tx.ipnTryNumber = 1
              tx.ipnLastTry = 0
            }
          }
          await txDatabase.save()
        }

        // Send IPNs if required
        if (tx.ipnScheduled && tx.ipnLastTry < Date.now() - 60000) {
          const ipnUrl = tx.ipnUrl || process.env.IPN_URL
          console.log(`Sending IPN for ${tx.id} to ${ipnUrl} ...`)
          try {
            const body = JSON.stringify(txProjection(tx))
            await rp({
              method: 'POST',
              uri: ipnUrl,
              headers: {
                'Content-Type': 'application/json',
                'X-IPN-Signature': process.env.IPN_SECRET ? crypto.createHmac('sha256', process.env.IPN_SECRET).update(body).digest('hex') : undefined
              },
              body,
              timeout: 10000
            })
            console.log('IPN successful')
            tx.ipnScheduled = false
          } catch (e) {
            console.warn(`Failed to send IPN for ${tx.id} to ${ipnUrl}`, e)
            tx.ipnTryNumber++
            tx.ipnLastTry = Date.now()

            if (tx.ipnTryNumber > 30) {
              console.warn(`Giving up sending IPN for ${tx.id} to ${ipnUrl}`)
              tx.ipnScheduled = false
            }
          } finally {
            await txDatabase.save()
          }
        }
      }
    } finally {
      update.running = false
    }
  })().catch(e => {
    console.error('Error during background update!')
    setImmediate(() => { throw e }) // Currently we have no idea what else to do
  })
}

function initialize () {
  setInterval(update, 5000)
  update()
}

module.exports = { initialize, update }
