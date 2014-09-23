var helper   = require("./test_helper");
var request  = require("supertest-as-promised");
var expect   = helper.expect;
var walletV2 = require("../lib/models/wallet_v2");
var hash     = require("../lib/util/hash");
var Promise  = helper.Stex.Promise;
var _        = helper.Stex._;
var notp     = require("notp");

describe("POST /v2/login_params/show", function() {
  beforeEach(function(done) {
    this.submit = function(params) {
      return request(app)
        .post('/v2/login_params/show')
        .send(params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
    };

    done();
  });

  it("retrieves the login params properly by username", function() {
    return this.submit({username:"scott"}).expect(200);
  });

  it("fails to find the login params when none exists for the username", function() {
    return this.submit({username:"missing"}).expect(404);
  });

  it("locks an ip address out after the configured number of failed username lookups", function() {
    var self = this;
    return Promise.all([
      self.submit({username:"missing"}).expect(404),
      self.submit({username:"missing"}).expect(404),
      self.submit({username:"missing"}).expect(404),
      self.submit({username:"missing"}).expect(404),
      self.submit({username:"missing"}).expect(404),
      self.submit({username:"missing"}).expect(404),
    ])
    .then(function() {
      return self.submit({username:"scott"}).expect(404);
    });
  });
});

describe("POST /v2/wallets/show", function() {
  beforeEach(function(done) {
    this.submit = function(params) {
      return request(app)
        .post('/v2/wallets/show')
        .send(params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    this.lockout = function(username) {
      return Promise.all([
        this.submit({username:username, authToken:"somewrongtoken"}).expect(403),
        this.submit({username:username, authToken:"somewrongtoken"}).expect(403),
        this.submit({username:username, authToken:"somewrongtoken"}).expect(403),
        this.submit({username:username, authToken:"somewrongtoken"}).expect(403),
        this.submit({username:username, authToken:"somewrongtoken"}).expect(403),
        this.submit({username:username, authToken:"somewrongtoken"}).expect(403),
      ]);
    };

    done();
  });

  it("retrieves the wallet properly", function() {
    return this.submit({username:"scott", authToken:"authtoken"}).expect(200);
  });

  it("retrieves the wallet properly with totpToken", function() {
    return this.submit({username:"mfa", authToken:"authtoken", totpToken:notp.totp.gen("mytotpcode", {})}).expect(200);
  });

  it("fails with 403 when the username is not found", function() {
    return this.submit({username:"missing", authToken:"authtoken"}).expect(403);
  });

  it("fails with 403 when the authToken is incorrect", function() {
    return this.submit({username:"scott", authToken:"somewrongtoken"}).expect(403);
  });

  it("locks an ip address out after the configured number of failed login attempts", function() {
    var self = this;
    
    return this.lockout("scott").then(function() {    
      self.submit({username:"scott", authToken:"authtoken"}).expect(403);
    });
  });

  it("fails when the totpToken is required and is wrong", function() {
    return this.submit({username:"mfa", authToken:"authtoken", totpToken:"wrongvalue"}).expect(403);
  });
});


describe("POST /v2/wallets/create", function() {

  beforeEach(function(done) {
    this.params = {
      username:         "username",
      authToken:        "authtoken",
      updateKey:        "updatekey", //TODO: make me a valid AES-256 key
      salt:             "salt",
      kdfParams:        "kdfparams",
      mainData:         "mains",
      mainDataHash:     hash.sha1("mains"),
      keychainData:     "keys",
      keychainDataHash: hash.sha1("keys")
    };

    this.submit = function(params) {
      _.extend(this.params, params);

      return request(app)
        .post('/v2/wallets/create')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    done();
  });

  it("creates a wallet in the db when on the happy path", function() {
    return this.submit({})
      .then(function(rep) {
        return expect(walletV2.getWithAuthorization("username", "authtoken"))
          .to.eventually.exist;
      });
  });

  var blankTest = function(prop) {
    return function() {
      delete this.params[prop];
      //TODO: check for missing_field code
      return this.submit().expect(400);
    };
  };


  var badHashTest = function (prop) {
    return function() {
      var hashProp = prop + "Hash";
      this.params[hashProp] = "badhash";

      //TODO: check for invalid_hash code
      return this.submit().expect(400);
    };
  };

  it("fails when a username isn't provided",      blankTest("username"));
  it("fails when a salt isn't provided",          blankTest("salt"));
  it("fails when a kdfParams isn't provided",     blankTest("kdfParams"));
  it("fails when a authToken isn't provided",     blankTest("authToken"));
  it("fails when a updateKey isn't provided",     blankTest("updateKey"));
  it("fails when a mainData isn't provided",      blankTest("mainData"));
  it("fails when a keychainData isn't provided",  blankTest("keychainData"));

  it("fails when the provided mainDataHash doesn't verify the mainData",         badHashTest("mainData"));
  it("fails when the provided keychainDataHash doesn't verify the keychainData", badHashTest("keychainData"));

});