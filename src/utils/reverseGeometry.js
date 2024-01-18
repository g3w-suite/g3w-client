/**
 * @param geometry 
 */
export function reverseGeometry(geometry) {
  geometry.setCoordinates(_reverseCoords(geometry.getCoordinates()));
  return geometry
};

function _reverseCoords(c) {
  c.find(c => {
    if (!Array.isArray(c)) {
      const [y, x] = c; c[0] = x; c[1] = y;
      return true;
    }
    _reverseCoords(c);
  });
  return c;
}