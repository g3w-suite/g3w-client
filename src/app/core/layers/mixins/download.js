/**
 * @TODO convert it to ES6 class (or external utils)
 * 
 * @file
 * @since 3.9.0
 */
import { DOWNLOAD_FORMATS } from 'app/constant';
import { downloadFile }     from "utils/downloadFile";

const { XHR }               = require('utils');

export default {

  /** 
   * @returns promise
   */
  getDownloadFilefromDownloadDataType(type, { data = {} }) {
    data.filtertoken = this.getFilterToken();

    if ('pdf' === type) {
      return downloadFile({
        url: this.getUrl('pdf'),
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        data: JSON.stringify(data),
        mime_type: 'application/pdf',
        method: 'POST'
      });
    }

    return XHR.fileDownload({
      url: this.getUrl('shapefile' === type ? 'shp' : type),
      data,
      httpMethod: "POST"
    });
  },

  /**
   * Get Getotiff layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getGeoTIFF({ data = {} } = {}) {
    return this.getDownloadFilefromDownloadDataType('geotiff', { data });
  },

  /**
   * Get Xls layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getXls({ data = {} } = {}) {
    return this.getDownloadFilefromDownloadDataType('xls', { data });
  },

  /**
   * Get shapefile layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getShp({ data = {} } = {}) {
    return this.getDownloadFilefromDownloadDataType('shapefile', { data });
  },

  /**
   * Get gpx layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getGpx({ data = {} } = {}) {
    return this.getDownloadFilefromDownloadDataType('gpx', { data });
  },

  /**
   * get gpkg layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getGpkg({ data = {} } = {}) {
    return this.getDownloadFilefromDownloadDataType('gpkg', { data });
  },

  /**
   * Get csv layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getCsv({ data = {} } = {}) {
    return this.getDownloadFilefromDownloadDataType('csv', { data });
  },

  /**
   * Check if it has a format to download
   * @returns {*}
   */
  isDownloadable() {
    return !!(this.getDownloadableFormats().length);
  },

  /**
   * Get downlaod formats
   * @returns {string[]}
   */
  getDownloadableFormats() {
    return Object
      .keys(DOWNLOAD_FORMATS)
      .filter(download_format => this.config[download_format])
      .map(format => DOWNLOAD_FORMATS[format].format);
  },

  /**
   * @param download url
   * @returns {string}
   */
  getDownloadUrl(format) {
    const find = Object
      .values(DOWNLOAD_FORMATS)
      .find(download_format => download_format.format === format);
    return find && find.url;
  },

  /**
   * @returns {false|*|boolean}
   */
  isGeoTIFFDownlodable() {
    return !this.isBaseLayer() && this.config.download && 'gdal' === this.config.source.type ;
  },

  /**
   * @returns {false|*|boolean}
   */
  isShpDownlodable() {
    return !this.isBaseLayer() && this.config.download && 'gdal' !== this.config.source.type;
  },

  /**
   * @returns {false|string|*}
   */
  isXlsDownlodable() {
    return !this.isBaseLayer() && this.config.download_xls;
  },

  /**
   * @returns {false|string|*}
   */
  isGpxDownlodable() {
    return !this.isBaseLayer() && this.config.download_gpx;
  },

  /**
   * @returns {false|string|*}
   */
  isGpkgDownlodable() {
    return !this.isBaseLayer() && this.config.download_gpkg;
  },

  /**
   * @returns {false|string|*}
   */
  isCsvDownlodable() {
    return !this.isBaseLayer() && this.config.download_csv;
  },

};