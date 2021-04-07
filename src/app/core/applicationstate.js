// state of application reactive
const STATE = Vue.observable({
  ready: false,
  iframe: false,
  online: false,
  ismobile: false,
  download: false,
  upload: false,
  baseLayerId: null,
  lng: 'en',
  plugins: [],
  map: {
    epsg: ''
  },
  gui: {
    app: {
      disabled: false
    },
    sidebar: {
      disabled: false
    }
  },
  keys: {
    vendorkeys: {
      google: void 0,
      bing: void 0
    }
  },
  tokens: {
    filtertoken: void 0
  }
});


export default STATE;
