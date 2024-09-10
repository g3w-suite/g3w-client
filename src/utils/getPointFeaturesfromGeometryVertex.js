import { GEOMETRY_TYPES } from 'g3w-constants';

/**
 * @param geometry
 * 
 * @returns { Array } Point feature vertex from geometry
 */
export function getPointFeaturesfromGeometryVertex(geometry) {
  const pointFeatures = [];

  switch(geometry.getType()) {

    case GEOMETRY_TYPES.MULTIPOLYGON:
      geometry
        .getCoordinates()
        .forEach(c => {
          c.forEach(c => {
            c.pop();
            c.forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c))));
          })
        });
      break;

    case GEOMETRY_TYPES.POLYGON:
      geometry
        .getCoordinates()
        .forEach(c => {
          c.pop();
          c.forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c))));
        });
      break;

    case GEOMETRY_TYPES.MULTILINESTRING:
      geometry
        .getCoordinates()
        .forEach(c => c.forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c)))));
      break;

    case GEOMETRY_TYPES.LINESTRING:
      geometry
        .getCoordinates()
        .forEach(c => c.forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c)))));
      break;

    case GEOMETRY_TYPES.MULTIPOINT:
      geometry
        .getCoordinates()
        .forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c))));
      break;

    case GEOMETRY_TYPES.POINT:
      pointFeatures.push(new ol.geom.Point(geometry.getCoordinates()));
      break;

  }
  return pointFeatures;
}