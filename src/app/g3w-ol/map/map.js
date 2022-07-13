/* MAP FUNCTIONS */
_gis3wlib._map.prototype.setMap = function (mapOpts) {
  const attribution = new ol.control.Attribution({
    collapsible: false,
  });
  const controls = ol.control.defaults({
    attribution: false,
  }).extend([attribution, new ol.control.Zoom()]);
  const map = new ol.Map({
    controls,
    interactions: ol.interaction.defaults().extend([
      new ol.interaction.DragRotate(),
    ]),
    ol3Logo: false,
    target: mapOpts.id || 'map',
    view: new ol.View(mapOpts.view),
  });
  this.map = map;
};

_gis3wlib._map.prototype.updateMap = function (mapObject) {};

_gis3wlib._map.prototype.updateView = function () {};

_gis3wlib._map.prototype.getMap = function () {
  return this.map;
};

_gis3wlib._map.prototype.setCenter = function (coordinates, zoom) {
  const view = this.map.getView();
  view.setCenter(coordinates);
  view.setZoom(zoom);
};

_gis3wlib._map.prototype.getZoom = function () {
  const view = this.map.getView();
  return view.getZoom();
};
