var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.renameColumn('wallets', 'authToken', 'authTokenHash', callback);
};

exports.down = function(db, callback) {
  db.renameColumn('wallets', 'authTokenHash', 'authToken', callback);
};
