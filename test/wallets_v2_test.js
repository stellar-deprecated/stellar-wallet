var helper  = require("./test_helper");
var request = require("supertest-as-promised");
var expect  = helper.expect;
var wallet  = require("../lib/models/wallet");
var hash    = require("../lib/util/hash");
var Promise = helper.Stex.Promise;
var _       = helper.Stex._;

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