// state of application reactive
const STATE = Vue.observable({
  ready: false, // true whe application is ready
  iframe: false, // true if is loaded inside an iframe
  online: false, // true if is connected
  ismobile: false, // true if application is loaded on mobile device
  download: false, // true if there is a downloaded that is waiting
  upload: false, // upload
  baseLayerId: null,
  lng: 'en', // language default
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

export default STATE;
