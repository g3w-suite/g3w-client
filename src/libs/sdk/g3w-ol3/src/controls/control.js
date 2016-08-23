var Control = function(options){
  var name = options.name || "?";
  this.name = name.split(' ').join('-').toLowerCase();
  this.id = this.name+'_'+(Math.floor(Math.random() * 1000000));
  
  this.positionCode = options.position || 'tl';
  
  
  if (!options.element) {
    var className = "ol-"+this.name.split(' ').join('-').toLowerCase();
    var tipLabel = options.tipLabel || this.name;
    var label = options.label || "?";
    
    options.element = $('<div class="'+className+' ol-unselectable ol-control"><button type="button" title="'+tipLabel+'">'+label+'</button></div>')[0];
  }
  
  $(options.element).addClass("ol-control-"+this.positionCode);
  
  var buttonClickHandler = options.buttonClickHandler || Control.prototype._handleClick.bind(this);
  
  $(options.element).on('click',buttonClickHandler);
  
  ol.control.Control.call(this,options);
  
  this._postRender();
}
ol.inherits(Control, ol.control.Control);

var proto = Control.prototype;

proto.getPosition = function(positionCode) {
  var positionCode = positionCode || this.positionCode;
  var position = {};
  position['top'] = (positionCode.indexOf('t') > -1) ? true : false;
  position['left'] = (positionCode.indexOf('l') > -1) ? true : false;
  return position;
};

proto._handleClick = function(){
  event.preventDefault();
  var self = this;
  var map = this.getMap();
  
  var resetControl = null;
  // remove all the other, eventually toggled, interactioncontrols
  var controls = map.getControls();
  controls.forEach(function(control){
    if(control.id && control.toggle && (control.id != self.id)) {
      control.toggle(false);
      if (control.name == 'reset') {
        resetControl = control;
      }
    }
  });
  if (!self._toggled && resetControl) {
    resetControl.toggle(true);
  }
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
  
  ol.control.Control.prototype.setMap.call(this,map);
};

proto._postRender = function() {};

module.exports = Control;
