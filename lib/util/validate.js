var Stex      = require("stex");
var errors    = Stex.errors;
var Promise   = Stex.Promise;
var _         = Stex._;
var hash      = require("../util/hash");
var validator = require("validator");

var validate                    = module.exports;
validate.errors                 = {};
validate.errors.InvalidHash     = Error.subclass("validate.InvalidHash");
validate.errors.MissingField    = Error.subclass("validate.MissingField");
validate.errors.NotJson         = Error.subclass("validate.NotJson");
validate.errors.InvalidUsername = Error.subclass("validate.InvalidUsername");
validate.errors.InvalidLength   = Error.subclass("validate.InvalidLength");


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
    var value = data[prop];
    
    // normally use lodash
    var isEmpty = _.isEmpty(value);
    //special case for Buffers
    if (value instanceof Buffer) {
      isEmpty = value.length === 0;
    }
    
    if(isEmpty) {
      var e = new validate.errors.MissingField(prop + " is blank");
      e.field = prop;
      return Promise.reject(e);
    } else {
      return Promise.resolve(data);
    }
  };
};

validate.json = function(prop) {
  return function(data) {
    var value = data[prop];
    try {
      JSON.parse(value);
      return Promise.resolve(data);
    } catch(err) {
      var e = new validate.errors.NotJson(prop + " is not json");
      e.field = prop;
      return Promise.reject(e);
    }
  };
};

/**
 * Validates the length and character class of an email-like username.
 * 
 * @param {string} prop the name of the prop to validate
 */
validate.username = function(prop) {
  return function(data) {
    var value           = data[prop];
    var parts           = value.split('@');
    var username        = parts[0];
    var domain          = parts[1];
    var validLength     = username.length >= 3 && username.length <= 20;
    var validCharacters = !!username.match(/^[a-zA-Z0-9]+([._-]+[a-zA-Z0-9]+)*$/);
    
    var e;
    
    if(!validLength) {
      e = new validate.errors.InvalidUsername(prop + " is not 3-20 characters");
      e.field = prop;
      return Promise.reject(e);
    }
    
    if(!validCharacters) {
      e = new validate.errors.InvalidUsername(prop + " contains invalid characters");
      e.field = prop;
      return Promise.reject(e);
    }

    if(!domain) {
      e = new validate.errors.InvalidUsername(prop + " does not have a domain");
      e.field = prop;
      return Promise.reject(e);
    }
    
    return Promise.resolve(data);
  };
};

/**
 * Validates the decoded byte length of a base64 encoded string
 * @param {string} prop the name of the prop to validate
 * @param {number} length the byte length the buffer must be to pass the validation
 */
validate.byteLength = function(prop, length) {
  return function(data) {
    var value = data[prop];
    
    var buf = new Buffer(value || "", "base64");
    
    if(buf.length !== length) {
      var e = new validate.errors.InvalidLength(prop + " is not " + length + " bytes long");
      e.field = prop;
      return Promise.reject(e);
    }
    
    return Promise.resolve(data);
  };
};
