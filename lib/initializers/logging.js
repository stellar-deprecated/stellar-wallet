var util      = require("util");
/**
 * This logging subsystem is setup to format any logging data as json.  By default, 
 * the ouput target will humanize the json (using json-log-humanizer) such that 
 * it is readable by humans on the console, but in cases where we are writing the
 * logs to files we will store them as json for easier programmatic access
 */
module.exports = function(app) {
  global.log = require("bristol");

  log
    .addTarget(getTarget())
    .withFormatter('json')
    .withLowestSeverity(conf.get("logLevel"));


  app.use(function(req, res, next) {
    writeHttpLines(req, res);
    next();
  });
};

function writeHttpLines(req, res) {
  req._startAt       = process.hrtime();

  log.info({
    type:   "request",
    url:    req.originalUrl || req.url,
    method: req.method,
    body:   req.body,
    ip:     req.ip || req.connection.remoteAddress
  });

  function logResponse() {
    log.info({
      type:     "response",
      status:   res._header ? res.statusCode : null,
      duration: requestDuration(req),
    });
  }

  res.once('finish', logResponse);
  res.once('close',  logResponse);
}



function requestDuration(req) {
  if (!req._startAt) {
    return -1.0; // unknown milliseconds
  }

  var diff = process.hrtime(req._startAt);
  // [seconds, nanoseconds]
  var ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms;
}

function getTarget() {
  var logTarget = conf.get("logTarget");

  switch (logTarget){
    case "console":
      return "console";
    case "syslog":
      var bristolSyslog = require('../util/bristol-syslog');
      return bristolSyslog.target;
    case "humanizer":
      var humanizer = require('../util/json-log-humanizer');
      return humanizer.target;
    default:
      throw new Error("Invalid logging target: " + util.inspect(logTarget));
  }
}

