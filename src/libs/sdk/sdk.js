var g3w = g3w || {};

g3w.core = {
   G3WObject: require('core/g3wobject'),
   utils: require('core/utils/utils'),
   ApplicationService: require('core/applicationservice'),
   ApiService: require('core/apiservice'),
   Router: require('core/router'),
   ProjectsRegistry: require('core/project/projectsregistry'),
   Project: require('core/project/project'),
   QueryService: require('core/query/queryservice'),
   MapLayer: require('core/map/layer/maplayer'),
   VectorLayer: require('core/map/layer/vectorlayer'),
   WmsLayer: require('core/map/layer/wmslayer'),
   Geometry: require('core/geometry/geometry'),
   geom: require('core/geometry/geom'),
   PickCoordinatesInteraction: require('g3w-ol3/src/interactions/pickcoordinatesinteraction'),
   PickFeatureInteraction: require('g3w-ol3/src/interactions/pickfeatureinteraction'),
   i18n: require('core/i18n/i18n.service'),
   Plugin: require('core/plugin/plugin'),
   PluginsRegistry: require('core/plugin/pluginsregistry'),
   Editor: require('core/editing/editor')
};

g3w.gui = {
  GUI: require('gui/gui'),
  Form: require('gui/form').Form,
  FormPanel: require('gui/form').FormPanel,
  Panel: require('gui/panel'),
  vue: {
    //GeocodingComponent: require('gui/vue/geocoding/geocoding'),
    SearchComponent: require('gui/search/vue/search'),
    CatalogComponent: require('gui/catalog/vue/catalog'),
    MapComponent: require('gui/map/vue/map'),
    ToolsComponent: require('gui/tools/vue/tools'),
    QueryResultsComponent : require('gui/queryresults/vue/queryresults')
  }
};

module.exports = {
  core: g3w.core,
  gui: g3w.gui
};
