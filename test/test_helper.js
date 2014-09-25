var Stex    = require("stex");
var hash    = require("../lib/util/hash")
var Promise = Stex.Promise;

var helpers = module.exports;
helpers.Stex    = Stex;
helpers.stexDev = require("stex-dev");
helpers.expect  = helpers.stexDev.chai.expect;

helpers.stexDev.sinon.init();

var clearDb = function() {
  return db.raw("TRUNCATE TABLE wallets");
};

var clearRedis = function() {
  return stex.redis.flushdbAsync();
};

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
};

var loadFixtures = function() {
  return Promise.all([
    makeWallet({ id:'1', recoveryId:'1', authToken:'1', mainData:'foo', recoveryData:'foo', keychainData:'foo' }),
    makeWallet({ id:'3', recoveryId:'3', authToken:'3', mainData:'foo3', recoveryData:'foo3', keychainData:'foo3' }),
    makeWallet({ id:'4', authToken:'4', mainData:'foo4', keychainData:'foo4' })
  ]);
}

helpers.makeString = function(size) {
  var x = "";
  for(var i = 0; i < size; i++) {
    x += "a";
  }
  return x;
};

beforeEach(function(done) {
  clearDb()
    .then(clearRedis)
    .then(loadFixtures)
    .then(function() { done(); });
});

before(function(done) {
  require("../lib/app")
    .init()
    .then(function(stex){ 
      stex.activate();
      done(); 
    });
});
