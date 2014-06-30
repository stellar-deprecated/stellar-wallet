var util = require("util");

Error.subclass = function(errorName) {
  var newError = function(message) {
    this.name    = errorName;
    this.message = (message || "");
  };

  newError.subclass = this.subclass;
  util.inherits(newError, this);

  return newError;
};

var errors = module.exports;

errors.DuplicateRecord = Error.subclass("DuplicateRecord");
errors.MissingField    = Error.subclass("MissingField");
errors.RecordNotFound  = Error.subclass("RecordNotFound");
errors.Forbidden       = Error.subclass("Forbidden");