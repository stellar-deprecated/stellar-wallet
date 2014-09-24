var dbm = require('stex').dbMigrate;
var type = dbm.dataType;

exports.up = function(db, callback) {
  db.createTable('wallets_v2', {
    // core columns
    id:           { type: 'int', primaryKey: true, autoIncrement: true },
    lockVersion:  { type: 'int', notNull: true },
    createdAt:    { type: type.DATE_TIME, notNull: true  },
    updatedAt:    { type: type.DATE_TIME, notNull: true  },
    // update authorization
    walletId:     { type: type.STRING, length: "255", notNull: true },
    publicKey:    { type: type.STRING, length: "255", notNull: true },
    // login columns
    username:     { type: type.STRING, length: "255", notNull: true },
    salt:         { type: type.STRING, length: "255", notNull: true },
    kdfParams:    { type: type.TEXT, notNull: true },
    totpKey:     { type: type.STRING, length: "255" },
    // Data columns
    mainData:     { type: type.TEXT, length:16777216 },
    keychainData: { type: type.TEXT, length:16777216 }

  }, function() {
    db.addIndex('wallets_v2', 'username_unique', ['username'], true, function() {
      db.addIndex('wallets_v2', 'walletId', ['walletId'], false, callback);
    });
  });
};

exports.down = function(db, callback) {
  db.dropTable('wallets_v2', callback);
};
