import { getCurrentMapUnit }              from 'utils/getCurrentMapUnit';
import { getLengthMessageText }           from 'utils/getLengthMessageText';
import { getAreaMessageText }             from 'utils/getAreaMessageText';
import { isLineGeometryType }             from "utils/isLineGeometryType";
import { isPolygonGeometryType }          from "utils/isPolygonGeometryType";
import { isMultiGeometry }                from "utils/isMultiGeometry";
import { multiGeometryToSingleGeometries} from 'utils/multiGeometryToSingleGeometries';

export function formatMeasure({ geometry, projection } = {}, options = {}) {
  /**
   * @FIXME circular dependency (ie. empty object when importing at top level), ref: #130
   */
  //
  const geometryType = geometry.getType();
  const unit         = getCurrentMapUnit();
  if (isLineGeometryType(geometryType)) {
    return getLengthMessageText({
      unit,
      projection,
      geometry
    });
  } else if (isPolygonGeometryType(geometryType)) {
    let segments;
    if (isMultiGeometry(geometryType)) {
      segments = [];
      multiGeometryToSingleGeometries(geometry).forEach(geometry => {
        geometry.getLinearRing().getCoordinates().forEach(coordinates => segments.push(coordinates))
      })
    } else {
      segments = geometry.getLinearRing().getCoordinates();
    }
    return getAreaMessageText({unit, geometry, projection, segments});
  }
}