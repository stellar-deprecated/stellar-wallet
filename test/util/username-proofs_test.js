var helper         = require("../test_helper");
var usernameProofs = require("../../lib/util/username-proofs");
var signedJson     = require("../../lib/util/signed-json");
var stellarAddress = require("../../lib/util/stellar-address");
var sign           = require("../../lib/util/sign");
var _              = helper.Stex._;
var Promise        = helper.Stex.Promise;
var errors         = helper.Stex.errors;

var KEYPAIR    = helper.testKeyPair;
var ADDRESS    = helper.testAddress;

var GOOD_CLAIM = JSON.stringify({username: "scott@stellar.org", address: ADDRESS});
var GOOD_PROOF = {
  claim:     GOOD_CLAIM,
  publicKey: KEYPAIR.publicKey,
  signature: sign.gen(GOOD_CLAIM, KEYPAIR.secretKey)
};

describe("usernameProofs.validate", function() {
  beforeEach(function(done) {
    this.sinon.stub(stex.fbgive, "post", function() {
      return Promise.resolve({address: ADDRESS});
    });
    done();
  });


  it("validates the proof when everything is correct", function() {
    var validation = usernameProofs.validate(KEYPAIR.publicKey, GOOD_PROOF);
    return expect(validation).to.be.fulfilled;
  });

  it("strips off the domain of the username when communicating with fbgive", function() {
    this.sinon.restore();
    this.sinon.mock(stex.fbgive).expects("post").withArgs(stex.test.sinon.match.string, {username:"scott"}).returns(Promise.resolve({address: ADDRESS}));
    var validation = usernameProofs.validate(KEYPAIR.publicKey, GOOD_PROOF);
    return expect(validation).to.be.fulfilled;
  });

  it("fails when the provided public key is blank", function() {
    var validation = usernameProofs.validate("", GOOD_PROOF);
    return expect(validation).to.be.rejectedWith(usernameProofs.NonMatchingPublicKey);
  });

  it("fails when the provided public key is not the same as in the proof", function() {
    var differentKey = sign.keyPair("iAziZHvikuV/KLVinhNAo15vwwFxLSq2X6H9bjNw1SS=").publicKey;
    var validation = usernameProofs.validate(differentKey, GOOD_PROOF);
    return expect(validation).to.be.rejectedWith(usernameProofs.NonMatchingPublicKey);
  });


  it("fails when the signature is invalid", function() {
    var proofWithBadSignature = _.defaults({signature: "something"}, GOOD_PROOF);
    var validation            = usernameProofs.validate(KEYPAIR.publicKey, proofWithBadSignature);

    return expect(validation).to.be.rejectedWith(signedJson.errors.BadSignature);
  });

  it("fails when address returned from fbgive does not match that of the proof", function() {
    this.sinon.restore();
    this.sinon.stub(stex.fbgive, "post", function() {
      return Promise.resolve({address: "someotheraddress"});
    });

    var validation = usernameProofs.validate(KEYPAIR.publicKey, GOOD_PROOF);

    return expect(validation).to.be.rejectedWith(usernameProofs.errors.InvalidClaim);
  });

  it("fails when address in the proof cannot be generated from the public key provided", function() {
    var claim = JSON.stringify({username: "scott", address: "someaddress"});
    var proof = {
      claim:     claim,
      publicKey: KEYPAIR.publicKey,
      signature: sign.gen(claim, KEYPAIR.secretKey)
    };

    var validation = usernameProofs.validate(KEYPAIR.publicKey, proof);

    return expect(validation).to.be.rejectedWith(usernameProofs.errors.AddressNotFromPublicKey);
  });
});
