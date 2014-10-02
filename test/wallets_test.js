var helper  = require("./test_helper");
var wallet  = require("../lib/models/wallet");
var hash    = require("../lib/util/hash");
var _       = helper.Stex._;

describe("POST /wallets/show", function() {
  beforeEach(function(done) {
    this.params = {};
    this.referer = "https://launch.stellar.org/#login";
    this.submit = function() {
      return test.supertest(app)
        .post('/wallets/show')
        .send(this.params)
        .set("Referer", this.referer)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    done();
  });

  it("retrieves the wallet properly", function(done) {
    var self = this;
    self.params.id = '1';

    hash.locator(self.params.id).then(function(hashedId) {

      self.submit()
        .expectBody({
          status : "success",
          data   : { id : hashedId }
        })
        .expect(200)
        .end(done);
    });
  });
  
  it("fails to find a wallet when none exists for the id", function(done) {
    var self = this;
    self.params.id = '-1';

    this.submit()
      .expectBody({
        status : "fail",
        code   : "not_found"
      })
      .expect(404, done);
  });

  it("tells the client when no params are provided", function(done) {
    this.submit()
      .expectBody({
        "status": "fail",
        "field":  "id",
        "code":   "missing"
      })
      .expect(400, done);
  });


  it("locks a user out after the configured number of failed attempts", function(done) {
    var self = this;
    self.timeout(5000);
    self.params.id = '-1';

    this.sinon.spy(log, 'warn');

    var submitBad = function(timesLeft, cb) {
      if(timesLeft > 0) {
        self.submit().end(function() {
          submitBad(timesLeft - 1, cb);
        });
      } else {
        cb();
      }
    };

    submitBad(6, function() {
      // NOTE: the log emission code in lockout is broken
      // re-enable this code when https://github.com/stellar/stellar-wallet/issues/28 is solved
      // expect(log.warn.callCount).to.be.at.least(1);
      // expect(log.warn.firstCall.args[0]).to.have.properties({event: "lockout", lockedOutId: "127.0.0.1"});

      self.params.id = '1';
      self.submit().expect(404).end(done);
    });
  });


  var expectNoRefererWarning = function() {
    expect(log.warn.callCount).to.eq(0);
  };

  var expectRefererWarning = function() {
      expect(log.warn.callCount).to.be.at.least(1);
      expect(log.warn.firstCall.args[0]).to.have.properties({event: "bad_referer"});

  };

  it("doesn't log a warning when the referer is as expected", function(done) {
    this.sinon.spy(log, 'warn');
    this.referer = "https://launch.stellar.org/#login";
    this.submit().end(function() {
      expectNoRefererWarning();
      done();
    });
  });

  it("doesn't log a warning when the referer is localhost", function(done) {
    this.sinon.spy(log, 'warn');
    this.referer = "http://localhost:8000";
    this.submit().end(function() {
      expectNoRefererWarning();
      done();
    });
  });

  it("logs a warning when the request has no referer", function(done) {
    this.sinon.spy(log, 'warn');
    this.referer = "";
    this.submit().end(function() {
      expectRefererWarning();
      done();
    });
  });

  it("logs a warning when the referer is a valid url but is from an unexpected domain", function(done) {
    this.sinon.spy(log, 'warn');
    this.referer = "https://strdice.com/#login";
    this.submit().end(function() {
      expectRefererWarning();
      done();
    });
  });

  it("logs a warning when the referer is an invalid url", function(done) {
    this.sinon.spy(log, 'warn');
    this.referer = "(╯°□°)╯︵ ┻━┻";
    this.submit().end(function() {
      expectRefererWarning();
      done();
    });
  });

});

describe("POST /wallets/create", function() {

  beforeEach(function(done) {
    this.params = {
      "id":               "2",
      "recoveryId":       "2",
      "authToken":        "2",
      "mainData":         "mains",
      "mainDataHash":     hash.sha1("mains"),
      "recoveryData":     "reco",
      "recoveryDataHash": hash.sha1("reco"),
      "keychainData":     "keys",
      "keychainDataHash": hash.sha1("keys")
    };

    this.submit = function() {
      return test.supertest(app)
        .post('/wallets/create')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    done();
  });


  it("creates a wallet in the db when on the happy path", function(done) {
    this.submit()
      .expect(200)
      .expectBody({ status : "success" })
      .end(done);
  });

  it("fails when a wallet has already been created with the provided id", function(done) {
    this.params.id = "1";

    this.submit()
      .expect(400)
      .expectBody({ 
        status: "fail",
        code:   "already_taken",
        field:  "id"
      })
      .end(done);
  });

  it("fails when the provided mainHash doesn't verify the mainData",         helper.badHashTest("mainData"));
  it("fails when the provided keychainHash doesn't verify the keychainData", helper.badHashTest("keychainData"));


  it("fails when an id isn't provided",           helper.blankTest("id"));
  it("fails when a authToken isn't provided",     helper.blankTest("authToken"));
  it("fails when a mainData isn't provided",      helper.blankTest("mainData"));
  it("fails when a keychainData isn't provided",  helper.blankTest("keychainData"));
});

describe("POST /wallets/update", function() {

  beforeEach(function(done) {

    this.params = {
      "id":               "1",
      "authToken":        "1",
      "mainData":         "mains2",
      "mainDataHash":     hash.sha1("mains2"),
      "keychainData":     "keys2",
      "keychainDataHash": hash.sha1("keys2")
    };

    this.submit = function() {
      return test.supertest(app)
        .post('/wallets/update')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    this.submitWithSuccessTest = function() {
      return this.submit()
        .expect(200)
        .expectBody({ status : "success" });
    };

    done();
  });


  it("updates a wallet in the db when on the happy path", function(done) {
    var self = this;

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        expect(w.mainData.toString("utf-8")).to.equal(self.params.mainData);
        expect(w.keychainData.toString("utf-8")).to.equal(self.params.keychainData);
      })
      .finally(done);
    });
  });

  it("prevents the update of recoveryId", function(done) {
    var self = this;

    this.params.recoveryId = "3";
    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        expect(w.recoveryId).to.not.equal("3");
      })
      .finally(done);
    });
  });

  it("allows the update of individual *Data columns", function(done) {
    var self = this;
    delete this.params.mainData;
    delete this.params.mainDataHash;

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        expect(w.mainData.toString("utf-8")).to.not.equal("mains2");
        expect(w.keychainData.toString("utf-8")).to.equal("keys2");
      })
      .finally(done);
    });
  });

  it("fails when the provided authToken does not match the stored token", function(done) {
    this.params.authToken = "wrong!";
    this.submit()
      .expect(403)
      .expectBody({ 
        status: "fail",
        code:   "forbidden"
      })
      .end(done);
  });

  it("fails when the provided authToken is blank", function(done) {
    delete this.params.authToken;
    this.submit()
      .expect(403)
      .expectBody({ 
        status: "fail",
        code:   "forbidden"
      })
      .end(done);
  });

  it("fails when the entire body is blank", function(done) {
    this.params = {};
    this.submit()
      .expect(404)
      .expectBody({ 
        status: "fail",
        code:   "not_found"
      })
      .end(done);
  });

  it("fails when the provided mainHash doesn't verify the mainData",         helper.badHashTest("mainData"));
  it("fails when the provided keychainHash doesn't verify the keychainData", helper.badHashTest("keychainData"));

  it("succeeds with inputs of 1mb in size", function(done) {
    var self = this;

    this.params.mainData     = helper.makeString(1 * 1024 * 1024); //1 mb
    this.params.mainDataHash = hash.sha1(this.params.mainData);

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {

        expect(w.mainData.length).to.equal(self.params.mainData.length);
      })
      .finally(done);
    });
  });
});


