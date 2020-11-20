// state of application reactive
const STATE = Vue.observable({
  ready: false,
  iframe: false,
  online: false,
  ismobile: false,
  download: false,
  upload: false,
  lng: 'en'
});

export default STATE;
