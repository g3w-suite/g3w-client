import { GEOMETRY_TYPES } from 'app/constant';
import { is3DGeometry }   from 'utils/is3DGeometry';

/**
 * @since 3.10.0 Add a 3d coordinate eventually, if coordinates are 2 (x, y)
 * @param coords
 * @return {*}
 */
function add3DCoordinate(coords) {
  if (2 === coords.length) {
    coords.push(0);
  }
  return coords;
}

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
    case GEOMETRY_TYPES.POINTZ:
    case GEOMETRY_TYPES.POINTM:
    case GEOMETRY_TYPES.POINTZM:
    case GEOMETRY_TYPES.POINT25D:
      feature.getGeometry().setCoordinates(add3DCoordinate(coords));
      break;

    // MULTIPOINT: [ [x1, y1], [x2, y2] ]
    case GEOMETRY_TYPES.MULTIPOINTZ:
    case GEOMETRY_TYPES.MULTIPOINTM:
    case GEOMETRY_TYPES.MULTIPOINTZM:
    case GEOMETRY_TYPES.MULTIPOINT25D:
    // LINE: [ [x1, y1], [x2, y2] ]
    case GEOMETRY_TYPES.LINESTRINGZ:
    case GEOMETRY_TYPES.LINESTRINGM:
    case GEOMETRY_TYPES.LINESTRINGZM:
    case GEOMETRY_TYPES.LINESTRING25D:
    case GEOMETRY_TYPES.LINEZ:
    case GEOMETRY_TYPES.LINEM:
    case GEOMETRY_TYPES.LINEZM:
    case GEOMETRY_TYPES.LINE25D:
      coords.forEach(c => add3DCoordinate(c));
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTILINE: [
    //   [ [x1, y1], [x2, y2] ],
    //   [ [x3, y3], [x4, y4] ]
    // ]
    case GEOMETRY_TYPES.MULTILINESTRINGZ:
    case GEOMETRY_TYPES.MULTILINESTRINGM:
    case GEOMETRY_TYPES.MULTILINESTRINGZM:
    case GEOMETRY_TYPES.MULTILINESTRING25D:
    case GEOMETRY_TYPES.MULTILINEZ:
    case GEOMETRY_TYPES.MULTILINEM:
    case GEOMETRY_TYPES.MULTILINEZM:
    case GEOMETRY_TYPES.MULTILINE25D:
      coords.forEach(l => l.forEach(c => add3DCoordinate(c)));
      feature.getGeometry().setCoordinates(coords);
      break;

    // POLYGON: [
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ]
    // ]
    case GEOMETRY_TYPES.POLYGONZ:
    case GEOMETRY_TYPES.POLYGONM:
    case GEOMETRY_TYPES.POLYGONZM:
    case GEOMETRY_TYPES.POLYGON25D:
      coords[0].forEach(c => add3DCoordinate(c));
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTIPOLYGON:[
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ],
    //   [ [xa, ya], [xb, yb], [xc, yc], [xa, ya] ]
    // ]
    case GEOMETRY_TYPES.MULTIPOLYGONZ:
    case GEOMETRY_TYPES.MULTIPOLYGONM:
    case GEOMETRY_TYPES.MULTIPOLYGOZM:
    case GEOMETRY_TYPES.MULTIPOLYGON25D:
      coords.forEach(poly => poly[0].forEach(c => add3DCoordinate(c)));
      feature.getGeometry().setCoordinates(coords);
      break;

    default:
      console.warn('invalid geometry type:', geometryType || geometry.getType());

  }

  return feature;
}