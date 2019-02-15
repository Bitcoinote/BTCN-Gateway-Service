const compose = require('koa-compose')

module.exports = () => {
  return compose([
    require('./api')(),
    require('./ui')(),
    require('./admin')()
  ])
}
