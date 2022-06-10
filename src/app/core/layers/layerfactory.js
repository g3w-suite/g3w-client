import Layer  from './layer';
import TableLayer  from './tablelayer';
import VectorLayer  from './vectorlayer';
import ImageLayer  from './imagelayer';
import BaseLayers  from './baselayers/baselayers';
import GeojsonLayer  from './geojson';

// Class to build layer based on configuration
class LayerFactory {
  constructor() {
  }
  build(config, options) {
    // return the layer instance
    const layerClass = this.get(config);
    return layerClass ? new layerClass(config, options) : null
  };

  get(config={}) {
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
              Layer.SourceTypes.OGR
            ].find(sourcetype => sourcetype === config.source.type)) {
              if (config.geometrytype && config.geometrytype === 'NoGeometry') LayerClass = TableLayer;
              else LayerClass = ImageLayer;
            }
          } else if ([ // here set new layer has to be threat as wms
            Layer.SourceTypes.WMST,
            Layer.SourceTypes.WCS,
            Layer.SourceTypes.WMS,
            Layer.SourceTypes.GDAL
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

export default  new LayerFactory();
