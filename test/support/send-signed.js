var nacl = require("tweetnacl");

stex.test.supertest.Test.prototype.sendSigned = function(body, walletId, keyPair) {
  var rawBody       = JSON.stringify(body);
  var signature     = sign(rawBody, keyPair);
  var authorization = authHeader(walletId, signature);

  this.type("json");
  this.set("Authorization", authorization);
  this.send(rawBody);
  
  return this;
};


function authHeader(walletId, signature) {
  return 'STELLAR-WALLET-V2 wallet-id=' + walletId + ' signature=' + signature;
}

function sign(message, keyPair) {
  var rawMessage   = nacl.util.decodeUTF8(message);
  var rawSecret    = nacl.util.decodeBase64(keyPair.secretKey);
  var rawSignature = nacl.sign.detached(rawMessage, rawSecret);
  return nacl.util.encodeBase64(rawSignature);
}
