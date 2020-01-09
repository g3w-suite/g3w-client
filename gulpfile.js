const conf = require('./config');
const path = require('path');
const fs = require('fs');
const del = require('del');
//Gulp
const gulp   = require('gulp');
///
//utility to work with git
const git = require('gulp-git');

const argv = require('yargs').argv;
const runSequence = require('run-sequence');
const rename = require('gulp-rename');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const flatten = require('gulp-flatten');
// userref it used to parse build block of the template
const useref = require('gulp-useref');
///////////////////////////////////////////////////////
const replace = require('gulp-replace');
const gulpif = require('gulp-if');
const uglify = require('gulp-uglify');
const watch = require('gulp-watch');
const cleanCSS = require('gulp-clean-css');
const gutil = require("gulp-util");
const less = require('gulp-less');
const LessGlob = require('less-plugin-glob');
const browserify = require('browserify');
const babelify = require('babelify');
const imgurify = require('imgurify');
const vueify = require('vueify');
const watchify = require('watchify');
const stringify = require('stringify');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync');
const httpProxy = require('http-proxy');
const htmlreplace = require('gulp-html-replace');
const concat = require('gulp-concat');
const prompt = require('gulp-prompt');
const KarmaServer = require('karma').Server;
const templateFolder = conf.templateFolder;
const sdkFolder = conf.sdkFolder;
const pluginsFolder = conf.pluginsFolder;
const distFolder = conf.distFolder;
const clientFolder = conf.clientFolder;
const client = argv.client || '';
const DEPENDENCY_REPO_PATH = ['./src/app/template', './src/libs/sdk'];

// it used to change build minified js and css to avoid server cache
// every time we deploy a new client version
const versionHash = Date.now();
const DEPLOY_FILENAME_INFO = `./deploy/${versionHash}.txt`;
let production = false;
let g3w_admin = false;
let build_all = true;
let g3w_admin_version = 'py2';
//used to check if change are done on these file without upload new file with no changes
const buildChanges = {
  vendor: {
    js: {
      changed: false,
      hash: versionHash,
    },
    css: {
      changed: false,
      hash: versionHash
    }
  },
  app: {
    js: {
      changed: false,
      hash: versionHash
    },
    css: {
      changed: false,
      hash: versionHash
    }
  }
};

// function to ge information from repopath
function writeRepoInfo(repopath, filename) {
  filename = filename || DEPLOY_FILENAME_INFO;
  const repoName = repopath.split('/').pop();
  let currentCommit;
  let currentBranch;
  git.exec({
    args: 'log -1 --format="%H"',
    cwd: repopath
  }, (err, stdout) => {
    currentCommit = stdout.trim();
    git.exec({
      args: 'rev-parse --abbrev-ref HEAD',
      cwd: repopath
    }, (err, stdout) =>{
      currentBranch = stdout.trim();
      const content = `${repoName}: BRANCH: ${currentBranch} COMMIT: ${currentCommit}\n`;
      fs.appendFile(filename, content , function (err) {
        if (err) throw err;
      });
    });
  });
}


// production const to set enviromental variable
function setNODE_ENV() {
  process.env.NODE_ENV = production ? 'production' : 'development';
}

setNODE_ENV();

gulp.task('g3w_admin_python3', function(){
  g3w_admin_version = 'py3';
});

// Broserify Task -- It used to trasform code modularizated in browser compatible way
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
  // trasformation
  bundler.transform(vueify)
    .transform(babelify, {
    babelrc: true
  }).transform(stringify, {
    appliesTo: { includeExtensions: ['.html', '.xml'] }
  }).transform(imgurify);

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
      .pipe(gulpif(production, uglify({
        compress: {
          drop_console: true
        }
      }).on('error', gutil.log)))
      .pipe(rename('app.js'))
      .pipe(gulpif(!production, sourcemaps.write('./')))
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

gulp.task('sdk-template-deploy-info', function(){
  DEPENDENCY_REPO_PATH.forEach((repopath)=> {
    writeRepoInfo(repopath)
  });
});

// it used to copy all plugins to g3w-admin plugin folder
gulp.task('plugins', function() {
  return gulp.src(path.join(pluginsFolder, '/*/plugin.js'))
    .pipe(rename(function(path) {
      path.dirname = distFolder+'/'+path.dirname+'/js/';
    }))
    .pipe(gulp.dest('.'));
});

