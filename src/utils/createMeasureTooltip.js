import ApplicationState          from 'store/application';
import { isLineGeometryType }    from "utils/isLineGeometryType";
import { isPolygonGeometryType } from "utils/isPolygonGeometryType";
import { isMultiGeometry }       from "utils/isMultiGeometry";

/**
 * create and add measure tooltip 
 */
export function createMeasureTooltip({ map, feature } = {}) {
  const element     = document.createElement('div');
  element.className = 'mtooltip mtooltip-measure';

  const tooltip = new ol.Overlay({
    element,
    offset:      [0, -15],
    positioning: 'bottom-center'
  });

  map.addOverlay(tooltip);

  const unbyKey = feature
    .getGeometry()
    .on('change', e => {
      let coords;
      const geom = e.target;

      if (geom instanceof ol.geom.Polygon) {
        coords = geom.getInteriorPoint().getCoordinates();
      }

      if (geom instanceof ol.geom.MultiPolygon) {
        coords = geom.getInteriorPoints().getCoordinates()[0];
      }

      if (geom instanceof ol.geom.LineString || geom instanceof ol.geom.MultiLineString) {
        coords = geom.getLastCoordinate();
      }

      if (geom instanceof ol.geom.Circle && feature.get('endCoordinates')) {
        coords = feature.get('endCoordinates');
      }

      const projection = map.getView().getProjection();
      const is_line    = isLineGeometryType(geom.getType());
      const is_poly    = isPolygonGeometryType(geom.getType());
      const is_circle  = 'Circle' === geom.getType(); // add circle geometry type
      const is_multi   = isMultiGeometry(geom.getType());
      const is_sphere  = 'EPSG:3857' === projection.getCode() || 'degrees' === projection.getUnits();

      let segments     = [];


      if (is_poly && is_multi) {
        (geom.getPolygons() || []).forEach(p => p.getLinearRing().getCoordinates().forEach(coords => segments.push(coords)));
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

      let radius = is_circle ? geom.getRadius() : undefined;

      if (undefined !== radius) {
        radius = radius > 1000
          ? `${(Math.round(radius / 1000 * 100) / 100).toFixed(3)} km`
          : `${(Math.round(radius * 100) / 100).toFixed(2)} m`;
      }  

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
                        + (undefined !== length ? length : '')
                        + (undefined !== radius ? `${parseInt(Math.atan2(geom.getCenter()[0] - coords[0], geom.getCenter()[1] - coords[1]) * 180 / Math.PI)}°, ${radius}` : '');
      tooltip.setPosition(coords);
    });

  return {
    tooltip,
    unbyKey,
    /**
     * @since 4.0.0
     */
    remove() {
      tooltip.getMap().removeOverlay(tooltip);
      ol.Observable.unByKey(unbyKey);
    }
  };
}

/**
 * @deprecated use `remove` from `createMeasureTooltip` instead
 * 
 * Remove mesure tootltip
 * 
 * @param { Object } opts
 * @param opts.map
 * @param opts.tooltip
 * @param opts.unByKey 
 */
export function removeMeasureTooltip({
  map,
  tooltip,
  unbyKey,
}) {
  map.removeOverlay(tooltip);
  ol.Observable.unByKey(unbyKey);
}