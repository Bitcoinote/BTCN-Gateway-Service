# Advanced Usage

There are some additional ways in which the gateway can be used, which are described here.

## Automatic wallet sweeping

When funds are received, the normally stay on the server wallet. You can access the same wallet also from the BitcoiNote GUI Wallet on the computer, so you can this way transfer the funds somewhere else.

However, the gateway can also be configured to do this automatically as soon as a certain minimum balance was reached.

In the `.env` file, you can set a `SWEEP_MINIMUM` (amount in BTCN) and a `SWEEP_TARGET` (wallet address). Then, whenever the server wallet's balance is at least the `SWEEP_MINIMUM`, all funds (except for 0.0001 BTCN to avoid some error conditions) will be transferred to the specified `SWEEP_TARGET` wallet (including a transaction fee of 0.01 BTCN).

## Operation behind a reverse proxy (SSL support)

You may want to operate the gateway application behind a reverse proxy in order to use SSL. In that case, the SSL termination would be handled by the proxy.

To make this work, you would configure the reverse proxy in such a way that it forwards all requests to the gateway application, and configure the `BASE_URL` in `.env` to the reverse proxy's URL (e.g. `https://pay.example.com`).

It is recommended to then close the gateway's real port for the outside world.

You could use a webserver for this task, for example [Caddy](https://caddyserver.com/) or [nginx](https://www.nginx.com/), or you could use an external service such as an Amazon ELB (Elastic Load Balancer) in case you are using Amazon Web Services.

[Caddy](https://caddyserver.com/) is especially recommended for this task - it is easy to set up and supports automatic free SSL using [LetsEncrypt](https://letsencrypt.org). An example `Caddyfile` (with automatic SSL) would look like this:

```text
pay.example.com {
  proxy / localhost:38071
}
```

The gateway would then be reachable under `https://pay.example.com`.

Note that this only works so easily if you have the gateway running on a separate server with _only_ the gateway. If you run it on the same server as your main application, you would have to configure your main application to listen on a different port (e.g. `8080` instead of `80`), configure an additional subdomain to point to your server (e.g. `pay.example.com`) and then set up Caddy to proxy `example.com`/`www.example.com` to port `8080` and `pay.example.com` to port `38071`:

```text
example.com, www.example.com {
  proxy / localhost:8080
}

pay.example.com {
  proxy / localhost:38071
}
```

## Running the `simplewallet` on another server

It is possible to run the `simplewallet` (and daemon) on a different server.

Note however that the `simplewallet` does not support any form of authentication, so it's not a good idea to just configure it with `--rpc-bind-ip 0.0.0.0`, since that way everyone in the world can instruct the wallet to do a transfer.

Instead, a reverse proxy would be used to add an authentication requirement.

On the wallet server, you could for example use [Caddy](https://caddyserver.com/) with the following configuration:

```text
wallet.example.com {
  proxy / localhost:8071
  basicauth / chocolate cake
}
```

(Of course, in reality you would a much stronger password.)

On the gateway server, you would then set the `BTCN_WALLET_RPC_URL` setting in the `.env` file to `https://chocolate:cake@wallet.example.com/json_rpc`.

## Using a remote BTCN daemon

If you have access to another BitcoiNote node running remotely, you can configure it as remote daemon for `simplewallet` instead of running the BitcoiNote daemon on the gateway server.

This would also remove the requirement to store and sync with the blockchain on your server. Note however that `simplewallet` still has to download all new blocks from the remote daemon in order to check for transactions, even though it doesn't need to save them all to disk.

The remote daemon can be configured by adding a parameter `--daemon-address=12.34.56.78:28389` (with the remote daemon's IP address or domain) to the `simplewallet` command line in your `bitcoinote-wallet.service` file.

## Running the gateway application under a user account without write access to the application directory

It is entirely possible to deny the gateway's user account write access to its application directory, if this is desired for security reasons.

In that case, however, the gateway will fail to write to the file `transactions.json` in which the transactions database is kept.

The solution is to create a separate folder to which the gateway's user account has write access, for example `/var/app/gateway`. Then, you would change the configuration `TRANSACTIONS_FILE` in the `.env` file to `/var/app/gateway/transactions.json` and copy the existing `transactions.json` file (if there is any) to the new path.

-----

Continue reading: [Questions & Answers](questions-answers.md)

[Back to Documentation Overview](index.md)
