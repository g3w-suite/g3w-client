import GUI from 'services/gui';
import {G3W_FID, LIST_OF_RELATIONS_TITLE, LIST_OF_RELATIONS_ID} from 'constant';
import ProjectsRegistry from 'store/projects';
import DataRouterService from 'services/data';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DownloadFormats from 'components/QueryResultsActionDownloadFormats.vue';
import QueryPolygonCsvAttributesComponent from 'components/QueryResultsActionQueryPolygonCSVAttributes.vue';
import ApplicationService from 'services/application';

const {base, inherit, noop, downloadFile, throttle, getUniqueDomId, copyUrl } = require('core/utils/utils');
const {
  createFeatureFromFeatureObject,
  intersects,
  within
} = require('core/utils/geo');
const {getAlphanumericPropertiesFromFeature, createFeatureFromGeometry, createFeatureFromBBOX, createFeatureFromCoordinates} = require('core/utils/geo');
const {t} = require('core/i18n/i18n.service');
const Layer = require('core/layers/layer');
const G3WObject = require('core/g3wobject');
const VectorLayer = require('core/layers/vectorlayer');
const PrintService = require('core/print/printservice');
const RelationsPage = require('gui/relations/vue/relationspage');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

//used to get and set vue reactivity to queryresultservice
const VM = new Vue();

function QueryResultsService() {
  this.printService = new PrintService();
  this._currentLayerIds = [];

  ProjectsRegistry.onafter('setCurrentProject', project => {
    this._project = project;
    this._setRelations(project);
    this._setAtlasActions(project);
    this.state.download_data = false;
    this.plotLayerIds = [];
  });
  this.unlistenerlayeractionevents = [];
  this._actions = {
    'zoomto': QueryResultsService.zoomToElement,
    'highlightgeometry': this.highlightGeometry.bind(this),
    'clearHighlightGeometry': this.clearHighlightGeometry.bind(this)
  };
  this._relations = [];
  this._atlas = [];
  this.plotLayerIds = [];
  const project = this._project = ProjectsRegistry.getCurrentProject();
  // userful to set right order for query result based on toc order layers
  this._projectLayerIds = this._project.getConfigLayers().map(layer => layer.id);
  // set reactive state
  this.state = {
    zoomToResult: true,
    components: [],
    layers: [],
    changed: false,
    query: null,
    type: 'ows', // or api in case of search
    layersactions: {},
    actiontools:{}, // addd action tools (for features)
    currentactiontools:{}, // current action tools contain component of a specific action (for example download)
    currentactionfeaturelayer:{}, // contain current action that expose component vue (it useful to comprare id other action is toggled and expose component)
    layeractiontool: {},
    layersFeaturesBoxes:{},
    layerscustomcomponents:{} // used to show a custom component for a layer
  };
  this.init = function() {
    this.clearState();
  };
  // Is a vector layer used by query resul to show eventually query resuesta as coordnates, bbox, polygon, etc ..
  const color = 'blue';
  const stroke = new ol.style.Stroke({
    color,
    width: 3
  });
  const fill = new ol.style.Fill({
    color
  });
  this.resultsQueryLayer = new ol.layer.Vector({
    style: new ol.style.Style({
      stroke,
      image: new ol.style.Circle({
        fill,
        radius: 6
      }),
    }),
    source: new ol.source.Vector()
  });

  this._vectorLayers = [];
  this._addFeaturesLayerResultInteraction = {
    id: null, // reference to current layer
    interaction: null, // interaction bind to layer,
    mapcontrol: null, // add current toggled map control if toggled
    toggleeventhandler: null
  };
  this.setters = {
    /**
     * Method call when response is handled by Data Provider
     * @param queryResponse
     * @param options: add is used to know if is a new query request or add/remove query request
     */
    setQueryResponse(queryResponse, options={add:false}) {
      const {add} = options;
      // in case of new request results reset the query otherwise maintain the previous request
      if (!add) {
        this.clearState();
        this.state.query = queryResponse.query;
        this.state.type = queryResponse.type;
      }
      const {data} = queryResponse;
      const layers = this._digestFeaturesForLayers(data);
      this.setLayersData(layers, options);
    },

    /**
     * method to add layer and feature for response
     * @param layers
     * @param options
     */
    setLayersData(layers, options={add:false}) {
      const {add} = options;
      if (!add){
        // here set the right order of result layers based on toc
        this._currentLayerIds = layers.map(layer => layer.id);
        this._orderResponseByProjectLayers(layers);
      }
      layers.forEach(layer => {
        // in case of a new request query
        if (!add) this.state.layers.push(layer);
        //get features from add pick layer
        else this.updateLayerResultFeatures(layer);
      });
      this.setActionsForLayers(layers, {add});
      this.state.changed = true;
    },
    /**
     * Method
     * @param component
     */
    addComponent(component) {
      this._addComponent(component)
    },
    /**
     *
     */
    addActionsForLayers(actions, layers) {},
    /**
     *
     * @param element
     */
    postRender(element) {},
    /**
     *
     */
    closeComponent() {},
    /**
     *
     * @param layer
     */
    changeLayerResult(layer){
      this._changeLayerResult(layer);
    },
    /**
     *
     */
    activeMapInteraction(){},
    /**
     *  setter hook to relation table
     */
    editFeature({layer, feature}={}){},
    /**
     * Method to listen open/close feature info data content.
     * @param open
     * @param layer
     * @param feature
     * @param container
     */
    openCloseFeatureResult({open, layer, feature, container}={}){}
  };
  base(this);

  this.addLayersPlotIds = function(layerIds=[]) {
    this.plotLayerIds = layerIds;
  };

  this.getPlotIds = function(){
    return this.plotLayerIds;
  };

  this.findPlotId = function(id){
    return this.plotLayerIds.find(plotId => plotId == id);
  };

  this._setRelations(project);
  this._setAtlasActions(project);
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
    this.mapService = this.mapService || ApplicationService.getApplicationService('map');
    if (perc === 100 && GUI.isMobile()) {
      this._asyncFnc.zoomToLayerFeaturesExtent.async = true;
      this._asyncFnc.goToGeometry.async = true;
    }
  });
}

// Make the public service en Event Emitter
inherit(QueryResultsService, G3WObject);

const proto = QueryResultsService.prototype;

/**
 * Method to register for plugin or other component of application to add custom component on result for each layer feature or layer
 * @param id unique id identification
 * @param layerId Layer id of layer
 * @param component custom component
 * @param type feature or layer
 */
proto.registerCustomComponent = function({id=getUniqueDomId(), layerId, component, type='feature', position='after'}={}){
  if (this.state.layerscustomcomponents[layerId] === undefined)
    this.state.layerscustomcomponents[layerId] = {
      layer: {
        before: [],
        after: []
      },
      feature: {
        before: [],
        after: []
      }
    };
  this.state.layerscustomcomponents[layerId][type][position].push({
    id,
    component
  });
  return id;
};

/**
 * To check position
 * @param id
 * @param layerId
 * @param type
 */
proto.unRegisterCustomComponent = function({id, layerId, type, position}){
  if (position) this.state.layerscustomcomponents[layerId][type][position] = this.state.layerscustomcomponents[layerId][type][position].filter(({id:componentId}) => componentId !== id);
  else Object.keys(this.state.layerscustomcomponents[layerId][type]).forEach(position =>{
    this.state.layerscustomcomponents[layerId][type][position] = this.state.layerscustomcomponents[layerId][type][position].filter(({id:componentId}) => componentId !== id);
  })
};

