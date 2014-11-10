var totp = module.exports;
var notp = require("notp");

totp.verify = function(code, key) {
  return notp.totp.verify(code, new Buffer(key, 'base64'), {window:conf.get("totpWindow")});
};