const {base, inherit, noop } = require('core/utils/utils');
const {getAlphanumericPropertiesFromFeature} = require('core/utils/geo');
const t = require('core/i18n/i18n.service').t;
const ProjectsRegistry = require('core/project/projectsregistry');
const Layer = require('core/layers/layer');
const GUI = require('gui/gui');
const G3WObject = require('core/g3wobject');
const VectorLayer = require('core/layers/vectorlayer');
const ComponentsRegistry = require('gui/componentsregistry');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');
const RelationsPage = require('gui/relations/vue/relationspage');
// set formats for download single feature
const DOWNLOAD_FEATURE_FORMATS = ['shapefile', 'gpx', 'csv', 'xls'];

function QueryResultsService() {
  this._currentLayerIds = [];
  ProjectsRegistry.onafter('setCurrentProject', (project) => {
    this._setRelations(project);
  });
  this._actions = {
    'zoomto': QueryResultsService.zoomToElement,
    'highlightgeometry': QueryResultsService.highlightGeometry,
    'clearHighlightGeometry': QueryResultsService.clearHighlightGeometry
  };
  this._relations = [];
  const project = this._project = ProjectsRegistry.getCurrentProject();
  // userful to set right order for query result based on toc order layers
  this._projectLayerIds = this._project.getConfigLayers().map(layer => layer.id);
  this.state = {
    zoomToResult: true,
    components: []
  };
  this.init = function() {
    this.clearState();
  };

  this._vectorLayers = [];
  this.setters = {
    setQueryResponse: function(queryResponse, coordinates, resolution ) {
      this.clearState();
      this.state.query = queryResponse.query;
      const layers = this._digestFeaturesForLayers(queryResponse.data);
      this.setLayersData(layers);
    },
    setLayersData: function(layers) {
      // here set the right order of result layers based on toc
      this._currentLayerIds = layers.map(layer => layer.id);
      this._orderResponseByProjectLayers(layers);
      this.state.loading = false;
      this.state.layers =  layers;
      this.setActionsForLayers(layers);
    },
    addComponent: function(component) {
      this._addComponent(component)
    },
    addActionsForLayers: function(actions) {},
    postRender: function(element) {},
    closeComponent: function() {}
  };
  base(this);
  this._setRelations(project);
  this._addVectorLayersDataToQueryResponse();
  this._asyncFnc = {
    todo: noop,
    zoomToLayerFeaturesExtent: {
      async: false
    },
    goToGeometry: {
      async: false
    }
  };
  GUI.onbefore('setContent', (options)=>{
    const {perc} = options;
    if (perc === 100 && GUI.isMobile()) {
      this._asyncFnc.zoomToLayerFeaturesExtent.async = true;
      this._asyncFnc.goToGeometry.async = true;
    }
  })
}

// Make the public service en Event Emitter
inherit(QueryResultsService, G3WObject);

const proto = QueryResultsService.prototype;

proto.clear = function() {
  this.runAsyncTodo();
  this._asyncFnc = null;
  this._asyncFnc = {
    todo: noop,
    zoomToLayerFeaturesExtent: {
      async: false
    },
    goToGeometry: {
      async: false
    }
  };
};

proto.getCurrentLayersIds = function(){
  return this._currentLayerIds;
};

proto.runAsyncTodo = function() {
  this._asyncFnc.todo();
};

proto._orderResponseByProjectLayers = function(layers) {
  layers.sort((layerA, layerB) => {
    const aIndex = this._projectLayerIds.indexOf(layerA.id);
    const bIndex = this._projectLayerIds.indexOf(layerB.id);
    return aIndex > bIndex ? 1 : -1;
  });
};

proto.setZoomToResults = function(bool=true) {
  this.state.zoomToResult = bool;
};

proto.zoomToLayerFeaturesExtent = function(layer, options={}) {
  const mapService = ComponentsRegistry.getComponent('map').getService();
  const features = layer.features;
  if (this._asyncFnc.zoomToLayerFeaturesExtent.async)
    this._asyncFnc.todo = mapService.zoomToFeatures.bind(mapService, features, options);
  else mapService.zoomToFeatures(features, options);
};

proto.clearState = function() {
  this.state.layers = [];
  this.state.query = {};
  this.state.querytitle = "";
  this.state.loading = true;
  this.state.layersactions = {};
};

proto.getState = function() {
  return this.state;
};

proto.setState = function(state) {
  this.state = state;
};

proto._setRelations = function(project) {
  const projectRelations = project.getRelations();
  this._relations = projectRelations ? _.groupBy(projectRelations,'referencedLayer'):  [];
};

proto.setTitle = function(querytitle) {
  this.state.querytitle = querytitle || "";
};

proto.reset = function() {
  this.clearState();
};

