var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.renameColumn('wallets', 'authToken', 'authTokenHash', callback);
};

exports.down = function(db, callback) {
  db.renameColumn('wallets', 'authTokenHash', 'authToken', callback);
};
