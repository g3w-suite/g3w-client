/**
 * @param { number[] } bbox 
 * @returns { ol.Feature | undefined } feature
 */
export function createFeatureFromBBOX(bbox) {
  if (Array.isArray(bbox) && 4 === bbox.length) {
    return new ol.Feature(ol.geom.Polygon.fromExtent(bbox))
  }
}