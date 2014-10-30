var signedJson = require("../../lib/util/signed-json");
var sign       = require("../../lib/util/sign");

stex.test.supertest.Test.prototype.sendSigned = function(body, username, walletId, keyPair) {
  var rawBody       = JSON.stringify(body);
  var signature     = sign.gen(rawBody, keyPair.secretKey);
  var authorization = authHeader(username, walletId, signature);

  this.type("json");
  this.set("Authorization", authorization);
  this.send(rawBody);
  
  return this;
};

stex.test.supertest.Test.prototype.setAuthHeader = function(username, walletId, signature) {
  this.set("Authorization", authHeader(username, walletId, signature));
  return this;
};

// install test route for signed json

stex.router.post("/v2/signed_json_test", signedJson.middleware, function(req, res, next) {
  res.status(200).send(req.verified);
});


function authHeader(username, walletId, signature) {
  var wallerId = new Buffer(walletId).toString('base64');
  return 'STELLAR-WALLET-V2 username=' + username + ' wallet-id=' + wallerId + ' signature=' + signature;
}
