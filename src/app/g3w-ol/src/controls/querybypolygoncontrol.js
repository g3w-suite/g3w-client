const {merge} = require('../utils');
const InteractionControl = require('./interactioncontrol');
const PickCoordinatesInteraction = require('../interactions/pickcoordinatesinteraction');
const { getAllPolygonGeometryTypes } = require('core/geometry/geometry');
const VALIDGEOMETRIES = getAllPolygonGeometryTypes();

const QueryByPolygonControl = function(options={}) {
  const _options = {
    offline: false,
    name: "querybypolygon",
    tipLabel: "sdk.mapcontrols.querybypolygon.tooltip",
    label: options.label || "\ue903",
    onselectlayer: true,
    clickmap: true, // set ClickMap
    interactionClass: PickCoordinatesInteraction,
    spatialMethod: options.spatialMethod || 'intersects',
    onhover: true
  };
  options = merge(options,_options);
  const layers = options.layers || [];
  options.visible = this.checkVisibile(layers);
  options.geometryTypes = VALIDGEOMETRIES;
  InteractionControl.call(this, options);
};

ol.inherits(QueryByPolygonControl, InteractionControl);

const proto = QueryByPolygonControl.prototype;

proto.checkVisibile = function(layers) {
  let visible;
  // if no layer or just one
  if (!layers.length || layers.length === 1) visible = false;
  else {
    // geometries to check
    // get all layers that haven't the geometries above filterable
    const filterableLayers = layers.filter(layer => layer.isFilterable());
    // gell all layer that have the valid geometries
    const querableLayers = layers.filter(layer => VALIDGEOMETRIES.indexOf(layer.getGeometryType()) !== -1);
    const filterableLength = filterableLayers.length;
    const querableLength = querableLayers.length;
    visible = querableLength > 0 && filterableLength > 0;
  }
  return visible;
};


proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this, map);
  this._interaction.on('picked', evt => {
    this.dispatchEvent({
      type: 'picked',
      coordinates: evt.coordinate
    });
    this._autountoggle && this.toggle();
  });
  this.setEnable(false);
};

module.exports = QueryByPolygonControl;
