/**
 * @param { Object } file
 * @param { string } file.filename
 * @param file.content
 * @param { string } file.url
 * @param { string } file.mime_type
 */
export async function downloadFile({
  filename,
  content,
  url,
  headers = {},   // @since v3.10.0
  method = 'GET', // @since v3.10.0
  data,           //@since v3.10.0
  mime_type = 'text/plain',
} = {}) {

  let blob = content && new Blob([content], { type: mime_type });

  const d = !content && url && await fetch(url, {
    type: mime_type,
    headers,
    body: data,
    method
  }) || {};

  if (!content && (400 === d.status || 500 === d.status)) {
    throw (await d.json()).message;
  }

  if (content || 200 === d.status) {
    let a = document.createElement('a');
    a.setAttribute('href', window.URL.createObjectURL(blob || await d.blob()));
    a.setAttribute('download', filename || (d.headers.get('content-disposition') || 'filename=g3w_download_file').split('filename=').at(1));
    a.dataset.downloadurl = [mime_type || d.headers.get('content-type'), a.download, a.href].join(':');
    a.click();
    a = null;
  }

}
