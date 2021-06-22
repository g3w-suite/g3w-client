const InteractionControl = require('./interactioncontrol');
function GeolocationControl() {
  const options = {
    offline: false,
    name: "geolocation",
    tipLabel: "sdk.mapcontrols.geolocation.tooltip",
    label: "\ue904"
  };
  this._layer;
  InteractionControl.call(this, options);
}

ol.inherits(GeolocationControl, InteractionControl);

const proto = GeolocationControl.prototype;

proto._showMarker = function(coordinates, show=true){
  const feature = new ol.Feature({
    geometry: new ol.geom.Point(coordinates)
  });
  this._layer.getSource().clear();
  show && setTimeout(()=>this._layer.getSource().addFeature(feature));
};

proto.setMap = function(map) {
  InteractionControl.prototype.setMap.call(this, map);
  const geolocation = new ol.Geolocation({
    projection: map.getView().getProjection(),
    tracking: true,
    trackingOptions: {
      enableHighAccuracy: true
    }
  });
  geolocation.once('change:position', e => {
    const coordinates = geolocation.getPosition();
    if (coordinates) {
      this._layer = new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
          text: new ol.style.Text({
            text: '\uf3c5',
            font: '900 3em "Font Awesome 5 Free"',
            fill: new ol.style.Fill({
              color: 'red'
            })
          })
        })
      });
      const coordinates = geolocation.getPosition();
      const view = map.getView();
      map.addLayer(this._layer);
      $(this.element).removeClass('g3w-ol-disabled');
      this.on('toggled', event => {
        const toggled = event.target.isToggled();
        toggled &&  view.setCenter(coordinates);
        this._showMarker(coordinates, toggled);
      });
    } else this.hideControl();
  });
  geolocation.once('error', (e) => {
    this.hideControl();
    if (e.code !== 1) this.dispatchEvent('error');
  });
};


module.exports = GeolocationControl;
