const ScreenshotControl = require('g3w-ol/controls/screenshotcontrol');

module.exports = class GeoScreenshotControl extends ScreenshotControl {
  constructor(options = {}) {
    super({
      name:     "maptoimagegeo",
      tipLabel: "Geo Screenshot",
      label:    "\ue900",
      ...options,
    });
  }
};