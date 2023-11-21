//Gulp
const gulp        = require('gulp');
const cleanCSS    = require('gulp-clean-css');
const concat      = require('gulp-concat');
const flatten     = require('gulp-flatten');
const gulpif      = require('gulp-if');
const less        = require('gulp-less');
const merge       = require('gulp-merge');
const prompt      = require('gulp-prompt');
const rename      = require('gulp-rename');
const replace     = require('gulp-replace');
const sourcemaps  = require('gulp-sourcemaps');
const uglify      = require('gulp-uglify');
const gutil       = require('gulp-util');

// Gulp vinyl (virtual memory filesystem stuff)
const buffer      = require('vinyl-buffer');
const source      = require('vinyl-source-stream');

// Node.js
const exec        = require('child_process').exec;
const execSync    = require('child_process').execSync;
const del         = require('del');
const fs          = require('fs');
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

const runSequence = require('run-sequence'); // same as "gulp.series" (v4)

const packageJSON = require('./package.json');
const g3w         = require('./config');

///////////////////////////////////////////////////////

// TODO: make use of "process.env" instead of setting local variables
let production   = false;
let outputFolder = g3w.admin_overrides_folder;

// ANSI color codes
const INFO__ = "\033[0;32m\#\#\# ";
const __INFO = " \#\#\# \033[0m";
const H1__ = "\n\n" + INFO__;
const __H1 = __INFO + "\n";


// Retrieve project dependencies ("g3w-client")
const dependencies = Object.keys(packageJSON.dependencies).filter(dep => 'vue' !== dep);

// Built-in client plugins
const default_plugins = [
  'editing',
  'openrouteservice',
  'qplotly',
  'qtimeseries'
];
// Locally developed client plugins = [ default_plugins ] + [ g3w.plugins ]
const dev_plugins = Array.from(new Set(
  default_plugins.concat(g3w.plugins instanceof Array ? plugins : Object.keys(g3w.plugins))
));

// production const to set environmental variable
function setNODE_ENV() {
  process.env.NODE_ENV = production ? 'production' : 'development';
  outputFolder         = production ? g3w.admin_plugins_folder + '/client' : g3w.admin_overrides_folder;
  console.log('[G3W-CLIENT] environment: ' + process.env.NODE_ENV);
  console.log('[G3W-CLIENT] output folder: ' + outputFolder + '\n');
}

setNODE_ENV();

// gulp.task('clean:dist',   () => del([`${g3w.distFolder}/**/*`], { force: true }));
gulp.task('clean:dist',      () => del([`${outputFolder}/static/*`, `${outputFolder}/templates/*`], { force: true }));
gulp.task('clean:admin',     () => del([`${g3w.admin_plugins_folder}/client/static/*`, `${g3w.admin_plugins_folder}/client/templates/*`], { force: true }));
gulp.task('clean:overrides', () => del([`${g3w.admin_overrides_folder}/static/*`, `${g3w.admin_overrides_folder}/templates/*`], { force: true }));

gulp.task('html',            () => gulp.src('./src/index.html').pipe(gulp.dest(outputFolder + '/templates/client')));
gulp.task('browser:reload',  () => browserSync ? browserSync.reload() : null);

/**
 * Concatenate and browserify vendor javascript files
 */
