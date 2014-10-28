var Initializer = require("stex/lib/initializer");
var unirest     = require("unirest");
var Promise     = require("stex").Promise;

Initializer.add('startup', 'stellar-wallet.fbgive', ['stex.config'], function(stex) {
  var fbgiveEndpoint = stex.conf.get("fbgiveEndpoint");
  var fbgiveAdminKey = stex.conf.get("fbgiveAdminKey");

  stex.fbgive = {};

  stex.fbgive.post = function(path, params) { return makeRequest("post", path, params); };
  stex.fbgive.get  = function(path, params) { return makeRequest("get", path, params);  };
  stex.fbgive.put  = function(path, params) { return makeRequest("put", path, params);  };


  function makeRequest(method, path, params) {
    return new Promise(function(resolve, reject) {
      var url    = fbgiveEndpoint + path;
      var result = unirest[method].call(unirest, url);

      result.type("json");
      result.send({key: fbgiveAdminKey});
      result.send(params);

      result.end(function(response) {
        if(response.ok) {
          resolve(response.body);
        } else {
          var error = response.error;
          error.response = response;
          reject(error);
        }
      });
    });
  }
});
