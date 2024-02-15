/**
 * @param geometry geojson polygon
 * 
 * @returns { boolean } whether geometry has self intersections
 */
export function findSelfIntersects(geometry) {
  const jstsPolygon = (new jsts.io.OL3Parser()).read(geometry);
  // geometry is already a simple linear ring, do not try to find self intersection points.
  if ((new jsts.operation.IsSimpleOp(jstsPolygon)).isSimpleLinearGeometry(jstsPolygon)) {
    return false;
  }
  /** @FIXME add description */
  if (!(new jsts.operation.valid.ConsistentAreaTester(new jsts.geomgraph.GeometryGraph(0, jstsPolygon))).isNodeConsistentArea()) {
    return true;
  }
}