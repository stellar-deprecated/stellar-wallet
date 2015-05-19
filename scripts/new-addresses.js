// This script generates SQL update queries to update stellar-api
// Users database with new network addresses.
var stellarAddress = require('../lib/util/stellar-address');

stex.db.select('publicKey').from('wallets_v2')
  .stream(function(rowStream) {
    rowStream.on('data', function (row) {
      var oldAddress = stellarAddress.addressFromPublicKey(row.publicKey);
      var newAddress = stellarAddress.newAddressFromPublicKey(row.publicKey);

      console.log('UPDATE Users SET newStellarAddress = "'+newAddress+'" WHERE stellarAddress = "'+oldAddress+'";');
    });
    rowStream.on('end', function () {
      process.exit();
    });
  });
