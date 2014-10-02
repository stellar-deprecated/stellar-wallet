var Stex    = require('stex');
var errors  = Stex.errors;
var _       = Stex._;
var Promise = Stex.Promise;

module.exports = Stex.new(__dirname + "/..", function(stex) {

  var router         = stex.router;
  var wallet         = require("./models/wallet");
  var walletV2       = require("./models/wallet_v2");
  var validate       = require("./util/validate");
  var signedJson     = require("./util/signed_json");
  var lockout        = require("./models/lockout");
  var refererTracker = require("./models/referer-tracker");

  router.post('/wallets/show', function(req, res, next) {
    refererTracker.track(req);
    lockout.ensureAllowed(req.ip)
      .then(actuallyLogin)
      .catch(lockout.errors.Disabled, function(err) {
        Promise.delay(lockout.SLEEP_TIME).then(fail);
      });


    function actuallyLogin() {
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
          //TODO: confirm this works well behind cloudflare
          lockout.record(req.ip);
          fail();
        } else {
          res.send({
            "status" : "success",
            "data"   : _.omit(wallet, ['recoveryId', 'recoveryData'])
          });
        }
      });
    }

    function fail() {
      res.status(404).send({ "status": "fail", "code": "not_found" });
    }
  });

  router.post('/wallets/create', function(req, res, next) {
    var walletToSubmit = _.pick(req.body, [
      'id',
      'authToken',
      'mainData',
      'mainDataHash',
      'keychainData',
      'keychainDataHash'
    ]);

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
  });

  router.post('/wallets/update', function(req, res, next) {
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
      .catch(errors.RecordNotFound, function(e) {
        res.status(404).send({
          "status": "fail",
          "code":   "not_found"
        });
      })
      .catch(errors.Forbidden, function(e) {
        res.status(403).send({
          "status": "fail",
          "code":   "forbidden"
        });
      })
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
  });

  router.post('/wallets/replace', function(req, res, next) {
    var replaceArgs = _.at(req.body, 'oldId', 'oldAuthToken', 'newId', 'newAuthToken');

    wallet.replace.apply(null, replaceArgs)
      .then(function () {
        res.send({"status" : "success"}); 
      })
      .catch(errors.Forbidden, function(e) {
        res.status(403).send({
          "status": "fail",
          "code":   "forbidden"
        });
      })
      .catch(errors.RecordNotFound, function(e) {
        res.status(404).send({
          "status": "fail",
          "code":   "not_found"
        });
      })
      .catch(function(e) {
        next(e);
      });
  });

  router.post('/wallets/recover', function(req, res, next) {
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
        res.status(404).send({ "status": "fail", "code": "not_found" });
      } else {
        res.send({
          "status" : "success",
          "data"   : wallet
        });
      }
    });
  });

  router.post('/wallets/create_recovery_data', function(req, res, next) {
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
      .catch(errors.Forbidden, function(e) {
        res.status(403).send({
          "status": "fail",
          "code":   "forbidden"
        });
      })
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
  });

  router.get('/v2/kdf_params', function(req,res,next) {
    res.status(200).send({ 
      algorithm: 'scrypt',
      bits: 256,
      n: Math.pow(2,16),
      r: 8,
      p: 1,
    });
  });

  router.post('/v2/wallets/show_login_params', function(req, res, next) {
    walletV2.getLoginParams(req.body.username)
      .then(function(loginParams) {
        res.send(loginParams);
      })
      .catch(errors.RecordNotFound, function(err) {
        lockout.record(req.ip);
        res.status(404).send({ "status": "fail", "code": "not_found" });
      });
  });

  router.post('/v2/wallets/show', function(req, res, next) {
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
  });

  router.post('/v2/wallets/create', function(req, res, next) {
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
  });

  router.post('/v2/totp/enable', 
    signedJson.middleware,
    function(req, res, next) {
      var body = req.verified.body;

      walletV2.getByWalletId(req.verified.walletId)
        .then(function (wallet) {
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
        .catch(walletV2.errors.InvalidTotpCode, function(err) {
          res.status(400).send({ "status": "fail", "code": "invalid_totp_code" });
        })
        .catch(errors.RecordNotFound, function(err) {
          res.status(400).send({ "status": "fail", "code": "not_found" });
        })
        .catch(next);
    });
});