const ResetControl = require('g3w-ol3/src/controls/resetcontrol');
const QueryControl = require('g3w-ol3/src/controls/querycontrol');
const ZoomBoxControl = require('g3w-ol3/src/controls/zoomboxcontrol');
const QueryBBoxControl = require('g3w-ol3/src/controls/querybboxcontrol');
const QueryByPolygonControl = require('g3w-ol3/src/controls/querybypolygoncontrol');
const GeolocationControl = require('g3w-ol3/src/controls/geolocationcontrol');
const StreetViewControl = require('g3w-ol3/src/controls/streetviewcontrol');
const AddLayersControl = require('g3w-ol3/src/controls/addlayers');
const LengthControl = require('g3w-ol3/src/controls/lengthcontrol');
const AreaControl = require('g3w-ol3/src/controls/areacontrol');
const Control = require('g3w-ol3/src/controls/control');
const OLControl = require('g3w-ol3/src/controls/olcontrol');
const NominatimControl = require('g3w-ol3/src/controls/nominatimcontrol');
const MousePositionControl = require('g3w-ol3/src/controls/mousepositioncontrol');
const ScaleControl = require('g3w-ol3/src/controls/scalecontrol');
const OnClikControl = require('g3w-ol3/src/controls/onclickcontrol');
const ScreenshotControl = require('g3w-ol3/src/controls/screenshotcontrol');

const ControlsFactory = {
  create: function(options={}) {
    let control;
    const ControlClass = ControlsFactory.CONTROLS[options.type];
    if (ControlClass) control = new ControlClass(options);
    const visible = (control instanceof Control && control.isVisible) ? control.isVisible() : true;
    return visible ? control: null
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
  'screenshot': ScreenshotControl
};

module.exports = ControlsFactory;