gulp.task('concatenate:vendor_js', function() {
  return merge(
    gulp.src([
      g3w.assetsFolder + "/vendors/jquery/jquery-2.2.1.min.js",
      g3w.assetsFolder + "/vendors/jquery-ui/jquery-ui.min.js",
      g3w.assetsFolder + "/vendors/bootstrap/js/bootstrap.min.js",
      g3w.assetsFolder + "/vendors/bootbox/bootbox.min.js",
      g3w.assetsFolder + "/vendors/lodash/lodash.min.js",
      g3w.assetsFolder + "/vendors/eventemitter/EventEmitter.min.js",
      g3w.assetsFolder + "/vendors/history/jquery.history.js",
      g3w.assetsFolder + "/vendors/signals/signals.min.js",
      g3w.assetsFolder + "/vendors/crossroads/crossroads.min.js",
      g3w.assetsFolder + "/vendors/moment/moment.js",
      g3w.assetsFolder + "/vendors/moment/moment-with-locales.js",
      g3w.assetsFolder + "/vendors/bootstrap-datetimepicker/js/bootstrap-datetimepicker.min.js",
      g3w.assetsFolder + "/vendors/icheck/icheck.min.js",
      g3w.assetsFolder + "/vendors/bootstrap-treeview/js/bootstrap-treeview.js",
      g3w.assetsFolder + "/vendors/slimScroll/jquery.slimscroll.min.js",
      g3w.assetsFolder + "/vendors/fastclick/fastclick.js",
      g3w.assetsFolder + "/vendors/vue/vue.min.js",
      g3w.assetsFolder + "/vendors/jquery-file-upload/jquery.fileupload.js",
      g3w.assetsFolder + "/vendors/jquery-fileDownload/jquery.fileDownload.js",
      g3w.assetsFolder + "/vendors/bootstrap-filestyle/bootstrap-filestyle.min.js",
      g3w.assetsFolder + "/vendors/ismobile/ismobile.min.js",
      g3w.assetsFolder + "/vendors/jquery-i18next/jquery-i18next.min.js",
      g3w.assetsFolder + "/vendors/i18next/i18next.min.js",
      g3w.assetsFolder + "/vendors/i18next/i18nextXHRBackend.min.js",
      g3w.assetsFolder + "/vendors/script/script.min.js",
      g3w.assetsFolder + "/vendors/x2js/xml2json.g3w.min.js",
      g3w.assetsFolder + "/vendors/proj4js/proj4.js",
      g3w.assetsFolder + "/vendors/ol/js/ol.js",
      g3w.assetsFolder + "/vendors/ol-rotate-feature/bundle.min.js",
      g3w.assetsFolder + "/vendors/jsts/jsts.min.js",
      g3w.assetsFolder + "/vendors/datatables/datatables.min.js",
      g3w.assetsFolder + "/vendors/shp2geojson/shp.min.js",
      g3w.assetsFolder + "/vendors/jszip/jszip.min.js",
      g3w.assetsFolder + "/vendors/filesaver/FileSaver.min.js",
      g3w.assetsFolder + "/vendors/select2/js/select2.full.min.js",
      g3w.assetsFolder + "/vendors/select2/js/i18n/it.js",
      g3w.assetsFolder + "/vendors/d3/js/d3.min.js",
      g3w.assetsFolder + "/vendors/c3/js/c3.min.js",
      g3w.assetsFolder + "/vendors/wps/js/wps-js-all.min.js",
      g3w.assetsFolder + "/vendors/quill/js/quill.min.js"
      ]),
      browserify(
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
    )
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest(outputFolder + '/static/client/js/'));
});

/**
 * Compile client application (src/app/main.js --> app.min.js)
 */
gulp.task('browserify:app', function() {
  let rebundle;
  let bundler = browserify(
    `./src/index.${production ? 'prod' : 'dev'}.js`,
    {
    basedir: './',
    paths: ['./src/', './src/app/', './src/plugins/'],
    debug: !production,
    cache: {},
    packageCache: {},
    /* Uncomment the following in next ESM release (v4.x) */
    // plugin: [
    //   esmify
    // ],
    transform: [
      vueify,
      [ babelify, { babelrc: true } ],
      [ stringify, { appliesTo: { includeExtensions: ['.html', '.xml'] } } ],
      imgurify
    ]
  });

  dependencies.forEach(dep => bundler.external(dep));   // exclude external npm dependencies

  if (production) {
    bundler.ignore('./src/index.dev.js');               // ignore dev index file (just to be safe)
  } else {
    bundler = watchify(bundler);
  }

  const bundle = () => bundler.bundle()
      .on('error', err => {
        console.log('ERROR: running gulp task "browserify:app"');
        console.log(err);
        this.emit('end');
        process.exit()
        // del([
        //   `${outputFolder}/static/js/app.js`,
        //   `${outputFolder}/static/css/app.css`
        // ]).then(() => process.exit());
      })
      .pipe(source('build.js'))
      .pipe(buffer())
      .pipe(gulpif(production, sourcemaps.init()))
      .pipe(gulpif(production, uglify({ compress: { drop_console: true } }).on('error', gutil.log)))
      .pipe(rename('app.min.js'))
      .pipe(gulpif(production, sourcemaps.write('.')))
      .pipe(gulp.dest(outputFolder + '/static/client/js/'));


  if (production) {
    rebundle = () => bundle();
  } else {
    rebundle = () => bundle().pipe(browserSync.reload({ stream: true }));
    bundler.on('update', rebundle);
  }
  return rebundle();
});

/**
 * Deploy client and vendor images
 */
