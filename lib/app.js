var Stex    = require('stex');
var errors  = Stex.errors;
var _       = Stex._;
var Promise = Stex.Promise;

module.exports = Stex.new(__dirname + "/..", function(stex) {

  var router     = stex.router;
  var signedJson = require("./util/signed-json");
  var lockout    = require("./models/lockout");
  var c          = stex.controllers;
  
  router.post('/wallets/show',                 c.wallets.show);
  router.post('/wallets/create',               c.wallets.create);
  router.post('/wallets/update',               c.wallets.update);
  router.post('/wallets/replace',              c.wallets.replace);
  router.post('/wallets/recover',              c.wallets.recover);
  router.post('/wallets/create_recovery_data', c.wallets.createRecoveryData);


  if(conf.get("allowV2") === true) {
    router.post('/wallets/mark_migrated', c.wallets.markMigrated);

    router.get('/v2/kdf_params', c.v2.kdfParams.show);

    router.post('/v2/wallets/show_login_params', c.v2.wallets.showLoginParams);
    router.post('/v2/wallets/get_lock_version',  c.v2.wallets.getLockVersion);
    router.post('/v2/wallets/show',              c.v2.wallets.show);
    router.post('/v2/wallets/create',            c.v2.wallets.create);
    router.post('/v2/wallets/update',            c.v2.wallets.update);
    router.post('/v2/wallets/delete',            c.v2.wallets.delete);
    router.post('/v2/wallets/recovery/enable',   c.v2.wallets.enableRecovery);
    router.post('/v2/wallets/recovery/show',     c.v2.wallets.showRecovery);

    router.post('/v2/totp/enable',               c.v2.totp.enable);
    router.post('/v2/totp/disable',              c.v2.totp.disable);
    router.post('/v2/totp/disable_lost_device',  c.v2.totp.lostDevice);
  }

});
