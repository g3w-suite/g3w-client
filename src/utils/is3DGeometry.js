import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

export function is3DGeometry(geometryType) {
  return [
    GeometryTypes.POINTZ,
    GeometryTypes.POINTM,
    GeometryTypes.POINTZM,
    GeometryTypes.POINT25D,
    GeometryTypes.MULTIPOINTZ,
    GeometryTypes.MULTIPOINTM,
    GeometryTypes.MULTIPOINTZM,
    GeometryTypes.MULTIPOINT25D,
    GeometryTypes.LINESTRINGZ,
    GeometryTypes.LINESTRINGM,
    GeometryTypes.LINESTRINGZM,
    GeometryTypes.LINESTRING25D,
    GeometryTypes.MULTILINESTRINGZ,
    GeometryTypes.MULTILINESTRINGM,
    GeometryTypes.MULTILINESTRINGZM,
    GeometryTypes.MULTILINESTRING25D,
    GeometryTypes.LINEZ,
    GeometryTypes.LINEM,
    GeometryTypes.LINEZM,
    GeometryTypes.LINE25D,
    GeometryTypes.MULTILINEZ,
    GeometryTypes.MULTILINEM,
    GeometryTypes.MULTILINEZM,
    GeometryTypes.MULTILINE25D,
    GeometryTypes.POLYGONZ,
    GeometryTypes.POLYGONM,
    GeometryTypes.POLYGONZM,
    GeometryTypes.POLYGON25D,
    GeometryTypes.MULTIPOLYGONZ,
    GeometryTypes.MULTIPOLYGONM,
    GeometryTypes.MULTIPOLYGONZM,
    GeometryTypes.MULTIPOLYGON25D
  ].find( type3D => type3D === geometryType);
};