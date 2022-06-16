import { DragBox } from 'ol/interaction';
import { boundingExtent } from 'ol/extent';
import { SPATIALMETHODS, VM } from '../constants';
import InteractionControl from './interactioncontrol';

class QueryBBoxControl extends InteractionControl {
  constructor(options = {}) {
    const { spatialMethod = SPATIALMETHODS[0] } = options;
    options = {
      ...options,
      offline: false,
      name: 'querybbox',
      tipLabel: 'sdk.mapcontrols.querybybbox.tooltip',
      label: options.label || '\ue902',
      clickmap: true, // set ClickMap
      interactionClass: DragBox,
      onSelectlayer(selectLayer) {
        const { layers } = this;
        const selected = selectLayer.isSelected();
        if (selected) {
          const findLayer = layers.find((layer) => layer === selectLayer);
          const enabled = !!(findLayer && findLayer.isVisible());
          this.setEnable(enabled, false);
        } else {
          const enabled = this.checkEnabled(layers);
          this.setEnable(enabled);
        }
      },
      onhover: true,
      toggledTool: {
        type: 'spatialMethod',
        how: 'toggled', // or hover
      },
      spatialMethod,
    };
    super(options);
    this._startCoordinate = null;
    this.layers = options.layers || [];
    const visible = this.checkVisible(this.layers);
    this.setVisible(visible);
    options.enabled = visible && this.checkEnabled(this.layers);
    this.unwatches = [];
    this.listenLayersVisibleChange();
  }

  listenLayersVisibleChange() {
    this.unwatches.forEach((unwatch) => unwatch());
    this.unwatches.splice(0);
    this.layers.forEach((layer) => {
      const { state } = layer;
      this.unwatches.push(VM.$watch(() => state.visible, (visible) => {
        if (state.selected && !visible) this.setEnable(false);
        else {
          const enabled = this.checkEnabled(this.layers);
          enabled !== this.getEnable() && this.setEnable(enabled, enabled && this.isToggled());
        }
      }));
    });
  }

  change(layers = []) {
    this.layers = layers;
    const visible = this.checkVisible(layers);
    this.setVisible(visible);
    const enabled = this.checkEnabled(layers);
    this.setEnable(enabled);
    this.listenLayersVisibleChange(this.layers);
  }

  checkVisible(layers = []) {
    return layers.length > 0;
  }

  checkEnabled(layers = []) {
    return layers.length > 0 && layers.reduce((accumulator, layer) => accumulator || layer.isVisible(), false);
  }

  setMap(map) {
    super.setMap(map);
    this._interaction.on('boxstart', (evt) => this._startCoordinate = evt.coordinate);
    this._interaction.on('boxend', (evt) => {
      const start_coordinate = this._startCoordinate;
      const end_coordinate = evt.coordinate;
      const extent = boundingExtent([start_coordinate, end_coordinate]);
      this.dispatchEvent({
        type: 'bboxend',
        extent,
      });
      this._startCoordinate = null;
      this._autountoggle && this.toggle();
    });
  }
}

export default QueryBBoxControl;
