# Updating

If you want to install an updated version of the gateway, follow the instructions below.

Note that these instructions assume that you are running Ubuntu and the system is set up using the automatic setup script from the [Quick Start Guide](quick-start.md) or in the recommended way described in the [Installation and Configuration](installation-and-configuration.md) document.

## Using the automatic setup script

This is the easiest method - if you previously used the automatic setup script from the [Quick Start Guide](quick-start.md), all you need to do is running the script again.

Otherwise, read on.

## Updating the BTCN Gateway Service application

To update the gateway application, run these commands:

```bash
cd ~/app/gateway
git pull
npm up
pm2 restart gateway
```

## Updating the BitcoiNote Core software

To update the BitcoiNote Core software, run these commands:

```bash
cd ~/app/bitcoinote
rm bitcoinote_core_latest_linux.tgz
wget https://www.bitcoinote.org/bitcoinote_core_latest_linux.tgz
tar -xzf bitcoinote_core_latest_linux.tgz
chmod o-w *
sudo systemctl restart bitcoinote-daemon bitcoinote-simplewallet
```

-----

Continue reading: [Config Variables Reference](config-variables-reference.md)

[Back to Documentation Overview](index.md)
