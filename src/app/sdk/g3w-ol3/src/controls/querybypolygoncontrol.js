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
  let visible = false;
  // if no layer or just one
  if (!layers.length || layers.length === 1) {
      options.visible = visible
  } else {
    // geometryes to check
    const geometryTypes = options.geometryTypes = VALIDGEOMETRIES ;
    // get all layers that haven't the geometries above filterable
    const filterableLayers = layers.filter((layer) => {
      return layer.isFilterable();
    });
    // gell all layer that have the valid geometries
    const querableLayers = layers.filter((layer) => {
      return geometryTypes.indexOf(layer.getGeometryType()) !== -1;
    });
    const filterableLength = filterableLayers.length;
    const querableLength = querableLayers.length;
    if (querableLength && filterableLength) {
      visible = true;
    }
    options.visible = visible;
  }
  InteractionControl.call(this, options);
};

ol.inherits(QueryByPolygonControl, InteractionControl);

const proto = QueryByPolygonControl.prototype;

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
