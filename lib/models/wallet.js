var Stex    = require("stex");
var errors  = Stex.errors;
var Promise = Stex.Promise;
var _       = Stex._;

var wallet   = module.exports;
var hash     = require("../util/hash");
var validate = require("../util/validate");

wallet.errors             = {};

/**
 * Retrieves the wallet at id `id` from `db`
 */
wallet.get = function(id) {
  if(!id) {
    return Promise.reject(null);
  }

  return hash.locator(id).then(function(hashedId) {
    return db("wallets").where("id", hashedId).select().then(function(results) {
      return results[0];
    });
  });
};

wallet.getByRecoveryId = function(recoveryId) {
  return hash.locator(recoveryId).then(function(hashedId) {
    return db("wallets").where("recoveryId", hashedId).select().then(function(results) {
      return results[0];
    });
  });
};

wallet.create = function(params) {
  return Promise.resolve(params)
    .then(validate.present("id"))
    .then(validate.present("authToken"))
    .then(validate.present("mainData"))
    .then(validate.present("keychainData"))
    .then(validate.hash("mainData"))
    .then(validate.hash("keychainData"))
    .then(function(params) {

      params.id            = hash.locator(params.id);
      params.recoveryId    = params.recoveryId ? hash.locator(params.recoveryId) : null;
      params.authTokenHash = hash.sha2(params.authToken);
      params.createdAt     = new Date();
      params.updatedAt     = params.createdAt;
      params               = _.omit(params, ['mainDataHash', 'keychainDataHash', 'authToken']);

      return Promise.props(params);
    })
    .then(function(params) {
      var e;

      return db("wallets").insert(params).catch(function(e) {
        if(e.errno === 1062) {
          e = new errors.DuplicateRecord(e.message);
        }

        return Promise.reject(e);
      });
    });
};

wallet.update  = function(id, authToken, changes) {

  return wallet.get(id).then(function(w) {

    // if we couldn't find a wallet, fail
    if(typeof w === 'undefined') {
      return Promise.reject(new errors.RecordNotFound());
    }

    if(!authToken) {
      return Promise.reject(new errors.Forbidden());
    }

    // if we don't have access to the wallet, fail
    if(w.authTokenHash !== hash.sha2(authToken)) {
      return Promise.reject(new errors.Forbidden());
    }

    return Promise.resolve(changes)
      .then(validate.hash('mainData',     {allowBlank: true}))
      .then(validate.hash('keychainData', {allowBlank: true}))
      .then(function(changes){
        changes = _.pick(changes, ['mainData', 'keychainData']);

        if(_.isEmpty(changes.mainData)) {
          delete changes.mainData;
        }
        // strip out empty changes
        if(_.isEmpty(changes.keychainData)) {
          delete changes.keychainData;
        }

        return db('wallets')
          .where('id', w.id)
          .update(changes);
      });
  });
};

wallet.replace = function(oldId, oldAuthToken, newId, newAuthToken) {
  return Promise.all([
      wallet.get(oldId),
      wallet.get(newId)
    ])
    .then(function(wallets) {
      if(!_.all(wallets)) {
        return Promise.reject(new errors.RecordNotFound());
      }

      var oldWallet = wallets[0];
      var newWallet = wallets[1];

      if(!oldAuthToken || !newAuthToken) {
        return Promise.reject(new errors.Forbidden());
      }

      if(oldWallet.authTokenHash !== hash.sha2(oldAuthToken)) {
        return Promise.reject(new errors.Forbidden());
      }

      if(newWallet.authTokenHash !== hash.sha2(newAuthToken)) {
        return Promise.reject(new errors.Forbidden());
      }

      return db('wallets')
        .where('id', oldWallet.id)
        .del();
    });
};

wallet.createRecovery = function(id, authToken, changes) {

  return wallet.get(id)
    .then(function(w) {

    // if we couldn't find a wallet, fail
    if(typeof w === 'undefined') {
      return Promise.reject(new errors.RecordNotFound());
    }

    // if we don't have access to the wallet, fail
    if(w.authTokenHash !== hash.sha2(authToken)) {
      return Promise.reject(new errors.Forbidden());
    }

    return Promise.resolve(changes)
      .then(validate.present('recoveryId'))
      .then(validate.present('recoveryData'))
      .then(validate.hash('recoveryData'))
      .then(function(changes){
        changes = _.pick(changes, ['recoveryId', 'recoveryData']);

        return hash.locator(changes.recoveryId)
          .then(function(recoveryId){
            changes.recoveryId = recoveryId;
          })
          .then(function(){
            return db('wallets')
              .where('id', w.id)
              .update(changes);
          });
      });
  });
};
