//fownawsome class
const font = {
  'change-map': "fas fa-map-signs",
  map: "far fa-map",
  file: "fas fa-file-code",
  marker: "fas fa-map-marker-alt",
  relation: "fas fa-sitemap",
  tools: "fas fa-cogs",
  tool: "fas fa-cog",
  search: "fas fa-search",
  print: "fas fa-print",
  info: "fas fa-info-circle",
  'info-circle': "fas fa-info-circle",
  globe: "fas fa-globe",
  mail: "fas fa-envelope",
  mobile: "fas fa-mobile",
  fax: "fas fa-fax",
  user: "fas fa-user",
  bars: "fas fa-bars",
  uncheck: "far fa-square",
  check: "far fa-check-square",
  filluncheck: "fas fa-square",
  table: "fas fa-table",
  trash: "fas fa-trash",
  'trash-o':"far fa-trash-alt",
  pencil: "fas fa-pencil-alt",
  'ellips-h': "fas fa-ellipsis-h",
  'ellips-v': "fas fa-ellipsis-v",
  'arrow-up': "fas fa-chevron-up",
  'arrow-down': "fas fa-chevron-down",
  'arrow-left': "fas fa-chevron-left",
  'arrow-right': "fas fa-chevron-right",
  'resize-h': "fas fa-arrows-alt-h",
  'resize-v': "fas fa-arrows-alt-v",
  'resize-default': "fas fa-compress",
  'caret-up': "fas fa-caret-up",
  'caret-down': "fas fa-caret-down",
  'caret-left': "fas fa-caret-left",
  'caret-right': "fas fa-caret-right",
  'empty-circle': "far fa-circle",
  'cloud-upload': "fas fa-cloud-upload-alt",
  spinner: "fas fa-spinner",
  minus: "fas fa-minus",
  "minus-square":"far fa-minus-square",
  plus: "fas fa-plus",
  'plus-circle': "fas fa-plus-circle",
  'plus-square': "far fa-plus-square",
  grid: "fas fa-th",
  home: "fas fa-home",
  folder: "fas fa-folder",
  'sign-out': "fas fa-sign-out-alt",
  close: "fas fa-times",
  time: "far fa-clock",
  calendar: "fas fa-calendar-alt",
  list: "fas fa-list-alt",
  link: "fas fa-link",
  unlink: "fas fa-unlink",
  eye: "far fa-eye",
  'eye-close': "far fa-eye-slash",
  save: "far fa-save",
  pdf: "fas fa-file-pdf",
  image: "far fa-image",
  video: "far fa-file-video",
  unknow:"far fa-question-circle",
  zip: "far fa-file-archive",
  text: "far fa-file-alt",
  excel: "far fa-file-excel",
  xls:"far fa-file-excel",
  gpx: "fas fa-location-arrow",
  gpkg: "fas fa-box-open",
  shapefile:"fas fa-file-archive",
  csv: "fas fa-file-csv",
  geotiff: "fas fa-th",
  ppt: "far fa-file-powerpoint",
  circle: "fas fa-circle",
  calculator: "fas fa-calculator",
  picture: "far fa-image",
  keyboard: "far fa-keyboard",
  'file-download':"fas fa-file-download",
  copy: "far fa-copy",
  draw: "fas fa-draw-polygon",
  chart: "fas fa-chart-bar",
  'chart-line': "fas fa-chart-line",
  'chart-area': "fas fa-chart-area",
  'chart-pie': "fas fa-chart-pie",
  run: "fas fa-play",
  warning: "fas fa-exclamation-circle",
  alert: "fas fa-exclamation-triangle",
  crosshairs: "fas fa-crosshairs",
  success: "far fa-check-circle",
  back: "fas fa-chevron-circle-left",
  'file-upload': "fas fa-file-upload",
  wifi: "fas fa-wifi",
  mouse: "fas fa-mouse",
  'copy-paste': "far fa-copy",
  'vector-square': "fas fa-vector-square",
  download: "fas fa-download",
  credits: "fas fa-euro-sign",
  filter: "fas fa-filter",
  plugin: "fas fa-plug",
  invert: "fas fa-exchange-alt",
  clear: "fas fa-broom",
  palette: "fas fa-palette",
  layers: "fas fa-layer-group",
  'sign-in': "fas fa-sign-in-alt",
  language: "fas fa-language",
  target: "fas fa-bullseye",
  pin: "fas fa-map-pin",
  square: "far fa-square",
  move: "fas fa-arrows-alt",
  moon: "fas fa-moon",
  sun: "fas fa-sun",
  refresh: "fas fa-sync-alt",
  pause:"fas fa-pause",
  'step-backward': "fas fa-step-backward",
  'fast-backward': "fas fa-fast-backward",
  'step-forward': "fas fa-step-forward",
  'fast-forward': "fas fa-fast-forward",
  crop: "fas fa-crop-alt"
};

const Vueappplugin = {
  install(Vue, options = {}) {
    Vue.prototype.g3wtemplate = {
      font,
      get() {},
      getInfo() {
        return {
          font: this.font
        }
      },
      addFontClass({name, className}={}){
        let added = this.font[name] === undefined;
        if (added) this.font[name] = className;
        return added;
      },
      getInfoString() {},
      getFontClass(type) {
        return this.font[type];
      }
    };
    // set isMobile method to all Vue instances
    Vue.mixin({
      methods: {
        isMobile () {
          return isMobile.any
        }
      }
    })
  }
};


export default  Vueappplugin;
