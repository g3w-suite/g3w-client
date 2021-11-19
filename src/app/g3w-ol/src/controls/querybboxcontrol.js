import {SPATIALMETHODS, VM} from '../constants';
const {merge} = require('../utils');
const InteractionControl = require('./interactioncontrol');

const QueryBBoxControl = function(options = {}){
  const {spatialMethod=SPATIALMETHODS[0]} = options;
  this._startCoordinate = null;
  this.layers = options.layers || [];
  const visible = this.checkVisible(this.layers);
  options.visible = visible;
  options.enabled = visible && this.checkEnabled(this.layers);
  this.unwatches = [];
  this.listenLayersVisibleChange();
  const _options = {
    offline: false,
    name: "querybbox",
    tipLabel: "sdk.mapcontrols.querybybbox.tooltip",
    label: options.label || "\ue902",
    clickmap: true, // set ClickMap
    interactionClass: ol.interaction.DragBox,
    onSelectlayer(selectLayer){
      const layers = this.layers;
      const selected = selectLayer.isSelected();
      if (selected) {
        const findLayer = layers.find(layer => layer === selectLayer);
        const enabled = findLayer && findLayer.isVisible() ? true: false;
        this.setEnable(enabled, false);
      } else {
        const enabled = this.checkEnabled(layers);
        this.setEnable(enabled);
      }
    },
    onhover: true,
    toggledTool:{
      type: 'spatialMethod',
      how: 'toggled' // or hover
    },
    spatialMethod
  };
  options = merge(options,_options);

  InteractionControl.call(this, options);
};

ol.inherits(QueryBBoxControl, InteractionControl);

const proto = QueryBBoxControl.prototype;

proto.listenLayersVisibleChange = function(){
  this.unwatches.forEach(unwatch => unwatch());
  this.unwatches.splice(0);
  this.layers.forEach(layer => {
    const {state} = layer;
    this.unwatches.push(VM.$watch(() =>  state.visible, visible =>{
      if (state.selected && !visible)this.setEnable(false);
      else {
        const enabled = this.checkEnabled(this.layers);
        this.setEnable(enabled, this.isToggled());
      }
    }))
  });
};

proto.change = function(layers=[]){
  this.layers = layers;
  const visible = this.checkVisible(layers);
  this.setVisible(visible);
  const enabled = this.checkEnabled(layers);
  this.setEnable(enabled);
  this.listenLayersVisibleChange(this.layers);
};

proto.checkVisible = function(layers=[]){
  return layers.length > 0;
};

proto.checkEnabled = function(layers=[]){
  return layers.length > 0 && layers.reduce((accumulator, layer) => {
    return accumulator || layer.isVisible();
  }, false);
};

proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this,map);
  this._interaction.on('boxstart', evt => this._startCoordinate = evt.coordinate);
  this._interaction.on('boxend', evt => {
    const start_coordinate = this._startCoordinate;
    const end_coordinate = evt.coordinate;
    const extent = ol.extent.boundingExtent([start_coordinate, end_coordinate]);
    this.dispatchEvent({
      type: 'bboxend',
      extent
    });
    this._startCoordinate = null;
    this._autountoggle && this.toggle();
  })
};

module.exports = QueryBBoxControl;
