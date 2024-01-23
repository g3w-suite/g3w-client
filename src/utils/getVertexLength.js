import { GEOMETRY_TYPES } from 'app/constant';

/**
 * @param geometries
 * @returns { number } number of vertex of a feature
 */
export function getVertexLength(geometry) {
  let vertexLength = 0;

  switch(geometry.getType()) {

    case GEOMETRY_TYPES.MULTIPOLYGON:
      geometry.getCoordinates()
        .forEach(c => {
          c.forEach(c => {
            c.pop();
            c.forEach(() => vertexLength += 1);
          })
        });
      break;

    case GEOMETRY_TYPES.POLYGON:
      geometry.getCoordinates()
        .forEach(c => {
          c.pop();
          c.forEach(() => vertexLength += 1);
        });
      break;

  }

  return vertexLength;
}