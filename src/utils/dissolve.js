/**
 * @param { Object } opts 
 * @param { Array } opts.features
 * @param { number } opts.index
 * @param { boolean } opts.clone
 * 
 * @returns dissolved feature
 */
export function dissolve({
  features = [],
  index = 0,
  clone = false,
} = {}) {

  const parser         = new jsts.io.OL3Parser();
  const featuresLength = features.length;

  let dissolvedFeature;
  let jstsdissolvedFeatureGeometry;

  /** @FIXME add description  */
  if (0 === featuresLength) {
    return null;
  }

  /** @FIXME add description  */
  if (1 === featuresLength) {
    return features[0];
  }

  const baseFeature             = dissolvedFeature = clone ? features[index].clone() : features[index];
  const baseFeatureGeometry     = baseFeature.getGeometry();
  const baseFeatureGeometryType = baseFeatureGeometry.getType();

  // check if can buil a LineString
  if ('LineString' === baseFeatureGeometryType) {
    const lineMerger = new jsts.operation.linemerge.LineMerger();
    for (let i = 0; i < featuresLength; i++) {
      lineMerger.addLineString(
        new jsts.geom.GeometryFactory().createLineString(parser.read(features[i].getGeometry()).getCoordinates())
      );
    }
    const mergedLineString = lineMerger.getMergedLineStrings();
    jstsdissolvedFeatureGeometry = 1 === mergedLineString.size() ? mergedLineString.toArray()[0] : null;
  }
  
  if ('LineString' !== baseFeatureGeometryType) {
    jstsdissolvedFeatureGeometry = parser.read(baseFeatureGeometry);
    for (let i = 0; i < featuresLength ; i++) {
      if (index !== i) {
        jstsdissolvedFeatureGeometry = jstsdissolvedFeatureGeometry.union(parser.read(features[i].getGeometry()))
      }
    }
  }

  /** @FIXME add description  */
  if (!jstsdissolvedFeatureGeometry) {
    return null;
  }

  const dissolvedFeatureGeometry            = parser.write(jstsdissolvedFeatureGeometry);
  const dissolvedFeatureGeometryType        = dissolvedFeatureGeometry.getType();
  const dissolvedFeatuteGeometryCoordinates = dissolvedFeatureGeometryType === baseFeatureGeometryType
    ? dissolvedFeatureGeometry.getCoordinates()
    : -1 !== baseFeatureGeometryType.indexOf('Multi') && dissolvedFeatureGeometryType === baseFeatureGeometryType.replace('Multi', '')
      ? [dissolvedFeatureGeometry.getCoordinates()]
      : null;

  /** @FIXME add description  */
  if (!dissolvedFeatuteGeometryCoordinates) {
    return null;
  }

  baseFeature.getGeometry().setCoordinates(dissolvedFeatuteGeometryCoordinates);

  return dissolvedFeature;
};