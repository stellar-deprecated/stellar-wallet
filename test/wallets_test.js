var helper  = require("./test_helper");
var request = helper.stexDev.supertest;
var should  = helper.stexDev.should;
var wallet  = require("../lib/models/wallet");
var hash    = require("../lib/util/hash");

describe("POST /wallets/show", function() {
  beforeEach(function(done) {
    this.params = {}

    this.submit = function() {
      return request(app)
        .post('/wallets/show')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
    }

    done();
  })

  it("retrieves the wallet properly", function(done) {
    var self = this;
    self.params.id = '1';

    hash.locator(self.params.id).then(function(hashedId) {

      self.submit()
        .expect(function(res) {
          res.body.should.match({
            status : "success",
            data   : { id : hashedId }
          })
        })
        .expect(200)
        .end(done);
    });
  })
  
  it("fails to find a wallet when none exists for the id", function(done) {
    var self = this;
    self.params.id = '-1';

    this.submit()
      .expect(function(res) {
        res.body.should.match({
          status : "fail",
          code   : "not_found"
        })
      })
      .expect(404, done);
  });

  it("tells the client when no params are provided", function(done) {
    this.submit()
      .expect(function(res) {
        res.body.should.match({
          "status": "fail",
          "field":  "id",
          "code":   "missing"
        })
      })
      .expect(400, done);
  });
});

describe("POST /wallets/create", function() {

  beforeEach(function(done) {
    this.params = {
      "id":               "2",
      "recoveryId":       "2",
      "authToken":        "2",
      "mainData":         "mains",
      "mainDataHash":     helper.sha1("mains"),
      "recoveryData":     "reco",
      "recoveryDataHash": helper.sha1("reco"),
      "keychainData":     "keys",
      "keychainDataHash": helper.sha1("keys")
    }

    this.submit = function() {
      return request(app)
        .post('/wallets/create')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
    }

    done();
  });


  it("creates a wallet in the db when on the happy path", function(done) {
    this.submit()
      .expect(200)
      .expect(function(res) {
        res.body.should.match({ status : "success" })
      })
      .end(done);
  });

  it("fails when a wallet has already been created with the provided id", function(done) {
    this.params.id = "1";

    this.submit()
      .expect(400)
      .expect(function(res) {
        res.body.should.match({ 
          status: "fail",
          code:   "already_taken",
          field:  "id"
        })
      })
      .end(done);
  });

  it("fails when the provided mainHash doesn't verify the mainData",         badHashTest("mainData"));
  it("fails when the provided keychainHash doesn't verify the keychainData", badHashTest("keychainData"));


  var blankTest = function(prop) {
    return function(done) {
      delete this.params[prop];

      this.submit()
        .expect(400)
        .expect(function(res) {
          res.body.should.match({ 
            status: "fail",
            code:   "missing",
            field:  prop
          })
        })
        .end(done);
    }
  }

  it("fails when an id isn't provided",           blankTest("id"));
  it("fails when a authToken isn't provided",     blankTest("authToken"));
  it("fails when a mainData isn't provided",      blankTest("mainData"));
  it("fails when a keychainData isn't provided",  blankTest("keychainData"));
});

describe("POST /wallets/update", function() {

  beforeEach(function(done) {

    this.params = {
      "id":               "1",
      "authToken":        "1",
      "mainData":         "mains2",
      "mainDataHash":     helper.sha1("mains2"),
      "keychainData":     "keys2",
      "keychainDataHash": helper.sha1("keys2")
    }

    this.submit = function() {
      return request(app)
        .post('/wallets/update')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
    }

    this.submitWithSuccessTest = function() {
      return this.submit()
        .expect(200)
        .expect(function(res) {
          res.body.should.match({ status : "success" })
        });
    }

    done();
  });


  it("updates a wallet in the db when on the happy path", function(done) {
    var self = this;

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        w.mainData.toString("utf-8").should.equal(self.params.mainData);
        w.keychainData.toString("utf-8").should.equal(self.params.keychainData);
      })
      .finally(done)
    });
  });

  it("prevents the update of recoveryId", function(done) {
    var self = this;

    this.params.recoveryId = "3";
    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        w.recoveryId.should.not.equal("3");
      })
      .finally(done)
    });
  });

  it("allows the update of individual *Data columns", function(done) {
    var self = this;
    delete this.params.mainData;
    delete this.params.mainDataHash;

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        w.mainData.toString("utf-8").should.not.equal("mains2");
        w.keychainData.toString("utf-8").should.equal("keys2");
      })
      .finally(done)
    });
  });

  it("fails when the provided authToken does not match the stored token", function(done) {
    this.params.authToken = "wrong!"
    this.submit()
      .expect(403)
      .expect(function(res) {
        res.body.should.match({ 
          status: "fail",
          code:   "forbidden"
        })
      })
      .end(done);
  });

  it("fails when the provided mainHash doesn't verify the mainData",         badHashTest("mainData"));
  it("fails when the provided keychainHash doesn't verify the keychainData", badHashTest("keychainData"));
});


