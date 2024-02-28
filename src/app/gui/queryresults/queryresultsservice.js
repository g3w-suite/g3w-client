import GUI                                      from 'services/gui';
import {
  G3W_FID,
  LIST_OF_RELATIONS_TITLE,
  LIST_OF_RELATIONS_ID,
}                                               from 'app/constant';
import ProjectsRegistry                         from 'store/projects';
import DataRouterService                        from 'services/data';
import CatalogLayersStoresRegistry              from 'store/catalog-layers';
import DownloadFormats                          from 'components/QueryResultsActionDownloadFormats.vue';
import QueryPolygonCsvAttributesComponent       from 'components/QueryResultsActionQueryPolygonCSVAttributes.vue';
import ApplicationService                       from 'services/application';
import { addToSelection }                       from 'core/layers/utils/addToSelection';
import { removeFromSelection }                  from 'core/layers/utils/removeFromSelection';
import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';
import { createFeatureFromGeometry }            from 'utils/createFeatureFromGeometry';
import { createFeatureFromBBOX }                from 'utils/createFeatureFromBBOX';
import { createFeatureFromCoordinates }         from 'utils/createFeatureFromCoordinates';
import { intersects }                           from 'utils/intersects';
import { within }                               from 'utils/within';
import { PRINT_UTILS }                          from 'components/g3w-print';

const {
  noop,
  downloadFile,
  throttle,
  getUniqueDomId,
  copyUrl,
}                                = require('utils');
const { t }                      = require('core/i18n/i18n.service');
const Layer                      = require('core/layers/layer');
const G3WObject                  = require('core/g3wobject');
const VectorLayer                = require('core/layers/vectorlayer');
const RelationsPage              = require('gui/relations/vue/relationspage');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

const deprecate                  = require('util-deprecate');

/**
 * Get and set vue reactivity to QueryResultsService
 *
 * @type {Vue}
 */
const VM = new Vue();

class QueryResultsService extends G3WObject {

