var Stex    = require("stex");
var stexDev = require("stex-dev");
var gulp    = stexDev.gulp();
var plugins = stexDev.gulpPlugins();
var paths   = stexDev.paths;

paths.root = __dirname; //HACK: can't think of a better way to expose the app root prior to stex init

gulp.task('default',  ['test']);
gulp.task('dist',     ['']);
gulp.task('test',     ['lint', 'mocha']);
gulp.task('db:setup', ['db:ensure-created', 'db:migrate']);

// you can find individual gulp tasks in ./node_modules/stex-dev/lib/gulp.js

