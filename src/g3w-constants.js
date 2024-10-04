/**
 * @file all contants values used on application
 * @since 3.11.0
 */

//@ts-check

/**
 * @TODO we can safely import "version" from "package.json" when we will use native ES Modules
 */
// import { version } from '../package.json';
import version      from './version';

/**
 * Same as "package.json" version
 * 
 * @type {string}
 */
export const APP_VERSION = version;

/**
 * Default editing capabilities
 * @deprecated  Will be removed in 4.x. Moved to g3w-client-plugin-editing
 * 
 * @type {string[]}
 */
export const DEFAULT_EDITING_CAPABILITIES = [
  'add_feature',
  'change_feature',
  'change_attr_feature',
  'delete_feature'
];

/**
 * @type {string[]}
 */
export const EPSG = [
  "EPSG:3003",
  "EPSG:3004",
  "EPSG:3045",
  "EPSG:3857",
  "EPSG:4326",
  "EPSG:6708",
  "EPSG:23032",
  "EPSG:23033",
  "EPSG:25833",
  "EPSG:32632",
  "EPSG:32633",
];

/**
 * fid name field referred to fid feature
 * 
 * @type {string}
 */
export const G3W_FID = 'g3w_fid'; 

/**
 * @type {Object<string, string>}
 * @since v3.5
 */
export const FILTER_OPERATORS = {
  gte:      '>=',
  lte:      '<=',
  NOT:      '!=',
  eq:       '=',
  gt:       '>',
  lt:       '<',
  IN:       'IN',
  LIKE:     'LIKE',
  ILIKE:    'ILIKE',
  AND:      'AND',
  OR:       'OR',
};

/**
 * @type {Object<string, string>}
 * @since v3.5
 */
export const FILTER_EXPRESSION_OPERATORS = {
  lte:   '<=',
  ltgt:  '!=',
  ilike: 'ILIKE',
  like:  'LIKE',
  ...FILTER_OPERATORS,
};

/**
 * Geometry fields used to exclude or get geometry information from server request
 * 
 * @type {string[]}
 */
 export const GEOMETRY_FIELDS = [
  'geometryProperty',
  'boundedBy',
  'geom',
  'the_geom',
  'geometry',
  'bbox',
  'GEOMETRY',
  'geoemtria',
  'geometria'
];

/**
 * @type {Object<string, string>}
 */
export const GEOMETRY_TYPES = {
  POINT:                 "Point",
  POINTZ:                "PointZ",
  POINTM:                "PointM",
  POINTZM:               "PointZM",
  POINT25D:              "Point25D",
  MULTIPOINT:            "MultiPoint",
  MULTIPOINTZ:           "MultiPointZ",
  MULTIPOINTM:           "MutliPointM",
  MULTIPOINTZM:          "MultiPointZM",
  MULTIPOINT25D:         "MultiPoint25D",
  LINESTRING:            "LineString", // QGis definition .GeometryType, Line intead di Linestring.
  LINESTRINGZ:           "LineStringZ",
  LINESTRINGM:           "LineStringM",
  LINESTRINGZM:          "LineStringZM",
  LINESTRING25D:         "LineString25D",
  LINE:                  "Line",
  LINEZ:                 "LineZ",
  LINEM:                 "LineM",
  LINEZM:                "LineZM",
  LINE25D:               "Line25D",
  MULTILINESTRING:       "MultiLineString",
  MULTILINESTRINGZ:      "MultiLineStringZ",
  MULTILINESTRINGM:      "MultiLineStringM",
  MULTILINESTRINGZM:     "MultiLineStringZM",
  MULTILINESTRING25D:    "MultiLineString25D",
  MULTILINE:             "MultiLine",
  MULTILINEZ:            "MultiLineZ",
  MULTILINEM:            "MultiLineM",
  MULTILINEZM:           "MultiLineZM",
  MULTILINE25D:          "MultiLine25D",
  POLYGON:               "Polygon",
  POLYGONZ:              "PolygonZ",
  POLYGONM:              "PolygonM",
  POLYGONZM:             "PolygonZM",
  POLYGON25D:            "Polygon25D",
  MULTIPOLYGON:          "MultiPolygon",
  MULTIPOLYGONZ:         "MultiPolygonZ",
  MULTIPOLYGONM:         "MultiPolygonM",
  MULTIPOLYGONZM:        "MultiPolygonZM",
  MULTIPOLYGON25D:       "MultiPolygon25D",
  GEOMETRYCOLLECTION:    "GeometryCollection",
  GEOMETRYCOLLECTIONZ:   "GeometryCollectionZ",
  GEOMETRYCOLLECTIONM:   "GeometryCollectionM",
  GEOMETRYCOLLECTIONZM:  "GeometryCollectionZM",
  GEOMETRYCOLLECTION25D: "GeometryCollection25D"
};

/**
 * @type {Array<{ value: number, label: string }>}
 * @since v3.5
 */
