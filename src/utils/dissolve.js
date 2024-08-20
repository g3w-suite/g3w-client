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


  /** In case no features to dissolve  */
  if (0 === featuresLength) {
    return null;
  }

  /** In the case of single feature, return feature */
  if (1 === featuresLength) {
    return features[0];
  }

  let jstsdissolvedFeatureGeometry;

  const baseFeature             = clone ? features[index].clone() : features[index];
  const baseFeatureGeometry     = baseFeature.getGeometry();
  const baseFeatureGeometryType = baseFeatureGeometry.getType();

  // check if it can build a LineString
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

  /** In case of no dissolved geometry  */
  if (!jstsdissolvedFeatureGeometry) {
    return null;
  }

  const dissolvedFeatureGeometry            = parser.write(jstsdissolvedFeatureGeometry);
  const dissolvedFeatureGeometryType        = dissolvedFeatureGeometry.getType();
  const dissolvedFeatureGeometryCoordinates = dissolvedFeatureGeometryType === baseFeatureGeometryType
    ? dissolvedFeatureGeometry.getCoordinates()
    : -1 !== baseFeatureGeometryType.indexOf('Multi') && dissolvedFeatureGeometryType === baseFeatureGeometryType.replace('Multi', '')
      ? [dissolvedFeatureGeometry.getCoordinates()]
      : null;

  /** In case of null feature dissolved coordinates  */
  if (null === dissolvedFeatureGeometryCoordinates) {
    return null;
  }

  baseFeature.getGeometry().setCoordinates(dissolvedFeatureGeometryCoordinates);

  return baseFeature;
}