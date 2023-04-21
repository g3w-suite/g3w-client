const {sameOrigin} = require('core/utils/utils');
const OnClickControl = require('g3w-ol/controls/onclickcontrol');

function ScreenshotControl(options = {}) {
  this.layers = options.layers || [];
  options.visible = this.checkVisible(this.layers);
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
  console.log(visible)
  this.setVisible(visible);
};

/**
 * Check visibility map control based on layers
 * @param layers <Array>
 * @returns {boolean}
 */
proto.checkVisible = function(layers=[]){
  return "undefined" === typeof layers.find((layer) => {
    if ("undefined" !== typeof layer.getSource().url) {
      /**
       * @since 3.8.0
       * check if domain of wms is not that same of application to avoid CORS issue on getting
       * map image
       */
      return false === sameOrigin(layer.getSource().url, location)
    } else return false
  });
};

module.exports = ScreenshotControl;
