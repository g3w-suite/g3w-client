//Gulp
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
const gutil       = require("gulp-util");
const useref      = require('gulp-useref'); // used to parse index.dev.html
const watch       = require('gulp-watch');

// Gulp vinyl (virtual memory filesystem stuff)
const buffer      = require('vinyl-buffer');
const source      = require('vinyl-source-stream');

// Node.js
const del         = require('del');
const fs          = require('fs');
const md5         = require('md5');
const path        = require('path');

///////////////////////////////////////////////////////
const babelify    = require('babelify');
const browserSync = require('browser-sync');
const browserify  = require('browserify');
const karma       = require('karma');
const imgurify    = require('imgurify');
const LessGlob    = require('less-plugin-glob');
const stringify   = require('stringify');
const vueify      = require('vueify');
const watchify    = require('watchify');
///////////////////////////////////////////////////////

const argv        = require('yargs').argv;
const runSequence = require('run-sequence');

const packageJSON = require('./package.json');
const g3w         = require('./config');

///////////////////////////////////////////////////////

/**
 * TODO: can we safely delete the followings ?
 */

// it used to change build minified js and css to avoid server cache
// every time we deploy a new client version
let g3w_admin = false;
///////////////////////////////////////////////////////

// TODO: make use of "process.env" instead of setting local variables
let production = false;

