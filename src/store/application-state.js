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
  iframe: window.top !== window.self,

  /**
   * true = application is connected
   */
  online: navigator.onLine,

  /**
   * true = application is loaded on a mobile device
   */
  ismobile: isMobile.any,
  
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
   * Store Array of loading plugins (by name)
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

  /**
   * @since 3.11.0
   */
  navbaritems: [],

  /**
   * @since 3.11.0
   */
  sidebar: {
    title: '',
    components:   [],
    /** DOM element where insert the component/panel  */
    parent:     null,
    /** barstack state. It stores the panel array */
    contentsdata: [], // Array<{ content, options }> 
  },

  contentsdata: [],

  /**
   * @since 3.11.0
   */
  viewport: {
    primaryView:  'map', // primary view (default)
    // percentage of secondary view
    secondaryPerc: 0, // setted to 0 at beginning (not visible)
    // used to store if content vertical or horizontal is  changed by resised
    resized: {
      start: false,
      'h':   false,
      'v':   false
    },
    // splitting orientation (h = horizontal, v = vertical)
    split: 'h',
    //map
    map: {
      sizes: {
        width:  0,
        height: 0
      },
      aside: false
    },
    //content
    content: {
      loading:  false,
      disabled: false,
      sizes: {
        width:  0,
        height: 0
      },
      // store the resize vertical or horizontal
      resize: {
        'h': { perc: 0 },
        'v': { perc: 0 }
      },
      aside:        true,
      showgoback:   true,
      stack:        [], // array elements of stack contents
      closable:     true, // (x) is closable
      backonclose:  false, // back on prevoius content
      contentsdata: [], // content data array
    },
    usermessage: {
      id:          null, // unique identify
      show:        false,
      title:       null,
      message:     null,
      position:    null,
      type:        null,
      draggable:   null,
      cloasable:   null,
      autoclose:   null,
      textMessage: false,
      hooks: {
        header: null,
        body:   null,
        footer: null
      }
    },
    // content of viewport (map and content)
    components: {
      map:     null,
      content: null
    },
  },

  sizes: {
    sidebar: {
      width:0
    }
  },

});

export default STATE;