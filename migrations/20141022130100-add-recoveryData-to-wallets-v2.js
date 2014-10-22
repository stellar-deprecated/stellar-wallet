var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.addColumn('wallets_v2', 'recoveryData', { type: type.TEXT, length:16777216 }, function(err) {
    if(err) {
      callback(err);
      return;
    }
    db.addColumn('wallets_v2', 'recoveryId', { type: type.STRING, length: "255" }, callback);
  });
};

exports.down = function(db, callback) {
  db.removeColumn('wallets_v2', 'recoveryData', { type: type.TEXT, length:16777216 }, function(err) {
    if(err) {
      callback(err);
      return;
    }
    db.removeColumn('wallets_v2', 'recoveryId', { type: type.STRING, length: "255" }, callback);
  });
};
