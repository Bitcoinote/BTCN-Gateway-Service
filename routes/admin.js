const Router = require('koa-router')
const koaAuth = require('koa-basic-auth')
const txDatabase = require('../lib/txDatabase')
const walletIntegration = require('../lib/walletIntegration')
const { txProjection, isWalletInSync } = require('../lib/utils')

module.exports = () => {
  const router = new Router({prefix: '/admin'})

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

  router.get('/', async ctx => {
    let balance = null
    let height = null
    if (await isWalletInSync()) {
      try {
        balance = await walletIntegration.getBalance()
      } catch (e) {
        console.error('Wallet error', e)
      }
    }
    try {
      height = await walletIntegration.getHeight()
    } catch (e) {}
    await ctx.render('admin', {
      transactions: await txDatabase.getAll(),
      balance,
      height,
      txProjection,
      SATOSHI_MULTIPLIER: walletIntegration.SATOSHI_MULTIPLIER,
      ALLOW_FORM_SUBMIT: !!Number(process.env.ALLOW_FORM_SUBMIT)
    })
  })

  router.get('/testForm', async ctx => {
    await ctx.render('testForm', { BASE_URL: process.env.BASE_URL })
  })

  return router.middleware()
}
