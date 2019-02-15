# API Reference

The gateway exposes a REST API to create and manage transactions.

## Authentication

All endpoints are authenticated with HTTP Basic Auth. The username and password are set in the `.env` file as `CLIENT_AUTH_USERNAME` and `CLIENT_AUTH_PASSWORD`.

## Request and response formats

All endpoints accept either JSON (MIME type `application/json`) or form data (MIME type `application/x-www-form-urlencoded`) as body. (There is only case in which you _have_ to use JSON, and that is when you want to set the `customData` of a transaction to something other than a string.)

The response is JSON if the endpoint returns status code 200 or 201. For other status codes, especially error codes, the response format is undefined (usually plain text).

## Transaction model

Several endpoints return one or more instances of the transaction model.

**Example:**

```json
{
  "paymentId": "17c5bc775867ee422999b477b5402c6c5a756aa1bc8f2e39833b83d412a1935c",
  "status": "pending",
  "createdAt": "2019-02-01T16:30:31.570Z",
  "completedAt": null,
  "amount": 1050.5614,
  "received": 0,
  "originalAmount": 5,
  "originalCurrency": "USD",
  "description": "Chocolate Cake",
  "customData": "order12345678",
  "statusUrl": "http://example.com:38071/tx/17c5bc775867ee422999b477b5402c6c5a756aa1bc8f2e39833b83d412a1935c/21482035126",
  "recipientAddress": "N2bw2dzqLBjfBXQyc3XThF1R4bmd3KXk6TvqBBbNsHwoFxRtt6z3CsqHQtBDgAHLywQmP1iBHNUEfa2q8QEGATjE3rVv7yw"
}
```

**Field description:**

|Field|Meaning|
| --- | --- |
|`paymentId`|Unique ID of this transaction, used throughout the system. Also, this is the ID that must be pasted into the "Payment ID" field in the wallet by the user when doing the payment.|
|`status`|Status of the transaction. Can be either `pending`, `completed`, `expired` or `cancelled`.|
|`createdAt`|Timestamp of transaction creation.|
|`completedAt`|Timestamp of transaction completion (successful payment). Can be null.|
|`amount`|BTCN amount to pay.|
|`received`|BTCN amount received.|
|`originalAmount`|Amount in original currency.|
|`originalCurrency`|Original currency (ISO-code for fiat currencies or crypto symbol).|
|`description`|Description of the transaction, displayed to the user on the payment funnel page. Can be null.|
|`customData`|Custom data passed into the parameter `customData` upon transaction creation. Can be any type.|
|`statusUrl`|Link to the payment funnel/status page for this transaction.|
|`recipientAddress`|Address the user needs to pay to. (This is always equal to the address set as `BTCN_WALLET_ADDRESS` in the `.env` file.)|

## Instant Payment Notifications (IPNs)

When a transaction has an IPN URL (which comes by default from the `IPN_URL` setting in `.env` and can be overridden on a per-transaction basis with the `ipnUrl` parameter upon transaction creation), the gateway will send a `POST`  request to that URL when the transaction was completed.

A transaction is completed when full payment was received and has one confirmation on the blockchain.

The IPN request will have the transaction model as body, as JSON (the same data you would get if you queried the transaction status from the REST API).

