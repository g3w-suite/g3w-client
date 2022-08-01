// MeasureInteracion
const t = require('core/i18n/i18n.service').t;

const MeasureIteraction = function(options={}) {
  this._helpTooltip;
  this._measureTooltipElement;
  this._measureTooltip;
  this._featureGeometryChangelistener;
  this._poinOnMapMoveListener;
  this._helpMsg = options.help;
  this._projection = options.projection;
  const useSphereMethods = this._projection.getCode() === 'EPSG:3857' || this._projection.getUnits() === 'degrees';
  const measureStyle = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: 'rgba(0, 0, 0, 0.5)',
      lineDash: [10, 10],
      width: 3
    }),
    image: new ol.style.Circle({
      radius: 5,
      stroke: new ol.style.Stroke({
        color: 'rgba(0, 0, 0, 0.7)'
      }),
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)'
      })
    })
  });
  const geometryType = options.geometryType || 'LineString';
  this._formatMeasure = null;
  // handel keydown event - delete of last vertex
  this._keyDownEventHandler = null;
  switch (geometryType) {
    case 'LineString':
     this._formatMeasure = function(feature) {
       let geometry = feature;
       const length = useSphereMethods ? ol.sphere.getLength(geometry, {
         projection: this._projection.getCode()
       }) : geometry.getLength();
       const output = (length > 1000) ? `${(Math.round(length / 1000 * 100) / 100).toFixed(3)} km`: `${(Math.round(length * 100) / 100).toFixed(2)} m`;
       return output;
      };
      break;
    case 'Polygon':
      this._formatMeasure = function(feature) {
        let geometry = feature;
        const area =  Math.round(useSphereMethods ? ol.sphere.getArea(geometry, {
          projection: this._projection.getCode()
        }): geometry.getArea());
        const output = area > 1000000 ? `${(Math.round(area / 1000000 * 100) / 100) .toFixed(6)} km<sup>2</sup>` : `${(Math.round(area * 100) / 100).toFixed(3)} m<sup>2</sup>`;
        return output;
      };
      break;
  }
  const source = new ol.source.Vector();
  this._helpTooltipElement;
  this._map = null;
  this._feature = null;
  this._layer = new ol.layer.Vector({
    source: source,
    style: function(feature) {
      const styles = [
        // linestring
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            lineDash: [10, 10],
            width: 3
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
          })
        })
      ];
      return styles;
    }
  });
  ol.interaction.Draw.call(this, {
    source: source,
    type: geometryType,
    style: measureStyle
  });
  this.set('beforeRemove', this.clear);
  this.set('layer', this._layer);
  // register event on two action
  this.on('drawstart', this._drawStart);
  this.on('drawend', this._drawEnd);
};

ol.inherits(MeasureIteraction, ol.interaction.Draw);

const proto = MeasureIteraction.prototype;

proto.setDrawMessage = function(message) {
  this._helpMsg = message;
};

proto.clear = function() {
  this._layer.getSource().clear();
  this._clearMessagesAndListeners();
  if (this._map) {
    this._map.removeOverlay(this._measureTooltip);
    this._map.removeLayer(this._layer);
  }
};

proto._clearMessagesAndListeners = function() {
  this._feature = null;
  // unset tooltip so that a new one can be created
  if (this._map) {
    this._measureTooltipElement = null;
    this._helpTooltipElement.innerHTML = '';
    this._helpTooltipElement.classList.add('hidden');
    ol.Observable.unByKey(this._featureGeometryChangelistener);
    ol.Observable.unByKey(this._poinOnMapMoveListener);
    $(document).off('keydown', this._keyDownEventHandler);
  }
};

proto._removeLastPoint = function(event) {
  const geom = this._feature.getGeometry();
  if (event.keyCode === 46) {
    if( geom instanceof ol.geom.Polygon && geom.getCoordinates()[0].length > 2) {
      this.removeLastPoint();
    } else if(geom instanceof ol.geom.LineString && geom.getCoordinates().length > 1) {
      this.removeLastPoint();
    }
  }
};

//drawStart function
proto._drawStart = function(evt) {
  this._map = this.getMap();
  this._map.removeLayer(this._layer);
  this._createMeasureTooltip();
  this._createHelpTooltip();
  this._feature = evt.feature;
  this._keyDownEventHandler = _.bind(this._removeLastPoint, this);
  $(document).on('keydown', this._keyDownEventHandler);
  // vado a ripulire tutte le features
  this._layer.getSource().clear();
  this._poinOnMapMoveListener = this._map.on('pointermove', (evt) => {
    if (evt.dragging) return;
    if (this._feature) helpMsg = t(this._helpMsg);
    this._helpTooltipElement.innerHTML = helpMsg;
    this._helpTooltip.setPosition(evt.coordinate);
    this._helpTooltipElement.classList.remove('hidden');
  });
  let tooltipCoord = evt.coordinate;
  this._featureGeometryChangelistener = this._feature.getGeometry().on('change', (evt) => {
    const geom = evt.target;
    if (geom instanceof ol.geom.Polygon) tooltipCoord = geom.getInteriorPoint().getCoordinates();
    else if (geom instanceof ol.geom.LineString) tooltipCoord = geom.getLastCoordinate();
    const output = this._formatMeasure(geom);
    this._measureTooltipElement.innerHTML = output;
    this._measureTooltip.setPosition(tooltipCoord);
  });
};

//funzione drawEnd
proto._drawEnd = function() {
  this._measureTooltipElement.className = 'mtooltip mtooltip-static';
  this._measureTooltip.setOffset([0, -7]);
  this._clearMessagesAndListeners();
  this._map.addLayer(this._layer);
};

/**
 * Creates a new help tooltip
 */
proto._createHelpTooltip = function() {
  this._helpTooltipElement && this._helpTooltipElement.parentNode.removeChild(this._helpTooltipElement);
  this._helpTooltip && this._map.removeOverlay(this._helpTooltip);
  this._helpTooltipElement = document.createElement('div');
  this._helpTooltipElement.className = 'mtooltip hidden';
  this._helpTooltip = new ol.Overlay({
    element: this._helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left'
  });
  this._map.addOverlay(this._helpTooltip);
};

/**
 * Creates a new measure tooltip
 */
proto._createMeasureTooltip = function() {
  this._measureTooltipElement && this._measureTooltipElement.parentNode.removeChild(this._measureTooltipElement);
  this._measureTooltip && this._map.removeOverlay(this._measureTooltip);
  this._measureTooltipElement = document.createElement('div');
  this._measureTooltipElement.className = 'mtooltip mtooltip-measure';
  this._measureTooltip = new ol.Overlay({
    element: this._measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center'
  });
  this._map.addOverlay(this._measureTooltip);
};
// END MEASURE CONTROLS //

module.exports = MeasureIteraction;
