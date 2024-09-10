import { GEOMETRY_TYPES } from 'g3w-constants';

/**
 * @param geometry
 * 
 * @returns { Array } geometries
 */
export function multiGeometryToSingleGeometries(geometry) {
  switch (geometry.getType()) {
    case GEOMETRY_TYPES.MULTIPOLYGON:    return geometry.getPolygons();
    case GEOMETRY_TYPES.MULTILINE:       return geometry.getLineStrings();
    case GEOMETRY_TYPES.MULTILINESTRING: return geometry.getLineStrings();
    case GEOMETRY_TYPES.MULTIPOINT:      return geometry.getPoints();
    default:                            console.warn('invalid geometry type', geometry.getType());
  }
  return [];
}