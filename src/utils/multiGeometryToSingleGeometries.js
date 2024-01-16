import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

/**
 * @param geometry
 * 
 * @returns { Array } geometries
 */
export function multiGeometryToSingleGeometries(geometry) {
  switch (geometry.getType()) {
    case GeometryTypes.MULTIPOLYGON:    return geometry.getPolygons();
    case GeometryTypes.MULTILINE:       return geometry.getLineStrings();
    case GeometryTypes.MULTILINESTRING: return geometry.getLineStrings();
    case GeometryTypes.MULTIPOINT:      return geometry.getPoints();
    default:                            console.warn('invalid geometry type', geometry.getType());
  }
  return [];
};