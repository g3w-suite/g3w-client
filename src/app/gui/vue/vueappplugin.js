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
  'ellips-h': "fas fa-ellips-h",
  'arrow-up': "fas fa-chevron-up",
  'arrow-down': "fas fa-chevron-down",
  'arrow-left': "fas fa-chevron-left",
  'arrow-right': "fas fa-chevron-right",
  'caret-up': "fas fa-caret-up",
  'caret-down': "fas fa-caret-down",
  'caret-left': "fas fa-caret-left",
  'caret-right': "fas fa-caret-right",
  'empty-circle': "far fa-circle",
  'cloud-upload': "fas fa-cloud-upload-alt",
  spinner: "fas fa-spinner",
  minus: "fas fa-minus",
  plus: "fas fa-plus",
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
  shapefile:"fas fa-download",
  csv: "fas fa-file-csv",
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
  filter: "fas fa-filter"
};

const Vueappplugin = {
  install: function(Vue, options = {}) {
    Vue.prototype.g3wtemplate = {
      font,
      get() {},
      getInfo() {
        return {
          font: this.font
        }
      },
      getInfoString() {},
      getFontClass(type) {
        return this.font[type];
      }
    };
    // set isMobile method to all Vue instances
    Vue.mixin({
      methods: {
        isMobile: function () {
          return isMobile.any
        }
      }
    })
  }
};


module.exports = Vueappplugin;
