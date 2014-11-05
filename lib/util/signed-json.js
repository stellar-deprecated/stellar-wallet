/** @namespace  */
var signedJson = module.exports;
var Stex       = require("stex");
var Promise    = Stex.Promise;
var errors     = Stex.errors;
var _          = Stex._;
var sign       = require("./sign");
var walletV2   = require("../models/wallet-v2");

signedJson.errors                        = {};
signedJson.errors.BadSignature           = Error.subclass("signedJson.BadSignature");
signedJson.errors.UnparseableBody        = Error.subclass("signedJson.UnparseableBody");
signedJson.errors.MalformedAuthorization = Error.subclass("signedJson.MalformedAuthorization");

var AUTH_REGEX = /^STELLAR-WALLET-V2\s+(.+)$/;

signedJson.middleware = function(req, res, next) {
  var authHeader = req.headers.authorization;

  signedJson.parseAuthorizationHeader(authHeader)
    .bind({})
    .then(function(params) {
      this.params = params;
    })
    .then(function() {
      return walletV2.getPublicKey(this.params["username"], this.params["wallet-id"]);
    })
    .then(function (pk) {
      return signedJson.read(req.rawBody, this.params["signature"], pk);
    })
    .then(function(verifiedBody) {
      req.verified          = {};
      req.verified.body     = verifiedBody;
      req.verified.username = this.params["username"];
      req.verified.walletId = this.params["wallet-id"];
      next();
    })
    .catch(errors.ArgumentError,                     function() { fail("invalid_signature");       })
    .catch(errors.RecordNotFound,                    function() { fail("invalid_signature");       })
    .catch(signedJson.errors.BadSignature,           function() { fail("invalid_signature");       })
    .catch(signedJson.errors.UnparseableBody,        function() { fail("malformed_body");          })
    .catch(signedJson.errors.UnparseableBody,        function() { fail("malformed_body");          })
    .catch(signedJson.errors.MalformedAuthorization, function() { fail("malformed_authorization"); })
    .catch(next);

    function fail(code) {
      res.status(401).send({"status":"fail", "code":code});
    }
};

signedJson.parseAuthorizationHeader = function(header) {
  return Promise.try(function() {
    var match = AUTH_REGEX.exec(header);

    if(!match) { 
      throw new signedJson.errors.MalformedAuthorization();
    }

    return _(match[1].split(/,\s*/))
      .map(function(part) {
        //split only on the first =
        var i      = part.indexOf('=');
        var key    = part.slice(0,i);
        var quoted = part.slice(i+1);

        if(quoted[0] !== '"') {
          throw new signedJson.errors.MalformedAuthorization();
        }  

        if(quoted[quoted.length - 1] !== '"') {
          throw new signedJson.errors.MalformedAuthorization();
        }

        // strip off double quotes
        var value = quoted.slice(1, quoted.length - 1);
        var result = {};
        result[key] = value;
        return result;
      })
      .reduce(_.extend);
  });
};


signedJson.action = function(body) {
  return [
    signedJson.middleware,
    body
  ];
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
