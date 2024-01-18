/**
 * @param center
 * @param resolution
 * @param rotation
 * @param size
 * 
 * @returns { number[] }
 */
export function getExtentForViewAndSize(center, resolution, rotation, size) {
  const dx = resolution * size[0] / 2;
  const dy = resolution * size[1] / 2;
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);
  const xCos = dx * cosRotation;
  const xSin = dx * sinRotation;
  const yCos = dy * cosRotation;
  const ySin = dy * sinRotation;
  const x = center[0];
  const y = center[1];
  const x0 = x - xCos + ySin;
  const x1 = x - xCos - ySin;
  const x2 = x + xCos - ySin;
  const x3 = x + xCos + ySin;
  const y0 = y - xSin - yCos;
  const y1 = y - xSin + yCos;
  const y2 = y + xSin + yCos;
  const y3 = y + xSin - yCos;

  //return [Math.min(y0, y1, y2, y3),Math.min(x0, x1, x2, x3), Math.max(y0, y1, y2, y3), Math.max(x0, x1, x2, x3)]

  return [
    Math.min(x0, x1, x2, x3),
    Math.min(y0, y1, y2, y3),
    Math.max(x0, x1, x2, x3),
    Math.max(y0, y1, y2, y3)
  ];
}