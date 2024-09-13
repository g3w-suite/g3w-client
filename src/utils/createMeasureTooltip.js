import ApplicationState                   from 'store/application-state';

import { isLineGeometryType }             from "utils/isLineGeometryType";
import { isPolygonGeometryType }          from "utils/isPolygonGeometryType";
import { isMultiGeometry }                from "utils/isMultiGeometry";
import { multiGeometryToSingleGeometries} from 'utils/multiGeometryToSingleGeometries';

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
        let coords;
        const geom = e.target;

        if (geom instanceof ol.geom.Polygon) {
          coords = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof ol.geom.MultiPolygon) {
          coords = geom.getInteriorPoints().getCoordinates()[0];
        } else if (geom instanceof ol.geom.LineString || geom instanceof ol.geom.MultiLineString) {
          coords = geom.getLastCoordinate();
        }

        const projection = map.getView().getProjection();
        const is_line    = isLineGeometryType(geom.getType());
        const is_poly    = isPolygonGeometryType(geom.getType());
        const is_multi   = isMultiGeometry(geom.getType());
        const is_sphere  = 'EPSG:3857' === projection.getCode() || 'degrees' === projection.getUnits();
        let segments     = [];


        if (is_poly && is_multi) {
          multiGeometryToSingleGeometries(geom).forEach(geometry => {
            geometry.getLinearRing().getCoordinates().forEach(coordinates => segments.push(coordinates))
          })
        }

        if (is_poly && !is_multi) {
          segments = geom.getLinearRing().getCoordinates();
        }

        const _geom = (is_poly && segments.length > 2) ? new ol.geom.LineString(segments) : geom;

        let length = (is_line || (is_poly && segments.length > 2))
          ? is_sphere
            ? ol.sphere.getLength(_geom, { projection: projection.getCode() })
            : isMultiGeometry(_geom.getType())
              ? _geom.getLineStrings().reduce((totalLength, lineGeometry) => totalLength+= lineGeometry.getLength(), 0)
              : _geom.getLength()
          : undefined;

        let area = is_poly
          ? Math.round(
              is_sphere
                ? ol.sphere.getArea(geom, { projection: projection.getCode() })
                : geom.getArea()
            )
          : undefined;

        if (undefined !== length) {
          length = 'nautical' === ApplicationState.map.unit
            ? `${length * 0.0005399568} nm`
            : length > 1000
              ? `${(Math.round(length / 1000 * 100) / 100).toFixed(3)} km`
              : `${(Math.round(length * 100) / 100).toFixed(2)} m`;
        }

        if (undefined !== area) {
          area = 'nautical' === ApplicationState.map.unit
            ? `${area * 0.000000291553349598122862913947445759414840765222583489217190918463024037990567}  nmi²`
            : area > 1000000
              ? `${(Math.round(area / 1000000 * 100) / 100).toFixed(6)} km<sup>2</sup>`
              : `${(Math.round(area * 100) / 100).toFixed(3)} m<sup>2</sup>`;
        }

        element.innerHTML = (undefined !== area ? `Area: ${area} <br>` : '')
                          + (undefined !== area && undefined !== length ? `<div style="width: 100%; padding: 3px; border-bottom: 2px solid #ffffff"></div> ` : '')
                          + (undefined !== length ? length : '');
        tooltip.setPosition(coords);
      })
  };
}