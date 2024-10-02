/**
 * core/geometry/geom::distance@v3.4
 * core/geometry/geom::squaredDistance@v3.4
 */
export function distance(c1, c2) {
  return Math.sqrt(
    Math.pow(c2[0] - c1[0], 2) +
    Math.pow(c2[1] - c1[1], 2)
  );
}