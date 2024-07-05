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

    /** @FIXME mouse cursor when editing constraint is enabled */
    // set mouse cursor (crosshair)
    // this.on('toggled', ({ toggled }) => {
    //   if (toggled) {
    //     setTimeout(() => map.getViewport().classList.toggle('ol-crosshair', true));
    //     return;
    //   }
    //   map.getViewport().classList.toggle('ol-crosshair', toggled);
    // });

    // https://openlayers.org/en/v5.3.0/apidoc/module-ol_Object.ObjectEvent.html to ge new value of the event
    this._interaction.on('change:active', (e) => {
      if (e.target.get(e.key)) {
        setTimeout(() => map.getViewport().classList.add('ol-crosshair'));
      } else {
        map.getViewport().classList.remove('ol-crosshair');
      }
    });

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