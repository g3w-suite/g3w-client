var conf = require('./config');
var path = require('path');
var del = require('del');
var url = require('url');
//Gulp
var gulp   = require('gulp');
var concat = require('gulp-concat');
var runSequence = require('run-sequence');
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

var distFolder = conf.distFolder;
var clientFolder = conf.clientFolder;

gulp.task('browserify', [], function() {
    var bundler = browserify('./src/app/index.js', {
      basedir: "./",
      paths: ["./src/app/", "./src/libs/", "./src/libs/sdk/"],
      debug: !production,
      cache: {},
      packageCache: {},
    });
    if (!production) {
      bundler = watchify(bundler);
    }
    bundler.transform(stringify, {
      appliesTo: { includeExtensions: ['.html'] }
    });

    var bundle = function(){
      return bundler.bundle()
        .on('error', function(err){
          console.log(err);
          //browserSync.notify(err.message, 3000);
          //browserSync.reload();
          this.emit('end');
          del([clientFolder+'/js/app.js',clientFolder+'/style/app.css']).then(function(){
            process.exit();
          });
        })
        .pipe(source('build.js'))
        .pipe(buffer())
        .pipe(gulpif(!production,sourcemaps.init({ loadMaps: true })))
        //.pipe(gulpif(production, uglify().on('error', gutil.log)))
        .pipe(gulpif(!production,sourcemaps.write()))
        .pipe(rename('app.js'))
        .pipe(gulp.dest(clientFolder+'/js/'))
    };

    var rebundle;

    if (!production) {
      rebundle = function(){
        return bundle().
        pipe(browserSync.reload({stream: true, once: true}));
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

gulp.task('plugins', function() {
  return gulp.src('./src/libs/plugins/**/plugin.js')
    .pipe(rename(function(path){
      path.dirname = distFolder+'/'+path.dirname+'/js/';
    }))
    .pipe(gulp.dest('.'));
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
    /*.pipe(gulpif(production,cleanCSS({
      keepSpecialComments: 0
    })))*/
    .pipe(gulp.dest(clientFolder+'/css/'))
});

gulp.task('less-skins', function () {
  return gulp.src('./src/app/template/style/less/skins/*.less')
    .pipe(less({
      paths: [ path.join(__dirname) ]
    }))
    /*.pipe(gulpif(production,cleanCSS({
      keepSpecialComments: 0
    })))*/
    .pipe(gulp.dest(clientFolder+'/css/skins/'))
});

gulp.task('fonts', function () {
  return gulp.src(['./src/libs/**/*.{eot,ttf,woff,woff2}','./third-party/**/*.{eot,ttf,woff,woff2}','./src/**/*.{eot,ttf,woff,woff2}'])
    .pipe(flatten())
    .pipe(gulp.dest(clientFolder+'/fonts/'))
});

gulp.task('images', function () {
  return gulp.src(['./src/app/images/**/*.{png,jpg,gif,svg}','./src/libs/**/*.{png,jpg,gif,svg}'])
    .pipe(flatten())
    .pipe(gulp.dest(clientFolder+'/images/'))
});

gulp.task('assets',['fonts','images','less','less-skins']);

gulp.task('html', ['assets'], function () {
  return gulp.src('./src/index.html')
    .pipe(useref())
    .pipe(gulpif(['js/app.min.js'], uglify().on('error', gutil.log)))
    .pipe(gulpif(['css/app.min.css'],cleanCSS({
      keepSpecialComments: 0
    })))
    .pipe(gulp.dest(clientFolder));
});

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
        startPath: "/",
        socket: {
          domain: "http://localhost:3000"
        }
    });
});

gulp.task('browser:reload',function(){
  if (browserSync) {
    browserSync.reload()
  }
});

function prepareRunSequence() {
  var _arguments = arguments;
  return function() {
    runSequence.apply(null,_arguments);
  }
}

gulp.task('watch',function() {
    watch(['./src/app/style/*.less','./src/app/template/style/*.less','./src/app/template/style/less/*.less'],
      prepareRunSequence('less','browser:reload')
    );
    watch(['./src/app/style/skins/*.less'],
      prepareRunSequence('less:skins','browser:reload')
    );
    watch('./src/**/*.{png,jpg}',
      prepareRunSequence('images','browser:reload')
    );
    watch('./src/libs/plugins/**/plugin.js',
      prepareRunSequence('plugins','browser:reload')
    );
    gulp.watch(['./src/index.html','./src/**/*.html'], function(){
      browserSync.reload();
    });
});

gulp.task('production', function(){
    production = true;
});

gulp.task('production-bundle',['production','browserify']);

gulp.task('clean', function(){
  return del(['dist/**/*'],{force:true});
});

gulp.task('serve', function(done){
  runSequence('clean','browserify',['assets','watch','plugins'],'browser-sync',
    done);
});

gulp.task('dist', function(done){
    runSequence('clean','production','browserify',['html','plugins'],
    done);
});

gulp.task('g3w-admin-plugins',function(){
  gulp.src(distFolder+'/**/js/plugin.js')
    .pipe(rename(function(path){
      var dirname = path.dirname;
      var pluginname = dirname.replace('/js','');
      var pluginpath = conf.g3w_admin_plugins_basepath+'/'+pluginname+'/static/'+pluginname+'/js/';
      path.dirname = pluginpath;
    }))
    .pipe(gulp.dest("."));
});

gulp.task('g3w-admin-client',function(){
  gulp.src([clientFolder+'/**/*.*','!'+clientFolder+'/index.html','!'+clientFolder+'/js/app.js','!'+clientFolder+'/css/app.css'])
  .pipe(gulp.dest(conf.g3w_admin_client_dest));
});

gulp.task('g3w-admin',function(done){
  runSequence('dist','g3w-admin-plugins','g3w-admin-client',
    done);

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