// compile less file in css
gulp.task('less',['fonts'], function () {
  const templateLessFolder = path.join(templateFolder, 'style', 'less');
  const pluginsLessFolder = path.join(pluginsFolder, '*', 'style', 'less');
  return gulp.src([path.join(templateLessFolder, 'app.less'), path.join(pluginsLessFolder, 'plugin.less')])
    .pipe(concat('app.less'))
    .pipe(less({
      paths: [templateLessFolder, pluginsLessFolder], // add paths where to search in @import
      plugins: [LessGlob] //plugin to manage globs import es: @import path/***
    }))
    .pipe(gulp.dest(clientFolder+'/css/'))
});


gulp.task('fonts', function () {
  return gulp.src(['!./src/libs/**/node_modules/**/','./src/libs/**/*.{eot,ttf,woff,woff2}','./third-party/**/*.{eot,ttf,woff,woff2}','./src/**/*.{eot,ttf,woff,woff2}'])
    .pipe(flatten())
    .pipe(gulp.dest(clientFolder+'/fonts/'))
});

gulp.task('images', function () {
  return gulp.src(['!./src/libs/**/node_modules/**/', './src/app/images/**/*.{png,jpg,gif,svg}','./src/libs/**/*.{png,jpg,gif,svg}', './src/app/template/images/**/*.{png,jpg,gif,svg}'])
    .pipe(flatten())
    .pipe(gulp.dest(clientFolder+'/images/'))
});

gulp.task('datatable-images',function () {
  if (!build_all) return;
  return gulp.src(path.join(sdkFolder, '/ext/datatables/DataTables-1.10.16/images/*'))
    .pipe(flatten())
    .pipe(gulp.dest(clientFolder+'/css/DataTables-1.10.16/images/'))
});

gulp.task('assets',['fonts', 'images', 'less','datatable-images']);

function interpolateVersion(path, separator) {
  const prepost = path.split(separator);
  if (prepost.length !== 2) {
    return path;
  }
  return prepost[0] +"."+ versionHash + separator + prepost[1];
}

// this task create a index.html in src/ and add all external libraries and css to it
gulp.task('html', ['add_external_resources_to_main_html', 'assets'], function() {
  return gulp.src('./src/index.html')
    .pipe(useref())
    .pipe(gulpif(['css/app.min.css'], cleanCSS({
      keepSpecialComments: 0
    }), replace(/\w+fonts/g, 'fonts')))
    .pipe(rename(function(path) {
      // renamed with version Date.now()
      path.basename = interpolateVersion(path.basename+path.extname, '.min.');
      path.extname = "";
    }))
    .pipe(gulp.dest(clientFolder));
});

//task used to build django g3w-admin template with the refercenced of all css and js minified and added versionHash
gulp.task('html:compiletemplate', function() {
  !build_all && set_current_hash_version();
  return gulp.src('./src/index.html.admin.template')
    .pipe(replace("{VENDOR_CSS}","vendor."+buildChanges.vendor.css.hash+".min.css"))
    .pipe(replace("{APP_CSS}","app."+buildChanges.app.css.hash+".min.css"))
    .pipe(replace("{VENDOR_JS}","vendor."+buildChanges.vendor.js.hash+".min.js"))
    .pipe(replace("{APP_JS}","app."+buildChanges.app.js.hash+".min.js"))
    .pipe(rename({
      basename: "index",
      extname: ".html"
    }))
    .pipe(gulp.dest(clientFolder));
});

const proxy = httpProxy.createProxyServer({
  target: conf.proxy.url
});

proxy.on('error',function(e){
  gutil.log(e);
});

function proxyMiddleware(urls) {
  return function(req, res, next){
    let doproxy = false;
    let rootUrl;
    if (req.url.indexOf('plugin.js') > -1) {
      rootUrl = req.url;
    } else
      rootUrl = req.url.split('?')[0];
    for (let i in urls) {
      if (rootUrl.indexOf(urls[i]) > -1) {
        doproxy = true;
        break;
      }
    }
    if (doproxy){
      proxy.web(req,res);
    }
    else {
      next();
    }
  }
}

