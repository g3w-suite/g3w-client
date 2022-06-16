import ResetControl from 'g3w-ol/src/controls/resetcontrol';
import QueryControl from 'g3w-ol/src/controls/querycontrol';
import ZoomBoxControl from 'g3w-ol/src/controls/zoomboxcontrol';
import QueryBBoxControl from 'g3w-ol/src/controls/querybboxcontrol';
import QueryByPolygonControl from 'g3w-ol/src/controls/querybypolygoncontrol';
import GeolocationControl from 'g3w-ol/src/controls/geolocationcontrol';
import StreetViewControl from 'g3w-ol/src/controls/streetviewcontrol';
import AddLayersControl from 'g3w-ol/src/controls/addlayers';
import LengthControl from 'g3w-ol/src/controls/lengthcontrol';
import AreaControl from 'g3w-ol/src/controls/areacontrol';
import OLControl from 'g3w-ol/src/controls/olcontrol';
import NominatimControl from 'g3w-ol/src/controls/nominatimcontrol';
import MousePositionControl from 'g3w-ol/src/controls/mousepositioncontrol';
import ScaleControl from 'g3w-ol/src/controls/scalecontrol';
import OnClikControl from 'g3w-ol/src/controls/onclickcontrol';
import ScreenshotControl from 'g3w-ol/src/controls/screenshotcontrol';
import geoScreenshotControl from 'g3w-ol/src/controls/geoscreenshotcontrol';

const ControlsFactory = {
  create(options = {}) {
    let control;
    const ControlClass = ControlsFactory.CONTROLS[options.type];
    if (ControlClass) control = new ControlClass(options);
    return control;
  },
};

ControlsFactory.CONTROLS = {
  reset: ResetControl,
  zoombox: ZoomBoxControl,
  zoomtoextent: OLControl,
  query: QueryControl,
  querybbox: QueryBBoxControl,
  querybypolygon: QueryByPolygonControl,
  geolocation: GeolocationControl,
  streetview: StreetViewControl,
  zoom: OLControl,
  scaleline: OLControl,
  overview: OLControl,
  nominatim: NominatimControl,
  addlayers: AddLayersControl,
  length: LengthControl,
  area: AreaControl,
  mouseposition: MousePositionControl,
  scale: ScaleControl,
  onclick: OnClikControl,
  screenshot: ScreenshotControl,
  geoscreenshot: geoScreenshotControl,
};

export default ControlsFactory;
