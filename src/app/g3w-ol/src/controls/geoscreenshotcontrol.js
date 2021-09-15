const OnClickControl = require('./onclickcontrol');
function geoScreenshotControl(options = {}) {
  options.name = "maptoimage";
  options.tipLabel =  "Geo Screenshot";
  options.label = "\ue900";
  options.toggled = false;
  OnClickControl.call(this, options);
}

ol.inherits(geoScreenshotControl, OnClickControl);

module.exports = geoScreenshotControl;