If an `IPN_SECRET` is set in the `.env` file (strongly recommended), the IPN request will additionally be signed. The signature is found in the header `X-IPN-Signature` and is an HMAC-SHA256 hash (as hex) of the raw request body signed with the IPN secret as key. The server should verify this signature before trusting the data received. (An alternative is to manually request the given payment ID's status from the REST API.)

The gateway expects the server to return an HTTP response code 200 within 10 seconds. If the request takes longer or a different status is returned, the request is considered failed. The gateway will retry failed IPN requests every minute, up to 30 times.

The server should be tolerant towards duplicate IPN requests and always check its internal status of the given transaction before acting on it.

**node.js example to verify signature:**

```javascript
const crypto = require('crypto')
const IPN_KEY = 'secretKeyGoesHere'

// ...

// Note: This assumes you are using express and express-bodyparser.
// The JSON.stringify here *only* works because the gateway is also
// using node.js and therefore uses the same JSON serialization method.
// Better would be to hash the raw body directly, but when you are
// using express-bodyparser with JSON mode, it's hard to get.
const expectedSignature = crypto
  .createHmac('sha256', IPN_SECRET)
  .update(JSON.stringify(req.body)) // or .update(rawBody)
  .digest('hex')

if (req.get('X-IPN-Signature') !== expectedSignature) {
  throw new Error('Invalid signature')
}
```

**PHP example to verify signature:**

```php
define('IPN_SECRET', 'secretKeyGoesHere');

// ...

$rawBody = file_get_contents("php://input");
$expectedSignature = hash_hmac('sha256', $rawBody, IPN_SECRET);
if ($_SERVER['HTTP_X_IPN_SIGNATURE'] != $expectedSignature) {
  throw new Exception('Invalid signature');
}
```

## REST API Endpoints

### Create transaction: `POST /api/transactions`

This endpoins will create a new transaction based on the input data and return its transaction model.

After using this endpoint, you would usually either redirect the user to the `statusUrl` returned or display instructions to them which indicate that the have to pay `amount` BTCN to address `recipientAddress` with payment ID `paymentId`. (It is very important that the user sets the payment ID as well, otherwise the payment will not be recognized.)

Note that the successful status code is 201 (`Created`).

**Input parameters:**

|Parameter|Meaning|
| --- | --- |
|`amount`|Amount to pay (in specified currency). Must be a positive number, **zero is not allowed**.|
|`currency`|Currency for the specified amount. If omitted, `BTCN` is assumed. **See notes below!**|
|`description`|An optional order description string. This is shown in the admin interface and also displayed to the user on the payment funnel page.|
|`customData`|Optional arbitrary data which is associated with the transaction and returned in the transaction model later. May be of any type (including objects and arrays).|
|`ipnUrl`|URL to send the IPN request to when the payment was successful. If omitted, the `IPN_URL` from the `.env` file is used (if set).|
|`successRedirectUrl`|URL the payment funnel page will redirect to when the payment was successful. The gateway will append a parameter `paymentId` to the URL. If omitted, no redirection occurs (the user just sees a text that says that the payment was completed). **See notes below!**|
|`errorRedirectUrl`|URL the payment funnel page will redirect to when the payment was unsuccessful, either because it expired or it was cancelled. The gateway will append a parameter `paymentId` and also `status` to the URL. `status` can be used to differentiate between expired and cancelled payments. If omitted, no redirection occurs (the user just sees a text that says that the payment was expired/cancelled). **See notes below!**|
|`allowUserCancel`|If set to `true` or `1`, a "Cancel Transaction" button is displayed on the payment funnel page. The user can use this butten to cancel the transaction themselves. They will then be redirected to the `errorRedirectUrl` if set (with `status=cancelled`).|

**Notes about currency conversion:**

The gateway converts the given amount to BTCN automatically. Currency conversion is done using [CoinGecko](https://www.coingecko.com/). The list of supported input currencies can be found [here](https://api.coingecko.com/api/v3/simple/supported_vs_currencies), it most notably includes `BTC`, `ETH`, `LTC`, `USD`, `EUR`, `GBP` and `JPY` but also many other fiat currencies. The currency field is case-insensitive.

It is also possible to specify `BTCN` as currency and specify the BTCN amount directly. In this case, no conversion is done.

Note that the final BTCN amount is always rounded down to the 4th decimal place. This applies even when `BTCN` was specified as source currency.

**Notes about redirect URLs:**

The redirect URLs only serve to guide the user's flow in the browser. They are not supposed to be used to detect server-side that the payment occured! This is because the redirect page may never be opened (if the user closed the browser) or opened several times (if the user goes back to the status page) and of course the query parameters can be tampered with.

Instead, an IPN or API polling should be used to detect successful payment.

The error redirect may be taken as hint to the server to check the transaction status again, but still not as reliable source of information.

**Example:**

```bash
$ curl -XPOST 'http://example.com:38071/api/transactions' -u 'client:password' \
  -H 'Content-Type: application/json' \
  -d '{ \
        "amount": 5, \
        "currency": "USD", \
        "description": "Chocolate Cake", \
        "customData": "order12345678", \
        "ipnUrl": "http://example.com/shop/btcnIpn", \
        "successRedirectUrl": "http://example.com/shop/paymentSuccess", \
        "errorRedirectUrl": "http://example.com/shop/paymentFailure", \
        "allowUserCancel": true \
      }'

{
  "paymentId": "...",
  "status": "...",
  ...
}
```

### List transactions: `GET /api/transactions`

This endpoint will return an array with all transactions stored in the gateway as an array of transaction models, sorted by creation date descending.

It takes two optional query parameters: `limit` to limit the number of results (default is unlimited) and `offset` (zero-based) to implement pagination.

**Example:**

```bash
$ curl 'http://example.com:38071/api/transactions?limit=10' -u 'client:password'

[
  {
    "paymentId": "...",
    "status": "...",
    ...
  },
  {
    "paymentId": "...",
    "status": "...",
    ...
  },
  ...
]
```

### Get transaction: `GET /api/transactions/:id`

This endpoint will return the transaction with the requested payment ID as transaction model.

It will return status code 404 if the transaction was not found.

**Example:**

```bash
$ curl 'http://example.com:38071/api/transactions/abcdef...' -u 'client:password'

{
  "paymentId": "...",
  "status": "...",
  ...
}
```

### Cancel transaction: `POST /api/transactions/:id/cancel`

This endpoint will cancel a transaction if it is in the `pending` state and return the transaction model.

It will return status code 404 if the transaction was not found.

**Example:**

```bash
$ curl -XPOST 'http://example.com:38071/api/transactions/abcdef.../cancel' -u 'client:password'

{
  "paymentId": "...",
  "status": "...",
  ...
}
```

### Delete transaction: `DELETE /api/transactions/:id`

This endpoint will delete a transaction (regardless of its status).

It will return status code 404 if the transaction was not found, otherwise status 204 (`No Content`) is returned.

```bash
$ curl -XDELETE 'http://example.com:38071/api/transactions/abcdef...' -u 'client:password'

$
```

_Method overriding is supported, so this endpoint can also be called as `POST` with a body parameter `_method=DELETE`._

-----

Continue reading: [Form Submit Functionality](form-submit.md)

[Back to Documentation Overview](index.md)
