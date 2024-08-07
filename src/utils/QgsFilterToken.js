/**
 * @file something related to qdjango sessions tokens?
 * @since 3.9.0
 */

import { XHR } from 'utils';

export const QgsFilterToken = {

  /**
   * Save filtertoken
   * 
   * @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=save&name=<name_filter_saved>
   * 
   * @param {string} name
   * 
   * @returns { Promise }
   * 
   * @since 3.9.0
   */
  async save(url, name) {
    const response = await XHR.get({ url, params: { mode: 'save', name } });
    if (response && response.result && response.data) {
      return response.data;
    }
  },

  /**
   * Apply filtertoken
   * 
   * @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=apply&fid=<fid_filter_saved>|name=<name_filter_saved>
   * 
   * @param fid
   * 
   * @returns { Promise }
   * 
   * @since 3.9.0
   */
  async apply(url, fid) {
    try {
      const response = await XHR.get({ url, params: { mode: 'apply', fid } });
      if (response && response.result && response.data) {
        return response.data;
      }
    } catch(err) {
      console.warn(err);
    }
  },

  /**
   * Delete saved filter from server --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete_saved&fid=<fid_filter_saved>|name=<name_filter_saved>`
   * Delete current filter           --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete`
   * 
   * token: current token if provide
   * action: create, update, delete
   * 
   * @returns filter token if another layer is filtered otherwise filtertoken is undefined
   * 
   * @since 3.9.0
   */
  async delete(url, fid) {
    try {
      const response = await XHR
        .get({
          url,
          params: {
            mode: undefined === fid ? 'delete': 'delete_saved',
            fid
          }
        });
      //server can return filter token or not. Depend on if layer is filtered or not
      if (response && response.result && response.data) {
        return response.data.filtertoken;
      }
    } catch(err) {
      console.warn(err)
    }
  },

  /**
   * Get filter token
   * 
   * @since 3.9.0
   */
  async getToken(url, params = {}) {
    try {
      const { data = {} } = await XHR.get({url, params});
      return data.filtertoken;
    } catch(e) {
      return Promise.reject(e);
    }
  },

};