/**
 * Method to add a feature to current layer result
 * @param layer
 * @param feature
 */
proto.addFeatureLayerToResult = function(layer, feature){
  this.state.layersFeaturesBoxes[this.getBoxId(layer, feature)].collapsed = true;
};

/**
 * Method to remove a feature from current layer result
 * @param layer
 * @param feature
 */
proto.removeFeatureLayerFromResult = function(layer, feature){
  const {id, external} = layer;
  this.updateLayerResultFeatures({
    id,
    external,
    features: [feature]
  })
};

/**
 * Method wrapper for download
 */

proto.downloadApplicationWrapper = async function(downloadFnc, options={}){
  const download_caller_id = ApplicationService.setDownload(true);
  GUI.setLoadingContent(true);
  try {
    await downloadFnc(options);
  } catch(err){
    GUI.showUserMessage({
      type: 'alert',
      message: err || 'server_error',
      textMessage: err ? true : false
    })
  }
  ApplicationService.setDownload(false, download_caller_id);
  GUI.setLoadingContent(false);
};

/**
 * Based on layer response check if features layer are to add or remove to current state.layers results
 * @param layer
 * @since v3.8.0
 */
proto.updateLayerResultFeatures = function(layer){
  //extract features from layer object
  let {features=[]} = layer;
  // get layer from current state.layers showed on result
  const findLayer = this.state.layers.find(_layer => _layer.id === layer.id);
  // if get features and find layer
  if (findLayer && features.length){
    // get id external layer or not (external is a layer added by mapcontrol addexternlayer)
    const {external} = findLayer;
    // is array of idexes od features that we has to remove from state.layer because is already loaded
    const removeFeatureIndexes = [];
    // get id of the features
    const features_ids = features.map(feature => !external ? feature.attributes[G3W_FID]: feature.id);
    // loop nad filter the features that we had to remove)
    findLayer.features = findLayer.features.filter(feature => {
      const indexFindFeature = features_ids.indexOf(!external ? feature.attributes[G3W_FID]: feature.id);
      // check if need to filter or not
      const filtered = indexFindFeature === -1;
      if (!filtered){
        removeFeatureIndexes.push(indexFindFeature);
        const featureRemoved = features[indexFindFeature];
        this.state.layersFeaturesBoxes[this.getBoxId(layer, feature)].collapsed = true;
        setTimeout(()=> delete this.state.layersFeaturesBoxes[this.getBoxId(layer, featureRemoved)]);
      } else this.state.layersFeaturesBoxes[this.getBoxId(layer, feature)].collapsed = true;
      return filtered;
    });
    // filter features to add
    features = features.filter((feature, index) => removeFeatureIndexes.indexOf(index) === -1);
    // check if new feature ha to be added
    if (features.length) {
      const newlayerfeatures = [...findLayer.features, ...features];
      findLayer.features = newlayerfeatures;
    }
    //in case of removed features
    if (findLayer.features.length === 1 && this.state.layersFeaturesBoxes[this.getBoxId(findLayer, findLayer.features[0])])
      // used to do all vue reactive thing before update layers
      setTimeout(() => this.state.layersFeaturesBoxes[this.getBoxId(findLayer, findLayer.features[0])].collapsed = false);
    // in case no more features on layer remove interaction pickcoordinate to get result from map
    this.checkIfLayerHasNoFeatures(findLayer);
  }
  // hightlight new feature
  this.state.layers.length === 1 && this.highlightFeaturesPermanently(this.state.layers[0]);
  this.changeLayerResult(findLayer);
};

/**
 * @deprecated since v3.8. Will be deleted in 4.x. Use QueryResultsService::updateLayerResultFeatures(layer) instead
 */
proto.addRemoveFeaturesToLayerResult = proto.updateLayerResultFeatures;

/**
 * Method called when layer result features for example is changed
 * @param layer
 */
proto._changeLayerResult = function(layer){
  const layeractions = this.state.layersactions[layer.id];
  // call if present change mthod to action
  layeractions.forEach(action => action.change && action.change(layer));
  //reset layer current actions tools
  this.resetCurrentActionToolsLayer(layer);
};

/**
 * Check and do action if layer has no features after delete feature(s
 */
proto.checkIfLayerHasNoFeatures = function(layer){
  if (layer.features.length === 0) {
    // used to do all vue reactive thing before update layers
    setTimeout(() => {
      this.state.layers = this.state.layers.filter(_layer => _layer.id !== layer.id);
      this.clearHighlightGeometry(layer);
      this.removeAddFeaturesLayerResultInteraction({
        toggle: true
      });
    })
  }
};

/**
 * Method to create boxid identify to query result hmtl
 * @param layer
 * @param feature
 * @param relation_index
 * @returns {string}
 */
proto.getBoxId = function(layer, feature, relation_index){
  return relation_index !== null && relation_index !== undefined ? `${layer.id}_${feature.id}_${relation_index}` : `${layer.id}_${feature.id}`;
};

