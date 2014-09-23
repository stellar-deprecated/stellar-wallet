/** @namespace  */
var signedJson = module.exports;

var Promise = require("stex").Promise;
var errors  = require("stex").errors;
var nacl    = require("tweetnacl");

signedJson.errors = {};
signedJson.errors.BadSignature = Error.subclass("signedJson.BadSignature");
signedJson.errors.UnparseableBody = Error.subclass("signedJson.UnparseableBody");

signedJson.middleware = function(req, res, next) {
  //TODO: pull wallet-id from authorization header
  //TODO: pull signature from authorization header
  //TODO: lookup pk based on wallet-id
  //TODO: verify body with signature and pk
  //TODO: populate req.verified object
  next();
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


  // convert the base64 encoded signature and publicKey to UInt8Arrays
  var signature    = nacl.util.decodeBase64(signatureString);
  var publicKey    = nacl.util.decodeBase64(publicKeyString);
  var messageBytes = nacl.util.decodeUTF8(unparsedJson);
  var isValid      = true;

  try {
    isValid = nacl.sign.detached.verify(messageBytes, signature, publicKey);  
  } catch(e) {
    isValid = false;
  }

  if(!isValid) {
    throw new signedJson.errors.BadSignature("Bad signature");
  }

  try {
    return JSON.parse(unparsedJson);
  } catch(e) {
    throw new signedJson.errors.UnparseableBody("Cannot parse body:" + e.message);
  }
};