gulp.task('browser-sync', function() {
  const port = conf.localServerPort ? conf.localServerPort : 3000;
  browserSync.init({
    server: {
      baseDir: ["src","."],
      middleware: [proxyMiddleware(conf.proxy.urls)]
    },
    port: port,
    open: false,
    startPath: "/",
    socket: {
      domain: `${conf.host}:${port}`
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
  const _arguments = arguments;
  return function() {
    runSequence.apply(null,_arguments);
  }
}

// watch applications changes
gulp.task('watch',function() {
  watch(['./src/app/style/*.less', templateFolder+'/style/**/*.less', pluginsFolder + '/**/*.less'],
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
  watch('./src/libs/plugins/**/style/less/plugin.less',
    prepareRunSequence('less','browser:reload')
  );
  watch([path.join(pluginsFolder,'*', 'index.*.html'), path.join(templateFolder,'*.*.html'), path.join(sdkFolder,'*.*.html')],
    prepareRunSequence('add_external_resources_to_main_html','browser:reload')
  );
  gulp.watch(['./src/index.html','./src/**/*.html', templateFolder + '/**/**.html', sdkFolder + '/**/*.html'], function() {
    browserSync.reload();
  });
});

gulp.task('production', function(){
  production = true;
  setNODE_ENV();
});

gulp.task('production-bundle',['production','browserify']);

gulp.task('clean', function() {
  return del(['dist/**/*'], {force:true});
});

gulp.task('cleanup', function() {
  return del([conf.clientFolder+"/js/app.js",conf.clientFolder+"/css/app.css"],{force:true})
});

gulp.task('serve', function(done) {
  runSequence('clean','browserify',['assets','watch','plugins'],'browser-sync', done);
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
  runSequence('clean','production','browserify',['html'],'html:compiletemplate','cleanup',
    done);
});

gulp.task('g3w-admin-plugins',function() {
  gulp.src(distFolder+'/**/js/plugin.js')
    .pipe(rename(function(path){
      const dirname = path.dirname;
      const pluginname = dirname.replace('/js','');
      path.dirname = conf.g3w_admin_paths[g3w_admin_version].g3w_admin_plugins_basepath+'/'+pluginname+'/static/'+pluginname+'/js/';
    }))
    .pipe(gulp.dest("."));
});

gulp.task('copy-and-select-plugins', function(done) {
  runSequence('plugins', 'select-plugins', done)
});

gulp.task('select-plugins', function() {
  const plugins = fs.readdirSync(distFolder).filter((file) => {
    return file !== 'client' && fs.statSync(distFolder+'/'+file).isDirectory();
  });
  return gulp.src('./package.json')
    .pipe(prompt.prompt({
        type: 'checkbox',
        name: 'plugins',
        message: 'Plugins',
        choices: plugins
      }, function(response) {
        process.env.G3W_PLUGINS = response.plugins;
      })
    )
});

gulp.task('g3w-admin-plugins-select', ['copy-and-select-plugins'], function(done) {
  const pluginNames = process.env.G3W_PLUGINS.split(',');
  if (pluginNames.length === 1 && pluginNames[0] === '') {
    console.log('No plugin selected');
    done();
  } else  {
    fs.appendFile(DEPLOY_FILENAME_INFO, 'PLUGINS: \n' , function (err) {
      if (err) console.log(err)
    });
    const sources = pluginNames.map(pluginName => `${distFolder}/${pluginName}*/js/plugin.js`);
    return gulp.src(sources)
      .pipe(rename(function(path){
        const dirname = path.dirname;
        const pluginname = dirname.replace('/js','');
        writeRepoInfo(`${pluginsFolder}/${pluginname}`);
        path.dirname = conf.g3w_admin_paths[g3w_admin_version].g3w_admin_plugins_basepath+'/'+pluginname+'/static/'+pluginname+'/js/';
      }))
      .pipe(gulp.dest("."));
  }
});

const client_version = (client !== '') ? 'client-'+client : 'client';

function set_current_hash_version() {
  ['js', 'css'].forEach(folder => {
    fs.readdirSync(`${conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static}/${client_version}/${folder}`).filter((file) => {
      //exclude datatable
      if (file.indexOf('DataTables-') === -1 && file.indexOf('vendor') !== -1) {
        const hash = file.split('.')[1];
        buildChanges.vendor[folder].hash = hash;
      }
    })
  });
}

gulp.task('g3w-admin-client:clear', function() {
  const del_files = build_all ? [
    conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/js/*',
    conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/css/*',
    conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_template+'/'+client_version+'/index.html'
  ]: [
    conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/js/app.*',
    conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/css/app.*',
    conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_template+'/'+client_version+'/index.html'

  ];
  return del(del_files, {
    force: true
  })
});

gulp.task('g3w-admin-client:static',function(){
  gulp.src([clientFolder+'/**/*.*','!'+clientFolder+'/index.html','!'+clientFolder+'/js/app.js','!'+clientFolder+'/css/app.css'])
    .pipe(gulp.dest(conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/'));
});

gulp.task('g3w-admin-client:template',function(){
  gulp.src(clientFolder+'/index.html')
    .pipe(gulp.dest(conf.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_template+'/'+client_version+'/'));
});

gulp.task('g3w-admin-client_test',['g3w-admin-client:static','g3w-admin-client:template', 'g3w-admin-client:check_client_version']);


gulp.task('g3w-admin-client',['g3w-admin-client:clear','g3w-admin-client:static','g3w-admin-client:template']);

// task used to create g3w-admin files. It start from compile sdk source folder, app source folder and all plugins
gulp.task('g3w-admin',function(done){
  g3w_admin = true;
  runSequence('dist', 'sdk-template-deploy-info','g3w-admin-client', 'g3w-admin-plugins-select', done)
});

gulp.task('g3w-admin-py3',function(done){
  g3w_admin = true;
  runSequence('g3w_admin_python3', 'dist', 'sdk-template-deploy-info','g3w-admin-client', 'g3w-admin-plugins-select', done)
});

gulp.task('set_build_all_to_false', function() {
  build_all = false;
});

//python2
gulp.task('g3w-admin:client_only', ['set_build_all_to_false', 'g3w-admin']);
//python3
gulp.task('g3w-admin-py3:client_only',['g3w_admin_python3', 'set_build_all_to_false', 'g3w-admin']);

// this is useful o pre creare
gulp.task('add_external_resources_to_main_html',  function() {
  const srcFolder = './src';
  if (build_all) {
    const indexCss = 'index.css.html';
    const indexJs = 'index.js.html';
    const replaceRelativeTemplateFolder =  path.relative(path.resolve(srcFolder), path.resolve(templateFolder))  + '/' ;
    const replaceRelativeSdkFolder =  path.relative(path.resolve(srcFolder), path.resolve(sdkFolder)) + '/';
    return gulp.src(srcFolder + '/index.html.template')
    // replace css and js sources
      .pipe(htmlreplace({
        'template_vendor_css': gulp.src(path.join(templateFolder, indexCss)).pipe(replace('./',replaceRelativeTemplateFolder)),
        'template_vendor_js': gulp.src(path.join(templateFolder, indexJs)).pipe(replace('./', replaceRelativeTemplateFolder)),
        'sdk_vendor_css': gulp.src(path.join(sdkFolder , indexCss)).pipe(replace('./', replaceRelativeSdkFolder)),
        'sdk_vendor_js': gulp.src(path.join(sdkFolder, indexJs)).pipe(replace('./', replaceRelativeSdkFolder)),
        'plugins_css': gulp.src(path.join(pluginsFolder, '*','index.css.html'))
          .pipe(replace('./', function() {
            const pluginName = path.dirname(this.file.relative);
            return path.relative(path.resolve(srcFolder), path.resolve(path.join(pluginsFolder, pluginName)))  + '/' ;
          })),
        'plugins_js': gulp.src(path.join(pluginsFolder, '*','index.js.html'))
          .pipe(replace('./', function() {
            const pluginName = path.dirname(this.file.relative);
            return path.relative(path.resolve(srcFolder), path.resolve(path.join(pluginsFolder, pluginName)))  + '/' ;
          }))
      }))
      .pipe(rename('index.html'))
      .pipe(gulp.dest(srcFolder));
  } else {
    return gulp.src(srcFolder + '/index.html.template')
      .pipe(rename('index.html'))
      .pipe(gulp.dest(srcFolder));
  }

});

gulp.task('test', function() {

});

gulp.task('test-plugins', function(done) {
  new KarmaServer({
    configFile: `${__dirname}/test/config/karma.plugins.config.js`,
    singleRun: true
  }, done).start();
});

gulp.task('test-plugin', function() {

});

gulp.task('default',['add_external_resources_to_main_html','serve']); // development task - Deafult
gulp.task('default-hot',['add_external_resources_to_main_html', 'serve-hot']); // development task Hot Module- Deafult

