import { isMultiGeometry }       from 'utils/isMultiGeometry';
import { isPolygonGeometryType } from 'utils/isPolygonGeometryType';
import { isLineGeometryType }    from 'utils/isLineGeometryType';

/**
 * @param { Object } opts
 * @param opts.feature
 * @param opts.splitfeature
 * 
 * @returns { Array } splitted feature geometries
 */
export function splitFeature({
  feature,
  splitfeature,
} = {}) {

  const geometries = {
    feature: feature.getGeometry(), //geometry of the feature to split
    split:   splitfeature.getGeometry() // geometry of split feature
  };

  if ('LineString' !== geometries.split.getType()) {
    return [];
  }

  // array of split geometries
  const splittedFeatureGeometries = [];
  const parser                    = new jsts.io.OL3Parser();
  const is_multi                  = isMultiGeometry(geometries.feature.getType());
  const is_line                   = isLineGeometryType(geometries.feature.getType());
  const is_poly                   = isPolygonGeometryType(geometries.feature.getType());
  const polygonFeature            = is_poly && (is_multi ? geometries.feature.getPolygons()    : geometries.feature);
  const lineFeatureGeometry       = is_line && (is_multi ? geometries.feature.getLineStrings() : geometries.feature);

  // MultiPolygon or MultiLineString
  if (is_multi && (is_line || is_poly)) {
    const geomClass = is_poly ? ol.geom.MultiPolygon : ol.geom.MultiLineString;
    (is_poly ? polygonFeature : lineFeatureGeometry)
      .forEach(geometry => {
        const splitFeatures = splitFeature({ splitfeature, feature: new ol.Feature({ geometry })})
        if (splitFeatures.length > 0) {
          splitFeatures.forEach(geometry => geometry && splittedFeatureGeometries.push(new geomClass([geometry.getCoordinates()])))
        } else {
          splittedFeatureGeometries.push(new geomClass([geometry.getCoordinates()]))
        }
      })
  }

  // Polygon
  if (is_poly && !is_multi) {
    const isZType                        = polygonFeature.getCoordinates()[0][0][2] !== undefined;
    const polygonFeatureGeometry         = parser.read(polygonFeature);
    const externalPolygonFeatureGeometry = parser.read(polygonFeature.getLinearRing(0));
    const splitGeometry                  = parser.read(geometries.split); // create a line split feature in jsts
    let holePolygons;                                                     // holes geometries

    if (polygonFeature.getLinearRingCount() > 1) {
      let holeFeaturesGeometry;
      for (let index = 1; index < polygonFeature.getLinearRingCount(); index++) {
        const holeRing = parser.read(polygonFeature.getLinearRing(index));
        holeFeaturesGeometry = undefined === holeFeaturesGeometry
          ? holeRing
          : holeFeaturesGeometry.union(holeRing);
      }

      holePolygons = new jsts.operation.polygonize.Polygonizer();

      holePolygons.add(holeFeaturesGeometry);

      let holyPolygonUnion;

      holePolygons
        .getPolygons()
        .toArray()
        .forEach(polygon => holyPolygonUnion = (undefined === holyPolygonUnion) ? polygon :holyPolygonUnion.union(polygon))

      holePolygons = holyPolygonUnion;
    }

    if (isZType) {

      polygonFeature
        .getCoordinates()[0]
        .forEach((c, i) => externalPolygonFeatureGeometry.getCoordinates()[i].z = c[2]);

      splitGeometry.getCoordinates().forEach(coordinate => coordinate.z = 0);
    }

    const union       = externalPolygonFeatureGeometry.union(splitGeometry);
    const polygonizer = new jsts.operation.polygonize.Polygonizer();

    polygonizer.add(union);

    const polygons = polygonizer.getPolygons().toArray();

    if (polygons.length > 1) {
      polygons
        .forEach((polygon) => {
          if (holePolygons) { polygon = polygon.difference(holePolygons) }

          if (polygonFeatureGeometry.intersects(polygon.getInteriorPoint())) {
            const geometry           = parser.write(polygon);
            const polygonCoordinates = polygon.getCoordinates();

            if (isZType) {
              polygonCoordinates.forEach((c, i) => c.z = c.z === undefined ? polygonCoordinates[i === 0 ? i + 1 : i - 1].z : c.z);
              const zCoordinates = [];
              geometry.getCoordinates()[0]
                .forEach((c, i) => {
                  c.push(polygonCoordinates[i].z);
                  zCoordinates.push(c)
                });
              geometry.setCoordinates([zCoordinates]);
            }

            const is_single = !isMultiGeometry(geometry.getType());

            if (is_multi) {
              splittedFeatureGeometries.push(new ol.geom.MultiPolygon(is_single ? [geometry.getCoordinates()] : geometry.getCoordinates()))
            } else {
              if (is_single) { splittedFeatureGeometries.push(geometry) }
              else {
                geometry.getCoordinates().forEach(c => splittedFeatureGeometries.push(new ol.geom.Polygon(c)))
              }
            }
          }
        })
    }
  }

  // LineString or MultiLineString
  if (is_line && !is_multi) {
    const splitGeometry = geometries.split;
    const lineGeometry = geometries.feature;
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
    const geometryFactory         = new jsts.geom.GeometryFactory();
    let pointsNotSplitted         = [];
  
    let endPoint;
    let startPoint;
  
    for (let i = 0; i < targetCoordinates.length - 1; i++) {
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
  
          const lineNewSegment = olFromJsts.write(
            geometryFactory.createLineString(
              (pointsNotSplitted.length ? pointsNotSplitted : []).concat([startPoint, splitPoint]))
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
      restOfLine.setCoordinates(
        pointsNotSplitted.map((pointNotSplitted, index) => {
          const coordinate = restOfLine.getCoordinates()[index];
          coordinate.push(pointNotSplitted.z);
          return coordinate; // z coordinates
        })
      );
    }
  
    splittedSegments.push(restOfLine);
  
    return splitted ? splittedSegments : []
  }

  return splittedFeatureGeometries;
}