/**
 * @FIXME utility functions should be stateles (move it elsewhere)
 */
import ApplicationState                   from 'store/application-state';

import { getLengthMessageText }           from 'utils/getLengthMessageText';
import { getAreaMessageText }             from 'utils/getAreaMessageText';
import { isLineGeometryType }             from "utils/isLineGeometryType";
import { isPolygonGeometryType }          from "utils/isPolygonGeometryType";
import { isMultiGeometry }                from "utils/isMultiGeometry";
import { multiGeometryToSingleGeometries} from 'utils/multiGeometryToSingleGeometries';

function formatMeasure({ geometry, projection } = {}, options = {}) {
  /**
   * @FIXME circular dependency (ie. empty object when importing at top level), ref: #130
   */
  //
  const geometryType = geometry.getType();
  const unit         = ApplicationState.map.unit;
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

/**
 * create and add measure tooltip 
 */
export function createMeasureTooltip({ map, feature } = {}, options = {}) {
  const element     = document.createElement('div');
  element.className = 'mtooltip mtooltip-measure';

  const tooltip = new ol.Overlay({
    element,
    offset:      [0, -15],
    positioning: 'bottom-center'
  });

  map.addOverlay(tooltip);

  return {
    tooltip,
    unbyKey: feature
      .getGeometry()
      .on('change', e => {
        let tooltipCoord;
        const geometry = e.target;
        if (geometry instanceof ol.geom.Polygon) {
          tooltipCoord = geometry.getInteriorPoint().getCoordinates();
        } else if (geometry instanceof ol.geom.MultiPolygon) {
          tooltipCoord = geometry.getInteriorPoints().getCoordinates()[0];
        } else if (geometry instanceof ol.geom.LineString) {
          tooltipCoord = geometry.getLastCoordinate();
        } else if (geometry instanceof ol.geom.MultiLineString) {
          tooltipCoord = geometry.getLastCoordinate();
        }
        element.innerHTML = formatMeasure({ geometry, projection: map.getView().getProjection() }, options);
        tooltip.setPosition(tooltipCoord);
      })
  }
}