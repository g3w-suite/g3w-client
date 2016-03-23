var gulp   = require('gulp');
var del = require('del');
var jshint = require('gulp-jshint');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var watch = require('gulp-watch');
var browserify = require('browserify');
var watchify = require('watchify');

var production = true;

gulp.task('browserify', [], function(cb) {
    var bundler = browserify('./src/g3w.ol3.js', {
      paths: ["./src/**/*.js"],
      debug: !production,
      cache: {},
      packageCache: {}
    });
    if (!production) {
      bundler = watchify(bundler);
    }
    var rebundle = function() {
      return bundler.bundle()
        .on('error', function(err){
          console.log(err.message);
          this.emit('end');
          del(['./dist/*.js']);
        })
        .pipe(source('build.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(gulpif(production, uglify()))
        .pipe(sourcemaps.write())
        .pipe(rename('g3w.ol3.js'))
        .pipe(gulp.dest('./dist'))
    };
    bundler.on('update', rebundle);
    return rebundle();
});

gulp.task('jshint', function() {
  return gulp.src(['./src/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('watch',function() {
    watch('./src/**/*.js' ,function(){
      gulp.start('jshint');
    });
});

gulp.task('development',function(){
  production = false;
});

gulp.task('default',['jshint','browserify']);
gulp.task('dev',['development','watch','jshint','browserify']);
