// Gulp
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
const es          = require('event-stream');

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
const packageLock = require('./package-lock.json');
const g3w         = require('./config');

///////////////////////////////////////////////////////

// TODO: make use of "process.env" instead of setting local variables
let production   = false;
let outputFolder = g3w.admin_overrides_folder;

// ANSI color codes
const YELLOW__ = '\x1b[0;93m';
const GREEN__  = '\x1b[0;32m';
const __RESET  = '\x1b[0m';
const INFO__   = GREEN__ +'\#\#\# ';
const __INFO   = ' \#\#\# ' + __RESET;
const H1__     = '\n\n' + INFO__;
const __H1     = __INFO + '\n';

// Conditionally set environmental variables (PROD / DEV)
function setNODE_ENV() {
  process.env.NODE_ENV = production ? 'production' : 'development';
  outputFolder         = production ? g3w.admin_plugins_folder + '/client' : g3w.admin_overrides_folder;
  console.log('[G3W-CLIENT] environment:',    process.env.NODE_ENV);
  console.log('[G3W-CLIENT] output folder:',  outputFolder);
  console.log(`[G3W-CLIENT] loaded plugins: {\n  ${dev_plugins.map(pluginName => (GREEN__ + pluginName + __RESET + ': '+ get_version(pluginName))).join('\n  ')}\n}\n`);
}

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
const dev_plugins = Array.from(
  new Set(default_plugins.concat(g3w.plugins instanceof Array ? plugins : Object.keys(g3w.plugins)))
);

/**
 * @param { string } pluginName
 * 
 * @since 3.10.0
 */
function get_version(pluginName) {
  const src = (pluginName ? `${g3w.pluginsFolder}/${pluginName}` : '.');
  // delete cache of require otherwise no package.json version rest the old (cache) one
  delete require.cache[require.resolve(`${src}/package.json`)];
  try {
    return require(`${src}/package.json`).version;
  } catch(e) {
    console.warn(YELLOW__ + '[WARN] ' + __RESET + 'package.json not found (' + GREEN__ + pluginName + __RESET + ')' );
  }
}

/**
 * @param { string } pluginName
 * 
 * @since 3.10.0
 */
function get_hash(pluginName) {
  const src = (pluginName ? `${g3w.pluginsFolder}/${pluginName}` : '.');
  try {
    let branch = execSync(`git -C  ${src} rev-parse --abbrev-ref HEAD`, { encoding: 'utf8' }).trim();
    if (branch && 'HEAD' !== branch.trim()) {
      return execSync(`git -C  ${src} rev-parse --short HEAD`, { encoding: 'utf8' }).trim();
    }
  } catch(err) {
    console.warn(YELLOW__ + '[WARN] ' + __RESET + 'git repository not found (' + GREEN__ + src + __RESET + ')' );
  }
}

/**
 * @param { string } pluginName
 * 
 * @since 3.10.0
 */
function get_branch(pluginName) {
  const src = (pluginName ? `${g3w.pluginsFolder}/${pluginName}` : '.');
  try {
    return execSync(`git -C  ${src} rev-parse --abbrev-ref HEAD`, { encoding: 'utf8' }).trim();
  } catch(err) {
    console.warn(YELLOW__ + '[WARN] ' + __RESET + 'git repository not found (' + GREEN__ + src + __RESET + ')' );
  }
}

/**
 * Create standard version format for app and plugins
 * 
 * @param { string } pluginName
 * 
 * @since 3.10.0
 */
function set_version(pluginName) {
  const src     = pluginName ? `${g3w.pluginsFolder}/${pluginName}` : '.';
  const version = get_version(pluginName);
  if (!pluginName) {
    fs.writeFileSync(`${src}/src/version.js`, `/* Generated by gulpfile.js, do not edit manually */\n\nexport default '${version}';`);
  }
  fs.readFile(`${src}/README.md`, 'utf8', function (_, data) {
    data = (data || '').toString().split("\n");
    data.splice(0, 1, pluginName ? `# g3w-client-plugin-${pluginName} v${version}` : `# G3W-CLIENT v${version}`);
    fs.writeFile(`${src}/README.md`, data.join("\n"), 'utf8', (err) => { if (err) return console.log(err); });
  });
}

/**
 * @param { string } branchName
 * 
 * @returns { boolean } whether is a stable branch (eg. v3.9.x)
 * 
 * @since 3.10.0
 */
function is_prod_branch(branchName) {
  return production || ['dev', 'main', 'master'].includes(branchName) || /^v\d+\.\d+\.x$/.test(branchName);
}

