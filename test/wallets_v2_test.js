var helper   = require("./test_helper");
var walletV2 = require("../lib/models/wallet_v2");
var hash     = require("../lib/util/hash");
var Promise  = helper.Stex.Promise;
var _        = helper.Stex._;
var notp     = require("notp");

describe.only("GET /v2/kdf_params", function() {
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
    return this.submit({username:"scott"}).expect(200);
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
    return this.submit({username:"scott", walletId:new Buffer("authtoken").toString("base64")}).expect(200);
  });

  it("retrieves the wallet properly with totpCode", function() {
    return this.submit({username:"mfa", walletId:new Buffer("authtoken").toString("base64"), totpCode:notp.totp.gen("mytotpKey", {})}).expect(200);
  });

  it("fails with 403 when the username is not found", function() {
    return this.submit({username:"missing", walletId:new Buffer("authtoken").toString("base64")}).expect(403);
  });

  it("fails with 403 when the authToken is incorrect", function() {
    return this.submit({username:"scott", walletId:"somewrongtoken"}).expect(403);
  });

  it("locks an ip address out after the configured number of failed login attempts", function() {
    var self = this;
    
    return this.lockout("scott").then(function() {    
      self.submit({username:"scott", walletId:new Buffer("authtoken").toString("base64")}).expect(403);
    });
  });

  it("fails when the totpToken is required and is wrong", function() {
    return this.submit({username:"mfa", walletId:new Buffer("authtoken").toString("base64"), totpCode:"wrongvalue"}).expect(403);
  });
});


describe("POST /v2/wallets/create", function() {});