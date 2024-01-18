import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

/**
 * Remove Z values from geometry coordinates
 */
export function removeZValueToOLFeatureGeometry({ feature } = {}) {

  const geometry = feature.getGeometry();

  // skip when feature has no geometry (alphanumerical feature)
  if (!geometry) {
    return feature;
  }

  const coords = geometry.getCoordinates();

  switch (geometry.getType()) {

    // POINT: [x, y]
    case GeometryTypes.POINT:
      if (3 === coords.length) {
        coords.splice(2);
        feature.getGeometry().setCoordinates(coords);
      }
      break;

    // MULTIPOINT: [ [x1, y1], [x2, y2] ]
    case GeometryTypes.MULTIPOINT:
    // LINE: [ [x1, y1], [x2, y2] ]
    case GeometryTypes.LINESTRING:
    case GeometryTypes.LINE:
      coords.forEach(c => c.splice(2));
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTILINE: [
    //   [ [x1, y1], [x2, y2] ],
    //   [ [x3, y3], [x4, y4] ]
    // ]
    case GeometryTypes.MULTILINESTRING:
    case GeometryTypes.MULTILINE:
      coords.forEach(line => line.forEach(c => c.splice(2)));
      feature.getGeometry().setCoordinates(coords);
      break;

    // POLYGON: [
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ]
    // ]
    case GeometryTypes.POLYGON:
      coords[0].forEach(c => c.splice(2));
      feature.getGeometry().setCoordinates(coords);
      break;

    // MULTIPOLYGON:[
    //   [ [x1, y1], [x2, y2], [x3, y3], [x1, y1] ],
    //   [ [xa, ya], [xb, yb], [xc, yc], [xa, ya] ]
    // ]
    case GeometryTypes.MULTIPOLYGON:
      coords.forEach(poly => poly[0].forEach(c => c.splice(2)));
      feature.getGeometry().setCoordinates(coords);
      break;

    default:
      console.warn('unsupported geometry type: ' + geometry.getType());

  }
  
  return feature;
};