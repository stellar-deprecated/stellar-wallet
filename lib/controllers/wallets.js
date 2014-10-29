var Stex           = require('stex');
var errors         = Stex.errors;
var _              = Stex._;
var Promise        = Stex.Promise;
var wallet         = require("../models/wallet");
var validate       = require("../util/validate");
var lockout        = require("../models/lockout");
var refererTracker = require("../models/referer-tracker");

var wallets = module.exports;

var lockoutByIP = lockout.middleware(
  function(req, res) { 
    return req.ip; 
  },
  function(req, res) {
    Promise.delay(lockout.SLEEP_TIME)
      .then(function() {
        res.status(404).send({ "status": "fail", "code": "not_found" });
      });
  }
);

var rejectSpammedCreates = lockout.middleware(
  function(req, res) { 
    return "create:" + req.ip; 
  },
  function(req, res) {
    Promise.delay(lockout.SLEEP_TIME)
      .then(function() {
        res.status(404).send({ "status": "fail", "code": "not_found" });
      });
  }
);


wallets.show = [lockoutByIP, function(req, res, next) {
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
  })
  .catch(function(e) {
    next(e);
  });
}];

wallets.create = [rejectSpammedCreates, function(req, res, next) {
  var walletToSubmit = _.pick(req.body, [
    'id',
    'authToken',
    'mainData',
    'mainDataHash',
    'keychainData',
    'keychainDataHash'
  ]);

  lockout.record("create:" + req.ip);

  wallet.create(walletToSubmit)
    .then (function(wallet) { 
      res.send({"status" : "success"}); 
    })
    .catch(validate.errors.InvalidHash, function(e) {
      res.status(400).send({
        "status": "fail",
        "field":  e.field,
        "code":   "invalid_hash"
      });
    })
    .catch(validate.errors.MissingField, function(e) {
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
}];

wallets.update = [lockoutByIP, function(req, res, next) {
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
    .catch(validate.errors.InvalidHash, function(e) {
      res.status(400).send({
        "status": "fail",
        "field":  e.field,
        "code":   "invalid_hash"
      });
    })
    .catch(function(e) {
      next(e);
    });
}];

wallets.replace = [lockoutByIP, function(req, res, next) {
  var replaceArgs = _.at(req.body, 'oldId', 'oldAuthToken', 'newId', 'newAuthToken');

  wallet.replace.apply(null, replaceArgs)
    .then(function () {
      res.send({"status" : "success"}); 
    })
    .catch(errors.RecordNotFound, errors.Forbidden, failAndRecordLockout(req,res))
    .catch(function(e) {
      next(e);
    });
}];

wallets.recover = [lockoutByIP, function(req, res, next) {
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
}];

wallets.createRecoveryData = [lockoutByIP, function(req, res, next) {
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
    .catch(validate.errors.InvalidHash, function(e) {
      res.status(400).send({
        "status": "fail",
        "field":  e.field,
        "code":   "invalid_hash"
      });
    })
    .catch(function(e) {
      next(e);
    });
}];

wallets.markMigrated = [lockoutByIP, function(req, res, next) {
  var id        = req.body.id;
  var authToken = req.body.authToken;

  wallet.markMigrated(id, authToken)
    .then (function(wallet) {
      res.send({"status" : "success"});
    })
    .catch(errors.RecordNotFound, errors.Forbidden, failAndRecordLockout(req,res))
    .catch(function(e) {
      next(e);
    });
}];


function failAndRecordLockout(req, res) {
  return function() {
    lockout.record(req.ip);
    res.status(404).send({
      "status": "fail",
      "code":   "not_found"
    });
  };
}

