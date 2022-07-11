import { Attribution, Zoom, defaults as defaultControls } from 'ol/control';
import { Map, View } from 'ol';
import { default as defaultInteraction, DragRotate } from 'ol/interaction';

/* MAP FUNCTIONS */
_gis3wlib._map.prototype.setMap = function (mapOpts) {
  const attribution = new Attribution({
    collapsible: false,
  });
  const controls = defaultControls({
    attribution: false,
  }).extend([attribution, new Zoom()]);
  const map = new Map({
    controls,
    interactions: defaultInteraction().extend([
      new DragRotate(),
    ]),
    ol3Logo: false,
    target: mapOpts.id || 'map',
    view: new View(mapOpts.view),
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
