import { TIMEOUT }   from 'g3w-constants';

export const XHR = {

  async get({ url, params = {} } = {}) {
    if (!url) {
      return Promise.reject('No url');
    }

    params = new URLSearchParams(JSON.parse(JSON.stringify(params || {}))).toString();

    const response = await (await fetch(url + (params ? '?' : '') + params, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })).text();

    // Try to parse response as JSON
    try {
      return JSON.parse(response);
    } catch(e) {
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
      return response;
    }
  },

  fileDownload({ url, data, httpMethod = "POST" } = {}) {
    let timeoutId;
    return new Promise((resolve, reject) => {
      const promise = $.fileDownload(url, { httpMethod, data });
      timeoutId = setTimeout(() => {
        reject('Timeout');
        promise.abort();
      }, TIMEOUT);
      promise
        .done(()   => resolve())
        .fail(e  => { console.warn(e); reject(e); })
        .always(() => clearTimeout(timeoutId));
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