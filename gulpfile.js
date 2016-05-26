var conf = require('./config');
var path = require('path');
var del = require('del');
var url = require('url');
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
var httpProxy = require('http-proxy');
var Server = require('karma').Server;

var production = false;

gulp.task('browserify', [], function(done) {
    var bundler = browserify('./src/app/index.js', {
      paths: ["./src/app/js/","./src/libs/","./src/libs/common/","./src/libs/modules/"],
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
          console.log(err);
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
        .pipe(gulpif(production, uglify().on('error', gutil.log)))
        .pipe(sourcemaps.write())
        .pipe(rename('app.js'))
        .pipe(gulp.dest('build/js/'))
        .pipe(browserSync.reload({stream: true, once: true}));
      done();
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
    .pipe(gulp.dest('./build/css/'))
    .pipe(gulp.dest('./dist/g3w-client/css/'));
});

gulp.task('less-skins', function () {
  return gulp.src('./src/libs/common/g3w-base-app/style/less/skins/*.less')
    .pipe(less({
      paths: [ path.join(__dirname) ]
    }))
    .pipe(gulp.dest('./build/css/skins/'))
    .pipe(gulp.dest('./dist/g3w-client/css/skins/'));
});

gulp.task('fonts', function () {
  return gulp.src(['./src/libs/common/third-party/**/*.{eot,ttf,woff,woff2}','./third-party/**/*.{eot,ttf,woff,woff2}','./src/**/*.{eot,ttf,woff,woff2}'])
    .pipe(flatten())
    .pipe(gulp.dest('./build/fonts/'))
    .pipe(gulp.dest('./dist/g3w-client/fonts/'));
});

gulp.task('images', function () {
  return gulp.src(['./src/libs/common/third-party/**/*.{png,jpg,gif}}','./src/**/*.{png,jpg,gif}'])
    .pipe(flatten())
    .pipe(gulp.dest('./build/images/'))
    .pipe(gulp.dest('./dist/g3w-client/images/'));
});

gulp.task('assets',['fonts','images','less']);

var proxy = httpProxy.createProxyServer({
  target: conf.proxy.url
});

proxy.on('error',function(e){
  gutil.log(e);
});

function proxyMiddleware(urls) {
	return function(req, res, next){
    var doproxy = false;
    for(var i in urls){
      if (req.url.indexOf(urls[i]) > -1){
        doproxy = true;
      }
    }
    if (doproxy){
      proxy.web(req,res);
    }
    else{
      next();
    }
  }
}

gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: ["src","."],
            middleware: [proxyMiddleware(conf.proxy.urls)]
        },
        open: false,
        startPath: "/"
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
    watch(['./src/app/style/*.less','./src/libs/common/g3w-base-app/style/*.less','./src/libs/common/g3w-base-app/style/less/*.less'],function(){
      gulp.start('less');
    });
    watch(['./src/libs/common/g3w-base-app/less/skins/*.less'],function(){
      gulp.start('less-skins');
    });
    watch(['./src/libs/common/g3w-base-app/less/skins/*.less'],function(){
      gulp.start('less-skins');
    });
    watch('./src/app/configs/*.js',function(){
      gulp.start('preprocess');
    });
    watch('./src/**/*.{png,jpg}',function(){
      gulp.start('images');
    });
    gulp.watch(['./build/**/*.css','./src/index.html','./src/**/*.html'], function(){
        browserSync.reload();
    });
    // uso gulp-watch così jshint viene eseguito anche su file nuovi (che gulp.watch non traccia)
    //watch(['./src/app/**/*.js','./src/libs/g3w/**/*.js','./src/libs/g3w-ol3/src/**/*.js'] ,function(){
    //  gulp.start('jshint');
    //});
});

gulp.task('production', function(){
    production = true;
})

gulp.task('serve', ['browser-sync','browserify','assets','less-skins', 'watch']);
gulp.task('dist', ['production','browserify','assets','html']);
gulp.task('g3w-admin', [],function(){
  gulp.src('./dist/g3w-client/**/*.*')
  .pipe(gulp.dest(conf.g3w_admin_dest));
});

gulp.task('default',['serve']); // development


//Karma
/**
 * Run test once and exit
 */
gulp.task('karma_test', function (done) {
  new Server({
    configFile: './karma.conf.js',
    singleRun: true
  }, done).start();
});

/**
 * Watch for file changes and re-run tests on each change
 */
gulp.task('karma_tdd', function (done) {
  new Server({
    configFile: './karma.conf.js'
  }, done).start();
});


