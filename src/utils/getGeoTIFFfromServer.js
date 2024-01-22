/**
 * Get geotiff file created by server
 *
 * @param { Object } options
 * @param { string } options.url server url end point
 * @param { 'GET' | 'POST' } [options.method='POST'] GET, POST, PUT, DELETE, etc.
 * @param { Object } options.params
 * @param options.params.image
 * @param options.params.csrfmiddlewaretoken
 * @param options.params.bbox
 * 
 * @returns { Promise<Blob> } geoTIFF
 */
export async function getGeoTIFFfromServer(options = {}) {
  const body = new FormData();
  body.append('image',               options.params.image);
  body.append('csrfmiddlewaretoken', options.params.csrfmiddlewaretoken);
  body.append('bbox',                options.params.bbox);
  return await (await fetch(options.url, { method: options.method || "POST", body })).blob();
}