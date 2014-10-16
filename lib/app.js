var Stex    = require('stex');
var errors  = Stex.errors;
var _       = Stex._;
var Promise = Stex.Promise;

module.exports = Stex.new(__dirname + "/..", function(stex) {

  var router     = stex.router;
  var signedJson = require("./util/signed-json");
  var c          = stex.controllers;
  
  router.post('/wallets/show',                 c.wallets.show);
  router.post('/wallets/create',               c.wallets.create);
  router.post('/wallets/update',               c.wallets.update);
  router.post('/wallets/replace',              c.wallets.replace);
  router.post('/wallets/recover',              c.wallets.recover);
  router.post('/wallets/create_recovery_data', c.wallets.createRecoveryData);
  router.post('/wallets/mark_migrated',        c.wallets.markMigrated);

  router.get('/v2/kdf_params', c.v2.kdfParams.show);

  router.post('/v2/wallets/show_login_params', c.v2.wallets.showLoginParams);
  router.post('/v2/wallets/show',              c.v2.wallets.show);
  router.post('/v2/wallets/create',            c.v2.wallets.create);
  router.post('/v2/wallets/update',            signedJson.middleware, c.v2.wallets.update);

  router.post('/v2/totp/enable', signedJson.middleware, c.v2.totp.enable);
  router.post('/v2/totp/disable', signedJson.middleware, c.v2.totp.disable);
});
