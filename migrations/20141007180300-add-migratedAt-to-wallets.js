var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.addColumn('wallets', 'migratedAt', { type: type.DATE_TIME }, callback);
};

exports.down = function(db, callback) {
  db.removeColumn('wallets', 'migratedAt', { type: type.DATE_TIME }, callback);
};
