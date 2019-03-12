#!/bin/bash

if [[ "$NOBANNER" != "1" ]]; then
  tput bold
  echo "= BitcoiNote Payment Gateway Service Installation Script ="
  tput sgr0
  echo
fi

function status {
  tput setaf 3
  echo "$1"
  tput sgr0
}

function prompt {
  tput setaf 6
  echo "$1"
  if [[ "$2" != "1" ]]; then
    echo -n "> "
  fi
  tput sgr0
}

function err {
  tput setaf 1
  echo "$1"
  tput sgr0
}

function fail {
  if [[ -n "$1" ]]; then
    err "$1"
  fi
  echo
  tput setab 7
  err "*** SETUP WAS UNABLE TO COMPLETE ***"
  echo "Please refer to the manual setup guide for more information:"
  tput bold
  echo "https://github.com/Bitcoinote/BTCN-Gateway-Service/blob/master/docs/installation-and-configuration.md"
  tput sgr0
  exit 1
}

function wrongPlatform {
  if [[ -n "$1" ]]; then
    err "$1"
    echo
  fi
  fail "Sorry, this script works only on Ubuntu 16+!"
}

if ! which lsb_release > /dev/null; then
  wrongPlatform "lsb_release not found"
fi

lsbDescription=$(lsb_release -ds)
if [[ ! "$lsbDescription" =~ ^Ubuntu[[:space:]]([0-9]+)\. ]]; then
  wrongPlatform "$lsbDescription is not supported"
fi

ubuntuMajorVersion=${BASH_REMATCH[1]}
if (( ubuntuMajorVersion < 16 )); then
  wrongPlatform "Ubuntu major version $ubuntuMajorVersion is too old"
fi

if [[ "$USER" != "ubuntu" ]]; then
  fail "This script must be run as user 'ubuntu'!"
fi

if ! which systemctl > /dev/null; then
  fail "systemctl not found"
fi

if ! which sed > /dev/null; then
  fail "sed not found"
fi

function sudosimplesed {
  sudo sed -i "s/$(echo $1 | sed -e 's/\([[\/.*]\|\]\)/\\&/g')/$(echo $2 | sed -e 's/[\/&]/\\&/g')/g" $3
}

# =====================================================

cd $(dirname ${BASH_SOURCE[0]})
if [[ "$(pwd)" != "/home/ubuntu/app/gateway/setup" ]]; then
  fail "stage2.sh must be located at /home/ubuntu/app/gateway/setup"
fi

cd ~/app

if ! mkdir -p bitcoinote; then
  "Failed to make ~/app/bitcoinote directory"
fi
cd bitcoinote

rm -f bitcoinote_core_latest_linux.tgz
status "Downloading BitcoiNote Core software..."
if ! wget https://www.bitcoinote.org/bitcoinote_core_latest_linux.tgz -O bitcoinote_core_latest_linux.tgz; then
  fail "Failed to download bitcoinote_core_latest_linux.tgz"
fi

if ! tar -xzf bitcoinote_core_latest_linux.tgz; then
  fail "Failed to unpack bitcoinote_core_latest_linux.tgz"
fi
chmod o-w *

./Bitcoinoted --version
ec=$?
if (( ec != 0 )); then
  if (( ec == 127 )); then
    status "Installing Boost libraries..."
    sudo apt update
    sudo apt install -y libboost-date-time1.58-dev libboost-filesystem1.58-dev libboost-program-options1.58-dev libboost-serialization1.58-dev libboost-system1.58-dev libboost1.58-dev
    ec=$?
    if (( ec != 0 )); then
      if (( ec == 100 )); then
        echo 'deb http://nl.archive.ubuntu.com/ubuntu/ xenial main restricted universe multiverse' | sudo tee /etc/apt/sources.list.d/xenial.list
        sudo apt update
        if ! sudo apt install -y libboost-date-time1.58-dev libboost-filesystem1.58-dev libboost-program-options1.58-dev libboost-serialization1.58-dev libboost-system1.58-dev libboost1.58-dev; then
          fail "Failed to install Boost libraries"
        fi
      else
        fail "Failed to install Boost libraries"
      fi
      if ! ./Bitcoinoted --version; then
        fail "Failed to run BitcoiNote daemon"
      fi
    fi
  else
    fail "Failed to run BitcoiNote daemon"
  fi
fi

if [[ ! "$(./simplewallet --version)" =~ BitcoiNote ]]; then # simplewallet produces exit code 1 on --version...
  fail "Failed to run simplewallet"
fi

