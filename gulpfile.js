var stexDev = require("stex-dev");
var gulp    = stexDev.gulp();
var plugins = stexDev.gulpPlugins();
var paths   = stexDev.paths;


// composite gulp tasks
gulp.task('default',  ['test']);
gulp.task('dist',     ['']);
gulp.task('test',     ['lint', 'mocha']);
// gulp.task('db:setup', ['db:ensure-created', 'db:migrate']);

// end composite tasks


// you can find individual gulp tasks in ./node_modules/stex-dev/lib/gulp.js



// // expose the app globals to other tasks
// gulp.task('app', function(next) {
//   var stex = require("./lib/app");
//   stex.activate();
//   next();
// });

// gulp.task('db:ensure-created', ['app'], function() {
//   var Knex = require("knex");
//   var dbConfig = conf.get("db");
//   var dbToCreate = dbConfig.connection.database;

//   // create a connection to the db without specifying the db
//   delete dbConfig.connection.database;
//   var db = Knex.initialize(dbConfig);

//   return db.raw("CREATE DATABASE IF NOT EXISTS `" + dbToCreate + "`")
//     .then(function() { /* noop */ })
//     .finally(function(){
//       db.client.pool.destroy(); 
//     });
// });


// gulp.task('db:migrate', function(next) {
//   var spawn = require('child_process').spawn;

//   var proc = spawn("stex", ["db-migrate", "up"], { stdio: 'inherit' });
//   proc.on('close', function (code) {
//     if(code === 0) {
//       next();
//     } else {
//       next(new Error("Process failed: " + code));
//     }
//   });
// });


