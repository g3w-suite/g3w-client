import { TIMEOUT }   from 'app/constant';
import { promisify } from 'utils/promisify';

export const XHR = {

  async get({ url, params = {} } = {}) {
    if (!url) { return Promise.reject('No url'); }
    return promisify($.get(url, params));
  },

  post({ url, data, formdata = false, contentType } = {}, getResponseStatusHeaders = false) {
    return new Promise((resolve, reject) => {
      if (formdata) {
        const formdata = new FormData();
        for (const param in data) {
          formdata.append(param, data[param])
        }
        $.ajax({
          type: 'POST',
          url,
          data:        formdata,
          processData: false,
          contentType: false
        })
          .then((response, status, request) => { getResponseStatusHeaders ? resolve({ data: response, status, request }) : resolve(response) })
          .fail(e => { console.warn(e); reject(e); })
      } else if (contentType) {
        $.ajax({
          url,
          data,
          type:        'POST',
          processData: false,
          contentType: contentType || false
        }).then((response, status, request) => getResponseStatusHeaders ? resolve({ data: response, status, request }) : resolve(response))
          .fail(e => { console.warn(e); reject(e); })
      } else {
        $.post(url, data)
          .then((response, status, request) => getResponseStatusHeaders ? resolve({ data: response, status, request }) : resolve(response))
          .fail(e => { console.warn(e); reject(e) })
      }
    })
  },

  htmlescape(string) {
    string = string.replace("&", "&amp;");
    string = string.replace("<", "&lt;");
    string = string.replace(">", "&gt;");
    string = string.replace('"', "&quot;");
    return string;
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
        .fail((e)  => {console.warn(e); reject(e); })
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
    try {
      return (await fetch(url, {method: 'DELETE', body: JSON.stringify(data), })).json();
    } catch(e) { console.warn(e); return Promise.reject(e); }
  }
};