status "Creating BitcoiNote daemon service..."
if ! sudo cp ~/app/gateway/setup/bitcoinote-daemon.service /etc/systemd/system/; then
  fail "Failed to copy bitcoinote-daemon.service"
fi
if ! sudo systemctl enable bitcoinote-daemon; then
  fail "Failed to enable bitcoinote-daemon.service"
fi

status "Creating wallet..."
if ! mkdir -p ~/app/gateway/wallet; then
  fail "Failed to create ~/app/gateway/wallet"
fi
cd ~/app/gateway/wallet
if [[ -e gateway.wallet ]]; then
  if [[ -e gateway.wallet.address ]]; then
    mv gateway.wallet.address gateway.address
  fi
  if [[ ! -e gateway.address ]]; then
    echo "The gateway.wallet file was found, but the gateway.address file is missing."
    prompt "Please enter the gateway wallet address:"
    read walletAddress
    echo -n "$walletAddress" > gateway.address
  else
    walletAddress=$(cat gateway.address)
  fi
  if [[ ! -e gateway.password ]]; then
    prompt "Please enter the gateway wallet password:"
    read walletPassword
    echo -n "$walletPassword" > gateway.password
  else
    walletPassword=$(cat gateway.password)
  fi
else
  prompt "You need to set a password for the gateway wallet. Remember this password." 1
  prompt "Use only numbers and letters, no spaces or special characters." 1
  prompt "Please enter a wallet password:"
  read walletPassword
  echo -n "$walletPassword" > gateway.password

  echo -ne 'exit\n' | ~/app/bitcoinote/simplewallet --generate-new-wallet gateway --password "$walletPassword"

  if [[ ! -e gateway.wallet ]]; then
    fail "Failed to create wallet!"
  fi
  if [[ ! -e gateway.address ]]; then
    fail "Wallet created, but gateway.address file is missing!"
  fi

  walletAddress=$(cat gateway.address)
fi

status "Creating BitcoiNote simplewallet service..."
if ! sudo cp ~/app/gateway/setup/bitcoinote-simplewallet.service /etc/systemd/system/; then
  fail "Failed to copy bitcoinote-simplewallet.service"
fi
if ! sudo systemctl enable bitcoinote-simplewallet; then
  fail "Failed to enable bitcoinote-simplewallet.service"
fi
if ! sudosimplesed PASSWORD "$walletPassword" /etc/systemd/system/bitcoinote-simplewallet.service; then
  fail "Failed to set password in bitcoinote-simplewallet.service"
fi

nodeVersionString=$(node -v)
nodeMajorVersion=0
if [[ "$nodeVersionString" =~ ^v([0-9]+)\. ]]; then
  nodeMajorVersion=${BASH_REMATCH[1]}
  echo "node.js version $nodeMajorVersion detected"
else
  echo "node.js not detected"
fi
if (( nodeMajorVersion < 10 )); then
  status "Installing node.js v10..."
  wget -qO- https://deb.nodesource.com/setup_10.x | sudo -E bash -
  if ! sudo apt install -y nodejs; then
    fail "Failed to install node.js"
  fi
  hash -r
  nodeVersionString=$(node -v)
  nodeMajorVersion=0
  if [[ "$nodeVersionString" =~ ^v([0-9]+)\. ]]; then
    nodeMajorVersion=${BASH_REMATCH[1]}
    echo "node.js version $nodeMajorVersion detected"
  else
    echo "node.js not detected"
  fi
  if (( nodeMajorVersion < 10 )); then
    fail "node.js v10 installed but not detected after installation"
  fi
fi

if ! which npm > /dev/null; then
  fail 'npm not found'
fi

if [[ "$(npm config get prefix)" != "/home/ubuntu/.npm-global" ]]; then
  status "Setting up npm..."
  mkdir ~/.npm-global
  npm config set prefix ~/.npm-global
  echo "export PATH=~/.npm-global/bin:$PATH" >> ~/.profile
  if ! npm -g i npm; then
    fail "Failed to set up npm"
  fi
fi

export PATH=~/.npm-global/bin:$PATH
if ! which pm2 > /dev/null; then
  status "Installing PM2..."
  if ! npm -g i pm2; then
    fail "Failed to install PM2"
  fi
  if ! pm2 install pm2-logrotate; then
    fail "Failed to install pm2-logrotate"
  fi
  pm2 kill
fi

status "Installing dependencies..."
cd ~/app/gateway
if ! npm i --production; then
  fail "Failed to install dependencies"
fi

