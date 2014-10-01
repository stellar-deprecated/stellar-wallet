var helper     = require("../test_helper");
var signedJson = require("../../lib/util/signed_json");
var sign       = require("../../lib/util/sign");
var _          = helper.Stex._;
var errors     = helper.Stex.errors;

var SEED             = "iAziZHvikuV/KLVinhNAo15vwwFxLSq2X6H9bjNw1Ss=";
var KEYPAIR          = sign.keyPair(SEED);
var DATA             = {"somekey": 3};
var MESSAGE          = JSON.stringify(DATA);
var SIGNATURE        = sign.gen(MESSAGE, KEYPAIR.secretKey);

describe("signedJson.read", function() {
  
  it("correctly verifies and parses an message on the happy path", function(done) {
    var result = signedJson.read(MESSAGE, SIGNATURE, KEYPAIR.publicKey);

    expect(result).to.deep.equal(DATA);
    done();
  });

  it("should throw ArgumentError with null data", function(done) {
    var nullMessage   = function() { signedJson.read(null, SIGNATURE, KEYPAIR.publicKey); };
    var nullSignature = function() { signedJson.read(MESSAGE, null, KEYPAIR.publicKey); };
    var nullKey       = function() { signedJson.read(MESSAGE, SIGNATURE, null); };

    expect(nullMessage).to.throw(errors.ArgumentError);
    expect(nullSignature).to.throw(errors.ArgumentError);
    expect(nullKey).to.throw(errors.ArgumentError);
    done();
  });

  it("should throw BadSignature with truncated text", function(done) {
    var truncatedText = function(){ 
      signedJson.read(
        MESSAGE.substring(0, MESSAGE.length - 3), 
        SIGNATURE, 
        KEYPAIR.publicKey
      ); 
    };

    expect(truncatedText).to.throw(signedJson.errors.BadSignature);
    done();
  });

  it("should throw BadSignature with invalid corrupted signature", function(done) {
    var newSignatureString = "a" + SIGNATURE.slice(1);

    var badSignature = function() { signedJson.read(MESSAGE, newSignatureString, KEYPAIR.publicKey); };

    expect(badSignature).to.throw(signedJson.errors.BadSignature);

    done();
  });

  it("should throw BadSignature with invalid wrong public key", function(done) {
    var publicKeyString = "a" + KEYPAIR.publicKey.slice(1);

    var badKey = function() { signedJson.read(MESSAGE, SIGNATURE, publicKeyString); };

    expect(badKey).to.throw(signedJson.errors.BadSignature);

    done();
  });

  it("should throw UnparseableBody with unparseable json", function(done) {
    var newMessageString   = MESSAGE + "(╯°□°）╯︵ ┻━┻"; //make it unparseable
    var newSignature       = sign.gen(newMessageString, KEYPAIR.secretKey);

    var badMessage = function() { signedJson.read(newMessageString, newSignature, KEYPAIR.publicKey); };

    expect(badMessage).to.throw(signedJson.errors.UnparseableBody);

    done();
  });
});

describe("signedJson.middleware", function() {
  beforeEach(function () {
    this.submit = function() {
      return test.supertestAsPromised(app)
        .post('/v2/signed_json_test')
        .sendSigned({tableFlip: "(╯°□°）╯︵ ┻━┻"}, "scott", helper.testKeyPair)
        .set('Accept', 'application/json');
    };
  });

  it("should pass through to the next middleware if the request is properly signed", function() {
    return this.submit().expect(200);
  });

  it("should populate req.verified.walletId string", function() {
    return this.submit().expectBody({ walletId:  new Buffer("scott").toString("base64") });
  });

  it("should populate req.verified.body object", function() {
    return this.submit().expectBody({ 
        body:  {
          tableFlip: "(╯°□°）╯︵ ┻━┻"
        }
      });
  });

  it("should return 401 Unauthorized if no Authorization header is set", function() {
    return this.submit()
      .set('Authorization', null)
      .expect(401);
  });

  it("should return 401 Unauthorized if no the wallet-id is not found", function() {
    return this.submit()
      .setAuthHeader('notfound', "somesignature")
      .expect(401);
  });

  it("should return 401 Unauthorized if no the signature does not verify the body", function() {
    var signature = sign.gen("some message", helper.testKeyPair.secretKey);
    return this.submit()
      .setAuthHeader("scott", signature)
      .expect(401);
  });
});