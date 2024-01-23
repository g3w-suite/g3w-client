/**
 * Create a polygon vector layer from bbox
 * 
 * @param bbox 
 * 
 * @returns { ol.layer.Vector }
 */
export function createPolygonLayerFromBBox(bbox) {
  return new ol.layer.Vector({
    source: new ol.source.Vector({
      features: [ new ol.Feature(new ol.geom.Polygon.fromExtent(bbox)) ]
    })
  });
}