describe("POST /wallets/replace", function() {
  beforeEach(function(done) {

    this.params = {
      "oldId":        "1",
      "newId":        "3",
      "oldAuthToken": "1",
      "newAuthToken": "3"
    }

    this.submit = function() {
      return request(app)
        .post('/wallets/replace')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
    }

    done();
  });


  it("deletes the old wallet on the happy path", function(done) {
    var self = this;

    var confirmDeletion = function() {
      wallet.get(self.params.oldId)
        .then(function(w) {
          should.not.exist(w);
        })
        .finally(done)
    };

    this.submit()
      .expect(200)
      .expect(function(res) {
        res.body.should.match({ status : "success" })
      })
      .end(confirmDeletion)
  });

  it("fails when the provided oldId does not match a wallet", function(done) {
    this.params.oldId = "nogood"
    this.submit()
      .expect(404)
      .expect(function(res) {
        res.body.should.match({ status : "fail", code: "not_found" })
      })
      .end(done)
  });

  it("fails when the provided newId does not match a wallet", function(done) {
    this.params.newId = "nogood"
    this.submit()
      .expect(404)
      .expect(function(res) {
        res.body.should.match({ status : "fail", code: "not_found" })
      })
      .end(done)
  });

  it("fails when the provided oldAuthToken does not match the stored token from the old wallet", function(done) {
    this.params.oldAuthToken = "nogood"
    this.submit()
      .expect(403)
      .expect(function(res) {
        res.body.should.match({ status : "fail", code: "forbidden" })
      })
      .end(done)
  });

  it("fails when the provided newAuthToken does not match the stored token from the new wallet", function(done) {
    this.params.newAuthToken = "nogood"
    this.submit()
      .expect(403)
      .expect(function(res) {
        res.body.should.match({ status : "fail", code: "forbidden" })
      })
      .end(done)
  });

});

describe("POST /wallets/recover", function() {
  beforeEach(function(done) {
    this.params = {}

    this.submit = function() {
      return request(app)
        .post('/wallets/recover')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
    }

    done();
  })

  it("retrieves the wallet properly", function(done) {
    var self = this;
    self.params.recoveryId = '1';

    hash.locator(self.params.recoveryId).then(function(hashedRecoveryId) {

      self.submit()
        .expect(function(res) {
          res.body.should.match({
            status : "success",
            data   : { recoveryId : hashedRecoveryId }
          })
        })
        .expect(200)
        .end(done);
    });
  })

  it("fails to find a wallet when none exists for the recoveryId", function(done) {
    var self = this;
    self.params.recoveryId = '-1';

    this.submit()
      .expect(function(res) {
        res.body.should.match({
          status : "fail",
          code   : "not_found"
        })
      })
      .expect(404, done);
  });

  it("tells the client when no params are provided", function(done) {
    this.submit()
      .expect(function(res) {
        res.body.should.match({
          "status": "fail",
          "field":  "recoveryId",
          "code":   "missing"
        })
      })
      .expect(400, done);
  });
});

describe("POST /wallets/create_recovery_data", function() {

  beforeEach(function(done) {

    this.params = {
      "id":               "4",
      "authToken":        "4",
      "recoveryId":       "recoveryId",
      "recoveryData":     "foo4",
      "recoveryDataHash": helper.sha1("foo4")
    }

    this.submit = function() {
      return request(app)
        .post('/wallets/create_recovery_data')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
    }

    this.submitWithSuccessTest = function() {
      return this.submit()
        .expect(200)
        .expect(function(res) {
          res.body.should.match({ status : "success" })
        });
    }

    done();
  });


  it("updates a wallet in the db when on the happy path", function(done) {
    var self = this;

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        w.recoveryData.toString("utf-8").should.equal(self.params.recoveryData);
        hash.locator(self.params.recoveryId).then(function(recoveryId){
          w.recoveryId.should.equal(recoveryId);
        });
      })
        .finally(done)
    });
  });

  it("allows the update of recoveryId", function(done) {
    var self = this;

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        hash.locator("recoveryId").then(function(recoveryId){
          w.recoveryId.should.equal(recoveryId);
        });
      })
        .finally(done)
    });
  });

  it("fails when the provided authToken does not match the stored token", function(done) {
    this.params.authToken = "wrong!"
    this.submit()
      .expect(403)
      .expect(function(res) {
        res.body.should.match({
          status: "fail",
          code:   "forbidden"
        })
      })
      .end(done);
  });

  it("fails when the provided recoveryHash doesn't verify the recoveryData", badHashTest("recoveryData"));
});


function badHashTest(prop) {
  return function(done) {
    hashProp = prop + "Hash";
    this.params[hashProp] = "badhash";

    this.submit()
      .expect(400)
      .expect(function(res) {
        res.body.should.match({ 
          status: "fail",
          code:   "invalid_hash",
          field:  prop
        })
      })
      .end(done);
  }
}
