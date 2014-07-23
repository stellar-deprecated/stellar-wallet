var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable('wallets', {
    id:           { type: type.STRING, primaryKey: true, length: "255", notNull: true },
    recoveryId:   { type: type.STRING, length: "255", notNull: true },
    authToken:    { type: type.STRING, length: "255", notNull: true },
    data:         { type: type.BLOB },
    recoveryData: { type: type.BLOB },
  }, callback);
};

exports.down = function(db, callback) {
  db.dropTable('wallets', callback);
};
