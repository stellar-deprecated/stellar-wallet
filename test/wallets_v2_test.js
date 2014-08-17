var helper  = require("./test_helper");
var request = require("supertest-as-promised");
var expect  = helper.expect;
var wallet  = require("../lib/models/wallet");
var hash    = require("../lib/util/hash");
var Promise = helper.Stex.Promise;
var _       = helper.Stex._;
var notp    = require("notp");

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
  })

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
      return self.submit({username:"scott"}).expect(404)
    });
  });
});

describe.only("POST /v2/wallets/show", function() {
  beforeEach(function(done) {
    this.submit = function(params) {
      return request(app)
        .post('/v2/wallets/show')
        .send(params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
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
      return Promise.all([
        self.submit({username:"scott", authToken:"authtoken"}).expect(403),
        self.submit({username:"david", authToken:"authtoken"}).expect(200),
      ]);
    });
  });

  it("fails when the totpToken is required and is wrong", function() {
    return this.submit({username:"mfa", authToken:"authtoken", totpToken:"wrongvalue"}).expect(403)
  });

});