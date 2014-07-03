var hash           = module.exports;
var stellarExpress = require("stellar-express");
var Promise        = stellarExpress.Promise;
var crypto         = require("crypto");
var scrypt         = require('scrypt-hash');

function makeHasher(algo) {
  return function(value) {
    var hasher = crypto.createHash(algo);
    return hasher.update(value).digest("hex");
  };
}

hash.sha1 = makeHasher('sha1');
hash.sha2 = makeHasher('sha256');


var LOCATOR_HASH_N   = Math.pow(2,16);
var LOCATOR_HASH_R   = 8;
var LOCATOR_HASH_P   = 1;
var LOCATOR_HASH_LEN = 64;

hash.locator = Promise.promisify(function(id, cb) {
  var password = new Buffer(id);
  var salt     = new Buffer(conf.get("locatorSalt"));

  scrypt(password, salt, LOCATOR_HASH_N, LOCATOR_HASH_R, LOCATOR_HASH_P, LOCATOR_HASH_LEN, function (err, hash) {
    if (err) {
      return cb(err);
    }

    var result = hash.toString('base64');
    cb(null, result);
  });
});