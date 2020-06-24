const utils = require('../utils');
const InteractionControl = require('./interactioncontrol');
const PickCoordinatesInteraction = require('../interactions/pickcoordinatesinteraction');
const VALIDGEOMETRIES = ['Polygon', 'MultiPolygon'];

const QueryByPolygonControl = function(options={}) {
  const _options = {
    offline: false,
    name: "querybypolygon",
    tipLabel: "sdk.mapcontrols.querybypolygon.tooltip",
    label: options.label || "\ue903",
    onselectlayer: true,
    interactionClass: PickCoordinatesInteraction,
    onhover: true
  };
  options = utils.merge(options,_options);
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
  if (!layers.length || layers.length === 1) {
    visible = false;
  } else {
    // geometryes to check
    // get all layers that haven't the geometries above filterable
    const filterableLayers = layers.filter((layer) => {
      return layer.isFilterable();
    });
    // gell all layer that have the valid geometries
    const querableLayers = layers.filter((layer) => {
      return VALIDGEOMETRIES.indexOf(layer.getGeometryType()) !== -1;
    });
    const filterableLength = filterableLayers.length;
    const querableLength = querableLayers.length;
    if (querableLength && filterableLength) {
      visible = true;
    }
  }
  return visible;
};

proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this, map);
  this._interaction.on('picked', (e) => {
    this.dispatchEvent({
      type: 'picked',
      coordinates: e.coordinate
    });
    if (this._autountoggle) {
      this.toggle();
    }
  });
  this.setEnable(false);
};

module.exports = QueryByPolygonControl;
