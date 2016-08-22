var ResetControl = require('g3w-ol3/src/controls/resetcontrol');
var QueryControl = require('g3w-ol3/src/controls/querycontrol');
var ZoomBoxControl = require('g3w-ol3/src/controls/zoomboxcontrol');

var OLControl = require('g3w-ol3/src/controls/olcontrol');

var ControlsFactory = {
  create: function(options) {
    var control;
    var ControlClass = ControlsFactory.CONTROLS[options.type];
    if (ControlClass) {
      control = new ControlClass(options);
    }
    return control;
  }
};

ControlsFactory.CONTROLS = {
  'reset': ResetControl,
  'zoombox': ZoomBoxControl,
  'query': QueryControl,
  'zoom': OLControl,
  'scaleline': OLControl
};

module.exports = ControlsFactory;
