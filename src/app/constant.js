/**
 * It contains all contants values used on application to
 * manage in easy way all constant values
 */
export const G3W_FID = 'g3w_fid'; //fid name field referred of fid feature
//default editing capabilities
export const DEFAULT_EDITING_CAPABILITIES = ['add_feature', 'change_feature', 'change_attr_feature', 'delete_feature'];
// TIMEOUT
export const TIMEOUT = 60000; // 1 minute

export const DOWNLOAD_FORMATS = {
  download: {
    format: 'shapefile',
    url: 'shp'
  },
  download_xls: {
    format: 'xls',
    url: 'xls'
  },
  download_gpx: {
    format: 'gpx',
    url: 'gpx'
  },
  download_csv: {
    format: 'csv',
    url: 'csv'
  },
  download_gpkg: {
    format: 'gpkg',
    url: 'gpkg'
  }
};

export default {
  G3W_FID,
  DEFAULT_EDITING_CAPABILITIES,
  DOWNLOAD_FORMATS,
  TIMEOUT
}