import { getCurrentMapUnit }    from 'utils/getCurrentMapUnit';
import { getLengthMessageText } from 'utils/getLengthMessageText';
import { getAreaMessageText }   from 'utils/getAreaMessageText';

export function formatMeasure({ geometry, projection } = {}, options = {}) {
  /**
   * @FIXME circular dependency (ie. empty object when importing at top level), ref: #130
   */
  const { Geometry, multiGeometryToSingleGeometries } = require('utils/geo');
  //
  const geometryType = geometry.getType();
  const unit = getCurrentMapUnit();
  if (Geometry.isLineGeometryType(geometryType)) {
    return getLengthMessageText({
      unit,
      projection,
      geometry
    });
  } else if (Geometry.isPolygonGeometryType(geometryType)){
    let segments;
    if (Geometry.isMultiGeometry(geometryType)) {
      segments = [];
      multiGeometryToSingleGeometries(geometry).forEach(geometry => {
        geometry.getLinearRing().getCoordinates().forEach(coordinates => segments.push(coordinates))
      })
    } else segments = geometry.getLinearRing().getCoordinates();
    return getAreaMessageText({unit, geometry, projection, segments});
  }
};