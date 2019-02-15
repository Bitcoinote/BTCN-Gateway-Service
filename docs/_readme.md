# Overview

_By the [BitcoiNote Team](https://www.bitcoinote.org)_

This application acts as a **payment gateway solution for processing payments with BitcoiNote**. It can be used standalone, with a custom integration or with an accompanying plugin for an eCommerce platform such as WooCommerce.

It can be installed on the same server as your main application (if the environment is compatible), or on a separate machine.

## Functionality Overview

* Tracking of incoming payments based on payment ID
* Automatic currency conversion
* API for creating and managing transactions
* Optional user-facing payment funnel/status page
* Optional support for cancellation through user
* Support for redirects from funnel page back to merchant upon payment completion or cancellation
* IPN support with cryptographic signature and automatic retries
* Form submit support as alternative to transaction creation through API
* Admin interface to manage recent transactions and view wallet balance
* Automatic sweeping of the server wallet to another wallet upon reaching a threshold balance

## Requirements

Note that part of the following requirements can be installed automatically using our setup script, as described in the [Quick Start Guide](quick-start.md).

* BitcoiNote wallet
* [BitcoiNote Core](https://github.com/Bitcoinote/Bitcoinote-Core) software installed on server (`simplewallet` in RPC mode must be reachable in a secure way)
* node.js v10+
* For usage of the user-facing payment funnel page, a reverse proxy with SSL termination is recommended (e.g. Caddy or nginx)

A server running Ubuntu 16.04 LTS or 18.04 LTS is recommended, but it's possible to use it in other environments with some manual effort.

## Next Steps

To start out, please check the dedicated [Quick Start Guide](quick-start.md) which also includes an **automatic setup script**.

For futher information, you can refer to the [Full Documentation](index.md).