proto.setActionsForLayers = function(layers, options={add: false}) {
  const {add} = options;
  if (!add) {
    this.unlistenerlayeractionevents = [];
    layers.forEach(layer => {
      /**
       * set eventually layer action tool and need to be reactive
       * @type {{}}
       */
      this.state.layeractiontool[layer.id] = Vue.observable({
        component: null,
        config: null
      });
      const currentactiontoolslayer = {};
      const currentationfeaturelayer = {};
      layer.features.forEach((feature, index)=> {
        currentactiontoolslayer[index] = null;
        currentationfeaturelayer[index] = null;
      });
      this.state.currentactiontools[layer.id] = Vue.observable(currentactiontoolslayer);
      this.state.currentactionfeaturelayer[layer.id] = Vue.observable(currentationfeaturelayer);
      const is_external_layer_or_wms = layer.external || (layer.source ? layer.source.type === 'wms' : false);
      if (!this.state.layersactions[layer.id]) this.state.layersactions[layer.id] = [];
      /**
       * An action is an object contains
       * {
       * id: Unique action Id => required True
          download: if is action download or not => required False
          class: calss fontawsome to show icon => required True,
          state: need to be reactive. Used for example to toggled state of action icon => required False
          hint: Tooltip text => required False
          init: Method called when action is loaded => required False
          clear: Method called before clear the service. Used for example to clear unwatch => require False
          change: Method called when feature of layer is changed
          cbk: Method called when action is cliccked => required True
          }
       *
       * }
       */

      //in case of geometry
      if (layer.hasgeometry) {
        this.state.layersactions[layer.id].push({
          id: 'gotogeometry',
          download: false,
          mouseover: true,
          class: GUI.getFontClass('marker'),
          hint: 'sdk.mapcontrols.query.actions.zoom_to_feature.hint',
          cbk: throttle(this.goToGeometry.bind(this))
        });
      }
      // in case of relations
      if (this._relations) {
        const relations = this._relations[layer.id] && this._relations[layer.id].filter(relation =>{
          return relation.type === 'MANY';
        });
        if (relations && relations.length) {
          const chartRelationIds = [];
          relations.forEach(relation => {
            const id = this.plotLayerIds.find(id => id === relation.referencingLayer);
            id && chartRelationIds.push(id);
          });

          this.state.layersactions[layer.id].push({
            id: 'show-query-relations',
            download: false,
            class: GUI.getFontClass('relation'),
            hint: 'sdk.mapcontrols.query.actions.relations.hint',
            cbk: this.showQueryRelations,
            relations,
            chartRelationIds
          });
          const state = this.createActionState({
            layer
          });
          chartRelationIds.length && this.state.layersactions[layer.id].push({
            id: 'show-plots-relations',
            download: false,
            opened: true,
            class: GUI.getFontClass('chart'),
            state,
            hint: 'sdk.mapcontrols.query.actions.relations_charts.hint',
            cbk: throttle(this.showRelationsChart.bind(this, chartRelationIds))
          });
        }
      }
      /**
       *
       * Check if layer has atlas
       */
      this.getAtlasByLayerId(layer.id).length && this.state.layersactions[layer.id].push({
        id: `printatlas`,
        download: true,
        class: GUI.getFontClass('print'),
        hint: `sdk.tooltips.atlas`,
        cbk: this.printAtlas.bind(this)
      });
      const state = this.createActionState({
        layer
      });
      if (layer.downloads.length === 1) {
        const [format] = layer.downloads;
        const cbk = this.downloadFeatures.bind(this, format);
        layer[format] = Vue.observable({
          active: false
        });
        this.state.layersactions[layer.id].push({
          id: `download_${format}_feature`,
          download: true,
          state,
          class: GUI.getFontClass('download'),
          hint: `sdk.tooltips.download_${format}`,
          cbk: (layer, feature, action, index)=>{
            action.state.toggled[index] = !action.state.toggled[index];
            if (action.state.toggled[index]) cbk(layer, feature, action, index);
            else this.setCurrentActionLayerFeatureTool({
              index,
              action,
              layer
            })
          }
        });
      } else if (layer.downloads.length > 1 ){
        // SET CONSTANT TO AVOID TO CHANGE ALL THINGS
        const ACTIONTOOLSDOWNLOADFORMATS = DownloadFormats.name;
        const downloads = [];
        layer.downloads.forEach(format => {
          downloads.push({
            id: `download_${format}_feature`,
            download: true,
            format,
            class: GUI.getFontClass(format),
            hint: `sdk.tooltips.download_${format}`,
            cbk: (layer, feature, action, index)=> {
              //used to untoggle downloads action
              this.downloadFeatures(format, layer, feature, action, index);
              const downloadsaction = this.state.layersactions[layer.id].find(action => action.id === 'downloads');
              if (this.state.query.type !== 'polygon') downloadsaction.cbk(layer, feature, downloadsaction, index);
            }
          });
        });
        this.state.actiontools[ACTIONTOOLSDOWNLOADFORMATS] = this.state.actiontools[ACTIONTOOLSDOWNLOADFORMATS] || {};
        // set config of actionstools
        this.state.actiontools[ACTIONTOOLSDOWNLOADFORMATS][layer.id] = {
          downloads // ARE DOWNLOAD ACTIONS,
        };
        // used to
        //check if has download actions
        this.state.layersactions[layer.id].push({
          id: `downloads`,
          download: true,
          class: GUI.getFontClass('download'),
          state,
          toggleable: true,
          hint: `Downloads`,
          change({features}) {
            features.forEach((feature, index) =>{
              if (this.state.toggled[index] === undefined) VM.$set(this.state.toggled, index, false);
              else this.state.toggled[index] = false;
            });
          },
          cbk: (layer, feature, action, index) => {
            action.state.toggled[index] = !action.state.toggled[index];
            this.setCurrentActionLayerFeatureTool({
              layer,
              index,
              action,
              component: action.state.toggled[index] ? DownloadFormats : null
            });
          }
        });
      }
      /*
      Check if si external layer or wms
       */
      !is_external_layer_or_wms && this.state.layersactions[layer.id].push({
        id: 'removefeaturefromresult',
        download: false,
        mouseover: true,
        class: GUI.getFontClass('minus-square'),
        style: {
          color: 'red'
        },
        hint: 'sdk.mapcontrols.query.actions.remove_feature_from_results.hint',
        cbk: this.removeFeatureLayerFromResult.bind(this)
      });

      /**
       * check if selection is active
       */
      if (layer.selection.active !== undefined) {
        // selection action
        const state = this.createActionState({
          layer
        });

        this.state.layersactions[layer.id].push({
          id: 'selection',
          download: false,
          class: GUI.getFontClass('success'),
          hint: 'sdk.mapcontrols.query.actions.add_selection.hint',
          state,
          init: ({feature, index, action}={})=>{
            typeof layer.selection.active !== "undefined" && this.checkFeatureSelection({
              layer,
              index,
              feature,
              action
            })
          },
          cbk: throttle(this.addToSelection.bind(this))
        });
        /*
        * In case of external layer don't listen selection event
        * */
        this.listenClearSelection(layer, 'selection');
        //end selection action
      }
      /*
        If not wms of external layer show copy link to feature
       */
      !is_external_layer_or_wms && layer.hasgeometry && this.state.layersactions[layer.id].push({
        id: 'link_zoom_to_fid',
        download: false,
        class: GUI.getFontClass('link'),
        hint: 'sdk.mapcontrols.query.actions.copy_zoom_to_fid_url.hint',
        hint_change: {
          hint: 'sdk.mapcontrols.query.actions.copy_zoom_to_fid_url.hint_change',
          duration: 1000
        },
        cbk: this.copyZoomToFidUrl.bind(this)
      });
      layer.editable && !layer.inediting && this.state.layersactions[layer.id].push({
        id: 'editing',
        class: GUI.getFontClass('pencil'),
        hint: 'Editing',
        cbk: (layer, feature) => {
          this.editFeature({
            layer,
            feature
          })
        }
      });
    });
    this.addActionsForLayers(this.state.layersactions, this.state.layers);
  }
};

proto.createActionState = function({layer, dynamicProperties=['toggled']}){
  // check number of download formats
  const propertiesObject = dynamicProperties.reduce((accumulator, property) =>{
    accumulator[property] = {};
    return accumulator;
  }, {});
  layer.features.map((feature, index)=> {
    Object.keys(propertiesObject).forEach(property =>{
      propertiesObject[property][index] = null;
    })
  });
  return Vue.observable(propertiesObject);
};

/**
 * Method to get action referred to layer getting the acion id
 * @param layer layer linked to action
 * @param id action id
 * @returns {*}
 */
proto.getActionLayerById = function({layer, id}={}){
  return this.state.layersactions[layer.id].find(action => action.id === id);
};

/**
 * Set current layer action tool in feature
 * @param layer current layer
 * @param index feature index
 * @param value component value or null
 */
proto.setCurrentActionLayerFeatureTool = function({layer, action, index, component=null}={}){
  if (component){
    if (this.state.currentactiontools[layer.id][index] && action.id !== this.state.currentactionfeaturelayer[layer.id][index].id && this.state.currentactionfeaturelayer[layer.id][index].toggleable)
      this.state.currentactionfeaturelayer[layer.id][index].state.toggled[index] = false;
    this.state.currentactionfeaturelayer[layer.id][index] = action;
  } else this.state.currentactionfeaturelayer[layer.id][index] = null;
  this.state.currentactiontools[layer.id][index] = component;
};


