// state of application reactive
const STATE = Vue.observable({
  ready: false,
  iframe: false,
  online: false,
  ismobile: false,
  download: false,
  upload: false,
  lng: 'en',
  plugins: [],
  keys: {
    vendorkeys: {
      google: null,
      bing: null
    }
  },
  tokens: {
    filtertoken: null
  }
});


export default STATE;
