var Stex       = require('stex');
var errors     = Stex.errors;
var _          = Stex._;
var signedJson = require("../../util/signed-json");
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
      res.status(404).send({ "status": "fail", "code": "not_found" });
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

  attrs.walletId = new Buffer(attrs.walletId, 'base64');

  walletV2.create(attrs)
    .then (function(walletV2) { 
      res.send({"status" : "success"}); 
    })
    .catch(function(e) {
      next(e);
    });
};
