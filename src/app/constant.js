/**
 * It contains all contants values used on application to
 * manage in easy way all constant values
 */
export const G3W_FID = 'g3w_fid'; //fid name field referred of fid feature
//default editing capabilities
export const DEFAULT_EDITING_CAPABILITIES = ['add_feature', 'change_feature', 'change_attr_feature', 'delete_feature'];
// TIMEOUT
export const TIMEOUT = 60000; // 1 minute

export const GEOMETRY_FIELDS = ['geometryProperty', 'boundedBy', 'geom', 'the_geom', 'geometry', 'bbox', 'GEOMETRY', 'geoemtria', 'geometria'];

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
};

export default {
  G3W_FID,
  DEFAULT_EDITING_CAPABILITIES,
  DOWNLOAD_FORMATS,
  GEOMETRY_FIELDS,
  TIMEOUT,
  EPSG
}