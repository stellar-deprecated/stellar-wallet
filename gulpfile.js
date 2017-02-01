var gulp    = require("gulp");
var Stex    = require("stex");
var StexDev = require("stex/dev");
var gulp    = StexDev.gulp();
var plugins = StexDev.gulpPlugins();
var paths   = StexDev.paths;
var fs = require("fs");

paths.root = __dirname; //HACK: can't think of a better way to expose the app root prior to stex init

gulp.task('default',  ['test']);
gulp.task('dist',     []);
gulp.task('test',     ['lint', 'mocha-copy']);
gulp.task('db:setup', ['db:migrate-copy']);

// After spending too much time trying to fix bad paths in stex, I decided to
// copy gulp tasks with correct files here.
// Correct fix is hard because we need to make sure stex is working here but
// also for stellar-api. The problem is npm somehow creates a different tree in
// /node_modules/stex/node_modules for stellar-wallet and stellar-api.
gulp.task('db:migrate-copy', ['db:ensure-created'], function(done) {
  var kexec = require("kexec");

  if (!fs.existsSync("./migrations")) {
    console.info("No migrations in /migrations");
    process.exit(0);
    return;
  }
  var program = __dirname + '/node_modules/.bin/db-migrate';
  var args    = [
    "--config",
    __dirname + "/node_modules/stex/lib/db-migrate/config.js",
    "--env",
    "test",
    "up"
  ]
  kexec(program, args);
  done();
});

gulp.task('mocha-copy', function() {
  return gulp.src('test/*.js', {"cwd": './'})
    .pipe(require('gulp-spawn-mocha')({
      'reporter' : 'list',
      'env'      : {'NODE_ENV': 'test'},
      'istanbul' : true
    }));
});

// you can find individual gulp tasks in ./node_modules/stex-dev/lib/gulp.js
