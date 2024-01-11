import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';
import { is3DGeometry }                    from 'utils/is3DGeometry';

/**
 * core/geometry/geometry::addZValueToOLFeatureGeometry@v3.4
 */
export function addZValueToOLFeatureGeometry({
  feature,
  geometryType,
} = {}) {

  if (!is3DGeometry(geometryType)) {
    console.warn('Invalid 3D Geometry Type:', geometryType);
    return feature;
  }

  const geometry = feature.getGeometry();
  const coords   = geometry.getCoordinates();

  switch (geometryType || geometry.getType()) {

    // POINT: [x, y]
    case GeometryTypes.POINTZ:
    case GeometryTypes.POINTM:
    case GeometryTypes.POINTZM:
    case GeometryTypes.POINT25D:
      coords.push(0);
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTIPOINT: [ [x1, y1], [x2, y2] ]
    case GeometryTypes.MULTIPOINTZ:
    case GeometryTypes.MULTIPOINTM:
    case GeometryTypes.MULTIPOINTZM:
    case GeometryTypes.MULTIPOINT25D:
    // LINE: [ [x1, y1], [x2, y2] ]
    case GeometryTypes.LINESTRINGZ:
    case GeometryTypes.LINESTRINGM:
    case GeometryTypes.LINESTRINGZM:
    case GeometryTypes.LINESTRING25D:
    case GeometryTypes.LINEZ:
    case GeometryTypes.LINEM:
    case GeometryTypes.LINEZM:
    case GeometryTypes.LINE25D:
      coords.forEach(c => c.push(0));
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTILINE: [
    //   [ [x1, y1], [x2, y2] ],
    //   [ [x3, y3], [x4, y4] ]
    // ]
    case GeometryTypes.MULTILINESTRINGZ:
    case GeometryTypes.MULTILINESTRINGM:
    case GeometryTypes.MULTILINESTRINGZM:
    case GeometryTypes.MULTILINESTRING25D:
    case GeometryTypes.MULTILINEZ:
    case GeometryTypes.MULTILINEM:
    case GeometryTypes.MULTILINEZM:
    case GeometryTypes.MULTILINE25D:
      coords.forEach(line => line.forEach(c => c.push(0)));
      feature.getGeometry().setCoordinates(coords);
      break;

    // POLYGON: [
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ]
    // ]
    case GeometryTypes.POLYGONZ:
    case GeometryTypes.POLYGONM:
    case GeometryTypes.POLYGONZM:
    case GeometryTypes.POLYGON25D:
      coords[0].forEach(c => c.push(0));
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTIPOLYGON:[
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ],
    //   [ [xa, ya], [xb, yb], [xc, yc], [xa, ya] ]
    // ]
    case GeometryTypes.MULTIPOLYGONZ:
    case GeometryTypes.MULTIPOLYGONM:
    case GeometryTypes.MULTIPOLYGOZM:
    case GeometryTypes.MULTIPOLYGON25D:
      coords.forEach(poly => poly[0].forEach(c => c.push(0)));
      feature.getGeometry().setCoordinates(coords);
      break;

    default:
      console.warn('invalid geometry type:', geometryType || geometry.getType());

  }

  return feature;
};