#! /usr/bin/env bash
set -e

npm install

export NODE_ENV=production
./node_modules/.bin/gulp dist