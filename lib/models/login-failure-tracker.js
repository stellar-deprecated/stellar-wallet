var Stex    = require("stex");
var errors  = Stex.errors;
var Promise = Stex.Promise;
var _       = Stex._;

var loginFailureTracker = module.exports;

var CONFIG           = conf.get("loginFailureTracker") || {};
var EXPIRATION       = CONFIG.expirationTime || (60 * 10) // 10 minute default
var SLICE_COUNT      = 6
var SLICE_SIZE       = Math.ceil(EXPIRATION / SLICE_COUNT)
var ALLOWED_FAILURES = CONFIG.allowedFailures || 5;

loginFailureTracker.SLEEP_TIME = CONFIG.sleepTime || 250;

/**
 * records a failed login attempt for the provided id.  The id may be either
 * and ip address, a username, or any other identifying value that you would
 * like to record assiciated failed login attempts.
 *
 * @param  {String} id The id from which this login attempt came from
 * @return {Promise}  A promise that resolves when the redis operations are complete
 */
loginFailureTracker.record = function(id) {
  // record the failed login attempt for the current time slice
  var current   = currentTimestamp();
  var bucket    = bucketKey(current);
  var expiresAt = current + (SLICE_SIZE * SLICE_COUNT);

  return Promise.join(
    stex.redis.hincrbyAsync(bucket, id, 1),
    stex.redis.expireatAsync(bucket, expiresAt)
    )
};

/**
 * Returns a boolean representing whether or not the provided id has gone over 
 * the permitted failure count.
 * 
 * @param  {String}  id the id to query upon
 * @return {Promise<Boolean>}    A promise that resolves to true if a login is allowed
 */
loginFailureTracker.isLoginAllowed = function(id) {
  return loginFailureTracker.failedLoginAttempts(id)
    .then(function(failureCount) {
      return failureCount <= ALLOWED_FAILURES;
    })
};

/**
 * Returns the failed login count for the provided id
 * @param  {String} id the id to query upon
 * @return {Promise<Integer>}    the failed login count
 */
loginFailureTracker.failedLoginAttempts = function(id) {
  var current       = currentTimestamp();
  var timestamps    = activeTimestamps(current);

  var countPromises = _.map(timestamps, function(timestamp) {
    return getFailuresfromTimestamp(id, timestamp);
  });

  return Promise.all(countPromises)
    .then(function(results) {
      return _.reduce(results, function(prev, current) {
        return prev + current;
      })
    })
}


function getFailuresfromTimestamp(id, timestamp) {
  var bucket = bucketKey(timestamp);

  return stex.redis.hgetAsync(bucket, id).then(function (result) {
    // TODO: ensure value is properly a number
    return parseInt(result) || 0;
  })
}

function currentTimestamp() {
  return quantizeTimeStamp(new Date());
}

function bucketKey(timestamp) {
  return "failedLogins:slice:" + timestamp;
}

function quantizeTimeStamp(date) {
  var seconds   = Math.floor(date.getTime() / 1000)
  var remainder = seconds % SLICE_SIZE

  return seconds - remainder;
}

function activeTimestamps(baseTimestamp) {
  return _.times(SLICE_COUNT, function(i) {
    return baseTimestamp - (SLICE_SIZE * i);
  });
}