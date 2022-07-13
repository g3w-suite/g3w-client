const ResetControl = require('g3w-ol/controls/resetcontrol');
const QueryControl = require('g3w-ol/controls/querycontrol');
const ZoomBoxControl = require('g3w-ol/controls/zoomboxcontrol');
const QueryBBoxControl = require('g3w-ol/controls/querybboxcontrol');
const QueryByPolygonControl = require('g3w-ol/controls/querybypolygoncontrol');
const GeolocationControl = require('g3w-ol/controls/geolocationcontrol');
const StreetViewControl = require('g3w-ol/controls/streetviewcontrol');
const AddLayersControl = require('g3w-ol/controls/addlayers');
const LengthControl = require('g3w-ol/controls/lengthcontrol');
const AreaControl = require('g3w-ol/controls/areacontrol');
const OLControl = require('g3w-ol/controls/olcontrol');
const NominatimControl = require('g3w-ol/controls/geocodingcontrol');
const MousePositionControl = require('g3w-ol/controls/mousepositioncontrol');
const ScaleControl = require('g3w-ol/controls/scalecontrol');
const OnClikControl = require('g3w-ol/controls/onclickcontrol');
const ScreenshotControl = require('g3w-ol/controls/screenshotcontrol');
const geoScreenshotControl = require('g3w-ol/controls/geoscreenshotcontrol');

const ControlsFactory = {
  create(options={}) {
    const ControlClass = ControlsFactory.CONTROLS[options.type];
    if (ControlClass) return new ControlClass(options);
  }
};

ControlsFactory.CONTROLS = {
  'reset': ResetControl,
  'zoombox': ZoomBoxControl,
  'zoomtoextent': OLControl,
  'query': QueryControl,
  'querybbox': QueryBBoxControl,
  'querybypolygon': QueryByPolygonControl,
  'geolocation': GeolocationControl,
  'streetview': StreetViewControl,
  'zoom': OLControl,
  'scaleline': OLControl,
  'overview': OLControl,
  'nominatim': NominatimControl,
  'addlayers': AddLayersControl,
  'length': LengthControl,
  'area': AreaControl,
  'mouseposition': MousePositionControl,
  'scale': ScaleControl,
  'onclick': OnClikControl,
  'screenshot': ScreenshotControl,
  'geoscreenshot': geoScreenshotControl
};

module.exports = ControlsFactory;
