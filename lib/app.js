var Stex    = require('stex');
var errors  = Stex.errors;
var _       = Stex._;
var Promise = Stex.Promise;

module.exports = Stex.new(__dirname + "/..", function(stex) {

  var router     = stex.router;
  var signedJson = require("./util/signed-json");
  var lockout    = require("./models/lockout");
  var c          = stex.controllers;
  
  router.post('/wallets/show',                 rejectLockedOutIps,   c.wallets.show);
  router.post('/wallets/create',               rejectSpammedCreates, c.wallets.create);
  router.post('/wallets/update',               rejectLockedOutIps,   c.wallets.update);
  router.post('/wallets/replace',              rejectLockedOutIps,   c.wallets.replace);
  router.post('/wallets/recover',              rejectLockedOutIps,   c.wallets.recover);
  router.post('/wallets/create_recovery_data', rejectLockedOutIps,   c.wallets.createRecoveryData);
  router.post('/wallets/mark_migrated',        rejectLockedOutIps,   c.wallets.markMigrated);

  router.get('/v2/kdf_params', c.v2.kdfParams.show);

  router.post('/v2/wallets/show_login_params', c.v2.wallets.showLoginParams);
  router.post('/v2/wallets/show',              c.v2.wallets.show);
  router.post('/v2/wallets/create',            c.v2.wallets.create);
  router.post('/v2/wallets/update',            signedJson.middleware, c.v2.wallets.update);
  router.post('/v2/wallets/recovery/enable',   signedJson.middleware, c.v2.wallets.enableRecovery);
  router.post('/v2/wallets/recovery/show',     c.v2.wallets.showRecovery);

  router.post('/v2/totp/enable',  signedJson.middleware, c.v2.totp.enable);
  router.post('/v2/totp/disable', signedJson.middleware, c.v2.totp.disable);
  router.post('/v2/totp/disable_lost_device',            c.v2.totp.lostDevice);

  function rejectLockedOutIps(req,res,next) {
    lockout.isLoginAllowed(req.ip).then(function(isAllowed) {
      if(isAllowed) {
        next();
      } else {
        failSlow();
      }
    });

    function failSlow() {
      Promise.delay(lockout.SLEEP_TIME)
        .then(function() {
          res.status(404).send({ "status": "fail", "code": "not_found" });
        });
    }
  }

  function rejectSpammedCreates(req,res,next) {
    lockout.isLoginAllowed("create:" + req.ip).then(function(isAllowed) {
      if(isAllowed) {
        next();
      } else {
        failSlow();
      }
    });

    function failSlow() {
      Promise.delay(lockout.SLEEP_TIME)
        .then(function() {
          res.status(404).send({ "status": "fail", "code": "not_found" });
        });
    }
  }
});