export const PRINT_SCALES = [
  { value: 100,       label: '1:100' },
  { value: 200,       label: '1:200' },
  { value: 500,       label: '1:500' },
  { value: 1000,      label: '1:1.000' },
  { value: 2000,      label: '1:2.000' },
  { value: 2500,      label: '1:2.500' },
  { value: 5000,      label: '1:5.000' },
  { value: 10000,     label: '1:10.000' },
  { value: 20000,     label: '1:20.000' },
  { value: 25000,     label: '1:25.000' },
  { value: 50000,     label: '1:50.000' },
  { value: 100000,    label: '1:100.000' },
  { value: 250000,    label: '1:250.000' },
  { value: 500000,    label: '1:500.000' },
  { value: 1000000,   label: '1:1.000.000' },
  { value: 2500000,   label: '1:2.500.000' },
  { value: 5000000,   label: '1:5.000.000' },
  { value: 10000000,  label: '1:10.000.000' },
  { value: 20000000,  label: '1:20.000.000'  },
  { value: 50000000,  label: '1:50.000.000' },
  { value: 100000000, label: '1:100.000.000' },
  { value: 250000000, label: '1:250.000.000' },
  { value: 500000000, label: '1:500.000.000' }
];

/**
 * Point tolerance when clicking on map
 * 
 * @type {{unit: string, value: number}}
 */
export const QUERY_POINT_TOLERANCE = {
  unit:  'pixel',
  value: 10
};

/**
 * @type {string}
 * @since v3.5
 */
export const SEARCH_ALLVALUE = '__G3W_ALL__';

/**
 * TIMEOUT (1 minute = 60000)
 * 
 * @type {number}
 */
export const TIMEOUT = 60000;

/**
 * @type {{resize: Object<string, { min: number }>}}
 * @since v3.5
 */
export const VIEWPORT = {
  resize: {
    map:     { min: 200 },
    content: { min: 200 },
  }
};

/**
 * List of default Font Awesome classes for current project
 * 
 * @type {Object<string, string>}
 * @since v3.8
 */
