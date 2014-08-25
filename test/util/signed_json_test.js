var helper     = require("../test_helper");
var expect     = helper.expect;
var signedJson = require("../../lib/util/signed_json");
var _          = helper.Stex._;
var errors     = helper.Stex.errors;
var nacl       = require("tweetnacl");

var SEED_STRING      = "iAziZHvikuV/KLVinhNAo15vwwFxLSq2X6H9bjNw1Ss=";
var SEED             = nacl.util.decodeBase64(SEED_STRING);
var KEYPAIR          = nacl.sign.keyPair.fromSeed(SEED);
var DATA             = {"somekey": 3};
var MESSAGE_STRING   = JSON.stringify(DATA);
var MESSAGE          = nacl.util.decodeUTF8(MESSAGE_STRING);
var SIGNATURE        = nacl.sign.detached(MESSAGE, KEYPAIR.secretKey);
var SIGNATURE_STRING = nacl.util.encodeBase64(SIGNATURE);
var KEYPAIR_STRINGS  = {
  publicKey: nacl.util.encodeBase64(KEYPAIR.publicKey),
  secretKey: nacl.util.encodeBase64(KEYPAIR.secretKey),
}

describe("signedJson.read", function() {
  
  it("correctly verifies and parses an message on the happy path", function(done) {
    var result = signedJson.read(MESSAGE_STRING, SIGNATURE_STRING, KEYPAIR_STRINGS.publicKey);

    expect(result).to.deep.equal(DATA);
    done();
  });



  it("should throw ArgumentError with null data", function(done) {

    var nullMessage   = function() { signedJson.read(null, SIGNATURE_STRING, KEYPAIR_STRINGS.publicKey); };
    var nullSignature = function() { signedJson.read(MESSAGE_STRING, null, KEYPAIR_STRINGS.publicKey); };
    var nullKey       = function() { signedJson.read(MESSAGE_STRING, SIGNATURE_STRING, null); };

    expect(nullMessage).to.throw(errors.ArgumentError);
    expect(nullSignature).to.throw(errors.ArgumentError);
    expect(nullKey).to.throw(errors.ArgumentError);
    done();
  });

  it("with truncated text");
  it("with invalid corrupted signature");
  it("with invalid wrong public key");

})


describe("signedJson.write", function() {
  

})