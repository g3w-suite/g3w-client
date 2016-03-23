_gis3wlib._control.prototype.infoControl = (function(){
  var infoControl = function(controlOpts) {
    var options = controlOpts || {};

    ol.control.Control.call(this, {
      element: options.element,
      target: options.target
    });
  };

  ol.inherits(infoControl, ol.control.Control);
  
  infoControl.prototype.active = function(){};
  infoControl.prototype.deactive = function(){};

  return infoControl;
})();
