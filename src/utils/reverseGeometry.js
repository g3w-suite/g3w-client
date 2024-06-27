/**
 * @param geometry 
 */
export function reverseGeometry(geometry) {
  geometry.setCoordinates(_reverseCoords(geometry.getCoordinates()));
  return geometry
}

function _reverseCoords(coords) {
  coords.find(c => {
    if (!Array.isArray(c)) {
      const [y, x] = coords; coords[0] = x; coords[1] = y;
      return true;
    }
    _reverseCoords(c);
  });
  return coords;
}