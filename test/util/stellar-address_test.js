var helper   = require("../test_helper");
var stellarAddress = require("../../lib/util/stellar-address");
var StellarLib     = require('stellar-lib');
var KeyPair        = require("stellar-lib/src/js/ripple/keypair").KeyPair;
var StellarBase    = require('stellar-base');

describe("stellarAddress.addressFromPublicKey", function() {
  it('should generate correct address from publicKey', function(done) {
    for (var i = 0; i < 10; i++) {
      var seed = new StellarLib.Seed().random();
      var key = KeyPair.from_seed_bytes(seed.to_bytes());
      var address = key.get_address().to_json();
      var publicKeyString = new Buffer(key.to_hex_pub(), 'hex').toString('base64');
      expect(stellarAddress.addressFromPublicKey(publicKeyString)).to.be.equal(address);
    }
    done();
  });
});

describe("stellarAddress.newAddressFromPublicKey", function() {
  it('should generate correct new network address from publicKey', function(done) {
    for (var i = 0; i < 50; i++) {
      var keyPair = StellarBase.Keypair.random();
      var publicKeyString = keyPair.rawPublicKey().toString("base64");
      var address = keyPair.publicKey();
      expect(stellarAddress.newAddressFromPublicKey(publicKeyString)).to.be.equal(address);
    }
    done();
  });
});
