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

# =====================================================

if ! which git > /dev/null; then
  fail "git not found"
fi

if ! mkdir -p ~/app; then
  fail "Failed to make ~/app directory"
fi
cd ~/app

status "Downloading/updating gateway source repository..."
if [[ -d gateway ]]; then
  if [[ ! -d gateway/.git ]]; then
    fail "~/app/gateway exists already but is not a git repository"
  fi

  pushd gateway
  if ! git pull; then
    fail "git pull failed"
  fi
  popd
else
  if ! git clone ${GATEWAY_REPOSITORY:-"https://github.com/Bitcoinote/BTCN-Gateway-Service.git"} gateway; then
    fail "git clone failed"
  fi
fi

cd gateway
if [[ ! -e setup/stage2.sh ]]; then
  fail "Stage 2 setup script not found"
fi

export NOBANNER=1
source setup/stage2.sh
