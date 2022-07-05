import ProjectsRegistry from 'core/project/projectsregistry';
import ApplicationService from 'core/applicationservice';
import Layer from 'core/layers/layer';
import GeoLayerMixin from 'core/layers/geolayermixin';
import VectorLayer from './vectorlayer';
import WMSLayer from './map/wmslayer';
import WMSTLayer from './map/wmstlayer';
import ARCGISMAPSERVERLayer from './map/arcgismapserverlayer';
import XYZLayer from './map/xyzlayer';
import LegendService from './legend/legendservice';

class ImageLayer extends Layer {
  constructor(config = {}, options = {}) {
    options.setters = {
      change() {},
    };
    super(config, options);
    /* {
      id,
      title,
      name,
      origname,
      multilayerid,
      servertype,
      source,
      crs,
      projection,
      bbox,
      capabilities,
      cache_url,
      baselayer,
      geometrytype,
      editops,
      expanded,
      fields,
      wmsUrl,
      infoformat,
      infourl,
      maxscale,
      minscale,
      visible,
      scalebasedvisibility,
      wfscapabilities
      ows_method
      wms_use_layer_ids,
      styles
    } */
    this.setup(config, options);
    this.config.baselayer = config.baselayer || false;
    this.type = Layer.LayerTypes.IMAGE;
    this.legendUrl = null;
    this.customParams = {};
  }

  async getLayerForEditing({
    force = false, vectorurl, project_type, project,
  } = {}) {
    if (this.isEditable() || force) {
      const project = project || ProjectsRegistry.getCurrentProject();
      const editableLayer = new VectorLayer(this.config, {
        vectorurl,
        project_type,
        project,
      });
      // set editing layer
      try {
        const editingLayer = await editableLayer.layerForEditing;
        this.setEditingLayer(editingLayer);
        return editingLayer;
      } catch (err) {
        return Promise.reject(err);
      }
    } else return null;
  }

  isBaseLayer() {
    return this.config.baselayer;
  }

  isWMS() {
    return ImageLayer.WMSServerTypes.indexOf(this.config.servertype) > -1;
  }

  isLayerProjectionASMapProjection() {
    return this.config.crs.epsg === this.config.map_crs;
  }

  getCrs() {
    return this.config.crs.epsg;
  }

  isExternalWMS() {
    return !!(this.config.source && this.config.source.external && this.config.source.url);
  }

  isArcgisMapserver() {
    return this.isExternalWMS() && this.config.source.type === Layer.SourceTypes.ARCGISMAPSERVER;
  }

  _getBaseLayerName() {
    return this.isWmsUseLayerIds() ? this.getId() : this.getName();
  }

  getWMSLayerName({ type = 'map' } = {}) {
    const legendMapBoolean = type === 'map' ? this.isExternalWMS() && this.isLayerProjectionASMapProjection() : true;
    let layerName = this._getBaseLayerName();
    if (legendMapBoolean && this.config.source && (type === 'legend' || this.config.source.external) && (this.config.source.layers || this.config.source.layer)) {
      layerName = this.config.source.layers || this.config.source.layer;
    }
    return layerName;
  }

  getWFSLayerName() {
    return this.getQueryLayerName().replace(/[/\s]/g, '_');
  }

  useProxy() {
    return this.isExternalWMS() && this.isLayerProjectionASMapProjection() && this.getInfoFormats();
  }

  getWMSInfoLayerName() {
    if (this.isExternalWMS() && this.isLayerProjectionASMapProjection() && this.getInfoFormats()) {
      return this.getSource().layers;
    } return this._getBaseLayerName();
  }

  getPrintLayerName() {
    return this.isWmsUseLayerIds() ? this.getId() : this.getName();
  }

  getStringBBox() {
    const { bbox } = this.config;
    return `${bbox.minx},${bbox.miny},${bbox.maxx},${bbox.maxy}`;
  }

  isWfsActive() {
    return Array.isArray(this.config.ows) && this.config.ows.find(ows_type => ows_type === 'WFS') !== undefined;
  };

