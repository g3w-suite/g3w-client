import { GEOMETRY_TYPES as GeometryTypes } from "app/constant";
/**
 * core/geometry/geometry::getAllPolygonGeometryTypes@v3.4
 */
export function getAllPolygonGeometryTypes() {
  return [
    GeometryTypes.POLYGON,
    GeometryTypes.POLYGONZ,
    GeometryTypes.POLYGONM,
    GeometryTypes.POLYGONZM,
    GeometryTypes.POLYGON25D,
    GeometryTypes.MULTIPOLYGON,
    GeometryTypes.MULTIPOLYGONZ,
    GeometryTypes.MULTIPOLYGONM,
    GeometryTypes.MULTIPOLYGONZM,
    GeometryTypes.MULTIPOLYGON25D,
  ];
};