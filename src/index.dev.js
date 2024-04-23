/**
 * @file Development entry point (app.min.js)
 * @since v3.8
 */

// include backward compatibilies
import './deprecated';

// expose global variables
import './globals';

// apply dev config overrides (config.js)
(require('../config').devConfig || (() => { })).call();

// print some debug info
window.g3wsdk.info();

// run app (index.prod.js)
require('./index.prod');

// custom map control: "Open in iframe"
g3wsdk.gui.GUI.once('ready', () => {
  g3wsdk.gui.GUI.getService('map').once('ready', function() {
    this.createMapControl('onclick',
    {
      id:            "OPENIFRAME",
      options: {
        add:         true,
        clickmap:    false,
        name:        'OPENIFRAME',
        tipLabel:    'Open in iframe',
        customClass: g3wsdk.gui.GUI.getFontClass('plugin'),
        onclick() {
          const w = window.open('about:blank', '_blank', `fullscreen=yes`);
          w.document.write(`<!doctype HTML><html><head><title>Test Iframe</title><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;display:block;}</style></head><body><iframe src="${location.href}"></iframe></body></html>`);
          // send message to iframe when app is ready
          w.addEventListener('message', e => {
            if (e.data.action === 'app:ready') {
              setTimeout(() => g3wsdk.gui.GUI.emit('iframe:message', w.document.querySelector('iframe').contentWindow, e), 2000)
            }
          }, false);
          // prevent page refresh (eg. CTRL+R)
          w.onbeforeunload = () => w.close();
        }
      },
    });
  });
});