setNODE_ENV();

/**
 * @param { string } pluginName name of plugin to build (eg. 'editing')
 * @param { boolean } watch     whether to watchify source files
 * 
 * @since 3.10.0
 */
const browserify_plugin = (pluginName, watch = true) => {
  const src          = `${g3w.pluginsFolder}/${pluginName}`;              // plugin folder (git source)
  const outputFolder = production
    ? `${g3w.admin_plugins_folder}/${pluginName}/static/${pluginName}/js/`// plugin folder (PROD env)
    : `${g3w.admin_overrides_folder}/static/${pluginName}/js/`;           // plugin folder (DEV env)

  console.log(INFO__ + `Building plugin:` + __RESET + ' → ' + outputFolder);

  let bundler = browserify(`./${pluginName}/index.js`, {
    basedir: `${g3w.pluginsFolder}`,
    paths: [`${g3w.pluginsFolder}`],
    debug: !production,
    cache: {},
    packageCache: {},
    plugin: [
      watch && !production ? watchify : undefined,
      /* Uncomment the following in next ESM release (v4.x) */
      // esmify
    ],
    transform: [
      vueify,
      [ babelify, { babelrc: true } ],
      [ stringify, { appliesTo: { includeExtensions: ['.html'] } } ],
    ],
  })
  .on('update', ()  => watch && !production && rebundle())
  .on('log', (info) => watch && !production && gutil.log(GREEN__ + '[' + pluginName + ']' + __RESET + ' →', info));

  // remove source map file
  del([`${src}/plugin.js.map`]);

  const rebundle = () => {
    const version = get_version(pluginName);
    const hash    = get_hash(pluginName);
    const branch  = get_branch(pluginName);

    return merge(
        gulp
          .src(`./src/plugins/_version.js`),                                // NB: hardcoded file, do not use `g3w.pluginsFolder`!
        bundler
          .bundle()
          .on('error', (err) => { gutil.log(err); process.exit(); })
          .pipe(source(`${src}/build.js`))
          .pipe(buffer())
          .pipe(rename('plugin.js'))
      )
      .pipe(concat('plugin.js'))
      .pipe(replace('process.env.g3w_plugin_name', `"${pluginName}"`))
      .pipe(replace('process.env.g3w_plugin_version', `"${is_prod_branch(branch) ? version : version.split('-')[0] + '-' + branch }"`))
      .pipe(replace('process.env.g3w_plugin_hash', `"${hash}"`))
      .pipe(replace('process.env.g3w_plugin_branch', `"${branch}"`))
      .pipe(gulpif(production, sourcemaps.init()))
      .pipe(gulpif(production, uglify({ compress: { drop_console: true } }).on('error', gutil.log)))
      .pipe(gulpif(production, sourcemaps.write(src)))
      .pipe(gulp.dest(src))           // put plugin.js to plugin folder (git source)
      .pipe(gulp.dest(outputFolder)) // put plugin.js to static folder (PROD | DEV env)
      .pipe(gulpif(!production, browserSync.reload({ stream: true }))); // refresh browser after changing local files (dev mode)
  };

  return rebundle();
};

// gulp.task('clean:dist',   () => del([`${g3w.distFolder}/**/*`], { force: true }));
gulp.task('clean:dist',      () => del([`${outputFolder}/static/*`, `${outputFolder}/templates/*`], { force: true }));
gulp.task('clean:admin',     () => del([`${g3w.admin_plugins_folder}/client/static/*`, `${g3w.admin_plugins_folder}/client/templates/*`], { force: true }));
gulp.task('clean:overrides', () => del([`${g3w.admin_overrides_folder}/static/*`, `${g3w.admin_overrides_folder}/templates/*`], { force: true }));

gulp.task('html',            () => gulp.src('./src/index.html').pipe(gulp.dest(`${outputFolder}/templates/client`)));
gulp.task('browser:reload',  () => browserSync ? browserSync.reload() : null);

/**
 * Concatenate and browserify vendor javascript files
 */
