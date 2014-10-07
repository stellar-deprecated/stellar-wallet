var Stex       = require('stex');
var errors     = Stex.errors;
var _          = Stex._;
var signedJson = require("../../util/signed-json");
var validate   = require("../../util/validate");
var walletV2   = require("../../models/wallet-v2");
var lockout    = require("../../models/lockout");

var wallets = module.exports;
  
wallets.showLoginParams = function(req, res, next) {
  walletV2.getLoginParams(req.body.username)
    .then(function(loginParams) {
      res.send(loginParams);
    })
    .catch(errors.RecordNotFound, function(err) {
      lockout.record(req.ip);
      failMissing(res);
    });
};

wallets.show = function(req, res, next) {
  lockout.ensureAllowed(req.ip)
    .then(function() {
      return walletV2.getWithAuthorization(req.body.username, req.body.walletId, req.body.totpCode);
    })
    .then(function(wallet) {
      res.send(_.pick(wallet, "lockVersion", "mainData", "keychainData"));
    })
    .catch(
      errors.RecordNotFound, 
      errors.Forbidden, 
      lockout.errors.Disabled,
      function(err) {
        res.status(403).send({ "status": "fail", "code": "forbidden" });
      });
};

wallets.create = function(req, res, next) {
  var attrs = _.pick(req.body, [
    "username",
    "walletId",
    "salt", 
    "kdfParams",
    "publicKey",
    "mainData",
    "mainDataHash",
    "keychainData",
    "keychainDataHash"
  ]);

  attrs.walletId = new Buffer(attrs.walletId || "", 'base64');

  walletV2.create(attrs)
    .then (function(walletV2) { 
      res.send({"status" : "success", "newLockVersion": 0}); 
    })
    .catch(errors.DuplicateRecord,  function(err) {
      fail(res, {field:"username", code:"already_taken"});
    })
    .catch(validate.errors.MissingField,    fieldFailer("missing", res))
    .catch(validate.errors.NotJson,         fieldFailer("invalid_json", res))
    .catch(validate.errors.InvalidHash,     fieldFailer("invalid_hash", res))
    .catch(validate.errors.InvalidUsername, fieldFailer("invalid_username", res))
    .catch(validate.errors.InvalidLength,   fieldFailer("invalid_length", res))
    .catch(next);
};

wallets.update = function(req, res, next) {
  var body = req.verified.body;

  var changes = _.pick(body, [
    'mainData',
    'mainDataHash',
    'keychainData',
    'keychainDataHash',
  ]);

  walletV2.getByWalletId(req.verified.walletId)
    .then(function (wallet) {
      return walletV2.update(wallet.id, body.lockVersion, changes);
    })
    .then (function(result) { 
      res.send({
        "status":         "success",
        "newLockVersion": result.newLockVersion
      }); 
    })
    .catch(errors.RecordNotFound,       missingFailer(res))
    .catch(validate.errors.InvalidHash, fieldFailer("invalid_hash", res))
    .catch(next);
};

function fail(res, params) {
  params = _.extend({"status": "fail"}, params);
  res.status(400).send(params);
}

function failMissing(res) {
  res.status(404).send({ "status": "fail", "code": "not_found" });
}

function fieldFailer(code, res) {
  return function(e) {
    fail(res, {
      "field":  e.field,
      "code":   code,
    });
  };
}

function missingFailer(res) {
  return function(e) {
    failMissing(res);
  };
}