describe("POST /wallets/replace", function() {
  beforeEach(function(done) {

    this.params = {
      "oldId":        "1",
      "newId":        "3",
      "oldAuthToken": "1",
      "newAuthToken": "3"
    };

    this.submit = function() {
      return test.supertest(app)
        .post('/wallets/replace')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    done();
  });


  it("deletes the old wallet on the happy path", function(done) {
    var self = this;

    var confirmDeletion = function() {
      wallet.get(self.params.oldId)
        .then(function(w) {
          expect(w).to.not.exist;
        })
        .finally(done);
    };

    this.submit()
      .expect(200)
      .expectBody({ status : "success" })
      .end(confirmDeletion);
  });

  it("fails when the provided oldId does not match a wallet", function(done) {
    this.params.oldId = "nogood";
    this.submit()
      .expect(404)
      .expectBody({ status : "fail", code: "not_found" })
      .end(done);
  });

  it("fails when the provided newId does not match a wallet", function(done) {
    this.params.newId = "nogood";
    this.submit()
      .expect(404)
      .expectBody({ status : "fail", code: "not_found" })
      .end(done);
  });

  it("fails when the provided oldAuthToken does not match the stored token from the old wallet", function(done) {
    this.params.oldAuthToken = "nogood";
    this.submit()
      .expect(403)
      .expectBody({ status : "fail", code: "forbidden" })
      .end(done);
  });


  it("fails when the provided oldAuthToken is blank", function(done) {
    delete this.params.oldAuthToken;
    this.submit()
      .expect(403)
      .expectBody({ 
        status: "fail",
        code:   "forbidden"
      })
      .end(done);
  });

  it("fails when the provided newAuthToken does not match the stored token from the new wallet", function(done) {
    this.params.newAuthToken = "nogood";
    this.submit()
      .expect(403)
      .expectBody({ status : "fail", code: "forbidden" })
      .end(done);
  });


  
  it("fails when the provided newAuthToken is blank", function(done) {
    delete this.params.newAuthToken;
    this.submit()
      .expect(403)
      .expectBody({ 
        status: "fail",
        code:   "forbidden"
      })
      .end(done);
  });

});

describe("POST /wallets/recover", function() {
  beforeEach(function(done) {
    this.params = {};

    this.submit = function() {
      return test.supertest(app)
        .post('/wallets/recover')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    done();
  });

  it("retrieves the wallet properly", function(done) {
    var self = this;
    self.params.recoveryId = '1';

    hash.locator(self.params.recoveryId).then(function(hashedRecoveryId) {

      self.submit()
        .expectBody({
          status : "success",
          data   : { recoveryId : hashedRecoveryId }
        })
        .expect(200)
        .end(done);
    });
  });

  it("fails to find a wallet when none exists for the recoveryId", function(done) {
    var self = this;
    self.params.recoveryId = '-1';

    this.submit()
      .expectBody({
        status : "fail",
        code   : "not_found"
      })
      .expect(404, done);
  });

  it("tells the client when no params are provided", function(done) {
    this.submit()
      .expectBody({
        "status": "fail",
        "field":  "recoveryId",
        "code":   "missing"
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
      "recoveryDataHash": hash.sha1("foo4")
    };

    this.submit = function() {
      return test.supertest(app)
        .post('/wallets/create_recovery_data')
        .send(this.params)
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
    };

    this.submitWithSuccessTest = function() {
      return this.submit()
        .expect(200)
        .expectBody({ status : "success" });
    };

    done();
  });


  it("updates a wallet in the db when on the happy path", function(done) {
    var self = this;

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        expect(w.recoveryData.toString("utf-8")).to.equal(self.params.recoveryData);

        hash.locator(self.params.recoveryId).then(function(recoveryId){
          expect(w.recoveryId).to.equal(recoveryId);
        });

      })
        .finally(done);
    });
  });

  it("allows the update of recoveryId", function(done) {
    var self = this;

    this.submitWithSuccessTest().end(function() {
      wallet.get(self.params.id).then(function(w) {
        hash.locator("recoveryId").then(function(recoveryId){
          expect(w.recoveryId).to.equal(recoveryId);
        });
      })
        .finally(done);
    });
  });

  it("fails when the provided authToken does not match the stored token", function(done) {
    this.params.authToken = "wrong!";
    this.submit()
      .expect(403)
      .expectBody({
        status: "fail",
        code:   "forbidden"
      })
      .end(done);
  });

  it("fails when the provided recoveryHash doesn't verify the recoveryData", helper.badHashTest("recoveryData"));
});
