const packageJSON = require('./package.json');
const g3w         = require('./config');

// Gulp
const gulp        = require('gulp');
const cleanCSS    = require('gulp-clean-css');
const concat      = require('gulp-concat');
const flatten     = require('gulp-flatten');
const htmlreplace = require('gulp-html-replace');
const gulpif      = require('gulp-if');
const less        = require('gulp-less');
const prompt      = require('gulp-prompt');
const rename      = require('gulp-rename');
const replace     = require('gulp-replace');
const uglify      = require('gulp-uglify');
const gutil       = require('gulp-util');
const useref      = require('gulp-useref'); // used to parse build block of the template

const buffer      = require('vinyl-buffer');
const source      = require('vinyl-source-stream');

const del         = require('del');
const fs          = require('fs');
const md5         = require('md5');
const path        = require('path');

///////////////////////////////////////////////////////
const babelify    = require('babelify');
const browserSync = require('browser-sync');
const browserify  = require('browserify');
const httpProxy   = require('http-proxy');
const karma       = require('karma');
const imgurify    = require('imgurify');
const LessGlob    = require('less-plugin-glob');
const stringify   = require('stringify');
const vueify      = require('vueify');
const watchify    = require('watchify');

// TODO: make use of "process.env" instead of setting local variables
let production = false;
let build_all = true;

// used to check if changes are done on these files without upload new file with no changes
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

// Retrieve project dependencies ("g3w-client")
const dependencies = Object.keys(packageJSON.dependencies).filter(dep => dep !== 'vue');

// production const to set enviromental variable
function setNODE_ENV() {
  process.env.NODE_ENV = production ? 'production' : 'development';
}

setNODE_ENV();

gulp.task('clean',           () => del(['dist/**/*'], { force:true }));
gulp.task('clean_vendor_js', () => del([`${g3w.clientFolder}/js/vendor.node_modules.min.js`], {force:true}));
gulp.task('cleanup',         () => del([`${g3w.clientFolder}/js/app.js`, `${g3w.clientFolder}/css/app.css`], { force:true }));

/**
 * Build minified hashed versions of js and css files in order to avoid server cache
 */
gulp.task('sethasvalues', async function(done) {
  const static = `${g3w.admin_static_folder}/client`;
  const files = {
    js: ['app'],
    css: ['app']
  };
  if (build_all) {
    files.js.push('vendor');
    files.css.push('vendor');
  } else {
    // set_current_hash_version
    ['js', 'css'].forEach(folder => {
      fs.readdirSync(`${static}/${folder}`).filter(file => {
        // exclude datatable
        if (file.indexOf('DataTables-') === -1 && file.indexOf('vendor') !== -1) {
          const hash = file.split('.')[1];
          buildChanges.vendor[folder].hash = hash;
        }
      })
    });
  }
  // generate md5 hash
  for (let type of ['js', 'css']) {
    for (let name of files[type]) {
      const originalname = `${g3w.clientFolder}/${type}/${name}.min.${type}`;
      const fileBuffer = await fs.promises.readFile(originalname);
      buildChanges[name][type].hash = md5(fileBuffer);
      fs.renameSync(originalname, `${g3w.clientFolder}/${type}/${name}.${buildChanges[name][type].hash}.min.${type}`)
    }
  }
  done();
});

