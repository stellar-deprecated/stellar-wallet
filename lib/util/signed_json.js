/** @namespace  */
var signedJson = module.exports;

var Promise = require("stex").Promise;
var errors  = require("stex").errors;
var nacl    = require("tweetnacl");

signedJson.errors = {};
signedJson.errors.BadSignature = Error.subclass("signedJson.BadSignature");

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
  var isValid      = nacl.sign.detached.verify(messageBytes, signature, publicKey);  

  if(isValid) {
    return JSON.parse(unparsedJson);
  } else {
    throw new signedJson.errors.BadSignature("Bad signature");
  }
};



signedJson.write = function(data, seedString) {
  //TODO: 
  var seed            = nacl.util.decodeBase64(seedString);
  var keypair         = nacl.sign.keyPair.fromSeed(seedString);
  var json            = JSON.stringify(data);
  var signature       = nacl.sign.detached(json, keypair.secretKey);
  var signatureString = nacl.util.encodeBase64(signature);
  var publicKeyString = nacl.util.encodeBase64(keypair.publicKey);

  return {
    data:      json,
    signature: signatureString,
    publicKey: publicKeyString,
  };
};