import { SPATIALMETHODS, VM } from 'g3w-ol/constants';

const { merge } = require('core/utils/ol');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');

const QueryBBoxControl = function(options = {}) {

  const {
    spatialMethod = SPATIALMETHODS[0]
  } = options;

  /**
   * @FIXME add description
   */
  this._startCoordinate = null;

  /**
   * @FIXME add description
   */
  this.unwatches        = [];

  /**
   * @FIXME add description
   */
  this.layers           = options.layers || [];

  options.visible       = this.checkVisible(this.layers);
  options.enabled       = options.visible && this.checkEnabled(this.layers);

  this.listenLayersChange();

  const _options = {
    offline: false,
    name: "querybbox",
    tipLabel: "sdk.mapcontrols.querybybbox.tooltip",
    label: options.label || "\ue902",
    clickmap: true, // set ClickMap
    interactionClass: ol.interaction.DragBox,
    onSelectlayer(selectLayer) {
      const layers = this.layers;
      if (selectLayer.isSelected()) {
        const findLayer = layers.find(layer => layer === selectLayer);
        this.setEnable((findLayer && findLayer.isVisible() ? true : false), false);
      } else {
        this.setEnable(this.checkEnabled(layers));
      }
    },
    onhover: true,
    toggledTool:{
      type: 'spatialMethod',
      how: 'toggled' // or hover
    },
    spatialMethod
  };

  options = merge(options, _options);

  InteractionControl.call(this, options);

};

ol.inherits(QueryBBoxControl, InteractionControl);

const proto = QueryBBoxControl.prototype;

proto.listenLayersChange = function() {
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    this.unwatches
      .push(
        VM.$watch(
          () => layer.state.visible,
          visible => {
            if (layer.state.selected && !visible) {
              this.setEnable(false);
            } else {
              const enabled = this.checkEnabled(this.layers);
              if (this.getEnable() !== enabled) {
                this.setEnable(enabled,  enabled && this.isToggled())
              }
            }
          }
        )
      )
    }
  );
};

proto.change = function(layers=[]) {
  this.layers = layers;
  this.setVisible(this.checkVisible(layers));
  this.setEnable(this.checkEnabled(layers));
  this.listenLayersChange(this.layers);
};

proto.checkVisible = function(layers=[]) {
  return layers.length > 0;
};

proto.checkEnabled = function(layers=[]) {
  return (layers.length > 0) && layers.reduce((accumulator, layer) => accumulator || layer.isVisible(), false);
};

/**
 * @param {ol.Map} map 
 */
proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this,map);

  this._interaction.on('boxstart', evt => this._startCoordinate = evt.coordinate);
  this._interaction.on('boxend',   evt => {
    this.dispatchEvent({
      type: 'bboxend',
      extent: ol.extent.boundingExtent([this._startCoordinate, evt.coordinate]) // [start, end]
    });
    this._startCoordinate = null;
    if (this._autountoggle) {
      this.toggle();
    }
  });

};

module.exports = QueryBBoxControl;
