const OnClickControl = require('./onclickcontrol');
function Screenshotcontrol(options = {}) {
  options.name = "maptoimage";
  options.tipLabel =  "Screenshot";
  options.label = "\ue90f";
  OnClickControl.call(this, options);
}

ol.inherits(Screenshotcontrol, OnClickControl);

module.exports = Screenshotcontrol;
