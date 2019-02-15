'use strict'

const rp = require('request-promise-native')
const ExtendableError = require('es6-error')

class RpcError extends ExtendableError {
  constructor (error) {
    super(`RPC call failed: ${JSON.stringify(error)}`)
    this.rpcError = error
  }
}

class JsonRpcClient {
  constructor (url) {
    this.url = url
  }

  async call (method, params = {}) {
    try {
      console.log(`RPC call`, this.url, method, params)
      const response = await rp({
        uri: this.url,
        method: 'POST',
        body: {
          id: '0',
          jsonrpc: '2.0',
          method,
          params
        },
        json: true
      })

      if (response.error) throw new RpcError(response.error)

      console.log(`RPC response`, this.url, method, response)
      return response.result
    } catch (e) {
      console.error(`RPC error`, this.url, method, e)
      throw e
    }
  }
}

module.exports = { JsonRpcClient, RpcError }
