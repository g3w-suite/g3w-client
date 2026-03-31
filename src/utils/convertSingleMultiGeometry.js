import { isMultiGeometry } from 'utils/isMultiGeometry';

/**
 * Convert geometry to geometryType (from Single to Multi or viceversa)
 * 
 * @param { ol.geom } geometry       current OL geometry
 * @param { string }  toGeometryType 
 */
export function convertSingleMultiGeometry(geometry, toGeometryType) {
  const from_type = geometry.getType();
  
  if (!toGeometryType || toGeometryType === from_type) {
    return geometry;
  }
  
  const from_multi = isMultiGeometry(from_type);
  const to_multi   = isMultiGeometry(toGeometryType);
  
  if (from_multi && !to_multi) {
    switch (geometry.getType()) {
      case 'MultiPolygon':    return geometry.getPolygons();
      case 'MultiLine':       return geometry.getLineStrings();
      case 'MultiLineString': return geometry.getLineStrings();
      case 'MultiPoint':      return geometry.getPoints();
      default:                console.warn('invalid geometry type', geometry.getType());
    }
    return [];
  }
  
  if (!from_multi && to_multi) {
     return new ol.geom[`Multi${from_type}`]([geometry.getCoordinates()]);
  }
  
  return geometry;
}