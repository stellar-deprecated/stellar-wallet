var Stex       = require("stex");
var _          = Stex._;
var Base       = require('stellar-lib/src/js/ripple/base').Base;
var KeyPair    = require("stellar-lib/src/js/ripple/keypair").KeyPair; //HACK: until we update stellar-lib to expose it
var UInt256    = require('stellar-lib/src/js/ripple/uint256').UInt256;

module.exports.addressFromPublicKey = function(publicKeyString) {
  var buffer = new Buffer(publicKeyString, 'base64');
  var keyPair = new KeyPair();
  keyPair._pubkey = buffer;
  return keyPair.get_address().to_json();
};

module.exports.newAddressFromPublicKey = function(publicKeyString) {
  var publicKeyBytes = new Buffer(publicKeyString, "base64");
  var newAddressBits = UInt256.from_hex(publicKeyBytes.toString('hex'));
  return Base.encode_check(Base.VER_ACCOUNT_ID, newAddressBits.to_bytes());
};
