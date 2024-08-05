/**
 *
 * @param blob
 * @param filename
 * @param mime_type
 * @private
 */
function _download(blob, filename, mime_type) {
  let a = document.createElement('a');
  a.setAttribute('href', window.URL.createObjectURL(blob));
  a.setAttribute('download', filename);
  a.dataset.downloadurl = [mime_type, a.download, a.href].join(':');
  a.click();
  a = null;
}

/**
 * @param { Object } file
 * @param { string } file.filename
 * @param file.content
 * @param { string } file.url
 * @param { string } file.mime_type
 *  
 * @returns { Blob }
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

  if (content) {
    return _download(
      new Blob([content], { type: mime_type }),
      filename,
      mime_type,
    );
  }

  if (url) {
    const d = await fetch(url, { type: mime_type, headers, body: data, method });
    if (400 === d.status || 500 === d.status) {
      throw (await d.json()).message;
    }
    if (200 === d.status) {
      _download(
        await d.blob(),
        (
          filename || d.headers.get('content-disposition').split('filename=').length
            ? d.headers.get('content-disposition').split('filename=')[1]
            : 'g3w_download_file'
        ),
        mime_type || d.headers.get('content-type'),
      );
    }
  }

}