  constructor() {

    super();

    /**
     * BACKCOMP
     */
    this._changeLayerResult = this.setters.changeLayerResult;
    this._addComponent      = this.setters.addComponent;

    /** @deprecated since 3.9.1 will be removed in 4.x */
    this.printService = PRINT_UTILS;

    /**
     * @FIXME add description
     */
    this._currentLayerIds = [];

    /**
     * @FIXME add description
     */
    this.unlistenerlayeractionevents = [];

    /**
     * @FIXME add description
     */
    this._actions = {
      'highlightgeometry':      this.highlightGeometry.bind(this),
      'clearHighlightGeometry': this.clearHighlightGeometry.bind(this),
    };

    /**
     * <Array> to store relations
     */
    this._relations = [];

    /**
     * @FIXME add description
     */
    this._atlas = [];

    /**
     * @FIXME add description
     */
    this.plotLayerIds = [];

    /**
     * Set reactive state
     */
    this.state = {

      /**
       * @FIXME add description
       */
      zoomToResult: true,

      /**
       * @FIXME add description
       */
      components: [],

      /**
       * @FIXME add description
       */
      layers: [],

      /**
       * @FIXME add description
       */
      changed: false,

      /**
       * @FIXME add description
       */
      query: null,

      /**
       * 'ows' = default
       * 'api' = search
       */
      type: 'ows',

      /**
       * An action is an object that contains:
       *
       * ```
       * {
       *   "id":       (required) Unique action Id
       *   "download": whether action is download or not
       *   "class":    (required) fontawsome classname to show icon
       *   "state":    need to be reactive. Used for example to toggled state of action icon
       *   "hint":     Tooltip text
       *   "init":     Method called when action is loaded
       *   "clear":    Method called before clear the service. Used for example to clear unwatch
       *   "change":   Method called when feature of layer is changed
       *   "cbk":      (required) Method called when action is cliccked
       * }
       * ```
       **/
      layersactions: {},

      /**
       * Add action tools (for features)
       */
      actiontools:{},

      /**
       * Current action tools contain component
       * of a specific action (eg. download)
       */
      currentactiontools:{},

      /**
       * Contains current action that expose vue component
       * (useful for comparing the id other action is
       * triggered and exposing the component)
       */
      currentactionfeaturelayer:{},

      /**
       * @FIXME add description
       */
      layeractiontool: {},

      /**
       * @FIXME add description
       */
      layersFeaturesBoxes:{},

      /**
       * Used to show a custom component for a layer
       */
      layerscustomcomponents:{} //

    };

    /**
     * <Array> where are store vector layer add on runtime
     */
    this._vectorLayers = [];

    /**
     * @FIXME add description
     */
    this._addFeaturesLayerResultInteraction = {

      /**
       * Reference to current layer
       */
      id: null,

      /**
       * Interaction bind to layer,
       */
      interaction: null,

      /**
       * Add current toggled map control if toggled
       */
      mapcontrol: null,

      /**
       * Method that handles interaction when a mapcontrol is toggled
       */
      toggleeventhandler: null

    };

    /**
     * @FIXME add description
     */
    this._asyncFnc = {
      todo:                      noop,
      zoomToLayerFeaturesExtent: { async: false },
      goToGeometry:              { async: false },
    };

    /**
     * Vector layer used by query result to show query
     * request as coordinates, bbox, polygon, etc ..
     *
     * @type {ol.layer.Vector}
     */
    this.resultsQueryLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style(feature) {
        const fill   = new ol.style.Fill({ color: 'rgba(0, 0, 255, 0.7)' });
        const stroke = new ol.style.Stroke({ color: 'blue', width: 3 });
        if ('Point' === feature.getGeometry().getType()) {
          return new ol.style.Style({
            text: new ol.style.Text({ fill, stroke, text: '\uf3c5', font: '900 3em "Font Awesome 5 Free"', offsetY : -15 })
          });
        }
        return new ol.style.Style({ stroke });
      }
    });

    /**
     * @deprecated since 3.8
     * It used to register change project from Change map button
     */
    ProjectsRegistry.onafter('setCurrentProject', project => {
        this._project = project;
        this._setRelations(project);
        this._setAtlasActions(project);
        this.state.download_data = false;
        this.plotLayerIds = [];
      });

    /**
     * Current project <Project>
     */
    this._project = ProjectsRegistry.getCurrentProject();

    /**
     * Keep the right order for query result based on TOC order layers
     */
    this._projectLayerIds = this._project.getConfigLayers().map(layer => layer.id);

    /**
     * @FIXME add description
     */
    this._setRelations(this._project);

    /**
     * @FIXME add description
     */
    this._setAtlasActions(this._project);

    /**
     * @FIXME add description
     */
    GUI.onbefore('setContent', (options) => {
      this.mapService = this.mapService || ApplicationService.getApplicationService('map');
      if (100 === options.perc && GUI.isMobile()) {
        this._asyncFnc.zoomToLayerFeaturesExtent.async = true;
        this._asyncFnc.goToGeometry.async = true;
      }
    });

  }


  /**
   * @FIXME add description
   */
  addLayersPlotIds(layerIds = []) {
    this.plotLayerIds = layerIds;
  }

  /**
   * @FIXME add description
   */
  getPlotIds() {
    return this.plotLayerIds;
  }

  /**
   * @FIXME add description
   */
  findPlotId(id) {
    return this.plotLayerIds.find(plotId => plotId == id);
  }

  /**
   * Register for plugin or other component of application to add
   * custom component on result for each layer feature or layer
   *
   * @param opts.id        unique id identification
   * @param opts.layerId   Layer id of layer
   * @param opts.component custom component
   * @param opts.type      feature or layer
   * @param opts.position
   */
  registerCustomComponent({
    id       = getUniqueDomId(),
    layerId,
    component,
    type     = 'feature',
    position = 'after',
  } = {}) {
    if (undefined === this.state.layerscustomcomponents[layerId]) {
      this.state.layerscustomcomponents[layerId] = {
        layer:   { before: [], after: [] },
        feature: { before: [], after: [] }
      };
    }
    this.state.layerscustomcomponents[layerId][type][position].push({ id, component });
    return id;
  }

  /**
   * Check position
   *
   * @param opts.id
   * @param opts.layerId
   * @param opts.type
   * @param opts.position
   */
  unRegisterCustomComponent({
    id,
    layerId,
    type,
    position
  }) {
    const component = this.state.layerscustomcomponents[layerId][type];
    const by_id     = ({ id: componentId }) => componentId !== id;

    if (position) {
      component[position] = component[position].filter(by_id);
      return;
    }

    Object
      .keys(component[position])
      .forEach(position => { component[position] = component[position].filter(by_id); });
  }

  /**
   * Add a feature to current layer result
   *
   * @param layer
   * @param feature
   */
  addFeatureLayerToResult(layer, feature) {
    this.state.layersFeaturesBoxes[this.getBoxId(layer, feature)].collapsed = true;
  }

  /**
   * Loop over response features based on layer response and
   * check if features layer need to be added or removed to
   * current `state.layers` results.
   *
   * @param responseLayer layer structure coming from request
   *
   * @since 3.8.0
   */
  updateLayerResultFeatures(responseLayer) {
    const layer        = this._getLayer(responseLayer.id),                  // get layer from current `state.layers` showed on result
      responseFeatures = this._getLayerFeatures(responseLayer),             // extract features from responseLayer object
      external         = this._getExternalLayer(responseLayer.id),          // get id of external layer or not (`external` is a layer added by mapcontrol addexternlayer)
      has_features     = layer && this._getLayerFeatures(layer).length > 0; // check if current layer has features on response

    if (has_features) {
      const features_ids   = this._getFeaturesIds(layer.features, external);    // get features id from current layer on result
      responseFeatures
        .forEach(feature => {
          const feature_id = this._getFeatureId(feature, external);
          if (features_ids.some(id => id === feature_id)) {                     // remove feature (because is already loaded)
            this._removeLayerFeatureBox(layer, feature);
            layer.features = this._getLayerFeatures(layer).filter(f => this._getFeatureId(f, external) !== feature_id);
          } else {                                                              // add feature
            layer.features.push(feature);
          }
        });
      this
        ._getLayerFeatures(layer)
        .forEach(feature => this._toggleLayerFeatureBox(layer, feature, this._getLayerFeatures(layer).length > 1));
    }

    // in case no more features on layer remove interaction pickcoordinate to get result from map
    this.checkIfLayerHasNoFeatures(layer);

    // highlight new feature
    if (1 === this.state.layers.length) {
      this.highlightFeaturesPermanently(this.state.layers[0]);
    }

    this.changeLayerResult(layer);
  }

  /**
   * Check and do action if layer has no features after delete feature(s)
   *
   * @param layer
   */
  checkIfLayerHasNoFeatures(layer) {
    if (layer && 0 === this._getLayerFeatures(layer).length) {
      // due to vue reactivity, wait a little bit before update layers
      setTimeout(() => {
        this.state.layers = this.state.layers.filter(l => l.id !== layer.id);
        this.clearHighlightGeometry(layer);
        this.removeAddFeaturesLayerResultInteraction({ toggle: true });
      })
    }
  }

  /**
   * Generate a boxid identifier to query result html
   *
   * @param layer
   * @param feature
   * @param relation_index
   *
   * @returns {string}
   */
  getBoxId(layer, feature, relation_index) {
    return (null !== relation_index && undefined !== relation_index)
      ? `${layer.id}_${feature.id}_${relation_index}`
      : `${layer.id}_${feature.id}`;
  }

  /**
   * @FIXME add description
   *
   * @param layers
   * @param options
   */
  setActionsForLayers(layers, options = { add: false }) {
    if (options.add) {
      return;
    }

    // reset array
    this.unlistenerlayeractionevents = [];

    // loop results
    layers.forEach(layer => {


      const action_tools = {};
      const action_layer = {};

      this._getLayerFeatures(layer).forEach((_, idx) => {
        action_tools[idx] = null;
        action_layer[idx] = null;
      });

      // set eventually layer action tool and need to be reactive
      this.state.layeractiontool[layer.id]           = Vue.observable({ component: null, config: null });
      this.state.currentactiontools[layer.id]        = Vue.observable(action_tools);
      this.state.currentactionfeaturelayer[layer.id] = Vue.observable(action_layer);

      const is_external_layer_or_wms = (layer.external) || (layer.source ? 'wms' === layer.source.type : false);

      if (!this.state.layersactions[layer.id]) {
        this.state.layersactions[layer.id] = [];
      }

      /**
       * @TODO find out a wy to handle this within MapControlGeocoding.vue 
       * 
       * @since 3.9.0 In case of marker layers
       */
      const is_geocoding = '__g3w_marker' === layer.id;

      // Lookup for layer geometry.
      if (layer.hasgeometry) {
        this._setActionGoToGeometry(layer);
      }

      // Lookup for layer relations.
      if (this._relations && this._relations[layer.id]) {
        this._setActionShowQueryAndPlotsRelations(layer);
      }

      // Lookup for layer print atlas.
      if (this.getAtlasByLayerId(layer.id).length) {
        this._setActionPrintAtlas(layer);
      }

      // Lookup for layer downloadable features (single).
      if (layer.downloads.length === 1) {
        this._setActionDownloadFeature(layer);
      }

      // Lookup for layer downloadable features (multi).
      if (layer.downloads.length > 1) {
        this._setActionMultiDownloadFeature(layer);
      }

      // Lookup for not external layer or WMS.
      if (false === is_external_layer_or_wms || is_geocoding) {
        this._setActionRemoveFeatureFromResult(layer);
      }

      // Lookup for layer selection status (active).
      if (undefined !== layer.selection.active) {
        this._setActionSelection(layer);
      }

      // Lookup for not external layer or WMS (copy link to feature).
      if (false === is_external_layer_or_wms && layer.hasgeometry) {
        this._setActionLinkZoomToFid(layer);
      }

      // Lookup for editable layer.
      if (layer.editable && false === layer.inediting) {
        this._setActionEditing(layer);
      }

    });

    this.addActionsForLayers(this.state.layersactions, this.state.layers);

  }

  /**
   * @FIXME add description
   * 
   * @param opts.layer
   * @param opts.dynamicProperties
   */
  createActionState({
    layer,
    dynamicProperties = ['toggled'],
  }) {
    // number of download formats
    const properties = dynamicProperties.reduce((obj, prop) => { obj[prop] = {}; return obj; }, {});
    layer.features.map((_, idx) => { Object.keys(properties).forEach(prop => { properties[prop][idx] = null; }); });
    return Vue.observable(properties);
  }

  /**
   * Get action referred to layer getting the action id
   *
   * @param opts.layer layer linked to action
   * @param opts.id    action id
   * 
   * @returns undefined when no action is found
   */
  getActionLayerById({
    layer,
    id,
  } = {}) {
    if (this.state.layersactions[layer.id]) {
      return this.state.layersactions[layer.id].find(action => action.id === id);
    }
  }

  /**
   * Set current layer action tool in feature
   *
   * @param opts.layer current layer
   * @param opts.index feature index
   * @param opts.value component value or null
   * @param opts.component vue component
   */
  setCurrentActionLayerFeatureTool({
    layer,
    action,
    index,
    component = null
  } = {}) {
    const tools   = this.state.currentactiontools[layer.id];        // get current action tools
    const feats   = this.state.currentactionfeaturelayer[layer.id];
    feats[index]  = component ? action : null;
    tools[index]  = component;                                      // set component

    // need to check if pass component and
    if (
      tools[index] &&                   // if component is set
      action.id !== feats[index].id &&  // same action
      feats[index].toggleable           // check if toggleable
    ) {
      feats[index].state.toggled[index] = false;
    }

  }

  /**
   * @TODO rename misleading method name: `addActionToolsLayer`
   * 
   * @param opts.id     action layer id
   * @param opts.layer  layer
   * @param opts.config configuration object
   * @param opts.action (since 3.9.0) configuration object
   */
  addCurrentActionToolsLayer({
    id,
    layer,
    config = {},
    action
  }) {
    if (!layer) {
      return;
    }
    this.state.actiontools[id] = { [layer.id]: config };
    if (action) {
      this.state.layersactions[layer.id] = this.state.layersactions[layer.id] || [];
      this.state.layersactions[layer.id].push(action);
    }
  }

  /**
   * Reset current action tools on layer when feature layer change
   *
   * @param layer
   */
  resetCurrentActionToolsLayer(layer) {
    this
      ._getLayerFeatures(layer)
      .forEach((_, idx) => {
        const tool = this.state.currentactiontools[layer.id];
        if (undefined === tool) {
          return;
        }
        if (undefined === tool[idx]) {
          Vue.set(tool, idx, null);
        }
        tool[idx] = null;
      });
  }

  /**
   * @FIXME add description
   * @param opts.layer current layer
   * @param opts.component vue component
   * @param opts.config configuration Object
   */
  setLayerActionTool({
    layer,
    component = null,
    config    = null,
  } = {}) {
    this.state.layeractiontool[layer.id].component = component;
    this.state.layeractiontool[layer.id].config    = config;
  };

  /**
   * Copy `zoomtofid` url
   *
   * @param layer current layer
   * @param feature current feature
   * @param action action
   */
  copyZoomToFidUrl(layer, feature, action) {
    const url = new URL(location.href);
    url.searchParams.set('zoom_to_fid', `${layer.id}|${feature.attributes[G3W_FID]}`);
    copyUrl(url.toString());
    action.hint_changed = true;
  }

  /**
   * Clear all
   */
  clear() {
    this.runAsyncTodo();
    this.unlistenerEventsActions();
    this.mapService.clearHighlightGeometry();
    this.resultsQueryLayer.getSource().clear();
    this.removeAddFeaturesLayerResultInteraction({ toggle: true });
    this._asyncFnc = null;
    this._asyncFnc = {
      todo:                      noop,
      zoomToLayerFeaturesExtent: { async: false },
      goToGeometry:              { async: false },
    };
    this.clearState();
    this.closeComponent();
    this.removeQueryResultLayerFromMap();
  }

  /**
   * @FIXME add description
   */
  getCurrentLayersIds() {
    return this._currentLayerIds;
  }

  /**
   * @FIXME add description
   */
  runAsyncTodo() {
    this._asyncFnc.todo();
  }

  /**
   * @param bool whether to zoom to results
   */
  setZoomToResults(bool = true) {
    this.state.zoomToResult = bool;
  }

  /**
   * @FIXME add description
   */
  highlightFeaturesPermanently(layer) {
    this.mapService.highlightFeatures(layer.features, { duration: Infinity });
  }

  /**
   * Check if one layer result
   *
   * @returns {boolean}
   */
  isOneLayerResult() {
    return (1 === this.state.layers.length);
  }

  /**
   * @FIXME add description
   *
   * @param {boolean} opts.toggle If true toggle true the mapcontrol
   */
  removeAddFeaturesLayerResultInteraction({
    toggle = false
  } = {}) {
    const interaction = this._addFeaturesLayerResultInteraction;

    if (null !== interaction.toggleeventhandler) {
      this.mapService.off('mapcontrol:toggled', interaction.toggleeventhandler);
    }

    // remove current interaction to get features from layer
    if (null !== interaction.interaction) {
      this.mapService.removeInteraction(interaction.interaction);
    }

    // check if query map control is toggled and registered
    if (null !== interaction.mapcontrol) {
      interaction.mapcontrol.toggle(toggle);
    }

    // reset values
    interaction.interaction        = null;
    interaction.id                 = null;
    interaction.toggleeventhandler = null;
    interaction.mapcontrol         = null;
  }

  /**
   * Adds feature to Features layer results
   *
   * @param layer
   */
  addLayerFeaturesToResultsAction(layer) {
    const interaction = this._addFeaturesLayerResultInteraction;

    const not_current = ![null, layer.id].includes(interaction.id);
    const new_layer   = not_current && this.state.layers.find(layer => layer.id === interaction.id);

    // disable previous layer
    if (not_current && new_layer) {
      new_layer.addfeaturesresults.active = false;
    }

    // remove previous interaction
    if (not_current && interaction.interaction) {
      this.mapService.removeInteraction(interaction.interaction);
    }

    // set new layer
    interaction.id = layer.id;

    layer.addfeaturesresults.active = !layer.addfeaturesresults.active;

    if (false === layer.addfeaturesresults.active) {
      this.removeAddFeaturesLayerResultInteraction({ toggle: true });
    } else {

      this.activeMapInteraction(); // useful to send an event

      const external_layer = this._getExternalLayer(layer.id);

      interaction.mapcontrol  =
        interaction.mapcontrol ||
        this.mapService.getCurrentToggledMapControl() ||
        null; //need to be set null when this.mapService.getCurrentToggledMapControl() is undefined
      interaction.interaction = new PickCoordinatesInteraction();

      this.mapService.addInteraction(interaction.interaction, { close: false });

      interaction.interaction
        .on('picked', async ({ coordinate: coordinates }) => {
          if (external_layer) {
            // call setQueryResponse setters method directly in case of external layer 
            this.setQueryResponse(
              {
                data:  [ this.getVectorLayerFeaturesFromQueryRequest(this._vectorLayers.find(v => layer.id === v.get('id')), { coordinates }) ],
                query: { coordinates }
              },
              { add: true }
            );
          } else {
            await DataRouterService.getData(
              'query:coordinates',
              {
                inputs: {
                  coordinates,
                  query_point_tolerance: this._project.getQueryPointTolerance(),
                  layerIds:              [layer.id],
                  multilayers:           false,
                },
                outputs: {
                  show: { add: true }
                }
              }
            );
          }
        });

      interaction.toggleeventhandler = (evt) => {
        if (evt.target.isToggled() && evt.target.isClickMap()) {
          layer.addfeaturesresults.active = false;
        }
      };

      this.mapService.once('mapcontrol:toggled', interaction.toggleeventhandler);

    }
  }

  /**
   * @FIXME add description
   */
  deactiveQueryInteractions() {
    this.state.layers.forEach(layer => { if (layer.addfeaturesresults) layer.addfeaturesresults.active = false; });
    this.removeAddFeaturesLayerResultInteraction();
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param options
   */
  zoomToLayerFeaturesExtent(layer, options = {}) {
    options.highlight = !this.isOneLayerResult();
    if (this._asyncFnc.zoomToLayerFeaturesExtent.async) {
      this._asyncFnc.todo = this.mapService.zoomToFeatures.bind(this.mapService, this._getLayerFeatures(layer), options);
    } else {
      this.mapService.zoomToFeatures(this._getLayerFeatures(layer), options);
    }
  }

  /**
   * Reset internal state
   */
  clearState() {
    this.state.layers.splice(0);
    this.state.query               = null;
    this.state.querytitle          = "";
    this.state.changed             = false;
    this._clearActions();
    this.state.layersFeaturesBoxes = {};
    this.removeAddFeaturesLayerResultInteraction();
  }

  /**
   * Clear layer actions (if present)
   * 
   * @since 3.9.0
   */
  _clearActions() {
    Object.values(this.state.layersactions).forEach(l => l.forEach(action => action.clear && action.clear()));
    this.state.layersactions       = {};
    this.state.actiontools         = {};
    this.state.layeractiontool     = {};
    this.state.currentactiontools  = {};
  }

  /**
   * @FIXME add description
   */
  getState() {
    return this.state;
  }

  /**
   * @FIXME add description
   *
   * @param state
   */
  setState(state) {
    this.state = state;
  }

  /**
   * @FIXME add description
   *
   * @param project
   */
  _setRelations(project) {
    const projectRelations = project.getRelations();
    this._relations = projectRelations ? _.groupBy(projectRelations,'referencedLayer'):  [];
  }

  /**
   * @param layerId
   */
  getAtlasByLayerId(layerId) {
    return this._atlas.filter(atlas => atlas.atlas.qgs_layer_id === layerId);
  }

  /**
   * @FIXME add description
   *
   * @param project
   */
  _setAtlasActions(project) {
    this._atlas = project.getPrint().filter(printconfig => printconfig.atlas) || [];
  }

  /**
   * @FIXME add description
   *
   * @param querytitle
   */
  setTitle(querytitle) {
    this.state.querytitle = querytitle || "";
  }

  /**
   * Convert response from server
   *
   * @param featuresForLayer.layer
   * @param featuresForLayer.features
   * @param featuresForLayer.rawdata  rawdata response
   * @param featuresForLayer.error
   *
   * @returns { layerObj | undefined }
   *
   * @since 3.9.0
   */
  _responseToLayer({ layer, features, rawdata, error }) {

    const has_features = Array.isArray(features) && features.length > 0;

    // Skip when layer has no features or rawdata not undefined (wms external)
    if (false === has_features && undefined === rawdata ) {
      return;
    }

    const is_layer  = layer instanceof Layer;
    const is_vector = layer instanceof ol.layer.Vector;                     // instance of openlayers layer Vector Class
    const is_string = 'string' === typeof layer || layer instanceof String; // can be created by string

    let sourceType;

    if (is_string) {
      sourceType = Layer.LayerTypes.VECTOR;
    } else if (is_layer) {
      try {
        sourceType = layer.getSourceType();
      } catch (error) {
        console.warn('uknown source type for layer:', layer)
      }
    }

    // set selection filter and relation if not wms
    const not_wms_wcs_wmst = -1 === [
      Layer.SourceTypes.WMS,
      Layer.SourceTypes.WCS,
      Layer.SourceTypes.WMST
    ].indexOf(sourceType);
    
    const name = is_string && layer.split('_');

    const id = (is_layer ? layer.getId() : undefined) ||
      (is_vector ? layer.get('id') : undefined) ||
      (is_string ? layer : undefined);

    const attributes = this._parseLayerObjAttributes(layer, features, sourceType);
    const external   = (is_vector || is_string);

    const layerObj = {
      id,
      attributes,
      external,
      features:               this._parseLayerObjFeatures(features, rawdata, external),
      hasgeometry:            this._hasLayerObjGeometry(features, rawdata),
      hasImageField:          this._hasLayerObjImageField(features, rawdata, attributes),
      loading:                false,
      show:                   true,
      expandable:             true,
      addfeaturesresults:     { active: false },
      [DownloadFormats.name]: { active: false },
      editable:               is_layer   ? layer.isEditable()                                                     : false,
      inediting:              is_layer   ? layer.isInEditing()                                                    : false,
      source:                 is_layer   ? layer.getSource()                                                      : undefined,
      infoformat:             is_layer   ? layer.getInfoFormat()                                                  : undefined,
      infoformats:            is_layer   ? layer.getInfoFormats()                                                 : [],
      downloads:              is_layer   ? layer.getDownloadableFormats()                                         : [],
      formStructure:          is_layer   ? this._parseLayerObjFormStructure(layer, features, rawdata, attributes) : undefined,
      relationsattributes:    (is_layer || is_vector || is_string) ? []                                           : undefined,
      filter:                 (is_layer && not_wms_wcs_wmst) ? layer.state.filter                                 : {},
      selection:              (is_layer && not_wms_wcs_wmst ? layer.state.selection : undefined) ||
                              (is_vector ? layer.selection : undefined) ||
                              {},
      title:                  (is_layer ? layer.getTitle() : undefined) ||
                              (is_vector ? layer.get('name') : undefined) ||
                              (is_string && name ? (name.length > 4 ? name.slice(0, name.length - 4).join(' ') : layer) : undefined),
      atlas:                  this.getAtlasByLayerId(id),
      rawdata:                rawdata ? rawdata : null,
      error:                  error   ? error   : '',
    };

    return layerObj;
  }

  /**
   * @since 3.9.0
   */
  _hasLayerObjGeometry(features, rawdata) {
    return Array.isArray(features) && !rawdata && features.some(f => {
      const props = this.getFeaturePropertiesAndGeometry(f);
      if (props.geometry) {
        return true;
      }
    });
  }

  /**
   * @since 3.9.0 
   */
  _hasLayerObjImageField(features, rawdata, attributes) {
    /** @FIXME add description */
    return Array.isArray(features) && features.length && !rawdata && attributes.some(attr => {
      if ('image' === attr.type) {
        return true;
      }
    });
  }

  /**
   * @since 3.9.0
   */
  _parseLayerObjFeatures(features, rawdata, external) {
    const _features = [];
    if (!rawdata) {
      features.forEach(f => {
        const props = this.getFeaturePropertiesAndGeometry(f);
        _features
          .push({
            id:         external ? f.getId() : props.id,
            attributes: props.properties,
            geometry:   props.geometry,
            selection:  props.selection,
            show:       true,
          });
      });
    }
    return _features;
  }

  /**
   * @since 3.9.0
   */
  _parseLayerObjFormStructure(layer, features, rawdata, attributes) {
    const structure = layer.hasFormStructure() && layer.getLayerEditingFormStructure();
    if (false === (structure && this._relations && this._relations.length)) {
      return;
    }
    const setRelationField = (node) => {
      if (node.nodes) {
        for (const _node of node.nodes) {
          setRelationField(_node);
        }
      } else if (node.name) {
        node.relation = true;
      }
    };
    for (const node of structure) {
      setRelationField(node);
    }

    const formStructure = {
      structure,
      fields: layer.getFields().filter(field => field.show), // get features show
    };

    /** @FIXME add description */
    if (!rawdata && Array.isArray(features) && features.length) {
      attributes
        .forEach(attr => {
          if (layer.getFields().some(field => field.name === attr.name)) {
            formStructure.fields.push(attr);
          }
        });
    }
    return formStructure;
  }

  /**
   * @since 3.9.0
   */
  _parseLayerObjAttributes(layer, features, sourceType) {
 
    let layerAttrs;

    // sanity check (eg. external layers ?)
    if (!features || !features.length) {
      return [];
    }

    if (layer instanceof Layer && 'ows' !== this.state.type) { 
      layerAttrs = layer.getAttributes();
    }

    // Sanitize OWS Layer attributes
    if (layer instanceof Layer && 'ows' === this.state.type) {
      layerAttrs = layer
        .getAttributes()
        .map(attribute => {
          const sanitizeAttribute = {...attribute};
          sanitizeAttribute.name = sanitizeAttribute.name.replace(/ /g, '_');
          return sanitizeAttribute
        });
    }

    if (layer instanceof ol.layer.Vector) {
      layerAttrs = layer.getProperties();
    }

    if ('string' === typeof layer || layer instanceof String) {
      layerAttrs = (features[0] ? features[0].getProperties() : [])
    }

    const specialAttrs =
      (layer instanceof Layer)
        ? layerAttrs.filter(attr => {
            try {
              return ('_' === attr.name[0] || Number.isInteger(1 * attr.name[0]))
            } catch(e) {
              return false;
            }
          }).map(attr => ({ alias: attr.name.replace(/_/, ''), name: attr.name }))
        : [];
    if (specialAttrs.length) {
      features.forEach(f => this._setSpecialAttributesFeatureProperty(specialAttrs, f));
    }
    return this._parseAttributes(layerAttrs, features[0], sourceType);
  }

  /**
   * Set special attributes
   *
   * @param layerSpecialAttributesName
   * @param feature
   */
  _setSpecialAttributesFeatureProperty(layerSpecialAttributesName = [], feature) {
    if (0 === layerSpecialAttributesName.length) {
      return;
    }
    // get attributes special keys from feature properties received by server request
    const featureAttributesNames = Object.keys(feature.getProperties());
    layerSpecialAttributesName
      .forEach(layerAttr => {
        featureAttributesNames
          .find(featureAttr => {
            if (featureAttr === layerAttr.alias) {
              feature.set(layerAttr.name, feature.get(featureAttr));
              return true
            }
          })
      });
  }

  /**
   * Get `properties`, `geometry` and `id` from different types of feature
   *
   * @param feature
   *
   * @returns {{geometry: (undefined|*|null|ol.Feature), id: *, properties: string[]}|{geometry: *, id: *, properties: *}}
   */
  getFeaturePropertiesAndGeometry(feature) {
    const isOlFeature = feature instanceof ol.Feature;
    return {
      selection:  feature.selection,
      properties: isOlFeature ? feature.getProperties() : feature.properties,
      geometry:   isOlFeature ? feature.getGeometry()   : feature.geometry,
      id:         isOlFeature ? feature.getId()         : feature.id
    };
  }

  /**
   * Parse attributes to show on result based on field
   *
   * @param layerAttributes
   * @param feature
   * @param sourceType
   *
   * @returns {{name: T, show: boolean, label: T}[]|*}
   */
  _parseAttributes(layerAttributes, feature, sourceType) {
    let featureAttributesNames = getAlphanumericPropertiesFromFeature(
      Object.keys(this.getFeaturePropertiesAndGeometry(feature).properties)
    );
    if (layerAttributes && layerAttributes.length > 0) {
      return layerAttributes.filter(attr => featureAttributesNames.indexOf(attr.name) > -1);
    }
    const sourcesTypes = [
      Layer.SourceTypes.GDAL,
      Layer.SourceTypes.WMS,
      Layer.SourceTypes.WCS,
      Layer.SourceTypes.WMST,
      /** @since 3.9.0 */
      Layer.SourceTypes.POSTGRESRASTER,
    ];
    return featureAttributesNames.map(featureAttr => ({
      name: featureAttr,
      label: featureAttr,
      show: (G3W_FID !== featureAttr) && (undefined === sourceType || -1 !== sourcesTypes.indexOf(sourceType)),
      type: 'varchar'
    }))
  }

  /**
   * @FIXME add description
   *
   * @param actionId
   * @param layer
   * @param feature
   * @param index
   * @param container
   */
  async trigger(actionId, layer, feature, index, container) {
    if (this._actions[actionId]) {
      this._actions[actionId](layer, feature, index);
    }
    if (layer && this.state.layersactions[layer.id]) {
      const action = this.state.layersactions[layer.id].find(layerAction => layerAction.id === actionId);
      if (action) {
        await this.triggerLayerAction(action, layer, feature, index, container);
      }
    }
  }

  /**
   * @FIXME add description
   *
   * @param action
   * @param layer
   * @param feature
   * @param index
   * @param container
   */
  async triggerLayerAction(action, layer, feature, index, container) {
    if (action.cbk) {
      await action.cbk(layer,feature, action, index, container);
    }
    if (action.route) {
      let url = action.route.replace(/{(\w*)}/g, (m, key) => feature.attributes.hasOwnProperty(key) ? feature.attributes[key] : "");
      if (url && '' !== url) {
        GUI.goto(url);
      }
    }
  }

  /**
   * @FIXME add description
   *
   * @param vectorLayer
   */
  registerVectorLayer(vectorLayer) {
    if (-1 === this._vectorLayers.indexOf(vectorLayer)) {
      this._vectorLayers.push(vectorLayer);
    }
  }

  /**
   * @FIXME add description
   *
   * @param vectorLayer
   */
  unregisterVectorLayer(vectorLayer) {
    this._vectorLayers = this._vectorLayers.filter(layer => {
      this.state.layers = this.state.layers && this.state.layers.filter(layer => layer.id !== vectorLayer.get('id'));
      return layer !== vectorLayer;
    });
  }

  /**
   * @FIXME add description
   *
   * @param vectorLayer
   * @param query
   *
   * @returns {Object|Boolean}
   */
  getVectorLayerFeaturesFromQueryRequest(vectorLayer, query = {}) {
    let {
      coordinates,
      bbox,
      geometry,
      filterConfig = {}
    } = query; // extract information about query type

    let features = [];

    const has_coords = coordinates && Array.isArray(coordinates);
    const has_bbox   = bbox && Array.isArray(bbox);

    // case query coordinates
    if (has_coords) {
      this.mapService.viewer.map.forEachFeatureAtPixel(
        this.mapService.viewer.map.getPixelFromCoordinate(coordinates),
        (feature, layer) => { features.push(feature); },
        { layerFilter(layer) { return layer === vectorLayer; } }
      );
    }

    // case query bbox
    if (has_bbox && !has_coords) {
      //set geometry has Polygon
      geometry = ol.geom.Polygon.fromExtent(bbox);
    }

    const is_poly    = geometry instanceof ol.geom.Polygon || geometry instanceof ol.geom.MultiPolygon;

    // check query geometry (Polygon or MultiPolygon)
    if (is_poly && !has_coords) {
      switch (vectorLayer.constructor) {
        case VectorLayer:
          features = vectorLayer.getIntersectedFeatures(geometry);
          break;
        case ol.layer.Vector:
          vectorLayer.getSource().getFeatures().forEach(feature => {
            let add;
            switch (filterConfig.spatialMethod) {
              case 'intersects': add = intersects(geometry, feature.getGeometry());                  break;
              case 'within':     add = within(geometry, feature.getGeometry());                      break;
              default:           add = geometry.intersectsExtent(feature.getGeometry().getExtent()); break;
            }
            if (true === add) {
              features.push(feature);
            }
          });
          break;
      }
    }

    return {
      features,
      layer: vectorLayer
    };

  }

  /**
   *  @FIXME add description
   */
  _printSingleAtlas({
    atlas    = {},
    features = [],
  } = {}) {
    let field = atlas.atlas && atlas.atlas.field_name ? atlas.atlas.field_name : '$id';
    return PRINT_UTILS.printAtlas({
        field,
        values:   features.map(feat => feat.attributes['$id' === field ? G3W_FID : field]),
        template: atlas.name,
        download: true
      })
      .then(({url}) => {
        GUI.downloadWrapper(downloadFile, { url, filename: atlas.name, mime_type: 'application/pdf' })
      });
  }

  /**
   * @FIXME add description
   *
   * @param ids
   * @param container
   * @param relationData
   */
  showChart(ids, container, relationData) {
    this.emit('show-chart', ids, container, relationData);
  }

  /**
   * @FIXME add description
   * 
   * @param container DOM element
   */
  hideChart(container) {
    this.emit('hide-chart', container);
  }

  /**
   * @FIXME add description
   *
   * @param ids
   * @param layer
   * @param feature
   * @param action
   * @param index
   * @param container
   */
  showRelationsChart(ids = [], layer, feature, action, index, container) {
    action.state.toggled[index] = !action.state.toggled[index];
    if (action.state.toggled[index]) {
      this.emit('show-chart', ids, container, {
        relations: this._relations[layer.id],
        fid: feature.attributes[G3W_FID],
        height: 400
      });
    } else {
      this.hideChart(container);
    }
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param feature
   */
  printAtlas(layer, feature) {
    const features   = feature ? [feature] : layer.features;
    const atlasLayer = this.getAtlasByLayerId(layer.id);

    /** @FIXME add description */
    if (atlasLayer.length <= 1) {
      this._printSingleAtlas({ features, atlas: atlasLayer[0] });
      return;
    }

    let inputs = '';

    atlasLayer.forEach((atlas, index) => {
      const id = getUniqueDomId();
      inputs += `<input id="${id}" g3w_atlas_index="${index}" class="magic-radio" type="radio" name="template" value="${atlas.name}"/>`;
      inputs += `<label for="${id}">${atlas.name}</label>`;
      inputs += `<br>`;
    });

    GUI.showModalDialog({
      title: t('sdk.atlas.template_dialog.title'),
      message: inputs,
      buttons: {
        success: {
          label: "OK",
          className: "skin-button",
          callback: () => {
            const index = $('input[name="template"]:checked').attr('g3w_atlas_index');
            if (undefined === index) {
              return false; // prevent default
            }
            this._printSingleAtlas({ features, atlas: atlasLayer[index] });
          }
        }
      }
    });

  }

  /**
   * @FIXME add description
   *
   * @param layer
   */
  showLayerDownloadFormats(layer) {
    const name = DownloadFormats.name;
    layer[name].active = !layer[name].active;
    this.setLayerActionTool({
      layer,
      component: layer[name].active ? DownloadFormats : null,
      config: layer[name].active ? this.state.actiontools[name][layer.id] : null
    })
  }

  /**
   * @FIXME add description
   *
   * @param type
   * @param layer
   * @param features
   * @param action
   * @param index
   */
  async downloadFeatures(type, layer, features = [], action, index) {

    if (features && !Array.isArray(features)) {
      features = [features];
    }

    const { query = {} } = this.state;
    const data           = {
      fids: features.map(f => f.attributes[G3W_FID]).join(',')
    };

    /**
     * A function that che be called in case of querybypolygon
     *
     * @param active
     */
    const runDownload = async (active=false) => {

      if (features.length > 1) {
        layer[DownloadFormats.name].active = active;
        this.setLayerActionTool({ layer });
      }

      await GUI.downloadWrapper(
        ({layer, type, data}= {}) => {
          return CatalogLayersStoresRegistry
            .getLayerById(layer.id)
            .getDownloadFilefromDownloadDataType(type, { data }) ||
          Promise.resolve();
        },
        {
          layer,
          type,
          data
        }
      );

      const downloadsactions = this.state.layersactions[layer.id].find(action => 'downloads' === action.id);

      /** @FIXME add description */
      if (features.length > 1 && undefined === downloadsactions) {
        layer[type].active = false;
        this.setLayerActionTool({ layer });
      }

      /** @FIXME add description */
      if(features.length > 1 && undefined !== downloadsactions) {
        layer[DownloadFormats.name].active = false;
      }

      /** @FIXME add description */
      if (features.length <= 1 && undefined === downloadsactions) {
        action.state.toggled[index] = false;
      }

      /** @FIXME add description */
      if (features.length <= 1 && undefined !== downloadsactions) {
        downloadsactions.state.toggled[index] = false;
      }

      /** @FIXME add description */
      if (features.length <= 1) {
        this.setCurrentActionLayerFeatureTool({ index, action, layer });
      }
    };

    /** @FIXME add description */
    if ('polygon' !== query.type) {
      await runDownload();
      return;
    }

    // check if multi-download if present
    const downloadsactions = this.state.layersactions[layer.id].find(action => action.id === 'downloads');

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
      // choose between only feature attribute or also polygon attribute
      download: (type) => {
        if ('polygon' === type) { // id type polygon add parameters to api download
          data.sbp_qgs_layer_id = layer.id;
          data.sbp_fid          = query.fid;
        } else {                  // force to remove
          delete data.sbp_fid;
          delete data.sbp_qgs_layer_id;
        }
        runDownload(true)
      }
    };

    /** @FIXME add description */
    if (1 === features.length && undefined === downloadsactions) {
      action.state.toggled[index] = true;
    }

    /** @FIXME add description */
    if (1 === features.length) {
      this.state.actiontools[QueryPolygonCsvAttributesComponent.name] = this.state.actiontools[layer.id] || {};
      this.state.actiontools[QueryPolygonCsvAttributesComponent.name][layer.id] = config;
      this.setCurrentActionLayerFeatureTool({
        layer,
        index,
        action,
        component: QueryPolygonCsvAttributesComponent,
      });
    }

    /** @FIXME add description */
    if (undefined === downloadsactions && 1 !== features.length) {
      layer[type].active = !layer[type].active;
    }

    /** @FIXME add description */
    if (1 !== features.length) {
      const has_config = (downloadsactions || (layer[type].active && undefined === downloadsactions));
      this.setLayerActionTool({
        layer,
        component: has_config ? QueryPolygonCsvAttributesComponent : null,
        config:    has_config ? config : null,
      });
    }

  }

  /**
   * @FIXME add description
   */
  downloadGpx({ id: layerId } = {}, feature) {
    CatalogLayersStoresRegistry
      .getLayerById(layerId)
      .getGpx({ fid: feature ? feature.attributes[G3W_FID] : null })
      .catch((err) => { GUI.notify.error(t("info.server_error")); })
      .finally(()  => { this.layerMenu.loading.shp = false; this._hideMenu(); })
  }

  /**
   * @FIXME add description
   */
  downloadXls({ id: layerId } = {}, feature) {
    CatalogLayersStoresRegistry
      .getLayerById(layerId)
      .getXls({ fid: feature ? feature.attributes[G3W_FID] : null })
      .catch(err  => { GUI.notify.error(t("info.server_error")); })
      .finally(() => { this.layerMenu.loading.shp = false; this._hideMenu(); })
  }

  /**
   *
   * @FIXME add description
   *
   * @param layer
   * @param actionId
   */
  listenClearSelection(layer, actionId) {
    if (layer.external) {
      layer.features
        .forEach(feature => {
          const selectionFeature = layer.selection.features.find(selectionFeature => feature.id === selectionFeature.getId());
          feature.selection = (selectionFeature) ? selectionFeature.selection : { selected: false };
        });
    } else {
      const _layer = CatalogLayersStoresRegistry.getLayerById(layer.id);
      const handler = () => {
        layer.features.forEach((feature, index) =>
          this.state.layersactions[layer.id].find(action => action.id === actionId).state.toggled[index] = false
        );
      };
      _layer.on('unselectionall', handler);
      this.unlistenerlayeractionevents.push({ layer:_layer, event:'unselectionall', handler });
    }
  }

  /**
   * @FIXME add description
   */
  unlistenerEventsActions() {
    this.unlistenerlayeractionevents.forEach(obj => obj.layer.off(obj.event, obj.handler));
    this.unlistenerlayeractionevents = [];
  }

  /**
   * Toggle filter token on a layer
   *
   * @param layer
   */
  addRemoveFilter(layer) {
    CatalogLayersStoresRegistry.getLayerById(layer.id).toggleFilterToken();
  }

  /**
   * Save current filter for a layer
   * 
   * @since 3.9.0
   */
  saveFilter(layer) {
    CatalogLayersStoresRegistry.getLayerById(layer.id).saveFilter();
  }

  /**
   * Initial check of selection active on layer
   *
   * @param opts.layer
   * @param opts.feature
   * @param opts.index
   * @param opts.action
   */
  checkFeatureSelection({
    layer,
    feature,
    index,
    action
  } = {}) {
    if (layer.external) {
      action.state.toggled[index] = feature.selection.selected;
    } else if (feature) {
      // project layer
      const pLayer = CatalogLayersStoresRegistry.getLayerById(layer.id);
      action.state.toggled[index] = (
          //need to check if set active filter and no saved filter is set
          (pLayer.getFilterActive() && null == pLayer.getCurrentFilter()) ||
          //or if feature fid is in selected array
          pLayer.hasSelectionFid(feature ? this._getFeatureId(feature, layer.external): null)
      );
    }
  }

  /**
   * @FIXME add description
   */
  removeQueryResultLayerFromMap() {
    this.resultsQueryLayer.getSource().clear();
    this.mapService.getMap().removeLayer(this.resultsQueryLayer)
  }

  /**
   * @FIXME add description
   *
   * @since 3.9.0
   */
  addQueryResultLayerToMap(feature) {
    this.resultsQueryLayer.getSource().addFeature(feature);
    this.mapService.getMap().addLayer(this.resultsQueryLayer);
  }

  /**
   * Show layerQuery result on map
   */
  addQueryResultsLayerToMap({ feature }) {
    this.removeQueryResultLayerFromMap();
    this.addQueryResultLayerToMap(feature);
    this.mapService.setZIndexLayer({ layer: this.resultsQueryLayer }); // make sure that layer is on top of other map.
  }

  /**
   * Show feature from coordinates
   *
   * @param coordinates
   */
  showCoordinates(coordinates) {
    this.addQueryResultsLayerToMap({ feature: createFeatureFromCoordinates(coordinates) });
  }

  /**
   * Show BBox
   *
   * @param bbox
   */
  showBBOX(bbox) {
    this.addQueryResultsLayerToMap({ feature: createFeatureFromBBOX(bbox) });
  }

  /**
   * Show Geometry
   *
   * @param geometry
   */
  showGeometry(geometry) {
    if (geometry) {
      this.addQueryResultsLayerToMap({ feature: createFeatureFromGeometry({ geometry }) });
    }
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param feature
   */
  goToGeometry(layer, feature) {
    if (!feature.geometry) {
      return;
    }
    const handlerOptions = {
      mapServiceMethod: this.isOneLayerResult() ? 'zoomToFeatures' : 'highlightGeometry',
      firstParam:       this.isOneLayerResult() ? [feature] : feature.geometry,
      options:          this.isOneLayerResult() ? {} : { layerId: layer.id, duration: 1500 }
    };
    if (this._asyncFnc.goToGeometry.async) {
      this._asyncFnc.todo = this.mapService[handlerOptions.mapServiceMethod].bind(
        this.mapService,
        handlerOptions.firstParam,
        handlerOptions.options
      );
    } else {
      setTimeout(() => this.mapService[handlerOptions.mapServiceMethod](
        handlerOptions.firstParam,
        handlerOptions.options
      ));
    }
  }

  /**
   * Save layer result
   * @param opts.layer current layer
   * @parm opts.type type of format
   */
  saveLayerResult({
    layer,
    type = 'csv'
  } = {}) {
    this.downloadFeatures(type, layer, layer.features);
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param feature
   */
  highlightGeometry(layer, feature) {
    if (feature.geometry) {
      this.mapService.highlightGeometry(
        feature.geometry,
        { layerId: layer.id, zoom: false, duration: Infinity }
      );
    }
  }

  /**
   * @FIXME add description
   *
   * @param layer
   */
  clearHighlightGeometry(layer) {
    this.mapService.clearHighlightGeometry();
    if (this.isOneLayerResult()) {
      this.highlightFeaturesPermanently(layer);
    }
  }

  /**
   * Handle show Relation on result
   *
   * @param opts.relation
   * @param opts.layerId  current layer father id
   * @param opts.feature  current feature father id
   */
  showRelation({
    relation,
    layerId,
    feature
  } = {}) {
    const projectRelation = this._project.getRelationById(relation.name);
    GUI.pushContent({
      content: new RelationsPage({
        currentview:      'relation',
        relations:        [projectRelation],
        chartRelationIds: this.findPlotId(projectRelation.referencingLayer) ? [projectRelation.referencingLayer] : [],
        nmRelation:       this._project.getRelationById(relation.nmRelationId),
        layer:            { id: layerId },
        feature,
      }),
      crumb: {
        title: projectRelation.name
      },
      title: projectRelation.name,
      closable: false
    })
  };

  /**
   * @FIXME add description
   *
   * @param layer
   * @param feature
   * @param action
   */
  showQueryRelations(layer, feature, action) {
    GUI.changeCurrentContentOptions({ crumb: { title: layer.title } });

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
  }

  /**
   * Get layer from current state.layers showed on result
   *
   * @since 3.9.0
   */
  _getLayer(layerId) {
    return this.state.layers.find(l => l.id === layerId);
  }

  /**
   * Get external layer from current state.layers showed on result
   *
   * @since 3.9.0
   */
  _getExternalLayer(layerId) {
    return (this._getLayer(layerId) || {}).external;
  }

  /**
   * Get id of the  feature
   *
   * @since 3.9.0
   */
  _getFeatureId(feature, external){
    return external ? feature.id : feature.attributes[G3W_FID];
  }

  /**
   * Get ids of the selected features
   *
   * @since 3.9.0
   */
  _getFeaturesIds(features, external) {
    return features.map(feature => this._getFeatureId(feature, external));
  }

  /**
   * Extract features from layer object
   *
   * @since 3.9.0
   */
  _getLayerFeatures(layer={}) {
    return layer.features || [];
  }

  /**
   * @since 3.9.0
   */
  _toggleLayerFeatureBox(layer, feature, collapsed) {
    const boxId = this.getBoxId(layer, feature);
    const box   = boxId && this.state.layersFeaturesBoxes[boxId];
    if (box) {
      setTimeout(() => box.collapsed = collapsed); // due to vue reactivity, wait a little bit before update layers
    }
  }

  /**
   * @since 3.9.0
   */
  _removeLayerFeatureBox(layer, feature_to_delete) {
    setTimeout(() => delete this.state.layersFeaturesBoxes[this.getBoxId(layer, feature_to_delete)]);
  }

  /**
   * @since 3.9.0
   */
  _setActionGoToGeometry(layer) {
    this.state.layersactions[layer.id]
      .push({
        id: 'gotogeometry',
        download: false,
        mouseover: true,
        class: GUI.getFontClass('marker'),
        hint: 'sdk.mapcontrols.query.actions.zoom_to_feature.hint',
        cbk: throttle(this.goToGeometry.bind(this))
      });
  }

  /**
   * @since 3.9.0
   */
  _setActionShowQueryAndPlotsRelations(layer) {
    const relations = this._relations[layer.id].filter(relation => 'MANY' === relation.type);
    const chartRelationIds = [];

    relations.forEach(relation => {
      const id = this.plotLayerIds.find(id => id === relation.referencingLayer);
      if (id) {
        chartRelationIds.push(id);
      }
    });

    /** @FIXME add description */
    if (relations.length > 0) {
      this.state.layersactions[layer.id]
        .push({
          id: 'show-query-relations',
          download: false,
          class: GUI.getFontClass('relation'),
          hint: 'sdk.mapcontrols.query.actions.relations.hint',
          cbk: this.showQueryRelations,
          relations,
          chartRelationIds
        });
    }

    /** @FIXME add description */
    if (chartRelationIds.length > 0) {
      this.state.layersactions[layer.id]
        .push({
          id: 'show-plots-relations',
          download: false,
          opened: true,
          class: GUI.getFontClass('chart'),
          state: this.createActionState({ layer }),
          hint: 'sdk.mapcontrols.query.actions.relations_charts.hint',
          cbk: throttle(this.showRelationsChart.bind(this, chartRelationIds))
        });
    }
  }

  /**
   * @since 3.9.0
   */
  _setActionPrintAtlas(layer) {
    this.state.layersactions[layer.id]
      .push({
        id: `printatlas`,
        download: true,
        class: GUI.getFontClass('print'),
        hint: `sdk.tooltips.atlas`,
        cbk: this.printAtlas.bind(this)
      });
  }

  /**
   * @since 3.9.0
   */
  _setActionDownloadFeature(layer) {
    const [format] = layer.downloads; // NB: format == layer.downloads[0]
    const cbk = this.downloadFeatures.bind(this, format);
    layer[format] = Vue.observable({ active: false });
    this.state.layersactions[layer.id]
      .push({
        id: `download_${format}_feature`,
        download: true,
        state: this.createActionState({layer}),
        class: GUI.getFontClass('download'),
        hint: `sdk.tooltips.download_${format}`,
        cbk: (layer, feature, action, index) => {
          action.state.toggled[index] = !action.state.toggled[index];
          if (action.state.toggled[index]) {
            cbk(layer, feature, action, index);
          } else {
            this.setCurrentActionLayerFeatureTool({ index, action, layer })
          }
        }
      });
  }

  /**
   * @since 3.9.0
   */
  _setActionMultiDownloadFeature(layer) {

    const downloads = [];
    layer.downloads
      .forEach(format => {
        downloads.push({
          id: `download_${format}_feature`,
          download: true,
          format,
          class: GUI.getFontClass(format),
          hint: `sdk.tooltips.download_${format}`,
          cbk: (layer, feature, action, index) => {
            // un-toggle downloads action
            this.downloadFeatures(format, layer, feature, action, index);
            if ('polygon' !== this.state.query.type) {
              const downloadsaction = this.state.layersactions[layer.id].find(action => 'downloads' === action.id);
              downloadsaction.cbk(layer, feature, downloadsaction, index);
            }
          }
        });
      });

    // set actionstools configs
    this.state.actiontools[DownloadFormats.name] = this.state.actiontools[DownloadFormats.name] || {};
    this.state.actiontools[DownloadFormats.name][layer.id] = { downloads };
    // check if it has download actions
    this.state.layersactions[layer.id]
      .push({
        id: `downloads`,
        download: true,
        class: GUI.getFontClass('download'),
        state: this.createActionState({ layer }),
        toggleable: true,
        hint: `Downloads`,
        change({features}) {
          features
            .forEach((feature, index) => {
              if (undefined === this.state.toggled[index]) {
                VM.$set(this.state.toggled, index, false);
              } else {
                this.state.toggled[index] = false;
              }
            });
        },
        cbk: (layer, feature, action, index) => {
          action.state.toggled[index] = !action.state.toggled[index];
          this.setCurrentActionLayerFeatureTool({ layer, index, action, component: (action.state.toggled[index] ? DownloadFormats : null) });
        }
      });
  }

  /**
   * @since 3.9.0
   */
  _setActionRemoveFeatureFromResult(layer) {
    this.state.layersactions[layer.id]
      .push({
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
  }

  /**
   * @since 3.9.0
   */
  _setActionSelection(layer) {
    this.state.layersactions[layer.id]
      .push({
        id:       'selection',
        download: false,
        class:    GUI.getFontClass('success'),
        hint:     'sdk.mapcontrols.query.actions.add_selection.hint',
        state:    this.createActionState({ layer }),
        init:     ({ feature, index, action } = {}) => { if (undefined !== layer.selection.active) { this.checkFeatureSelection({ layer, index, feature, action }) }
        },
        /** @since 3.9.0 reactive `toggled` when adding new feature and then bind click on query result context */
        change({features}) {
          features
            .forEach((feature, index) => {
              // exclude existing feature
              if (undefined === this.state.toggled[index]) {
                //add reactive property of array
                VM.$set(this.state.toggled, index, false);
              }
          });
        },
        cbk: throttle(this.addToSelection.bind(this))
      });

    // In case of external layer don't listen to `selection` event
    this.listenClearSelection(layer, 'selection');
  }

  /**
   * @since 3.9.0
   */
  _setActionLinkZoomToFid(layer) {
    this.state.layersactions[layer.id]
      .push({
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
  }

  /**
   * @since 3.9.0
   */
  _setActionEditing(layer) {
    this.state.layersactions[layer.id]
      .push({
        id: 'editing',
        class: GUI.getFontClass('pencil'),
        hint: 'Editing',
        cbk: (layer, feature) => { this.editFeature({ layer, feature }) }
      });
  }

}

/**
 * @deprecated since 3.8.0 Will be deleted in 4.x. Use QueryResultsService::updateLayerResultFeatures(layer) instead
 */
QueryResultsService.prototype.addRemoveFeaturesToLayerResult = deprecate(QueryResultsService.prototype.updateLayerResultFeatures, '[G3W-CLIENT] QueryResultsService::addRemoveFeaturesToLayerResult(layer) is deprecated');

/**
 * @deprecated since 3.9.0 Will be deleted in 4.x. Use GUI::downloadWrapper(downloadFnc, options) instead
 */
QueryResultsService.prototype.downloadApplicationWrapper = deprecate(GUI.downloadWrapper, '[G3W-CLIENT] QueryResultsService::downloadApplicationWrapper(downloadFnc, options) is deprecated');

/**
 * @deprecated since 3.9.0 Will be deleted in 4.x. Use QueryResultsService::addToSelection(layer) instead
 */
QueryResultsService.prototype.selectionFeaturesLayer = deprecate(addToSelection, '[G3W-CLIENT] QueryResultsService::selectionFeaturesLayer(layer) is deprecated');

/**
 * @deprecated since 3.9.0 Will be deleted in 4.x. Use QueryResultsService::removeFromSelection(layer) instead
 */
QueryResultsService.prototype.clearSelectionExtenalLayer = deprecate(addToSelection, '[G3W-CLIENT] QueryResultsService::clearSelectionExtenalLayer(layer) is deprecated');

/**
 * Alias functions
 * 
 * @TODO choose which ones deprecate
 */
QueryResultsService.prototype.init                       = QueryResultsService.prototype.clearState;
QueryResultsService.prototype.reset                      = QueryResultsService.prototype.clearState;
QueryResultsService.prototype.addToSelection             = addToSelection;
QueryResultsService.prototype.removeFromSelection        = removeFromSelection;


/**
 * Core methods used from other classes to react before or after its call
 */
QueryResultsService.prototype.setters = {

  /**
   * Hook method called when response is handled by Data Provider
   *
   * @param { Object }                             queryResponse
   * @param { Array }                              queryResponse.data
   * @param { 'coordinates' | 'bbox' | 'polygon' } queryResponse.type
   * @param { Object }                             queryResponse.query
   * @param { Object }                             queryResponse.query.external
   * @param { boolean }                            queryResponse.query.external.add       - whether add external layers to response
   * @param { Object }                             queryResponse.query.external.filter
   * @param { boolean }                            queryResponse.query.external.SELECTED
   * @param { Object }                             options
   * @param { boolean }                            options.add                            - whether is a new query request (add/remove query request)
   */
  setQueryResponse(queryResponse, options = { add: false }) {

    // set mandatory queryResponse fields
    if (!queryResponse.data)           queryResponse.data           = [];
    if (!queryResponse.query)          queryResponse.query          = { external: { add: false, filter: { SELECTED: false } } };
    if (!queryResponse.query.external) queryResponse.query.external = { add: false, filter: { SELECTED: false }};

    // whether add response to current results using addLayerFeaturesToResultsAction
    if (false === options.add) {
      // in case of new request results reset the query otherwise maintain the previous request
      this.clearState();
      this.state.query = queryResponse.query;
      this.state.type  = queryResponse.type;
    }

    // whether add external layers to response
    if (true === queryResponse.query.external.add && false === options.add) {
      const catalogService = GUI.getService('catalog');

      /** @type { boolean | undefined } */
      const FILTER_SELECTED = queryResponse.query.external.filter.SELECTED;
  
      // add visible layers to query response (vector layers)
      this._vectorLayers
        .forEach(layer => {
          const id = layer.get('id');
          const is_selected  = catalogService.isExternalLayerSelected({ id, type: 'vector' });
          const is_visible = layer.getVisible(); 
          // TODO: extract this into `layer.isSomething()` ?
          if (is_visible && ((is_selected === FILTER_SELECTED) || (undefined === FILTER_SELECTED))) {
            queryResponse.data[
              '__g3w_marker' === id // keep geocoding control "marker" layer at top
              ? 'unshift'
              : 'push'
            ](this.getVectorLayerFeaturesFromQueryRequest(layer, queryResponse.query));
          }
        });
    }

    if (false === options.add) {
      switch (this.state.query.type) {
        case 'coordinates': this.showCoordinates(this.state.query.coordinates); break;
        case 'bbox':        this.showBBOX(this.state.query.bbox); break;
        case 'polygon':
        case 'drawpolygon': this.showGeometry(this.state.query.geometry); break;
      }
    }

    // Convert response from DataProvider into a QueryResult component data structure
    const layers = [];
    queryResponse.data.forEach(featuresForLayer => {
      []
        .concat(featuresForLayer)
        .forEach(featuresForLayer => {
        const layer = this._responseToLayer(featuresForLayer);
        if (layer) {
          layers.push(layer)
        }
      });
    });

    this.setLayersData(layers, options);

  },

  /**
   * Setter method called when adding layer and feature for response
   *
   * @param layers
   * @param options
   */
  setLayersData(layers, options = { add: false }) {
    if (false === options.add) {
      // set the right order of result layers based on TOC
      this._currentLayerIds = layers.map(layer => layer.id);
      // sort layers as Catalog project layers.
      layers.sort((a, b) => (this._projectLayerIds.indexOf(a.id) > this._projectLayerIds.indexOf(b.id) ? 1 : -1));
    }
    // get features from add pick layer in case of a new request query
    layers.forEach(layer => { options.add ? this.updateLayerResultFeatures(layer) : this.state.layers.push(layer); });
    this.setActionsForLayers(layers, { add: options.add });
    this.state.changed = true;
  },

  /**
   * Add custom component in query result
   *
   * @param component
   */
  addComponent(component) {
    this.state.components.push(component)
  },

  /**
   * @FIXME add description
   *
   * @param actions
   * @param layers
   */
  addActionsForLayers(actions, layers) {},

  /**
   * @FIXME add description
   *
   * @param element
   */
  postRender(element) {},

  /**
   * @FIXME add description
   */
  closeComponent() {},

  /**
   * Called when layer result features is changed
   *
   * @param layer
   */
  changeLayerResult(layer) {
    this.state.layersactions[layer.id].forEach(action => action.change && action.change(layer));  // call if present change method to action
    this.resetCurrentActionToolsLayer(layer);                                                     // reset layer current actions tools
  },

  /**
   * @FIXME add description
   */
  activeMapInteraction() {},

  /**
   * Setter method related to relation table
   */
  editFeature({layer, feature}={}) {},

  /**
   * Setter method called when opening/closing feature info data content.
   *
   * @param opts.open
   * @param opts.layer
   * @param opts.feature
   * @param opts.container
   */
  openCloseFeatureResult({open, layer, feature, container}={}) {},

  /**
   * Remove a feature from current layer result
   *
   * @param layer
   * @param feature
   * 
   * @since 3.9.0
   */
  removeFeatureLayerFromResult(layer, feature) {
    this.updateLayerResultFeatures({ id: layer.id, external: layer.external, features: [feature] });
  }

};


module.exports = QueryResultsService;