gulp.task('images', function () {
  return gulp.src([
      `${g3w.assetsFolder}/images/**/*.{png,jpg,gif,svg}`,
      `${g3w.pluginsFolder}/**/*.{png,jpg,gif,svg}`,
      '!./src/**/node_modules/**/'
    ])
    .pipe(flatten())
    .pipe(gulp.dest(outputFolder + '/static/client/images/'))
});

/**
 * Deploy datatables images (src/assets/vendors/datatables)
 */
 gulp.task('datatable-images', function () {
  return gulp.src(`${g3w.assetsFolder}/vendors/datatables/DataTables-1.10.16/images/*`)
    .pipe(flatten())
    .pipe(gulp.dest(outputFolder + '/static/client/images/'));
});

/**
 * Deploy client and vendor fonts
 */
 gulp.task('fonts', function () {
  return gulp.src([
      `${g3w.assetsFolder}/fonts/**/*.{eot,ttf,woff,woff2}`,
      `${g3w.assetsFolder}/vendors/bootstrap/fonts/**/*.{eot,ttf,woff,woff2}`,
      `${g3w.assetsFolder}/vendors/font-awesome-5.15.4/webfonts/**/*.{eot,ttf,woff,woff2}`,
      `${g3w.pluginsFolder}/**/*.{eot,ttf,woff,woff2}`,
      '!./src/**/node_modules/**/'
    ])
    .pipe(flatten())
    .pipe(gulp.dest(outputFolder + '/static/client/fonts/'))
});

/**
 * Deploy geocoding providers (src/assets/geocoding-providers)
 */
gulp.task('geocoding-providers', function () {
  return gulp.src(`${g3w.assetsFolder}/geocoding-providers/*`)
    .pipe(flatten())
    .pipe(gulp.dest(outputFolder + '/static/client/geocoding-providers/'));
});

/**
 * Compile client styles (src/assets/style/less/app.less --> app.min.css)
 */
gulp.task('less', ['fonts'], function() {
  return gulp.src(`${g3w.assetsFolder}/style/less/app.less`)
    .pipe(less({
      paths: [`${g3w.assetsFolder}/style/less`], // add paths where to search in @import
      plugins: [LessGlob]                        // plugin to manage globs import es: @import path/***
    }))
    //.pipe(gulpif(production, cleanCSS({ keepSpecialComments: 0 }), replace(/\w+fonts/g, 'fonts')))
    .pipe(replace(/\w+fonts/g, 'fonts')) // eg. "../webfonts/fa-regular-400.woff2" --> ""../fonts/fa-regular-400.woff2"
    .pipe(cleanCSS({ keepSpecialComments: 0 }))
    .pipe(rename('app.min.css'))
    .pipe(gulp.dest(outputFolder + '/static/client/css/'))
});

/**
 * Compile less files in css (process.env.CUSTOM_LESS_FOLDER)
 */
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
 * Concatenate vendor css files
 */
gulp.task('concatenate:vendor_css', function() {
  return gulp.src([
    g3w.assetsFolder + "/vendors/bootstrap/css/bootstrap.min.css",
    g3w.assetsFolder + "/vendors/bootstrap-treeview/css/bootstrap-treeview.min.css",
    g3w.assetsFolder + "/vendors/icheck/skins/all.css",
    g3w.assetsFolder + "/vendors/magic-check/magic-check.min.css",
    g3w.assetsFolder + "/vendors/bootstrap-datetimepicker/css/bootstrap-datetimepicker.min.css",
    g3w.assetsFolder + "/vendors/hint/hint.min.css",
    g3w.assetsFolder + "/vendors/ol/css/ol.css",
    g3w.assetsFolder + "/vendors/select2/css/select2.min.css",
    g3w.assetsFolder + "/vendors/c3/css/c3.min.css",
    g3w.assetsFolder + "/vendors/datatables/DataTables-1.10.16/css/jquery.dataTables.min.css",
    g3w.assetsFolder + "/vendors/font-awesome-5.15.4/css/all.min.css",
    g3w.assetsFolder + "/vendors/quill/css/quill.snow.min.css"
  ])
    .pipe(concat('vendor.min.css'))
    .pipe(replace(/\w+fonts/g, 'fonts')) // eg. "../webfonts/fa-regular-400.woff2" --> ""../fonts/fa-regular-400.woff2"
    .pipe(gulp.dest(outputFolder + '/static/client/css/'));
});

/**
 * Proxy development server for local G3W-ADMIN instance
 */
