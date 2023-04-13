const OnClickControl = require('g3w-ol/controls/onclickcontrol');

function ScreenshotControl(options = {}) {
  this.layers = options.layers || [];
  const visible = this.checkVisible(this.layers);
  options.visible = visible;
  options.name = options.name || "maptoimage";
  options.tipLabel =  options.tipLabel|| "Screenshot";
  options.label = options.label || "\ue90f";
  options.toggled = false;
  OnClickControl.call(this, options);
}

ol.inherits(ScreenshotControl, OnClickControl);

const proto = ScreenshotControl.prototype;

proto.change = function(layers=[]){
  const visible = this.checkVisible(layers);
  this.setVisible(visible);
};

/**
 * Check visibility map control based on layers
 * @param layers <Array>
 * @returns {boolean}
 */
proto.checkVisible = function(layers=[]){
  return "undefined" === typeof layers.find((layer) => {
    if (layer.isExternalWMS && layer.isExternalWMS()) {
      /**
       * @since 3.8.0
       * check if domain of wms is not that same of application to avoid CORS issue on getting
       * map image
       */
      try {
        const domain = new URL(layer.getSource().url);
        // check if same origin of current page
        return location.origin !== domain.origin;
      } catch(err){}
      return true;
    } else return false
  });
};

module.exports = ScreenshotControl;
