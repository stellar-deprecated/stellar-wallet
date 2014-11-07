var Stex           = require('stex');
var email          = require("../../util/email");
var errors         = Stex.errors;
var _              = Stex._;
var walletV2       = require("../../models/wallet-v2");
var signedJson     = require("../../util/signed-json");

var totp = module.exports;

totp.enable =  signedJson.action(function(req, res, next) {
  var body = req.verified.body;

  walletV2.getByWalletId(req.verified.username, req.verified.walletId)
    .then(function (wallet) {
      if (walletV2.isTotpEnabled(wallet)) {
        throw new errors.Forbidden();
      }

      return walletV2.enableTotp(wallet.id, body.lockVersion, body.totpKey, body.totpCode);
    })
    .then (function(result) { 
      res.send({
        "status":         "success",
        "newLockVersion": result.newLockVersion
      }); 
    })
    .catch(walletV2.errors.InvalidTotpKey, function(e) {
      res.status(400).send({
        "status": "fail",
        "field":  "totpKey",
        "code":   "missing"
      });
    })
    .catch(errors.Forbidden, function(err) {
      res.status(403).send({ "status": "fail", "code": "forbidden" });
    })
    .catch(walletV2.errors.InvalidTotpCode, function(err) {
      res.status(400).send({ "status": "fail", "code": "invalid_totp_code" });
    })
    .catch(errors.RecordNotFound, function(err) {
      res.status(400).send({ "status": "fail", "code": "not_found" });
    })
    .catch(next);
});

totp.disable = signedJson.action(function(req, res, next) {
  var body = req.verified.body;

  walletV2.getByWalletId(req.verified.username, req.verified.walletId)
    .then(function (wallet) {
      return walletV2.disableTotp(wallet.id, body.lockVersion, wallet.totpKey, body.totpCode);
    })
    .then (function(result) {
      res.send({
        "status":         "success",
        "newLockVersion": result.newLockVersion
      });
    })
    .catch(walletV2.errors.InvalidTotpCode, function(err) {
      res.status(400).send({ "status": "fail", "code": "invalid_totp_code" });
    })
    .catch(errors.RecordNotFound, function(err) {
      res.status(400).send({ "status": "fail", "code": "not_found" });
    })
    .catch(next);
});

totp.lostDevice = function(req, res, next) {
  // If the password is entered incorrectly, we provide no indication to the user,
  // so that we do not leak the passwords correctness to an attacker.
  var sendSuccessResponse = function() {
    res.send({
      "status": "success"
    });
  };

  walletV2.getByWalletId(req.body.username, req.body.walletId)
    .then(function (wallet) {
      return walletV2.initiateTotpGracePeriod(wallet.id);
    })
    .tap(function() {
      var usernameWithoutDomain = stex.fbgive.usernameWithoutDomain(req.body.username);
      email.sendEmail(usernameWithoutDomain, 'totp_disabled');
    })
    .then (sendSuccessResponse)
    .catch(errors.RecordNotFound, sendSuccessResponse)
    .catch(next);
};
