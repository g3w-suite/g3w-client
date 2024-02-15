/**
 * @TODO convert it to ES6 class (or external utils)
 * 
 * @file
 * @since 3.9.0
 */
import { DOWNLOAD_FORMATS } from 'app/constant';
const { XHR }               = require('utils');

export default {

  /** 
   * @returns promise
   */
  getDownloadFilefromDownloadDataType(type, {
    data = {},
    options,
  }) {
    data.filtertoken = this.getFilterToken();
    switch (type) {
      case 'shapefile': return this.getShp({data, options});
      case 'xls':       return this.getXls({data, options});
      case 'csv':       return this.getCsv({data, options});
      case 'gpx':       return this.getGpx({data, options});
      case 'gpkg':      return this.getGpkg({data, options});
      case 'geotiff':   return this.getGeoTIFF({ data, options });
    }
  },

  /**
   * Get Getotiff layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getGeoTIFF({ data = {} } = {}) {
    data.filtertoken = this.getFilterToken();
    return XHR.fileDownload({
      url: this.getUrl('geotiff'),
      data,
      httpMethod: "POST"
    })
  },

  /**
   * Get Xls layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getXls({ data = {} } = {}) {
    data.filtertoken = this.getFilterToken();
    return XHR.fileDownload({
      url: this.getUrl('xls'),
      data,
      httpMethod: "POST"
    })
  },

  /**
   * Get shapefile layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getShp({ data = {} } = {}) {
    data.filtertoken = this.getFilterToken();
    return XHR.fileDownload({
      url: this.getUrl('shp'),
      data,
      httpMethod: "POST"
    })
  },

  /**
   * Get gpx layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getGpx({ data = {} } = {}) {
    data.filtertoken = this.getFilterToken();
    return XHR.fileDownload({
      url: this.getUrl('gpx'),
      data,
      httpMethod: "POST"
    })
  },

  /**
   * get gpkg layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getGpkg({ data = {} } = {}) {
    data.filtertoken = this.getFilterToken();
    return XHR.fileDownload({
      url: this.getUrl('gpkg'),
      data,
      httpMethod: "POST"
    })
  },

  /**
   * Get csv layer format
   * @param data
   * @returns {Promise | Promise<unknown>}
   */
  getCsv({ data = {} } = {}) {
    data.filtertoken = this.getFilterToken();
    return XHR.fileDownload({
      url: this.getUrl('csv'),
      data,
      httpMethod: "POST"
    })
  },

  /**
   * Check if it has a format to download
   * @returns {*}
   */
  isDownloadable() {
    return (
      this.isShpDownlodable()  ||
      this.isXlsDownlodable()  ||
      this.isGpxDownlodable()  ||
      this.isGpkgDownlodable() ||
      this.isCsvDownlodable()
    );
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