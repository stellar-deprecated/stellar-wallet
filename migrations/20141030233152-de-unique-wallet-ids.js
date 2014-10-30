var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.removeIndex('wallets_v2', 'walletId_unique', function() {
    db.addIndex('wallets_v2', 'walletId', ['walletId'], false, callback);
  });
};

exports.down = function(db, callback) {
  db.removeIndex('wallets_v2', 'walletId', function() {
    db.addIndex('wallets_v2', 'walletId_unique', ['walletId'], true, callback);
  });
};
