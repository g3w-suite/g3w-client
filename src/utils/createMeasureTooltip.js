/**
 * @TODO move all of these utils within "annotation" or "measure" map control
 */
import ApplicationState from 'g3w-state';

const round = val => (Math.round(val * 100) / 100).toFixed(2);

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
    stopEvent:   false, // disable pointer events
  });

  map.addOverlay(tooltip);

  const unbyKey = feature
    .getGeometry()
    .on('change', e => {
      const geom = e.target;

      const length = get_formatted_length(geom);
      const area   = get_formatted_area(geom);
      const radius = get_formatted_radius(geom);

      element.innerHTML = [
        area   && `Area: ${area} <br>`,
        area   && length && `<div style="width: 100%; padding: 3px; border-bottom: 2px solid #fff"></div> `,
        length,
        radius && `${get_formatted_angle(geom.getCenter(), feature.get('endCoordinates'))}, ${radius}`,
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
      tooltip.getMap()?.removeOverlay(tooltip);
      ol.Observable.unByKey(unbyKey);
    }
  };
}

export function get_formatted_area(geom, epsg = ApplicationState.map_epsg, unit = ApplicationState.map_unit) {
  if (!/^Polygon|^MultiPolygon/.test(geom.getType())) {
    return;
  }

  const area = 'EPSG:3857' === epsg || 'degrees' === unit ? ol.sphere.getArea(geom, { projection: epsg }) : geom.getArea();

  if ('nautical' === unit) {
    return `${area * 0.000000291553349598122862913947445759414840765222583489217190918463024037990567} nmi²`;
  }

  return area > 10000 ? `${round(area / 1000000)} km²` : `${round(area)} m²`;
}

export function get_formatted_length(geom, epsg = ApplicationState.map_epsg, unit = ApplicationState.map_unit) {

  const segments = (/^Polygon|^MultiPolygon/.test(geom.getType()) && (geom?.getPolygons?.() || [geom]).flatMap(p => p.getLinearRing().getCoordinates())) || [];

  if (!(/^Line|^MultiLine/.test(geom.getType()) || (/^Polygon|^MultiPolygon/.test(geom.getType()) && segments.length > 2))) {
    return;
  }
  const length = 'EPSG:3857' === epsg || 'degrees' === unit
    ? ol.sphere.getLength(segments.length ? new ol.geom.LineString(segments) : geom, { projection: epsg })
    : /^Multi/.test(geom.getType())
      ? geom.getLineStrings().reduce((len, geom) => len+=geom.getLength(), 0)
      : (segments.length ? new ol.geom.LineString(segments) : geom).getLength();

  if ('nautical' === unit) {
    return `${length * 0.0005399568} nm`;
  }

  return length > 100 ? `${round(length / 1000)} km` : `${round(length)} m`;
}

export function get_formatted_angle(c1, c2) {
  return parseInt(Math.atan2(c1[0] - c2[0], c1[1] - c2[1]) * 180 / Math.PI) + '°';
}

export function get_formatted_radius(geom, epsg = ApplicationState.map_epsg, unit = ApplicationState.map_unit) {
  if ('Circle' !== geom.getType()) {
    return;
  }
  const radius = geom.getRadius();

  if ('nautical' === unit) {
    return `${radius * 0.0005399568} nm`;
  }

  return radius > 100 ? `${round(radius / 1000)} km` : `${round(radius)} m`;
}