gulp.task('browser-sync', function() {
  browserSync.init({
    port: g3w.port,
    open: false,
    startPath: '/',
    proxy: {
      target: g3w.proxy.url
    },
    socket: {
      domain: `${g3w.host}:${g3w.port}`
    }
  });

  /* Uncomment the following in next Gulp Release (v4.x) */
  //
  // gulp.watch([g3w.assetsFolder + '/style/**/*.less'], gulp.series('less', 'browser:reload'));
  // gulp.watch('./src/**/*.{png,jpg}',                  gulp.series('images', 'browser:reload'));
  // gulp.watch(['./src/index.html', './src/**/*.html'], gulp.series('browser:reload'));
  //

  gulp.watch([g3w.assetsFolder + '/style/**/*.less'],          () => runSequence('less',                'browser:reload'));
  gulp.watch([g3w.assetsFolder + '/geocoding-providers/**/*'], () => runSequence('geocoding-providers', 'browser:reload'));
  gulp.watch('./src/**/*.{png,jpg,gif,svg}',                   () => runSequence('images',              'browser:reload'));
  gulp.watch(['./src/index.html'],                             () => runSequence('html',                'browser:reload'));
  gulp.watch(g3w.pluginsFolder + '/*/plugin.js',               (file) => {
    const plugins = process.env.G3W_PLUGINS;
    process.env.G3W_PLUGINS = path.basename(path.dirname(file.path));
    runSequence('deploy-plugins', 'browser:reload', () => process.env.G3W_PLUGINS = plugins)
  });
});

/**
 * Make sure that core client plugins are there
 * 
 * [submodule "src/plugins/editing"]          <-- https://github.com/g3w-suite/g3w-client-plugin-editing.git
 * [submodule "src/plugins/openrouteservice"] <-- https://github.com/g3w-suite/g3w-client-plugin-openrouteservice.git
 * [submodule "src/plugins/qplotly"]          <-- https://github.com/g3w-suite/g3w-client-plugin-qplotly.git
 * [submodule "src/plugins/qtimeseries"]      <-- https://github.com/g3w-suite/g3w-client-plugin-qtimeseries.git
 */
gulp.task('clone:default_plugins', function() {
  console.log(H1__ + `Cloning default plugins` + __H1);
  for (const pluginName of default_plugins) {
    if (!fs.existsSync(`${g3w.pluginsFolder}/${pluginName}/.git`)) {
      execSync(`git clone https://github.com/g3w-suite/g3w-client-plugin-${pluginName}.git ${g3w.pluginsFolder}/${pluginName}`, {stdio: 'inherit'});
    }
    if (!fs.existsSync(`${g3w.pluginsFolder}/${pluginName}/plugin.js`)) {
      execSync(`gulp --gulpfile ${g3w.pluginsFolder}/${pluginName}/gulpfile.js default`, {stdio: 'inherit'});
    }
  }
});

/**
 * Make sure that all g3w.plugins bundles are there (NB: without watching them)
 * 
 * CORE PLUGINS:
 * - [submodule "src/plugins/editing"]     --> src/plugins/editing/plugin.js
 * - [submodule "src/plugins/qtimeseries"] --> src/plugins/qtimeseries/plugin.js
 * - [submodule "src/plugins/qplotly"]     --> src/plugins/qplotly/plugin.js
 * - [submodule "src/plugins/qtimeseries"] --> src/plugins/qtimeseries/plugin.js
 * 
 * CUSTOM PLUGINS:
 * - [submodule "src/plugins/eleprofile"]  --> src/plugins/eleprofile/plugin.js
 * - [submodule "src/plugins/sidebar"]     --> src/plugins/sidebar/plugin.js
 */
gulp.task('build:dev_plugins', function() {
  for (const pluginName of dev_plugins) {
    console.log(H1__ + `Building plugin: ${g3w.pluginsFolder}/${pluginName}/plugin.js` + __H1);
    try {
      execSync(`gulp --gulpfile ${g3w.pluginsFolder}/${pluginName}/gulpfile.js default`, {stdio: 'inherit'});
    } catch(e) { /* soft fails on missing `gulp default` task */ }
  }
});

/**
 * Run `gulp watch` on each g3w.plugins folder
 */
gulp.task('watch:plugins', function() {
  for (const pluginName of dev_plugins) {
    console.log(INFO__ + `Watching plugin: ${g3w.pluginsFolder}/${pluginName}/plugin.js` + __INFO);
    exec(`gulp --gulpfile ${g3w.pluginsFolder}/${pluginName}/gulpfile.js watch`,
      (error, stdout, stderr) => {
        if (error) { console.error(`exec error: ${error}`); return; }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      }
    );
  }
});

