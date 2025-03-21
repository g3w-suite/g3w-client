// polyfills
require('@ungap/with-resolvers');

// esbuild
const esbuild     = require('esbuild');

// Gulp
const gulp        = require('gulp');
const flatten     = require('gulp-flatten');
const prompt      = require('gulp-prompt');

// Node.js
const exec        = require('child_process').exec;
const execSync    = require('child_process').execSync;
const del         = require('del');
const fs          = require('fs');
const path        = require('path');

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

// moved into g3w-admin (4.x)
const static_plugins = [
  'openrouteservice',
  'qplotly',
  'qtimeseries',
];

// Built-in client plugins
const default_plugins = [
  'editing',
];

// Locally developed client plugins = [ default_plugins ] + [ g3w.plugins ]
const dev_plugins = Array.from(
  new Set(default_plugins.concat(g3w.plugins instanceof Array ? g3w.plugins : Object.keys(g3w.plugins)))
);

/**
 * @param { string } pluginName
 * 
 * @since 3.10.0
 */
function get_version(pluginName) {
  const src = (pluginName ? `${g3w.pluginsFolder}/${pluginName}` : '.');
  // delete cache of require otherwise no package.json version rests the old (cache) one
  try {
    delete require.cache[require.resolve(`${src}/package.json`)];
  } catch (e) {
    console.warn(YELLOW__ + '[WARN] ' + __RESET + 'package.json not found (' + GREEN__ + pluginName + __RESET + ')');
  }
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
 * @param { string } branchName
 * 
 * @returns { boolean } whether is a stable branch (eg. v3.9.x)
 * 
 * @since 3.10.0
 */
function is_prod_branch(branchName) {
  return ['dev', 'main', 'master'].includes(branchName) || /^v\d+\.\d+\.x$/.test(branchName);
}

setNODE_ENV();

/**
 * @param { string } pluginName name of plugin to build (eg. 'editing')
 * @param { boolean } watch     whether to watchify source files
 * 
 * @since 3.10.0
 */
const build_plugin = async (pluginName) => {

  const outputFolder = production
    ? `${g3w.admin_plugins_folder}/${pluginName}/static/${pluginName}/js/`// plugin folder (PROD env)
    : `${g3w.admin_overrides_folder}/static/${pluginName}/js/`;           // plugin folder (DEV env)

  console.log(INFO__ + `Building plugin:` + __RESET + ' → ' + outputFolder);

  const version = get_version(pluginName);
  const hash    = get_hash(pluginName);
  const branch  = get_branch(pluginName);

  const { promise, resolve } = Promise.withResolvers();

  const ctx = await esbuild.context({
    entryPoints: [`${g3w.pluginsFolder}/${pluginName}/index.js`],
    bundle:      true,
    minify:      production,
    sourcemap:   true,
    outfile:    `${outputFolder}/plugin.js`,
    define: {
      'process.env.g3w_plugin_name':    `"${pluginName}"`,
      'process.env.g3w_plugin_version': `"${is_prod_branch(branch) ? version : version.split('-')[0] + '-' + branch }"`,
      'process.env.g3w_plugin_hash':    `"${hash}"`,
      'process.env.g3w_plugin_branch':  `"${branch}"`,
    },
    plugins: [
      require('esbuild-vue')({ production }),
      {
        name: 'onBuildEnd',
        setup(build) {
          build.onEnd(result => {
            console.log(GREEN__ + '[' + pluginName + ']' + __RESET + ' → ' + Math.round(fs.statSync(`${outputFolder}plugin.js`).size / 1024) + 'KB');
            // Add "plugin.js" to git repository (eg. ./src/editing/plugin.js)
            fs.cpSync(`${outputFolder}plugin.js`, `${g3w.pluginsFolder}/${pluginName}/plugin.js`);
            resolve();
          })
        },
      }
    ],
    banner: { js: /* js */ `
(function() {
  const plugins = window?.initConfig?.group?.plugins;
  if (plugins) {
    plugins["${pluginName}"] = Object.assign(plugins["${pluginName}"] || {},
      {
        version : "${is_prod_branch(branch) ? version : version.split('-')[0] + '-' + branch }",
        hash    : "${hash}",
        branch  : "${branch}",
      });
  }
})();` }
  });
  if (production) {
    await ctx.rebuild();
    ctx.dispose();
  } else {
    ctx.watch();
  }
  return promise;
};

/**
 * Update versions within "README.md" 
 */
gulp.task('version', async function() {
  await Promise.all([''].concat(dev_plugins).map(pluginName => new Promise(done => {
    const src     = pluginName ? `${g3w.pluginsFolder}/${pluginName}` : '.';
    const version = get_version(pluginName);
    fs.readFile(`${src}/README.md`, 'utf8', function (_, data) {
      data = (data || '').toString().split("\n");
      data.splice(0, 1, pluginName ? `# g3w-client-plugin-${pluginName} v${version}` : `# G3W-CLIENT v${version}`);
      fs.writeFile(`${src}/README.md`, data.join("\n"), 'utf8', (err) => { if (err) return console.log(err); done() });
    });
  })
  ));
});

/**
 * Set production to true
 */
gulp.task('production', function(done) {
  production = true;
  setNODE_ENV();
  done();
});

gulp.task('clean:dist',      () => del([`${outputFolder}/static/*`, `${outputFolder}/templates/*`], { force: true }));
gulp.task('clean:admin',     () => del([`${g3w.admin_plugins_folder}/client/static/*`, `${g3w.admin_plugins_folder}/client/templates/*`], { force: true }));
gulp.task('clean:overrides', () => del([`${g3w.admin_overrides_folder}/static/*`, `${g3w.admin_overrides_folder}/templates/*`], { force: true }));

/**
 * Compile client application (src/app/main.js --> app.min.js)
 */
gulp.task('build:app', async function() {

  const index  = `index.${production ? 'prod' : 'dev'}.js`

  console.log('\n' + INFO__ + 'App entry point:' + __RESET + ' → ' + `src/${index}` + '\n');
  console.log(INFO__ + 'Building client:' + __RESET + ' → ' + `${outputFolder}/static/client`);

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
    dev_plugins.forEach(p => build_plugin(p)); // build all plugins (async)
  }

  const version = get_version();
  const branch  = get_branch();

  const { promise, resolve } = Promise.withResolvers();

  const ctx = await esbuild.context({
    entryPoints: {
      'app.min':    `src/${index}`,
      'vendor.min': `src/g3w-vendors.js`
    },
    bundle:      true,
    minify:      production,
    sourcemap:   true,
    outdir:    `${outputFolder}/static/client`,
    define: {
      'process.env.g3w_client_rev': `"${ is_prod_branch(branch) ? version : version.split('-')[0] + '-' + branch }"`
    },
    // loader: {
    //   '.png':  'file',
    //   '.woff': 'file',
    //   '.woff2': 'file',
    //   '.eot': 'file',
    //   '.ttf': 'file',
    //   '.svg': 'file',
    //   },
    // assetNames: 'assets/[name]-[hash]',
    plugins: [
      require('esbuild-vue')({ production }),
      {
        name: 'g3w-assets',
        setup(build) {
          build.onResolve({ filter: /\.(png|woff|woff2|eot|ttf|svg)(\?.*|#.*)?$/ }, args => {
            args.path = args.path.replace(/\w+fonts/g, 'fonts').replace('../fonts', './fonts'); // eg. "../webfonts/fa-regular-400.woff2" --> "./fonts/fa-regular-400.woff2"
            console.log(args.path);
            return {
              path: args.path,
              // Mark all assests as external
              external: true,
              // Redirect all paths starting with "images/" to "./public/images/"
              /*path.join(args.resolveDir, 'public', args.path)*/
            }
          });
          build.onEnd(result => {
            console.log(GREEN__ + '[client]' + __RESET + ' → ' + Math.round((fs.statSync(`${outputFolder}/static/client/app.min.js`).size + fs.statSync(`${outputFolder}/static/client/vendor.min.js`).size) / 1024)+ 'KB');
            try {
              fs.cpSync('./src/index.html', `${outputFolder}/templates/client/index.html`);
            } catch (e) {
              console.error('Failed to copy file:', e);
            }
            resolve();
          })
        },
      }
    ]
  });
  if (production) {
    await ctx.rebuild();
    ctx.dispose();
  } else {
    ctx.watch();
  }
  return promise;
});

/**
 * Deploy client and vendor images
 */
gulp.task('images', async function () {
  return gulp.src([
    `./src/assets/images/**/*.{png,jpg,gif,svg}`,
    `${g3w.pluginsFolder}/**/*.{png,jpg,gif,svg}`,
    `!${g3w.pluginsFolder}/g3w-admin-*/**`, //exclude admin plugins
    `!${g3w.pluginsFolder}/**/node_modules/**`,
    '!./src/**/node_modules/**'
  ])
  .pipe(flatten())
  .pipe(gulp.dest(`${outputFolder}/static/client/images/`))
});

/**
 * Deploy client cursors
 */
gulp.task('cursors', function () {
  return gulp.src([
    `./src/assets/cursors/**/*`,
  ])
  .pipe(flatten())
  .pipe(gulp.dest(`${outputFolder}/static/client/cursors/`))
});

/**
 * Deploy client and vendor fonts
 */
 gulp.task('fonts', function () {
  return gulp.src([
    `./src/assets/fonts/**/*.{eot,ttf,woff,woff2}`,
    `./node_modules/@fortawesome/fontawesome-free/webfonts//**/*.{eot,ttf,woff,woff2}`,
    `${g3w.pluginsFolder}/**/*.{eot,ttf,woff,woff2}`,
    `!${g3w.pluginsFolder}/g3w-admin-*/**`, //exclude admin plugins
    `!${g3w.pluginsFolder}/**/node_modules/**`,
    '!./src/**/node_modules/**'
  ])
  .pipe(flatten())
  .pipe(gulp.dest(`${outputFolder}/static/client/fonts/`))
});

/**
 * Deploy geocoding providers (src/assets/geocoding-providers)
 */
gulp.task('geocoding-providers', function () {
  return gulp.src(`./src/assets/geocoding-providers/*`)
    .pipe(flatten())
    .pipe(gulp.dest(`${outputFolder}/static/client/geocoding-providers/`));
});

/**
 * Symlink client plugins (admin, client, docker)
 */
gulp.task('clone:plugins', function(done) {

  console.log(H1__ + `Cloning default plugins` + __H1);

  // eg. [submodule "src/plugins/editing"] <-- https://github.com/g3w-suite/g3w-client-plugin-editing.git
  for (const pluginName of default_plugins) {
    if (!fs.existsSync(`${g3w.pluginsFolder}/${pluginName}/.git`)) {
      execSync(`git clone https://github.com/g3w-suite/g3w-client-plugin-${pluginName}.git ${g3w.pluginsFolder}/${pluginName}`, { stdio: 'inherit' });
    }
  }

  // reset symlinks
  fs.readdirSync(g3w.pluginsFolder).forEach(pluginName => {
    if (pluginName.startsWith('g3w-admin-')) {
      fs.unlinkSync(`${g3w.pluginsFolder}/${pluginName}`);
    }
  });

  // moved into g3w-admin (4.x)
  for (const pluginName of static_plugins) {
    // detect legacy plugins (git)
    if (fs.existsSync(`${g3w.pluginsFolder}/${pluginName}/.git`)) {
      console.warn(`[WARN] legacy plugin: ${g3w.pluginsFolder}/${pluginName}\n`);
    }
    // static plugins
    if (!fs.existsSync(`${g3w.pluginsFolder}/g3w-admin-${pluginName}/`) && fs.existsSync(`${g3w.admin_plugins_folder}/${pluginName}`)) {
      fs.symlinkSync(path.resolve(`${g3w.admin_plugins_folder}/${pluginName}`), path.resolve(`${g3w.pluginsFolder}/g3w-admin-${pluginName}/`), 'junction');
    }
  }

  // pip plugins
  if (g3w.docker_plugins_folder) {
    fs.readdirSync(g3w.docker_plugins_folder).forEach(pluginName => {
      if (!fs.existsSync(`${g3w.pluginsFolder}/${pluginName}`)) {
        fs.symlinkSync(path.resolve(`${g3w.docker_plugins_folder}/${pluginName}`), path.resolve(`${g3w.pluginsFolder}/${pluginName}`), 'junction');
      }
    })
  }

  done();
});

/**
 * Ask the developer which plugins want to deploy
 */
gulp.task('select-plugins', function() {
  return gulp
    .src('./package.json')
    .pipe(
      prompt.prompt({
        type:    'checkbox',
        name:    'plugins',
        message: 'Plugins',
        default: ['client'],
        // exclude from plugin list "client" and all "template_" plugins
        choices: ['client'].concat(fs.readdirSync(g3w.pluginsFolder).filter(file => {
          try {
            return !['client'].concat(static_plugins).includes(file)
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
gulp.task('build:plugins', async function() {
  if (undefined === process.env.G3W_PLUGINS) {
    console.warn('\n' + YELLOW__ + 'no plugins selected'+ __RESET + '\n');
  }
  if (process.env.G3W_PLUGINS) {
    await Promise.all(process.env.G3W_PLUGINS.split(',').filter(p => p !== 'client').map(p => build_plugin(p)));
  }
});

/**
 * Compile and deploy local developed client file assets (static and templates)
 */
gulp.task('build:client', function(done) {
  return undefined === process.env.G3W_PLUGINS || process.env.G3W_PLUGINS.includes('client')
   ? gulp.series('build:app', gulp.parallel('fonts', 'cursors', 'images'))(done)
   : done();
});

/**
 * Checks for npm inconsistencies between `package.json` and `package-json.lock` versions
 *
 * @since 3.10.0
 */
gulp.task('check:node_modules', function(done) {
  if (packageJSON.version !== packageLock.version) {
    execSync(`npm install`, { stdio: 'inherit' });
    console.log(H1__ + 'Process exited early due to missing packages being installed' + __H1);
    process.exit();
  }
  done();
});

/**
 * [PROD] Compile and deploy client application
 * 
 * production   = true,
 * outputFolder = g3w.admin_plugins_folder + '/client'
 */
gulp.task('build', gulp.series(
  'production',
  'check:node_modules',
  // 'clean:admin',
  'clone:plugins',
  'select-plugins',
  'build:plugins',
  'build:client',
  'clean:overrides',
  )
);

/**
 * [DEV] Compile and deploy client application
 * 
 * production   = false,
 * outputFolder = g3w.admin_overrides_folder
 */
gulp.task('dev', gulp.series(
  'check:node_modules',
  // 'clean:admin',
  'clean:overrides',
  'clone:plugins',
  'build:client',
  )
)