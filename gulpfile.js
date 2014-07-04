var gulp    = require("gulp");
var plugins = require('gulp-load-plugins')();

// composite gulp tasks
gulp.task('default',  ['test']);
gulp.task('dist',     ['']);
gulp.task('test',     ['lint', 'mocha']);
gulp.task('develop',  ['nodemon']);
gulp.task('db:setup', ['db:ensure-created', 'db:migrate']);

// end composite tasks

var paths = {
  "lint":  ['./gulpfile.js', './lib/**/*.js', './config/**/*.js', './migrations/**/*.js'],
  "watch": ['./gulpfile.js', './lib/**', './test/**/*.js', '!test/{temp,temp/**}'],
  "tests": ['./test/**/*.js', '!test/{temp,temp/**}']
};

//component tasks

gulp.task('mocha', function(cb) {
  return gulp
    .src(paths.tests, {"cwd": __dirname})
    .pipe(plugins.spawnMocha({
      'reporter' : 'list', 
      'env'      : {'NODE_ENV': 'test'}
    }));
});

gulp.task('lint', function () {
  return gulp.src(paths.lint)
    .pipe(plugins.jshint('.jshintrc'))
    // .pipe(plugins.jscs())
    .pipe(plugins.jshint.reporter('jshint-stylish'));
});

gulp.task('watch', function() {
  gulp.run('test');
  return gulp.watch(paths.watch, ['test']);
});

gulp.task('nodemon', function () {
  return plugins.nodemon({ script: './bin/www', ext: 'js', ignore: [] })
    .on('change', ['test'])
    .on('restart', function () {});
});


// expose the app globals to other tasks
gulp.task('app', function(next) {
  require("./lib/app");
  next();
});

gulp.task('db:ensure-created', ['app'], function() {
  var Knex = require("knex");
  var dbConfig = conf.get("db");
  var dbToCreate = dbConfig.connection.database;

  // create a connection to the db without specifying the db
  delete dbConfig.connection.database;
  var db = Knex.initialize(dbConfig);

  return db.raw("CREATE DATABASE IF NOT EXISTS `" + dbToCreate + "`")
    .then(function() { /* noop */ })
    .finally(function(){
      db.client.pool.destroy(); 
    });
});


gulp.task('db:migrate', function(next) {
  var spawn = require('child_process').spawn;

  var proc = spawn("./bin/db-migrate", ["up"], { stdio: 'inherit' });
  proc.on('close', function (code) {
    if(code === 0) {
      next();
    } else {
      next(new Error("Process failed: " + code));
    }
  });
});


var shutdown = function() {
  if(typeof stex !== 'undefined') {
    stex.shutdown();
  }
};

gulp.on('stop', shutdown);
gulp.on('err', shutdown);


