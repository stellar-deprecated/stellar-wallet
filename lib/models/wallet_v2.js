var Stex    = require("stex");
var errors  = Stex.errors;
var Promise = Stex.Promise;
var _       = Stex._;

var walletV2 = module.exports;

var hash     = require("../util/hash");
var validate = require("../util/validate");
var notp     = require("notp");
var scmp     = require('scmp');

walletV2.errors = {};
walletV2.errors.Base = Error.subclass("walletV2.Base");

walletV2.get = function(username) {
  return db("wallets_v2")
    .where("username", username)
    .select()
    .then(_.first);
};

walletV2.getLoginParams = function(username) {
  return walletV2.get(username)
    .then(function (wallet) {
      if(!wallet){ throw new errors.RecordNotFound(); }

      return _(wallet)
        .pick("username", "salt", "kdfParams")
        .extend({totpRequired: !_.isEmpty(wallet.totpCode)})
        .value();
    });
};

walletV2.getWithAuthorization = function(username, authToken, totpToken) {
  return walletV2.get(username)
    .then(function(wallet) {
      return wallet ? wallet : Promise.reject(new errors.RecordNotFound());
    })
    .then(function(wallet) {
      if(_.isEmpty(wallet.totpCode)) {
        return wallet;
      }
      var isValid = notp.totp.verify(totpToken, wallet.totpCode, {});
      
      return isValid ? wallet : Promise.reject(new errors.Forbidden());
    })
    .then(function(wallet) {
      var hashed  = hash.sha2(authToken);
      var isValid = scmp(hashed, wallet.authToken);
      
      return isValid ? wallet : Promise.reject(new errors.Forbidden());
    });
};

walletV2.create = function() {};
walletV2.update = function() {};