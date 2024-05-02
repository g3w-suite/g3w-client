import { TIMEOUT }   from 'app/constant';
import { promisify } from 'utils/promisify';

export const XHR = {

  async get({ url, params={} } = {}) {
    if (!url) {
      return Promise.reject('No url');
    }
    return promisify($.get(url, params));
  },

  post({url, data, formdata = false, contentType} = {}, getResponseStatusHeaders=false) {
    return new Promise((resolve, reject) => {
      if (formdata) {
        const formdata = new FormData();
        for (const param in data) {
          formdata.append(param, data[param])
        }
        $.ajax({
          type: 'POST',
          url,
          data: formdata,
          processData: false,
          contentType: false
        }).then((response, status, request) => {
          getResponseStatusHeaders ? resolve({
              data: response,
              status,
              request
            }) : resolve(response)
          })
          .fail(error => {
            reject(error);
          })
      } else if (contentType) {
        $.ajax({
          type: 'POST',
          url,
          data,
          processData: false,
          contentType: contentType || false
        }).then((response, status, request) => {
          getResponseStatusHeaders ? resolve({
            data: response,
            status,
            request
          }) : resolve(response)
        })
          .fail(error => {
            reject(error);
          })
      } else {
        $.post(url, data)
          .then((response, status, request) => {
            getResponseStatusHeaders ? resolve({
              data: response,
              status,
              request
            }) : resolve(response)
          })
          .fail(error => {
            reject(error)
          })
      }
    })
  },

  htmlescape(string){
    string = string.replace("&", "&amp;");
    string = string.replace("<", "&lt;");
    string = string.replace(">", "&gt;");
    string = string.replace('"', "&quot;");
    return string;
  },

  fileDownload({url, data, httpMethod="POST"} = {}) {
    let timeoutId;
    return new Promise((resolve, reject) => {
      const downloadPromise = $.fileDownload(url, {
        httpMethod,
        data
      });
      timeoutId = setTimeout(()=>{
        reject('Timeout');
        downloadPromise.abort();
      }, TIMEOUT);
      downloadPromise
        .done(()=>resolve())
        .fail(()=> reject())
        .always(()=>{
          clearTimeout(timeoutId)
        });
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
    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }
  }
};