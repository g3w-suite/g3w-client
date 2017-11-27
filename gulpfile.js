var path = require('path');
//Gulp
var gulp   = require('gulp');
var concat = require('gulp-concat');
var streamify = require('gulp-streamify');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var flatten = require('gulp-flatten');
var useref = require('gulp-useref');
var filter = require('gulp-filter');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var chalk = require('chalk');
var watch = require('gulp-watch');
var cleanCSS = require('gulp-clean-css');
var gutil = require("gulp-util");
var less = require('gulp-less');
var jshint = require('gulp-jshint');
var browserify = require('browserify');
var watchify = require('watchify');
var stringify = require('stringify');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');

process.env.NODE_PATH = '../../../node_modules/';
var production = false;

gulp.task('browserify', [], function() {
  var bundler = browserify('./index.js', {
    basedir: "./",
    paths: ["./"],
    debug: !production,
    cache: {},
    packageCache: {}
  });
  if (!production) {
    bundler = watchify(bundler);
  }
  bundler.transform(stringify, {
    appliesTo: { includeExtensions: ['.html'] }
  });

  var bundle = function(){
    return bundler.bundle()
      .pipe(source('build.js'))
      .pipe(buffer())
      .pipe(gulpif(!production,sourcemaps.init({ loadMaps: true })))
      .pipe(gulpif(production, uglify().on('error', gutil.log)))
      .pipe(gulpif(!production,sourcemaps.write()))
      .pipe(rename('plugin.js'))
      .pipe(gulp.dest('./'));
  };

  var rebundle;

  if (!production) {
    rebundle = function(){
      return bundle();
    };
    bundler.on('update', rebundle);
  }
  else {
    rebundle = function(){
      return bundle();
    }
  }
  return rebundle();
});


gulp.task('production', function(){
    production = true;
});

gulp.task('watch',['browserify']);

gulp.task('default',['production','browserify']);



