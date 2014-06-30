// db-migrate compatible config file generator

var nconf = require("nconf");

function getDbConfigForEnvironment(env) {
  var conf = new nconf.Provider(); // initialize a standalone config instance

  var jsonWithCommentsFormat = require(__dirname + "/../lib/util/nconf").jsonWithCommentsFormat;

  conf
    .env()
    .file('env-file',  { file:__dirname + '/' + env + '.json', format:jsonWithCommentsFormat})
    .file('all-envs',  { file:__dirname + '/all-envs.json',    format:jsonWithCommentsFormat});
  var knexConfig =  conf.get("db");

  if (typeof knexConfig === 'undefined') {
    return {};
  }

  var dbMigrateConfig      = {};
  dbMigrateConfig.driver   = knexConfig.client;
  dbMigrateConfig.user     = knexConfig.connection.user;
  dbMigrateConfig.database = knexConfig.connection.database;

  if(knexConfig.connection.host) {
    dbMigrateConfig.host = knexConfig.connection.host;
  }

  if(knexConfig.connection.port) {
    dbMigrateConfig.port = knexConfig.connection.port;
  }

  if(knexConfig.connection.password) {
    dbMigrateConfig.password = knexConfig.connection.password;
  }


  return dbMigrateConfig;
}

var config = {
  development: getDbConfigForEnvironment("development"),
  test:        getDbConfigForEnvironment("test"),
  production:  getDbConfigForEnvironment("production")
};

module.exports = config;
