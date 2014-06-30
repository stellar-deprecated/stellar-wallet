var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.addIndex('wallets', 'recoveryId_unique', ['recoveryId'], true, callback);
};

exports.down = function(db, callback) {
  db.removeIndex('wallets', 'recoveryId_unique', callback);
};
