var conf = require('./config');
var path = require('path');
var del = require('del');
//Gulp
var gulp   = require('gulp');
///
var argv = require('yargs').argv;
var runSequence = require('run-sequence');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var flatten = require('gulp-flatten');
// userref server per parsare i build block del template
var useref = require('gulp-useref');
///////////////////////////////////////////////////////
var replace = require('gulp-replace');
var gulpif = require('gulp-if');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');
var cleanCSS = require('gulp-clean-css');
var gutil = require("gulp-util");
var less = require('gulp-less');
var jshint = require('gulp-jshint');
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var stringify = require('stringify');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var httpProxy = require('http-proxy');

var production = false;


var distFolder = conf.distFolder;
var clientFolder = conf.clientFolder;

var client = argv.client || '';

var versionHash = Date.now();


gulp.task('browserify', [], function() {
  var bundler = browserify('./src/app/index.js', {
    basedir: "./",
    paths: ["./src/app/", "./src/libs/", "./src/libs/sdk/"],
    debug: !production,
    cache: {},
    packageCache: {}
  });
  if (!production) {
    bundler = watchify(bundler);
  }
  bundler.transform(babelify, {
    babelrc: true
  });
  bundler.transform(stringify, {
    appliesTo: { includeExtensions: ['.html'] }
  });

  var bundle = function() {
    return bundler.bundle()
      .on('error', function(err){
        console.log(err)
        //browserSync.notify(err.message, 3000);
        //browserSync.reload();
        this.emit('end');
        del([clientFolder+'/js/app.js',clientFolder+'/style/app.css']).then(function(){
          process.exit();
        });
      })
      .pipe(source('build.js'))
      .pipe(buffer())
      .pipe(gulpif(production, replace("{G3W_VERSION}",versionHash)))
      .pipe(gulpif(!production,sourcemaps.init({ loadMaps: true })))
      .pipe(gulpif(production, uglify().on('error', gutil.log)))
      .pipe(gulpif(!production,sourcemaps.write()))
      .pipe(rename('app.js'))
      .pipe(gulp.dest(clientFolder+'/js/'))
  };

  var rebundle;

  if (!production) {
    rebundle = function() {
      return bundle()
        .pipe(browserSync.reload({stream: true}));
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

// serve per mettere i plugin nelle rispettive folder
gulp.task('plugins', function() {
  return gulp.src('./src/libs/plugins/**/plugin.js')
    .pipe(rename(function(path) {
      path.dirname = distFolder+'/'+path.dirname+'/js/';
    }))
    .pipe(gulp.dest('.'));
});

// serve per gli eventuali less/css stili nella folder dei plugin
gulp.task('plugins-less-skin', function() {
  return gulp.src('./src/libs/plugins/**/**.less')
    .pipe(less({
    }))
    .pipe(rename(function(path) {
      path.dirname = distFolder+'/'+path.dirname+'/css/';
    }))
    .pipe(gulp.dest('.'))
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
    .pipe(gulp.dest(clientFolder+'/css/'))
});

gulp.task('less-skins', function () {
  return gulp.src('./src/app/template/style/less/skins/**/*.less')
    .pipe(less({
      paths: [ path.join(__dirname) ]
    }))
    .pipe(gulp.dest(clientFolder+'/css/skins/'))
});

gulp.task('fonts', function () {
  return gulp.src(['!./src/libs/**/node_modules/**/','./src/libs/**/*.{eot,ttf,woff,woff2}','./third-party/**/*.{eot,ttf,woff,woff2}','./src/**/*.{eot,ttf,woff,woff2}'])
    .pipe(flatten())
    .pipe(gulp.dest(clientFolder+'/fonts/'))
});

gulp.task('images', function () {
  return gulp.src(['!./src/libs/**/node_modules/**/', './src/app/images/**/*.{png,jpg,gif,svg}','./src/libs/**/*.{png,jpg,gif,svg}'])
    .pipe(flatten())
    .pipe(gulp.dest(clientFolder+'/images/'))
});

gulp.task('datatable-images',function () {
  return gulp.src('./src/app/template/ext/datatables/DataTables-1.10.16/images/*')
    .pipe(flatten())
    .pipe(gulp.dest(clientFolder+'/css/DataTables-1.10.16/images/'))
});

gulp.task('assets',['fonts', 'images', 'less', 'less-skins', 'datatable-images']);

function interpolateVersion(path, separator) {
  var prepost = path.split(separator);
  if (prepost.length != 2) {
    return path;
  }
  return prepost[0] +"."+ versionHash + separator + prepost[1];
}

// compila tutti i fonts, less etc ..
gulp.task('html', ['assets'], function () {
  // prende in pasto il index.html per leggere poi i blocchi build:
  return gulp.src('./src/index.html')
  // concatena i blocchi build all'interno del template index.html es: <!-- build:js js/sdk.ext.min.js -->
    .pipe(useref())
    .pipe(gulpif(['css/app.min.css'],cleanCSS({
      keepSpecialComments: 0
    })))
    .pipe(rename(function(path) {
      // vengono rinomibnati con le versioni Date.now()
      path.basename = interpolateVersion(path.basename+path.extname, '.min.');
      path.extname = "";
    }))
    .pipe(gulp.dest(clientFolder));
});

//task che serve per costruire il template per django con riferimento ai
// file minificati versionHash
gulp.task('html:compiletemplate', function(){
  return gulp.src('./src/index.html.template')
    .pipe(replace("{VENDOR_CSS}","vendor."+versionHash+".min.css"))
    .pipe(replace("{APP_CSS}","app."+versionHash+".min.css"))
    .pipe(replace("{TEMPLATE_JS}","template.ext."+versionHash+".min.js"))
    .pipe(replace("{SDK_EXT_JS}","sdk.ext."+versionHash+".min.js"))
    .pipe(replace("{APP_JS}","app."+versionHash+".min.js"))
    .pipe(rename({
      basename: "index",
      extname: ".html"
    }))
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

// funzione che fa partire il sequence run passando argomenti
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

gulp.task('clean', function() {
  return del(['dist/**/*'], {force:true});
});

gulp.task('cleanup', function() {
  return del([conf.clientFolder+"/js/app.js",conf.clientFolder+"/css/app.css"],{force:true})
});

gulp.task('serve', function(done) {
  runSequence('clean','browserify',['assets','watch','plugins','plugins-less-skin'],'browser-sync',
    done);
});

//task che si occupa, in maniera sincrona di
/*
  1 - ripulire folder dist
  2 - settare la variabile production a true
  3 - browserify i file (require)
  4 - legge il file index.html dopo che sono stati elaborati less, fonts etc .. e legget i blocchi build
      concatena e mette come mversione.min.css/js
  5 - scrivere il template per django sostituendo al suffisso .min la versione correnter Date.now().min.css/js
  6 - rimuovere i file app.js e app.css dalla folder client
*/
gulp.task('dist', function(done) {
  runSequence('clean','production','browserify',['html','plugins'],'html:compiletemplate','cleanup',
    done);
});

gulp.task('g3w-admin-plugins',function() {
  gulp.src(distFolder+'/**/js/plugin.js')
    .pipe(rename(function(path){
      var dirname = path.dirname;
      var pluginname = dirname.replace('/js','');
      path.dirname = conf.g3w_admin_plugins_basepath+'/'+pluginname+'/static/'+pluginname+'/js/';
    }))
    .pipe(uglify())
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("."));
});

var client_version = (client != '') ? 'client-'+client : 'client';

gulp.task('g3w-admin-client:clear', function(){
  return del([
    conf.g3w_admin_client_dest_static+'/'+client_version+'/js/*',
    conf.g3w_admin_client_dest_static+'/'+client_version+'/css/*',
    conf.g3w_admin_client_dest_template+'/'+client_version+'/index.html'
  ],{force:true})
});

gulp.task('g3w-admin-client:static',function(){
  gulp.src([clientFolder+'/**/*.*','!'+clientFolder+'/index.html','!'+clientFolder+'/js/app.js','!'+clientFolder+'/css/app.css'])
    .pipe(gulp.dest(conf.g3w_admin_client_dest_static+'/'+client_version+'/'));
});

gulp.task('g3w-admin-client:template',function(){
  gulp.src(clientFolder+'/index.html')
    .pipe(gulp.dest(conf.g3w_admin_client_dest_template+'/'+client_version+'/'));
});

gulp.task('g3w-admin-client',['g3w-admin-client:clear','g3w-admin-client:static','g3w-admin-client:template']);

// task che si occupa di tutta la parte admin, dalla compilazione del sdk, app ai plugins
gulp.task('g3w-admin',function(done){
  runSequence('dist','g3w-admin-plugins','g3w-admin-client', done)
});

gulp.task('default',['serve']); // development

//Karma
