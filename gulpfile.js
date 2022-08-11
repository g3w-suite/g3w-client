const g3w = require('./config');

const path = require('path');
const fs = require('fs');
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
const useref = require('gulp-useref'); // used to parse index.dev.html
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
const browserSync = require('browser-sync');
const httpProxy = require('http-proxy');
const htmlreplace = require('gulp-html-replace');
const concat = require('gulp-concat');
const prompt = require('gulp-prompt');
//add md5
const md5 = require('md5');
//test
const Server = require('karma').Server;
///
const client = argv.client || '';
const client_version = (client !== '') ? 'client-'+client : 'client';
// it used to change build minified js and css to avoid server cache
// every time we deploy a new client version
const versionHash = Date.now();
let production = false;
let g3w_admin = false;
let build_all = true;
let g3w_admin_version = 'dev';

//used to check if change are done on these file without upload new file with no changes
const buildChanges = {
  vendor: {
    js: {
      hash: null,
    },
    css: {
      hash: null
    }
  },
  app: {
    js: {
      hash: null
    },
    css: {
      hash: null
    }
  }
};

// production const to set enviromental variable
function setNODE_ENV() {
  process.env.NODE_ENV = production ? 'production' : 'development';
}

setNODE_ENV();

//Hash version
async function setHashValues(done) {
  const files = {
    js: ['app'],
    css: ['app']
  };
  if (!build_all) set_current_hash_version();
  else {
    files.js.push('vendor');
    files.css.push('vendor');
  }
  for (let type of ['js', 'css']){
    for (let name of  files[type]){
      const originalname = `${g3w.clientFolder}/${type}/${name}.min.${type}`;
      const fileBuffer = await fs.promises.readFile(originalname);
      buildChanges[name][type].hash = md5(fileBuffer);
      fs.renameSync(originalname, `${g3w.clientFolder}/${type}/${name}.${buildChanges[name][type].hash}.min.${type}`)
    }
  }
  done();
}

gulp.task('sethasvalues', function(done){
  setHashValues(done);
});

/**
 * Start to think in vendor
 * @type {{name: string, version: string, description: string, main: string, scripts: {preinstall: string, admin: string, "admin:client": string, plugins: string, default: string, test: string, "cy:open": string}, repository: {type: string, url: string}, author: string, license: string, homepage: string, dependencies: {"shp-write": string, vue: string}, resolutions: {"graceful-fs": string}, devDependencies: {"babel-core": string, "babel-plugin-syntax-async-generators": string, "babel-plugin-syntax-jsx": string, "babel-plugin-transform-array-find": string, "babel-plugin-transform-async-to-generator": string, "babel-plugin-transform-es2015-classes": string, "babel-plugin-transform-object-rest-spread": string, "babel-plugin-transform-remove-strict-mode": string, "babel-plugin-transform-runtime": string, "babel-plugin-transform-vue-jsx": string, "babel-polyfill": string, "babel-preset-env": string, babelify: string, "browser-sync": string, browserify: string, chai: string, "chai-http": string, "current-git-branch": string, cypress: string, del: string, "generator-browserify": string, "generator-karma": string, gulp: string, "gulp-clean-css": string, "gulp-concat": string, "gulp-csso": string, "gulp-filenames": string, "gulp-filter": string, "gulp-flatten": string, "gulp-git": string, "gulp-html-extend": string, "gulp-html-replace": string, "gulp-if": string, "gulp-jshint": string, "gulp-less": string, "gulp-merge": string, "gulp-minify-css": string, "gulp-preprocess": string, "gulp-prompt": string, "gulp-refresh": string, "gulp-rename": string, "gulp-replace": string, "gulp-sourcemaps": string, "gulp-streamify": string, "gulp-uglify": string, "gulp-useref": string, "gulp-watch": string, "http-proxy": string, imgurify: string, inquirer: string, jshint: string, "jshint-stylish": string, karma: string, "karma-browserify": string, "karma-chai": string, "karma-chrome-launcher": string, "karma-cli": string, "karma-mocha": string, "karma-requirejs": string, "karma-sinon": string, less: string, "less-plugin-glob": string, md5: string, mocha: string, "node-lessify": string, preprocess: string, requirejs: string, "run-sequence": string, sinon: string, "stream-array": string, "stream-concat": string, stringify: string, "uglify-js": string, "vinyl-buffer": string, "vinyl-paths": string, "vinyl-source-stream": string, vueify: string, watchify: string, yargs: string}}}
 */
