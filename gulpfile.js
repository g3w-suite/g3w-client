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
const gutil       = require('gulp-util');
const useref      = require('gulp-useref'); // used to parse index.dev.html

// Gulp vinyl (virtual memory filesystem stuff)
const buffer      = require('vinyl-buffer');
const source      = require('vinyl-source-stream');

// Node.js
const del         = require('del');
const fs          = require('fs');
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
///////////////////////////////////////////////////////

const runSequence = require('run-sequence'); // same as "gulp.series" (v4)

const packageJSON = require('./package.json');
const g3w         = require('./config');

///////////////////////////////////////////////////////

// TODO: make use of "process.env" instead of setting local variables
let production = false;

// Retrieve project dependencies ("g3w-client")
const dependencies = Object.keys(packageJSON.dependencies).filter(dep => dep !== 'vue');

// production const to set environmental variable
function setNODE_ENV() {
  process.env.NODE_ENV = production ? 'production' : 'development';
}

setNODE_ENV();

gulp.task('clean:dist',   () => del([`${g3w.distFolder}/**/*`], { force: true }));
gulp.task('clean:vendor', () => del([`${g3w.clientFolder}/js/vendor.node_modules.min.js`], {force: true}));
gulp.task('clean:app',    () => del([`${g3w.clientFolder}/js/app.js`, `${g3w.clientFolder}/css/app.css`], { force: true }));
gulp.task('clean:admin',  () => del([`${g3w.admin_static_folder}/client/js/*`, `${g3w.admin_static_folder}/client/css/*`, `${g3w.admin_templates_folder}/client/index.html`], { force: true }));

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
 * Concatenate browserify vendor with vendor file inside assets specify in index.html.js
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
      .pipe(gulpif(production, uglify({ compress: { drop_console: true } }).on('error', gutil.log)))
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
    .pipe(rename({ basename: 'index', extname: '.html' }))
    .pipe(gulp.dest(g3w.clientFolder));
});

gulp.task('browser-sync', function() {
  const proxy = httpProxy
    .createProxyServer({ target: g3w.proxy.url })
    .on('error', e => gutil.log(e));

  browserSync.init({
    server: {
      baseDir: ['src', '.'],
      middleware: [
        (req, res, next) => {
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
    port: g3w.port,
    open: false,
    startPath: '/',
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
  // gulp.watch([g3w.assetsFolder + '/style/**/*.less', g3w.pluginsFolder + '/**/*.less'], gulp.series('less', 'browser:reload'));
  // gulp.watch([g3w.assetsFolder + '/style/skins/*.less'],                                gulp.series('browser:reload'));
  // gulp.watch('./src/**/*.{png,jpg}',                                         gulp.series('images', 'browser:reload'));
  // gulp.watch(g3w.pluginsFolder + '/**/plugin.js',                            gulp.series('plugins', 'browser:reload'));
  // gulp.watch(g3w.pluginsFolder + '/**/style/less/plugin.less',               gulp.series('less', 'browser:reload'));
  // gulp.watch([g3w.pluginsFolder + '/*/index.*.html'],                        gulp.series('build_external_assets', 'browser:reload'));
  // gulp.watch(g3w.assetsFolder + '/vendors/index.*.html',                                gulp.series('build_external_assets', 'browser:reload'));
  // gulp.watch(['./src/index.html', './src/**/*.html'],                        gulp.series('browser:reload'));
  gulp.watch([g3w.assetsFolder + '/style/**/*.less', g3w.pluginsFolder + '/**/*.less'], () => runSequence('less','browser:reload'));
  gulp.watch([g3w.assetsFolder + '/style/skins/*.less'],                                () => runSequence('less:skins','browser:reload'));
  gulp.watch('./src/**/*.{png,jpg}',                                                    () => runSequence('images','browser:reload'));
  gulp.watch(g3w.pluginsFolder + '/**/plugin.js',                                       () => runSequence('plugins','browser:reload'));
  gulp.watch(g3w.pluginsFolder + '/**/style/less/plugin.less',                          () => runSequence('less','browser:reload'));
  gulp.watch(g3w.pluginsFolder + '/*/index.*.html',                                     () => runSequence('build_external_assets','browser:reload'));
  gulp.watch(g3w.assetsFolder + './assets/vendors/index.*.html',                        () => runSequence('build_external_assets','browser:reload'));
  gulp.watch(['./src/index.html','./src/**/*.html'],                                    () => browserSync.reload());  
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
gulp.task('dist', done => runSequence('clean:dist', 'production', 'browserify:app', 'browserify:vendor', 'html:dev', 'concatenate:vendor', 'clean:vendor', 'html:prod', 'clean:app', done));

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

gulp.task('deploy-plugins', function(done) {
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

/**
 * Task plugins
 */
gulp.task('g3w-admin:plugins', done => runSequence('plugins', 'select-plugins', 'deploy-plugins',  done));

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
gulp.task('g3w-admin', done => runSequence('dist', 'clean:admin', 'g3w-admin:static', 'g3w-admin:templates', 'g3w-admin:plugins', done));

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
gulp.task('dev', done => runSequence('build_external_assets', 'clean:dist', 'browserify:app', 'assets', 'plugins', 'watch', 'browser-sync', done));

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
gulp.task('clean',                               ['clean:dist']);
gulp.task('clean_vendor_node_modules_min',       ['clean:vendor']);
gulp.task('cleanup',                             ['clean:app']);
gulp.task('g3w-admin-client:clear',              ['clean:admin']);
gulp.task('sethasvalues',                        []);
gulp.task('concatenate_node_modules_vendor_min', ['concatenate:vendor']);
gulp.task('browserify',                          ['browserify:app']);
gulp.task('add_external_resources_to_main_html', ['build_external_assets']);
gulp.task('html',                                ['html:dev']);
gulp.task('html:compiletemplate',                ['html:prod']);
gulp.task('g3w-admin-plugins-select',            ['g3w-admin:plugins']);
gulp.task('g3w-admin-client:static',             ['g3w-admin:static']);
gulp.task('g3w-admin-client:template',           ['g3w-admin:templates']);
gulp.task('serve',                               ['dev']);
gulp.task('g3w-admin-client_test',               [/*'g3w-admin-client:static','g3w-admin-client:template', 'g3w-admin-client:check_client_version'*/]);
gulp.task('g3w-admin-client',                    ['g3w-admin']);
gulp.task('default',                             ['dev']);

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

//////////////////////////////////////////////////////////////////////////