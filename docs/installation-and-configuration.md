# Installation and Configuration

The BTCN Gateway Service can be installed either on the same server as your eCommerce application or on a separate one.

We also provide an **automatic setup script**, see [Quick Start Guide](quick-start.md). If that doesn't work for you or you prefer manual setup, read on.

To set up the BTCN Gateway Service manually, the following steps need to be completed on the server:

* Clone this repository
* Install the BitcoiNote Core software
* Create a system service for the BitcoiNote daemon
* Run the BitcoiNote daemon and wait for it to download the blockchain and sync with the network
* Create a wallet file with `simplewallet` and copy it to your personal computer
* Create a system service for `simplewallet` with RPC API enabled and run it
* Install node.js v10+
* Install PM2 as a process manager (optional)
* Install the npm module dependencies of the gateway
* Configure the gateway with a `.env` file
* Create a system service for the gateway/PM2 and run it

Additional steps:

* If you are using the payment funnel page and you want to use SSL (recommended): Install and configure a reverse proxy such as Caddy or nginx
* If you are not using a reverse proxy, but your eCommerce application is running on a different server: Open the gateway's configured port in the server's firewall

Usage of Ubuntu 16.04 LTS or Ubuntu 18.04 LTS is recommended, but the system should also work on other platforms, albeit with manual adjustments. This guide covers Ubuntu only.

## Setup Walkthrough

This guide will show the setup of all components on an Ubuntu 18.04 LTS server which is reachable as domain `example.com`.

### Recommended Paths

Throughout this guide, we refer to some filesystem paths based on the following recommended paths (if you use this with an account different than `ubuntu`, remember to change the username in all places):

* `app` folder: `/home/ubuntu/app`
  * PM2 processes file: `/home/ubuntu/app/processes.json`
  * Gateway application folder: `/home/ubuntu/app/gateway`
    * Gateway wallet folder: `/home/ubuntu/app/gateway/wallet`
      * Gateway wallet file: `/home/ubuntu/app/gateway/wallet/gateway.wallet`
  * BitcoiNote Core binaries folder: `/home/ubuntu/app/bitcoinote`
    * BitcoiNote daemon binary: `/home/ubuntu/app/bitcoinote/Bitcoinoted`
    * BitcoiNote `simplewallet` binary: `/home/ubuntu/app/bitcoinote/simplewallet`
* Systemd service folder: `/etc/systemd/system`
  * Systemd service file for BitcoiNote daemon: `/etc/systemd/system/bitcoinote-daemon.service`
  * Systemd service file for BitcoiNote `simplewallet`: `/etc/systemd/system/bitcoinote-simplewallet.service`
  * Systemd service file for Gateway/PM2: `/etc/systemd/system/bitcoinote-gateway.service`
* PM2 logs folder: `/home/ubuntu/.pm2/logs`

### Cloning of this repository

The first step would be to setup the app folder and clone this repository:

```bash
cd ~
mkdir app
cd app
git clone https://github.com/Bitcoinote/BTCN-Gateway-Service.git gateway
```

(This requires `git` to be installed - it normally is.)

You should now have a folder `/home/ubuntu/app/gateway`.

### Installation of the BitcoiNote Core software

Next, we need to get the BitcoiNote Core binaries and install them.

```bash
cd ~/app
mkdir bitcoinote
cd bitcoinote
wget https://www.bitcoinote.org/bitcoinote_core_latest_linux.tgz
tar -xzf bitcoinote_core_latest_linux.tgz
chmod o-w *
```

(The `chmod` is a security measure.)

Let's try executing the daemon and see if it works out of the box:

```bash
./Bitcoinoted
```

**It works?** Great, stop it with `Ctrl+C` and continue with the next section.

If it **doesn't work** and fails with the error `./Bitcoinoted: error while loading shared libraries: libboost_system.so.1.58.0: cannot open shared object file: No such file or directory`, we have to install the correct boost libraries:

```bash
sudo apt install -y libboost-date-time1.58-dev libboost-filesystem1.58-dev libboost-program-options1.58-dev libboost-serialization1.58-dev libboost-system1.58-dev libboost1.58-dev
```

If this fails with `Unable to locate package` then these packages are not available for your distribution.

**If you are running Ubuntu 17.10 or newer**, then you can add the old Xenial package sources and try again like this:

```bash
echo 'deb http://nl.archive.ubuntu.com/ubuntu/ xenial main restricted universe multiverse' | sudo tee /etc/apt/sources.list.d/xenial.list
sudo apt update
sudo apt install -y libboost-date-time1.58-dev libboost-filesystem1.58-dev libboost-program-options1.58-dev libboost-serialization1.58-dev libboost-system1.58-dev libboost1.58-dev
```

