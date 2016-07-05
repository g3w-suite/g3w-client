var g3w = {};

g3w.core = {
   G3WObject: require('core/g3wobject'),
   utils: require('core/utils/utils'),
   Application: require('core/application'),
   ApiService: require('core/apiservice'),
   Router: require('core/router'),
   ProjectsRegistry: require('core/project/projectsregistry'),
   ProjectService: require('core/project/projectservice'),
   MapService: require('core/map/mapservice'),
   MapQueryService: require('core/map/mapqueryservice'),
   MapLayer: require('core/map/maplayer'),
   LayerState: require('core/layer/layerstate'),
   VectorLayer: require('core/layer/vectorlayer'),
   WmsLayer: require('core/layer/wmslayer'),
   Geometry: require('core/geometry/geometry'),
   geom: require('core/geometry/geom'),
   PickCoordinatesInteraction: require('core/interactions/pickcoordinatesinteraction'),
   PickFeatureInteraction: require('core/interactions/pickfeatureinteraction'),
   i18n: require('core/i18n/i18n.service'),
   Plugin: require('core/plugin/plugin'),
   PluginsRegistry: require('core/plugin/pluginsregistry'),
   PluginsService: require('core/plugin/pluginsservice'),
   ToolsService: require('core/plugin/toolsservice')
};

g3w.gui = {
  Geocoding: require('gui/components/geocoding/geocoding')
}

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
