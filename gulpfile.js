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
var Server = require('karma').Server;

var production = false;

gulp.task('browserify', [], function(cb) {
    var bundler = browserify('./src/app/index.js', {
      paths: ["./src/app/js/","./src/libs/"],
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
    var rebundle = function() {
      return bundler.bundle()
        .on('error', function(err){
          console.log(err.message);
          //browserSync.notify(err.message, 3000);
          //browserSync.reload();
          this.emit('end');
          del(['build/js/app.js','build/style/app.css']).then(function(){
            process.exit();
          });
        })
        .pipe(source('build.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(gulpif(production, uglify()))
        .pipe(sourcemaps.write())
        .pipe(rename('app.js'))
        .pipe(gulp.dest('build/js/'))
        .pipe(browserSync.reload({stream: true, once: true}));
    };
    bundler.on('update', rebundle);
    return rebundle();
});

gulp.task('jshint', function() {
  return gulp.src('./src/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('less',['fonts'], function () {
  return gulp.src('./src/app/style/app.less')
    .pipe(less({
      paths: [ path.join(__dirname) ]
    }))
    .pipe(gulp.dest('./build/style/'));
});

gulp.task('less-skins', function () {
  return gulp.src('./src/app/style/less/skins/*.less')
    .pipe(less({
      paths: [ path.join(__dirname) ]
    }))
    .pipe(gulp.dest('./build/style/skins/'));
});

gulp.task('fonts', function () {
  return gulp.src(['./third-party/**/*.{eot,ttf,woff,woff2}','./src/**/*.{eot,ttf,woff,woff2}'])
    .pipe(flatten())
    .pipe(gulp.dest('./dist/g3w-client/fonts/'));
});

gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./",
            index: "./src/index.html"
        },
        open: false,
        startPath: "./src/index.html"
    });
});

gulp.task('html', ['fonts'], function () {
    return gulp.src('./src/index.html')
        .pipe(useref())
        //.pipe(gulpif(production,gulpif('*.js', uglify())))
        .pipe(gulpif(production,gulpif('*.css', cleanCSS({processImport: false}))))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch',function() {
    gulp.watch(['./src/app/style/*.less','./src/app/style/**/*.less'], ['less']);
    gulp.watch(['./build/style/app.css','./src/index.html','./src/**/*.html'], function(){
        browserSync.reload();
    });
    // uso gulp-watch così jshint viene eseguito anche su file nuovi (che gulp.watch non traccia)
    watch('./src/**/*.js' ,function(){
      gulp.start('jshint');
    });
});

gulp.task('production', function(){
    production = true;
})

gulp.task('serve', ['jshint','browser-sync','browserify','less','less-skins', 'watch']);
gulp.task('dist', ['jshint','production','browserify','less','html']);
gulp.task('g3w-admin', ['dist'],function(){
  gulp.src('./dist/g3w-client/**/*.*')
  .pipe(gulp.dest('../g3w-admin/g3w-admin/client/static/g3w-client'))
});

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


