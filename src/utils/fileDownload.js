import { TIMEOUT } from 'app/constant';

export function fileDownload({url, data, httpMethod="POST"} = {}) {
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
}