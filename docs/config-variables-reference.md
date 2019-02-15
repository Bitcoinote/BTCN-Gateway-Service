# Config Variables Reference

In the `.env` file, a number of settings for the gateway can be configured.

All available settings are listed below.

|Parameter|Meaning|Details|
| --- | --- | --- |
|`BASE_URL`|Public URL of the gateway application|This URL is used for the payment funnel/status page. It must be the URL under which the gateway application is reachable over the Internet. Without reverse proxy, this may be simple the IP or domain of the gateway server and the port, e.g. `http://example.com:38071`. With a reverse proxy for SSL termination in place, this would be the URL of the reverse proxy, e.g. `https://pay.example.com`.|
|`PORT`|Port the gateway application is listening on|Default is `38071`.
|`LOGO_URL`|URL to the logo displayed on the payment funnel/status page|The default (`/images/btcn-logo.png`) shows the BTCN logo. You can however specify the URL to your own logo here so that the user sees your shop's logo on the payment funnel page instead.|
|`BTCN_WALLET_RPC_URL`|RPC URL of the BTCN `simplewallet`|The default is `http://127.0.0.1:8071/json_rpc`. It is possible to run the wallet on a separate server, in which case authentication (using a reverse proxy) would be vital. This parameter supports basic auth inside the URL.
|`BTCN_WALLET_ADDRESS`|Address of the gateway's wallet|This is the address users are asked to pay to, it's important to set this parameter correctly.|
|`TRANSACTIONS_FILE`|File where the transactions database is stored|The default is `./transactions.json`. You can change this if you have a setup where you want to write-protect the application directory.|
|`TRANSACTIONS_TTL`|Time-to-live for transactions (in seconds)|Transactions are kept only for the specified time. Afterwards, they are deleted. The default is `2592000` (30 days).|
|`TRANSACTIONS_EXPIRATION_TIMER`|Time after which transactions expire (in seconds)|Pending transactions automatically expire after the specified timeframe and will then no longer be tracked. The default is `21600` (4 hours).|
|`CLIENT_AUTH_USERNAME`|Username for API/admin authentication|Default is `client`.|
|`CLIENT_AUTH_PASSWORD`|Password for API/admin authentication| |
|`SWEEP_MINIMUM`|Minimum BTCN balance after which the funds will be swept|Whenever the gateway wallet balance reaches the defined minimum, a transfer of all the funds (except for 0.0001 BTCN) will be made to the sweep target wallet, if defined.|
|`SWEEP_TARGET`|Address of the wallet to which swept funds are sent|You can specify the address of anther wallet that you own here, this will activate the sweeping feature. Once the `SWEEP_MINIMUM` was reached, all funds are sent to this wallet.|
|`IPN_URL`|Default IPN URL|Optionally set a default IPN URL here to which IPNs will be sent when no IPN URL is configured during transaction creation.|
|`IPN_SECRET`|Secret key for IPN signing|Set a secret key here which is used to create a HMAC-SHA256 signature of the IPN content. The IPN receiver can use it to verify that the IPN was really sent by the gateway and not by an attacker.|
|`ALLOW_FORM_SUBMIT`|Whether to allow transaction creation through form submission|Set to `0` to disable or `1` to enable (default). You may choose to disable this if you don't intend to use this functionality and want to protect yourself from transaction spamming DoS attacks through the form submit endpoint.|

-----

Continue reading: [API Reference](api-reference.md)

[Back to Documentation Overview](index.md)
