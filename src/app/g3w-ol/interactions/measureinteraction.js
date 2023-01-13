const { t } = require('core/i18n/i18n.service');
const {
  createMeasureTooltip,
  setMeasureTooltipStatic,
  removeMeasureTooltip,
  needUseSphereMethods
} = require('core/utils/ol');

const MeasureIteraction = function(options={}) {
  this._helpTooltip;
  this._measureTooltipElement;
  this._measureTooltip;
  this._featureGeometryChangelistener;
  this._poinOnMapMoveListener;
  this.testTooltip;
  this._helpMsg = options.help;
  this._projection = options.projection;
  this.feature = options.feature;
  const drawColor = options.drawColor || 'rgba(0, 0, 0, 0.5)';
  const useSphereMethods = needUseSphereMethods(this._projection);
  const measureStyle = new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: drawColor,
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
  const source = new ol.source.Vector();
  this._helpTooltipElement;
  this._map = null;
  this._feature = null;
  this._layer = new ol.layer.Vector({
    source,
    style() {
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
    source,
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
    removeMeasureTooltip({
      map: this._map,
      ...this.measureTooltip
    });
    this.measureTooltip = null;
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
  this._feature = evt.feature;
  this.feature && this._feature.setGeometry(this.feature.getGeometry());
  this._keyDownEventHandler = this._removeLastPoint.bind(this);
  $(document).on('keydown', this._keyDownEventHandler);
  this._layer.getSource().clear();
  this._poinOnMapMoveListener = this._map.on('pointermove', evt => {
    if (evt.dragging) return;
    if (this._feature && this._helpMsg) {
      const helpMsg = t(this._helpMsg);
      this._helpTooltipElement.innerHTML = helpMsg;
      this._helpTooltip.setPosition(evt.coordinate);
      this._helpTooltipElement.classList.remove('hidden');
    }
  });
  this._createHelpTooltip();
  this._createMeasureTooltip();
};

proto._drawEnd = function() {
  const {tooltip}= this.measureTooltip;
  setMeasureTooltipStatic(tooltip);
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
  this.measureTooltip && removeMeasureTooltip({
    ...this.measureTooltip,
    map: this._map
  });
  this.measureTooltip = createMeasureTooltip({
      map: this._map,
      feature: this._feature
    })

};
// END MEASURE CONTROLS //

module.exports = MeasureIteraction;
