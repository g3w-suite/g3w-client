export function downloadFile({
  filename,
  content,
  url,
  mime_type = 'text/plain',
} = {}) {
  const download = blob =>{
    let temapAncor = document.createElement('a');
    temapAncor.setAttribute('href', window.URL.createObjectURL(blob));
    temapAncor.setAttribute('download', filename);
    temapAncor.dataset.downloadurl = [mime_type, temapAncor.download, temapAncor.href].join(':');
    temapAncor.click();
    temapAncor = null;
  };
  return new Promise((resolve, reject) =>{
    if (content) {
      const blob = new Blob([content], {type: mime_type});
      download(blob);
      resolve();
    } else if (url) {
     fetch(url)
       .then(async response => {
         if (response.status === 200) {
           mime_type = mime_type || response.headers.get('content-type');
           filename = filename || response.headers.get('content-disposition').split('filename=').length ?
             response.headers.get('content-disposition').split('filename=')[1] : 'g3w_download_file';
           return response.blob();
         } else if (response.status === 400 || response.status === 500){
           const {message} = await response.json();
           return Promise.reject(message)
         }
       })
       .then(blob => {
         download(blob);
         resolve();
       }).catch(error => {
        reject(error)
      })
    }
  })
};