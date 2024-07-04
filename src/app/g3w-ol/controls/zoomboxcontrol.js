const InteractionControl = require('g3w-ol/controls/interactioncontrol');

module.exports = class ZoomBoxControl extends InteractionControl {
  
  constructor(options){
    super(
      Object.assign({}, options, {
        name:             'zoombox',
        tipLabel:         'Zoom to box',
        label:            '\ue901',
        interactionClass: ol.interaction.DragBox
      })
    );
    this._startCoordinate = null;
  }

  setMap(map) {
    InteractionControl.prototype.setMap.call(this, map);

    // set mouse cursor (crosshair)
    this.on('toggled', ({ toggled }) => map.getViewport().classList.toggle('ol-crosshair', toggled));

    this._interaction.on('boxstart', e => this._startCoordinate = e.coordinate);
    this._interaction.on('boxend',   e => {
      this.dispatchEvent({
        type: 'zoomend',
        extent: ol.extent.boundingExtent([this._startCoordinate, e.coordinate])
      });
      this._startCoordinate = null;
      if (this._autountoggle) {
        this.toggle();
      }
    });
  }

}