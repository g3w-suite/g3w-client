import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

/**
 * core/geometry/geometry::getAllLineGeometryTypes@v3.4
 */
export function getAllLineGeometryTypes() {
  return [
    GeometryTypes.LINESTRING,
    GeometryTypes.LINESTRINGZ,
    GeometryTypes.LINESTRINGM,
    GeometryTypes.LINESTRINGZM,
    GeometryTypes.LINESTRING25D,
    GeometryTypes.MULTILINESTRING,
    GeometryTypes.MULTILINESTRINGZ,
    GeometryTypes.MULTILINESTRINGM,
    GeometryTypes.MULTILINESTRINGZM,
    GeometryTypes.MULTILINESTRING25D,
    GeometryTypes.LINE,
    GeometryTypes.LINEZ,
    GeometryTypes.LINEM,
    GeometryTypes.LINEZM,
    GeometryTypes.LINE25D,
    GeometryTypes.MULTILINE,
    GeometryTypes.MULTILINEZ,
    GeometryTypes.MULTILINEM,
    GeometryTypes.MULTILINEZM,
    GeometryTypes.MULTILINE25D,
  ];
};