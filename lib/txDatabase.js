'use strict'

const fse = require('fs-extra')
const AsyncLock = require('async-lock')
const lock = new AsyncLock()

if (!process.env.TRANSACTIONS_FILE) throw new Error('Transactions file not defined in environment')

let transactions = null

async function load () {
  if (!await fse.exists(process.env.TRANSACTIONS_FILE)) {
    transactions = []
    await save()
  }
  return lock.acquire('file', async () => {
    transactions = await fse.readJSON(process.env.TRANSACTIONS_FILE)
  })
}

async function save () {
  if (!transactions) throw new Error('Transactions not loaded')
  return lock.acquire('file', async () => {
    await fse.writeJSON(process.env.TRANSACTIONS_FILE, transactions)
  })
}

async function getAll () {
  if (!transactions) throw new Error('Transactions not loaded')
  return [].concat(transactions).sort((a, b) => b.createdAt - a.createdAt)
}

async function getByPaymentId (id) {
  if (!transactions) throw new Error('Transactions not loaded')
  return transactions.find(tx => tx.id === id)
}

async function deleteByPaymentId (id) {
  if (!transactions) throw new Error('Transactions not loaded')
  const index = transactions.findIndex(tx => tx.id === id)
  if (index !== -1) {
    transactions.splice(index, 1)
    await save()
    return true
  } else {
    return false
  }
}

async function add (tx) {
  if (!transactions) throw new Error('Transactions not loaded')
  if (await getByPaymentId(tx.id)) throw new Error('Payment ID must be unique')
  transactions.push(tx)
  await save()
}

module.exports = { getAll, getByPaymentId, deleteByPaymentId, add, load, save }
