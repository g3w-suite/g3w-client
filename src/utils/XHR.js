import { TIMEOUT }      from 'g3w-constants';
import { downloadFile } from "utils/downloadFile";

export const XHR = {

  async get({ url, params = {} } = {}) {
    if (!url) {
      return Promise.reject('No url');
    }

    params = new URLSearchParams(JSON.parse(JSON.stringify(params || {}))).toString();

    const response = await (await fetch(url + (params ? '?' : '') + params)).text();

    // Try to parse response as JSON
    try {
      return JSON.parse(response);
    } catch(e) {
      console.warn(e);
      return response;
    }
  },

  async post({ url, data, formdata = false, contentType } = {}) {
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
    })).text();

    // Try to parse response as JSON
    try {
      return JSON.parse(response);
    } catch(e) {
      console.warn(e);
      return response;
    }
  },

  fileDownload({ url, data, httpMethod = "POST" } = {}) {
    let timeout;
    return new Promise(async (resolve, reject) => {
      try {
        timeout = setTimeout(() => {
          reject('Timeout');
        }, TIMEOUT);

        url = 'GET' === httpMethod ? `${url}${data ? '?' + new URLSearchParams(JSON.parse(JSON.stringify(data || {}))).toString() : ''}` : url;

        downloadFile({
          url:      url,
          headers: {
            'Content-Type':                  'application/json',
            'Access-Control-Expose-Headers': 'Content-Disposition', //need to get filename from server
          },
          method: httpMethod,
          data:   data && JSON.stringify(data),
        })
        return resolve();
      } catch(e) {
        console.warn(e);
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
   * 
   * @returns {Promise<Response>}
   * 
   * @since 3.10.0
   */
  async delete({ url, data = {} }) {
    return (await fetch(url, {
      method: 'DELETE',
      body: JSON.stringify(data)
    })).json();
  },

};