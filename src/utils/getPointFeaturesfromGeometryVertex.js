import { GEOMETRY_TYPES as GeometryTypes } from 'app/constant';

/**
 * @param geometry
 * 
 * @returns { Array } Point feature vertex from geometry
 */
export function getPointFeaturesfromGeometryVertex(geometry) {
  const pointFeatures = [];

  switch(geometry.getType()) {

    case GeometryTypes.MULTIPOLYGON:
      geometry.getCoordinates().forEach(c => {
        c.forEach(c => {
          c.pop();
          c.forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c))));
        })
      });
      break;

    case GeometryTypes.POLYGON:
      geometry.getCoordinates().forEach(c => {
        c.pop();
        c.forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c))));
      });
      break;

    case GeometryTypes.MULTILINESTRING:
      geometry.getCoordinates().forEach(c => {
        c.forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c))));
      });
      break;

    case GeometryTypes.LINESTRING:
      geometry.getCoordinates().forEach(c => {
        c.forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c))));
      });
      break;

    case GeometryTypes.MULTIPOINT:
      geometry.getCoordinates().forEach(c => pointFeatures.push(new ol.Feature(new ol.geom.Point(c))));
      break;

    case GeometryTypes.POINT:
      pointFeatures.push(new ol.geom.Point(geometry.getCoordinates()));
      break;

  }
  return pointFeatures;
};