proto._digestFeaturesForLayers = function(featuresForLayers) {
  let id = 0;
  featuresForLayers = featuresForLayers || [];
  const layers = [];
  let layerAttributes,
    layerRelationsAttributes,
    layerTitle,
    layerId;
  const _handleFeatureFoLayer = (featuresForLayer) => {
    let formStructure;
    let extractRelations = false;
    const layer = featuresForLayer.layer;
    const download = {
      shapefile: false,
      gpx: false,
      csv: false,
      xls: false
    };
    if (layer instanceof Layer) {
      extractRelations = true;
      download.shapefile = layer.isShpDownlodable();
      download.gpx = layer.isGpxDownlodable();
      download.csv = layer.isCsvDownlodable();
      download.xls = layer.isXlsDownlodable();
      layerAttributes = layer.getAttributes().map(attribute => {
        const sanitizeAttribute = {...attribute};
        sanitizeAttribute.name = sanitizeAttribute.name.replace(/ /g, '_');
        return sanitizeAttribute
      });
      layerRelationsAttributes = [];
      layerTitle = layer.getTitle();
      layerId = layer.getId();
      if (layer.hasFormStructure()) {
        const structure = layer.getEditorFormStructure({
          all:true
        });
        if (this._relations && this._relations.length) {
          const getRelationFieldsFromFormStructure = (node) => {
            if (!node.nodes) {
              node.name ? node.relation = true : null;
            } else {
              for (const _node of node.nodes) {
                getRelationFieldsFromFormStructure(_node);
              }
            }
          };
          for (const node of structure) {
            getRelationFieldsFromFormStructure(node);
          }
        }
        let fields = layer.getFields();
        formStructure = {
          structure,
          fields
        }
      }
    } else if (layer instanceof ol.layer.Vector){
      layerAttributes = layer.getProperties();
      layerRelationsAttributes =  [];
      layerTitle = layer.get('name');
      layerId = layer.get('id');
    } else if (typeof layer === 'string' || layer instanceof String) {
      const feature = featuresForLayer.features[0];
      layerAttributes = feature ? feature.getProperties() : [];
      layerRelationsAttributes =  [];
      const split_layer_name = layer.split('_');
      layerTitle = (split_layer_name.length > 4) ? split_layer_name.slice(0, split_layer_name.length -4).join(' '): layer;
      layerId = layer;
    }
    const layerObj = {
      title: layerTitle,
      id: layerId,
      attributes: [],
      features: [],
      hasgeometry: false,
      download,
      show: true,
      expandable: true,
      hasImageField: false,
      relationsattributes: layerRelationsAttributes,
      formStructure,
      error: ''
    };
    
    if (featuresForLayer.features && featuresForLayer.features.length) {
      const layerSpecialAttributesName = (layer instanceof Layer) ? layerAttributes.filter(attribute => {
        try {
          return attribute.name[0] === '_' || Number.isInteger(1*attribute.name[0])
        } catch(e) {
          return false
        }
      }).map(attribute => ({
        alias: attribute.name.replace(/_/, ''),
        name: attribute.name
      })) : [];
      layerSpecialAttributesName.length && featuresForLayer.features.forEach( feature => this._setSpecialAttributesFetureProperty(layerSpecialAttributesName, feature));
      layerObj.attributes = this._parseAttributes(layerAttributes, featuresForLayer.features[0]);
      layerObj.attributes.forEach((attribute) => {
        if (formStructure) {
          const relationField = formStructure.fields.find((field)=>{
            return field.name === attribute.name;
          });
          !relationField && formStructure.fields.push(attribute);
        }
        if (attribute.type === 'image') {
          layerObj.hasImageField = true;
        }
      });
      featuresForLayer.features.forEach((feature) => {
        const fid = feature.getId() ? feature.getId() : id;
        const geometry = feature.getGeometry();
        if (geometry) layerObj.hasgeometry = true;
        const featureObj = {
          id: fid,
          attributes: feature.getProperties(),
          geometry: feature.getGeometry(),
          show: true
        };
        layerObj.features.push(featureObj);
        id += 1;
      });
      layers.push(layerObj);
    }
    else if (featuresForLayer.error) layerObj.error = featuresForLayer.error;
  };
  featuresForLayers.forEach((featuresForLayer) => {
    if (!Array.isArray(featuresForLayer))
      _handleFeatureFoLayer(featuresForLayer);
    else
      featuresForLayer.forEach((featuresForLayer) => {
        _handleFeatureFoLayer(featuresForLayer);
      })
  });
  return layers;
};

