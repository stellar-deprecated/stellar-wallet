/*jshint expr: true*/
var helper   = require("./test_helper");
var walletV2 = require("../lib/models/wallet-v2");
var hash     = require("../lib/util/hash");
var Promise  = helper.Stex.Promise;
var _        = helper.Stex._;
var notp     = require("notp");

describe("GET /v2/kdf_params", function() {
  it("succeeds", function() {
    return test.supertestAsPromised(app)
        .get('/v2/kdf_params')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200);
  });
});

describe("POST /v2/wallets/show_login_params", function() {
  beforeEach(function(done) {
    this.submit = function(params) {
      return test.supertestAsPromised(app)
        .post('/v2/wallets/show_login_params')
        .send(params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    done();
  });

  it("retrieves the login params properly by username", function() {
    return this.submit({username:"scott@stellar.org"}).expect(200);
  });

  it("fails to find the login params when none exists for the username", function() {
    return this.submit({username:"missing"}).expect(404);
  });
});

describe("POST /v2/wallets/show", function() {
  beforeEach(function(done) {
    this.submit = function(params) {
      return test.supertestAsPromised(app)
        .post('/v2/wallets/show')
        .send(params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    this.lockout = function(username) {
      return Promise.all([
        this.submit({username:username, walletId:"somewrongtoken"}).expect(403),
        this.submit({username:username, walletId:"somewrongtoken"}).expect(403),
        this.submit({username:username, walletId:"somewrongtoken"}).expect(403),
        this.submit({username:username, walletId:"somewrongtoken"}).expect(403),
        this.submit({username:username, walletId:"somewrongtoken"}).expect(403),
        this.submit({username:username, walletId:"somewrongtoken"}).expect(403),
      ]);
    };

    done();
  });

  it("retrieves the wallet properly", function() {
    return this.submit({username:"scott@stellar.org", walletId:new Buffer("scott@stellar.org").toString("base64")}).expect(200);
  });

  it("retrieves the wallet properly with totpCode", function() {
    return this.submit({username:"mfa@stellar.org", walletId:new Buffer("mfa@stellar.org").toString("base64"), totpCode:notp.totp.gen("mytotpKey", {})}).expect(200);
  });

  it("fails with 403 when the username is not found", function() {
    return this.submit({username:"missing", walletId:new Buffer("authtoken").toString("base64")}).expect(403);
  });

  it("fails with 403 when the authToken is incorrect", function() {
    return this.submit({username:"scott@stellar.org", walletId:"somewrongtoken"}).expect(403);
  });

  it("locks an ip address out after the configured number of failed login attempts", function() {
    var self = this;
    
    return this.lockout("scott@stellar.org").then(function() {    
      self.submit({username:"scott@stellar.org", walletId:new Buffer("scott@stellar.org").toString("base64")}).expect(403);
    });
  });

  it("fails when the totpToken is required and is wrong", function() {
    return this.submit({username:"mfa@stellar.org", walletId:new Buffer("scott@stellar.org").toString("base64"), totpCode:"wrongvalue"}).expect(403);
  });
});


describe("POST /v2/wallets/create", function() {
  beforeEach(function(done) {
    this.params = {
      "username":         "nullstyle@stellar.org",
      "walletId":         new Buffer("12345678123456781234567812345678").toString('base64'),
      "salt":             new Buffer("1234567812345678").toString('base64'),
      "kdfParams":        "{}",
      "publicKey":        helper.testKeyPair.publicKey,
      "mainData":         "mains",
      "mainDataHash":     hash.sha1("mains"),
      "keychainData":     "keys",
      "keychainDataHash": hash.sha1("keys")
    };

    this.submit = function() {
      return test.supertestAsPromised(app)
        .post('/v2/wallets/create')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    done();
  });


  it("creates a wallet in the db when on the happy path", function() {
    return this.submit()
      .expect(200)
      .then(function() {
        return walletV2.get("nullstyle@stellar.org").then(function (wallet) {
          expect(wallet).to.exist;
        })
      });
  });

  it("fails when the username isn't provided", helper.blankTest("username"));
  it("fails when the username has already been taken", function() {
    this.params.username = "scott@stellar.org";
    return this.submit()
        .expect(400)
        .expectBody({field:"username", code:"already_taken"});
  });
  
  it("fails when the username contains invalid characters", function() {
    this.params.username = "(╯°□°）╯︵ ┻━┻";
    return this.submit()
        .expect(400)
        .expectBody({field:"username", code:"invalid_username"});
  });
  
  it("fails when the username doesnt look like an email", function() {
    this.params.username = "scott";
    return this.submit()
        .expect(400)
        .expectBody({field:"username", code:"invalid_username"});
  });
  
  it("fails when the username is less than 3 characters", function() {
    this.params.username = "aa";
    return this.submit()
        .expect(400)
        .expectBody({field:"username", code:"invalid_username"});
  });

  it("fails when the walletId isn't provided", helper.blankTest("walletId"));
  it("fails when the walletId is not a base64 encoded 32-byte value", function() {
    this.params.walletId = "aa";
    return this.submit()
        .expect(400)
        .expectBody({field:"walletId", code:"invalid_length"});
  });

  it("fails when the salt isn't provided", helper.blankTest("salt"));
  it("fails when the salt is less than 16-bytes", function() {
    this.params.salt = "aa";
    return this.submit()
        .expect(400)
        .expectBody({field:"salt", code:"invalid_length"});
  });

  it("fails when the kdfParams isn't provided", helper.blankTest("kdfParams"));
  it("fails when the kdfParams is not json", function() {
    this.params.kdfParams = "{";
    return this.submit()
      .expect(400)
      .expectBody({field: "kdfParams"});
  });

  it("fails when the publicKey isn't provided", helper.blankTest("publicKey"));
  it("fails when the publicKey cannot be an ed25519 key (i.e. 32-bytes long)", function() {
    this.params.publicKey = "aa";
    return this.submit()
        .expect(400)
        .expectBody({field:"publicKey", code:"invalid_length"});
  });

  it("fails when the mainData isn't provided", helper.blankTest("mainData"));
  it("fails when the provided mainHash doesn't verify the mainData", helper.badHashTest("mainData"));
  it("fails when the mainData is too large", function() {
    var self = this;

    this.params.mainData     = helper.makeString(2 * 1024 * 1024); //2 mb
    this.params.mainDataHash = hash.sha1(this.params.mainData);
    
    this.submit().expect(413);
      
  });

  it("fails when the keychainData isn't provided", helper.blankTest("keychainData"));
  it("fails when the provided keychainHash doesn't verify the keychainData", helper.badHashTest("keychainData"));
  it("fails when the keychainData is too large", function() {
    var self = this;

    this.params.keychainData     = helper.makeString(2 * 1024 * 1024); //2 mb
    this.params.keychainDataHash = hash.sha1(this.params.mainData);
    
    this.submit().expect(413);
  });
  
});


describe("POST /v2/wallets/update", function() {
  it("allows you to update multiple attributes of a wallet");
  it("confirms that keychainData is stored properly after writing it to the db");
  it("confirms that mainData is stored properly after writing it to the db");
  
  it("fails when signed by someone other than the owner");
  it("fails when signed incorrectly");
  it("fails when the lockVersion is wrong");
  
  it("fails when the provided mainDataHash doesn't verify the mainData");
  it("fails when the provided keychainHash doesn't verify the keychainData");
});


describe("POST /v2/totp/enable", function() {
  beforeEach(function(done) {
    this.params = {
      "lockVersion": 0,
      "totpKey": new Buffer("hello").toString("base64"),
      "totpCode": notp.totp.gen("hello", {})
    };

    this.submit = function() {
      return test.supertestAsPromised(app)
        .post('/v2/totp/enable')
        .sendSigned(this.params, "scott@stellar.org", helper.testKeyPair)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    done();

  });

  it("saves the totpKey on the wallet in the happy path", function(done) {
    var self = this;

    this.submit()
      .expect(200)
      .expectBody({status: "success", newLockVersion: 1})
      .end(function () {
        walletV2.get("scott@stellar.org").then(function(w) {
          expect(w.totpKey).to.eq(self.params.totpKey);
        })
        .finally(done);
      });
  });



  it("fails when the totpKey missing", helper.blankTest("totpKey"));
  it("fails when the totpCode is missing", function () {
    delete this.params.totpCode;
    return this.submit()
      .expect(400)
      .expectBody({status: "fail", code: "invalid_totp_code"});
  });

  it("fails when the totpCode is not the current value of the totpKey", function () {
    this.params.totpCode = notp.totp.gen("some other key", {});
    return this.submit()
      .expect(400)
      .expectBody({status: "fail", code: "invalid_totp_code"});
  });

  it("fails when the lockVersion specified in the update is not the same as the wallets current lockVersion", function () {
    this.params.lockVersion = -1;
    return this.submit()
      .expect(400)
      .expectBody({status: "fail", code: "not_found"});
  });

  it("does not update the totpKey if the message isn't signed properly", function (done) {
    var self = this;

    return test.supertestAsPromised(app)
      .post('/v2/totp/enable')
      .send(this.params)
      .set('Accept', 'application/json')
      .expect(400)
      .expectBody({status: "fail", code: "invalid_signature"})
      .end(function () {
        walletV2.get("scott@stellar.org").then(function(w) {
          expect(w.totpKey).to.be.null;
        })
        .finally(done);
      });
  });
});
