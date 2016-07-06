var g3w = {};
g3w.template = {
  ApplicationTemplate: require('./js/template'),
  TemplateConfiguration: require('./js/templateconfiguration')
};
(function (exports) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
      define(function () {
          return g3w;
      });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = g3w;
    }
    else {
        exports.g3w = g3w;
    }
}(this || {}));
