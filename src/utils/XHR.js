import { TIMEOUT }      from 'g3w-constants';
import { downloadFile } from "utils/downloadFile";

export const XHR = {

  /**
   *
   * @param url
   * @param params
   * @param signal //@since 3.11.0 (e.g. const controller = new AbortController(); const signal = controller.signal; controller.abort();)   * @return {Promise<any|string>}
   */
  async get({ url, params = {}, signal } = {}) {
    if (!url) {
      return Promise.reject('No url');
    }

    params = new URLSearchParams(JSON.parse(JSON.stringify(params || {}))).toString();

    const response = await (await fetch(url + (params ? '?' : '') + params, { signal })).text();

    // Try to parse response as JSON
    try {
      return JSON.parse(response);
    } catch(e) {
      return response;
    }
  },

  /**
   *
   * @param url
   * @param data
   * @param formdata
   * @param contentType
   * @param signal //@since 3.11.0 (e.g. const controller = new AbortController(); const signal = controller.signal; controller.abort();)
   * @return {Promise<any|string>}
   */
  async post({ url, data, formdata = false, contentType, signal } = {}) {
    if (formdata) {
      formdata = new FormData();
      Object.entries(data).forEach(([key, value]) => formdata.append(key, value));
    } else if (!contentType) {
      formdata = new URLSearchParams(JSON.parse(JSON.stringify(data || {}))).toString();
    } else {
      formdata = 'string' === typeof data  ? data : JSON.stringify(data || {});
    }

    const response = await (await fetch(url, {
      method:  'POST',
      body:    formdata,
      headers: {
        'Content-Type': contentType || 'application/x-www-form-urlencoded'
      },
      signal,
    })).text();

    // Try to parse response as JSON
    try {
      return JSON.parse(response);
    } catch(e) {
      return response;
    }
  },

  fileDownload({ url, data, httpMethod = "POST", signal } = {}) {
    let timeout;
    return new Promise(async (resolve, reject) => {
      try {
        timeout = setTimeout(() => {
          reject('Timeout');
        }, TIMEOUT);

        downloadFile({
          url:     'GET' === httpMethod ? `${url}${data ? '?' + new URLSearchParams(JSON.parse(JSON.stringify(data || {}))).toString() : ''}` : url,
          headers: {
            'Content-Type':                  'application/json',
            'Access-Control-Expose-Headers': 'Content-Disposition', //need to get filename from server
          },
          method:  httpMethod,
          data:    data && JSON.stringify(data),
          signal,
        })
        return resolve();
      } catch(e) {
        return reject(e);
      } finally {
        clearTimeout(timeout);
      }
    })

  },

  /**
   * Delete request
   *
   * @param url
   * @param data
   * @param signal
   * 
   * @returns {Promise<Response>}
   * 
   * @since 3.10.0
   */
  async delete({ url, data = {} , signal }) {
    return (await fetch(url, {
      method: 'DELETE',
      body:   JSON.stringify(data),
      signal,
    })).json();
  },

};