import { splitGeometryLine }     from 'utils/splitGeometryLine';
import { isMultiGeometry }       from "utils/isMultiGeometry";
import { isPolygonGeometryType } from "utils/isPolygonGeometryType";
import { isLineGeometryType }    from "utils/isLineGeometryType";
import { isSingleGeometry }      from "utils/isSingleGeometry";

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
  // check a geometry type of split
  const splitType                 = geometries.split.getType();
  // check the geometry type of feature
  const featureGeometryType       = geometries.feature.getType();
  // array of split geometries
  const splittedFeatureGeometries = [];
  const parser = new jsts.io.OL3Parser();

  if ('LineString' !== splitType) {
    return [];
  }
  //check if is a Multi
  const is_multi = isMultiGeometry(featureGeometryType);
  const is_line  = isLineGeometryType(featureGeometryType);
  const is_poly  = isPolygonGeometryType(featureGeometryType);

  /** common method to add split feature geometry */
  /**
   *
   * @param feature
   * @param geomClass
   */
  const addSplittedFeatureGeometries = ({ feature, geomClass }) => {
    feature
      .forEach(geometry => {
        const splitFeatures = splitFeature({ splitfeature, feature: new ol.Feature({ geometry })})
        if (splitFeatures.length > 0) {
          splitFeatures.forEach(geometry => geometry && splittedFeatureGeometries.push(new geomClass([geometry.getCoordinates()])))
        } else {
          splittedFeatureGeometries.push(new geomClass([geometry.getCoordinates()]))
        }
      })
  }

  // If geometry is Polygon
  if (is_poly) {
    const polygonFeature = is_multi ? geometries.feature.getPolygons() : geometries.feature;
    //if is a MultiPolygon
    if (is_multi) {
      addSplittedFeatureGeometries({
        feature:   polygonFeature,
        geomClass: ol.geom.MultiPolygon
      })
    } else {
      // case a Polygon
      const isZType                        = polygonFeature.getCoordinates()[0][0][2] !== undefined;
      const polygonFeatureGeometry         = parser.read(polygonFeature);
      const externalPolygonFeatureGeometry = parser.read(polygonFeature.getLinearRing(0));
      // create a line split feature in jsts
      const splitGeometry = parser.read(geometries.split);
      // add holes geometries
      let holePolygons;

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

              const is_single = isSingleGeometry(geometry);

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
  }

  //LineString or MultiLineString
  if (is_line) {
    const lineFeatureGeometry = is_multi ? geometries.feature.getLineStrings() : geometries.feature;

    if (is_multi) {
      addSplittedFeatureGeometries({
        feature:   lineFeatureGeometry,
        geomClass: ol.geom.MultiLineString
      })
    } else {
      return splitGeometryLine(geometries.split, geometries.feature);
    }
  }

  return splittedFeatureGeometries;
}