var StexDev = require("stex/dev");
var Stex    = require("stex");
var Promise = Stex.Promise;
var hash    = require("../lib/util/hash");

var testHelper  = module.exports;
testHelper.Stex = Stex;

var clearDb = function() {
  return Promise.all([
    db.raw("TRUNCATE TABLE wallets"),
    db.raw("TRUNCATE TABLE wallets_v2"),
  ]);
}

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

var makeWalletV2 = function(params) {
  return db("wallets_v2").insert({
    lockVersion:   0,
    createdAt:     new Date(),
    updatedAt:     new Date(),

    updateKey:     "updatekey",
    authToken:     hash.sha2("authtoken"),

    username:      params.username,
    salt:          new Buffer("somesaltgoeshere"),
    kdfParams:     JSON.stringify({
      algorithm: "scrypt",
      n: Math.pow(2,16),
      r: 8,
      p: 1
    }),

    mainData:      params.mainData, 
    keychainData:  params.keychainData
  });
};

var loadFixtures = function() {
  return Promise.all([
    makeWallet({ id:'1', recoveryId:'1', authToken:'1', mainData:'foo', recoveryData:'foo', keychainData:'foo' }),
    makeWallet({ id:'3', recoveryId:'3', authToken:'3', mainData:'foo3', recoveryData:'foo3', keychainData:'foo3' }),
    makeWallet({ id:'4', authToken:'4', mainData:'foo4', keychainData:'foo4' }),

    makeWalletV2({username: "scott", mainData:'foo', keychainData:'foo'}),
    makeWalletV2({username: "david", mainData:'foo', keychainData:'foo'}),
  ]);
};

testHelper.makeString = function(size) {
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
    .init(true)
    .then(function(stex){ 
      stex.activate();
      done(); 
    });
});
