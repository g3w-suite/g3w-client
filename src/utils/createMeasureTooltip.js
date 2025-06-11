import ApplicationState from 'store/application';

const round   = val      => (Math.round(val * 100) / 100).toFixed(2);
const degrees = (c1, c2) => parseInt(Math.atan2(c1[0] - c2[0], c1[1] - c2[1]) * 180 / Math.PI);

const formatted_area = area => 'nautical' === ApplicationState.map.unit
  ? `${area * 0.000000291553349598122862913947445759414840765222583489217190918463024037990567} nmi²`
  : area > 1000000
    ? `${round(area / 1000000)} km²`
    : `${round(area)} m²`;

const formatted_length = length => 'nautical' === ApplicationState.map.unit
  ? `${length * 0.0005399568} nm`
  : length > 1000
    ? `${round(length / 1000)} km`
    : `${round(length)} m`;

const is_spherical = map => 'EPSG:3857' === map.getView().getProjection().getCode() || 'degrees' === map.getView().getProjection().getUnits();

/**
 * create and add measure tooltip 
 */
export function createMeasureTooltip({ map, feature } = {}) {
  const element               = document.createElement('div');
  element.className           = 'mtooltip mtooltip-measure';
  element.style.pointerEvents = 'none';

  const tooltip = new ol.Overlay({
    element,
    offset:      [0, -15],
    positioning: 'bottom-center',
    stopEvent:   false // disable pointer events
  });

  map.addOverlay(tooltip);

  const unbyKey = feature
    .getGeometry()
    .on('change', e => {
      const geom = e.target;

      const segments = /^Polygon|^MultiPolygon/.test(geom.getType()) && (geom?.getPolygons?.() || [geom]).flatMap(p => p.getLinearRing().getCoordinates()) || [];

      const length = /^Line|^MultiLine/.test(geom.getType()) || (/^Polygon|^MultiPolygon/.test(geom.getType()) && segments.length > 2)
        ? is_spherical(map)
          ? ol.sphere.getLength(segments.length ? new ol.geom.LineString(segments) : geom, { projection: map.getView().getProjection().getCode() })
          : /^Multi/.test(geom.getType())
            ? geom.getLineStrings().reduce((len, geom) => len+=geom.getLength(), 0)
            : (new ol.geom.LineString(segments)).getLength()
        : undefined;

      const area = /^Polygon|^MultiPolygon/.test(geom.getType())
        ? is_spherical(map)
            ? ol.sphere.getArea(geom, { projection: map.getView().getProjection().getCode() })
            : geom.getArea()
        : undefined;

      const radius = 'Circle' === geom.getType() ? geom.getRadius() : undefined;

      element.innerHTML = [
        area   && `Area: ${formatted_area(area)} <br>`,
        area   && length && `<div style="width: 100%; padding: 3px; border-bottom: 2px solid #fff"></div> `,
        length && formatted_length(length),
        radius && `${degrees(geom.getCenter(), feature.get('endCoordinates'))}°, ${formatted_length(radius)}`,
      ].filter(Boolean).join('');

      if (geom instanceof ol.geom.Polygon) {
        tooltip.setPosition(geom.getInteriorPoint().getCoordinates());
      }

      if (geom instanceof ol.geom.MultiPolygon) {
        tooltip.setPosition(geom.getInteriorPoints().getCoordinates()[0]);
      }

      if (geom instanceof ol.geom.LineString || geom instanceof ol.geom.MultiLineString) {
        tooltip.setPosition(geom.getLastCoordinate());
      }

      if (geom instanceof ol.geom.Circle && feature.get('endCoordinates')) {
        tooltip.setPosition(feature.get('endCoordinates'));
      }
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