/**
 * @file Node.js script used to compile code within the `src` folder 
 * 
 * @since 4.1.0
 */

// polyfills
require('@ungap/with-resolvers');

// esbuild
const esbuild     = require('esbuild');

// Node.js
const fs          = require('fs');
const path        = require('path');
const readline    = require('readline');
const execSync    = require('child_process').execSync;

const packageJSON = require('./package.json');
const packageLock = require('./package-lock.json');
const g3w         = require('./config');

// TODO: make use of "process.env" instead of setting local variables
let production   = false;
let outputFolder = g3w.admin_overrides_folder;

// ANSI color codes
const YELLOW__ = '\x1b[0;93m';
const GREEN__  = '\x1b[0;32m';
const __RESET  = '\x1b[0m';
const INFO__   = GREEN__ +'### ';
const __INFO   = ' ### ' + __RESET;
const H1__     = '\n\n' + INFO__;
const __H1     = __INFO + '\n';

// Locally developed client plugins = [ g3w.plugins ]
const dev_plugins = Array.from(new Set(g3w.plugins instanceof Array ? g3w.plugins : Object.keys(g3w.plugins)));

// --- CLI ---
const args = process.argv.slice(2);
const task = args[0];

(async () => {

  switch (task) {
    case 'dev':
    case 'build':
    case 'build:ci':

      // set NODE_ENV 
      production           = 'dev' !== task;
      process.env.NODE_ENV = production ? 'production' : 'development';
      outputFolder         = production ? g3w.admin_plugins_folder + '/client' : g3w.admin_overrides_folder;

      if (dev_plugins.length) {
        console.log(INFO__ + 'LOADED PLUGINS:'   + __RESET, `{\n  ${dev_plugins.join(', ')}\n}`);
      }

      // check node modules
      if (packageJSON.version !== packageLock.version) {
        execSync('npm install', { stdio: 'inherit' });
        console.log(H1__ + 'Process exited early due to missing packages being installed' + __H1);
        process.exit();
      }

      // reset symlinks
      fs.readdirSync(g3w.pluginsFolder).forEach(pluginName => {
        if (pluginName.startsWith('g3w-admin-')) {
          fs.unlinkSync(`${g3w.pluginsFolder}/${pluginName}`);
        }
      });

      // static plugins → moved into g3w-admin (4.x)
      for (const pluginName of ['editing', 'openrouteservice', 'qplotly', 'qtimeseries' ]) {
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

      if (production) {
        /**
         * Need to remove stati and template folders only when prodcution is true
         * otherwise if we run dev and docker admin is running, /code/static and /code/templates are deleted 
         * and static and templates link to admin code and no more to overrides
        */
        // clean overrides
        fs.rmSync(`${g3w.admin_overrides_folder}/static/`,    { recursive: true, force: true });
        fs.rmSync(`${g3w.admin_overrides_folder}/templates/`, { recursive: true, force: true });
      }
      

      // update versions
      await Promise.all([''].concat(dev_plugins).map(pluginName => new Promise(done => {
        const src     = pluginName ? `${g3w.pluginsFolder}/${pluginName}` : '.';
        const version = get_version(pluginName);
        fs.readFile(`${src}/README.md`, 'utf8', function (_, data) {
          data = (data || '').toString().split("\n");
          data.splice(0, 1, pluginName ? `# g3w-client-plugin-${pluginName} v${version}` : `# G3W-CLIENT v${version}`);
          fs.writeFile(`${src}/README.md`, data.join("\n"), 'utf8', (err) => { if (err) return console.log(err); done() });
        });
      })));

      await build_app();

      if (!production) {
        start_proxy_server();
      }

    break;

    case 'help':
    default:
      console.log(`\nUsage: node gulpfile.js <task> [options]\n`);
      console.log(`Tasks:`);
      console.log(`  build         production build`);
      console.log(`  dev           development mode`);
      console.log(`  help          list available tasks`);
    break;
  }
})();

/**
 * Compile client application (src/app/main.js --> app.min.js)
 */
async function build_app() {

  const index  = `index.${production ? 'prod' : 'dev'}.js`

  console.log(INFO__ + 'App entry point:' + __RESET + ' → ' + `src/${index}` + '\n');
  console.log(INFO__ + 'Building client:' + __RESET + ' → ' + `${outputFolder}/static/client`);

  let plugins = ['client', ...dev_plugins];
  let choices = [0]; // 0 = client

  /**plugins
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
  } else if('build:ci' !== task) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(done => {
      plugins.forEach((p, i) => { console.log(`  [${i}] ${p}`); });
      rl.question('Choose plugins (comma separated, default=0): ', async (answer) => {
        rl.close();
        //filter no response (Press ENTER only)
        choices = answer.trim().split(',').map(n => parseInt(n.trim(), 10)).filter(idx => !Number.isNaN(idx));
        //Filter only plugin (idx more than 0)
        for (const idx of choices.filter(idx => idx !== 0)) {
          if (plugins[idx]) {
            await build_plugin(plugins[idx]);
          }
        }
        if (!choices.length) {
          choices = [0];
        }
        done();
      });
    });
  }

  // skip when building only specific plugins
  if (!choices.includes(0)) {
    return;
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
          build.onEnd(async result => {
            console.log(GREEN__ + '[client]' + __RESET + ' → ' + Math.round((fs.statSync(`${outputFolder}/static/client/app.min.js`).size + fs.statSync(`${outputFolder}/static/client/vendor.min.js`).size) / 1024)+ 'KB');

            // copy assets (fonts and images)
            copyDir(path.resolve('src/static'), path.resolve(outputFolder, 'static/client'));
            copyDir(path.resolve('node_modules/@fortawesome/fontawesome-free/webfonts'), path.resolve(outputFolder, 'static/client/fonts'));

            // compile app.css
            await esbuild.build({
              entryPoints: [path.resolve('src/static/app.css')],
              outfile: path.resolve(outputFolder, 'static/client/app.min.css'),
              minify: true,
              bundle: true,
              loader: {
              '.css': 'css',
              '.svg': 'file',
              '.woff': 'file',
              '.woff2': 'file',
              '.eot': 'file',
              '.ttf': 'file',
              },
              plugins: [
              {
                name: 'g3w-assets',
                setup(build) {
                build.onResolve({ filter: /\.(png|woff|woff2|eot|ttf|svg)(\?.*|#.*)?$/ }, args => {
                  args.path = args.path.replace(/\w+fonts/g, 'fonts').replace('../fonts', './fonts'); // eg. "../webfonts/fa-regular-400.woff2" --> "./fonts/fa-regular-400.woff2"
                  console.log(args.path);
                  // If the asset is inside node_modules, do not mark as external
                  return { path: args.path, external: !args.path.includes('node_modules') };
                });
                }
              }
              ]
            });

            resolve();
          })
        },
      },
    ]
  });
  if (production) {
    await ctx.rebuild();
    ctx.dispose();
  } else {
    ctx.watch();
    // watch for static files
    fs.watch(path.resolve('src/static'), { recursive: true }, (_, filename) => {
      if (filename && !filename.endsWith('.css')) { // Exclude CSS files from watch
        console.log(YELLOW__ + `File changed: ${filename}, rebuilding...` + __RESET);
        ctx.rebuild();
      }
    });
  }
  return promise;
}

/**
 * @param { string } pluginName name of plugin to build (eg. 'editing')
 * @param { boolean } watch     whether to watchify source files
 * 
 * @since 3.10.0
 */
async function build_plugin(pluginName) {

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
  const plugins = window?.initConfig?.plugins;
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
}

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

/**
 * @param { string } src  folder
 * @param { string } dest folder
 * 
 * @since 4.1.0
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      copyDir(path.join(src, entry.name), path.join(dest, entry.name));
    } else {
      fs.copyFileSync(path.join(src, entry.name), path.join(dest, entry.name));
    }
  }
}


/**
 * Proxy demo server for Local Development
 * 
 * @since 4.1.0
 */
async function start_proxy_server() {
  const http      = require('http');
  const httpProxy = require('http-proxy');
  const mime      = require('mime-types');
  const modifyResponse = require('http-proxy-response-rewrite');

  //check if valid url
  try {
    const SERVER_URL = new URL(g3w.proxy);

    const proxy      = httpProxy.createProxyServer({
      secure: false,
      changeOrigin: true,
    });

    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      let localPath;
      // proxy core and static plugins
      for (const pluginName of ['client', 'editing', 'openrouteservice', 'qplotly', 'qtimeseries']) {
        if ('client' === pluginName) {
          localPath = path.join(g3w.admin_overrides_folder, url.pathname)
        } else {
          localPath = path.join(`${g3w.pluginsFolder}/g3w-admin-${pluginName}`, url.pathname);
        }
        if (url.pathname.startsWith(`/static/${pluginName}`) && fs.existsSync(localPath)) {
          console.log(true, '→', localPath);
          const contentType = mime.lookup(localPath) || 'application/octet-stream'; // Determine MIME type
          res.setHeader('Content-Type', contentType);                               // Set the Content-Type header
          res.end(require('fs').readFileSync(localPath));
          return;
        }
      }
      console.log(false, '→', `${SERVER_URL.origin.replace(/\/$/g, '')}${url.pathname}`);
      proxy.web(req, res, { target: SERVER_URL.origin });
    });

    // replace `SERVER_URL` → `http://localhost:3000` within text/html responses
    proxy.on('proxyRes', function (proxyRes, req, res) {
      if (!proxyRes.headers['content-type'] || !proxyRes.headers['content-type'].includes('text') || req.url.startsWith('/media')) {
        return;
      }
      modifyResponse(res, proxyRes.headers['content-encoding'], function (body) {
        if (body) {
            const modifiedBody  = body.replaceAll(SERVER_URL.origin, 'http://localhost:3000');
            res.setHeader('Content-Length', Buffer.byteLength(modifiedBody));
            return modifiedBody;
        }
        return body;
    });
  });

    server.listen(3000, () => {
      console.log('\n' + GREEN__ + 'Proxy server running at: http://localhost:3000' + __RESET);
      console.log('\n' + 'Remote server: ' + SERVER_URL.origin + '\n');
    });
  } catch(e) {
    console.warn(e);
  }
 
}

