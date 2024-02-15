import { isMultiGeometry }                 from 'utils/isMultiGeometry';
import { multiGeometryToSingleGeometries } from 'utils/multiGeometryToSingleGeometries';
import { singleGeometriesToMultiGeometry } from 'utils/singleGeometriesToMultiGeometry';

/**
 * Convert geometry to geometryType (from Single to Multi or viceversa)
 * 
 * @param { ol.geom } geometry       current OL geometry
 * @param { string }  toGeometryType 
 */
export function convertSingleMultiGeometry(geometry, toGeometryType) {
  const from_type = geometry.getType();
  
  if (!toGeometryType || from_type === toGeometryType) {
    return geometry;
  }
  
  const from_multi = isMultiGeometry(from_type);
  const to_multi   = isMultiGeometry(toGeometryType);
  
  if (from_multi && !to_multi) {
    return multiGeometryToSingleGeometries(geometry);
  }
  
  if (!from_multi && to_multi) {
    return singleGeometriesToMultiGeometry([geometry]);
  }
  
  return geometry;
}