Otherwise, you have the following options:

* Look for a way to install Boost 1.58 libraries for your linux distribution
* Compile Boost 1.58 from source
* Compile BitcoiNote Core from [source](https://github.com/Bitcoinote/Bitcoinote-Core) and target different Boost libraries

### Creating a system service for the BitcoiNote daemon

Now that we got BitcoiNote Core installed and working, we need a system service so that it can run in the background.

_Note: If your Linux distribution doesn't use systemd, the following doesn't apply and you need to look up the correct way to create such a service yourself._

Create the file `/etc/systemd/system/bitcoinote-daemon.service` with your favorite editor (with `sudo`!) and paste in:

```ini
[Unit]
Description=BitcoiNote Daemon
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/app/bitcoinote

Type=simple

ExecStart=/usr/bin/stdbuf -oL -eL /home/ubuntu/app/bitcoinote/Bitcoinoted --no-console

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

(Change username and the path to `Bitcoinoted` if needed.)

Then enable the service:

```bash
sudo systemctl enable bitcoinote-daemon
```

### Running the BitcoiNote daemon and waiting for it to download the blockchain and sync with the network

Let's run the service we just installed (again, this applies to systemd only)and watch its output:

```bash
sudo systemctl start bitcoinote-daemon
journalctl -u bitcoinote-daemon -f
```

Now you need to **wait until the daemon finished synchronizing**. This can take several hours or days, depending on the network speed!

At the end you will see output similar to this:

```text
2019-Jan-31 15:23:39.524955 INFO    [35.176.125.100:28388 OUT] SYNCHRONIZED OK
2019-Jan-31 15:23:39.525352 INFO
2019-Jan-31 15:23:39.525352 INFO    **********************************************************************
2019-Jan-31 15:23:39.525352 INFO    You are now synchronized with the network. You may now start simplewallet.
2019-Jan-31 15:23:39.525352 INFO
2019-Jan-31 15:23:39.525352 INFO    Please note, that the blockchain will be saved only after you quit the daemon with "exit" command or if you use "save" command.
2019-Jan-31 15:23:39.525352 INFO    Otherwise, you will possibly need to synchronize the blockchain again.
2019-Jan-31 15:23:39.525352 INFO
2019-Jan-31 15:23:39.525352 INFO    Use "help" command to see the list of available commands.
2019-Jan-31 15:23:39.525352 INFO    **********************************************************************
```

### Creating a wallet file with `simplewallet` and copying it to your personal computer

Now that the daemon is synchronized, we can create a wallet for use by the server.

Note that the wallet **has to be created with `simplewallet`**, you cannot take a wallet file you previously used in the GUI wallet and use it here!

Create the wallet with the following commands:

```bash
cd ~/app/gateway
mkdir wallet
cd wallet
~/app/bitcoinote/simplewallet --generate-new-wallet gateway
```

You will be prompted for a password. **Set a password and remember it.**

At the end you will get output like this:

```text
2019-Jan-31 15:26:21.260495 INFO    Generated new wallet: N3Wk9QUcMTrRTc2SUopLoN7Y4WFgFLwPciz5cTWmcaeTeJEhmkw6XXh1n11gjZJBJoa3ygvFGjnijiMMHTbs31gUDKYHTNm
```

**Copy the wallet address**, we need it later. You can now quit the wallet prompt using `exit`.

To be able to view and manage this wallet from your computer, you need to transfer the wallet file to it. Connect with an SCP/SFTP client and copy the file `/home/ubuntu/app/gateway/wallet/gateway.wallet` to your computer. You can then open it in the [BitcoiNote GUI Wallet](https://github.com/Bitcoinote/Bitcoinote-GUI-Wallet/releases).

### Creating a system service for `simplewallet` with RPC API enabled and running it

This part is very similar to the previous part where we created the service for the daemon. Again, this applies only to distributions with systemd.

Create the file `/etc/systemd/system/bitcoinote-simplewallet.service` with your favorite editor (with `sudo`!) and paste in:

```ini
[Unit]
Description=BitcoiNote SimpleWallet RPC
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/app/bitcoinote

Type=simple

ExecStart=/usr/bin/stdbuf -oL -eL /home/ubuntu/app/bitcoinote/simplewallet --rpc-bind-ip=127.0.0.1 --rpc-bind-port 8071 --password "PASSWORD" --wallet-file /home/ubuntu/app/gateway/wallet/gateway

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Instead of `PASSWORD`, you need to fill in the wallet password that you previously set.

(Change the username and paths to `simplewallet` and `gateway.wallet` if needed.)

Then enable the service, start it and watch its output:

```bash
sudo systemctl enable bitcoinote-simplewallet
sudo systemctl start bitcoinote-simplewallet
journalctl -u bitcoinote-simplewallet -f
```

You should see output like this:

```text
2019-Jan-31 15:27:45.491372 INFO    Loaded ok
2019-Jan-31 15:27:45.492143 INFO    Starting wallet rpc server
```

Quit the log stream with `Ctrl+C` and let's continue.

### Installing node.js v10+

On Ubuntu, we can use the following commands to install node.js v10+ (for other distributions, check [nodejs.org](https://nodejs.org) for instructions):

```bash
wget -qO- https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt install -y nodejs
```

Then, we should configure npm for global packages in a way that doesn't require root:

```bash
mkdir ~/.npm-global
npm config set prefix ~/.npm-global

export PATH=~/.npm-global/bin:$PATH
echo "export PATH=~/.npm-global/bin:$PATH" >> ~/.profile

npm -g i npm
```

### Installing PM2 as a process manager

Next, we install PM2 as process manager for simplified access to logs of the application, optional monitoring and other things. This is optional, but if you don't want to use PM2, you have to run the application in a different way later (use `node` directly in the service).

To install PM2 together with its logrotate package, run:

```bash
npm -g i pm2
pm2 install pm2-logrotate
pm2 kill
```

PM2 also needs a file to specify how to launch the gateway application.

Create a file `~/app/processes.json` with your favorite editor and paste:

```json
{
  "apps": [
    {
      "name": "gateway",
      "script": "npm",
      "args": "start",
      "cwd": "/home/ubuntu/app/gateway",
      "log_file": "/home/ubuntu/.pm2/logs/gateway-combined.log",
      "log_date_format": "YYYY-MM-DD HH:mm"
    }
  ]
}
```

(Change the path to the gateway application folder if needed.)

### Installing the npm module dependencies of the gateway

Now that node.js is ready, we can install the dependencies of the gateway:

```bash
cd ~/app/gateway
npm i
```

### Configuring the gateway with a `.env` file

Almost there! Now we have to **configure** the gateway. This is done via an `.env` file.

There is a sample file `.env.sample` provided which you have to copy and customize:

```bash
cd ~/app/gateway
cp .env.sample .env
nano .env
```

Instead of `nano`, you can of course use the editor of choice.

In the file, the following changes are required:

1. In the `BASE_URL` configuration, you need to set the URL under which the gateway application will be reachable from the Internet.  
   By default it is using port `38071`, so keep that part. If you installed the gateway on the same server as your eCommerce application, you just have to change the domain to your eCommerce application's domain (e.g. `http://example.com:38071`).  
   Otherwise, assign a separate subdomain to the gateway server at your DNS provider and set that subdomain here. Of course the server's IP address also works, but it should be done this way only if the gateway's payment funnel page isn't used (since the IP in the address bar looks weird).  
   If you want to use a reverse proxy with SSL termination, you have to set the correct HTTPS URL of the reverse proxy here instead.
2. In the `BTCN_WALLET_ADDRESS` configuration, you need to set the wallet address which you previously wrote down.
3. In the `CLIENT_AUTH_PASSWORD` configuration, you need to set a password which is used for the API and for the admin interface. Choose a strong password and remember it.
4. In the `IPN_SECRET` configuration, you need to set a second "password" (it should differ from the password you used for `CLIENT_AUTH_PASSWORD`!). This secret key is used to verify the authenticity of IPNs (Instant Payment Notifications) coming from the gateway. Ideally, this is a random string.

Now, the file may look like this:

```ini
BASE_URL=http://example.com:38071
PORT=38071
LOGO_URL=/images/btcn-logo.png
BTCN_WALLET_RPC_URL=http://127.0.0.1:8071/json_rpc
BTCN_WALLET_ADDRESS=N3Wk9QUcMTrRTc2SUopLoN7Y4WFgFLwPciz5cTWmcaeTeJEhmkw6XXh1n11gjZJBJoa3ygvFGjnijiMMHTbs31gUDKYHTNm
TRANSACTIONS_FILE=./transactions.json
TRANSACTIONS_TTL=2592000
TRANSACTIONS_EXPIRATION_TIMER=21600
CLIENT_AUTH_USERNAME=client
CLIENT_AUTH_PASSWORD=vErYsTrOnG_PASSWORD!
SWEEP_MINIMUM=100
SWEEP_TARGET=
IPN_URL=
IPN_SECRET=86c9e943227044f0cbdb0e6cda384e79e31693c1f2de0d0de3e5b6ba4123b397
ALLOW_FORM_SUBMIT=1
```

_For an explanation of all the possible configurations, please refer to the [Config Variables Reference](config-variables-reference.md)._

### Creating a system service for the gateway/PM2 and running it

For the final step, we need to create yet another service. Again, this applies only to distributions which use systemd. This time, the service is configured a bit differently though.

Create the file `/etc/systemd/system/bitcoinote-gateway.service` with your favorite editor (with `sudo`!) and paste in:

```ini
[Unit]
Description=BitcoiNote Gateway via PM2
After=network.target

[Service]
Type=forking
User=ubuntu
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/home/ubuntu/.npm-global/bin:/usr/local/bin:/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
Environment=PM2_HOME=/home/ubuntu/.pm2
PIDFile=/home/ubuntu/.pm2/pm2.pid

ExecStart=/home/ubuntu/.npm-global/bin/pm2 start /home/ubuntu/app/processes.json
ExecReload=/home/ubuntu/.npm-global/bin/pm2 reload all
ExecStop=/home/ubuntu/.npm-global/bin/pm2 kill

[Install]
WantedBy=multi-user.target
```

(Change the username and paths if needed.)

Then enable the service and start it:

```bash
sudo systemctl enable bitcoinote-gateway
sudo systemctl start bitcoinote-gateway
```

Now, you can check if PM2 and the gateway are running:

```bash
pm2 status
```

You should see output like this:

```text
┌──────────────────┬────┬─────────┬──────┬──────┬────────┬─────────┬────────┬──────┬───────────┬────────┬──────────┐
│ App name         │ id │ version │ mode │ pid  │ status │ restart │ uptime │ cpu  │ mem       │ user   │ watching │
├──────────────────┼────┼─────────┼──────┼──────┼────────┼─────────┼────────┼──────┼───────────┼────────┼──────────┤
│ gateway          │ 1  │ N/A     │ fork │ 4053 │ online │ 0       │ 10s    │ 0.1% │ 21.5 MB   │ ubuntu │ disabled │
└──────────────────┴────┴─────────┴──────┴──────┴────────┴─────────┴────────┴──────┴───────────┴────────┴──────────┘
Module
┌───────────────┬────┬─────────┬───────┬────────┬─────────┬──────┬───────────┬────────┐
│ Module        │ id │ version │ pid   │ status │ restart │ cpu  │ memory    │ user   │
├───────────────┼────┼─────────┼───────┼────────┼─────────┼──────┼───────────┼────────┤
│ pm2-logrotate │ 0  │ 2.6.0   │ 13942 │ online │ 0       │ 0.1% │ 33.0 MB   │ ubuntu │
└───────────────┴────┴─────────┴───────┴────────┴─────────┴──────┴───────────┴────────┘
 Use `pm2 show <id|name>` to get more details about an app
```

You can now watch the output of the app:

```bash
pm2 logs
```

The expected output looks similar to this:

```text
Listening on port 38071
RPC call http://127.0.0.1:8071/json_rpc getbalance {}
Ready
RPC response http://127.0.0.1:8071/json_rpc getbalance { id: '0',
  jsonrpc: '2.0',
  result: { available_balance: 0, locked_amount: 0 } }
```

(To see previous output, you can use the `--lines` parameter, like `pm2 logs --lines 100`, or look into the log files located at `~/.pm2/logs`.)

### Testing it

Now that everything is ready, it's time to test the gateway.

In your browser, go to the address which you previously configured as `BASE_URL` and add `/admin`, e.g. `http://localhost:38071/admin`.

_If you get an error "Connection refused", check your server's firewall settings, or in case of an EC2 instance its security group in the AWS control panel, and open port 38071._

You should see a login prompt. Log in as user `client` with the password which you previously set as `CLIENT_AUTH_PASSWORD`.

You should see an admin panel. Make sure it shows a wallet balance (probably zero) and not a wallet error.

At the bottom, you'll find a link `Test Form`. Click it to get to a test page for the form submit feature. Now just submit the form using "Pay Now". You should see a payment funnel page with instructions to pay $5 with BTCN (to yourself).

If you now follow the instructions and pay (with another BitcoiNote wallet!), you should get a success message after the payment was confirmed (can take several minutes) and then you should be redirected to `http://example.com`.

This means it works! If you look into the `gateway.wallet` file with a BitcoiNote GUI Wallet on oyur computer, you should see they money that was just received.

-----

Continue reading: [Updating](updating.md)

[Back to Documentation Overview](index.md)