const packageJSON = require('./package.json');
const dependencies = Object.keys(packageJSON && packageJSON.dependencies || {}).filter(dep => dep !== 'vue');

gulp.task('vendor_node_modules_js', function() {
  return browserify()
    .require(dependencies)
    .bundle()
    .pipe(source('vendor.node_modules.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(`${g3w.clientFolder}/js`));
});

gulp.task('concatenate_node_modules_vendor_min', ['vendor_node_modules_js'], function() {
  return gulp.src(`${g3w.clientFolder}/js/vendor.*.js`)
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest(`${g3w.clientFolder}/js/`));
});

gulp.task('clean_vendor_node_modules_min', function() {
  return del([`${g3w.clientFolder}/js/vendor.node_modules.min.js`], {force:true});
});


/**
 * End vendor task
 */

// Browserify Task -- It used to trasform code modularizated in browser compatible way
gulp.task('browserify', [], function() {
  let rebundle;
  let bundler = browserify('./src/app/main.js', {
    basedir: "./",
    paths: ["./src/","./src/app/", "./src/plugins/"],
    debug: !production,
    cache: {},
    packageCache: {}
  });
  if (!production) {
    bundler.on('prebundle', bundle => {
      dependencies.forEach(dep => {
        bundle.external(dep);
        bundle.require(dep);
      });
    });
    bundler = watchify(bundler);
  } else {
    //ignore dev file index
    bundler.ignore('./src/app/dev/index.js');
    //add externalmodule node_modules on vendor
    dependencies.forEach(dep => bundler.external(dep));
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
        del([g3w.clientFolder+'/js/app.js',g3w.clientFolder+'/style/app.css']).then(function(){
          process.exit();
        });
      })
      .pipe(source('build.js'))
      .pipe(buffer())
      .pipe(gulpif(production, replace("{G3W_VERSION}", g3w.version)))
      .pipe(gulpif(production, uglify({
        compress: {
          drop_console: true
        }
      }).on('error', gutil.log)))
      .pipe(rename('app.js'))
      .pipe(gulp.dest(g3w.clientFolder+'/js/'))
  };

  if (!production) {
    rebundle = () => bundle().pipe(browserSync.reload({stream: true}));
    bundler.on('update', rebundle);
  } else rebundle = () => bundle();
  return rebundle();
});


// it used to copy all plugins to g3w-admin plugin folder
gulp.task('plugins', function() {
  return gulp.src(path.join(g3w.pluginsFolder, '/*/plugin.js'))
    .pipe(rename(function(path) {
      path.dirname = g3w.distFolder+'/'+path.dirname+'/js/';
    }))
    .pipe(gulp.dest('.'));
});

// compile less file in css
gulp.task('less',['fonts'], function () {
  const appLessFolder = path.join(g3w.assetsFolder, 'style', 'less');
  const pluginsLessFolder = path.join(g3w.pluginsFolder, '*', 'style', 'less');
  return gulp.src([path.join(appLessFolder, 'app.less'), path.join(pluginsLessFolder, 'plugin.less')])
    .pipe(concat('app.less'))
    .pipe(less({
      paths: [appLessFolder, pluginsLessFolder], // add paths where to search in @import
      plugins: [LessGlob] //plugin to manage globs import es: @import path/***
    }))
    .pipe(gulp.dest(g3w.clientFolder+'/css/'))
});

