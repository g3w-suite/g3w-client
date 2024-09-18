import { GEOMETRY_TYPES }  from 'g3w-constants';
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
      case GEOMETRY_TYPES.MULTIPOLYGON:    return geometry.getPolygons();
      case GEOMETRY_TYPES.MULTILINE:       return geometry.getLineStrings();
      case GEOMETRY_TYPES.MULTILINESTRING: return geometry.getLineStrings();
      case GEOMETRY_TYPES.MULTIPOINT:      return geometry.getPoints();
      default:                            console.warn('invalid geometry type', geometry.getType());
    }
    return [];
  }
  
  if (!from_multi && to_multi) {
     return new ol.geom[`Multi${from_type}`]([geometry.getCoordinates()]);
  }
  
  return geometry;
}