var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.addColumn('wallets', 'createdAt', { type: type.DATE_TIME } , function(err) {
    if(err) { 
      return callback(err); 
    }
    db.addColumn('wallets', 'updatedAt', { type: type.DATE_TIME }, callback);
  });
};

exports.down = function(db, callback) {
  db.removeColumn('wallets', 'createdAt', function(err) {
    if(err) { 
      return callback(err); 
    }
    db.removeColumn('wallets', 'updatedAt', callback);
  });
};