// compile less file in css
gulp.task('custom-less', function () {
  const customLessFolder = path.join(g3w.assetsFolder, 'style', 'less', 'g3w-skins-custom', process.env.CUSTOM_LESS_FOLDER);
  return gulp.src(path.join(customLessFolder, 'main.less'))
    .pipe(concat('custom.less'))
    .pipe(less({
      plugins: [LessGlob] //plugin to manage globs import es: @import path/***
    }))
    .pipe(gulp.dest(`${customLessFolder}/css/`))
});


gulp.task('fonts', function () {
  return gulp.src([path.join(g3w.assetsFolder, 'fonts/**/*.{eot,ttf,woff,woff2}'), '!./src/libs/**/node_modules/**/',`${g3w.pluginsFolder}/**/*.{eot,ttf,woff,woff2}`])
    .pipe(flatten())
    .pipe(gulp.dest(g3w.clientFolder+'/fonts/'))
});

gulp.task('images', function () {
  return gulp.src([path.join(g3w.assetsFolder,'images/**/*.{png,jpg,gif,svg}'),'!./src/**/node_modules/**/','./src/plugins/**/*.{png,jpg,gif,svg}'])
    .pipe(flatten())
    .pipe(gulp.dest(g3w.clientFolder+'/images/'))
});

gulp.task('datatable-images',function () {
  if (!build_all) return;
  return gulp.src(path.join(g3w.assetsFolder, 'vendors/datatables/DataTables-1.10.16/images/*'))
    .pipe(flatten())
    .pipe(gulp.dest(g3w.clientFolder+'/css/DataTables-1.10.16/images/'))
});

gulp.task('assets',['fonts', 'images', 'less','datatable-images']);

function interpolateVersion(path, separator) {
  const prepost = path.split(separator);
  if (prepost.length !== 2) {
    return path;
  }
  return prepost[0] +"."+ buildChanges[prepost[0]][prepost[1]].hash + separator + prepost[1];
}

// this task create a index.html in src/ and add all external libraries and css to it
gulp.task('html', ['add_external_resources_to_main_html', 'assets'] , function() {
  return gulp.src('./src/index.html')
    .pipe(useref())
    .pipe(gulpif(['css/app.min.css'], cleanCSS({
      keepSpecialComments: 0
    }), replace(/\w+fonts/g, 'fonts')))
    .pipe(gulp.dest(g3w.clientFolder));
});

//task used to build django g3w-admin template with the refercenced of all css and js minified and added versionHash
gulp.task('html:compiletemplate', function() {
  return gulp.src('./src/index.prod.html')
    .pipe(replace("{VENDOR_CSS}","vendor."+buildChanges.vendor.css.hash+".min.css"))
    .pipe(replace("{APP_CSS}","app."+buildChanges.app.css.hash+".min.css"))
    .pipe(replace("{VENDOR_JS}","vendor."+buildChanges.vendor.js.hash+".min.js"))
    .pipe(replace("{APP_JS}","app."+buildChanges.app.js.hash+".min.js"))
    .pipe(rename({
      basename: "index",
      extname: ".html"
    }))
    .pipe(gulp.dest(g3w.clientFolder));
});

const proxy = httpProxy.createProxyServer({
  target: g3w.proxy.url
});

proxy.on('error',function(e){
  gutil.log(e);
});

function proxyMiddleware(urls) {
  return function(req, res, next){
    let doproxy = false;
    let rootUrl;
    if (req.url.indexOf('plugin.js') > -1) rootUrl = req.url;
    else rootUrl = req.url.split('?')[0];
    for (let i in urls) {
      if (rootUrl.indexOf(urls[i]) > -1) {
        doproxy = true;
        break;
      }
    }
    doproxy ? proxy.web(req,res) : next();
  }
}

