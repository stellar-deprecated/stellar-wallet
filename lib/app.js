var Stex    = require('stex');
var errors  = Stex.errors;
var _       = Stex._;
var Promise = Stex.Promise;

module.exports = Stex.new(__dirname + "/..", function(stex) {
  var router              = stex.router;
  var wallet              = require("./models/wallet");
  var loginFailureTracker = require("./models/login-failure-tracker");
  var refererTracker      = require("./models/referer-tracker");

  router.post('/wallets/show', rejectLockedOutIps, function(req, res, next) {
    refererTracker.track(req);
    
    var id = (req.body.id || "").toString();

    if (_.isEmpty(id)) {
      res.status(400).send({
        "status": "fail",
        "field":  "id",
        "code":   "missing"
      });
      return;
    }

    wallet.get(id).then(function(wallet) {
      if(typeof wallet === "undefined") {
        failAndRecordLockout(req,res)();
      } else {
        res.send({
          "status" : "success",
          "data"   : _.omit(wallet, ['recoveryId', 'recoveryData'])
        });
      }
    });
  });

  router.post('/wallets/create', rejectSpammedCreates, function(req, res, next) {
    var walletToSubmit = _.pick(req.body, [
      'id',
      'authToken',
      'mainData',
      'mainDataHash',
      'keychainData',
      'keychainDataHash'
    ]);

    loginFailureTracker.record("create:" + req.ip);

    wallet.create(walletToSubmit)
      .then (function(wallet) { 
        res.send({"status" : "success"}); 
      })
      .catch(wallet.errors.InvalidHash, function(e) {
        res.status(400).send({
          "status": "fail",
          "field":  e.field,
          "code":   "invalid_hash"
        });
      })
      .catch(errors.MissingField, function(e) {
        res.status(400).send({
          "status": "fail",
          "field":  e.field,
          "code":   "missing"
        });
      })
      .catch(errors.DuplicateRecord, function(e) {
        res.status(400).send({
          "status": "fail",
          "field":  "id",
          "code":   "already_taken"
        });
      })
      .catch(function(e) {
        next(e);
      });
  });

  router.post('/wallets/update', rejectLockedOutIps, function(req, res, next) {
    var id        = req.body.id;
    var authToken = req.body.authToken;
    var changes   = _.pick(req.body, [
      'mainData',
      'mainDataHash',
      'keychainData',
      'keychainDataHash',
    ]);

    wallet.update(id, authToken, changes)
      .then (function(wallet) { 
        res.send({"status" : "success"}); 
      })
      .catch(errors.RecordNotFound, errors.Forbidden, failAndRecordLockout(req,res))
      .catch(wallet.errors.InvalidHash, function(e) {
        res.status(400).send({
          "status": "fail",
          "field":  e.field,
          "code":   "invalid_hash"
        });
      })
      .catch(function(e) {
        next(e);
      });
  });

  router.post('/wallets/replace', rejectLockedOutIps, function(req, res, next) {
    var replaceArgs = _.at(req.body, 'oldId', 'oldAuthToken', 'newId', 'newAuthToken');

    wallet.replace.apply(null, replaceArgs)
      .then(function () {
        res.send({"status" : "success"}); 
      })
      .catch(errors.RecordNotFound, errors.Forbidden, failAndRecordLockout(req,res))
      .catch(function(e) {
        next(e);
      });
  });

  router.post('/wallets/recover', rejectLockedOutIps, function(req, res, next) {
    var recoveryId = req.body.recoveryId;

    if (_.isEmpty(recoveryId)) {
      res.status(400).send({
        "status": "fail",
        "field":  "recoveryId",
        "code":   "missing"
      });
      return;
    }

    wallet.getByRecoveryId(recoveryId).then(function(wallet) {
      if(typeof wallet === "undefined") {
        failAndRecordLockout(req,res)();
      } else {
        res.send({
          "status" : "success",
          "data"   : wallet
        });
      }
    });
  });

  router.post('/wallets/create_recovery_data', rejectLockedOutIps, function(req, res, next) {
    var id        = req.body.id;
    var authToken = req.body.authToken;
    var changes   = _.pick(req.body, [
      'recoveryId',
      'recoveryData',
      'recoveryDataHash'
    ]);

    wallet.createRecovery(id, authToken, changes)
      .then (function(wallet) {
        res.send({"status" : "success"});
      })
      .catch(errors.RecordNotFound, errors.Forbidden, failAndRecordLockout(req,res))
      .catch(wallet.errors.InvalidHash, function(e) {
        res.status(400).send({
          "status": "fail",
          "field":  e.field,
          "code":   "invalid_hash"
        });
      })
      .catch(function(e) {
        next(e);
      });
  });

  function failAndRecordLockout(req, res) {
    return function() {
      loginFailureTracker.record(req.ip);
      res.status(404).send({
        "status": "fail",
        "code":   "not_found"
      });
    };
  }

  function rejectLockedOutIps(req,res,next) {
    loginFailureTracker.isLoginAllowed(req.ip).then(function(isAllowed) {
      if(isAllowed) {
        next();
      } else {
        failSlow();
      }
    });

    function failSlow() {
      Promise.delay(loginFailureTracker.SLEEP_TIME)
        .then(function() {
          res.status(404).send({ "status": "fail", "code": "not_found" });
        });
    }
  }

  function rejectSpammedCreates(req,res,next) {
    loginFailureTracker.isLoginAllowed("create:" + req.ip).then(function(isAllowed) {
      if(isAllowed) {
        next();
      } else {
        failSlow();
      }
    });

    function failSlow() {
      Promise.delay(loginFailureTracker.SLEEP_TIME)
        .then(function() {
          res.status(404).send({ "status": "fail", "code": "not_found" });
        });
    }
  }
});
