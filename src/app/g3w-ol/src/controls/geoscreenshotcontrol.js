import ScreenshotControl from './screenshotcontrol';

class GeoScreenshotControl extends ScreenshotControl {
  constructor(options = {}) {
    options.name = 'maptoimagegeo';
    options.tipLabel = 'Geo Screenshot';
    options.label = '\ue900';
    super(options);
  }
}

export default GeoScreenshotControl;