// used to check if changes are done on these files without upload new file with no changes
const hashtable = {
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

// run sequence function. It expect some arguments
function prepareRunSequence() {
  const _arguments = arguments;
  return function() {
    runSequence.apply(null,_arguments);
  }
}

// production const to set environmental variable
function setNODE_ENV() {
  process.env.NODE_ENV = production ? 'production' : 'development';
}

setNODE_ENV();

gulp.task('clean:dist',   () => del([`${g3w.distFolder}/**/*`], { force: true }));
gulp.task('clean:node_modules_vendor', () => del([`${g3w.clientFolder}/js/vendor.node_modules.min.js`], {force: true}));
gulp.task('clean:app',    () => del([`${g3w.clientFolder}/js/app.js`, `${g3w.clientFolder}/css/app.css`], { force: true }));

/**
 * Clear javascript and css files (vendor* and app*)
 */
gulp.task('clean:admin',  () => {
  del([`${g3w.admin_static_folder}/client/js/*`, `${g3w.admin_static_folder}/client/css/*`, `${g3w.admin_templates_folder}/client/index.html`], { force: true })
});
/**
 * Clear only app* css and js files
 */
gulp.task('clean:admin-client',  () => del([`${g3w.admin_static_folder}/client/js/*`, `${g3w.admin_static_folder}/client/css/*`, `${g3w.admin_templates_folder}/client/index.html`], { force: true }));


/**
 * Build minified hashed versions of js and css files in order to avoid server cache
 * Need to create an async function and not asy a async function task
 */

gulp.task('md5hash', function() {
  return new Promise(async resolve => {
    const files = {
      js: ['app', 'vendor'],
      css: ['app', 'vendor']
    };
    // generate md5 hash
    for (let type of Object.keys(files)) {
      for (let name of files[type]) {
        const originalname = `${g3w.clientFolder}/${type}/${name}.min.${type}`;
        hashtable[name][type].hash = md5(await fs.promises.readFile(originalname));
        fs.renameSync(originalname, `${g3w.clientFolder}/${type}/${name}.${hashtable[name][type].hash}.min.${type}`)
      }
    }
    resolve();
  });
});


gulp.task('browserify:vendor', function() {
  return browserify(
    /* Uncomment the following in next ESM release (v4.x) */
    // {
    //  plugin: [
    //    esmify
    //  ],
    //  transform: [
    //    vueify,
    //    [ babelify, { ignore: [/\/node_modules\//], /* global: true, sourceMaps: true, babelrc: true */ } ]
    //    [ stringify, { appliesTo: { includeExtensions: ['.html', '.xml'] } } ],
    //    imgurify
    // ]}
    )
    .require(dependencies)
    .bundle()
    .pipe(source('vendor.node_modules.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(`${g3w.clientFolder}/js`));
});

/**
 * Cancatenate browserify vendor with vendor file inside assets specify in index.html.js
 */
gulp.task('concatenate:vendor', function(){
  return gulp.src(`${g3w.clientFolder}/js/vendor.*.js`)
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest(`${g3w.clientFolder}/js/`));
});

/**
 * Trasform modularized code in a browser compatible way
 */
gulp.task('browserify:app', function() {
  let rebundle;
  let bundler = browserify('./src/app/main.js', {
    basedir: './',
    paths: ['./src/', './src/app/', './src/plugins/'],
    debug: !production,
    cache: {},
    packageCache: {},
    /* Uncomment the following in next ESM release (v4.x) */
    // plugin: [
    //   esmify
    // ],
    // transform: [
    //   vueify,
    //   [ babelify, { babelrc: true } ]
    //   [ stringify, { appliesTo: { includeExtensions: ['.html', '.xml'] } } ],
    //   imgurify
    // ]
  });
  if (production) {
    bundler.ignore('./src/app/dev/index.js');           // ignore dev index file
    dependencies.forEach(dep => bundler.external(dep)); // add external module node_modules on vendor
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
    .transform(babelify, { babelrc: true })
    .transform(stringify, { appliesTo: { includeExtensions: ['.html', '.xml'] } })
    .transform(imgurify);

  const bundle = () => bundler.bundle()
      .on('error', err => {
        console.log('ERROR: running gulp task "browserify:app"');
        console.log(err);
        this.emit('end');
        del([
          `${g3w.clientFolder}/js/app.js`,
          `${g3w.clientFolder}/style/app.css`
        ]).then(() => process.exit());
      })
      .pipe(source('build.js'))
      .pipe(buffer())
      .pipe(gulpif(production, uglify({
        compress: {
          drop_console: true
        }
      }).on('error', gutil.log)))
      .pipe(rename('app.js'))
      .pipe(gulp.dest(`${g3w.clientFolder}/js/`));

  if (production) {
    rebundle = () => bundle();
  } else {
    rebundle = () => bundle().pipe(browserSync.reload({ stream: true }));
    bundler.on('update', rebundle);    
  }
  return rebundle();
});

gulp.task('fonts', function () {
  return gulp.src([
      `${g3w.assetsFolder}/fonts/**/*.{eot,ttf,woff,woff2}`,
      '!./src/libs/**/node_modules/**/',
      `${g3w.pluginsFolder}/**/*.{eot,ttf,woff,woff2}`
    ])
    .pipe(flatten())
    .pipe(gulp.dest(`${g3w.clientFolder}/fonts/`))
});

gulp.task('images', function () {
  return gulp.src([
      `${g3w.assetsFolder}/images/**/*.{png,jpg,gif,svg}`,
      '!./src/**/node_modules/**/',
      `${g3w.pluginsFolder}/**/*.{png,jpg,gif,svg}`
    ])
    .pipe(flatten())
    .pipe(gulp.dest(g3w.clientFolder + '/images/'))
});

/**
 * Compile less file in css
 */
 gulp.task('less', ['fonts'], function() {
  return gulp.src([
      `${g3w.assetsFolder}/style/less/app.less`,
      `${g3w.pluginsFolder}/*/style/less/plugin.less`
    ])
    .pipe(concat('app.less'))
    .pipe(less({
      // add paths where to search in @import
      paths: [
        `${g3w.assetsFolder}/style/less`,
        `${g3w.pluginsFolder}/*/style/less`
      ],
      // plugin to manage globs import es: @import path/***
      plugins: [LessGlob] 
    }))
    .pipe(gulp.dest(g3w.clientFolder + '/css/'))
});

gulp.task('datatable-images', function () {
  return gulp.src(`${g3w.assetsFolder}/vendors/datatables/DataTables-1.10.16/images/*`)
    .pipe(flatten())
    .pipe(gulp.dest(g3w.clientFolder + '/css/DataTables-1.10.16/images/'));
});

gulp.task('assets', ['fonts', 'images', 'less','datatable-images']);

/**
 * Create external assets (css and javascript libraries) referenced within main html
 */
 gulp.task('build_external_assets', function() {
  const replaceRelativeAssetsFolder = path.relative(path.resolve('./src'), path.resolve(g3w.assetsFolder))  + '/' ;
  const replaceRelativePluginFolder = function() {
    const pluginName = path.dirname(this.file.relative);
    return path.relative(path.resolve('./src'), path.resolve(`${g3w.pluginsFolder}/${pluginName}`))  + '/' ;
  };
  return gulp.src('./src/index.dev.html')
    // replace css and js sources
    .pipe(htmlreplace({
      'app_vendor_css':
          gulp.src(`${g3w.assetsFolder}/vendors/index.css.html`)
            .pipe(replace('./', replaceRelativeAssetsFolder)),
      'app_vendor_js':
          gulp.src(`${g3w.assetsFolder}/vendors/index.js.html`)
            .pipe(replace('./', replaceRelativeAssetsFolder)),
      'plugins_css':
          gulp.src(`${g3w.pluginsFolder}/*/index.css.html`)
            .pipe(replace('./', replaceRelativePluginFolder)),
      'plugins_js':
          gulp.src(`${g3w.pluginsFolder}/*/index.js.html`)
            .pipe(replace('./', replaceRelativePluginFolder))
      })
    )
    .pipe(rename('index.html'))
    .pipe(gulp.dest('./src'));
});

/**
 * Create a index.html in src/ and add all external libraries and css to it
 */
gulp.task('html:dev', ['build_external_assets', 'assets'], function() {
  return gulp.src('./src/index.html')
    .pipe(useref())
    .pipe(gulpif(['css/app.min.css'], cleanCSS({ keepSpecialComments: 0 }), replace(/\w+fonts/g, 'fonts')))
    .pipe(gulp.dest(g3w.clientFolder));
});

/**
 * Build django g3w-admin template with the referenced of all css and js minified and added hash create by md5hash task
 */
gulp.task('html:prod', function() {
  return gulp.src('./src/index.prod.html')
    .pipe(replace('{VENDOR_CSS}', 'vendor.' + hashtable.vendor.css.hash + '.min.css'))
    .pipe(replace('{APP_CSS}',       'app.' + hashtable.app.css.hash    + '.min.css'))
    .pipe(replace('{VENDOR_JS}',  'vendor.' + hashtable.vendor.js.hash  + '.min.js'))
    .pipe(replace('{APP_JS}',        'app.' + hashtable.app.js.hash     + '.min.js'))
    .pipe(rename({ basename: 'index', extname: '.html' }))
    .pipe(gulp.dest(g3w.clientFolder));
});

gulp.task('browser-sync', function() {
  browserSync.init({
    port: g3w.port,
    open: false,
    startPath: '/',
    proxy: {
      target: conf.proxy.url
    },
    socket: {
      domain: `${g3w.host}:${g3w.port}`
    }
  });
});

gulp.task('browser:reload', function() {
  if (browserSync) {
    browserSync.reload();
  }
});

/**
 * Live reload application on code changes
 */
gulp.task('watch', function(done) {
    /* Uncomment the following in next Gulp Release (v4.x) */
  // gulp.watch(['./assets/style/**/*.less', g3w.pluginsFolder + '/**/*.less'], gulp.series('less', 'browser:reload'));
  // gulp.watch(['./assets/style/skins/*.less'],                                gulp.series('browser:reload'));
  // gulp.watch('./src/**/*.{png,jpg}',                                         gulp.series('images', 'browser:reload'));
  // gulp.watch(g3w.pluginsFolder + '/**/plugin.js',                            gulp.series('plugins', 'browser:reload'));
  // gulp.watch(g3w.pluginsFolder + '/**/style/less/plugin.less',               gulp.series('less', 'browser:reload'));
  // gulp.watch([g3w.pluginsFolder + '/*/index.*.html'],                        gulp.series('build_external_assets', 'browser:reload'));
  // gulp.watch('./assets/vendors/index.*.html',                                gulp.series('build_external_assets', 'browser:reload'));
  // gulp.watch(['./src/index.html', './src/**/*.html'],                        gulp.series('browser:reload'));
  watch(['./assets/style/**/*.less', g3w.pluginsFolder + '/**/*.less'], prepareRunSequence('less','browser:reload'));
  watch(['./assets/style/skins/*.less'],                                prepareRunSequence('less:skins','browser:reload'));
  watch('./src/**/*.{png,jpg}',                                         prepareRunSequence('images','browser:reload'));
  watch(g3w.pluginsFolder + '/**/plugin.js',                            prepareRunSequence('plugins','browser:reload'));
  watch(g3w.pluginsFolder + '/**/style/less/plugin.less',               prepareRunSequence('less','browser:reload'));
  watch([g3w.pluginsFolder + '/*/index.*.html'],                        prepareRunSequence('build_external_assets','browser:reload'));
  watch('./assets/vendors/index.*.html',                                prepareRunSequence('build_external_assets','browser:reload'));
  gulp.watch(['./src/index.html','./src/**/*.html'],                    function() { browserSync.reload(); });  
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
  runSequence('clean:dist', 'production', 'browserify:app', 'browserify:vendor', 'html:dev', 'concatenate:vendor', 'clean:node_modules_vendor', 'md5hash', 'html:prod', 'clean:app', done);
});

/**
 * Copy all plugins to g3w-admin's plugin folder
 */
gulp.task('plugins', function() {
  return gulp.src(`${g3w.pluginsFolder}/*/plugin.js`)
    .pipe(rename((path) => { path.dirname = g3w.distFolder + '/' + path.dirname + '/js/'; }))
    .pipe(gulp.dest('.'));
});

/**
 * Lets developer choose which plugins to include within generated bundle
 */
gulp.task('select-plugins', function() {
  return gulp
    .src('./package.json')
    .pipe(
      prompt.prompt({
        type: 'checkbox',
        name: 'plugins',
        message: 'Plugins',
        // exclude from plugin list "client" and all "template_" plugins
        choices: fs.readdirSync(g3w.distFolder).filter(file => file !== 'client' && file.indexOf('template_') === -1 && fs.statSync(`${g3w.distFolder}/${file}`).isDirectory())
      },
      response => process.env.G3W_PLUGINS = response.plugins
      )
    );
});

/**
 * Task plugins
 */
gulp.task('g3w-admin:plugins', ['plugins', 'select-plugins'], function(done) {
  const pluginNames = process.env.G3W_PLUGINS.split(',');
  if (pluginNames.length === 1 && pluginNames[0] === '') {
    console.log('No plugin selected');
    done();
  } else  {
    return gulp.src(pluginNames.map(pluginName => `${g3w.distFolder}/${pluginName}*/js/plugin.js`))
      .pipe(rename(path => {
        const pluginname = path.dirname.replace('/js', '');
        path.dirname = `${g3w.admin_plugins_folder}/${pluginname}/static/${pluginname}/js/`;
      }))
      .pipe(gulp.dest('.'));
  }
});

gulp.task('g3w-admin:static', function() {
  return gulp.src([
    `${g3w.clientFolder}/**/*.*`,
    `!${g3w.clientFolder}/index.html`,
    `!${g3w.clientFolder}/js/app.js`,
    `!${g3w.clientFolder}/css/app.css`
    ])
    .pipe(gulp.dest(`${g3w.admin_static_folder}/client/`));
});

/**
 * Copy local index.html to admin-client folder template
 */
gulp.task('g3w-admin:templates', function() {
  return gulp.src(`${g3w.clientFolder}/index.html`)
    .pipe(gulp.dest(`${g3w.admin_templates_folder}/client/`));
});

/**
 * Create g3w-admin files. It start from compile sdk source folder, app source folder and all plugins
 */
gulp.task('g3w-admin', ['dist', 'clean:admin', 'g3w-admin:static', 'g3w-admin:templates', 'g3w-admin:plugins']);

/**
 * Run test once and exit
 */
gulp.task('test', async (done) => {
  const testPath = `${__dirname}${g3w.test.path}`;
  const testGroupFolders = fs.readdirSync(testPath).filter(file => file !== 'group_template' && fs.statSync(testPath + '/' +file).isDirectory());
  for (let i = 0; i < testGroupFolders.length; i++) {
    await new Promise(resolve => {
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
gulp.task('dev', ['build_external_assets', 'clean:dist', 'browserify:app', 'assets', 'watch', 'plugins', 'browser-sync']);

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
  fs.writeFileSync('src/version.js', `/* WARNING: this file is autogenerated by gulpfile.js, please do not edit manually */\n\nexport default '${packageJSON.version}';`);
});

// Backward compatibilities (v3.x)
gulp.task('clean',                               ['clean:dist']);
gulp.task('clean_vendor_node_modules_min',       ['clean:node_modules_vendor']);
gulp.task('cleanup',                             ['clean:app']);
gulp.task('g3w-admin-client:clear',              ['clean:admin']);
gulp.task('sethasvalues',                        ['md5hash']);
gulp.task('concatenate_node_modules_vendor_min', ['concatenate:vendor']);
gulp.task('browserify',                          ['browserify:app']);
gulp.task('add_external_resources_to_main_html', ['build_external_assets']);
gulp.task('html',                                ['html:dev']);
gulp.task('html:compiletemplate',                ['html:prod']);
gulp.task('g3w-admin-plugins-select',            ['g3w-admin:plugins']);
gulp.task('g3w-admin-client:static',             ['g3w-admin:static']);
gulp.task('g3w-admin-client:template',           ['g3w-admin:templates']);

//////////////////////////////////////////////////////////////////////////
/**
 * TODO: check which of the following tasks is actually required
 */
//////////////////////////////////////////////////////////////////////////

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

/**
 * Set production to true
 */
gulp.task('production', function(){
  production = true;
  setNODE_ENV();
});

gulp.task('serve', function(done) {
  runSequence('clean','browserify',['assets','watch','plugins'],'browser-sync', done);
});

gulp.task('copy-and-select-plugins', function(done) {
  runSequence('plugins', 'select-plugins', done)
});

gulp.task('g3w-admin-client_test',['g3w-admin-client:static','g3w-admin-client:template', 'g3w-admin-client:check_client_version']);

gulp.task('g3w-admin-client', ['g3w-admin-client:clear','g3w-admin-client:static','g3w-admin-client:template']);

// task used to create g3w-admin files. It start from compile sdk source folder, app source folder and all plugins
gulp.task('g3w-admin',function(done){
  g3w_admin = true;
  runSequence('dist', 'g3w-admin-client', 'g3w-admin-plugins-select', done)
});


gulp.task('default', ['add_external_resources_to_main_html','serve']); // development task - Default

//////////////////////////////////////////////////////////////////////////