proto._setSpecialAttributesFetureProperty = function(layerSpecialAttributesName, feature) {
  const featureAttributes = feature.getProperties();
  const featureAttributesNames = Object.keys(featureAttributes);
  if (layerSpecialAttributesName.length) {
    layerSpecialAttributesName.forEach(attributeObj =>{
      featureAttributesNames.find(featureAttribute => {
        if (featureAttribute.match(attributeObj.alias)) {
          feature.set(attributeObj.name, feature.get(featureAttribute));
          return true
        }
      })
    });
  }
};

proto._parseAttributes = function(layerAttributes, feature) {
  const featureAttributes = feature.getProperties();
  let featureAttributesNames = Object.keys(featureAttributes);
  featureAttributesNames = getAlphanumericPropertiesFromFeature(featureAttributesNames);
  if (layerAttributes && layerAttributes.length) {
    const attributes = layerAttributes.filter((attribute) => {
      return featureAttributesNames.indexOf(attribute.name) > -1;
    });
    return attributes;
  } else {
    return featureAttributesNames.map((featureAttributesName) => {
      return {
        name: featureAttributesName,
        label: featureAttributesName
      }
    })
  }
};

proto.setActionsForLayers = function(layers) {
  layers.forEach((layer) => {
    if (!this.state.layersactions[layer.id]) this.state.layersactions[layer.id] = [];
    //in case of geometry
    if (layer.hasgeometry)
      this.state.layersactions[layer.id].push({
        id: 'gotogeometry',
        class: GUI.getFontClass('marker'),
        hint: 'sdk.mapcontrols.query.actions.zoom_to_feature.hint',
        cbk: this.goToGeometry.bind(this)
      });
    // in case of relations
    if (this._relations) {
      const relations = this._relations[layer.id] && this._relations[layer.id].filter((relation) =>{
        return relation.type === 'MANY';
      });
      relations && relations.length && this.state.layersactions[layer.id].push({
        id: 'show-query-relations',
        class: GUI.getFontClass('relation'),
        hint: 'sdk.mapcontrols.query.actions.relations.hint',
        cbk: QueryResultsService.showQueryRelations,
        relations
      });
    }
    DOWNLOAD_FEATURE_FORMATS.forEach(format => {
      layer.download[format] && this.state.layersactions[layer.id].push({
        id: `download_${format}_feature`,
        class: GUI.getFontClass(format),
        hint: `sdk.tooltips.download_${format}`,
        cbk: this.downloadFeatures.bind(this, format)
      });
    })

  });
  this.addActionsForLayers(this.state.layersactions);
};

proto.trigger = function(actionId, layer, feature) {
  const actionMethod = this._actions[actionId];
  if (actionMethod) {
    actionMethod(layer, feature);
  }
  if (layer) {
    const layerActions = this.state.layersactions[layer.id];
    if (layerActions) {
      let action;
      layerActions.forEach((layerAction) => {
        if (layerAction.id === actionId) {
          action = layerAction;
        }
      });
      if (action) {
        this.triggerLayerAction(action,layer,feature);
      }
    }
  }
};

proto.triggerLayerAction = function(action,layer,feature) {
  if (action.cbk) {
    action.cbk(layer,feature, action)
  }
  if (action.route) {
    let url;
    let urlTemplate = action.route;
    url = urlTemplate.replace(/{(\w*)}/g,function(m,key){
      return feature.attributes.hasOwnProperty(key) ? feature.attributes[key] : "";
    });
    if (url && url !== '') {
      GUI.goto(url);
    }
  }
};

proto.registerVectorLayer = function(vectorLayer) {
  if (this._vectorLayers.indexOf(vectorLayer) === -1) {
    this._vectorLayers.push(vectorLayer);
  }
};

proto.unregisterVectorLayer = function(vectorLayer) {
  const index = this._vectorLayers.indexOf(vectorLayer);
  if ( index !== -1) {
    this._vectorLayers.splice(index, 1);
  }
};

