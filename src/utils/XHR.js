import { TIMEOUT } from 'app/constant';

export const XHR = {

  get({url, params={}}={}) {
    return new Promise((resolve, reject) => {
      url ?
        $.get(url, params)
          .then(response => {
            resolve(response)
          })
          .fail(error => reject(error))
      : reject('No url')
    })
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
};