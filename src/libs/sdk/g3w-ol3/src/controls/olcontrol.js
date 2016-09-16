var OLControl = function(options){
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
  }
  
  $(this._control.element).addClass("ol-control-"+this.positionCode);
  
  ol.control.Control.call(this,{
    element: this._control.element
  });
}
ol.inherits(OLControl, ol.control.Control);
module.exports = OLControl;

var proto = OLControl.prototype;

proto.getPosition = function(positionCode) {
  var positionCode = positionCode || this.positionCode;
  var position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  return position;
};

proto.setMap = function(map){
  var position =  this.getPosition();
  var viewPort = map.getViewport();
  var previusControls = $(viewPort).find('.ol-control-'+this.positionCode);
  if (previusControls.length) {
    previusControl = previusControls.last();
    var previousOffset = position.left ? previusControl.position().left : previusControl.position().right;
    var hWhere = position.left ? 'left' : 'right';
    var previousWidth = previusControl[0].offsetWidth;    
    var hOffset = $(this.element).position()[hWhere] + previousOffset + previousWidth + 2;
    $(this.element).css(hWhere,hOffset+'px');
  }
  
  this._control.setMap(map);
};
