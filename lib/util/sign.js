var ed25519 = require("ed25519");

module.exports.gen = function(message, secretKey) {
  secretKey = new Buffer(secretKey, 'base64');
  message   = new Buffer(message, 'utf-8');

  var signature = ed25519.Sign(message, secretKey);
  return signature.toString('base64');
};

module.exports.verify = function(message, signature, publicKey) {
  signature = new Buffer(signature, 'base64');
  publicKey = new Buffer(publicKey, 'base64');
  message   = new Buffer(message, 'utf-8');

  try {
    return ed25519.Verify(message, signature, publicKey);  
  } catch(e) {
    return false;
  }
};

module.exports.keyPair = function(seed) {
  seed = new Buffer(seed, 'base64');
  var keyPair = ed25519.MakeKeypair(seed);

  return {
    publicKey: keyPair.publicKey.toString('base64'),
    secretKey: keyPair.privateKey.toString('base64'),
  };
};