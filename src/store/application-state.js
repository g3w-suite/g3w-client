/**
 * @file State and methods to query the STATE of application
 * @since v3.6
 */

/**
 * State of application reactive
 * @type {object}
 */
const STATE = Vue.observable({

  /**
   * true = application is ready
   */
  ready: false,

  /**
   * true = application is loaded inside an iframe
   */
  iframe: false,

  /**
   * true = application is connected
   */
  online: false,

  /**
   * true = application is loaded on mobile device
   */
  ismobile: false,
  
  /**
   * true = there is a pending download 
   */
  download: false,

  /**
   * true = there is a pending upload
   */
  upload: false,

  /**
   * @FIXME add description
   */
  baseLayerId: null,

  /**
   * en = default language
   */
  language: 'en',

  /**
   * @deprecated Since v3.8. Will be deleted in v4.x. Use ApplicationState.language instead
   */
  lng: 'en',

  /**
   * @FIXME add description
   */
  changeProjectview: false,

  /**
   * Store Array of loading plugin name add by ApplicationService.loadingPlugin
   * Every time a plugin is loaded, plugin name are removed from Array
   * It used in v-plugins directive
   */
  plugins: [],

  /**
   * Store application current user
   */
  user: null,

  /**
   * @FIXME add description
   */
  map: {
    epsg: '',
    unit: 'metric'
  },

  /**
   * @FIXME add description
   */
  gui: {

    app: {
      /**
       * true = application is disabled and unclickable (waiting)
       */
      disabled: false
    },

    sidebar: {
      /**
       * true = sidebar is disabled (not responsive)
       */
      disabled: false // 
    },

    layout: {
      /**
       * store the current layout owner ("app" = default)
       */
      __current: 'app',

      /**
       * @FIXME add description
       */
      app: {}

    }

  },

  /**
   * Sore vendor keys need by application third part script
   */
  keys: {
    vendorkeys: {
      google: undefined,
      bing: undefined
    }
  },

  /**
   * Store tokens, used by server for example to filter features
   */
  tokens: {
    filtertoken: undefined
  }

});

/**
 * Store methods to query STATE of application
 * 
 * @type {object}
 */
export const STATE_METHODS = {};

export default STATE;