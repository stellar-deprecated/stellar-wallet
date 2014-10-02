var Stex    = require("stex");
var errors  = Stex.errors;
var Promise = Stex.Promise;
var _       = Stex._;

var walletV2 = module.exports;

var hash     = require("../util/hash");
var validate = require("../util/validate");
var notp     = require("notp");
var scmp     = require('scmp');

walletV2.errors                 = {};
walletV2.errors.Base            = Error.subclass("walletV2.Base");
walletV2.errors.InvalidTotpKey = walletV2.errors.Base.subclass("walletV2.InvalidTotpKey");
walletV2.errors.InvalidTotpCode = walletV2.errors.Base.subclass("walletV2.InvalidTotpCode");

walletV2.hashWalletId = function(base64EncodedWalletId) {
  if(typeof base64EncodedWalletId !== 'string') {
    return null;
  }

  var rawWalletId = new Buffer(base64EncodedWalletId, "base64");
  return hash.sha2(rawWalletId);
};

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
      var isValid = notp.totp.verify(totpCode, new Buffer(wallet.totpKey, 'base64'), {});
      
      return isValid ? wallet : Promise.reject(new errors.Forbidden());
    })
    .then(function(wallet) {
      var hashed  = walletV2.hashWalletId(walletId);
      var isValid = scmp(hashed, wallet.walletId);
      
      return isValid ? wallet : Promise.reject(new errors.Forbidden());
    });
};

walletV2.getByWalletId = function(walletId) {

  return db("wallets_v2")
    .where("walletId", walletV2.hashWalletId(walletId))
    .select()
    .then(_.first);
};


walletV2.getPublicKey = function(walletId) {
  return walletV2.getByWalletId(walletId)
    .then(function (found) {
      if(!found) { return null; }

      return found.publicKey;
    });
};

walletV2.create = function(attrs) {

  return Promise.resolve(attrs)
    .then(validate.present("username"))
    .then(validate.present("walletId"))
    .then(validate.present("salt"))
    .then(validate.present("kdfParams"))
    .then(validate.present("publicKey"))
    .then(validate.present("mainData"))
    .then(validate.present("keychainData"))
    .then(validate.hash("mainData"))
    .then(validate.hash("keychainData"))
    .then(validate.json("kdfParams"))
    .then(validate.username("username"))
    .then(function(attrs) {
      attrs          = _.omit(attrs, ['mainDataHash', 'keychainDataHash']);
      attrs.walletId = hash.sha2(attrs.walletId);
      attrs.createdAt   = new Date();
      attrs.updatedAt   = attrs.createdAt;
      attrs.lockVersion = 0;

      return db("wallets_v2").insert(attrs).catch(function(e) {
        if(e.errno === 1062) {
          e = new errors.DuplicateRecord(e.message);
        }

        return Promise.reject(e);
      });
    });
};

walletV2.update = function(id, lockVersion, attrs) {
  var updateAttrs         = _.cloneDeep(attrs);
  updateAttrs.lockVersion = lockVersion + 1;

  //TODO: we should validate the updates, including checking hashes etc.
  return db("wallets_v2")
    .where({id:id, lockVersion:lockVersion})
    .update(updateAttrs)
    .then(function (changedRows) {
      if (changedRows === 0) {
        return Promise.reject(new errors.RecordNotFound());
      } else {
        return {newLockVersion: updateAttrs.lockVersion};
      }
    });
};

walletV2.enableTotp = function(id, lockVersion, totpKey, totpCode) {
  if(_.isEmpty(totpKey)) {
    return Promise.reject(new walletV2.errors.InvalidTotpKey());
  }

  var totpKeyBuffer = new Buffer(totpKey, 'base64');

  //Possible TODO: verify the length of the buffer is of a certain size

  var isValidKey = notp.totp.verify(totpCode, totpKeyBuffer, {});

  if(!isValidKey) {
    return Promise.reject(new walletV2.errors.InvalidTotpCode());
  }

  return walletV2.update(id, lockVersion, {totpKey:totpKey});
};