gulp.task('concatenate:vendor_js', function() {
  const ext = production ? '.min' : '';
  return merge(
    gulp.src([
      `${g3w.assetsFolder}/vendors/jquery/jquery-2.2.1.min.js`,
      `${g3w.assetsFolder}/vendors/jquery-ui/jquery-ui${ext}.js`,
      `${g3w.assetsFolder}/vendors/bootstrap/js/bootstrap${ext}.js`,
      `${g3w.assetsFolder}/vendors/bootbox/bootbox.min.js`,
      `${g3w.assetsFolder}/vendors/lodash/lodash${ext}.js`,
      `${g3w.assetsFolder}/vendors/eventemitter/EventEmitter${ext}.js`,
      `${g3w.assetsFolder}/vendors/history/jquery.history.js`,
      `${g3w.assetsFolder}/vendors/signals/signals${ext}.js`,
      `${g3w.assetsFolder}/vendors/crossroads/crossroads${ext}.js`,
      `${g3w.assetsFolder}/vendors/moment/moment.js`,
      `${g3w.assetsFolder}/vendors/moment/moment-with-locales.js`,
      `${g3w.assetsFolder}/vendors/bootstrap-datetimepicker/js/bootstrap-datetimepicker.min.js`,
      `${g3w.assetsFolder}/vendors/icheck/icheck${ext}.js`,
      `${g3w.assetsFolder}/vendors/bootstrap-treeview/js/bootstrap-treeview.js`,
      `${g3w.assetsFolder}/vendors/slimScroll/jquery.slimscroll${ext}.js`,
      `${g3w.assetsFolder}/vendors/fastclick/fastclick${ext}.js`,
      `${g3w.assetsFolder}/vendors/vue/vue${ext}.js`,
      `${g3w.assetsFolder}/vendors/jquery-file-upload/jquery.fileupload.js`,
      `${g3w.assetsFolder}/vendors/jquery-fileDownload/jquery.fileDownload.js`,
      `${g3w.assetsFolder}/vendors/bootstrap-filestyle/bootstrap-filestyle.min.js`,
      `${g3w.assetsFolder}/vendors/ismobile/ismobile.min.js`,
      `${g3w.assetsFolder}/vendors/jquery-i18next/jquery-i18next${ext}.js`,
      `${g3w.assetsFolder}/vendors/i18next/i18next.min.js`,
      `${g3w.assetsFolder}/vendors/i18next/i18nextXHRBackend.min.js`,
      `${g3w.assetsFolder}/vendors/script/script${ext}.js`,
      `${g3w.assetsFolder}/vendors/x2js/xml2json.g3w.min.js`,
      `${g3w.assetsFolder}/vendors/proj4js/proj4${production ? '-src' : ''}.js`,
      `${g3w.assetsFolder}/vendors/ol/js/ol.js`,
      `${g3w.assetsFolder}/vendors/ol-rotate-feature/bundle.min.js`,
      `${g3w.assetsFolder}/vendors/jsts/jsts.min.js`,
      `${g3w.assetsFolder}/vendors/datatables/datatables${ext}.js`,
      `${g3w.assetsFolder}/vendors/shp2geojson/shp.min.js`,
      `${g3w.assetsFolder}/vendors/jszip/jszip.min.js`,
      `${g3w.assetsFolder}/vendors/filesaver/FileSaver.min.js`,
      `${g3w.assetsFolder}/vendors/select2/js/select2.full${ext}.js`,
      `${g3w.assetsFolder}/vendors/select2/js/i18n/it.js`,
      `${g3w.assetsFolder}/vendors/d3/js/d3.min.js`,
      `${g3w.assetsFolder}/vendors/c3/js/c3.min.js`,
      `${g3w.assetsFolder}/vendors/wps/js/wps-js-all.min.js`,
      `${g3w.assetsFolder}/vendors/quill/js/quill.min.js`
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
        .pipe(gulpif(production, uglify()))
    )
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest(`${outputFolder}/static/client/js/`));
});


/**
 * Compile client application (src/app/main.js --> app.min.js)
 */
gulp.task('browserify:app', function() {
  /**
   * Make sure that all g3w.plugins bundles are there
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
  if (!production) {
    console.log();                                  // print an empty line
    dev_plugins.forEach(p => browserify_plugin(p)); // build all plugins (async)
  }

  const src = `./src/index.${production ? 'prod' : 'dev'}.js`

  console.log('\n' + INFO__ + 'App entry point:' + __RESET + ' → ' + src + '\n');

  let bundler = browserify(src, {
    basedir: './',
    paths: ['./src/', './src/app/', './src/plugins/'],
    debug: !production,
    cache: {},
    packageCache: {},
    plugin: [
      production ? undefined : watchify,
      /* Uncomment the following in next ESM release (v4.x) */
      // esmify
    ],
    transform: [
      vueify,
      [ babelify, { babelrc: true } ],
      [ stringify, { appliesTo: { includeExtensions: ['.html', '.xml'] } } ],
      imgurify,
    ],
    ignore: (!production ? undefined : ['./src/index.dev.js' ]) // ignore dev index file (just to be safe)
  })
  .external(dependencies)                                       // exclude external npm dependencies
  .on('update', ()  => !production && rebundle())
  .on('log', (info) => !production && gutil.log(GREEN__ + '[client]' + __RESET + ' → ', info));

  const rebundle = () => {
    const version = get_version();
    const branch  = get_branch();

    return bundler.bundle()
    .on('error', err => {
      console.log('ERROR: running gulp task "browserify:app"', err);
      this.emit('end');
      process.exit()
      // del([
      //   `${outputFolder}/static/js/app.js`,
      //   `${outputFolder}/static/css/app.css`
      // ]).then(() => process.exit());
    })
    .pipe(source('build.js'))
    .pipe(replace('process.env.g3w_client_rev', `"${ is_prod_branch(branch) ? version : version.split('-')[0] + '-' + branch }"`))
    .pipe(buffer())
    .pipe(gulpif(production, sourcemaps.init()))
    .pipe(gulpif(production, uglify({ compress: { drop_console: true } }).on('error', gutil.log)))
    .pipe(rename('app.min.js'))
    .pipe(gulpif(production, sourcemaps.write('.')))
    .pipe(gulp.dest(outputFolder + '/static/client/js/'))
    .pipe(gulpif(!production, browserSync.reload({ stream: true }))); // refresh browser after changing local files (dev mode)
  };

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
    .pipe(gulp.dest(`${outputFolder}/static/client/images/`))
});

