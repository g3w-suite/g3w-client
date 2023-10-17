const ResetControl              = require('g3w-ol/controls/resetcontrol');
const QueryControl              = require('g3w-ol/controls/querycontrol');
const ZoomBoxControl            = require('g3w-ol/controls/zoomboxcontrol');
const QueryBBoxControl          = require('g3w-ol/controls/querybboxcontrol');
const QueryByPolygonControl     = require('g3w-ol/controls/querybypolygoncontrol');
const GeolocationControl        = require('g3w-ol/controls/geolocationcontrol');
const StreetViewControl         = require('g3w-ol/controls/streetviewcontrol');
const AddLayersControl          = require('g3w-ol/controls/addlayers');
const LengthControl             = require('g3w-ol/controls/lengthcontrol');
const AreaControl               = require('g3w-ol/controls/areacontrol');
const GeocodingControl          = require('g3w-ol/controls/geocodingcontrol');
const MousePositionControl      = require('g3w-ol/controls/mousepositioncontrol');
const ScaleControl              = require('g3w-ol/controls/scalecontrol');
const OnClikControl             = require('g3w-ol/controls/onclickcontrol');
const ScreenshotControl         = require('g3w-ol/controls/screenshotcontrol');
const geoScreenshotControl      = require('g3w-ol/controls/geoscreenshotcontrol');
const ZoomHistoryControl        = require('g3w-ol/controls/zoomhistorycontrol');
const QueryByDrawPolygonControl = require('g3w-ol/controls/querybydrawpolygoncontrol');
const InteractionControl        = require('g3w-ol/controls/interactioncontrol');

/**
 * Wrapper for native Open Layers controls 
 */
const OLControl = function(options={}) {

  this._control     = null;
  this.positionCode = options.position || 'tl';

  switch (options.type) {
    case 'zoom':         this._control = new ol.control.Zoom(options); break;
    case 'zoomtoextent': this._control = new ol.control.ZoomToExtent(options); break;
    case 'scaleline':    this._control = new ol.control.ScaleLine(options); break;
    case 'overview':     this._control = new ol.control.OverviewMap(options); break;
  }

  $(this._control.element).addClass("ol-control-"+this.positionCode);

  this.offline = true;

  /**
   * @returns { ol.control }
   */
  this.getOlControl = function() {
    return this._control;
  };

  this.getPosition = function(pos) {
    pos = pos || this.positionCode;
    return {
      top:  (pos.indexOf('t') > -1) ? true : false,
      left: (pos.indexOf('l') > -1) ? true : false,
    };
  };

  this.layout = function(map) {
    // skip when ..
    if (!map) {
      return;
    }
    const previusControls = $(map.getViewport()).find(`.ol-control-${this.positionCode}`);
    if (previusControls.length) {
      const position        =  this.getPosition();
      let previusControl = previusControls.last();
      const offset = position.left ? previusControl.position().left : previusControl.position().right;
      const hWhere = position.left ? 'left' : 'right';
      const hOffset = $(this.element).position()[hWhere] + offset + previusControl[0].offsetWidth + 2;
      $(this.element).css(hWhere, hOffset+'px');
    }
  };

  this.changelayout = function() {};

  this.showHide = function() {
    $(this.element).toggle();
  };

  this.setMap = function(map) {
    this.layout(map);
    this._control.setMap(map);
  };

  ol.control.Control.call(this, {
    element: this._control.element
  });

};

ol.inherits(OLControl, ol.control.Control);


const ControlsFactory = {
  create(options={}) {
    const ControlClass = ControlsFactory.CONTROLS[options.type];
    if (ControlClass) return new ControlClass(options);
  }
};

ControlsFactory.CONTROLS = {
  'zoomtoextent':       OLControl,
  'zoom':               OLControl,
  'scaleline':          OLControl,
  'overview':           OLControl,
  'reset':              ResetControl,
  'zoombox':            ZoomBoxControl,
  'query':              QueryControl,
  'querybbox':          QueryBBoxControl,
  'querybypolygon':     QueryByPolygonControl,
  'geolocation':        GeolocationControl,
  'streetview':         StreetViewControl,
  'geocoding':          GeocodingControl,
  'addlayers':          AddLayersControl,
  'length':             LengthControl,
  'area':               AreaControl,
  'mouseposition':      MousePositionControl,
  'scale':              ScaleControl,
  'onclick':            OnClikControl,
  /** @since 3.8.3 */
  'ontoggle':           InteractionControl,
  'screenshot':         ScreenshotControl,
  'geoscreenshot':      geoScreenshotControl,
  'querybydrawpolygon': QueryByDrawPolygonControl,
  /** @since 3.8.0 */
  'zoomhistory':        ZoomHistoryControl,
};

/**
 * BACKCOMP v3.x
 */
ControlsFactory.CONTROLS['nominatim'] = ControlsFactory.CONTROLS['geocoding'];

module.exports = ControlsFactory;
