const Fonts = require('../config/frameworks/fonts');
const VueTemplatePlugin = {
  install: function(Vue, {font={name:'fontawsome', version:'4'}} = {}) {
    // set g3wtemplate property to all instances
    Vue.prototype.g3wtemplate = {
      font: Fonts[font.name].versions[font.version],
      get() {},
      getInfo() {
        return {
          font: this.font
        }
      },
      getInfoString() {},
      getFontClass(type) {
        return this.font[type];
      }
    };
    // set isMobile method to all Vue instances
    Vue.mixin({
      methods: {
        isMobile: function () {
          return isMobile.any
        }
      }
    })
  }
};


module.exports = VueTemplatePlugin;
