var Stex       = require("stex");
var errors     = Stex.errors;
var Promise    = Stex.Promise;
var _          = Stex._;
var signedJson = require("./signed-json");

var usernameProofs = module.exports;

usernameProofs.errors = {};
usernameProofs.errors.Base = Error.subclass("usernameProofs.Base");

usernameProofs.validate = function(proofString, signatureString, publicKeyString) {
  return Promise.resolve();

  return Promise.try(function() {
      return signedJson.read(proofString, signatureString, publicKeyString);
    })
    .then(function(proof) {
      // confirm the signed pk is the same as the provided pk
      // confirm the address derives from the provided pk
      // load the address for the provided username
      // confirm the address from fbgive matches the provided address
    });

};
