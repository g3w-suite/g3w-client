const ScreenshotControl = require('g3w-ol/controls/screenshotcontrol');

function GeoScreenshotControl(options = {}) {
  ScreenshotControl.call(this, {
    name: "maptoimagegeo",
    tipLabel: "Geo Screenshot",
    label: "\ue900",
    ...options,
  });
}

ol.inherits(GeoScreenshotControl, ScreenshotControl);

module.exports = GeoScreenshotControl;
