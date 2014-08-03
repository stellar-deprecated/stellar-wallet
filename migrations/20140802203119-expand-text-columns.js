var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.changeColumn('wallets', 'mainData', { type: type.TEXT, length:16777216 }, function(){
    db.changeColumn('wallets', 'keychainData', { type: type.TEXT, length:16777216 }, function(){
      db.changeColumn('wallets', 'recoveryData', { type: type.TEXT, length:16777216 }, callback);
    });
  });
};

exports.down = function(db, callback) {
  db.changeColumn('wallets', 'mainData', { type: type.TEXT, length:65535 }, function(){
    db.changeColumn('wallets', 'keychainData', { type: type.TEXT, length:65535 }, function(){
      db.changeColumn('wallets', 'recoveryData', { type: type.TEXT, length:65535 }, callback);
    });
  });
};
