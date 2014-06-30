var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.changeColumn('wallets', 'mainData', { type: type.TEXT }, function(){
    db.changeColumn('wallets', 'keychainData', { type: type.TEXT }, function(){
      db.changeColumn('wallets', 'recoveryData', { type: type.TEXT }, callback);
    });
  });
};

exports.down = function(db, callback) {
  db.changeColumn('wallets', 'mainData', { type: type.BLOB }, function(){
    db.changeColumn('wallets', 'keychainData', { type: type.BLOB }, function(){
      db.changeColumn('wallets', 'recoveryData', { type: type.BLOB }, callback);
    });
  });
};
