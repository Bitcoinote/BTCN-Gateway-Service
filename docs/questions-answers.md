# Questions & Answers

## It takes very long for the payment to be confirmed, and there is no feedback to the user or the server before that. Can it be made faster?

Unfortunately, the current version of BitcoiNote does not support the functionality which would be required for this. It may be added in a future version.

## How do I access the funds I received?

You need to open the wallet file (which you copied during setup to your computer) with the [BitcoiNote GUI Wallet](https://github.com/Bitcoinote/Bitcoinote-GUI-Wallet/releases) on your computer. Then you can simply transfer money from there to wherever you want.

In case you didn't copy the wallet file during setup, and you used the automatic setup script: Use an SCP/SFTP client to connect to the server and copy the file `/home/ubuntu/app/gateway/wallet/gateway.wallet` to your computer.

Alternatively, you can also enable automatic wallet sweeping as described in the [Advanced Usage](advanced-usage.md) document.

## What happens if a customer sends too little money?

As soon as the too-small payment is confirmed, the status of the transaction is updated to show the received amount. The transaction will still be pending. The payment funnel page will display an updated amount for the customer to pay (only the remaining part of the original amount).

If, however, the transaction expires (after 4 hours by default) before the customer sent the remaining part, the transaction will enter the status "expired" nonetheless, but a red text in the admin interface will indicate that there are funds which need to be refunded to the customer.

## What happens if a customer sends too much money?

The payment completes as normal. However, in the admin interface there will be a red text which indicates that a certain amount needs to be refunded.

## A customer sent money incorrectly (e.g. without payment ID, or when the transaction was already expired) and it was not recognized. How can I verify their payment or refund them?

Access the wallet on your computer, as described above in "How do I access the fnuds I received". You are then able to see all the transactions in the wallet (including those not tracked by gateway) and you can also refund the customer (once they told you their BTCN address).

## Can I customize the payment funnel page?

You can customize the logo by changing the `LOGO_URL` configuration in the `.env` file (see [Config Variables Reference](config-variables-reference.md)).

Additionally, the existence of the "Cancel Transaction" button can be controlled with the `allowUserCancel` parameter during transaction creation.

Other modifications to this page are not possible (unless you fork and modify the code, of course). For further customizations, you can build your own payment funnel/status page which uses the REST API to communicate with the gateway.

## Which currencies are supported by the currency conversion feature?

The currency conversion is performed using the third-party service [CoinGecko](https://www.coingecko.com/). The list of supported input currencies can be found [here](https://api.coingecko.com/api/v3/simple/supported_vs_currencies), it most notably includes `BTC`, `ETH`, `LTC`, `USD`, `EUR`, `GBP` and `JPY` but also many other fiat currencies.

## I cannot get the IPN signature verification implemented correctly. is there another way to verify the transaction data authenticity?

You can also take only the `paymentId` from the IPN request and query the transaction from the REST API instead of trusting the values provided in the IPN request body.

This way it's still ensured that the data you are looking at comes from a trusted source.

-----

[Back to Documentation Overview](index.md)
