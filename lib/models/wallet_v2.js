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
        .extend({totpRequired: !_.isEmpty(wallet.totpKey)})
        .value();
    });
};

/**
 * Retrieves a wallet and checks authorization to view the wallet using
 * walletId and totpCode.
 * 
 * @param  {string} username
 * @param  {string} walletId base64-encoded key used to authorize access.
 * @param  {string} [totpCode] optional totp-code
 * @return {Promise.<object>} A promise that resolved to the found and authorized wallet object
 */
walletV2.getWithAuthorization = function(username, walletId, totpCode) {

  return walletV2.get(username)
    .then(function(wallet) {
      return wallet ? wallet : Promise.reject(new errors.RecordNotFound());
    })
    .then(function(wallet) {
      if(_.isEmpty(wallet.totpKey)) {
        return wallet;
      }
      var isValid = notp.totp.verify(totpCode, wallet.totpKey, {});
      
      return isValid ? wallet : Promise.reject(new errors.Forbidden());
    })
    .then(function(wallet) {
      var walletIdBuffer = new Buffer(walletId || "", "base64");
      var hashed  = hash.sha2(walletIdBuffer);
      var isValid = scmp(hashed, wallet.walletId);
      
      return isValid ? wallet : Promise.reject(new errors.Forbidden());
    });
};

walletV2.create = function(params) {
  var attrs = _.pick(params, [
    "username", 
    "salt", 
    "kdfParams", 
    "updateKey",
    "mainData",
    "keychainData",
    "totpCode",
  ]);
  
  //TODO:  don't just SHA2 the base64 encoded walletID, decode it to a buffer, then sha2 that
  
  attrs.authToken   = hash.sha2(params.authToken);
  attrs.createdAt   = new Date();
  attrs.updatedAt   = attrs.createdAt;
  attrs.lockVersion = 0;

  return db("wallets_v2").insert(attrs).catch(function(e) {
    if(e.errno === 1062) {
      e = new errors.DuplicateRecord(e.message);
    }

    return Promise.reject(e);
  });
};

walletV2.update = function() {};