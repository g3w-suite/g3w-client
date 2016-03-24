_gis3wlib._control.prototype.createControl = function(type,controlOpts){
  var control_name = type+'Control';
  var control = new this[control_name](controlOpts);
  return control
};

_gis3wlib._control.prototype.addControl = function(control){
  this.map.addControl(control);
};

_gis3wlib._control.prototype.addControls = function(controlArray){
  var self = this;
  controlArray.forEach(function(controlObj){
    self.addControl(controlObj);
  });
};

_gis3wlib._control.prototype.removeControl = function(control){
  //code here
};
