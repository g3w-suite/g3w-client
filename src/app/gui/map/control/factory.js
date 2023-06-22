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
const GeocodingControl = require('g3w-ol/controls/geocodingcontrol');
const MousePositionControl = require('g3w-ol/controls/mousepositioncontrol');
const ScaleControl = require('g3w-ol/controls/scalecontrol');
const OnClikControl = require('g3w-ol/controls/onclickcontrol');
const ScreenshotControl = require('g3w-ol/controls/screenshotcontrol');
const geoScreenshotControl = require('g3w-ol/controls/geoscreenshotcontrol');
const ZoomHistoryControl = require('g3w-ol/controls/zoomhistorycontrol');
const QueryByDrawPolygonControl = require('g3w-ol/controls/querybydrawpolygoncontrol');
const InteractionControl = require('g3w-ol/controls/interactioncontrol');


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
  'geocoding': GeocodingControl,
  'addlayers': AddLayersControl,
  'length': LengthControl,
  'area': AreaControl,
  'mouseposition': MousePositionControl,
  'scale': ScaleControl,
  'onclick': OnClikControl,
  /**
   * @since 3.8.3
   */
  'ontoggle': InteractionControl,
  'screenshot': ScreenshotControl,
  'geoscreenshot': geoScreenshotControl,
  'querybydrawpolygon': QueryByDrawPolygonControl,

  /**
   * @since 3.8.0
   */
  'zoomhistory': ZoomHistoryControl,

  /**
   * @deprecated since version ??. Will be removed in version ??. Use 'geocoding' control instead.
   */
  'nominatim': GeocodingControl,
};

module.exports = ControlsFactory;
