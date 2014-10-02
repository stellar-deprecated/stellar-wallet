var Stex    = require('stex');
var errors  = Stex.errors;
var _       = Stex._;
var Promise = Stex.Promise;

module.exports = Stex.new(__dirname + "/..", function(stex) {

  var router         = stex.router;
  var signedJson     = require("./util/signed-json");
  
  var wallets = require("./controllers/wallets");
  router.post('/wallets/show',                 wallets.show);
  router.post('/wallets/create',               wallets.create);
  router.post('/wallets/update',               wallets.update);
  router.post('/wallets/replace',              wallets.replace);
  router.post('/wallets/recover',              wallets.recover);
  router.post('/wallets/create_recovery_data', wallets.createRecoveryData);

  var kdfParams = require("./controllers/v2/kdf-params");
  router.get('/v2/kdf_params', kdfParams.show);

  var walletsV2 = require("./controllers/v2/wallets");
  router.post('/v2/wallets/show_login_params', walletsV2.showLoginParams);
  router.post('/v2/wallets/show',              walletsV2.show);
  router.post('/v2/wallets/create',            walletsV2.create);

  var totp = require("./controllers/v2/totp");
  router.post('/v2/totp/enable', signedJson.middleware, totp.enable);
});
