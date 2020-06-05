const OLControl = function(options={}) {
  this._control = null;
  this.positionCode = options.position || 'tl';
  switch (options.type) {
    case 'zoom':
      this._control = new ol.control.Zoom(options);
      break;
    case 'zoomtoextent':
      this._control = new ol.control.ZoomToExtent(options);
      break;
    case 'scaleline':
      this._control = new ol.control.ScaleLine(options);
      break;
    case 'overview':
      this._control = new ol.control.OverviewMap(options);
      break;
  }

  $(this._control.element).addClass("ol-control-"+this.positionCode);

  ol.control.Control.call(this,{
    element: this._control.element,
  });
};

// sotto classe della classe control di OL3
ol.inherits(OLControl, ol.control.Control);

module.exports = OLControl;

const proto = OLControl.prototype;

proto.offline = true;

proto.getPosition = function(positionCode) {
  positionCode = positionCode || this.positionCode;
  const position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  return position;
};

proto.layout = function(map) {
  if (map) {
    const position =  this.getPosition();
    const viewPort = map.getViewport();
    const previusControls = $(viewPort).find('.ol-control-'+this.positionCode);
    if (previusControls.length) {
      previusControl = previusControls.last();
      const previousOffset = position.left ? previusControl.position().left : previusControl.position().right;
      const hWhere = position.left ? 'left' : 'right';
      const previousWidth = previusControl[0].offsetWidth;
      const hOffset = $(this.element).position()[hWhere] + previousOffset + previousWidth + 2;
      $(this.element).css(hWhere, hOffset+'px');
    }
  }
};

proto.changelayout = function() {};

proto.showHide = function() {
  $(this.element).toggle();
};

proto.setMap = function(map) {
  this.layout(map);
  this._control.setMap(map);
};
