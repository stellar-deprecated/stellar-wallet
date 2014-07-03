var app            = require("../lib/app")
var hash           = require("../lib/util/hash")
var stellarExpress = require("stellar-express");
var Promise        = stellarExpress.Promise;
require('should');

var helpers = module.exports;

var clearDb = function() {
  return db.raw("TRUNCATE TABLE wallets");
}

var makeWallet = function(params) {
  return Promise
    .props({ 
      id:            hash.locator(params.id), 
      recoveryId:    params.recoveryId ? hash.locator(params.recoveryId) : null,
      authTokenHash: hash.sha2(params.authToken), 
      mainData:      params.mainData, 
      recoveryData:  params.recoveryData, 
      keychainData:  params.keychainData
    })
    .then(function(params) {
      return db("wallets").insert(params);
    });
}

var loadFixtures = function() {
  return Promise.all([
    makeWallet({ id:'1', recoveryId:'1', authToken:'1', mainData:'foo', recoveryData:'foo', keychainData:'foo' }),
    makeWallet({ id:'3', recoveryId:'3', authToken:'3', mainData:'foo3', recoveryData:'foo3', keychainData:'foo3' }),
    makeWallet({ id:'4', authToken:'4', mainData:'foo4', keychainData:'foo4' })
  ]);
}

beforeEach(function(done) {
  clearDb()
    .then(loadFixtures)
    .then(function() { done(); });
});



helpers.sha1 = function(data) {
  var crypto = require("crypto");
  var sha1   = crypto.createHash('sha1');

  return sha1.update(data).digest("hex");
};