proto.addCurrentActionToolsLayer = function({id, layer, config={}}){
  this.state.actiontools[id] = {};
  this.state.actiontools[id][layer.id] = config;
};

/**
 * Reset current action tools on layer when feature layer change
 * @param layer
 */
proto.resetCurrentActionToolsLayer = function(layer){
  layer.features.forEach((feature, index)=>{
    if (this.state.currentactiontools[layer.id]) {
      if (this.state.currentactiontools[layer.id][index] === undefined) Vue.set(this.state.currentactiontools[layer.id], index, null);
      else this.state.currentactiontools[layer.id][index] = null;
      this.state.currentactionfeaturelayer[layer.id][index] = null;
    }
  })
};

/**
 *
 */
proto.setLayerActionTool = function({layer, component=null, config=null}={}){
  this.state.layeractiontool[layer.id].component = component;
  this.state.layeractiontool[layer.id].config = config;
};

/**
 * Method copy zoomtofid url
 * @param layer
 * @param feature
 */
proto.copyZoomToFidUrl = function(layer, feature, action){
  const fid = feature.attributes[G3W_FID];
  const url = new URL(location.href);
  const zoom_to_fid = `${layer.id}|${fid}`;
  url.searchParams.set('zoom_to_fid', zoom_to_fid);
  copyUrl(url.toString());
  action.hint_changed = true;
};

/**
 * Clear all
 */
