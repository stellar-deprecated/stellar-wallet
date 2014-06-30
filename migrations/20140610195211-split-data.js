var dbm = require('db-migrate');
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.addColumn('wallets', 'keychainData', { type: type.BLOB } , function(err) {
    if(err) { 
      return callback(err); 
    }
    db.renameColumn('wallets', 'data', 'mainData', callback);
  });
};

exports.down = function(db, callback) {
  db.removeColumn('wallets', 'keychainData', function(err) {
    if(err) { 
      return callback(err); 
    }
    db.renameColumn('wallets', 'mainData', 'data', callback);
  });
};
