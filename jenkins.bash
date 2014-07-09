#! /usr/bin/env bash
set -e

export NODE_ENV=production

npm install
./node_modules/.bin/gulp dist