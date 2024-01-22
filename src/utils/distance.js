import { squaredDistance } from "utils/squaredDistance";

/**
 * core/geometry/geom::distance@v3.4
 */
export function distance(c1, c2) {
  return Math.sqrt(squaredDistance(c1, c2));
}