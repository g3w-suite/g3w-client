// state of application reactive
const STATE = Vue.observable({
  ready: false,
  iframe: false,
  online: false,
  ismobile: false,
  baseLayerId: null,
  lng: 'en',
  keys: {
    vendorkeys: {
      google: void 0,
      bing: void 0
    }
  }
});


export default STATE;
