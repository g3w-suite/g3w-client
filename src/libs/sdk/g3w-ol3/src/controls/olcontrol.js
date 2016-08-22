var OLControl = function(options){
  this.position = options.position || 'tl';
  this._control = null;
  
  switch (options.type) {
    case 'zoom':
      this._control = new ol.control.Zoom(options);
      break;
    case 'scaleline':
      this._control = new ol.control.ScaleLine(options);
      break;
  }
  
  $(this._control.element).addClass("ol-control-"+this.position);
  
  ol.control.Control.call(this,{
    element: this._control.element
  });
}
ol.inherits(OLControl, ol.control.Control);
module.exports = OLControl;

var proto = OLControl.prototype;

proto.setMap = function(map){
  var viewPort = map.getViewport();
  var previusControls = $(viewPort).find('.ol-control-'+this.position);
  if (previusControls.length) {
    previusControl = previusControls.last();
    lastLeft = previusControl.position().left;
    lastWidth = previusControl[0].offsetWidth;
    var left = $(this._control.element).position().left + lastLeft + lastWidth + 2;
    $(this._control.element).css('left',left+'px');
  }
  
  this._control.setMap(map);
};