export const FONT_AWESOME_ICONS = {
  'change-map':     "fas fa-map-signs",
  map:              "far fa-map",
  file:             "fas fa-file-code",
  marker:           "fas fa-map-marker-alt",
  relation:         "fas fa-sitemap",
  tools:            "fas fa-cogs",
  tool:             "fas fa-cog",
  search:           "fas fa-search",
  print:            "fas fa-print",
  info:             "fas fa-info-circle",
  'info-circle':    "fas fa-info-circle",
  globe:            "fas fa-globe",
  mail:             "fas fa-envelope",
  mobile:           "fas fa-mobile",
  fax:              "fas fa-fax",
  user:             "fas fa-user",
  bars:             "fas fa-bars",
  uncheck:          "far fa-square",
  check:            "far fa-check-square",
  /** @since 3.10.0 */
  checkmark:        "fa fa-check",
  filluncheck:      "fas fa-square",
  table:            "fas fa-table",
  trash:            "fas fa-trash",
  'trash-o':        "far fa-trash-alt",
  pencil:           "fas fa-pencil-alt",
  'ellips-h':       "fas fa-ellipsis-h",
  'ellips-v':       "fas fa-ellipsis-v",
  'arrow-up':       "fas fa-chevron-up",
  'arrow-down':     "fas fa-chevron-down",
  'arrow-left':     "fas fa-chevron-left",
  'arrow-right':    "fas fa-chevron-right",
  'resize-h':       "fas fa-arrows-alt-h",
  'resize-v':       "fas fa-arrows-alt-v",
  'resize-default': "fas fa-compress",
  'caret-up':       "fas fa-caret-up",
  'caret-down':     "fas fa-caret-down",
  'caret-left':     "fas fa-caret-left",
  'caret-right':    "fas fa-caret-right",
  'empty-circle':   "far fa-circle",
  'cloud-upload':   "fas fa-cloud-upload-alt",
  spinner:          "fas fa-spinner",
  minus:            "fas fa-minus",
  "minus-square":   "far fa-minus-square",
  plus:             "fas fa-plus",
  'plus-circle':    "fas fa-plus-circle",
  'plus-square':    "far fa-plus-square",
  grid:             "fas fa-th",
  home:             "fas fa-home",
  folder:           "fas fa-folder",
  'sign-out':       "fas fa-sign-out-alt",
  close:            "fas fa-times",
  time:             "far fa-clock",
  calendar:         "fas fa-calendar-alt",
  list:             "fas fa-list-alt",
  link:             "fas fa-link",
  unlink:           "fas fa-unlink",
  eye:              "far fa-eye",
  'eye-close':      "far fa-eye-slash",
  save:             "far fa-save",
  pdf:              "fas fa-file-pdf",
  image:            "far fa-image",
  video:            "far fa-file-video",
  unknow:           "far fa-question-circle",
  zip:              "far fa-file-archive",
  text:             "far fa-file-alt",
  excel:            "far fa-file-excel",
  xls:              "far fa-file-excel",
  gpx:              "fas fa-location-arrow",
  gpkg:             "fas fa-box-open",
  shapefile:        "fas fa-file-archive",
  csv:              "fas fa-file-csv",
  geotiff:          "fas fa-th",
  ppt:              "far fa-file-powerpoint",
  circle:           "fas fa-circle",
  calculator:       "fas fa-calculator",
  picture:          "far fa-image",
  keyboard:         "far fa-keyboard",
  'file-download':  "fas fa-file-download",
  copy:             "far fa-copy",
  draw:             "fas fa-draw-polygon",
  chart:            "fas fa-chart-bar",
  'chart-line':     "fas fa-chart-line",
  'chart-area':     "fas fa-chart-area",
  'chart-pie':      "fas fa-chart-pie",
  run:              "fas fa-play",
  warning:          "fas fa-exclamation-circle",
  alert:            "fas fa-exclamation-triangle",
  crosshairs:       "fas fa-crosshairs",
  success:          "far fa-check-circle",
  back:             "fas fa-chevron-circle-left",
  'file-upload':    "fas fa-file-upload",
  wifi:             "fas fa-wifi",
  mouse:            "fas fa-mouse",
  'copy-paste':     "far fa-copy",
  'vector-square':  "fas fa-vector-square",
  download:         "fas fa-download",
  credits:          "fas fa-euro-sign",
  filter:           "fas fa-filter",
  plugin:           "fas fa-plug",
  invert:           "fas fa-exchange-alt",
  clear:            "fas fa-broom",
  palette:          "fas fa-palette",
  layers:           "fas fa-layer-group",
  'sign-in':        "fas fa-sign-in-alt",
  language:         "fas fa-language",
  target:           "fas fa-bullseye",
  pin:              "fas fa-map-pin",
  square:           "far fa-square",
  move:             "fas fa-arrows-alt",
  moon:             "fas fa-moon",
  sun:              "fas fa-sun",
  refresh:          "fas fa-sync-alt",
  pause:            "fas fa-pause",
  'step-backward':  "fas fa-step-backward",
  'fast-backward':  "fas fa-fast-backward",
  'step-forward':   "fas fa-step-forward",
  'fast-forward':   "fas fa-fast-forward",
  crop:             "fas fa-crop-alt",
  exit:             "fas fa-door-open",
  slider:           "fas fa-sliders-h",
  /** @since 3.8.0 */
  bookmark:         "fas fa-bookmark",
  /** @since 3.8.0 */
  reply:            "fas fa-reply",
  /** @since 3.8.0 */
  share:            "fas fa-share",
  /** @since 3.10.0 */
  'share-alt':      'fa fa-share-alt',
  /**@since 3.10.0 */
  'external-link':  "fa fa-external-link-alt",
  /** @since 3.11.0 */
  'pointer':        'fa fa-hand-pointer',
  /** @since 3.11.0 */
  camera:           'fas fa-camera-retro',
  /** @since 3.11.0 */
  measure:          'fas fa-ruler-horizontal',
  /** @since 3.11.0 */
  tint:             'fa fa-tint',
};

/**
 * @typedef LocalItem
 * @property {string} id unique identifier
 * @property {any} value initial value
 */

/**
 * LOCAL ITEM IDS - used to store id used by application
 * 
 * @type {Object<string, LocalItem>}
 * 
 * @since v3.8
 */
export const LOCAL_ITEM_IDS = {

  MESSAGES: {
    id:   'MESSAGES',
    value: {}
  },

  SPATIALBOOKMARKS: {
    id:    'SPATIALBOOKMARKS',
    value: {}
  },

};

/**
 * List of Open Layers spatial methods used to find features
 * 
 * @since 3.9.0
 */
export const SPATIAL_METHODS = ['intersects', 'within'];

/**
 * DPI96
 * 
 * DOTS_PER_INCH = ol.has.DEVICE_PIXEL_RATIO * 96;
 * 
 * @since 3.10.0
 */
export const DOTS_PER_INCH = 96;

/**
 * @since 3.10.0
 */
export const INCHES_PER_UNIT = {
  m:       39.37,
  degrees: 4374754
};

/**
 * Selection state 
 * 
 * @since 3.11.0
 */
export const SELECTION = {
  ALL:     '__ALL__',
  EXCLUDE: '__EXCLUDE__'
};

export default {
  APP_VERSION,
  DEFAULT_EDITING_CAPABILITIES,
  DOTS_PER_INCH,
  FILTER_OPERATORS,
  FILTER_EXPRESSION_OPERATORS,
  FONT_AWESOME_ICONS,
  G3W_FID,
  GEOMETRY_FIELDS,
  GEOMETRY_TYPES,
  INCHES_PER_UNIT,
  LOCAL_ITEM_IDS,
  PRINT_SCALES,
  QUERY_POINT_TOLERANCE,
  SEARCH_ALLVALUE,
  SPATIAL_METHODS,
  TIMEOUT,
  VIEWPORT,
};