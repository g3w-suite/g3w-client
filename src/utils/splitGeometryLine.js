/**
 * @param splitGeometry 
 * @param lineGeometry
 * 
 * @returns { Array }
 */
export function splitGeometryLine(splitGeometry, lineGeometry) {
  const isZType                 = undefined !== lineGeometry.getCoordinates()[0][2];
  let splitted                  = false;
  const splittedSegments        = [];
  const jstsFromWkt             = new jsts.io.WKTReader();
  const wktFromOl               = new ol.format.WKT();
  const olFromJsts              = new jsts.io.OL3Parser();
  const splitLine               = jstsFromWkt.read(wktFromOl.writeGeometry(splitGeometry));
  let wktLineString             = wktFromOl.writeGeometry(lineGeometry);

  if (isZType) {
    wktLineString = wktLineString.replace(' Z', '');
  }

  const targetLine              = jstsFromWkt.read(wktLineString);
  const targetCoordinates       = targetLine.getCoordinates();
  const targetCoordinatesLength = targetCoordinates.length;
  const geometryFactory         = new jsts.geom.GeometryFactory();
  let pointsNotSplitted         = [];

  let endPoint;
  let startPoint;

  for (let i = 0; i < targetCoordinatesLength - 1; i++) {
    startPoint = targetCoordinates[i];
    endPoint = targetCoordinates[i+1];

    if (isZType) {
      startPoint.z = lineGeometry.getCoordinates()[i][2];
      endPoint.z   = lineGeometry.getCoordinates()[i + 1][2];
    }

    // create a segment of two vertex
    const segment              = geometryFactory.createLineString([startPoint, endPoint]);
    const intersectCoordinates = segment.intersection(splitLine).getCoordinates();

    splitted = splitted || intersectCoordinates.length > 0;

    intersectCoordinates
      .forEach(splitPoint => {
        if (isZType) {
          splitPoint.z = startPoint.z;
        }

        const lineNewSegment = olFromJsts
          .write(
            geometryFactory.createLineString(
              (pointsNotSplitted.length
                ? pointsNotSplitted
                : []
              ).concat([startPoint, splitPoint]))
          );

        if (isZType) {
          const coordinates    = lineNewSegment.getCoordinates();
          lineNewSegment.setCoordinates([
            [...coordinates[0], startPoint.z],
            [...coordinates[1], splitPoint.z]
          ])
        }

        if (pointsNotSplitted.length) {
          pointsNotSplitted = [];
        }

        splittedSegments.push(lineNewSegment);

        startPoint = splitPoint;
      });

    pointsNotSplitted = pointsNotSplitted.concat([startPoint, endPoint]);
  }

  const restOfLine = olFromJsts.write(geometryFactory.createLineString(pointsNotSplitted));

  if (isZType) {
    const zCoordinates = [];
    pointsNotSplitted
      .forEach((pointNotSplitted, index) => {
        const coordinate = restOfLine.getCoordinates()[index];
        coordinate.push(pointNotSplitted.z);
        zCoordinates.push(coordinate);
      });
    restOfLine.setCoordinates(zCoordinates);
  }

  splittedSegments.push(restOfLine);

  return splitted ? splittedSegments : []
}