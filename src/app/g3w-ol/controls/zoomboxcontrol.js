import { InteractionControl } from 'g3w-ol/controls/interactioncontrol';

function _setMouseCursor(map, toggled) {
  if (toggled) {
    setTimeout(() => map.getViewport().classList.add('ol-crosshair'));
  } else {
    map.getViewport().classList.remove('ol-crosshair');
  }
}

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
  }

  setMap(map) {
    InteractionControl.prototype.setMap.call(this, map);

    // set mouse cursor (crosshair)
    this.on('toggled', ({ toggled }) => _setMouseCursor(map, toggled));
    this._interaction.on('change:active', e => _setMouseCursor(map, e.target.get(e.key)));

    this._startCoordinate = null;

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