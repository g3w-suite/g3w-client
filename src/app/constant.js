/**
 * @file all contants values used on application
 */

/**
 * @TODO we can safely import "version" from "package.json" when we will use native ES Modules
 */
// import { version } from '../../package.json';
import version from '../version';

/**
 * Same as "package.json" version
 */
export const APP_VERSION = version;

/**
 * Default editing capabilities 
 */
export const DEFAULT_EDITING_CAPABILITIES = [
  'add_feature',
  'change_feature',
  'change_attr_feature',
  'delete_feature'
];

export const DOWNLOAD_FORMATS = {
  download: {
    format: 'shapefile',
    url: 'shp'
  },
  download_gpkg: {
    format: 'gpkg',
    url: 'gpkg'
  },
  download_gpx: {
    format: 'gpx',
    url: 'gpx'
  },
  download_csv: {
    format: 'csv',
    url: 'csv'
  },
  download_xls: {
    format: 'xls',
    url: 'xls'
  },
  download_raster: {
    format: 'geotiff',
    url: 'geotiff'
  }
};

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
 */
export const G3W_FID = 'g3w_fid'; 

/**
 * @since v3.5
 */
export const FILTER_OPERATORS =  {
  gte: '>=',
  lte: '<=',
  NOT: '!=',
  eq: '=',
  gt: '>',
  lt: '<',
  IN: 'IN',
  'NOT IN': 'NOT IN',
  LIKE: 'LIKE',
  ILIKE: 'ILIKE',
  AND: 'AND',
  OR: 'OR',
};

/**
 * @since v3.5
 */
export const FILTER_EXPRESSION_OPERATORS = {
  lte: '<=',
  ltgt: '!=',
  ilike: 'ILIKE',
  like: 'LIKE',
  ...FILTER_OPERATORS,
};

/**
 * Geometry fields used to exclude or get geometry information from server request
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

export const GEOMETRY_TYPES = {
  POINT: "Point",
  POINTZ: "PointZ",
  POINTM: "PointM",
  POINTZM: "PointZM",
  POINT25D: "Point25D",
  MULTIPOINT: "MultiPoint",
  MULTIPOINTZ: "MultiPointZ",
  MULTIPOINTM: "MutliPointM",
  MULTIPOINTZM: "MultiPointZM",
  MULTIPOINT25D: "MultiPoint25D",
  LINESTRING: "LineString", // QGis definition .GeometryType, Line intead di Linestring.
  LINESTRINGZ: "LineStringZ",
  LINESTRINGM: "LineStringM",
  LINESTRINGZM: "LineStringZM",
  LINESTRING25D: "LineString25D",
  LINE: "Line",
  LINEZ: "LineZ",
  LINEM: "LineM",
  LINEZM: "LineZM",
  LINE25D: "Line25D",
  MULTILINESTRING: "MultiLineString",
  MULTILINESTRINGZ: "MultiLineStringZ",
  MULTILINESTRINGM: "MultiLineStringM",
  MULTILINESTRINGZM: "MultiLineStringZM",
  MULTILINESTRING25D: "MultiLineString25D",
  MULTILINE:"MultiLine",
  MULTILINEZ:"MultiLineZ",
  MULTILINEM:"MultiLineM",
  MULTILINEZM:"MultiLineZM",
  MULTILINE25D:"MultiLine25D",
  POLYGON: "Polygon",
  POLYGONZ: "PolygonZ",
  POLYGONM: "PolygonM",
  POLYGONZM: "PolygonZM",
  POLYGON25D: "Polygon25D",
  MULTIPOLYGON: "MultiPolygon",
  MULTIPOLYGONZ: "MultiPolygonZ",
  MULTIPOLYGONM: "MultiPolygonM",
  MULTIPOLYGONZM: "MultiPolygonZM",
  MULTIPOLYGON25D: "MultiPolygon25D",
  GEOMETRYCOLLECTION: "GeometryCollection",
  GEOMETRYCOLLECTIONZ: "GeometryCollectionZ",
  GEOMETRYCOLLECTIONM: "GeometryCollectionM",
  GEOMETRYCOLLECTIONZM: "GeometryCollectionZM",
  GEOMETRYCOLLECTION25D: "GeometryCollection25D"
};

export const LIST_OF_RELATIONS_TITLE = 'info.list_of_relations';
export const LIST_OF_RELATIONS_ID = '__G3W_LIST_OF_RELATIONS_ID__';

export const LOCALSTORAGE_EXTERNALWMS_ITEM = 'externalwms';

export const MAP_SETTINGS = {
  ZOOM: {
    maxScale: 1000,
  },
  ANIMATION: {
    duration: 2000
  },
  LAYER_POSITIONS: {
    default: 'top',
    getPositions(){
      return [
        'top',
        'bottom'
      ]
    }
  }
};

/**
 * @since v3.5
 */
