
const BaseQueryPolygonControl = require('g3w-ol/controls/basequerypolygoncontrol');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

const QueryByPolygonControl = function(options={}) {

  const _options = {
    enabled: false,
    name: "querybypolygon",
    tipLabel: "sdk.mapcontrols.querybypolygon.tooltip",
    label: options.label || "\ue903",
    interactionClass: PickCoordinatesInteraction,
    // method to react on select layer
    onSelectlayer(selectedLayer) {
      if (!selectedLayer.isSelected()) {
        if (-1 !== this.getGeometryTypes().indexOf(selectedLayer.getGeometryType())) {
          const querable = selectedLayer.isQueryable();
          this.setEnable(querable ? selectedLayer.isVisible(): querable);
        } else {
          this.setEnable(false, false);
        }
      } else {
        this.setEnable(false, false);
      }
    }
  };

  BaseQueryPolygonControl.call(this, { ...options, ..._options });
};

ol.inherits(QueryByPolygonControl, BaseQueryPolygonControl);

const proto = QueryByPolygonControl.prototype;

/**
 * @param {ol.Map} map
 */
proto.setMap = function(map) {

  BaseQueryPolygonControl.prototype.setMap.call(this, map);

  this._interaction.on('picked', evt => {
    this.dispatchEvent({ type: 'picked', coordinates: evt.coordinate });
    if (this._autountoggle) {
      this.toggle();
    }
  });

  this.setEnable(false);

};

module.exports = QueryByPolygonControl;
