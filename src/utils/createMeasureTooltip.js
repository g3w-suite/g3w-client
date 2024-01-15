import { formatMeasure } from 'utils/formatMeasure';

/**
 * create and add measure tooltip 
 */
export function createMeasureTooltip({ map, feature } = {}, options = {}) {
  const element = document.createElement('div');
  element.className = 'mtooltip mtooltip-measure';
  const tooltip = new ol.Overlay({
    element,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  map.addOverlay(tooltip);
  const unbyKey = feature.getGeometry().on('change', evt => {
    let tooltipCoord;
    const geometry = evt.target;
    if (geometry instanceof ol.geom.Polygon) tooltipCoord = geometry.getInteriorPoint().getCoordinates();
    else if(geometry instanceof ol.geom.MultiPolygon) tooltipCoord = geometry.getInteriorPoints().getCoordinates()[0];
    else if (geometry instanceof ol.geom.LineString) tooltipCoord = geometry.getLastCoordinate();
    else if (geometry instanceof ol.geom.MultiLineString) tooltipCoord = geometry.getLastCoordinate();
    const output = formatMeasure({
        geometry,
        projection: map.getView().getProjection()
      },
        options
      );
    element.innerHTML = output;
    tooltip.setPosition(tooltipCoord);
  });

  return {
    tooltip,
    unbyKey
  }
}