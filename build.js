/**
 * @file Node.js script used to compile code within the `src` folder 
 * 
 * @since 4.1.0
 */

// esbuild
const esbuild     = require('esbuild');

// Node.js
const crypto      = require('crypto');
const fs          = require('fs');
const path        = require('path');
const execSync    = require('child_process').execSync;
const {
  compileStyle,
  compileTemplate,
  parse,
  rewriteDefault,
}                 = require('@vue/compiler-sfc');

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
        // clean overrides
        fs.rmSync(`${g3w.admin_overrides_folder}/static/`,    { recursive: true, force: true });
        fs.rmSync(`${g3w.admin_overrides_folder}/templates/`, { recursive: true, force: true });
      }
      

      // Keep the checked-out README's heading in sync with package.json before building.
      const readme = (await fs.promises.readFile('./README.md', 'utf8')).split('\n');
      readme.splice(0, 1, `# G3W-CLIENT v${get_version()}`);
      await fs.promises.writeFile('./README.md', readme.join('\n'), 'utf8');

      await build_app();

      if (!production) {
        start_proxy_server();
      }

    break;

    case 'help':
    default:
      console.log(`\nUsage: node build.js <task>\n`);
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
  console.log(INFO__ + 'Building client:' + __RESET + ' → ' + `${outputFolder}/static/client` + '\n');

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
      {
        name: 'g3w-vue',
        setup(build) {
          build.onResolve({ filter: /^g3w-vue:style-injector$/ }, () => ({
            path: 'style-injector',
            namespace: 'g3w-vue'
          }));

          // Keep one style element per page and inject each component's styles only once.
          build.onLoad({ filter: /^style-injector$/, namespace: 'g3w-vue' }, () => ({
            loader: 'js',
            contents: `
export default function __vue_create_injector__() {
  const styles = __vue_create_injector__.styles ||= new Set();
  return function addStyle({ id, css, media, filename }) {
    if (styles.has(id)) return;
    if (!__vue_create_injector__.element) {
      const element = document.createElement('style');
      document.head.appendChild(element);
      __vue_create_injector__.element = element;
    }
    let code = css;
    if (media) code = '@media ' + media + ' {\\n' + code + '\\n}';
    __vue_create_injector__.element.appendChild(document.createTextNode('\\n/* ' + filename + ' */\\n' + code + '\\n'));
    styles.add(id);
  };
}`,
          }));

          // Compile the subset of Vue 2 SFC syntax used by g3w-client app; script setup and
          // external, module, or preprocessed style blocks are intentionally rejected.
          build.onLoad({ filter: /\.vue$/ }, async ({ path: filename }) => {
            const source      = await fs.promises.readFile(filename, 'utf8');
            const descriptor = parse({ source, filename });
            const errors = descriptor.errors
              .filter(error => !/^tag <(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b.*has no matching end tag\.$/.test(error))
              .map(error => ({ text: error.message || String(error) }));

            if (descriptor.scriptSetup) {
              errors.push({ text: 'Vue script setup blocks are not supported.' });
            }

            // A content-derived ID keeps scoped CSS identifiers stable until the SFC changes.
            const id = crypto.createHash('sha256').update(filename + source).digest('hex').slice(0, 8);
            const scoped = descriptor.styles.some(style => style.scoped);
            let template;

            if (descriptor.template) {
              template = compileTemplate({
                source: descriptor.template.content,
                filename,
                id,
                scoped,
                isProduction: production,
                compilerOptions: { outputSourceRange: true }
              });
              errors.push(...template.errors.map(error => ({ text: error.msg || error.message || String(error) })));
            }

            const styles = descriptor.styles.map((style, index) => {
              if (style.lang || style.src || style.module) {
                errors.push({ text: `Unsupported style block in ${filename}.` });
                return null;
              }

              const result = compileStyle({
                source: style.content,
                filename,
                id: `data-v-${id}`,
                scoped: style.scoped
              });

              errors.push(...result.errors.map(error => ({ text: error.msg || error.message || String(error) })));
              return {
                id:       `${id}-${index}`,
                css:      esbuild.transformSync(result.code, { loader: 'css', minify: production }).code,
                media:    style.attrs.media || '',
                filename: path.relative(process.cwd(), filename).split(path.sep).join('/').replace(/\*\//g, '* /')
              };
            }).filter(Boolean);

            if (errors.length) {
              return { errors };
            }

            return {
              loader: 'js',
              resolveDir: path.dirname(filename),
              contents: `/* script */\n`
                + `${descriptor.script ? rewriteDefault(descriptor.script.content, '__vue_script__') : 'const __vue_script__ = {}'}\n\n/`
                + `* template */\n`
                + `${descriptor.template ? (template.code + '\nconst __vue_render__ = render;\nconst __vue_staticRenderFns__ = staticRenderFns;') : 'var __vue_render__ = undefined; var __vue_staticRenderFns__ = [];'}\n\n`
                + `const __vue_component__ = __vue_script__;\n`
                + `__vue_component__.render = __vue_render__;\n`
                + `__vue_component__.staticRenderFns = __vue_staticRenderFns__;\n`
                + `__vue_component__._compiled = true;\n`
                + `__vue_component__.__file = ${JSON.stringify(filename)};\n`
                + `${scoped ? `__vue_component__._scopeId = ${JSON.stringify(`data-v-${id}`)};` : ''}\n`
                + `/* style inject */\n`
                + `${styles.length ? `import __vue_create_injector__ from 'g3w-vue:style-injector';\n${JSON.stringify(styles)}.forEach(__vue_create_injector__());` : ''}\n`
                + `export default __vue_component__;`,
            };
          });
        }
      },
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
            if (result.errors.length) {
              console.error(await esbuild.formatMessages(result.errors, { kind: 'error', color: true }));
              return;
            }

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
    const result = await ctx.rebuild();
    if (result.errors.length) {
      process.exitCode = 1;
    }
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

function get_version() {
  // delete cache of require otherwise no package.json version rests the old (cache) one
  try {
    delete require.cache[require.resolve('./package.json')];
    return require('./package.json').version;
  } catch (error) {
    return packageJSON.version;
  }
}

function get_branch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch(err) {
    console.warn(YELLOW__ + '[WARN] ' + __RESET + 'git repository not found');
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

