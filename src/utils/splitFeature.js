import { splitGeometryLine } from 'utils/splitGeometryLine'; 

/**
 * @param { Object } opts
 * @param opts.feature
 * @param opts.splitFeature
 * 
 * @returns { Array } splitted feature geometries
 */
export function splitFeature({
  feature,
  splitfeature,
} = {}) {

  const geometries                = {
    feature: feature.getGeometry(),                               // geometry of the feature to split
    split:   splitfeature.getGeometry(),                          // geometry of split feature
  };
  const splitType                 = geometries.split.getType();   // check geometry type of split
  const featureGeometryType       = geometries.feature.getType(); // check geometry type of feature
  const parser                    = new jsts.io.OL3Parser();

  /** In case of split geometry feature type is non a LineString */
  if ('LineString' !== splitType) {
    return [];
  }

  const splittedFeatureGeometries = []; // array of split geometries

  const is_poly                   = 1 !== featureGeometryType.indexOf('Polygon');
  const is_multi                  = 1 !== featureGeometryType.indexOf('Multi');
  const is_line                   = 1 !== featureGeometryType.indexOf('LineString');

  const polygonFeature      = is_multi && is_poly             ? geometries.feature.getPolygons()    : geometries.feature;
  const lineFeatureGeometry = is_multi && !is_poly && is_line ? geometries.feature.getLineStrings() : geometries.feature;

  let geomClass; 

  // MultiPolygon
  if (is_poly && Array.isArray(polygonFeature)) {
    geomClass = ol.geom.MultiPolygon;
  }

  // MultiLineString
  if (!is_poly && is_line && Array.isArray(lineFeatureGeometry)) {
    geomClass = ol.geom.MultiLineString;
  }

  // recursion step
  if (geomClass) {
    (polygonFeature || lineFeatureGeometry).forEach(geometry => {
      splitFeature({ splitfeature, feature: new ol.Feature({ geometry }) })
      .forEach(geometry => geometry && splittedFeatureGeometries.push(new geomClass([geometry.getCoordinates()])))
    });
  }

  const GIVE_ME_A_NAME = is_poly && polygonFeature && !Array.isArray(polygonFeature);

  const isZType                        = GIVE_ME_A_NAME && undefined !== polygonFeature.getCoordinates()[0][0][2];
  const polygonFeatureGeometry         = GIVE_ME_A_NAME && parser.read(polygonFeature);
  const externalPolygonFeatureGeometry = GIVE_ME_A_NAME && parser.read(polygonFeature.getLinearRing(0));
  const splitGeometry                  = GIVE_ME_A_NAME && parser.read(geometries.split); // create a line splittinf feature in jsts
  const linearRings                    = GIVE_ME_A_NAME && polygonFeature.getLinearRingCount() > 1;
  let holePolygons;                                                     // add holes geometries

  if (linearRings) {
    let holeFeaturesGeometry;
    for (let index = 1; index < linearRings; index++) {
      const holeRing = parser.read(polygonFeature.getLinearRing(index));
      holeFeaturesGeometry = undefined === holeFeaturesGeometry ? holeRing : holeFeaturesGeometry.union(holeRing);
    }
    holePolygons = new jsts.operation.polygonize.Polygonizer();
    holePolygons.add(holeFeaturesGeometry);
    let holyPolygonUnion;
    holePolygons
      .getPolygons()
      .toArray()
      .forEach(polygon => holyPolygonUnion = undefined === holyPolygonUnion ? polygon : holyPolygonUnion.union(polygon));
    holePolygons = holyPolygonUnion;
  }

  if (GIVE_ME_A_NAME && isZType) {
    polygonFeature.getCoordinates()[0].forEach((c, i) => externalPolygonFeatureGeometry.getCoordinates()[i].z = c[2]);
    splitGeometry.getCoordinates().forEach(c => c.z = 0);
  }

  const polygonizer = GIVE_ME_A_NAME && new jsts.operation.polygonize.Polygonizer();

  // Polygon
  if (GIVE_ME_A_NAME) {
    polygonizer.add(externalPolygonFeatureGeometry.union(splitGeometry));
  }

  const polygons = polygonizer && polygonizer.getPolygons().toArray();

  if (GIVE_ME_A_NAME && polygons.length > 1) {
    polygons.forEach(polygon => {
      if (holePolygons) {
        polygon = polygon.difference(holePolygons);
      }
      const is_intersect       = polygonFeatureGeometry.intersects(polygon.getInteriorPoint());
      const geometry           = is_intersect && parser.write(polygon);
      const polygonCoordinates = is_intersect && polygon.getCoordinates();
      const geometryType       = is_intersect && geometry.getType();
      if (is_intersect && isZType) {
        const zCoordinates = [];
        polygonCoordinates.forEach((c, i) => c.z = undefined === c.z ? polygonCoordinates[i === 0 ? i + 1 : i - 1].z : c.z);
        geometry.getCoordinates()[0].forEach((c, i) => { c.push(polygonCoordinates[i].z); zCoordinates.push(c) });
        geometry.setCoordinates([zCoordinates]);
      }
      if (is_intersect && is_multi) {
        splittedFeatureGeometries.push(new ol.geom.MultiPolygon('Polygon' === geometryType ? [geometry.getCoordinates()] : geometry.getCoordinates()))
      }
      if (is_intersect && !is_multi && 'Polygon' === geometryType) {
        splittedFeatureGeometries.push(geometry);
      }
      if (is_intersect && !is_multi && 'Polygon' !== geometryType) {
        geometry.getCoordinates().forEach(c => splittedFeatureGeometries.push(new ol.geom.Polygon(c)));
      }
    });
  }

  // LineString
  if (!is_poly && is_line && !Array.isArray(lineFeatureGeometry)) {
    return splitGeometryLine(geometries.split, geometries.feature);
  }

  return splittedFeatureGeometries;
};