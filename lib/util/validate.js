var Stex    = require("stex");
var errors  = Stex.errors;
var Promise = Stex.Promise;
var _       = Stex._;
var hash    = require("../util/hash");

var validate                 = module.exports;
validate.errors              = {};
validate.errors.InvalidHash  = Error.subclass("validate.InvalidHash");
validate.errors.MissingField = Error.subclass("validate.MissingField");


validate.hash = function (prop, options) {
  if(!options) {
    options = {};
  }

  return function(data) {
    var value     = data[prop];
    var valueHash = data[prop + "Hash"];
    var e;

    function fail() {
      e = new validate.errors.InvalidHash(prop + " is corrupt");
      e.field = prop;
      return Promise.reject(e);
    }

    if(_.isEmpty(value)) {
      if(options.allowBlank) {
        return Promise.resolve(data);
      } else {
        return fail();
      }
    } 

    var dataHash = hash.sha1(value);

    if(dataHash !== valueHash) {
      return fail();
    } else {
      return Promise.resolve(data);
    }
  };
};

validate.present = function(prop) {
  return function(data) {
    if(_.isEmpty(data[prop])) {
      var e = new validate.errors.MissingField(prop + " is blank");
      e.field = prop;
      return Promise.reject(e);
    } else {
      return Promise.resolve(data);
    }
  };
};

