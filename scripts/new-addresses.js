// This script generates SQL update queries to update stellar-api
// Users database with new network addresses.
var Base    = require('stellar-lib/src/js/ripple/base').Base;
var Crypt   = require('stellar-lib/src/js/ripple/crypt').Crypt;
var UInt160 = require('stellar-lib/src/js/ripple/uint160').UInt160;
var UInt256 = require('stellar-lib/src/js/ripple/uint256').UInt256;
var sjcl    = require('stellar-lib/src/js/ripple/utils').sjcl;

stex.db.select('publicKey').from('wallets_v2')
  .stream(function(rowStream) {
    rowStream.on('data', function (row) {
      var publicKeyBytes = new Buffer(row.publicKey, "base64");
      var publicKeyBits = sjcl.codec.bytes.toBits(publicKeyBytes);

      var hash = SHA256_RIPEMD160(publicKeyBits);
      var address = UInt160.from_bits(hash);
      address.set_version(Base.VER_ACCOUNT_ID);
      var oldAddress = address.to_json();

      var newAddressBits = UInt256.from_hex(publicKeyBytes.toString('hex'));
      var newAddress = Base.encode_check(Base.VER_ACCOUNT_ID, newAddressBits.to_bytes());

      console.log('UPDATE Users SET newStellarAddress = "'+newAddress+'" WHERE stellarAddress = "'+oldAddress+'";');
    });
    rowStream.on('end', function () {
      process.exit();
    });
  });


function SHA256_RIPEMD160(bits) {
  return Crypt.ripemd160(sjcl.hash.sha256.hash(bits));
}