export const PRINT_FORMATS = [
  {
    value: 'pdf',
    label: 'PDF'
  },
  {
    value: 'png',
    label: 'PNG'
  }
];

/**
 * @since v3.5
 */
export const PRINT_RESOLUTIONS = [150, 300];

/**
 * @since v3.5
 */
export const PRINT_SCALES = [
  {
    value:100,
    label:'1:100'
  },
  {
    value:200,
    label:'1:200'
  },
  {
    value:500,
    label:'1:500'
  },
  {
    value:1000,
    label:'1:1.000'
  },
  {
    value:2000,
    label:'1:2.000'
  },
  {
    value:2500,
    label:'1:2.500'
  },
  {
    value:5000,
    label:'1:5.000'
  },
  {
    value:10000,
    label:'1:10.000'
  },
  {
    value:20000,
    label:'1:20.000'
  },
  {
    value:25000,
    label:'1:25.000'
  },
  {
    value:50000,
    label:'1:50.000'
  },
  {
    value:100000,
    label:'1:100.000'
  },
  {
    value:250000,
    label:'1:250.000'
  },
  {
    value:500000,
    label:'1:500.000'
  },
  {
    value:1000000,
    label:'1:1.000.000'
  },
  {
    value:2500000,
    label:'1:2.500.000'
  },
  {
    value:5000000,
    label:'1:5.000.000'
  },
  {
    value:10000000,
    label:'1:10.000.000'
  },
  {
    value:20000000,
    label:'1:20.000.000'
  },
  {
    value:50000000,
    label:'1:50.000.000'
  },
  {
    value:100000000,
    label:'1:100.000.000'
  },
  {
    value:250000000,
    label:'1:250.000.000'
  },
  {
    value:500000000,
    label:'1:500.000.000'
  }
];

/**
 * Point tolerance when clicking on map
 * @type {{unit: string, value: number}}
 */
export const QUERY_POINT_TOLERANCE = {
  unit: 'pixel',
  value: 10
};

/**
 * @since v3.5
 */
export const SEARCH_ALLVALUE = '__G3W_ALL__';

/**
 * @since v3.5
 */
export const SEARCH_RETURN_TYPES = ['data', 'search'];

/**
 * TIMEOUT (1 minute = 60000)
 */
export const TIMEOUT = 60000;

export const TOC_LAYERS_INIT_STATUS = 'not_collapsed';
 
export const TOC_THEMES_INIT_STATUS = 'collapsed';

/**
 * @since v3.5
 */
export const VIEWPORT = {
  resize: {
    map: {
      min: 200
    },
    content: {
      min: 200
    }
  }
};

export const ZINDEXES = {
  usermessage: {
    tool: 2
  }
};

/**
 * @since v3.8
 */
export const API_BASE_URLS = {
  CRS: '/crs/'  //Example /crs/<epsg_code>
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
export const LOCALITEMSIDS = {
  SPATIALBOOKMARKS: {
    id: 'SPATIALBOOKMARKS', // id unique
    value: {} // initial value
  }
};

export default {
  APP_VERSION,
  DEFAULT_EDITING_CAPABILITIES,
  DOWNLOAD_FORMATS,
  FILTER_OPERATORS,
  FILTER_EXPRESSION_OPERATORS,
  G3W_FID,
  GEOMETRY_FIELDS,
  GEOMETRY_TYPES,
  LIST_OF_RELATIONS_TITLE,
  LIST_OF_RELATIONS_ID,
  LOCALSTORAGE_EXTERNALWMS_ITEM,
  MAP_SETTINGS,
  PRINT_FORMATS,
  PRINT_RESOLUTIONS,
  PRINT_SCALES,
  QUERY_POINT_TOLERANCE,
  SEARCH_ALLVALUE,
  SEARCH_RETURN_TYPES,
  TIMEOUT,
  TOC_LAYERS_INIT_STATUS,
  TOC_THEMES_INIT_STATUS,
  VIEWPORT,
  ZINDEXES,
  API_BASE_URLS,
  LOCALITEMSIDS
};