gulp.task('browserify_vendor_js', function() {
  return browserify()
    .require(dependencies)
    .bundle()
    .pipe(source('vendor.node_modules.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(`${g3w.clientFolder}/js`));
});

gulp.task('concatenate_vendor_js', gulp.series('browserify_vendor_js', function() {
  return gulp.src(`${g3w.clientFolder}/js/vendor.*.js`)
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest(`${g3w.clientFolder}/js/`));
}));

/**
 * Trasform modularized code in a browser compatible way
 */
gulp.task('browserify', function(done) {
  let rebundle;
  let bundler = browserify('./src/app/main.js', {
    basedir: './',
    paths: ['./src/', './src/app/', './src/plugins/'],
    debug: !production,
    cache: {},
    packageCache: {}
  });
  if (production) {
    // ignore dev file index
    bundler.ignore('./src/app/dev/index.js');
    // add externalmodule node_modules on vendor
    dependencies.forEach(dep => bundler.external(dep));
  } else {
    bundler.on('prebundle', bundle => {
      dependencies.forEach(dep => {
        bundle.external(dep);
        bundle.require(dep);
      });
    });
    bundler = watchify(bundler);
  }

  // trasformation
  bundler
    .transform(vueify)
    .transform(babelify, { global: true, /*babelrc: true*/ })
    .transform(stringify, { appliesTo: { includeExtensions: ['.html', '.xml'] }})
    .transform(imgurify);

  const bundle = function() {
    return bundler.bundle()
      .on('error', function(err) {
        console.log(err);
        this.emit('end');
        del([
          g3w.clientFolder + '/js/app.js',
          g3w.clientFolder + '/style/app.css'
        ]).then(function() {
          process.exit();
        });
      })
      .pipe(source('build.js'))
      .pipe(buffer())
      .pipe(gulpif(production, replace('{G3W_VERSION}', g3w.version)))
      .pipe(gulpif(production, uglify({ compress: { drop_console: true }}).on('error', gutil.log)))
      .pipe(rename('app.js'))
      .pipe(gulp.dest(g3w.clientFolder + '/js/'))
  };

  if (production) {
    rebundle = () => bundle();
  } else {
    rebundle = () => bundle().pipe(browserSync.reload({ stream: true }));
    bundler.on('update', rebundle);    
  }
  return rebundle();
});

/**
 * Copy all plugins to g3w-admin's plugin folder
 */
gulp.task('plugins', function() {
  return gulp.src(path.join(g3w.pluginsFolder, '/*/plugin.js'))
    .pipe(rename((path) => { path.dirname = g3w.distFolder + '/' + path.dirname + '/js/'; }))
    .pipe(gulp.dest('.'));
});

gulp.task('fonts', function () {
  return gulp.src([
      path.join(g3w.assetsFolder, 'fonts/**/*.{eot,ttf,woff,woff2}'),
      '!./src/libs/**/node_modules/**/',
      `${g3w.pluginsFolder}/**/*.{eot,ttf,woff,woff2}`
    ])
    .pipe(flatten())
    .pipe(gulp.dest(g3w.clientFolder + '/fonts/'))
});

gulp.task('images', function () {
  return gulp.src([
      path.join(g3w.assetsFolder, 'images/**/*.{png,jpg,gif,svg}'),
      '!./src/**/node_modules/**/',
      `${g3w.pluginsFolder}/**/*.{png,jpg,gif,svg}`
    ])
    .pipe(flatten())
    .pipe(gulp.dest(g3w.clientFolder + '/images/'))
});

/**
 * Compile less file in css
 */
gulp.task('less', gulp.series('fonts', function() {
  const appLessFolder = path.join(g3w.assetsFolder, 'style', 'less');
  const pluginsLessFolder = path.join(g3w.pluginsFolder, '*', 'style', 'less');
  return gulp.src([
      path.join(appLessFolder, 'app.less'),
      path.join(pluginsLessFolder, 'plugin.less')
    ])
    .pipe(concat('app.less'))
    .pipe(less({
      paths: [appLessFolder, pluginsLessFolder], // add paths where to search in @import
      plugins: [LessGlob] //plugin to manage globs import es: @import path/***
    }))
    .pipe(gulp.dest(g3w.clientFolder + '/css/'))
}));

gulp.task('datatable-images', function () {
  if (build_all) {
    return gulp.src(
        path.join(g3w.assetsFolder, 'vendors/datatables/DataTables-1.10.16/images/*')
      )
      .pipe(flatten())
      .pipe(gulp.dest(g3w.clientFolder + '/css/DataTables-1.10.16/images/'));
  }
});

gulp.task('assets', gulp.series('fonts', 'images', 'less', 'datatable-images'));

/**
 * Create external assets (css and javascript libraries) referenced within main html
 */
 gulp.task('build_external_assets',  function() {
  if (build_all) {
    const replaceRelativeAssetsFolder =  path.relative(path.resolve('./src'), path.resolve(g3w.assetsFolder))  + '/' ;
    const replaceRelativePluginFolder = function() {
      const pluginName = path.dirname(this.file.relative);
      return path.relative(path.resolve('./src'), path.resolve(path.join(g3w.pluginsFolder, pluginName)))  + '/' ;
    };
    return gulp.src('./src/index.html.template')
      // replace css and js sources
      .pipe(htmlreplace({
        'app_vendor_css':
            gulp.src(path.join(g3w.assetsFolder, 'vendors', 'index.css.html'))
              .pipe(replace('./', replaceRelativeAssetsFolder)),
        'app_vendor_js':
            gulp.src(path.join(g3w.assetsFolder, 'vendors', 'index.js.html'))
              .pipe(replace('./', replaceRelativeAssetsFolder)),
        'plugins_css':
            gulp.src(path.join(g3w.pluginsFolder, '*', 'index.css.html'))
              .pipe(replace('./', replaceRelativePluginFolder)),
        'plugins_js':
            gulp.src(path.join(g3w.pluginsFolder, '*', 'index.js.html'))
              .pipe(replace('./', replaceRelativePluginFolder))
      }))
      .pipe(rename('index.html'))
      .pipe(gulp.dest('./src'));
  } else {
    return gulp.src('./src/index.html.template')
      .pipe(rename('index.html'))
      .pipe(gulp.dest('./src'));
  }

});

/**
 * Create a index.html in src/ and add all external libraries and css to it
 */
gulp.task('html', gulp.series('build_external_assets', 'assets' , function() {
  return gulp.src('./src/index.html')
    .pipe(useref())
    .pipe(gulpif(['css/app.min.css'], cleanCSS({ keepSpecialComments: 0 }), replace(/\w+fonts/g, 'fonts')))
    .pipe(gulp.dest(g3w.clientFolder));
}));

/**
 * Build django g3w-admin template with the refercenced of all css and js minified and added versionHash
 */
gulp.task('html:compiletemplate', function() {
  return gulp.src('./src/index.html.admin.template')
    .pipe(replace('{VENDOR_CSS}', 'vendor.' + buildChanges.vendor.css.hash + '.min.css'))
    .pipe(replace('{APP_CSS}',       'app.' + buildChanges.app.css.hash    + '.min.css'))
    .pipe(replace('{VENDOR_JS}',  'vendor.' + buildChanges.vendor.js.hash  + '.min.js'))
    .pipe(replace('{APP_JS}',        'app.' + buildChanges.app.js.hash     + '.min.js'))
    .pipe(rename({ basename: 'index', extname: '.html' }))
    .pipe(gulp.dest(g3w.clientFolder));
});

gulp.task('browser-sync', function() {
  const port = g3w.port ?? 3000;
  const proxy = httpProxy.createProxyServer({ target: g3w.proxy.url });
  proxy.on('error', function(e) { gutil.log(e); });
  browserSync.init({
    server: {
      baseDir: ['src', '.'],
      middleware: [
        function(req, res, next) {
          let doproxy = false;
          let rootUrl;
          if (req.url.indexOf('plugin.js') > -1) rootUrl = req.url;
          else rootUrl = req.url.split('?')[0];
          for (let i in g3w.proxy.routes) {
            if (rootUrl.indexOf(g3w.proxy.routes[i]) > -1) {
              doproxy = true;
              break;
            }
          }
          doproxy ? proxy.web(req, res) : next();
        }
      ]
    },
    port,
    open: false,
    startPath: '/',
    socket: {
      domain: `${g3w.host}:${port}`
    }
  });
});

gulp.task('browser:reload', function() {
  if (browserSync) {
    browserSync.reload()
  }
});

/**
 * Live reload application on code changes
 */
gulp.task('watch', function(done) {
  gulp.watch(['./assets/style/**/*.less', g3w.pluginsFolder + '/**/*.less'], gulp.series('less', 'browser:reload'));
  gulp.watch(['./assets/style/skins/*.less'],                                gulp.series('browser:reload'));
  gulp.watch('./src/**/*.{png,jpg}',                                         gulp.series('images', 'browser:reload'));
  gulp.watch(g3w.pluginsFolder + '/**/plugin.js',                            gulp.series('plugins', 'browser:reload'));
  gulp.watch(g3w.pluginsFolder + '/**/style/less/plugin.less',               gulp.series('less', 'browser:reload'));
  gulp.watch([path.join(g3w.pluginsFolder, '*', 'index.*.html')],            gulp.series('build_external_assets', 'browser:reload'));
  gulp.watch(path.join('assets', 'vendors', 'index.*.html'),                 gulp.series('build_external_assets', 'browser:reload'));
  gulp.watch(['./src/index.html', './src/**/*.html'],                        gulp.series('browser:reload'));
  done();
});

/**
 * Run the following tasks sequentially:
 * 
 * 1. clean dist folder
 * 2. set production variable to true
 * 3. browserify all files (require)
 * 4. read index.html after compiled less, fonts etc .. and read build blocks
 *    concatenate and insert <version>.min.css/js version
 * 5. write django g3w-admin template subtitude suffix .min with current version
 * 6. Remove app.js and app.css from g3w-admin client folder
 */
gulp.task('dist', function(done) {
  production = true;
  setNODE_ENV();

  if (build_all) gulp.series('clean', 'browserify', 'html', 'concatenate_vendor_js', 'clean_vendor_js', 'sethasvalues', 'html:compiletemplate', 'cleanup', done);
  else gulp.series('clean', 'browserify', 'html', 'sethasvalues', 'html:compiletemplate', 'cleanup', done);
});

gulp.task('g3w-admin-plugins', function() {
  gulp.src(`${g3w.distFolder}/**/js/plugin.js`)
    .pipe(rename(function(path) {
      const pluginname = path.dirname.replace('/js', '');
      path.dirname = `${g3w.admin_plugins_folder}/${pluginname}/static/${pluginname}/js/`;
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('select-plugins', function() {
  // exclude from list client and all template plugin
  const plugins = fs.readdirSync(g3w.distFolder).filter(file => file !== 'client' && file.indexOf('template_') === -1 && fs.statSync(g3w.distFolder + '/' + file).isDirectory());
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

gulp.task('g3w-admin-plugins-select', gulp.series('plugins', 'select-plugins', function(done) {
  const pluginNames = process.env.G3W_PLUGINS.split(',');
  if (pluginNames.length === 1 && pluginNames[0] === '') {
    console.log('No plugin selected');
    done();
  } else  {
    const sources = pluginNames.map(pluginName => `${g3w.distFolder}/${pluginName}*/js/plugin.js`);
    return gulp.src(sources)
      .pipe(rename(function(path) {
        const pluginname = path.dirname.replace('/js', '');
        path.dirname = g3w.admin_plugins_folder + '/' + pluginname + '/static/' + pluginname + '/js/';
      }))
      .pipe(gulp.dest('.'));
  }
}));

gulp.task('g3w-admin-client:clear', function() {
  const static = g3w.admin_static_folder + '/client';
  const template = g3w.admin_templates_folder + '/client';
  return del(
    build_all
      ? [ static + '/js/*',     static + '/css/*',     template + '/index.html']
      : [ static + '/js/app.*', static + '/css/app.*', template + '/index.html'],
    { force: true })
});

gulp.task('g3w-admin-client:static', function() {
  gulp.src([
    `${g3w.clientFolder}/**/*.*`,
    `!${g3w.clientFolder}/index.html`,
    `!${g3w.clientFolder}/js/app.js`,
    `!${g3w.clientFolder}/css/app.css`
    ])
    .pipe(gulp.dest(`${g3w.admin_static_folder}/client/`));
});

gulp.task('g3w-admin-client:template', function() {
  gulp.src(g3w.clientFolder + '/index.html')
    .pipe(gulp.dest(g3w.admin_templates_folder + '/client/'));
});

/**
 * Create g3w-admin files. It start from compile sdk source folder, app source folder and all plugins
 */
gulp.task('g3w-admin', gulp.series('dist', 'g3w-admin-client:clear', 'g3w-admin-client:static', 'g3w-admin-client:template', 'g3w-admin-plugins-select'));

gulp.task('g3w-admin:client_only', function(done) {
  build_all = false;
  gulp.series('g3w-admin', done)();
});

/**
 * Run test once and exit
 */
gulp.task('test', async (done) => {
  const testPath = `${__dirname}${g3w.test.path}`;
  const testGroupFolders = fs.readdirSync(testPath).filter(file => file !== 'group_template' && fs.statSync(testPath + '/' +file).isDirectory());
  for (let i = 0; i < testGroupFolders.length; i++) {
    await new Promise((resolve) => {
      new karma.Server({
        configFile: `${testPath}${testGroupFolders[i]}/karma.config.js`,
        singleRun: true
      },() => { resolve() }).start();
    });
  }
  done();
});

/**
 * Deafult development task (BrowserSync server)
 */
gulp.task('dev', gulp.series('build_external_assets', 'clean', 'browserify', 'assets', 'watch', 'plugins', 'browser-sync'));
