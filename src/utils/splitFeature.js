import { splitGeometryLine } from 'utils/splitGeometryLine'; 

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
    split: splitfeature.getGeometry() // geometry of split feature
  };
  // check geometry type of split
  const splitType                 = geometries.split.getType();
  // check geometry type of feature
  const featureGeometryType       = geometries.feature.getType();
  // array of split geometries
  const splittedFeatureGeometries = [];
  const parser = new jsts.io.OL3Parser();

  if ('LineString' !== splitType) {
    return [];
  }

  const is_line  = -1 !== featureGeometryType.indexOf('LineString');
  const is_poly  = -1 !== featureGeometryType.indexOf('Polygon');
  const is_multi = featureGeometryType.indexOf('Multi') !== -1;

  // If geometry is Polygon
  if (is_poly) {
    // check if is a MultiPolygon
    const polygonFeature = is_multi ? geometries.feature.getPolygons() : geometries.feature;
    if (Array.isArray(polygonFeature)) {
      polygonFeature.forEach(geometry => {
        splitFeature({
          splitfeature,
          feature: new ol.Feature({
            geometry
          })
        }).forEach(geometry => {
          geometry && splittedFeatureGeometries.push(new ol.geom.MultiPolygon([geometry.getCoordinates()]))
        })
      })
    }
    else {
      // case a Polygon
      const isZType = polygonFeature.getCoordinates()[0][0][2] !== undefined;
      const polygonFeatureGeometry = parser.read(polygonFeature);
      const externalPolygonFeatureGeometry = parser.read(polygonFeature.getLinearRing(0));
      // create a line split feature in jsts
      const splitGeometry = parser.read(geometries.split);
      // add holes geometries
      let holePolygons;

      if (polygonFeature.getLinearRingCount() > 1) {
        let holeFeaturesGeometry;
        for (let index=1; index < polygonFeature.getLinearRingCount(); index++) {
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
          .forEach(polygon => {
            if (holyPolygonUnion === undefined) {
              holyPolygonUnion = polygon;
            } else {
              holyPolygonUnion = holyPolygonUnion.union(polygon);
            }
        });

        holePolygons = holyPolygonUnion;
      }

      if (isZType) {
        polygonFeature.getCoordinates()[0].forEach((coordinate, index) => {
          externalPolygonFeatureGeometry.getCoordinates()[index].z = coordinate[2];
        });
        splitGeometry.getCoordinates().forEach(coordinate => coordinate.z = 0);
      }

      const union = externalPolygonFeatureGeometry.union(splitGeometry);
      const polygonizer = new jsts.operation.polygonize.Polygonizer();
      polygonizer.add(union);
      const polygons = polygonizer.getPolygons().toArray();
      if (polygons.length > 1) {
        polygons.forEach(polygon => {
          if (holePolygons) {
            polygon = polygon.difference(holePolygons);
          }
          if (polygonFeatureGeometry.intersects(polygon.getInteriorPoint())) {
            const geometry = parser.write(polygon);
            const polygonCoordinates = polygon.getCoordinates();
            if (isZType) {
              polygonCoordinates.forEach((coordinate, index) => {
                coordinate.z = coordinate.z === undefined ? polygonCoordinates[index === 0 ? index+1 : index-1].z : coordinate.z;
              })
            }
            if (isZType) {
              const zCoordinates = [];
              geometry.getCoordinates()[0]
                .forEach((c, i) => {
                  c.push(polygonCoordinates[i].z);
                  zCoordinates.push(c)
                });
              geometry.setCoordinates([zCoordinates]);
            }
            const geometryType = geometry.getType();

            if (is_multi) {
              splittedFeatureGeometries.push(new ol.geom.MultiPolygon(geometryType=== 'Polygon' ? [geometry.getCoordinates()] : geometry.getCoordinates()))
            } else {
              if ('Polygon' === geometryType) {
                splittedFeatureGeometries.push(geometry);
              } else {
                geometry
                  .getCoordinates()
                  .forEach(c => splittedFeatureGeometries.push(new ol.geom.Polygon(c)))
              }
            }
          }
        })
      }
    }
    //LineString or MultiLineString
  } else if (is_line) {
    const lineFeatureGeometry = is_multi ? geometries.feature.getLineStrings() : geometries.feature;
    if (Array.isArray(lineFeatureGeometry)) {
      lineFeatureGeometry.forEach(lineGeometry => {
        splitFeature({
          splitfeature,
          feature: new ol.Feature({
            geometry: lineGeometry
          })
        }).forEach(geometry => {
          geometry && splittedFeatureGeometries.push(new ol.geom.MultiLineString([geometry.getCoordinates()]))
        })
      })
    } else {
      return splitGeometryLine(geometries.split, geometries.feature);
    }
  }

  return splittedFeatureGeometries;
}