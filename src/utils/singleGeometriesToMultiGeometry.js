/**
 * @param { Array } geometries 
 */
export function singleGeometriesToMultiGeometry(geometries = []) {
  const geometryType = geometries[0] && geometries[0].getType();
  return geometryType && new ol.geom[`Multi${geometryType}`](geometries.map(geometry => geometry.getCoordinates()))
}