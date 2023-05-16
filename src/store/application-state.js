/**
 * @since 3.9.0
 */
import VueI18n from "vue-i18n";

const i18nConfig = {
  locale: null, // set locale
  fallbackLocale: 'en',
  messages: {}
}

const i18n = new VueI18n(i18nConfig);


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
   * @since 3.9.0
   */
  i18n,

  /**
   * @FIXME add description
   */
  changeProjectview: false,

  /**
   * @FIXME add description
   */
  plugins: [],

  /**
   * @FIXME add description
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
   * @FIXME add description
   */
  keys: {
    vendorkeys: {
      google: undefined,
      bing: undefined
    }
  },

  /**
   * @FIXME add description
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