const {base, inherit, mixin } = require('core/utils/utils');
const Layer = require('core/layers/layer');
const VectorLayer = require('./vectorlayer');
const WMSLayer = require('./map/wmslayer');
const ARCGISMAPSERVERLayer = require('./map/arcgismapserverlayer');
const XYZLayer = require('./map/xyzlayer');
const LegendService = require('./legend/legendservice');
const GeoLayerMixin = require('./geolayermixin');

function ImageLayer(config={}, options={}) {
  /*{
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
    wms_use_layer_ids
  }*/
  base(this, config, options);
  this.config.baselayer = config.baselayer || false;
  this.type = Layer.LayerTypes.IMAGE;
  this.legendUrl = null;
  this.customParams = {};
  this.setup(config, options);
}

inherit(ImageLayer, Layer);

mixin(ImageLayer, GeoLayerMixin);

const proto = ImageLayer.prototype;

proto.getLayerForEditing = async function({force=false, vectorurl, project_type, project}={}) {
  if (this.isEditable() || force) {
    const project = project || require('core/project/projectsregistry').getCurrentProject();
    const editableLayer = new VectorLayer(this.config, {
      vectorurl,
      project_type,
      project
    });
    // set editing layer
    try {
      const editingLayer = await editableLayer.layerForEditing;
      this.setEditingLayer(editingLayer);
      return editingLayer
    } catch(err) {
      return Promise.reject(err);
    }
  } else return null
};

proto.isBaseLayer = function() {
  return this.config.baselayer;
};

proto.isWMS = function() {
  return ImageLayer.WMSServerTypes.indexOf(this.config.servertype) > -1;
};

proto.isLayerProjectionASMapProjection = function() {
  return this.config.crs.epsg === this.config.map_crs;
};

proto.getCrs = function() {
  return this.config.crs.epsg;
};

proto.isExternalWMS = function() {
  return !!(this.config.source && this.config.source.external && this.config.source.url);
};

proto.isArcgisMapserver = function() {
  return this.isExternalWMS() && this.config.source.type === 'arcgismapserver';
};

proto._getBaseLayerName = function() {
  //const baseLayerName = (!this.isExternalWMS() || (this.isExternalWMS() && !this.isLayerProjectionASMapProjection())) && this.isWmsUseLayerIds() ? this.getId() : this.getName();
  const baseLayerName = this.isWmsUseLayerIds() ? this.getId() : this.getName();
  return baseLayerName
};

proto.getWMSLayerName = function({type='map'}={}) {
  const legendMapBoolean = type === 'map' ? this.isExternalWMS() && this.isLayerProjectionASMapProjection() : true;
  let layerName = this._getBaseLayerName();
  if (legendMapBoolean && this.config.source && (type === 'legend' ||this.config.source.external) && (this.config.source.layers || this.config.source.layer)) {
    layerName = this.config.source.layers || this.config.source.layer;
  }
  return layerName;
};

proto.getWMSInfoLayerName = function() {
  return this._getBaseLayerName();
};

proto.getPrintLayerName = function() {
  return this.isWmsUseLayerIds() ? this.getId() : this.getName();
};

proto.getStringBBox = function() {
  const bbox = this.config.bbox;
  return `${bbox.minx},${bbox.miny},${bbox.maxx},${bbox.maxy}`;
};

proto.getFullWmsUrl = function() {
  const ProjectsRegistry = require('core/project/projectsregistry');
  const metadata_wms_url = ProjectsRegistry.getCurrentProject().getState().metadata.wms_url;
  return this.isExternalWMS() || !metadata_wms_url ? this.getWmsUrl() : metadata_wms_url ;
};

// values: map, legend
proto.getWmsUrl = function({type='map'}={}) {
  const legendMapBoolean = type === 'map' ? this.isExternalWMS() && this.isLayerProjectionASMapProjection() : true;
  return (legendMapBoolean &&
      this.config.source &&
      (type === 'legend' || this.config.source.external) &&
      this.config.source.type === 'wms' &&
      this.config.source.url) ?
    this.config.source.url :
    this.config.wmsUrl;
};

proto.getQueryUrl = function() {
  let url = base(this, 'getQueryUrl');
  if (this.getServerType() === 'QGIS' && this.isExternalWMS() && this.isLayerProjectionASMapProjection()) {
    url =`${url}SOURCE=${this.config.source.type}`;
  }
  return url;
};

proto.getIconUrlFromLegend = function() {
  return this.getLegendUrl({
    layertitle: false
  })
};

proto.getLegendUrl = function(params={}) {
  this.legendUrl = LegendService.get({
    layer: this,
    params: {
      ...params,
      ...this.customParams
    }
  });
  return this.legendUrl;
};

proto.setMapParamstoLegendUrl = function({bbox, crs}){
  this.customParams = {
    ...this.customParams,
    bbox,
    crs
  }
};

proto.getWFSLayerName = function() {
  let layerName = this.config.origname;
  if (this.config.source && this.config.source.layers) layerName = this.config.source.layers;
  return layerName;
};

proto.getWfsCapabilities = function() {
  return this.config.wfscapabilities || this.config.capabilities === 1 ;
};

proto.getMapLayer = function(options={}, extraParams) {
  const ApplicationService = require('core/applicationservice');
  const iframe_internal = ApplicationService.isIframe() && !this.isExternalWMS();
  options.iframe_internal = iframe_internal;
  let mapLayer;
  const method = this.isExternalWMS() ? 'GET' : this.getOwsMethod();
  if (this.isCached()) {
    options.extent = this.config.bbox ? [this.config.bbox.minx, this.config.bbox.miny, this.config.bbox.maxx, this.config.bbox.maxy] : null;
    mapLayer = new XYZLayer(options, method);
  } else {
    if (this.isExternalWMS() && this.config.source && this.config.source.type === 'arcgismapserver') {
      options = {
        ...options,
        ...this.config.source,
      };
      mapLayer = new ARCGISMAPSERVERLayer(options, extraParams)
    } else {
      options.url = options.url || this.getWmsUrl();
      mapLayer = new WMSLayer(options, extraParams, method);
    }
  }
  return mapLayer;
};


ImageLayer.WMSServerTypes = [
  Layer.ServerTypes.QGIS,
  Layer.ServerTypes.Mapserver,
  Layer.ServerTypes.Geoserver,
  Layer.ServerTypes.OGC
];

module.exports = ImageLayer;