if [[ ! -e .env ]]; then
  status "Creating configuration file..."
  cp .env.sample .env
  prompt "Please enter the hostname (domain or IP) under which this server is reachable:"
  read hostName
  prompt "Please enter a password for the API and admin interface (note it down somewhere):"
  read clientPassword
  prompt "Please enter the IPN secret, a strong secret key (note it down somewhere):"
  read ipnSecret
  sudosimplesed CHANGEME1 "$hostName" .env
  sudosimplesed CHANGEME2 "$walletAddress" .env
  sudosimplesed CHANGEME3 "$clientPassword" .env
  sudosimplesed CHANGEME4 "$ipnSecret" .env
fi

status "Creating PM2/gateway service..."
if ! cp ~/app/gateway/setup/processes.json ~/app/processes.json; then
  fail "Failed to copy processes.json"
fi
if ! sudo cp ~/app/gateway/setup/bitcoinote-gateway.service /etc/systemd/system/; then
  fail "Failed to copy bitcoinote-gateway.service"
fi
if ! sudo systemctl enable bitcoinote-gateway; then
  fail "Failed to enable bitcoinote-gateway.service"
fi

status "Starting services..."
if ! sudo systemctl daemon-reload; then
  fail "Failed to run systemctl daemon-reload"
fi
if ! sudo systemctl restart bitcoinote-daemon; then
  fail "Failed to (re)start bitcoinote-daemon.service"
fi
if ! sudo systemctl restart bitcoinote-simplewallet; then
  fail "Failed to (re)start bitcoinote-simplewallet.service"
fi
if ! sudo systemctl restart bitcoinote-gateway; then
  fail "Failed to (re)start bitcoinote-gateway.service"
fi

status "Waiting 15 seconds for services to initialize..."
sleep 15

if ! which curl; then
  status "Installing curl..."
  if ! sudo apt install curl; then
    fail "Failed to install curl"
  fi
fi

status "Checking services..."
if ! curl -fLv "http://localhost:28389/getinfo" > /dev/null; then
  echo
  err "BTCN daemon service is not working"
  echo "Check 'journalctl -u bitcoinote-daemon' for errors!"
  fail
fi
if ! curl -fLv "http://localhost:8071/json_rpc" > /dev/null; then
  echo
  err "BTCN simplewallet service is not working"
  echo "Check 'journalctl -u bitcoinote-simplewallet' for errors!"
  fail
fi
if ! curl -fLv "http://localhost:38071/" > /dev/null; then
  echo
  err "BTCN gateway service is not working"
  echo "Check 'pm2 logs --lines=100' and 'journalctl -u bitcoinote-gateway' for errors!"
  echo "(You may have to run 'source ~/.profile' before the pm2 command will work.)"
  fail
fi
if [[ -n "$hostName" ]]; then
  if ! curl -fLv "http://$hostName:38071/" > /dev/null; then
    err "You may have provided an incorrect hostname. The gateway will not fully work."
    err "Please check the 'BASE_URL' setting in '/home/ubuntu/app/gatewav/.env'!"
  fi
fi

echo
tput setaf 2
tput setab 7
echo "*** SETUP COMPLETED ***"
tput sgr0

echo
tput bold
echo "Important information to note down:"
tput sgr0
echo
echo "$(tput setaf 3)Wallet address:$(tput sgr0) $walletAddress"
echo "$(tput setaf 3)Wallet password:$(tput sgr0) $walletPassword"
if [[ -n "$clientPassword" ]]; then
  echo "$(tput setaf 3)Gateway username:$(tput sgr0) client"
  echo "$(tput setaf 3)Gateway password:$(tput sgr0) $clientPassword"
fi
if [[ -n "$ipnSecret" ]]; then
  echo "$(tput setaf 3)IPN secret:$(tput sgr0) $ipnSecret"
fi

echo
tput bold
echo "Next steps:"
tput sgr0
echo
echo "1. Copy the wallet file to your computer."
echo "   You can find the file at the path '$(tput setaf 3)/home/ubuntu/app/gateway/wallet/gateway.wallet$(tput sgr0)',"
echo "   use an SCP/SFTP client to copy the file to your computer."
echo "   You need this file to access the gateway wallet."
echo
echo "2. Run the command '$(tput setaf 3)source ~/.profile$(tput sgr0)'."
echo "   This is required to be able to run 'pm2' commands."
echo
echo "3. Wait for the daemon to finish synchronizing with the network."
echo "   If this is a new install, the syncrhonization can take hours or days."
echo "   Use the command '$(tput setaf 3)journalctl -u bitcoinote-daemon -f$(tput sgr0)' to watch the status."
echo "   Wait until you see '$(tput setaf 2)SYNCHRONIZED OK$(tput sgr0)' in the log!"
echo
echo "Then, the gateway should be ready!"