/**
 * Ask the developer which plugins wants to deploy
 */
gulp.task('select-plugins', function() {
  return gulp
    .src('./package.json')
    .pipe(
      prompt.prompt({
        type: 'list',
        name: 'env',
        message: 'Environment',
        choices: ['development', 'production'],
        }, (response) => {
          production = response.env == 'production';
          setNODE_ENV();
        }
      )
    )
    .pipe(
      prompt.prompt({
        type: 'checkbox',
        name: 'plugins',
        message: 'Plugins',
        // exclude from plugin list "client" and all "template_" plugins
        choices: fs.readdirSync(g3w.pluginsFolder).filter(file => {
          try {
            return file !== 'client'
                && file.indexOf('template_') === -1
                && fs.statSync(`${g3w.pluginsFolder}/${file}`).isDirectory()
                && fs.statSync(`${g3w.pluginsFolder}/${file}/plugin.js`).isFile();
          } catch (e) {
            console.warn(`[WARN] file not found: ${g3w.pluginsFolder}/${file}/plugin.js`);
            return false;
          }
        })
      },
      response => process.env.G3W_PLUGINS = response.plugins
      )
    );
});

/**
 * Deploy local developed plugins (src/plugins)
 */
gulp.task('deploy-plugins', function() {
  const pluginNames  = process.env.G3W_PLUGINS.split(',');
  const nodePath     = path;
  const outputFolder = production ? g3w.admin_plugins_folder : g3w.admin_overrides_folder + '/static';
  return gulp.src(pluginNames.map(pluginName => `${g3w.pluginsFolder}/${pluginName}/plugin.js`))
    .pipe(rename((path, file) => {
        const pluginName   = nodePath.basename(file.base);
        const staticFolder = production ? `${pluginName}/static/${pluginName}/js/` : `${pluginName}/js/`;
        path.dirname = `${outputFolder}/${staticFolder}`;
        console.log(`[G3W-CLIENT] file updated: ${path.dirname}${path.basename}${path.extname}`);
    }))
    .pipe(gulp.dest('.'));
});

/**
 * Deploy local developed plugins (src/plugins)
 */
gulp.task('build:plugins', (done) => runSequence('clone:default_plugins', 'select-plugins', 'deploy-plugins', done));

/**
 * Compile and deploy local developed client file assets (static and templates)
 */
gulp.task('build:client', ['browserify:app', 'concatenate:vendor_js', 'concatenate:vendor_css', 'fonts', 'images', 'less', 'datatable-images', 'geocoding-providers', 'html']);

/**
 * [PROD] Compile and deploy client application
 * 
 * production   = true,
 * outputFolder = g3w.admin_plugins_folder + '/client'
 */
gulp.task('build', done => runSequence(
  'production',
  // 'clean:admin',
  'clone:default_plugins',
  'build:client',
  'clean:overrides',
  done
  )
);

/**
 * [DEV] Compile and deploy client application
 * 
 * production   = false,
 * outputFolder = g3w.admin_overrides_folder
 */
gulp.task('dev', done => runSequence(
  // 'clean:admin',
  'clean:overrides',
  'clone:default_plugins',
  'build:dev_plugins',
  'build:client',
  'browser-sync',
  done
  )
);

/**
 * [TEST] Run test once and exit
 * 
 * production   = false,
 * outputFolder = g3w.admin_overrides_folder
 */
gulp.task('test', function() {
  return new Promise(async done => {
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
});

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
  fs.readFile('README.md', 'utf8', function (_, data) {
    data = data.toString().split("\n");
    data.splice(0, 1, `# G3W-CLIENT v${packageJSON.version}`);
    fs.writeFile('README.md', data.join("\n"), 'utf8', (err) => { if (err) return console.log(err); });
  });
});

/**
 * Set production to true
 */
 gulp.task('production', function(){
  production = true;
  setNODE_ENV();
});

// Backward compatibilities (v3.x)
gulp.task('g3w-admin',                           ['build']);
gulp.task('g3w-admin-plugins-select',            ['build:plugins']);
gulp.task('g3w-admin-client',                    ['g3w-admin']);
gulp.task('g3w-admin:plugins',                   ['build:plugins']);
gulp.task('serve',                               ['dev']);
gulp.task('default',                             ['dev']);