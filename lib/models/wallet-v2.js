var Stex    = require("stex");
var errors  = Stex.errors;
var Promise = Stex.Promise;
var _       = Stex._;

var walletV2 = module.exports;

var email          = require("../util/email");
var hash           = require("../util/hash");
var validate       = require("../util/validate");
var usernameProofs = require("../util/username-proofs");
var totp           = require("../util/totp");
var scmp           = require('scmp');
var Duration       = require("duration-js");

walletV2.errors                 = {};
walletV2.errors.Base            = Error.subclass("walletV2.Base");
walletV2.errors.InvalidTotpKey  = walletV2.errors.Base.subclass("walletV2.InvalidTotpKey");
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
    .whereNull("deletedAt")
    .select()
    .then(function(results) {
      var result = _.first(results);
      if (!result) {
        throw new errors.RecordNotFound();
      }
      return result;
    });
};

walletV2.getLoginParams = function(username) {
  return walletV2.get(username)
    .then(function (wallet) {
      if(!wallet){ throw new errors.RecordNotFound(); }

      return _(wallet)
        .pick("username", "salt", "kdfParams")
        .extend({totpRequired: walletV2.isTotpEnabled(wallet)})
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
      if(!walletV2.isTotpEnabled(wallet)) {
        return wallet;
      }
      var isValid = totp.verify(totpCode, wallet.totpKey);
      
      return isValid ? wallet : Promise.reject(new errors.Forbidden());
    })
    .then(function(wallet) {
      var hashed  = walletV2.hashWalletId(walletId);
      var isValid = scmp(hashed, wallet.walletId);
      
      return isValid ? wallet : Promise.reject(new errors.Forbidden());
    })
    .tap(function(wallet) {
      return walletV2.clearTotpRemovalRequestIfPossible(wallet);
    });
};

walletV2.getByWalletId = function(username, walletId) {

  return db("wallets_v2")
    .where("username", username)
    .where("walletId", walletV2.hashWalletId(walletId))
    .whereNull("deletedAt")
    .select()
    .then(function(results) {
      var result = _.first(results);
      if (!result) {
        throw new errors.RecordNotFound();
      }
      return result;
    });
};


walletV2.getPublicKey = function(username, walletId) {
  return walletV2.getByWalletId(username, walletId).get('publicKey');
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
    .then(validate.byteLength("salt", 16))
    .then(validate.byteLength("walletId", 32))
    .then(validate.byteLength("publicKey", 32))
    .tap(function(attrs) {
      if(conf.get("requireUsernameProofs") === true) {
        return usernameProofs.validate(attrs.publicKey, attrs.usernameProof);
      }
      return true;
    })
    .then(function(attrs) {
      var insertAttrs         = _.omit(attrs, ['mainDataHash', 'keychainDataHash', 'usernameProof']);
      insertAttrs.walletId    = hash.sha2(insertAttrs.walletId);
      insertAttrs.createdAt   = new Date();
      insertAttrs.updatedAt   = insertAttrs.createdAt;
      insertAttrs.lockVersion = 0;

      return db("wallets_v2").insert(insertAttrs)
        .then(function(wallet) {
          attrs.wallet = wallet;
          return Promise.resolve(attrs);
        })
        .catch(function(e) {
          if(e.errno === 1062) {
            e = new errors.DuplicateRecord(e.message);
          }

          return Promise.reject(e);
        });
    }).tap(function(attrs) {
      if (!(attrs.usernameProof && attrs.usernameProof.migrated)) {
        return;
      }

      var usernameWithoutDomain = stex.fbgive.usernameWithoutDomain(attrs.username);
      email.sendEmail(usernameWithoutDomain, 'wallet_upgrade');
    });
};

