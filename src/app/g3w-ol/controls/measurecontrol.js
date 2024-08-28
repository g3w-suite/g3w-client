import GUI                         from 'services/gui';
import { InteractionControl }      from 'g3w-ol/controls/interactioncontrol';
import { createMeasureTooltip }    from 'utils/createMeasureTooltip';
import { setMeasureTooltipStatic } from 'utils/setMeasureTooltipStatic';
import { removeMeasureTooltip }    from 'utils/removeMeasureTooltip';

const { t }                        = require('core/i18n/i18n.service');

export class MeasureInteraction extends ol.interaction.Draw {

  constructor(opts) {
    const measureStyle     = new ol.style.Style({
      fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
      stroke: new ol.style.Stroke({ color: opts.drawColor || 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 3 }),
      image:  new ol.style.Circle({
        radius: 5,
        stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
        fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
      }),
    });
    const source       = new ol.source.Vector();

    super({
      source,
      type:  opts.geometryType || 'LineString',
      style: measureStyle
    });

    this._helpTooltip;
    this._measureTooltipElement;
    this._measureTooltip;
    this._featureGeometryChangelistener;
    this._poinOnMapMoveListener;
    this._helpTooltipElement;

    this._helpMsg      = opts.help;
    this._projection   = opts.projection;
    this.feature       = opts.feature;
    this._map          = null;
    this._feature      = null;
    this._layer        = new ol.layer.Vector({
      source,
      style() {
        return [
          new ol.style.Style({
            stroke: new ol.style.Stroke({ lineDash: [10, 10], width: 3 }),
            fill:   new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
          })
        ];
      }
    });

    this.set('beforeRemove', this.clear);
    this.set('layer',        this._layer);
    // register event on two action
    this.on('drawstart',     this._drawStart);
    this.on('drawend',       this._drawEnd);
  }

  clear() {
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
  }

  _clearMessagesAndListeners() {
    this._feature = null;
    // unset tooltip so that a new one can be created
    if (this._map) {
      this._measureTooltipElement        = null;
      this._helpTooltipElement.innerHTML = '';

      this._helpTooltipElement.classList.add('hidden');

      ol.Observable.unByKey(this._featureGeometryChangelistener);
      ol.Observable.unByKey(this._poinOnMapMoveListener);

      $(document).off('keydown', this._keyDownEventHandler);
    }
  }

  //drawStart function
  _drawStart(e) {
    this._map = this.getMap();
    this._map.removeLayer(this._layer);
    this._feature = e.feature;
    if (this.feature) { this._feature.setGeometry(this.feature.getGeometry()) }
    // removed last point
    this._keyDownEventHandler = e => {
      const geom = this._feature.getGeometry();
      if (46 === e.keyCode) {
        if ( geom instanceof ol.geom.Polygon && geom.getCoordinates()[0].length > 2) {
          this.removeLastPoint();
        } else if (geom instanceof ol.geom.LineString && geom.getCoordinates().length > 1) {
          this.removeLastPoint();
        }
      }
    };
    $(document).on('keydown', this._keyDownEventHandler);
    this._layer.getSource().clear();
    this._poinOnMapMoveListener = this._map.on('pointermove', e => {
      if (e.dragging) { return }
      if (this._feature && this._helpMsg) {
        this._helpTooltipElement.innerHTML = t(this._helpMsg);
        this._helpTooltip.setPosition(e.coordinate);
        this._helpTooltipElement.classList.remove('hidden');
      }
    });
    // create help tooltip
    if (this._helpTooltipElement) { this._helpTooltipElement.parentNode.removeChild(this._helpTooltipElement) }
    if (this._helpTooltip) { this._map.removeOverlay(this._helpTooltip) }
    this._helpTooltipElement           = document.createElement('div');
    this._helpTooltipElement.className = 'mtooltip hidden';
    this._helpTooltip                  = new ol.Overlay({
      element:     this._helpTooltipElement,
      offset:      [15, 0],
      positioning: 'center-left'
    });

    this._map.addOverlay(this._helpTooltip);

    // create measure tooltip
    if (this.measureTooltip) { removeMeasureTooltip({ ...this.measureTooltip, map: this._map }) }
    this.measureTooltip = createMeasureTooltip({ map: this._map, feature: this._feature });
  }

  _drawEnd() {
    setMeasureTooltipStatic(this.measureTooltip.tooltip);
    this._clearMessagesAndListeners();
    this._map.addLayer(this._layer);
  }
}


export class MeasureControl extends InteractionControl {

  constructor(opts = {}) {
    super({
      ...opts,
      clickmap: true,
      enabled:  true,
      onToggled(toggled) {
        // toggle current interaction
        this._interaction.setActive(this.isToggled());
        // when not toggled
        if (!toggled) { this._interaction.clear() }
        // check if first interaction is current interaction
        if (!toggled && this.interactions[this.types[0]] !== this._interaction) {
          //remove current interaction from the map
          this.getMap().removeInteraction(this._interaction);
          this._interaction = this.interactions[this.types[0]];
          //add first interaction
          this.getMap().addInteraction(this._interaction);
        }
      }
    });

    this.types        = [];

    this.interactions = {};

    (opts.types || []).forEach(t => this.addType(t));

    // no type set, hide control
    if (0 === this.types.length) {
      this.setVisible(false);
    }

    this.on('setMap', e => e.map.addInteraction(this._interaction));
  }

  /**
   * @param { 'area' | 'length' } type 
   *
   * @since 3.11.0
   */
  addType(type) {
    this.types.push(type);

    this._interactionClassOptions.geometryType = ({ area: 'Polygon', length: 'LineString' })[type];

    this.interactions[type]                    = new MeasureInteraction(this._interactionClassOptions);

    this.interactions[type].setActive(false);

    if (!this._interaction) {
      this._interaction = this.interactions[type];
    }

    if (this.types.length > 1 && !this.toggledTool) {
      this.createControlTool();
    }
  }

  createControlTool() {
    return super.createControlTool({
      type: 'custom',
      component: {
        __title:      'sdk.mapcontrols.measures.title',
        __iconClass:  'measure', //@since v3.11.0
        data: () => ({ types: this.types, type: this.types[0] }),
        template: /* html */ `
          <div style="width: 100%; padding: 5px;">
            <select ref="select" style="width: 100%" :search="false" v-select2="'type'">
              <option v-for="type in types" :value="type" v-t="'sdk.mapcontrols.measures.' + type + '.tooltip'"></option>
            </select>
          </div>`,
        watch: {
          // change measure interaction
          type: (ntype, otype) => {
            // deactivate previous interaction
            this.interactions[otype].setActive(false);
            this.interactions[otype].clear();
            this.getMap().removeInteraction(this.interactions[otype]);
            // activate new interacion
            this.getMap().addInteraction(this.interactions[ntype]);
            this.interactions[ntype].setActive(true);
            this._interaction = this.interactions[ntype];
          },
        },
        created()       { GUI.setCloseUserMessageBeforeSetContent(false); },
        beforeDestroy() { GUI.setCloseUserMessageBeforeSetContent(true); }
      }
    });
  }

}