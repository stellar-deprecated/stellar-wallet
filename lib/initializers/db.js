module.exports = function(app) {
  var Knex  = require('knex');

  global.db = Knex.initialize(conf.get("db"));

};