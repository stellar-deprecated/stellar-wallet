var helper         = require("../test_helper");
var usernameProofs = require("../../lib/util/username-proofs");
var stellarAddress = require("../../lib/util/stellar-address");
var sign           = require("../../lib/util/sign");
var _              = helper.Stex._;
var Promise        = helper.Stex.Promise;
var errors         = helper.Stex.errors;

var KEYPAIR    = helper.testKeyPair;
var ADDRESS    = stellarAddress.addressFromPublicKey(KEYPAIR.publicKey);

var GOOD_CLAIM = JSON.stringify({username: "scott", address: ADDRESS});
var GOOD_PROOF = {
  claim:     GOOD_CLAIM,
  publicKey: KEYPAIR.publicKey,
  signature: sign.gen(GOOD_CLAIM, KEYPAIR.secretKey)
};

describe.only("usernameProofs.validate", function() {
  beforeEach(function(done) {
    stex.test.sinon.stub(stex.fbgive, "post", function() {
      return Promise.resolve({address: ADDRESS});
    });
    done();
  });


  it("validates the proof when everything is correct", function() {
    var validation = usernameProofs.validate(KEYPAIR.publicKey, GOOD_PROOF);
    return expect(validation).to.be.fulfilled;
  });

  it("fails when the provided public key is not the same as in the proof");
  it("fails when the signature is invalid");
  it("fails when address returned from fbgive does not match that of the proof");
  it("fails when address in the proof cannot be generated from the public key provided");
});
