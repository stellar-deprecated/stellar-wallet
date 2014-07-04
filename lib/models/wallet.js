var Stex    = require("stex");
var errors  = Stex.errors;
var Promise = Stex.Promise;
var _       = Stex._;

var wallet  = module.exports;
var hash    = require("../util/hash");

wallet.errors             = {};
wallet.errors.Invalid     = Error.subclass("wallet.Invalid");
wallet.errors.InvalidHash = wallet.errors.Invalid.subclass("wallet.InvalidHash");

/**
 * Retrieves the wallet at id `id` from `db`
 */
wallet.get = function(id) {
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
    .then(validatePresent("id"))
    .then(validatePresent("authToken"))
    .then(validatePresent("mainData"))
    .then(validatePresent("keychainData"))
    .then(validateHash("mainData"))
    .then(validateHash("keychainData"))
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
        e = e.clientError.cause; // unwrap the original exception
          
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

    // if we don't have access to the wallet, fail
    if(w.authTokenHash !== hash.sha2(authToken)) {
      return Promise.reject(new errors.Forbidden());
    }

    return Promise.resolve(changes)
      .then(validateHash('mainData',     {allowBlank: true}))
      .then(validateHash('keychainData', {allowBlank: true}))
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
      .then(validatePresent('recoveryId'))
      .then(validatePresent('recoveryData'))
      .then(validateHash('recoveryData'))
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


function validateHash(prop, options) {
  if(!options) {
    options = {};
  }

  return function(data) {
    var value     = data[prop];
    var valueHash = data[prop + "Hash"];
    var e;

    if(_.isEmpty(value)) {
      if(options.allowBlank) {
        return Promise.resolve(data);
      } else {
        e = new wallet.errors.InvalidHash(prop + " is corrupt");
        e.field = prop;
        return Promise.reject(e);
      }
    } 

    var dataHash = hash.sha1(value);

    if(dataHash !== valueHash) {
      e = new wallet.errors.InvalidHash(prop + " is corrupt");
      e.field = prop;
      return Promise.reject(e);
    } else {
      return Promise.resolve(data);
    }
  };
}

function validatePresent(prop) {
  return function(data) {
    if(_.isEmpty(data[prop])) {
      var e = new errors.MissingField(prop + " is blank");
      e.field = prop;
      return Promise.reject(e);
    } else {
      return Promise.resolve(data);
    }
  };
}

