require('dotenv').config()

const path = require('path')

const Koa = require('koa')
const convert = require('koa-convert')
const app = new Koa()
app.proxy = true // Allow X-Forwarded-For

const koaLogger = require('koa-logger')
app.use(koaLogger())

const bodyParser = require('koa-bodyparser')
app.use(bodyParser())

const override = require('koa-override')
app.use(override())

const render = require('koa-ejs')
render(app, {
  root: path.join(__dirname, 'views'),
  layout: false,
  viewExt: 'ejs',
  cache: false
})

app.use(require('./routes')())

const koaStatic = require('koa-better-static')
app.use(convert(koaStatic('public')))

require('./lib/txDatabase').load().then(() => {
  const port = process.env.PORT || 8080
  app.listen(port)
  console.log(`Listening on port ${port}`)

  const bgUpdate = require('./lib/bgUpdate')
  bgUpdate.initialize()

  console.log('Ready')
}).catch(e => setImmediate(() => { throw e }))