proto._addVectorLayersDataToQueryResponse = function() {
  this.onbefore('setQueryResponse', (queryResponse, coordinates, resolution) => {
    const mapService = ComponentsRegistry.getComponent('map').getService();
    let isVisible = false;
    this._vectorLayers.forEach((vectorLayer) => {
      let features = [];
      let feature,
        intersectGeom;
      switch (vectorLayer.constructor) {
        case VectorLayer:
          isVisible = !vectorLayer.isVisible();
          break;
        case ol.layer.Vector:
          isVisible = !vectorLayer.getVisible();
          break;
      }
      if ((queryResponse.data && queryResponse.data.length && queryResponse.data[0].layer == vectorLayer) || !coordinates || isVisible ) { return true}
      if (Array.isArray(coordinates)) {
        if (coordinates.length === 2) {
          const pixel = mapService.viewer.map.getPixelFromCoordinate(coordinates);
          mapService.viewer.map.forEachFeatureAtPixel(pixel, function (feature, layer) {
            features.push(feature);
          },  {
            layerFilter: function(layer) {
              return layer === vectorLayer;
            }
          });
        } else if (coordinates.length === 4) {
          intersectGeom = ol.geom.Polygon.fromExtent(coordinates);
          switch (vectorLayer.constructor) {
            case VectorLayer:
              features = vectorLayer.getIntersectedFeatures(intersectGeom);
              break;
            case ol.layer.Vector:
              vectorLayer.getSource().getFeatures().forEach(feature => {
                if (intersectGeom.intersectsExtent(feature.getGeometry().getExtent())) {
                  features.push(feature);
                }
              });
              break;
          }
        }
      } else if (coordinates instanceof ol.geom.Polygon || coordinates instanceof ol.geom.MultiPolygon) {
        intersectGeom = coordinates;
        switch (vectorLayer.constructor) {
          case VectorLayer:
            features = vectorLayer.getIntersectedFeatures(intersectGeom);
            break;
          case ol.layer.Vector:
            vectorLayer.getSource().getFeatures().forEach(feature => {
              if (intersectGeom.intersectsExtent(feature.getGeometry().getExtent())) {
                features.push(feature);
              }
            });
            break;
        }
      }
      queryResponse.data = queryResponse.data ? queryResponse.data : [];
      queryResponse.data.push({
        features,
        layer: vectorLayer
      });
    })
  });
};

//function to add c custom componet in query result
proto._addComponent = function(component) {
  this.state.components.push(component)
};

proto.downloadFeatures = function(type, {id:layerId}={}, features=[]){
  const data = {};
  features = features ?  Array.isArray(features) ? features : [features]: features;
  data.fids = features.map(feature => feature.attributes['g3w_fid']).join(',');
  const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
  let promise = Promise.resolve();
  GUI.setLoadingContent(true);
  switch(type) {
    case 'shapefile':
      promise = layer.getShp({data});
      break;
    case 'xls':
      promise  = layer.getXls({data});
      break;
    case 'csv':
      promise  = layer.getCsv({data});
      break;
    case 'gpx':
      promise = layer.getGpx({data});
      break;
  }
  promise.catch((err) => {
    GUI.notify.error(t("info.server_error"));
  }).finally(()=>{
    GUI.setLoadingContent(false);
  })
};

proto.downloadGpx = function({id:layerId}={}, feature){
  const fid = feature ? feature.attributes['g3w_fid'] : null;
  const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
  layer.getGpx({fid}).catch((err) => {
    GUI.notify.error(t("info.server_error"));
  }).finally(() => {
    this.layerMenu.loading.shp = false;
    this._hideMenu();
  })
};

proto.downloadXls = function({id:layerId}={}, feature){
  const fid = feature ? feature.attributes['g3w_fid'] : null;
  const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
  layer.getXls({fid}).catch((err) => {
    GUI.notify.error(t("info.server_error"));
  }).finally(() => {
    this.layerMenu.loading.shp = false;
    this._hideMenu();
  })
};

proto.goToGeometry = function(layer, feature) {
  if (feature.geometry) {
    const mapService = ComponentsRegistry.getComponent('map').getService();
    if (this._asyncFnc.goToGeometry.async) {
      this._asyncFnc.todo = mapService.highlightGeometry.bind(mapService, feature.geometry, {
        layerId: layer.id,
        duration: 1500
      });
    } else setTimeout(() => {
      mapService.highlightGeometry(feature.geometry, {
        layerId: layer.id,
        duration: 1500
      });
    }, 0)
  }
};

//save layer result
proto.saveLayerResult = function({layer, type='csv'}={}) {
  this.downloadFeatures(type, layer, layer.features);
};

QueryResultsService.zoomToElement = function(layer, feature) {
  //TODO
};

QueryResultsService.goToGeometry = function(layer, feature) {
  if (feature.geometry) {
    setTimeout(() => {
      const mapService = ComponentsRegistry.getComponent('map').getService();
      // mapService.highlightGeometry(feature.geometry, {
      //   layerId: layer.id,
      //   duration: 1500
      // });
    }, 0)
  }
};

QueryResultsService.highlightGeometry = function(layer, feature) {
  if (feature.geometry) {
    const mapService = ComponentsRegistry.getComponent('map').getService();
    mapService.highlightGeometry(feature.geometry, {
      layerId: layer.id,
      zoom: false,
      duration: Infinity
    });
  }
};

QueryResultsService.clearHighlightGeometry = function(layer, feature) {
  const mapService = ComponentsRegistry.getComponent('map').getService();
  mapService.clearHighlightGeometry();
};

QueryResultsService.showQueryRelations = function(layer, feature, action) {
  GUI.pushContent({
    content: new RelationsPage({
      relations: action.relations,
      feature: feature,
      layer
    }),
    backonclose: true,
    closable: false
  });
};

module.exports = QueryResultsService;


