const Providers = {
  geojson: require('./geojsonprovider'),
  kml: require('./kmlprovider'),
  xml: require('./xmlprovider'),
  qgis: require('./qgisprovider'),
  wms: require('./wmsprovider'),
  wfs: require('./wfsprovider')
};

const ProvidersForServerTypes = {
  'QGIS': {
    'virtual': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: Providers.qgis,
      search: Providers.qgis,
      filtertoken: Providers.qgis
    },
    'postgres': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: Providers.qgis,
      search: Providers.qgis,
      filtertoken: Providers.qgis
    },
    'oracle': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: Providers.qgis,
      search: Providers.qgis,
      filtertoken: Providers.qgis
    },
    'mssql': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: Providers.qgis,
      search: Providers.qgis,
      filtertoken: Providers.qgis
    },
    'spatialite': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: Providers.qgis,
      search: Providers.qgis,
      filtertoken: Providers.qgis
    },
    'ogr': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: Providers.qgis,
      search: Providers.qgis,
      filtertoken: Providers.qgis
    },
    'delimitedtext': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: Providers.qgis,
      search: Providers.qgis,
      filtertoken: Providers.qgis
    },
    'wmst': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: null,
      search: null
    },
    'wms': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: null,
      search: null
    },
    'wfs': {
      query: Providers.wms,
      filter: Providers.wfs,
      data: Providers.qgis,
      search: Providers.qgis
    },
    'gdal': {
      query: Providers.wms,
      filter: null,
      data: null,
      search: null
    },
    'vector-tile': {
      query: Providers.wms,
      filter: null,
      data: null,
      search: null
    },
    'arcgismapserver': {
      query: Providers.wms,
      filter: null,
      data: null,
      search: null
    }
  },
  'OGC': {
    'wms': {
      query: Providers.wms,
      filter: null,
      data: null,
      search: null
    }
  },
  'G3WSUITE': {
    'geojson': {
      query: Providers.geojson,
      filter: null,
      data: Providers.geojson,
      search: null
    }
  }
};

function ProviderFactory() {
  this.build = function(providerType, serverType, sourceType,options) {
    // return instace of seletced provider
    const providerClass = this.get(providerType,serverType,sourceType);
    if (providerClass) {
      return new providerClass(options);
    }
    return null;
  };

  this.get = function(providerType, serverType, sourceType) {
    return ProvidersForServerTypes[serverType][sourceType][providerType];
  }
}

module.exports = new ProviderFactory();