  /**
   * Metyhod to get wms url of the layer
   * @returns {*}
   */
  getFullWmsUrl() {
    const metadata_wms_url = ProjectsRegistry.getCurrentProject().getState().metadata.wms_url;
    return this.isExternalWMS() || !metadata_wms_url ? this.getWmsUrl() : metadata_wms_url;
  }

  //used to Catalog layer menu to show wms url
  getCatalogWmsUrl() {
    const metadata_wms_url = ProjectsRegistry.getCurrentProject().getMetadata().wms_url;
    const catalogWmsUrl = this.isExternalWMS() || !metadata_wms_url ? `${this.getWmsUrl()}?service=WMS&version=1.3.0&request=GetCapabilities` : metadata_wms_url ;
    return catalogWmsUrl;
  }

  //used to Catalog layer menu to show wfs url
  getCatalogWfsUrl() {
    return `${this.getWfsUrl()}?service=WFS&version=1.3.0&request=GetCapabilities`;
  }
  
  // values: map, legend
  getWmsUrl({ type = 'map' } = {}) {
    const legendMapBoolean = type === 'map' ? this.isExternalWMS() && this.isLayerProjectionASMapProjection() : true;
    const wmsUrl = (legendMapBoolean
      && this.config.source
      && (type === 'legend' || this.config.source.external)
      && (this.config.source.type === 'wms' || this.config.source.type === 'wmst')
      && this.config.source.url)
      ? this.config.source.url
      : this.config.wmsUrl;
    return wmsUrl;
  }

  getWfsUrl() {
    return ProjectsRegistry.getCurrentProject().getMetadata().wms_url || this.config.wmsUrl;
  };

  /**
   * Get query url based on type, external or same projection of map
   * @returns {string}
   */
  getQueryUrl() {
    let url = super.getQueryUrl();
    if (this.getServerType() === Layer.ServerTypes.QGIS && this.isExternalWMS() && this.isLayerProjectionASMapProjection()) {
      if (this.getInfoFormats()) url = this.getSource().url;
      else url = `${url}SOURCE=${this.config.source.type}`;
    }
    return url;
  }

  getIconUrlFromLegend() {
    return this.getLegendUrl({
      layertitle: false,
    });
  }

  getLegendUrl(params = {}) {
    this.legendUrl = LegendService.get({
      layer: this,
      params: {
        ...params,
        ...this.customParams,
      },
    });
    return this.legendUrl;
  }

  setMapParamstoLegendUrl({ bbox, crs }) {
    this.customParams = {
      ...this.customParams,
      bbox,
      crs,
    };
  }

  getWfsCapabilities() {
    return this.config.wfscapabilities || this.config.capabilities === 1;
  }

  getMapLayer(options = {}, extraParams) {
    const iframe_internal = ApplicationService.isIframe() && !this.isExternalWMS();
    options.iframe_internal = iframe_internal;
    let mapLayer;
    const method = this.isExternalWMS() ? 'GET' : this.getOwsMethod();
    if (this.isCached()) {
      options.extent = this.config.bbox ? [this.config.bbox.minx, this.config.bbox.miny, this.config.bbox.maxx, this.config.bbox.maxy] : null;
      mapLayer = new XYZLayer(options, method);
    } else if (this.isExternalWMS() && this.config.source && this.config.source.type === Layer.SourceTypes.ARCGISMAPSERVER) {
      options = {
        ...options,
        ...this.config.source,
      };
      mapLayer = new ARCGISMAPSERVERLayer(options, extraParams);
    } else {
      options.url = options.url || this.getWmsUrl();
      /** check in case WMST Layer
         *
         */
      if (this.isExternalWMS() && this.config.source && this.config.source.type === Layer.SourceTypes.WMST) mapLayer = new WMSTLayer(options, extraParams, method);
      else mapLayer = new WMSLayer(options, extraParams, method);
    }
    return mapLayer;
  }

  static WMSServerTypes = [
    Layer.ServerTypes.QGIS,
    Layer.ServerTypes.Mapserver,
    Layer.ServerTypes.Geoserver,
    Layer.ServerTypes.OGC,
  ];
}

Object.assign(ImageLayer.prototype, GeoLayerMixin);

export default ImageLayer;
