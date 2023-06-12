//Gulp
const gulp        = require('gulp');
const cleanCSS    = require('gulp-clean-css');
const concat      = require('gulp-concat');
const flatten     = require('gulp-flatten');
const gulpif      = require('gulp-if');
const less        = require('gulp-less');
/**
 * @since 3.9.0
 */
const cssnano    = require('gulp-cssnano');
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
/**
 * @since 3.9.0
 */
const esmify = require('esmify')
const commonShake = require('common-shakeify')
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
const {defaultTo} = require("lodash");

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
//Javascript node_modules dependencies
const dependencies = Object.keys(packageJSON.dependencies)
  .filter(dependency =>  dependency !== 'magic-check' ) // has no js files, only css
  .map(dependency => {
    switch (dependency) {
      case 'datatables.net-dt':
        return 'datatables.net';
      case 'jsts':
        return 'jsts/dist/jsts.min';
      default:
        return dependency;
    }
});

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
      [
        babelify, {
          babelrc: true,
          global: false,
          ignore: [/\/node_modules\//]
        }
      ],
      [ stringify, { appliesTo: { includeExtensions: ['.html', '.xml'] } } ],
      imgurify
    ]
  });
  //bundler.external(dependencies);   @TODO its still useful?     add external module node_modules on vendor
  if (production) {
    bundler.ignore('./src/index.dev.js');   // ignore dev index file (just to be safe)
  } else {
    //bundler.require(dependencies); // @TODO its still useful?
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
 * @since 3.9.0
 * Move locale files to g3w-admin client folder
 */
gulp.task('locales', function(){
  return gulp.src([
    `${g3w.localesFolder}/*.json`,
  ])
    .pipe(gulp.dest(outputFolder + '/static/client/locales/'))
})

/**
 * Deploy client and vendor images
 */
gulp.task('images', function () {
  return gulp.src([
      `${g3w.assetsFolder}/images/**/*.{png,jpg,gif,svg}`,
    /**
     * @deprecated 3.9.0
     * Each plugin need to get own images
     */
    //`${g3w.pluginsFolder}/**/*.{png,jpg,gif,svg}`,
      '!./src/**/node_modules/**/'
    ])
    .pipe(flatten())
    .pipe(gulp.dest(`${outputFolder}/static/client/images/`))
});


/**
 * Deploy datatables images (src/assets/vendors/datatables)
 */
 gulp.task('datatable-images', function () {
  return gulp.src(`./node_modules/datatables.net-dt/images/*`)
    .pipe(flatten())
    .pipe(gulp.dest(`${outputFolder}/static/client/images/`));
});

/**
 * Deploy client and vendor fonts
 */
 gulp.task('fonts', function () {
  return gulp.src([
    `${g3w.assetsFolder}/fonts/**/*.{eot,ttf,woff,woff2}`,
    `${g3w.assetsFolder}/vendors/bootstrap/fonts/**/*.{eot,ttf,woff,woff2}`,
    /**
     * @since3.9.0
     */
      './node_modules/@fortawesome/fontawesome-free/webfonts/**/*.{eot,ttf,woff,woff2}',
    /**
     * @deprecated 3.9.0
     */
    //`${g3w.pluginsFolder}/**/*.{eot,ttf,woff,woff2}`,
      '!./src/**/node_modules/**/'
    ])
    .pipe(flatten())
    .pipe(gulp.dest(outputFolder + '/static/client/fonts/'))
});

/**
 * Compile client styles (src/assets/style/less/app.less --> app.min.css)
 */
gulp.task('less', gulp.series('fonts', function() {
  return gulp.src(`${g3w.assetsFolder}/style/less/app.less`)
    .pipe(less({
      paths: [`${g3w.assetsFolder}/style/less`], // add paths where to search in @import
      plugins: [LessGlob]                        // plugin to manage globs import es: @import path/***
    }))
    //.pipe(gulpif(production, cleanCSS({ keepSpecialComments: 0 }), replace(/\w+fonts/g, 'fonts')))
    .pipe(replace(/\w+fonts/g, 'fonts')) // eg. "../webfonts/fa-regular-400.woff2" --> ""../fonts/fa-regular-400.woff2"
    .pipe(cleanCSS({ keepSpecialComments: 0 }))
    .pipe(cssnano())
    .pipe(rename('app.min.css'))
    .pipe(gulp.dest(`${outputFolder}/static/client/css/`))
}));

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
 * Concatenate and browserify vendor javascript files
 */
gulp.task('concatenate:vendor_js', function() {
  return browserify( `./src/vendors.js`, {
      transform: [
        [ babelify, { // need to use import/export ES6 module
            global: true, // https://stackoverflow.com/questions/41107756/force-browserify-to-transform-dependencies
            compact: true,
          }],
      ]
    })
    .bundle()
    .pipe(source('vendor.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(`${outputFolder}/static/client/js/`));
});

/**
 * Concatenate vendor css files
 */
gulp.task('concatenate:vendor_css', function() {
  return gulp.src([
    "./node_modules/bootstrap/dist/css/bootstrap.min.css",
    "./node_modules/magic-check/css/magic-check.min.css",
    "./node_modules/bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.css",
    "./node_modules/ol/ol.css",
    "./node_modules/select2/dist/css/select2.min.css",
    "./node_modules/c3/c3.min.css",
    "./node_modules/datatables.net-dt/css/jquery.dataTables.css",
    "./node_modules/quill/dist/quill.snow.css",
    /**
     * @since 3.9.0
     */
    './node_modules/@fortawesome/fontawesome-free/css/all.min.css',
  ])
    .pipe(concat('vendor.min.css'))
    .pipe(replace(/\w+fonts/g, 'fonts')) // eg. "../webfonts/fa-regular-400.woff2" --> ""../fonts/fa-regular-400.woff2"
    .pipe(cssnano())
    .pipe(gulp.dest(`${outputFolder}/static/client/css/`));
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
  /**
   * @since 3.9.0
   */
  gulp.watch([`${g3w.localesFolder}/*.json`],  gulp.series('locales','browser:reload'));

  gulp.watch([`${g3w.assetsFolder}/style/**/*.less`], gulp.series('less','browser:reload'));
  gulp.watch('./src/**/*.{png,jpg}',                  gulp.series('images','browser:reload'));
  gulp.watch(['./src/index.html'],                    gulp.series('html', 'browser:reload'));

  //@since 3.9.0
  gulp.watch([`${g3w.pluginsFolder}/*/locales/*.json`],      (file) => {
        const plugins = process.env.G3W_PLUGINS;
        process.env.G3W_PLUGINS = path.basename(path.dirname(file.path).split('locales')[0]);
        runSequence('deploy-locales-plugins', 'browser:reload', () => process.env.G3W_PLUGINS = plugins)
    });

  gulp.watch([`${g3w.pluginsFolder}/*/plugin.js`],      (file) => {
    const plugins = process.env.G3W_PLUGINS;
    process.env.G3W_PLUGINS = path.basename(path.dirname(file.path));
    runSequence('deploy-plugins', 'browser:reload', () => process.env.G3W_PLUGINS = plugins)
  });

  /**
   * @TEMPORARY
   */
  gulp.watch(['./src/vendors.js'], () => runSequence('concatenate:vendor_js', 'browser:reload'));

});

/**
 * Make sure that core client plugins are there
 * 
 * [submodule "src/plugins/editing"]          <-- https://github.com/g3w-suite/g3w-client-plugin-editing.git
 * [submodule "src/plugins/openrouteservice"] <-- https://github.com/g3w-suite/g3w-client-plugin-openrouteservice.git
 * [submodule "src/plugins/qplotly"]          <-- https://github.com/g3w-suite/g3w-client-plugin-qplotly.git
 * [submodule "src/plugins/qtimeseries"]      <-- https://github.com/g3w-suite/g3w-client-plugin-qtimeseries.git
 */
gulp.task('clone:default_plugins', async function() {
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
gulp.task('build:dev_plugins', async function() {
  for (const pluginName of dev_plugins) {
    console.log(H1__ + `Building plugin: ${g3w.pluginsFolder}/${pluginName}/plugin.js` + __H1);
    try {
      execSync(`gulp --gulpfile ${g3w.pluginsFolder}/${pluginName}/gulpfile.js default`, {stdio: 'inherit'});
      /**
       * Copy locales plugin folder to g3w.admin_overrides_folder plugin locales folder
       * @since 3.9.0
       * @TODO try a better way to work with
       *
       */
      execSync(`mkdir ${g3w.admin_overrides_folder}/static/${pluginName} && mkdir ${g3w.admin_overrides_folder}/static/${pluginName}/js`);
      execSync(`cp ${g3w.pluginsFolder}/${pluginName}/plugin.js ${g3w.admin_overrides_folder}/static/${pluginName}/js`);
      //assests
      //@TODO
      execSync(`cp -R ${g3w.pluginsFolder}/${pluginName}/locales ${g3w.admin_overrides_folder}/static/${pluginName}`);
      execSync(`cp -R ${g3w.pluginsFolder}/${pluginName}/images ${g3w.admin_overrides_folder}/static/${pluginName}`);
      execSync(`cp -R ${g3w.pluginsFolder}/${pluginName}/fonts ${g3w.admin_overrides_folder}/static/${pluginName}`);
    } catch(e) {
      /* soft fails on missing `gulp default` task */
    }
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
          production = response.env === 'production';
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
 * @since 3.9.0
 */
gulp.task('deploy-fonts-plugins', function() {
  const pluginNames  = process.env.G3W_PLUGINS.split(',');
  const nodePath     = path;
  const outputFolder = production ? g3w.admin_plugins_folder : g3w.admin_overrides_folder + '/static';
  return gulp.src(pluginNames.map(pluginName => `${g3w.pluginsFolder}/${pluginName}/fonts/*.{eot,ttf,woff,woff2}`))
    .pipe(rename((path, file) => {
      const pluginName   = nodePath.basename(file.base.split('fonts')[0]);
      const staticFolder = production ? `${pluginName}/static/${pluginName}/static/fonts/` : `${pluginName}/static/fonts/`;
      path.dirname = `${outputFolder}/${staticFolder}`;
      console.log(`[G3W-CLIENT] file plugins fonts updated: ${path.dirname}${path.basename}${path.extname}`);
    }))
    .pipe(gulp.dest('.'));
});

/**
 * @since 3.9.0
 */
gulp.task('deploy-images-plugins', function() {
  const pluginNames  = process.env.G3W_PLUGINS.split(',');
  const nodePath     = path;
  const outputFolder = production ? g3w.admin_plugins_folder : g3w.admin_overrides_folder + '/static';
  return gulp.src(pluginNames.map(pluginName => `${g3w.pluginsFolder}/${pluginName}/images/*.{png,jpg,gif,svg}`))
    .pipe(rename((path, file) => {
      const pluginName   = nodePath.basename(file.base.split('images')[0]);
      const staticFolder = production ? `${pluginName}/static/${pluginName}/images/` : `${pluginName}/images/`;
      path.dirname = `${outputFolder}/${staticFolder}`;
      console.log(`[G3W-CLIENT] file plugins images updated: ${path.dirname}${path.basename}${path.extname}`);
    }))
    .pipe(gulp.dest('.'));
});

/**
 * @since 3.9.0
 */
gulp.task('deploy-locales-plugins', function() {
    const pluginNames  = process.env.G3W_PLUGINS.split(',');
    const nodePath     = path;
    const outputFolder = production ? g3w.admin_plugins_folder : `${g3w.admin_overrides_folder}/static`;
    return gulp.src(pluginNames.map(pluginName => `${g3w.pluginsFolder}/${pluginName}/locales/*.json`))
        .pipe(rename((path, file) => {
            const pluginName   = nodePath.basename(file.base.split('locales')[0]);
            const staticFolder = production ? `${pluginName}/static/${pluginName}/locales/` : `${pluginName}/locales/`;
            path.dirname = `${outputFolder}/${staticFolder}`;
            console.log(`[G3W-CLIENT] file updated: ${path.dirname}${path.basename}${path.extname}`);
        }))
        .pipe(gulp.dest('.'));
});

/**
 * Deploy local developed plugins (src/plugins)
 */
gulp.task('deploy-plugin-plugins', function() {
  const pluginNames  = process.env.G3W_PLUGINS.split(',');
  const nodePath     = path;
  const outputFolder = production ? g3w.admin_plugins_folder : `${g3w.admin_overrides_folder}/static`;
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
 * @since 3.9.0
 */

gulp.task('deploy-plugins', gulp.series('deploy-plugin-plugins', 'deploy-locales-plugins', 'deploy-images-plugins', 'deploy-fonts-plugins'));

/**
 * Deploy local developed plugins (src/plugins)
 */
gulp.task('build:plugins', gulp.series('clone:default_plugins', 'select-plugins', 'deploy-plugins',));

/**
 * Compile and deploy local developed client file assets (static and templates)
 */
gulp.task('build:client', gulp.series('browserify:app', 'concatenate:vendor_js', 'concatenate:vendor_css', 'locales', 'fonts', 'images', 'less', 'datatable-images', 'html'));

/**
 * Set production to true
 */
gulp.task('production', function(){
  production = true;
  setNODE_ENV();
});
/**
 * [PROD] Compile and deploy client application
 * 
 * production   = true,
 * outputFolder = g3w.admin_plugins_folder + '/client'
 */
gulp.task('build', gulp.series(
  'production',
  // 'clean:admin',
  'clone:default_plugins',
  'build:client',
  'clean:overrides',)
);

/**
 * [DEV] Compile and deploy client application
 * 
 * production   = false,
 * outputFolder = g3w.admin_overrides_folder
 */
gulp.task('dev', gulp.series(
  // 'clean:admin',
  'clean:overrides',
  'clone:default_plugins',
  'build:dev_plugins',
  'build:client',
  'browser-sync',)
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
    const testGroupFolders = fs.readdirSync(testPath).filter(file => file !== 'group_template' && fs.statSync(`${testPath}/${file}`).isDirectory());
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


// Backward compatibilities (v3.x)
gulp.task('g3w-admin',                           gulp.series('build'));
gulp.task('g3w-admin-plugins-select',            gulp.series('build:plugins'));
gulp.task('g3w-admin-client',                    gulp.series('g3w-admin'));
gulp.task('g3w-admin:plugins',                   gulp.series('build:plugins'));
gulp.task('serve',                               gulp.series('dev'));
gulp.task('default',                             gulp.series('dev'));