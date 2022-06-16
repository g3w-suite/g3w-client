import { t } from 'core/i18n/i18n.service';
import { Draw } from 'ol/interaction';
import {
  Style, Circle, Fill, Stroke,
} from 'ol/style';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Overlay } from 'ol';
import { unByKey } from 'ol/Observable';
import { LineString, Polygon } from 'ol/geom';
import {
  createMeasureTooltip, setMeasureTooltipStatic, removeMeasureTooltip, needUseSphereMethods,
} from '../utils/utils';

class MeasureIteraction extends Draw {
  constructor(options = {}) {
    const geometryType = options.geometryType || 'LineString';
    const measureStyle = new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: drawColor,
        lineDash: [10, 10],
        width: 3,
      }),
      image: new Circle({
        radius: 5,
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
      }),
    });
    const source = new VectorSource();
    super({
      source,
      type: geometryType,
      style: measureStyle,
    });
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
    this._helpTooltipElement;
    this._map = null;
    this._feature = null;
    this._layer = new VectorLayer({
      source,
      style() {
        const styles = [
          // linestring
          new Style({
            stroke: new Stroke({
              lineDash: [10, 10],
              width: 3,
            }),
            fill: new Fill({
              color: 'rgba(255, 255, 255, 0.2)',
            }),
          }),
        ];
        return styles;
      },
    });

    this.set('beforeRemove', this.clear);
    this.set('layer', this._layer);
    // register event on two action
    this.on('drawstart', this._drawStart);
    this.on('drawend', this._drawEnd);
  }

  setDrawMessage(message) {
    this._helpMsg = message;
  }

  clear() {
    this._layer.getSource().clear();
    this._clearMessagesAndListeners();
    if (this._map) {
      removeMeasureTooltip({
        map: this._map,
        ...this.measureTooltip,
      });
      this.measureTooltip = null;
      this._map.removeLayer(this._layer);
    }
  }

  _clearMessagesAndListeners() {
    this._feature = null;
    // unset tooltip so that a new one can be created
    if (this._map) {
      this._measureTooltipElement = null;
      this._helpTooltipElement.innerHTML = '';
      this._helpTooltipElement.classList.add('hidden');
      unByKey(this._featureGeometryChangelistener);
      unByKey(this._poinOnMapMoveListener);
      $(document).off('keydown', this._keyDownEventHandler);
    }
  }

  _removeLastPoint(event) {
    const geom = this._feature.getGeometry();
    if (event.keyCode === 46) {
      if (geom instanceof Polygon && geom.getCoordinates()[0].length > 2) {
        this.removeLastPoint();
      } else if (geom instanceof LineString && geom.getCoordinates().length > 1) {
        this.removeLastPoint();
      }
    }
  }

  // drawStart function
  _drawStart(evt) {
    this._map = this.getMap();
    this._map.removeLayer(this._layer);
    this._feature = evt.feature;
    this.feature && this._feature.setGeometry(this.feature.getGeometry());
    this._keyDownEventHandler = this._removeLastPoint.bind(this);
    $(document).on('keydown', this._keyDownEventHandler);
    this._layer.getSource().clear();
    this._poinOnMapMoveListener = this._map.on('pointermove', (evt) => {
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
  }

  _drawEnd() {
    const { tooltip } = this.measureTooltip;
    setMeasureTooltipStatic(tooltip);
    this._clearMessagesAndListeners();
    this._map.addLayer(this._layer);
  }

  /**
   * Creates a new help tooltip
   */
  _createHelpTooltip() {
    this._helpTooltipElement && this._helpTooltipElement.parentNode.removeChild(this._helpTooltipElement);
    this._helpTooltip && this._map.removeOverlay(this._helpTooltip);
    this._helpTooltipElement = document.createElement('div');
    this._helpTooltipElement.className = 'mtooltip hidden';
    this._helpTooltip = new Overlay({
      element: this._helpTooltipElement,
      offset: [15, 0],
      positioning: 'center-left',
    });
    this._map.addOverlay(this._helpTooltip);
  }

  /**
   * Creates a new measure tooltip
   */
  _createMeasureTooltip() {
    this.measureTooltip && removeMeasureTooltip({
      ...this.measureTooltip,
      map: this._map,
    });
    this.measureTooltip = createMeasureTooltip({
      map: this._map,
      feature: this._feature,
    });
  }
  // END MEASURE CONTROLS //
}

export default MeasureIteraction;
