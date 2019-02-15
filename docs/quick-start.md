# Quick Start Guide

To get started quickly, we provided an **automatic setup script**.

The only prerequisite is that your server is **running Ubuntu 16+**.

If your application server already fulfills this requirement, you can install the gateway there. Otherwise, you would need to install it on a different server.

If you don't have a fitting server, read the [Amazon EC2 Instance Setup Instructions](ec2-setup.md) to learn how you can get one from Amazon Web Services.

_For manual setup instructions, see the [Installation and Configuration](installation-and-configuration.md) document._

## Installation using the automatic setup script

On an Ubuntu server, the installation is super simple.

**Just run the following command on the server:**

```bash
bash <(wget -qO- https://raw.githubusercontent.com/Bitcoinote/BTCN-Gateway-Service/master/setup/stage1.sh)
```

...and follow the instructions.

You will be prompted for the following things:

* A wallet password. (Remember it.)
* The domain name (preferred) or IP address of the server.
* A password for the gateway. (Remember it.)
* An IPN secret - it's like another password. (Write it down.)

At the end, you need to let the daemon sync. This can take a while - hours or sometimes even days. You can use the command `journalctl -u bitcoinote-daemon -f` to view the daemon's status; you need to wait until you see `SYNCHRONIZED OK`.

You can visit the gateway admin using `http://<domain>:38071/admin`, with the correct domain/IP filled in. Log in with username `client` and the gateway password that you specified earlier. It's normal that a "wallet problem" is displayed while the daemon is still syncing.

Once everything is synced and ready, you can use the "Test form" link at the bottom of the admin page to do a test payment.

It's also important to copy the wallet file to your computer, so that you can manage the transactions and funds on it. You need to transfer the file `/home/ubuntu/app/gateway/wallet/gateway.wallet` with your SCP/SFTP client to your computer, then you can open it with the [BitcoiNote GUI Wallet](https://github.com/Bitcoinote/Bitcoinote-GUI-Wallet/releases). You will be prompted for the wallet password which you set earlier.

## Next steps

Now that the gateway is running, you can continue reading the documention to learn how to use it and how to integrate it with your application.

If you are using a shop system like WooCommerce, there may already be a plugin for it. Otherwise, you can always manually integrate to the gateway's REST API and/or use the Form Submit feature.

_If you were not able to use the automatic setup script, you can read the [Installation and Configuration](installation-and-configuration.md) document to understand how to perform a manual setup._

-----

Continue reading: [Basics of Operation](basics-of-operation.md)

[Back to Documentation Overview](index.md)
