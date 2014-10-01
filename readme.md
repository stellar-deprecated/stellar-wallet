# Stellar Wallet
[![Build Status](https://travis-ci.org/stellar/stellar-wallet.svg?branch=master)](https://travis-ci.org/stellar/stellar-wallet)
[![Coverage Status](https://coveralls.io/repos/stellar/stellar-wallet/badge.png)](https://coveralls.io/r/stellar/stellar-wallet)
[![Code Climate](https://codeclimate.com/github/stellar/stellar-wallet/badges/gpa.svg)](https://codeclimate.com/github/stellar/stellar-wallet)

Stores encrypted data. The wallet server can't decrypt the data. Used by https://github.com/stellar/stellar-client to save the user's secret keys. 



## Getting Started

1. Get yourself a db: `gulp db:setup`
1. Get yourself a running server: `stex www --watch`
1. Start making requests against port 3000 (by default)

## Connect directly to mysql

`stex db-console`
