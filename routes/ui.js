const Router = require('koa-router')
const txDatabase = require('../lib/txDatabase')
const walletIntegration = require('../lib/walletIntegration')
const { createTransactionFromRequest, getStatusUrl, isWalletInSync } = require('../lib/utils')

module.exports = () => {
  const router = new Router({prefix: ''})

  router.get('/', async ctx => {
    ctx.body = 'I am alive'
  })

  router.post('/pay', async ctx => {
    if (!Number(process.env.ALLOW_FORM_SUBMIT)) {
      ctx.status = 403
      ctx.body = 'Access denied'
      return
    }

    // First verify that the wallet is working
    if (!await isWalletInSync()) throw new Error('Wallet is broken')

    const tx = await createTransactionFromRequest(ctx.request.body)
    ctx.redirect(getStatusUrl(tx))
  })

  router.get('/tx/:id/:secret', async ctx => {
    const tx = await txDatabase.getByPaymentId(ctx.params.id)
    if (!tx) return
    if (ctx.params.secret !== tx.userSecret) {
      ctx.status = 403
      ctx.body = 'Access denied'
      return
    }

    let redirectUrl
    if (tx.status === 'completed' && tx.successRedirectUrl) {
      redirectUrl = tx.successRedirectUrl + (tx.successRedirectUrl.match(/\?/) ? '&' : '?') + 'paymentId=' + encodeURIComponent(tx.id)
    } else if (tx.status === 'expired' || tx.status === 'cancelled') {
      redirectUrl = tx.errorRedirectUrl + (tx.errorRedirectUrl.match(/\?/) ? '&' : '?') + 'paymentId=' + encodeURIComponent(tx.id) + '&status=' + encodeURIComponent(tx.status)
    }

    await ctx.render('status', {
      tx,
      redirectUrl,
      SATOSHI_MULTIPLIER: walletIntegration.SATOSHI_MULTIPLIER,
      LOGO_URL: process.env.LOGO_URL,
      BTCN_WALLET_ADDRESS: process.env.BTCN_WALLET_ADDRESS
    })
  })

  router.post('/tx/:id/:secret/cancel', async ctx => {
    const tx = await txDatabase.getByPaymentId(ctx.params.id)
    if (!tx) return
    if (ctx.params.secret !== tx.userSecret || !tx.allowUserCancel || tx.received > 0) {
      ctx.status = 403
      ctx.body = 'Access denied'
      return
    }
    if (tx.status === 'pending') {
      tx.status = 'cancelled'
      await txDatabase.save()
    }
    ctx.body = tx.status
  })

  return router.middleware()
}
