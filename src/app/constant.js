/**
 * It contains all contants values used on application to
 * manage in easy way all constant values
 */
export const G3W_FID = 'g3w_fid'; //fid name field referred of fid feature
//default editing capabilities
export const DEFAULT_EDITING_CAPABILITIES = ['add_feature', 'change_feature', 'change_attr_feature', 'delete_feature'];
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

export const LIST_OF_RELATIONS_TITLE = '__G3W_LIST_OF_RELATIONS_TITLE__';

export default {
  G3W_FID,
  DEFAULT_EDITING_CAPABILITIES,
  QUERY_POINT_TOLERANCE,
  DOWNLOAD_FORMATS,
  LIST_OF_RELATIONS_TITLE,
  TIMEOUT
}