var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.changeColumn('wallets', 'recoveryId', { type: type.STRING, length: "255", notNull: false }, callback);
};

exports.down = function(db, callback) {
  db.changeColumn('wallets', 'recoveryId', { type: type.STRING, length: "255", notNull: true }, callback);
};
