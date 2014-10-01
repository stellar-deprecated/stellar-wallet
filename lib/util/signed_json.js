/** @namespace  */
var signedJson = module.exports;
var Stex       = require("stex");
var Promise    = Stex.Promise;
var errors     = Stex.errors;
var _          = Stex._;
var sign       = require("./sign");
var walletV2   = require("../models/wallet_v2");

signedJson.errors = {};
signedJson.errors.BadSignature = Error.subclass("signedJson.BadSignature");
signedJson.errors.UnparseableBody = Error.subclass("signedJson.UnparseableBody");

var AUTH_REGEX = /^STELLAR-WALLET-V2\s+(.+)$/;

signedJson.middleware = function(req, res, next) {
  var authHeader = req.headers.authorization;
  var match = AUTH_REGEX.exec(authHeader);

  if(!match){ return next(); }

  var params = _(match[1].split(/\s+/))
    .map(function(part) {
      //split only on the first =
      var i     = part.indexOf('=');
      var key   = part.slice(0,i);
      var value = part.slice(i+1);
      var result = {};
      result[key] = value;
      return result;
    })
    .reduce(_.extend);


  walletV2.getPublicKey(params["wallet-id"])
    .then(function (pk) {
      return signedJson.read(req.rawBody, params["signature"], pk);
    })
    .then(function(verifiedBody) {
      req.verified          = {};
      req.verified.body     = verifiedBody;
      req.verified.walletId = params["wallet-id"];
      next();
    })
    //TODO: add error handling that transforms the error into 400-class responses
    .catch(next);
};

/**
 * Verifies and parsed the provided json text and signature against the provided
 * public key.
 * 
 * @param  {string} unparsedJson    - The json text that was signed by the client
 * @param  {string} signatureString - The signature, encoded as a base64 string
 * @param  {string} publicKeyString - The public key, encoded as a base64 string
 * @return {object}                 - The decoded json object, provided the signature is valid
 */
signedJson.read = function(unparsedJson, signatureString,  publicKeyString) {
  if (typeof unparsedJson !== 'string') {
    throw new errors.ArgumentError("unparsedJson is not a string");
  }  

  if (typeof signatureString !== 'string') {
    throw new errors.ArgumentError("signatureString is not a string");
  }

  if (typeof publicKeyString !== 'string') {
    throw new errors.ArgumentError("publicKeyString is not a string");
  }

  var isValid = sign.verify(unparsedJson, signatureString, publicKeyString);

  if(!isValid) {
    throw new signedJson.errors.BadSignature("Bad signature");
  }

  try {
    return JSON.parse(unparsedJson);
  } catch(e) {
    throw new signedJson.errors.UnparseableBody("Cannot parse body:" + e.message);
  }
};