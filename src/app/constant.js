/**
 * It contains all contants values used on application to
 * manage in easy way all constant values
 */
export const G3W_FID = 'g3w_fid'; //fid name field referred of fid feature
//default editing capabilities
export const DEFAULT_EDITING_CAPABILITIES = ['add_feature', 'change_feature', 'change_attr_feature', 'delete_feature'];

//Geometry fields used to exlude or get geometry information from server request
export const GEOMETRY_FIELDS = ['geometryProperty', 'boundedBy', 'geom', 'the_geom', 'geometry', 'bbox', 'GEOMETRY', 'geoemtria', 'geometria'];
// TIMEOUT
export const TIMEOUT = 60000; // 1 minute

/**
 * Used to point tolerance when click to map
 * @type {{unit: string, value: number}}
 */
export const QUERY_POINT_TOLERANCE = {
  unit: 'pixel',
  value: 10
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

export const LIST_OF_RELATIONS_TITLE = '__G3W_LIST_OF_RELATIONS_TITLE__';

export const LOCALSTORAGE_EXTERNALWMS_ITEM = 'externalwms';

export const TOC_LAYERS_INIT_STATUS = 'not_collapsed';

export const TOC_THEMES_INIT_STATUS = 'collapsed';

/**
 * ORIGINAL SOURCE: gui/print/formats::scale@v3.4
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
 * ORIGINAL SOURCE: gui/print/dpis::scale@v3.4
 */
export const PRINT_RESOLUTIONS = [150, 300];

/**
 * ORIGINAL SOURCE: gui/print/printconfig::scale@v3.4
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
 * ORIGINAL SOURCE: gui/constraints::viewport@v3.4
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

export default {
  G3W_FID,
  DEFAULT_EDITING_CAPABILITIES,
  QUERY_POINT_TOLERANCE,
  DOWNLOAD_FORMATS,
  GEOMETRY_FIELDS,
  LIST_OF_RELATIONS_TITLE,
  MAP_SETTINGS,
  TIMEOUT,
  LOCALSTORAGE_EXTERNALWMS_ITEM,
  TOC_LAYERS_INIT_STATUS,
  TOC_THEMES_INIT_STATUS,
  VIEWPORT,
  PRINT_FORMATS,
  PRINT_RESOLUTIONS,
  PRINT_SCALES,
}