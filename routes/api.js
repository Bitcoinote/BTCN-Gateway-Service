const Router = require('koa-router')
const koaAuth = require('koa-basic-auth')
const txDatabase = require('../lib/txDatabase')
const { txProjection, createTransactionFromRequest, isWalletInSync } = require('../lib/utils')
const { BadRequest } = require('http-errors')

module.exports = () => {
  const router = new Router({prefix: '/api'})

  router.use(async (ctx, next) => {
    try {
      await next()
    } catch (e) {
      if (e.status === 401) {
        ctx.status = 401
        ctx.set('WWW-Authenticate', 'Basic')
        ctx.body = 'Unauthorized (please log in)'
      } else {
        throw e
      }
    }
  })
  router.use(koaAuth({
    name: process.env.CLIENT_AUTH_USERNAME,
    pass: process.env.CLIENT_AUTH_PASSWORD
  }))

  router.get('/transactions', async ctx => {
    ctx.body = (await txDatabase.getAll()).slice(ctx.query.offset || 0, ctx.query.limit ? (ctx.query.offset || 0) + ctx.query.limit : undefined).map(txProjection)
  })

  router.get('/transactions/:id', async ctx => {
    const tx = await txDatabase.getByPaymentId(ctx.params.id)
    if (!tx) return
    ctx.body = txProjection(tx)
  })

  router.post('/transactions', async ctx => {
    // First verify that the wallet is working
    if (!await isWalletInSync()) throw new Error('Wallet is broken')

    ctx.status = 201
    ctx.body = txProjection(await createTransactionFromRequest(ctx.request.body))
  })

  router.post('/transactions/:id/cancel', async ctx => {
    const tx = await txDatabase.getByPaymentId(ctx.params.id)
    if (!tx) return
    if (tx.status !== 'pending') throw new BadRequest('Only pending transactions can be cancelled')

    tx.status = 'cancelled'
    tx.toBeRefunded = tx.received
    await txDatabase.save()
    ctx.body = txProjection(tx)
  })

  router.delete('/transactions/:id', async ctx => {
    const deleted = await txDatabase.deleteByPaymentId(ctx.params.id)
    if (deleted) {
      ctx.status = 204
    }
  })

  return router.middleware()
}
