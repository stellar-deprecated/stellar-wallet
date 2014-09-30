var helper     = require("../test_helper");
var signedJson = require("../../lib/util/signed_json");
var _          = helper.Stex._;
var errors     = helper.Stex.errors;
var nacl       = require("tweetnacl");

var SEED_STRING      = "iAziZHvikuV/KLVinhNAo15vwwFxLSq2X6H9bjNw1Ss=";
var SEED             = nacl.util.decodeBase64(SEED_STRING);
var KEYPAIR          = nacl.sign.keyPair.fromSeed(SEED);
var KEYPAIR_STRINGS  = {
  publicKey: nacl.util.encodeBase64(KEYPAIR.publicKey),
  secretKey: nacl.util.encodeBase64(KEYPAIR.secretKey),
};
var DATA             = {"somekey": 3};
var MESSAGE_STRING   = JSON.stringify(DATA);
var MESSAGE          = nacl.util.decodeUTF8(MESSAGE_STRING);
var SIGNATURE        = nacl.sign.detached(MESSAGE, KEYPAIR.secretKey);
var SIGNATURE_STRING = nacl.util.encodeBase64(SIGNATURE);

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

  it("should throw BadSignature with truncated text", function(done) {
    var truncatedText = function(){ 
      signedJson.read(
        MESSAGE_STRING.substring(0, MESSAGE_STRING.length - 3), 
        SIGNATURE_STRING, 
        KEYPAIR_STRINGS.publicKey
      ); 
    };

    expect(truncatedText).to.throw(signedJson.errors.BadSignature);
    done();
  });

  it("should throw BadSignature with invalid corrupted signature", function(done) {
    var newSignatureString = "a" + SIGNATURE_STRING.slice(1);

    var badSignature = function() { signedJson.read(MESSAGE_STRING, newSignatureString, KEYPAIR_STRINGS.publicKey); };

    expect(badSignature).to.throw(signedJson.errors.BadSignature);

    done();
  });

  it("should throw BadSignature with invalid wrong public key", function(done) {
    var publicKeyString = "a" + KEYPAIR_STRINGS.publicKey.slice(1);

    var badKey = function() { signedJson.read(MESSAGE_STRING, SIGNATURE_STRING, publicKeyString); };

    expect(badKey).to.throw(signedJson.errors.BadSignature);

    done();
  });

  it("should throw UnparseableBody with unparseable json", function(done) {
    var newMessageString   = MESSAGE_STRING + "(╯°□°）╯︵ ┻━┻"; //make it unparseable
    var newSignature       = nacl.sign.detached(nacl.util.decodeUTF8(newMessageString), KEYPAIR.secretKey);
    var newSignatureString = nacl.util.encodeBase64(newSignature);

    var badMessage = function() { signedJson.read(newMessageString, newSignatureString, KEYPAIR_STRINGS.publicKey); };

    expect(badMessage).to.throw(signedJson.errors.UnparseableBody);

    done();
  });
});

describe("signedJson.middleware", function() {
  it("should pass through to the next middleware if the request is properly signed");
  it("should populate req.verified.walletId string");
  it("should populate req.verified.body object");

  it("should return 401 Unauthorized if no Authorization header is set");
  it("should return 401 Unauthorized if no the wallet-id is not found");
  it("should return 401 Unauthorized if no the signature does not verify the body");
});