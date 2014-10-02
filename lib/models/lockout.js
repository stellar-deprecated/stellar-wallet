var Stex    = require("stex");
var errors  = Stex.errors;
var Promise = Stex.Promise;
var _       = Stex._;



/**
 * Lockout is a module used to record failed login attempts, 
 * allowing us to deter online dictionary attacks by preventing attackers from
 * hammering our login endpoint.
 *
 * The design leverages redis hashes and value expiration to provide for an 
 * O(1) cost per login attempt.  It does this by quantizing the progression of
 * time into configurable-size slices. Failed login attempts are recorded in
 * whatever the current slice is, and we only retain N slices in the past.  When
 * determining the number of failed login attempts for a given id, we sum the 
 * results from the last N slices to find the final value.
 * 
 */
var lockout = module.exports;

var CONFIG           = conf.get("loginFailureTracker") || {};
var EXPIRATION       = CONFIG.expirationTime || (60 * 10); // 10 minute default
var SLICE_COUNT      = 6;
var SLICE_SIZE       = Math.ceil(EXPIRATION / SLICE_COUNT);
var ALLOWED_FAILURES = CONFIG.allowedFailures || 5;

lockout.SLEEP_TIME = CONFIG.sleepTime || 250;

lockout.errors = {};
lockout.errors.Disabled = Error.subclass("lockout.Disabled");

/**
 * Records a failed login attempt for the provided id.  The id may be either
 * and ip address, a username, or any other identifying value that you would
 * like to record assiciated failed login attempts.
 *
 * @param  {String} id The id from which this login attempt came from
 * @return {Promise}  A promise that resolves when the redis operations are complete
 */
lockout.record = function(id) {
  // record the failed login attempt for the current time slice
  var current   = currentTimestamp();
  var bucket    = bucketKey(current);
  var expiresAt = current + (SLICE_SIZE * SLICE_COUNT);

  return Promise.join(
    stex.redis.hincrbyAsync(bucket, id, 1),
    stex.redis.expireatAsync(bucket, expiresAt)
  ).then(function(results) {
    var failedAttempts     = parseInt(results[0], 10);
    var justTrippedLockout = failedAttempts === ALLOWED_FAILURES + 1;
    
    if(justTrippedLockout) {
      log.warn({message:"Login lockout initiated: " + id, event:"lockout", lockedOutId:id});
    }

  });
};

/**
 * Returns a boolean representing whether or not the provided id has gone over 
 * the permitted failure count.
 * 
 * @param  {String}  id the id to query upon
 * @return {Promise<Boolean>}    A promise that resolves to true if a login is allowed
 */
lockout.isLoginAllowed = function(id) {
  return lockout.failedLoginAttempts(id)
    .then(function(failureCount) {
      return failureCount <= ALLOWED_FAILURES;
    });
};

/**
 * Returns the failed login count for the provided id
 * @param  {String} id the id to query upon
 * @return {Promise<Integer>}    the failed login count
 */
lockout.failedLoginAttempts = function(id) {
  var current       = currentTimestamp();
  var timestamps    = activeTimestamps(current);

  var countPromises = _.map(timestamps, function(timestamp) {
    return getFailuresfromTimestamp(id, timestamp);
  });

  return Promise.all(countPromises)
    .then(function(results) {
      return _.reduce(results, function(prev, current) {
        return prev + current;
      });
    });
};

lockout.ensureAllowed = function(id) {
  return lockout.isLoginAllowed(id)
    .then(function(isAllowed) {
      if(!isAllowed) {
        throw new lockout.errors.Disabled();
      } 
    });
};


function getFailuresfromTimestamp(id, timestamp) {
  var bucket = bucketKey(timestamp);

  return stex.redis.hgetAsync(bucket, id).then(function (result) {
    return parseInt(result, 10) || 0;
  });
}

function currentTimestamp() {
  return quantizeTimeStamp(new Date());
}

function bucketKey(timestamp) {
  return "failedLogins:slice:" + timestamp;
}

function quantizeTimeStamp(date) {
  var seconds   = Math.floor(date.getTime() / 1000);
  var remainder = seconds % SLICE_SIZE;

  return seconds - remainder;
}

function activeTimestamps(baseTimestamp) {
  return _.times(SLICE_COUNT, function(i) {
    return baseTimestamp - (SLICE_SIZE * i);
  });
}
