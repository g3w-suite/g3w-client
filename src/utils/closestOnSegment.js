/**
 * core/geometry/geom::closestOnSegment@v3.4
 */
export function closestOnSegment(coordinate, segment) {
  const x0 = coordinate[0];
  const y0 = coordinate[1];
  const x1 = segment[0][0];
  const y1 = segment[0][1];
  const x2 = segment[1][0];
  const y2 = segment[1][1];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const along = (dx === 0 && dy === 0) ? 0 : ((dx * (x0 - x1)) + (dy * (y0 - y1))) / ((dx * dx + dy * dy) || 0);

  if (along <= 0) {
    return [x1, y1];
  }

  if (along >= 1) {
    return [x2, y2];
  }

  return [x1 + along * dx, y1 + along * dy];
}