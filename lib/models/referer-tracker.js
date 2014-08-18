var Stex = require("stex");
var _    = Stex._;
var url  = require('url');

var refererTracker = module.exports;

var EXPECTED_DOMAINS = _([
  conf.get("expectedRefererDomain"),
  "localhost",
]);


refererTracker.track = function(req) {
  var referer = req.get('Referer');

  if (_.isEmpty(referer)) {
    logWarning(req, "A request with an empty referer occurred");
    return;
  }
  var parsed = url.parse(referer);
  var domain = parsed.hostname;

  if(!EXPECTED_DOMAINS.contains(domain)) {
    logWarning(req, "Unexpected domain: " + domain, {domain:domain});
    return;
  }



};

function logWarning(req, message, params) {
  var data = {message: message, event: "bad_referer", ip:req.ip};
  _.extend(data, params);
  log.warn(data);
}