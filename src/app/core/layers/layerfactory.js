const Layer = require('./layer');
const TableLayer = require('./tablelayer');
const VectorLayer = require('./vectorlayer');
const ImageLayer = require('./imagelayer');
const BaseLayers = require('./baselayers/baselayers');
const GeojsonLayer = require('./geojson');

// Class to build layer based on configuration
function LayerFactory() {
  this.build = function(config, options) {
    // return the layer instance
    const layerClass = this.get(config);
    return layerClass ? new layerClass(config, options) : null
  };

  this.get = function(config) {
    let LayerClass;
    const serverType = config.servertype;
    switch (serverType) {
      case Layer.ServerTypes.QGIS:
        LayerClass = ImageLayer;
        if (config.source && config.geometrytype) {
          if ([
              Layer.SourceTypes.VIRTUAL,
              Layer.SourceTypes.POSTGIS,
              Layer.SourceTypes.MYSQL,
              Layer.SourceTypes.SPATIALITE,
              Layer.SourceTypes.CSV,
              Layer.SourceTypes.OGR
            ].indexOf(config.source.type) > -1) {
            if (config.geometrytype && config.geometrytype === 'NoGeometry') {
              LayerClass = TableLayer;
            }
          }
        }
        break;
      case Layer.ServerTypes.OGC:
        if(config.source) {
          const type = config.source.type;
          switch (type) {
            case 'wms':
              LayerClass = ImageLayer;
              break;
            case 'wfs':
              LayerClass = VectorLayer;
          }
        }
        break;
      case Layer.ServerTypes.LOCAL:
        LayerClass = VectorLayer;
        break;
      case Layer.ServerTypes.OSM:
      case Layer.ServerTypes.BING:
      case Layer.ServerTypes.TMS:
      case Layer.ServerTypes.WMTS:
      case Layer.ServerTypes.ARCGISMAPSERVER:
        LayerClass = BaseLayers[serverType];
        break;
      case Layer.ServerTypes.G3WSUITE:
        LayerClass = VectorLayer;
        if (config.source) {
          switch (config.source.type) {
            case 'geojson':
              LayerClass = GeojsonLayer;
              break;
          }
        }
        break;
    }
    return LayerClass;
  }
}



module.exports = new LayerFactory();