/**
 * Deploy datatables images (src/assets/vendors/datatables)
 */
gulp.task('datatable-images', function () {
  return gulp.src(`${g3w.assetsFolder}/vendors/datatables/DataTables-1.10.16/images/*`)
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
      `${g3w.assetsFolder}/vendors/font-awesome-5.15.4/webfonts/**/*.{eot,ttf,woff,woff2}`,
      `${g3w.pluginsFolder}/**/*.{eot,ttf,woff,woff2}`,
      '!./src/**/node_modules/**/'
    ])
    .pipe(flatten())
    .pipe(gulp.dest(`${outputFolder}/static/client/fonts/`))
});

/**
 * Deploy geocoding providers (src/assets/geocoding-providers)
 */
gulp.task('geocoding-providers', function () {
  return gulp.src(`${g3w.assetsFolder}/geocoding-providers/*`)
    .pipe(flatten())
    .pipe(gulp.dest(`${outputFolder}/static/client/geocoding-providers/`));
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
    .pipe(replace(/\w+fonts/g, 'fonts'))         // eg. "../webfonts/fa-regular-400.woff2" --> ""../fonts/fa-regular-400.woff2"
    .pipe(cleanCSS({ keepSpecialComments: 0 }))
    .pipe(rename('app.min.css'))
    .pipe(gulp.dest(`${outputFolder}/static/client/css/`))
});

/**
 * Compile less files in css (process.env.CUSTOM_LESS_FOLDER)
 */
gulp.task('custom-less', function () {
  const customLessFolder = path.join(g3w.assetsFolder, 'style', 'less', 'g3w-skins-custom', process.env.CUSTOM_LESS_FOLDER);
  return gulp.src(path.join(customLessFolder, 'main.less'))
    .pipe(concat('custom.less'))
    .pipe(less({ plugins: [LessGlob] }))         // plugin to manage globs import es: @import path/***
    .pipe(gulp.dest(`${customLessFolder}/css/`))
});

/**
 * Concatenate vendor css files
 */
