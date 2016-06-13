var Control = function(options){
  var name = options.name || "?";
  this.name = name.split(' ').join('-').toLowerCase();
  this.id = this.name+'_'+(Math.floor(Math.random() * 1000000));
  
  if (!options.element) {
    var className = "ol-"+this.name.split(' ').join('-').toLowerCase();
    var tipLabel = options.tipLabel || this.name;
    var label = options.label || "?";
    
    options.element = $('<div class="'+className+' ol-unselectable ol-control"><button type="button" title="'+tipLabel+'">'+label+'</button></div>')[0];
  }
  
  var buttonClickHandler = options.buttonClickHandler || Control.prototype._handleClick.bind(this);
  
  $(options.element).on('click',buttonClickHandler);
  
  ol.control.Control.call(this,options);
  
  this._postRender();
}
ol.inherits(Control, ol.control.Control);


var proto = Control.prototype;

proto._handleClick = function(){
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

proto._postRender = function(){};

module.exports = Control;
