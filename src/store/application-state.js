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
   * true = application is loaded on a mobile device
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
   * Store current map base layer id
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
   * Store Array of loading plugin name adds by ApplicationService.loadingPlugin
   * Every time a plugin is loaded, plugin name is removed from Array
   * It used in v-plugins directive
   */
  plugins: [],

  /**
   * Store application current user
   */
  user: null,

  /**
   * Store info of the application map
   */
  map: {
    epsg: '',
    unit: 'metric'
  },

  /**
   * Store info of the elements of GUI of the application
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
       * Store application layout info (rightpanel)
       */
      app:       {}

    }

  },

  /**
   * Sore vendor keys need it by application third part script
   */
  keys: {
    vendorkeys: {
      google: undefined,
      bing:   undefined
    }
  },

  /**
   * Store tokens, used by server, for example, to filter features
   */
  tokens: {
    filtertoken: undefined
  },

  /**
   * @since 3.10.0
   */
  querybuilder: {
    cache:    {},
    searches: JSON.parse(window.localStorage.getItem('QUERYBUILDERSEARCHES') || "{}"),
  },

});

/**
 * Store methods to query STATE of application
 * 
 * @type {object}
 */
export const STATE_METHODS = {};

export default STATE;