gulp.task('concatenate:vendor_css', function() {
  return gulp.src([
    `${g3w.assetsFolder}/vendors/bootstrap/css/bootstrap.min.css`,
    `${g3w.assetsFolder}/vendors/bootstrap-treeview/css/bootstrap-treeview.min.css`,
    `${g3w.assetsFolder}/vendors/icheck/skins/all.css`,
    `${g3w.assetsFolder}/vendors/magic-check/magic-check.min.css`,
    `${g3w.assetsFolder}/vendors/bootstrap-datetimepicker/css/bootstrap-datetimepicker.min.css`,
    `${g3w.assetsFolder}/vendors/hint/hint.min.css`,
    `${g3w.assetsFolder}/vendors/ol/css/ol.css`,
    `${g3w.assetsFolder}/vendors/select2/css/select2.min.css`,
    `${g3w.assetsFolder}/vendors/c3/css/c3.min.css`,
    `${g3w.assetsFolder}/vendors/datatables/DataTables-1.10.16/css/jquery.dataTables.min.css`,
    `${g3w.assetsFolder}/vendors/font-awesome-5.15.4/css/all.min.css`,
    `${g3w.assetsFolder}/vendors/quill/css/quill.snow.min.css`
  ])
    .pipe(concat('vendor.min.css'))
    .pipe(replace(/\w+fonts/g, 'fonts')) // eg. "../webfonts/fa-regular-400.woff2" --> ""../fonts/fa-regular-400.woff2"
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

  gulp.watch([g3w.assetsFolder + '/style/**/*.less'], () => runSequence('less','browser:reload'));
  gulp.watch('./src/**/*.{png,jpg}',                  () => runSequence('images','browser:reload'));
  gulp.watch(['./src/index.html'],                    () => runSequence('html', 'browser:reload'));
  gulp.watch(g3w.pluginsFolder + '/_version.js',      () => dev_plugins.forEach(p => browserify_plugin(p, false)));
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
      execSync(`git clone https://github.com/g3w-suite/g3w-client-plugin-${pluginName}.git ${g3w.pluginsFolder}/${pluginName}`, { stdio: 'inherit' });
    }
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
        type: 'checkbox',
        name: 'plugins',
        message: 'Plugins',
        default: ['client'],
        // exclude from plugin list "client" and all "template_" plugins
        choices: ['client'].concat(fs.readdirSync(g3w.pluginsFolder).filter(file => {
          try {
            return file !== 'client'
              && file.indexOf('_templates') === -1
              && fs.statSync(`${g3w.pluginsFolder}/${file}`).isDirectory()
              && fs.statSync(`${g3w.pluginsFolder}/${file}/plugin.js`).isFile();
          } catch (e) {
            console.warn(`[WARN] file not found: ${g3w.pluginsFolder}/${file}/plugin.js`);
            return false;
          }
        }))
      },
      response => process.env.G3W_PLUGINS = response.plugins
    )
  );
});

/**
 * Deploy local developed plugins (src/plugins)
 */
gulp.task('build:plugins', function(done) {
  if (undefined === process.env.G3W_PLUGINS) {
    console.warn('\n' + YELLOW__ + 'no plugins selected'+ __RESET + '\n');
  }
  return process.env.G3W_PLUGINS
    ? es.merge.apply(null, process.env.G3W_PLUGINS.split(',').filter(p => p !== 'client').map(p => browserify_plugin(p, false)))
    : done;
});

/**
 * Compile and deploy local developed client file assets (static and templates)
 */
gulp.task('build:client', function(done) {
  return undefined === process.env.G3W_PLUGINS || process.env.G3W_PLUGINS.includes('client')
   ? runSequence(['browserify:app', 'concatenate:vendor_js', 'concatenate:vendor_css', 'fonts', 'images', 'less', 'datatable-images', 'html'], done)
   : done;
});

/**
 * [PROD] Compile and deploy client application
 * 
 * production   = true,
 * outputFolder = g3w.admin_plugins_folder + '/client'
 */
gulp.task('build', done => runSequence(
  'production',
  'check:node_modules',
  // 'clean:admin',
  'clone:default_plugins',
  'select-plugins',
  'build:plugins',
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
  'check:node_modules',
  // 'clean:admin',
  'clean:overrides',
  'clone:default_plugins',
  'build:client',
  'browser-sync',
  done
  )
)

/**
 * Checks for npm inconsistencies between `package.json` and `package-json.lock` versions
 *
 * @since 3.10.0
 */
gulp.task('check:node_modules', function() {
  if (packageJSON.version !== packageLock.version) {
    execSync(`npm install`, { stdio: 'inherit' });
    console.log(H1__ + 'Process exited early due to missing packages being installed' + __H1);
    process.exit();
  }
});

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
        }, () => { resolve() }).start();
      });
    }
    done();
  });
});

/**
 * Expose version of "package.json" without including whole file in published bundle,
 * this happens because each ESM `import` is actually transformed into a CJS `require()`
 * (NB: native ESM modules will not suffer from this security issue due to tree shaking)
 *
 * @see https://github.com/g3w-suite/g3w-client/issues/
 * @see src\app\constant::APP_VERSION
 * @see src\app\version
 */
gulp.task('version', function() {
  set_version();                                                                     // client
  dev_plugins.forEach(pluginName => set_version(pluginName)); // plugins
});

/**
 * Set production to true
 */
 gulp.task('production', function() {
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
gulp.task('watch:plugins',                       ['dev']);