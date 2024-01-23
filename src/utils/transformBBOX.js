/**
 * @param { Object } opts 
 * @param opts.sourceCrs
 * @param opts.destinationCrs
 * 
 * @returns { Array } 
 */
export function transformBBOX({
  bbox,
  sourceCrs,
  destinationCrs,
} = {}) {
  const point1 = new ol.geom.Point([bbox[0], bbox[1]]);
  const point2 = new ol.geom.Point([bbox[2], bbox[3]]);
  point1.transform(sourceCrs, destinationCrs);
  point2.transform(sourceCrs, destinationCrs);
  return [
    ...point1.getCoordinates(),
    ...point2.getCoordinates()
  ];
}