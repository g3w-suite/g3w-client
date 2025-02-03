/**
 * Save blob file to disk, same as: `Content-Disposition: attachment; filename="file name.jpg"` response header
 */
export function saveBlob(blob, filename = 'filename=g3w_file') {
  Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: filename.split('filename=').at(-1)
  }).click();
  URL.revokeObjectURL(blob);
}