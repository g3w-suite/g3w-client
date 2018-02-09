const conf = require('./config');
const path = require('path');
const del = require('del');
//Gulp
const gulp   = require('gulp');
///
const argv = require('yargs').argv;
const runSequence = require('run-sequence');
const rename = require('gulp-rename');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const flatten = require('gulp-flatten');
// userref server per parsare i build block del template
const useref = require('gulp-useref');
///////////////////////////////////////////////////////
const replace = require('gulp-replace');
const gulpif = require('gulp-if');
const uglify = require('gulp-uglify');
const watch = require('gulp-watch');
const cleanCSS = require('gulp-clean-css');
const gutil = require("gulp-util");
const less = require('gulp-less');
const jshint = require('gulp-jshint');
const browserify = require('browserify');
const babelify = require('babelify');
const imgurify = require('imgurify');
const vueify = require('vueify');
const watchify = require('watchify');
const stringify = require('stringify');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync');
const httpProxy = require('http-proxy');


const distFolder = conf.distFolder;
const clientFolder = conf.clientFolder;
const client = argv.client || '';

// it used to change build minified js and css to avoid server cache
// every time we deploy a new client version
const versionHash = Date.now();

// production const to set enviromental variable
let production = false;



gulp.task('browserify', [], function() {
  let rebundle;
  let bundler = browserify('./src/app/index.js', {
    basedir: "./",
    paths: ["./src/app/", "./src/libs/", "./src/libs/sdk/"],
    debug: !production,
    cache: {},
    packageCache: {}
  });
  if (!production) {
    bundler = watchify(bundler);
  }
  bundler.transform(vueify)
    .transform(babelify, {
    babelrc: true
  }).transform(stringify, {
    appliesTo: { includeExtensions: ['.html'] }
  }).transform(imgurify)

  const bundle = function() {
    return bundler.bundle()
      .on('error', function(err){
        console.log(err);
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

// it used to copy all plugins to g3w-admin plugin folder
gulp.task('plugins', function() {
  return gulp.src('./src/libs/plugins/**/plugin.js')
    .pipe(rename(function(path) {
      path.dirname = distFolder+'/'+path.dirname+'/js/';
    }))
    .pipe(gulp.dest('.'));
});

// it use to lessisfy less file
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

gulp.task('html', ['assets'], function () {
  // get index.html to read all block build:
  return gulp.src('./src/index.html')
  // concat all build blocks inside index.html template es: <!-- build:js js/sdk.ext.min.js -->
    .pipe(useref())
    .pipe(gulpif(['css/app.min.css'],cleanCSS({
      keepSpecialComments: 0
    })))
    .pipe(rename(function(path) {
      // renamed with version Date.now()
      path.basename = interpolateVersion(path.basename+path.extname, '.min.');
      path.extname = "";
    }))
    .pipe(gulp.dest(clientFolder));
});

//task used to build django g3w-admin template with the refercenced of all css and js minifiged and added versionHash
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
  var port = conf.localServerPort ? conf.localServerPort : 3000
  browserSync.init({
    server: {
      baseDir: ["src","."],
      middleware: [proxyMiddleware(conf.proxy.urls)]
    },
    port: port,
    open: false,
    startPath: "/",
    socket: {
      domain: "http://localhost:" + port
    }
  });
});

gulp.task('browser:reload',function(){
  if (browserSync) {
    browserSync.reload()
  }
});

// run sequence function. It expect some arguments
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

//dist task: it used to synchronize the following tasks:
/*
  1 - clean dist folder
  2 - set production variable to true
  3 - browserify all files (require)
  4 - read index.html after compiled less, fonts etc .. and read build blocks
      concatenate e insert <version>.min.css/js version
  5 - write django g3w-admin template subtitude suffix .min with current version
  6 - Remove app.js and app.css from g3w-admin client folder
*/
gulp.task('dist', function(done) {
  runSequence('clean','production','browserify',['html','plugins'],'html:compiletemplate','cleanup',
    done);
});

gulp.task('g3w-admin-plugins',function() {
  gulp.src(distFolder+'/**/js/plugin.js')
    .pipe(rename(function(path){
      const dirname = path.dirname;
      const pluginname = dirname.replace('/js','');
      path.dirname = conf.g3w_admin_plugins_basepath+'/'+pluginname+'/static/'+pluginname+'/js/';
    }))
    .pipe(uglify())
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("."));
});

const client_version = (client != '') ? 'client-'+client : 'client';

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

// task used to create g3w-admin files. It start from compile sdk source folder, app source folder and all plugins
gulp.task('g3w-admin',function(done){
  runSequence('dist','g3w-admin-plugins','g3w-admin-client', done)
});

gulp.task('default',['serve']); // development task - Deafult

