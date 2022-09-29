/**
 * ORIGINAL SOURCE: src/app/core/applicationstate.js@v3.4
 */

// state of application reactive
const STATE = Vue.observable({
  ready: false, // true whe application is ready
  iframe: false, // true if is loaded inside an iframe
  online: false, // true if is connected
  ismobile: false, // true if application is loaded on mobile device
  download: false, // true if there is a downloaded that is waiting
  upload: false, // upload
  baseLayerId: null,
  language: 'en', // language default
  changeProjectview: false,
  plugins: [],
  user: null,
  map: {
    epsg: '',
    unit: 'metric'
  },
  gui: {
    app: {
      disabled: false // if application is disable non cliccable (in waiting)
    },
    sidebar: {
      disabled: false // true if sidebar is disabled (not responsive)
    },
    layout: {
      __current: 'app', // store the current layout owner (app at beginning)
      app: {}
    }
  },
  keys: {
    vendorkeys: {
      google: undefined,
      bing: undefined
    }
  },
  tokens: {
    filtertoken: undefined
  }
});

/**
 * Object that store method to query STATE OF application
 * @type {{getCurrentLayout()}}
 */
export const STATE_METHODS = {};

export default STATE;