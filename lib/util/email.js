var Stex                     = require("stex");
var errors         = Stex.errors;
var Promise        = Stex.Promise;
var _              = Stex._;

var email = module.exports;

email.errors              = {};
email.errors.UserNotFound = Error.subclass("email.UserNotFound");
email.errors.UnknownError = Error.subclass("email.UnknownError");

email.sendEmail = function(username, messageType) {
  if(conf.get("useFbgive") !== true) {
    return Promise.resolve();
  }

  return stex.fbgive.post("/admin/sendEmail", {
      username: username,
      messageType: messageType
    }).then(function(result) {
      if(result.status !== 'success') {
        if (result.code === 'user_not_found') {
          throw new email.errors.UserNotFound();
        }
        throw new email.errors.UnknownError();
      }

      return Promise.resolve();
    });
};