gulp.task('browser-sync', function() {
  const port = g3w.localServerPort ? g3w.localServerPort : 3000;
  browserSync.init({
    server: {
      baseDir: ["src","."],
      middleware: [proxyMiddleware(g3w.proxy.urls)]
    },
    port,
    open: false,
    startPath: "/",
    socket: {
      domain: `${g3w.host}:${port}`
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
  watch(['./assets/style/**/*.less', g3w.pluginsFolder + '/**/*.less'],
    prepareRunSequence('less','browser:reload')
  );
  watch(['./assets/style/skins/*.less'],
    prepareRunSequence('less:skins','browser:reload')
  );
  watch('./src/**/*.{png,jpg}',
    prepareRunSequence('images','browser:reload')
  );
  watch(`${g3w.pluginsFolder}/**/plugin.js`,
    prepareRunSequence('plugins','browser:reload')
  );
  watch(`${g3w.pluginsFolder}/**/style/less/plugin.less`,
    prepareRunSequence('less','browser:reload')
  );
  watch([path.join(g3w.pluginsFolder,'*', 'index.*.html')],
    prepareRunSequence('add_external_resources_to_main_html','browser:reload')
  );
  watch(path.join('assets', 'vendors', 'index.*.html'),
    prepareRunSequence('add_external_resources_to_main_html','browser:reload')
  );
  gulp.watch(['./src/index.html','./src/**/*.html'], function() {
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
  return del([`${g3w.clientFolder}/js/app.js`,`${g3w.clientFolder}/css/app.css`],{force:true})
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
  if (build_all) runSequence('clean','production','browserify','html', 'concatenate_node_modules_vendor_min', 'clean_vendor_node_modules_min', 'sethasvalues','html:compiletemplate','cleanup', done);
  else runSequence('clean','production','browserify','html', 'sethasvalues','html:compiletemplate','cleanup', done);
});

gulp.task('g3w-admin-plugins',function() {
  gulp.src(`${g3w.distFolder}/**/js/plugin.js`)
    .pipe(rename(function(path){
      const dirname = path.dirname;
      const pluginname = dirname.replace('/js','');
      path.dirname = `${g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_plugins_basepath}/${pluginname}/static/${pluginname}/js/`;
    }))
    .pipe(gulp.dest("."));
});

gulp.task('copy-and-select-plugins', function(done) {
  runSequence('plugins', 'select-plugins', done)
});

gulp.task('select-plugins', function() {
  const plugins = fs.readdirSync(g3w.distFolder).filter(file => {
    //exclude from list client and all template plugin
    return (file !== 'client' && file.indexOf('template_') === -1) && fs.statSync(g3w.distFolder+'/'+file).isDirectory();
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
    const sources = pluginNames.map(pluginName => `${g3w.distFolder}/${pluginName}*/js/plugin.js`);
    return gulp.src(sources)
      .pipe(rename(function(path){
        const dirname = path.dirname;
        const pluginname = dirname.replace('/js','');
        path.dirname = g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_plugins_basepath+'/'+pluginname+'/static/'+pluginname+'/js/';
      }))
      .pipe(gulp.dest("."));
  }
});

function set_current_hash_version() {
  ['js', 'css'].forEach(folder => {
    fs.readdirSync(`${g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static}/${client_version}/${folder}`).filter(file => {
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
    g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/js/*',
    g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/css/*',
    g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_template+'/'+client_version+'/index.html'
  ]: [
    g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/js/app.*',
    g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_static+'/'+client_version+'/css/app.*',
    g3w.g3w_admin_paths[g3w_admin_version].g3w_admin_client_dest_template+'/'+client_version+'/index.html'
  ];
  return del(del_files, {
    force: true
  })
});

gulp.task('g3w-admin-client:static',function(){
  gulp.src([`${g3w.clientFolder}/**/*.*`,`!${g3w.clientFolder}/index.html`,`!${g3w.clientFolder}/js/app.js`,`!${g3w.clientFolder}/css/app.css`])
    .pipe(gulp.dest(`${g3w.g3w_admin_paths['dev'].g3w_admin_client_dest_static}/${client_version}/`));

});

gulp.task('g3w-admin-client:template',function(){
  gulp.src(g3w.clientFolder+'/index.html')
    .pipe(gulp.dest(g3w.g3w_admin_paths['dev'].g3w_admin_client_dest_template+'/'+client_version+'/'));
});

gulp.task('g3w-admin-client_test',['g3w-admin-client:static','g3w-admin-client:template', 'g3w-admin-client:check_client_version']);

gulp.task('g3w-admin-client',['g3w-admin-client:clear','g3w-admin-client:static','g3w-admin-client:template']);

// task used to create g3w-admin files. It start from compile sdk source folder, app source folder and all plugins
gulp.task('g3w-admin',function(done){
  g3w_admin = true;
  runSequence('dist','g3w-admin-client', 'g3w-admin-plugins-select', done)
});

gulp.task('set_build_all_to_false', function() {
  build_all = false;
});

gulp.task('g3w-admin:client_only',['set_build_all_to_false', 'g3w-admin']);

// this is useful create external assest css and javascript libraries
gulp.task('add_external_resources_to_main_html',  function() {
  const srcFolder = './src';
  if (build_all) {
    const indexCss = 'index.css.html';
    const indexJs = 'index.js.html';
    const replaceRelativeAssetsFolderFolder =  path.relative(path.resolve(srcFolder), path.resolve(g3w.assetsFolder))  + '/' ;
    return gulp.src(srcFolder + '/index.dev.html')
      // replace css and js sources
      .pipe(htmlreplace({
        'app_vendor_css': gulp.src(path.join(g3w.assetsFolder, 'vendors', indexCss)).pipe(replace('./',replaceRelativeAssetsFolderFolder)),
        'app_vendor_js': gulp.src(path.join(g3w.assetsFolder, 'vendors', indexJs)).pipe(replace('./', replaceRelativeAssetsFolderFolder)),
        'plugins_css': gulp.src(path.join(g3w.pluginsFolder, '*',indexCss))
          .pipe(replace('./', function() {
            const pluginName = path.dirname(this.file.relative);
            return path.relative(path.resolve(srcFolder), path.resolve(path.join(g3w.pluginsFolder, pluginName)))  + '/' ;
          })),
        'plugins_js': gulp.src(path.join(g3w.pluginsFolder, '*',indexJs))
          .pipe(replace('./', function() {
            const pluginName = path.dirname(this.file.relative);
            return path.relative(path.resolve(srcFolder), path.resolve(path.join(g3w.pluginsFolder, pluginName)))  + '/' ;
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

/**
 * Run test once and exit
 */
gulp.task('test', async (done) =>  {
  const testPath = `${__dirname}${g3w.test.path}`;
  const testGroupFolders = fs.readdirSync(testPath).filter(file => {
    return file !== 'group_template' && fs.statSync(testPath+'/'+file).isDirectory();
  });
  for (let i=0; i< testGroupFolders.length; i++) {
    const configFile = `${testPath}${testGroupFolders[i]}/karma.config.js`;
    const promise = new Promise((resolve)=>{
      new Server({
        configFile,
        singleRun: true
      }, ()=>{resolve()}).start();
    });
    await promise;
  }
  done
});

gulp.task('default',['add_external_resources_to_main_html','serve']); // development task - Deafult

/**
 * Expose version of "package.json" without including whole file in published bundle,
 * this happens because each ESM `import` is actually transformed into a CJS `require()`
 * (NB: native ESM modules will not suffer of this security issue due to tree shaking)
 *
 * @see https://github.com/g3w-suite/g3w-client/issues/
 * @see src\app\constant::APP_VERSION
 * @see src\app\version
 */
gulp.task('version', function () {
  var pkg = require('./package.json');
  var fs = require('fs');
  fs.writeFileSync('src/version.js', `/* WARNING: this file is autogenerated by gulpfile.js, please do not edit manually */\n\nexport default '${pkg.version}';`);
});