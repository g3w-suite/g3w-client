var path = require('path');
var del = require('del');
var configuration_path = path.join(__dirname,'config');
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
var cleanCSS = require('gulp-clean-css');
var gutil = require("gulp-util");
var less = require('gulp-less');
var browserify = require('browserify');
var watchify = require('watchify');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var Server = require('karma').Server;

var production = false;

gulp.task('browserify', [], function(cb) {
    var bundler = browserify('./src/js/index.js', {
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
          //browserSync.notify(err.message, 3000);
          //browserSync.reload();
          this.emit('end');
          del(['build/**']).then(function(){
            process.exit();
          });
        })
        .pipe(source('build.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(gulpif(production, uglify()))
        .pipe(sourcemaps.write())
        .pipe(rename('app.js'))
        .pipe(gulp.dest('build/js/'));
    };
    bundler.on('update', rebundle);
    return rebundle();
});

gulp.task('less',['fonts'], function () {
  return gulp.src('./src/style/less/app.less')
    .pipe(less({
      paths: [ path.join(__dirname) ]
    }))
    .pipe(gulp.dest('./build/style/'));
});

gulp.task('less-skins', function () {
  return gulp.src('./src/style/less/skins/*.less')
    .pipe(less({
      paths: [ path.join(__dirname) ]
    }))
    .pipe(gulp.dest('./build/style/skins/'));
});

gulp.task('fonts', function () {
  return gulp.src(['./libs/**/*.{eot,ttf,woff,woff2}','./src/**/*.{eot,ttf,woff,woff2}'])
    .pipe(flatten())
    .pipe(gulp.dest('./dist/fonts/'));
});

gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        },
        open: false,
        startPath: "./src/index.html"
    });
});

gulp.task('html', ['fonts'], function () {
    return gulp.src('./src/index.html')
        .pipe(useref())
        .pipe(gulpif(production,gulpif('*.js', uglify())))
        .pipe(gulpif(production,gulpif('*.css', cleanCSS({processImport: false}))))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch',function() {
    gulp.watch('./build/js/**/*.js', function(){
        browserSync.reload();
    });
    gulp.watch('.src/**/*.less', ['less']);
    gulp.watch('./build/style/**/*.css', function(){
        browserSync.reload();
    });
    gulp.watch('./src/index.html', function(){
        browserSync.reload();
    });
});

gulp.task('production', function(){
    production = true;
})

gulp.task('serve', ['browser-sync','browserify','less','watch']);
gulp.task('dist', ['production','browserify','less','html']);

gulp.task('default',['serve']); // development


//Karma
/**
 * Run test once and exit
 */
gulp.task('karma_test', function (done) {
  new Server({
    configFile: configuration_path + '/karma.conf.js',
    singleRun: true
  }, done).start();
});

/**
 * Watch for file changes and re-run tests on each change
 */
gulp.task('karma_tdd', function (done) {
  new Server({
    configFile: configuration_path + '/karma.conf.js'
  }, done).start();
});