proto.clear = function() {
  this.runAsyncTodo();
  this.unlistenerEventsActions();
  this.mapService.clearHighlightGeometry();
  this.resultsQueryLayer.getSource().clear();
  this.removeAddFeaturesLayerResultInteraction({
    toggle: true
  });
  this.mapService.getMap().removeLayer(this.resultsQueryLayer);
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
  this.clearState();
  this.closeComponent();
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

proto.highlightFeaturesPermanently = function(layer){
  const {features} = layer;
  this.mapService.highlightFeatures(features, {
    duration: Infinity
  })
};

/**
 * Check if one layer result
 * @returns {boolean}
 */
proto.isOneLayerResult = function(){
  return this.state.layers.length === 1;
};

/**
 *
 * @param toggle boolean If true toggle true the mapcontrol
 */
proto.removeAddFeaturesLayerResultInteraction = function({toggle=false}={}){
  if (this._addFeaturesLayerResultInteraction.interaction) this.mapService.removeInteraction(this._addFeaturesLayerResultInteraction.interaction);
  this._addFeaturesLayerResultInteraction.interaction = null;
  this._addFeaturesLayerResultInteraction.id = null;
  // check if map control query map is register and if toggled
  toggle && this._addFeaturesLayerResultInteraction.mapcontrol && this._addFeaturesLayerResultInteraction.mapcontrol.toggle(true);
  this._addFeaturesLayerResultInteraction.mapcontrol = null;
  this._addFeaturesLayerResultInteraction.toggleeventhandler && this.mapService.off('mapcontrol:toggled', this._addFeaturesLayerResultInteraction.toggleeventhandler);
  this._addFeaturesLayerResultInteraction.toggleeventhandler = null;
};

/**
 *
 * Adde feature to Features results
 * @param layer
 */
proto.addLayerFeaturesToResultsAction = function(layer){
  /**
   * Check if layer is current layer to add or clear previous
   */
  if (this._addFeaturesLayerResultInteraction.id !== null && this._addFeaturesLayerResultInteraction.id !== layer.id){
    const layer = this.state.layers.find(layer => layer.id === this._addFeaturesLayerResultInteraction.id);
    if (layer) layer.addfeaturesresults.active = false;
    //remove previous add result interaction
    if (this._addFeaturesLayerResultInteraction.interaction) this.mapService.removeInteraction(this._addFeaturesLayerResultInteraction.interaction);
  }
  this._addFeaturesLayerResultInteraction.id = layer.id;
  layer.addfeaturesresults.active = !layer.addfeaturesresults.active;
  if (layer.addfeaturesresults.active) {
    this.activeMapInteraction(); // useful o send an event
    const {external} = layer;
    if (!this._addFeaturesLayerResultInteraction.mapcontrol) this._addFeaturesLayerResultInteraction.mapcontrol = this.mapService.getCurrentToggledMapControl();
    this._addFeaturesLayerResultInteraction.interaction =  new PickCoordinatesInteraction();
    this.mapService.addInteraction(this._addFeaturesLayerResultInteraction.interaction, {
      close: false
    });
    this._addFeaturesLayerResultInteraction.interaction.on('picked', async evt =>{
      const {coordinate: coordinates} = evt;
      if (!external)
        await DataRouterService.getData('query:coordinates',
          {
            inputs: {
              coordinates,
              query_point_tolerance: this._project.getQueryPointTolerance(),
              layerIds: [layer.id],
              multilayers: false,
            }, outputs: {
              show: {
                add: true
              }
            }
         });
      else {
        const vectorLayer = this._vectorLayers.find(vectorLayer => layer.id === vectorLayer.get('id'));
        const responseObject = this.getVectorLayerFeaturesFromQueryRequest(vectorLayer,{
          coordinates
        });
        this.setQueryResponse({
          data: [responseObject],
          query: {
            coordinates
          }
        }, {add:true});
      }
    });
    const eventHandler = evt => {
      if (evt.target.isToggled() && evt.target.isClickMap()) layer.addfeaturesresults.active = false;
    };
    this._addFeaturesLayerResultInteraction.toggleeventhandler = eventHandler;
    this.mapService.once('mapcontrol:toggled', eventHandler);
  } else this.removeAddFeaturesLayerResultInteraction({
    toggle: true
  });
};

proto.deactiveQueryInteractions = function(){
  this.state.layers.forEach(layer => { if (layer.addfeaturesresults) layer.addfeaturesresults.active = false});
  this.removeAddFeaturesLayerResultInteraction();
};

proto.zoomToLayerFeaturesExtent = function(layer, options={}) {
  const {features} = layer;
  options.highlight = !this.isOneLayerResult();
  if (this._asyncFnc.zoomToLayerFeaturesExtent.async)
    this._asyncFnc.todo = this.mapService.zoomToFeatures.bind(this.mapService, features, options);
  else this.mapService.zoomToFeatures(features, options);
};

proto.clearState = function(options={}) {
  this.state.layers.splice(0);
  this.state.query = {};
  this.state.querytitle = "";
  this.state.changed = false;
  // clear action if present
  Object.values(this.state.layersactions).forEach(layeractions =>layeractions.forEach(action => action.clear && action.clear()));
  this.state.layersactions = {};
  this.state.actiontools = {};
  this.state.layeractiontool = {};
  // current action tools
  this.state.currentactiontools = {};
  this.state.layersFeaturesBoxes = {};
  this.removeAddFeaturesLayerResultInteraction();
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

proto.getAtlasByLayerId = function(layerId) {
  return this._atlas.filter(atlas => atlas.atlas.qgs_layer_id === layerId);
};

proto._setAtlasActions = function(project){
  this._atlas = project.getPrint().filter(printconfig => printconfig.atlas) || [];
};

proto.setTitle = function(querytitle) {
  this.state.querytitle = querytitle || "";
};

proto.reset = function() {
  this.clearState();
};

/**
 * Method that convert response from Data Provider to a Query Result component data structure
 * @param featuresForLayers: Array contains for each layer features
 * @returns {[]}
 * @private
 */
proto._digestFeaturesForLayers = function(featuresForLayers) {
  let id = 0;
  featuresForLayers = featuresForLayers || [];
  const layers = [];
  let layerAttributes,
    layerRelationsAttributes,
    layerTitle,
    layerId;
  const _handleFeatureFoLayer = featuresForLayer => {
    let formStructure;
    let sourceType;
    let source;
    let extractRelations = false;
    let external = false;
    let editable = false;
    let inediting = false;
    const layer = featuresForLayer.layer;
    let downloads = [];
    let infoformats = [];
    let infoformat;
    let filter = {};
    let selection = {};
    if (layer instanceof Layer) {
      editable = layer.isEditable();
      inediting = layer.isInEditing();
      source = layer.getSource();
      infoformats = layer.getInfoFormats(); // add infoformats property
      infoformat = layer.getInfoFormat();
      // set selection filter and relation if not wms
      if ([Layer.SourceTypes.WMS, Layer.SourceTypes.WCS, Layer.SourceTypes.WMST].indexOf(layer.getSourceType()) === -1){
        filter = layer.state.filter;
        selection = layer.state.selection;
        extractRelations = true;
      }
     downloads = layer.getDownloadableFormats();
      try {
        sourceType = layer.getSourceType()
      } catch(err){}
      // sanitize attributes layer only if is ows
      layerAttributes = this.state.type === 'ows' ? layer.getAttributes().map(attribute => {
        const sanitizeAttribute = {...attribute};
        sanitizeAttribute.name = sanitizeAttribute.name.replace(/ /g, '_');
        return sanitizeAttribute
      }) : layer.getAttributes();

      layerRelationsAttributes = [];
      layerTitle = layer.getTitle();
      layerId = layer.getId();
      if (layer.hasFormStructure()) {
        const structure = layer.getLayerEditingFormStructure();
        if (this._relations && this._relations.length) {
          const getRelationFieldsFromFormStructure = node => {
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
        const fields = layer.getFields().filter(field => field.show); // get features show
        formStructure = {
          structure,
          fields
        }
      }
    } else if (layer instanceof ol.layer.Vector){
      selection = layer.selection;
      layerAttributes = layer.getProperties();
      layerRelationsAttributes =  [];
      layerTitle = layer.get('name');
      layerId = layer.get('id');
      external = true;
    } else if (typeof layer === 'string' || layer instanceof String) {
      sourceType = Layer.LayerTypes.VECTOR;
      const feature = featuresForLayer.features[0];
      layerAttributes = feature ? feature.getProperties() : [];
      layerRelationsAttributes =  [];
      const split_layer_name = layer.split('_');
      layerTitle = (split_layer_name.length > 4) ? split_layer_name.slice(0, split_layer_name.length -4).join(' '): layer;
      layerId = layer;
      external = true;
    }
    const layerObj = {
      title: layerTitle,
      id: layerId,
      infoformat,
      infoformats,
      attributes: [],
      features: [],
      hasgeometry: false,
      atlas: this.getAtlasByLayerId(layerId),
      source,
      downloads,
      show: true,
      filter,
      addfeaturesresults: {
        active:false
      },
      [DownloadFormats.name]: {
        active: false
      },
      external,
      editable,
      inediting,
      selection,
      expandable: true,
      hasImageField: false,
      relationsattributes: layerRelationsAttributes,
      formStructure,
      error: '',
      rawdata: null, // rawdata response
      loading: false
    };
    if (featuresForLayer.rawdata){
      layerObj.rawdata = featuresForLayer.rawdata;
      layers.push(layerObj)
    } else if (featuresForLayer.features && featuresForLayer.features.length) {
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
      layerSpecialAttributesName.length && featuresForLayer.features.forEach( feature => this._setSpecialAttributesFeatureProperty(layerSpecialAttributesName, feature));
      layerObj.attributes = this._parseAttributes(layerAttributes, featuresForLayer.features[0], sourceType);
      layerObj.attributes.forEach(attribute => {
        if (formStructure) {
          const relationField = layer.getFields().find(field => field.name === attribute.name); // need to check all field also show false
          !relationField && formStructure.fields.push(attribute);
        }
        if (attribute.type === 'image') layerObj.hasImageField = true;
      });
      featuresForLayer.features.forEach(feature => {
        const {id:fid, geometry, properties:attributes, selection} = this.getFeaturePropertiesAndGeometry(feature);
        if (geometry) layerObj.hasgeometry = true;
        const featureObj = {
          id: layerObj.external ? feature.getId() : fid,
          attributes,
          geometry,
          selection,
          show: true
        };
        layerObj.features.push(featureObj);
        id += 1;
      });
      layers.push(layerObj);
    }
    else if (featuresForLayer.error) layerObj.error = featuresForLayer.error;
  };
  featuresForLayers.forEach(featuresForLayer => {
    if (!Array.isArray(featuresForLayer)) _handleFeatureFoLayer(featuresForLayer);
    else featuresForLayer.forEach(featuresForLayer => _handleFeatureFoLayer(featuresForLayer));
  });
  return layers;
};

/**
 * Method to set special attributes
 * @param layerSpecialAttributesName
 * @param feature
 * @private
 */
proto._setSpecialAttributesFeatureProperty = function(layerSpecialAttributesName, feature) {
  // get feature properties get from server request
  const featureAttributes = feature.getProperties();
  // get attributes special keys
  const featureAttributesNames = Object.keys(featureAttributes);
  if (layerSpecialAttributesName.length) {
    layerSpecialAttributesName.forEach(attributeObj =>{
      featureAttributesNames.find(featureAttribute => {
        if (featureAttribute === attributeObj.alias) {
          feature.set(attributeObj.name, feature.get(featureAttribute));
          return true
        }
      })
    });
  }
};

/**
 * Method to get properties geometry and id from different type of fetaure
 * @param feature
 * @returns {{geometry: (undefined|*|null|ol.Feature), id: *, properties: string[]}|{geometry: *, id: *, properties: *}}
 */
proto.getFeaturePropertiesAndGeometry = function(feature){
  if (feature instanceof ol.Feature){
    return {
      selection: feature.selection,
      properties:feature.getProperties(),
      geometry: feature.getGeometry(),
      id: feature.getId()
    }
  } else {
    const {selection, properties, geometry, id} = feature;
    return {
      selection,
      properties,
      geometry,
      id
    }
  }
};

/**
 * parse attributre to show on result based on field
 * @param layerAttributes
 * @param feature
 * @param sourceType
 * @returns {{name: T, show: boolean, label: T}[]|*}
 * @private
 */
proto._parseAttributes = function(layerAttributes, feature, sourceType) {
  const {properties:featureAttributes} = this.getFeaturePropertiesAndGeometry(feature);
  let featureAttributesNames = Object.keys(featureAttributes);
  featureAttributesNames = getAlphanumericPropertiesFromFeature(featureAttributesNames);
  if (layerAttributes && layerAttributes.length) {
    const attributes = layerAttributes.filter(attribute => featureAttributesNames.indexOf(attribute.name) > -1);
    return attributes;
  } else {
    const {GDAL, WMS, WCS, WMST} = Layer.SourceTypes;
    const showSourcesTypes = [GDAL, WMS, WCS, WMST];
    return featureAttributesNames.map(featureAttributesName => {
      return {
        name: featureAttributesName,
        label: featureAttributesName,
        show: featureAttributesName !== G3W_FID && (sourceType === undefined || showSourcesTypes.indexOf(sourceType) !== -1),
        type: 'varchar'
      }
    })
  }
};

proto.trigger = async function(actionId, layer, feature, index, container) {
  const actionMethod = this._actions[actionId];
  actionMethod && actionMethod(layer, feature, index);
  if (layer) {
    const layerActions = this.state.layersactions[layer.id];
    if (layerActions) {
      const action = layerActions.find(layerAction => layerAction.id === actionId);
      action && await this.triggerLayerAction(action,layer,feature, index, container);
    }
  }
};

proto.triggerLayerAction = async function(action,layer,feature, index, container) {
  action.cbk && await action.cbk(layer,feature, action, index, container);
  if (action.route) {
    let url;
    let urlTemplate = action.route;
    url = urlTemplate.replace(/{(\w*)}/g,function(m,key){
      return feature.attributes.hasOwnProperty(key) ? feature.attributes[key] : "";
    });
    url && url !== '' && GUI.goto(url);
  }
};

proto.registerVectorLayer = function(vectorLayer) {
  this._vectorLayers.indexOf(vectorLayer) === -1 && this._vectorLayers.push(vectorLayer);
};

proto.unregisterVectorLayer = function(vectorLayer) {
  this._vectorLayers = this._vectorLayers.filter(layer => {
    this.state.layers = this.state.layers && this.state.layers.filter(layer => layer.id !== vectorLayer.get('id'));
    return layer !== vectorLayer;
  });
};

proto.getVectorLayerFeaturesFromQueryRequest = function(vectorLayer, query={}) {
  let isVisible = false;
  let {coordinates, bbox, geometry, filterConfig={}} = query; // extract information about query type
  let features = [];
  switch (vectorLayer.constructor) {
    case VectorLayer:
      isVisible = vectorLayer.isVisible();
      break;
    case ol.layer.Vector:
      isVisible = vectorLayer.getVisible();
      break;
  }
  if (!isVisible) return true;
  // case query coordinates
  if (coordinates && Array.isArray(coordinates)) {
    const pixel = this.mapService.viewer.map.getPixelFromCoordinate(coordinates);
    this.mapService.viewer.map.forEachFeatureAtPixel(pixel, (feature, layer) => {
      features.push(feature);
    },  {
      layerFilter(layer) {
        return layer === vectorLayer;
      }
    });
  } else {
    //case bbox
    if (bbox && Array.isArray(bbox)) {
      //set geometry has Polygon
      geometry = ol.geom.Polygon.fromExtent(bbox);
    }
    // check geometry is a Polygon or MultiPolygon
    if (geometry instanceof ol.geom.Polygon || geometry instanceof ol.geom.MultiPolygon) {
      switch (vectorLayer.constructor) {
        case VectorLayer:
          features = vectorLayer.getIntersectedFeatures(geometry);
          break;
        case ol.layer.Vector:
          vectorLayer.getSource().getFeatures().forEach(feature => {
            let add;
            switch (filterConfig.spatialMethod) {
              case 'intersects':
                add = intersects(geometry, feature.getGeometry());
                break;
              case 'within':
                add = within(geometry, feature.getGeometry());
                break;
              default:
                add = geometry.intersectsExtent(feature.getGeometry().getExtent());
                break;
            }
            if (true === add) {
              features.push(feature);
            }
          });
          break;
      }
    }
  }
  return {
    features,
    layer: vectorLayer
  };
};

proto._addVectorLayersDataToQueryResponse = function() {
  this.onbefore('setQueryResponse', (queryResponse, options = {}) => {
    const catalogService = GUI.getService('catalog');

    // skip when add response to current results using addLayerFeaturesToResultsAction
    if (options.add) {
      return;
    }

    // sanity checks
    if (!queryResponse.data)  queryResponse.data  = [];
    if (!queryResponse.query) queryResponse.query = {};

    let vectorLayers = [];

    switch(queryResponse.query.type) {

      case 'coordinates':
      case 'bbox':
        // need to be visible
        vectorLayers = this._vectorLayers.filter(layer => layer.getVisible() && catalogService.isExternalLayerSelected({ id: layer.get('id'), type: 'vector' }));
        if (!vectorLayers.length) {
          vectorLayers = this._vectorLayers.filter(layer => layer.getVisible());
        }
        break;

      case 'polygon':
        vectorLayers = this._vectorLayers.filter(layer => layer.getVisible() && !catalogService.isExternalLayerSelected({ id: layer.get('id'), type: 'vector' }));
        break;

      default:
        break;

    }

    // add vector layers to query response
    vectorLayers.forEach(layer => { queryResponse.data.push(this.getVectorLayerFeaturesFromQueryRequest(layer, queryResponse.query)); });

  });
};

//function to add custom component in query result
proto._addComponent = function(component) {
  this.state.components.push(component)
};

proto._printSingleAtlas = function({atlas={}, features=[]}={}){
  let {name:template, atlas: {field_name=''}} = atlas;
  field_name = field_name || '$id';
  const values = features.map(feature => feature.attributes[field_name === '$id' ?  G3W_FID: field_name]);
  const download_caller_id = ApplicationService.setDownload(true);
  return this.printService.printAtlas({
    field: field_name,
    values,
    template,
    download: true
  }).then(({url}) =>{
      downloadFile({
        url,
        filename: template,
        mime_type: 'application/pdf'
      }).catch(error=>{
        GUI.showUserMessage({
          type: 'alert',
          error
        })
      }).finally(()=>{
        ApplicationService.setDownload(false, download_caller_id);
        GUI.setLoadingContent(false);
      })
  })
};

proto.showChart = function(ids, container, relationData){
  this.emit('show-chart', ids, container, relationData);
};

proto.hideChart = function(container){
  this.emit('hide-chart', container);
};

proto.showRelationsChart = function(ids=[], layer, feature, action, index, container){
  action.state.toggled[index] = !action.state.toggled[index];
  if (action.state.toggled[index]){
    const relations = this._relations[layer.id];
    const relationData = {
      relations,
      fid: feature.attributes[G3W_FID],
      height: 400
    };
    this.emit('show-chart', ids, container, relationData)
  } else this.hideChart(container)
};

proto.printAtlas = function(layer, feature){
  let {id:layerId, features} = layer;
  const inputAtlasAttr = 'g3w_atlas_index';
  features = feature ? [feature]: features;
  const atlasLayer = this.getAtlasByLayerId(layerId);
  if (atlasLayer.length > 1) {
    let inputs='';
    atlasLayer.forEach((atlas, index) => {
      const id = getUniqueDomId();
      inputs += `<input id="${id}" ${inputAtlasAttr}="${index}" class="magic-radio" type="radio" name="template" value="${atlas.name}"/>
                 <label for="${id}">${atlas.name}</label>
                 <br>`;
    });

    GUI.showModalDialog({
      title: t('sdk.atlas.template_dialog.title'),
      message: inputs,
      buttons: {
        success: {
          label: "OK",
          className: "skin-button",
          callback: ()=> {
            const index = $('input[name="template"]:checked').attr(inputAtlasAttr);
            if (index !== null || index !== undefined) {
              const atlas = atlasLayer[index];
              this._printSingleAtlas({
                atlas,
                features
              })
            }
          }
        }
      }
    })
  } else this._printSingleAtlas({
      atlas: atlasLayer[0],
      features
    })
};

/**
 * Method that in case
 * @param layer
 */
proto.showLayerDownloadFormats = function(layer) {
  const layerKey = DownloadFormats.name;
  layer[layerKey].active = !layer[layerKey].active;
  this.setLayerActionTool({
    layer,
    component: layer[layerKey].active ? DownloadFormats : null,
    config: layer[layerKey].active ? this.state.actiontools[layerKey][layer.id] : null
  })
};

/**
 *
 * @param type
 * @param layerId
 * @param features
 */
proto.downloadFeatures = async function(type, layer, features=[], action, index){
  const layerId = layer.id;
  const {query={}} = this.state;
  features = features ? Array.isArray(features) ? features : [features]: features;
  const data = {
    fids : features.map(feature => feature.attributes[G3W_FID]).join(',')
  };
  /**
   * is a function that che be called in case of querybypolygon
   * @param active
   */
  const runDownload = async (active=false) => {
    if (features.length > 1) {
      layer[DownloadFormats.name].active = active;
      this.setLayerActionTool({
        layer
      })
    }
    const projectLayer = CatalogLayersStoresRegistry.getLayerById(layer.id);
    const download_caller_id = ApplicationService.setDownload(true);
    GUI.setLoadingContent(true);
    try {
      await projectLayer.getDownloadFilefromDownloadDataType(type, {
        data
      }) || Promise.resolve();
    } catch(err){
      GUI.notify.error(err || t("info.server_error"));
    }
    ApplicationService.setDownload(false, download_caller_id);
    GUI.setLoadingContent(false);
    const downloadsactions = this.state.layersactions[layer.id].find(action => action.id === 'downloads');
    if (features.length > 1) {
      if (downloadsactions === undefined) {
        layer[type].active = false;
        this.setLayerActionTool({
          layer
        })
      }
      else layer[DownloadFormats.name].active = false;
    }
    else {
      if (downloadsactions === undefined) action.state.toggled[index] = false;
      else downloadsactions.state.toggled[index] = false;
      this.setCurrentActionLayerFeatureTool({
        index,
        action,
        layer
      });
    }
  };
  if (query.type === 'polygon'){
    //check if multidownload if present
    const downloadsactions = this.state.layersactions[layer.id].find(action => action.id === 'downloads');
    let {fid, layer:polygonLayer} = query;
    const config = {
      choices: [
        {
          id: getUniqueDomId(),
          type: 'feature',
          label: 'sdk.mapcontrols.querybypolygon.download.choiches.feature.label',
        },
        {
          id: getUniqueDomId(),
          type: 'polygon',
          label: 'sdk.mapcontrols.querybypolygon.download.choiches.feature_polygon.label',
        },
      ],
      download: type =>{
        // choose between only feature attribute or also polygon attibute
        if (type === 'polygon'){
          // id type polygon add paramateres to api download
          data.sbp_qgs_layer_id = polygonLayer.getId();
          data.sbp_fid = fid;
        } else {
          // force to remove
          delete data.sbp_fid;
          delete data.sbp_qgs_layer_id;
        }
        runDownload(true)
      }
    };
    if (features.length === 1) {
      if (downloadsactions === undefined) {
        action.state.toggled[index] = true;
      }
      this.state.actiontools[QueryPolygonCsvAttributesComponent.name] = this.state.actiontools[layerId] || {};
      this.state.actiontools[QueryPolygonCsvAttributesComponent.name][layerId] = config;
      this.setCurrentActionLayerFeatureTool({
        layer,
        index,
        action,
        component: QueryPolygonCsvAttributesComponent
      });
    } else {
      if (downloadsactions === undefined) {
        layer[type].active = !layer[type].active;
        if (layer[type].active) {
          this.setLayerActionTool({
            layer,
            component: QueryPolygonCsvAttributesComponent,
            config
          });
        } else this.setLayerActionTool({
          layer
        })
      } else {
        this.setLayerActionTool({
          layer,
          component: QueryPolygonCsvAttributesComponent,
          config
        });
      }
    }
  } else runDownload();
};

proto.downloadGpx = function({id:layerId}={}, feature){
  const fid = feature ? feature.attributes[G3W_FID] : null;
  const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
  layer.getGpx({fid}).catch((err) => {
    GUI.notify.error(t("info.server_error"));
  }).finally(() => {
    this.layerMenu.loading.shp = false;
    this._hideMenu();
  })
};

proto.downloadXls = function({id:layerId}={}, feature){
  const fid = feature ? feature.attributes[G3W_FID] : null;
  const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
  layer.getXls({fid}).catch(err => {
    GUI.notify.error(t("info.server_error"));
  }).finally(() => {
    this.layerMenu.loading.shp = false;
    this._hideMenu();
  })
};

proto.listenClearSelection = function(layer, actionId){
  if (!layer.external) {
    const _layer = CatalogLayersStoresRegistry.getLayerById(layer.id);
    const handler = ()=>{
      const action = this.state.layersactions[layer.id].find(action => action.id === actionId);
      layer.features.forEach((feature, index) => action.state.toggled[index] = false);
    };
    _layer.on('unselectionall', handler);
    this.unlistenerlayeractionevents.push({
      layer:_layer,
      event:'unselectionall',
      handler
    })
  } else {
    layer.features.forEach(feature => {
      const selectionFeature = layer.selection.features.find(selectionFeature => feature.id === selectionFeature.getId());
      feature.selection = selectionFeature ? selectionFeature.selection : {
        selected: false
      }
    });
  }
};

proto.clearSelectionExtenalLayer = function(layer) {
  layer.selection.active = false;
  const action = this.state.layersactions[layer.id] && this.state.layersactions[layer.id].find(action => action.id === 'selection');
  layer.selection.features.forEach((feature, index) => {
    if (feature.selection.selected) {
      feature.selection.selected = false;
      if (action) action.state.toggled[index] = false;
      this.mapService.setSelectionFeatures('remove', {
        feature
      });
    }
  });
};

proto.unlistenerEventsActions = function(){
  this.unlistenerlayeractionevents.forEach(obj => obj.layer.off(obj.event, obj.handler));
  this.unlistenerlayeractionevents = [];
};

proto.addRemoveFilter = function(layer){
  const _layer = CatalogLayersStoresRegistry.getLayerById(layer.id);
  _layer.toggleFilterToken();
};

/**
 *
 * @param layer
 */
proto.selectionFeaturesLayer = function(layer) {
  const layerId = layer.id;
  const action = this.state.layersactions[layerId].find(action => action.id === 'selection');
  const bool = Object.values(action.state.toggled).reduce((acculmulator, value) => acculmulator && value, true);
  const _layer = !layer.external ? CatalogLayersStoresRegistry.getLayerById(layerId) : layer;
  layer.features.forEach((feature, index) => {
    action.state.toggled[index] = !bool;
    this._addRemoveSelectionFeature(_layer, feature, index, bool ? 'remove' : 'add');
  })
};

/**
 *
 * @param layer
 * @param feature
 * @param index
 * @param force
 * @returns {Promise<void>}
 * @private
 */
proto._addRemoveSelectionFeature = async function(layer, feature, index, force){
  /**
   * In case of external layer (vector) added by add external layer tool
   */
  if (typeof layer.external !== "undefined" && layer.external){
    if (typeof layer.selection.features === "undefined") layer.selection.features = {};
    if (!layer.selection.features.find(selectionFeature => selectionFeature.getId() === feature.id)) {
      /***
       * Feature used in selection tool action
       */
      const selectionFeature = createFeatureFromFeatureObject({
        feature,
        id: feature.id
      });
      selectionFeature.__layerId = layer.id;
      selectionFeature.selection = feature.selection;
      layer.selection.features.push(selectionFeature);
    }
    if ((force === 'add' && feature.selection.selected) || (force === 'remove') && !feature.selection.selected) return;
    else feature.selection.selected = !feature.selection.selected;
    this.mapService.setSelectionFeatures(feature.selection.selected ? 'add' : 'remove', {
      feature: layer.selection.features.find(selectionFeature => feature.id === selectionFeature.getId())
    });
    /*
    * Set selection layer active based on features selection selected properties
     */
    layer.selection.active = layer.selection.features.reduce((accumulator, feature) => accumulator || feature.selection.selected, false)
  } else { // case of project layer on TOC
    const fid = feature ? feature.attributes[G3W_FID]: null;
    const hasAlreadySelectioned = layer.getFilterActive() || layer.hasSelectionFid(fid);
    if (!hasAlreadySelectioned) {
      if (feature && feature.geometry && !layer.getOlSelectionFeature(fid)) {
        layer.addOlSelectionFeature({
          id: fid,
          feature
        })
      }
    }
    if (force === undefined) layer[hasAlreadySelectioned ? 'excludeSelectionFid': 'includeSelectionFid'](fid);
    else if (!hasAlreadySelectioned && force === 'add') await layer.includeSelectionFid(fid);
    else if (hasAlreadySelectioned && force === 'remove') await layer.excludeSelectionFid(fid);
    if (layer.getFilterActive()) {
      const currentLayer = this.state.layers.find(_layer => _layer.id === layer.getId());
      layer.getSelectionFids().size > 0 && currentLayer && currentLayer.features.splice(index, 1);
      this.mapService.clearHighlightGeometry();
      this.state.layers.length === 1 && !this.state.layers[0].features.length && this.state.layers.splice(0);
    }
  }
};

/**
 * Initial check of selection active on layer
 * @param layer
 * @param feature
 * @param index
 * @param action
 */
proto.checkFeatureSelection = function({layer, feature, index, action}={}){
  if (!layer.external) {
    const projectLayer = CatalogLayersStoresRegistry.getLayerById(layer.id);
    if (feature) {
      const fid = feature ? feature.attributes[G3W_FID]: null;
      action.state.toggled[index] = projectLayer.getFilterActive() || projectLayer.hasSelectionFid(fid);
    }
  } else {
    action.state.toggled[index] = feature.selection.selected;
  }
};

/**
 *
 * @param layer
 * @param feature
 * @param action
 * @param index
 */
proto.addToSelection = function(layer, feature, action, index){
  const {external=false} = layer;
  action.state.toggled[index] = !action.state.toggled[index];
  const _layer = !external ? CatalogLayersStoresRegistry.getLayerById(layer.id) : layer;
  this._addRemoveSelectionFeature(_layer, feature, index);
};

proto.removeQueryResultLayerFromMap = function(){
  this.resultsQueryLayer.getSource().clear();
  this.mapService.getMap().removeLayer(this.resultsQueryLayer)
};

// show layerQuery result on map
proto.addQueryResultsLayerToMap = function({feature, timeout=1500}){
  this.removeQueryResultLayerFromMap();
  this.resultsQueryLayer.getSource().addFeature(feature);
  this.mapService.getMap().addLayer(this.resultsQueryLayer);
  try {
    const center = ol.extent.getCenter(feature.getGeometry().getExtent());
    this.mapService.getMap().getView().setCenter(center);
  } catch(err){

  }
  timeout && setTimeout(()=>{
    this.removeQueryResultLayerFromMap();
  }, timeout)
};

/**
 *
  Show featureFormCoordinates
 */
proto.showCoordinates = function(coordinates){
  const feature = createFeatureFromCoordinates(coordinates);
  this.addQueryResultsLayerToMap({feature});
};

/**
 * Show BBox
 * @param bbox
 */
proto.showBBOX = function(bbox){
  const feature = createFeatureFromBBOX(bbox);
  this.addQueryResultsLayerToMap({feature});
};

/**
 * Show Geometry
 * @param geometry
 */
proto.showGeometry = function(geometry){
  const feature = createFeatureFromGeometry({
    geometry
  });
  this.addQueryResultsLayerToMap({feature});
};

/**
 *
 * @param layer
 * @param feature
 */
proto.goToGeometry = function(layer, feature) {
  if (feature.geometry) {
    const handlerOptions = {
      mapServiceMethod: this.isOneLayerResult() ? 'zoomToFeatures' : 'highlightGeometry',
      firstParam: this.isOneLayerResult() ? [feature] : feature.geometry,
      options: this.isOneLayerResult() ? {} : {
        layerId: layer.id,
        duration: 1500
      }
    };
    if (this._asyncFnc.goToGeometry.async) this._asyncFnc.todo = this.mapService[handlerOptions.mapServiceMethod].bind(this.mapService, handlerOptions.firstParam, handlerOptions.options);
    else setTimeout(() => this.mapService[handlerOptions.mapServiceMethod](handlerOptions.firstParam, handlerOptions.options))
  }
};

//save layer result
proto.saveLayerResult = function({layer, type='csv'}={}) {
  this.downloadFeatures(type, layer, layer.features);
};

proto.highlightGeometry = function(layer, feature) {
  feature.geometry &&  this.mapService.highlightGeometry(feature.geometry, {
      layerId: layer.id,
      zoom: false,
      duration: Infinity
    });
};

proto.clearHighlightGeometry = function(layer) {
  this.mapService.clearHighlightGeometry();
  this.isOneLayerResult() && this.highlightFeaturesPermanently(layer);
};

/**
 * method to handle show Relation on result
 * @param relationId,
 * layerId : current layer fathre id
 * feature: current feature father id
 */
proto.showRelation = function({relation, layerId, feature}={}){
  const {name: relationId, nmRelationId} = relation;
  const chartRelationIds = [];
  const projectRelation = this._project.getRelationById(relationId);
  const nmRelation = this._project.getRelationById(nmRelationId);
  this.findPlotId(projectRelation.referencingLayer) && chartRelationIds.push(projectRelation.referencingLayer);

  GUI.pushContent({
    content: new RelationsPage({
      currentview: 'relation',
      relations: [projectRelation],
      chartRelationIds,
      nmRelation,
      feature,
      layer: {
        id: layerId
      }
    }),
    crumb: {
      title: projectRelation.name
    },
    title: projectRelation.name,
    closable: false
  })
};

proto.showQueryRelations = function(layer, feature, action) {

  GUI.changeCurrentContentOptions({
    crumb: {
      title: layer.title
    }
  });

  GUI.pushContent({
    content: new RelationsPage({
      relations: action.relations,
      chartRelationIds: action.chartRelationIds,
      feature,
      layer
    }),
    backonclose: true,
    title: LIST_OF_RELATIONS_TITLE,
    id: LIST_OF_RELATIONS_ID,
    crumb: {
      title: LIST_OF_RELATIONS_TITLE,
      trigger: null
    },
    closable: false
  });
};

module.exports = QueryResultsService;


