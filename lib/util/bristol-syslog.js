var bristolSyslog = module.exports;

var syslog = require('node-syslog');
syslog.init("stellar-wallet", null, syslog.LOG_LOCAL7);

bristolSyslog.target = function(options, severity, date, message) {
  var syslogSeverity = getSyslogSeverity(severity);
  syslog.log(syslogSeverity, message);
};

function getSyslogSeverity(bristolSeverity) {
  switch(bristolSeverity) {
    case "error": return syslog.LOG_ERR;
    case "warn":  return syslog.LOG_WARNING;
    case "info":  return syslog.LOG_INFO;
    case "debug": return syslog.LOG_DEBUG;
    case "trace": return syslog.LOG_DEBUG;
    default:      return syslog.LOG_INFO;
  }
}