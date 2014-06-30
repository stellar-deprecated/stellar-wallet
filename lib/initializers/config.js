module.exports = function (app) {
  var env   = process.env.NODE_ENV || "development";
  var nconf = require("nconf");

  var jsonWithCommentsFormat = require(__dirname + "/../util/nconf").jsonWithCommentsFormat;

  // NOTE!!!! reverse order priority env is higher priority than env-file, etc.
  nconf
    .env()
    .file('env-file',  { file:__dirname + '/../../config/' + env + '.json', format:jsonWithCommentsFormat})
    .file('all-envs',  { file:__dirname + '/../../config/all-envs.json', format:jsonWithCommentsFormat});

  global.conf = nconf;
};