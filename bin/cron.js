// This script should be executed every minute. This is to prevent updating crontab every time
// we need to add additional script. We're using later.js to check if we should fire a function.
var Stex      = require('stex');
var email     = require("../lib/util/email");
var errors    = Stex.errors;
var _         = Stex._;
var Promise   = Stex.Promise;
var later     = require('later');
var walletV2  = require("../lib/models/wallet-v2");

var now = new Date();
now.setSeconds(0); // Round to minutes

require("../lib/app").init()
  .then(function() {
    // UTC times
    // More about text parser: http://bunkat.github.io/later/parsers.html#text
    var tasks = [
      run('at 5:00pm everyday', sendGracePeriodEmails)
    ];
    return Promise.all(tasks);
  })
  .finally(function() {
    if (stex) {
      stex.shutdown();
    }
  });

function run(when, func) {
  var schedule = later.parse.text(when);
  if (later.schedule(schedule).isValid(now)) {
    return func();
  }
  return Promise.resolve();
}

function sendGracePeriodEmails() {
  return walletV2.getWithTotpGracePeriodInitiated('1d')
    .then(function(results) {
      var emailPromises = _.map(results, function(result) {
        var usernameWithoutDomain = stex.fbgive.usernameWithoutDomain(result.username);
        return email.sendEmail(usernameWithoutDomain, 'totp_grace_period');
      });

      return Promise.all(emailPromises);
    });
}