walletV2.update = function(id, lockVersion, attrs) {
  //TODO: we should validate the updates, including checking hashes etc.

  return Promise.resolve(attrs)
    .then(validate.hash('mainData',     {allowBlank: true}))
    .then(validate.hash('keychainData', {allowBlank: true}))
    .then(function(attrs) {
      var updateAttrs         =  _.omit(attrs, ['mainDataHash', 'keychainDataHash']);
      updateAttrs.updatedAt   = new Date();
      updateAttrs.lockVersion = lockVersion + 1;

      return db("wallets_v2")
        .where({id:id, lockVersion:lockVersion})
        .whereNull("deletedAt")
        .update(updateAttrs)
        .then(function (changedRows) {
          if (changedRows === 0) {
            return Promise.reject(new errors.RecordNotFound());
          } else {
            return {newLockVersion: updateAttrs.lockVersion};
          }
        });
    });
};

walletV2.delete = function(id, lockVersion) {
  return db("wallets_v2")
    .where({id:id, lockVersion:lockVersion})
    .update('deletedAt', new Date())
    .then(function (changedRows) {
      if (changedRows === 0) {
        return Promise.reject(new errors.RecordNotFound());
      }
    });
};

walletV2.enableRecovery = function(id, lockVersion, attrs) {
  return Promise.resolve(attrs)
    .then(validate.present('recoveryId'))
    .then(validate.present('recoveryData'))
    .then(function(attrs) {
      attrs.lockVersion = lockVersion + 1;

      return db("wallets_v2")
        .where({id:id, lockVersion:lockVersion})
        .whereNull("deletedAt")
        .update(attrs)
        .then(function (changedRows) {
          if (changedRows === 0) {
            return Promise.reject(new errors.RecordNotFound());
          } else {
            return {newLockVersion: attrs.lockVersion};
          }
        });
    });
};

walletV2.enableTotp = function(id, lockVersion, totpKey, totpCode) {
  if(_.isEmpty(totpKey)) {
    return Promise.reject(new walletV2.errors.InvalidTotpKey());
  }


  //Possible TODO: verify the length of the buffer is of a certain size

  var isValidKey = totp.verify(totpCode, totpKey);

  if(!isValidKey) {
    return Promise.reject(new walletV2.errors.InvalidTotpCode());
  }

  return walletV2.update(id, lockVersion, {totpKey:totpKey, totpDisabledAt:null});
};

walletV2.disableTotp = function(id, lockVersion, totpKey, totpCode) {
  if(_.isEmpty(totpCode)) {
    return Promise.reject(new walletV2.errors.InvalidTotpCode());
  }

  var isValidKey = totp.verify(totpCode, totpKey);

  if(!isValidKey) {
    return Promise.reject(new walletV2.errors.InvalidTotpCode());
  }

  return walletV2.update(id, lockVersion, {totpKey: null});
};

walletV2.initiateTotpGracePeriod = function(id) {
  var now         = (new Date()).getTime();
  var gracePeriod = new Duration(conf.get("totpDisableGracePeriod"));
  var disableAt   = new Date(now + gracePeriod);

  return db("wallets_v2")
    .where({id: id})
    .whereNull("deletedAt")
    .update({totpDisabledAt: disableAt})
    .then(function () {
      return Promise.resolve();
    });
};

walletV2.getWithTotpGracePeriodInitiated = function(durationAgo) {
  var now       = (new Date()).getTime();
  var period    = new Duration(durationAgo);
  var disableAt = new Date(now - period);

  return db("wallets_v2")
    .whereRaw("DATE(totpDisabledAt) = DATE(?)", disableAt)
    .select();
};

walletV2.clearTotpRemovalRequestIfPossible = function(wallet) {
  if(!wallet.totpDisabledAt) {
    return Promise.resolve();
  } else {
    // set the totpDisabledAt to null
    return db("wallets_v2")
          .where({id:wallet.id})
          .whereNull("deletedAt")
          .update({totpDisabledAt: null});  
  }
};

walletV2.isTotpEnabled = function(wallet) {
  if (_.isEmpty(wallet.totpKey)){ 
    return false;
  }

  if (wallet.totpDisabledAt instanceof Date) {
    var now        = Math.floor((new Date()).getTime() / 1000);
    var disabledAt = Math.floor(wallet.totpDisabledAt.getTime() / 1000);
    return disabledAt > now;
  } else {
    return true;
  }
};
