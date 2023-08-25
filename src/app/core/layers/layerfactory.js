const Layer = require('core/layers/layer');
const TableLayer = require('core/layers/tablelayer');
const VectorLayer = require('core/layers/vectorlayer');
const ImageLayer = require('core/layers/imagelayer');
const BaseLayers = require('core/layers/baselayers/baselayers');
const GeojsonLayer = require('core/layers/geojson');

// Class to build layer based on configuration
function LayerFactory() {
  this.build = function(config, options) {
    // return the layer instance
    const layerClass = this.get(config);
    return layerClass ? new layerClass(config, options) : null
  };

  this.get = function(config={}) {
    let LayerClass;
    const serverType = config.servertype;
    switch (serverType) {
      case Layer.ServerTypes.QGIS:
        if (config.source) {
          if (config.geometrytype) {
            if ([
              Layer.SourceTypes.VIRTUAL,
              Layer.SourceTypes.POSTGIS,
              Layer.SourceTypes.MSSQL,
              Layer.SourceTypes.SPATIALITE,
              Layer.SourceTypes.WFS,
              Layer.SourceTypes.CSV,
              Layer.SourceTypes.ORACLE,
              Layer.SourceTypes.OGR,
              Layer.SourceTypes.MDAL,
            ].find(sourcetype => sourcetype === config.source.type)) {
              if (config.geometrytype && config.geometrytype === 'NoGeometry') LayerClass = TableLayer;
              else LayerClass = ImageLayer;
            }
          } else if ([ // here set new layer has to be threat as wms
            Layer.SourceTypes.WMST,
            Layer.SourceTypes.WCS,
            Layer.SourceTypes.WMS,
            Layer.SourceTypes.GDAL,
            Layer.SourceTypes.VECTORTILE,
            Layer.SourceTypes["VECTOR-TILE"],
            Layer.SourceTypes.MDAL,
            /**
             * @since 3.8.7
             */
            Layer.SourceTypes.ARCGISMAPSERVER,
          ].find(sourcetype => sourcetype === config.source.type)) LayerClass = ImageLayer;
        }
        break;
      case Layer.ServerTypes.OGC:
        if(config.source) {
          const type = config.source.type;
          switch (type) {
            case Layer.SourceTypes.WMS:
              LayerClass = ImageLayer;
              break;
            case Layer.SourceTypes.WFS:
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
      case Layer.ServerTypes.WMS:
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
