import GUI                                from 'services/gui';
import {
  G3W_FID,
  LIST_OF_RELATIONS_TITLE,
  LIST_OF_RELATIONS_ID,
}                                         from 'constant';
import ProjectsRegistry                   from 'store/projects';
import DataRouterService                  from 'services/data';
import CatalogLayersStoresRegistry        from 'store/catalog-layers';
import DownloadFormats                    from 'components/QueryResultsActionDownloadFormats.vue';
import QueryPolygonCsvAttributesComponent from 'components/QueryResultsActionQueryPolygonCSVAttributes.vue';
import ApplicationService                 from 'services/application';

const {
  noop,
  downloadFile,
  throttle,
  getUniqueDomId,
  copyUrl,
}                                = require('core/utils/utils');

const {
  getAlphanumericPropertiesFromFeature,
  createFeatureFromFeatureObject,
  createFeatureFromGeometry,
  createFeatureFromBBOX,
  createFeatureFromCoordinates,
  intersects,
  within,
}                                = require('core/utils/geo');

const { t }                      = require('core/i18n/i18n.service');
const Layer                      = require('core/layers/layer');
const G3WObject                  = require('core/g3wobject');
const VectorLayer                = require('core/layers/vectorlayer');
const PrintService               = require('core/print/printservice');
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
     * Service used to work with atlas (print functionality) action tool
     */
    this.printService = new PrintService();

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
       *   "download": wether action is download or not
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
       * @FIXME add description
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
  init() {
    this.clearState();
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
   */
  unRegisterCustomComponent({
    id,
    layerId,
    type,
    position
  }) {
    if (position) {
      this.state.layerscustomcomponents[layerId][type][position] = this.state.layerscustomcomponents[layerId][type][position].filter(({id:componentId}) => componentId !== id);
      return;
    }

    Object
      .keys(this.state.layerscustomcomponents[layerId][type])
      .forEach(position => {
          this.state.layerscustomcomponents[layerId][type][position] = this.state.layerscustomcomponents[layerId][type][position].filter(({id:componentId}) => componentId !== id);
      });
  };

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
   * Remove a feature from current layer result
   *
   * @param layer
   * @param feature
   */
  removeFeatureLayerFromResult(layer, feature) {
    this.updateLayerResultFeatures({ id: layer.id, external: layer.external, features: [feature] });
  }

  /**
   * Wrapper for download
   *
   * @param downloadFnc
   * @param options
   */
  async downloadApplicationWrapper(downloadFnc, options = {}) {
    const download_caller_id = ApplicationService.setDownload(true);
    GUI.setLoadingContent(true);
    try {
      await downloadFnc(options);
    } catch(err) {
      GUI.showUserMessage({ type: 'alert', message: err || 'server_error', textMessage: !!err })
    }
    ApplicationService.setDownload(false, download_caller_id);
    GUI.setLoadingContent(false);
  }

  /**
   * Based on layer response check if features layer need to
   * be added or removed to current `state.layers` results
   *
   * @param responseLayer layer structure coming from request
   *
   * @since 3.8.0
   */
  updateLayerResultFeatures(responseLayer) {
    const layer            = this._getLayer(responseLayer.id),            // get layer from current `state.layers` showed on result
          features         = this._getLayerFeatures(layer),               // extract features from layer object
          responseFeatures = this._getLayerFeatures(responseLayer),       // extract features from responseLayer object
          external         = this._getExternalLayer(responseLayer.id);    // get id of external layer or not (`external` is a layer added by mapcontrol addexternlayer)

    if (layer && features.length) {
      //get features id from current layer on result
      const features_ids = this._getFeaturesIds(features, external);
      // filter the features that we had to remove
      responseFeatures.forEach(feature => {
        //check if feature on result is already add
        if (features_ids.find(id => id === this._getFeatureId(feature, external))) {
          this._removeLayerFeatureBox(layer, feature);
          // remove feature from layer result
          this._removeFeatureFromLayer(layer, feature, external);
        } else {
          // add feature from layer result
          this._addFeatureFromLayer(layer, feature);
        }
      });

      //in case of only on feature in layer
      if (layer.features.length === 1) {
        this._toggleLayerFeatureBox(layer, features[0], false);
      } else if (layer.features.length > 1) {
        //collapse all feature layer
        layer.features.forEach(feature => this._toggleLayerFeatureBox(layer, feature, true));
      }
      // in case no more features on layer remove interaction pickcoordinate to get result from map
      this.checkIfLayerHasNoFeatures(layer);

    }

    // highlight new feature
    if (1 === this.state.layers.length) {
      this.highlightFeaturesPermanently(this.state.layers[0]);
    }

    this.changeLayerResult(layer);
  }

  /**
   * Called when layer result features is changed
   *
   * @param layer
   */
  _changeLayerResult(layer) {
    this.state.layersactions[layer.id].forEach(action => action.change && action.change(layer));  // call if present change method to action
    this.resetCurrentActionToolsLayer(layer);                                                     // reset layer current actions tools
  }

  /**
   * Check and do action if layer has no features after delete feature(s)
   *
   * @param layer
   */
  checkIfLayerHasNoFeatures(layer) {
    if (layer && 0 === layer.features.length) {
      // due to vue reactivity, wait a little bit before update layers
      setTimeout(() => {
        this.state.layers = this.state.layers.filter(l => l.id !== layer.id);
        this.clearHighlightGeometry(layer);
        this.removeAddFeaturesLayerResultInteraction({ toggle: true });
      })
    }
  }

  /**
   * Create boxid identify to query result hmtl
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

    //reset (Empty array) unlistenerlayeractionevents
    this.unlistenerlayeractionevents = [];

    //Loop through layers results
    layers.forEach(layer => {

      const currentactiontoolslayer = {};
      const currentationfeaturelayer = {};

      layer.features.forEach((_, idx) => {
        currentactiontoolslayer[idx] = null;
        currentationfeaturelayer[idx] = null;
      });

      // set eventually layer action tool and need to be reactive
      this.state.layeractiontool[layer.id]           = Vue.observable({ component: null, config: null });
      this.state.currentactiontools[layer.id]        = Vue.observable(currentactiontoolslayer);
      this.state.currentactionfeaturelayer[layer.id] = Vue.observable(currentationfeaturelayer);

      const is_external_layer_or_wms = (layer.external) || (layer.source ? 'wms' === layer.source.type : false);

      if (!this.state.layersactions[layer.id]) {
        this.state.layersactions[layer.id] = [];
      }

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
      if (false === is_external_layer_or_wms) {
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
   * @param opts.layer
   * @param @opts.dynamicProperties
   */
  createActionState({
    layer,
    dynamicProperties = ['toggled'],
  }) {
    // number of download formats
    const properties = dynamicProperties.reduce((obj, prop) => { obj[prop] = {}; return obj; }, {});
    layer.features.map((_, idx) => { Object.keys(properties).forEach(prop => { properties[prop][idx] = null; }); });
    return Vue.observable(properties);
  };

  /**
   * Get action referred to layer getting the action id
   *
   * @param opts.layer layer linked to action
   * @param opts.id    action id
   */
  getActionLayerById({
    layer,
    id,
  } = {}) {
    return this.state.layersactions[layer.id].find(action => action.id === id);
  };

  /**
   * Set current layer action tool in feature
   *
   * @param opts.layer current layer
   * @param opts.index feature index
   * @param opts.value component value or null
   */
  setCurrentActionLayerFeatureTool({
    layer,
    action,
    index,
    component = null
  } = {}) {
    if (
      component &&
      this.state.currentactiontools[layer.id][index] &&
      action.id !== this.state.currentactionfeaturelayer[layer.id][index].id &&
      this.state.currentactionfeaturelayer[layer.id][index].toggleable
    ) {
      this.state.currentactionfeaturelayer[layer.id][index].state.toggled[index] = false;
    }
    this.state.currentactionfeaturelayer[layer.id][index] = component ? action : null;
    this.state.currentactiontools[layer.id][index]        = component;
  }


  /**
   * @FIXME add description
   *
   * @param opts.id action layer id
   * @param opts.layer layer
   * @param opts.config configuration Object
   *
   */
  addCurrentActionToolsLayer({
    id,
    layer,
    config = {}
  }) {
    this.state.actiontools[id] = { [layer.id]: config };
  }

  /**
   * Reset current action tools on layer when feature layer change
   *
   * @param layer
   */
  resetCurrentActionToolsLayer(layer) {
    layer.features.forEach((_, idx) => {
      if (undefined === this.state.currentactiontools[layer.id]) {
        return;
      }
      if (undefined === this.state.currentactiontools[layer.id][idx]) {
        Vue.set(this.state.currentactiontools[layer.id], idx, null);
      } else {
        this.state.currentactiontools[layer.id][idx] = null;
      }
      this.state.currentactionfeaturelayer[layer.id][idx] = null;
    })
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
   * Order response layer as catalog layer project order
   * @param layers Array of layers
   */
  _orderResponseByProjectLayers(layers=[]) {
    layers.sort((a, b) => (this._projectLayerIds.indexOf(a.id) > this._projectLayerIds.indexOf(b.id) ? 1 : -1));
  }

  /**
   * @FIXME add description
   * @param bool Boolean
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
   * @param opts.toggle boolean If true toggle true the mapcontrol
   */
  removeAddFeaturesLayerResultInteraction({
    toggle = false
  } = {}) {
    if (this._addFeaturesLayerResultInteraction.interaction) {
      this.mapService.removeInteraction(this._addFeaturesLayerResultInteraction.interaction);
    }

    this._addFeaturesLayerResultInteraction.interaction = null;
    this._addFeaturesLayerResultInteraction.id = null;

    // check if query map control is toggled and registered
    if (toggle && this._addFeaturesLayerResultInteraction.mapcontrol) {
      this._addFeaturesLayerResultInteraction.mapcontrol.toggle(true);
    }

    this._addFeaturesLayerResultInteraction.mapcontrol = null;

    if (this._addFeaturesLayerResultInteraction.toggleeventhandler) {
      this.mapService.off('mapcontrol:toggled', this._addFeaturesLayerResultInteraction.toggleeventhandler);
    }

    this._addFeaturesLayerResultInteraction.toggleeventhandler = null;
  }

  /**
   * Adds feature to Features layer results
   *
   * @param layer
   */
  addLayerFeaturesToResultsAction(layer) {

    // Check if layer is current layer to add or clear previous
    if (
      null !== this._addFeaturesLayerResultInteraction.id &&
      layer.id !== this._addFeaturesLayerResultInteraction.id
      ) {

      const layer = this.state.layers.find(layer => layer.id === this._addFeaturesLayerResultInteraction.id);
      if (layer) {
        layer.addfeaturesresults.active = false;
      }

      // remove previous add result interaction
      if (this._addFeaturesLayerResultInteraction.interaction) {
        this.mapService.removeInteraction(this._addFeaturesLayerResultInteraction.interaction);
      }

    }

    this._addFeaturesLayerResultInteraction.id = layer.id;

    layer.addfeaturesresults.active = !layer.addfeaturesresults.active;

    if (layer.addfeaturesresults.active) {

      this.activeMapInteraction(); // useful to send an event
      const external_layer = this._getExternalLayer(layer.id);

      if (false === this._addFeaturesLayerResultInteraction.mapcontrol) {
        this._addFeaturesLayerResultInteraction.mapcontrol = this.mapService.getCurrentToggledMapControl();
      }

      this._addFeaturesLayerResultInteraction.interaction = new PickCoordinatesInteraction();

      this.mapService.addInteraction(this._addFeaturesLayerResultInteraction.interaction, { close: false });

      this._addFeaturesLayerResultInteraction.interaction.on('picked', async (evt) => {
        if (external_layer) {
          this.setQueryResponse(
            {
              data: [
                this.getVectorLayerFeaturesFromQueryRequest(
                  this._vectorLayers.find(vectorLayer => layer.id === vectorLayer.get('id')),
                  { coordinates: evt.coordinate }
                )
              ],
              query: {
                coordinates: evt.coordinate
              }
            },
            { add: true }
          );
        } else {
          await DataRouterService.getData(
            'query:coordinates',
            {
              inputs: {
                coordinates: evt.coordinate,
                query_point_tolerance: this._project.getQueryPointTolerance(),
                layerIds: [layer.id],
                multilayers: false,
              },
              outputs: {
                show: {
                  add: true
                }
              }
            }
          );
        }
      });

      this._addFeaturesLayerResultInteraction.toggleeventhandler = (evt) => {
        if (evt.target.isToggled() && evt.target.isClickMap()) {
          layer.addfeaturesresults.active = false;
        }
      };

      this.mapService.once('mapcontrol:toggled', this._addFeaturesLayerResultInteraction.toggleeventhandler);

    } else {
      this.removeAddFeaturesLayerResultInteraction({ toggle: true });
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
   * @FIXME add description
   * @param options Object
   */
  clearState(options = {}) {
    this.state.layers.splice(0);
    this.state.query = null;
    this.state.querytitle = "";
    this.state.changed = false;
    // clear action if present
    Object.values(this.state.layersactions)
      .forEach(layeractions =>
        layeractions.forEach(action => action.clear && action.clear())
      );
    this.state.layersactions = {};
    this.state.actiontools = {};
    this.state.layeractiontool = {};
    // current action tools
    this.state.currentactiontools = {};
    this.state.layersFeaturesBoxes = {};
    this.removeAddFeaturesLayerResultInteraction();
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
   * @FIXME add description
   */
  reset() {
    this.clearState();
  }

  /**
   * Converts response from DataProvider into a QueryResult component data structure
   *
   * @param featuresForLayers: Array contains for each layer features
   *
   * @returns {[]}
   */
  _digestFeaturesForLayers(featuresForLayers = []) {
    const layers = [];
    /**
     * @TODO find out why we need such a level of depth (ie. a nested foreach + triple variables named `featuresForLayer` ?)
     */
    featuresForLayers.forEach(featuresForLayer => {
      (
        Array.isArray(featuresForLayer)
        ? featuresForLayer
        : [featuresForLayer]
      ).forEach(featuresForLayer => {
        const layer = this._handleFeatureForLayer(featuresForLayer);
        if (layer) {
          layers.push(layer)
        }
      });
    });
    return layers;
  }

  /**
   * Convert response from server
   *
   * @param featuresForLayer
   *
   * @since 3.9.0
   */
  _handleFeatureForLayer(featuresForLayer) {
    const layerObj = {
      editable: false,
      inediting: false,
      downloads: [],
      infoformats: [],
      filter: {},
      selection: {},
      external: false,
      source: undefined,
      infoformat: undefined,
      formStructure: undefined,
      attributes: [],
      features: [],
      hasgeometry: false,
      show: true,
      addfeaturesresults: {
        active:false
      },
      [DownloadFormats.name]: {
        active: false
      },
      expandable: true,
      hasImageField: false,
      error: '',
      rawdata: null, // rawdata response
      loading: false,
    };

    const layer = featuresForLayer.layer;

    let layerAttributes,
      layerRelationsAttributes,
      layerTitle,
      layerId,
      sourceType;

    let extractRelations = false;

    if (layer instanceof Layer) {
      layerObj.editable    = layer.isEditable();
      layerObj.inediting   = layer.isInEditing();
      layerObj.source      = layer.getSource();
      layerObj.infoformats = layer.getInfoFormats();
      layerObj.infoformat  = layer.getInfoFormat();

      // set selection filter and relation if not wms
      if (-1 === [
          Layer.SourceTypes.WMS,
          Layer.SourceTypes.WCS,
          Layer.SourceTypes.WMST
        ].indexOf(layer.getSourceType())
        ) {
        layerObj.filter    = layer.state.filter;
        layerObj.selection = layer.state.selection;
        extractRelations   = true;
      }

      layerObj.downloads = layer.getDownloadableFormats();

      try { sourceType = layer.getSourceType() } catch(err) {}

      layerRelationsAttributes = [];
      layerTitle               = layer.getTitle();
      layerId                  = layer.getId();
      layerAttributes          = ('ows' === this.state.type) /* sanitize attributes layer only if is ows */
                                    ? layer.getAttributes().map(attribute => {
                                        const sanitizeAttribute = {...attribute};
                                        sanitizeAttribute.name = sanitizeAttribute.name.replace(/ /g, '_');
                                        return sanitizeAttribute
                                      })
                                    : layer.getAttributes();

      if (layer.hasFormStructure()) {
        const structure = layer.getLayerEditingFormStructure();
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
        layerObj.formStructure = {
          structure,
          fields: layer.getFields().filter(field => field.show), // get features show
        };
      }
    } else if (layer instanceof ol.layer.Vector) {
      layerObj.selection       = layer.selection;
      layerAttributes          = layer.getProperties();
      layerRelationsAttributes = [];
      layerTitle               = layer.get('name');
      layerId                  = layer.get('id');
      layerObj.external        = true;
    } else if ('string' === typeof layer || layer instanceof String) {
      const feature            = featuresForLayer.features[0];
      const split_layer_name   = layer.split('_');
      sourceType               = Layer.LayerTypes.VECTOR;
      layerAttributes          = (feature ? feature.getProperties() : []);
      layerRelationsAttributes =  [];
      layerId                  = layer;
      layerObj.external        = true;
      layerTitle               = (split_layer_name.length > 4)
                                    ? split_layer_name.slice(0, split_layer_name.length -4).join(' ')
                                    : layer;
    }

    //set other properties for layerObj

    layerObj.title               = layerTitle;
    layerObj.id                  = layerId;
    layerObj.atlas               = this.getAtlasByLayerId(layerId);
    layerObj.relationsattributes = layerRelationsAttributes;

    /** @FIXME add description */
    if (featuresForLayer.rawdata) {
      layerObj.rawdata = featuresForLayer.rawdata;
      return layerObj;
    }

    /** @FIXME add description */
    if (featuresForLayer.features && featuresForLayer.features.length) {
      const layerSpecialAttributesName =
        (layer instanceof Layer)
          ? layerAttributes.filter(attribute => {
              try {
                return ('_' === attribute.name[0] || Number.isInteger(1*attribute.name[0]))
              } catch(e) {
                return false;
              }
            }).map(attribute => ({ alias: attribute.name.replace(/_/, ''), name: attribute.name }))
          : [];
      if (layerSpecialAttributesName.length) {
        featuresForLayer.features
          .forEach(feature => this._setSpecialAttributesFeatureProperty(layerSpecialAttributesName, feature));
      }
      layerObj.attributes = this._parseAttributes(layerAttributes, featuresForLayer.features[0], sourceType);
      layerObj.attributes
        .forEach(attribute => {
          if (layerObj.formStructure) {
            const relationField = layer.getFields().find(field => field.name === attribute.name); // need to check all field also show false
            if (!relationField) {
              layerObj.formStructure.fields.push(attribute);
            }
          }
          if (attribute.type === 'image') {
            layerObj.hasImageField = true;
          }
        });
      featuresForLayer.features
        .forEach(feature => {
          const props = this.getFeaturePropertiesAndGeometry(feature);
          if (props.geometry) {
            layerObj.hasgeometry = true;
          }
          layerObj.features
            .push({
              id: layerObj.external ? feature.getId() : props.id,
              attributes: props.properties,
              geometry: props.geometry,
              selection: props.selection,
              show: true
            });
        });
      return layerObj;
    }

    /** @FIXME missing return type ? */
    /** @FIXME add description */
    if (featuresForLayer.error) {
      layerObj.error = featuresForLayer.error;
    }

  }

  /**
   * Set special attributes
   *
   * @param layerSpecialAttributesName
   * @param feature
   */
  _setSpecialAttributesFeatureProperty(layerSpecialAttributesName=[], feature) {
    if (layerSpecialAttributesName.length === 0) {
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

    // case query coordinates
    if (coordinates && Array.isArray(coordinates)) {
      const pixel = this.mapService.viewer.map.getPixelFromCoordinate(coordinates);
      this.mapService.viewer.map.forEachFeatureAtPixel(
        pixel,
        (feature, layer) => { features.push(feature); },
        { layerFilter(layer) { return layer === vectorLayer; } }
      );
    }

    // TODO: rewrite this in order to avoid nested else-if conditions
    else {

      // case query bbox
      if (bbox && Array.isArray(bbox)) {
        //set geometry has Polygon
        geometry = ol.geom.Polygon.fromExtent(bbox);
      }

      // check query geometry (Polygon or MultiPolygon)
      if (geometry instanceof ol.geom.Polygon || geometry instanceof ol.geom.MultiPolygon) {
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
    }

    return {
      features,
      layer: vectorLayer
    };

  }

  /**
   * @TODO add description (eg. what is a vector layer ?)
   */
  _addVectorLayersDataToQueryResponse(queryResponse) {
    const catalogService = GUI.getService('catalog');

    /** @type { boolean | undefined } */
    const isExternalFilterSelected = queryResponse.query.external.filter.SELECTED;

    // add visible layers to query response (vector layers)
    this._vectorLayers
      .forEach(layer => {
        const isLayerSelected  = catalogService.isExternalLayerSelected({ id: layer.get('id'), type: 'vector' });
        if (
          layer.getVisible() && ( // TODO: extract this into `layer.isSomething()` ?
                                  (true === isLayerSelected  && true === isExternalFilterSelected) ||
                                  (false === isLayerSelected && false === isExternalFilterSelected) ||
                                  ("undefined" === typeof isExternalFilterSelected)
                                )
        ) {
          queryResponse.data.push(this.getVectorLayerFeaturesFromQueryRequest(layer, queryResponse.query));
        }
      });
  }

  /**
   * Add custom component in query result
   *
   * @param component
   */
  _addComponent(component) {
    this.state.components.push(component)
  }

  /**
   *  @FIXME add description
   */
  _printSingleAtlas({
    atlas    = {},
    features = [],
  } = {}) {

    // TODO: make it easier to understand.. (what variables are declared? which ones are aliased?)
    let {
      name:  template,
      atlas: { field_name = '' }
    } = atlas;

    field_name = field_name || '$id';

    const values = features.map(feat => feat.attributes['$id' === field_name ?  G3W_FID : field_name]);
    const download_caller_id = ApplicationService.setDownload(true);

    return this.printService
      .printAtlas({
        field: field_name,
        values,
        template,
        download: true
      })
      .then(({url}) => {
        downloadFile({ url, filename: template, mime_type: 'application/pdf' })
          .catch(error => { GUI.showUserMessage({ type: 'alert', error }) })
          .finally(() => { ApplicationService.setDownload(false, download_caller_id); GUI.setLoadingContent(false); });
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
    features = features
                ? Array.isArray(features)
                  ? features
                  : [features]
                : features;
    const {
      query = {}
    } = this.state;
    const fids = features.map(feature => feature.attributes[G3W_FID]).join(',');
    const data = { fids };

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
      const download_caller_id = ApplicationService.setDownload(true);
      GUI.setLoadingContent(true);
      try {
        await CatalogLayersStoresRegistry.getLayerById(layer.id).getDownloadFilefromDownloadDataType(type, { data }) || Promise.resolve();
      } catch(err) {
        GUI.notify.error(err || t("info.server_error"));
      }
      ApplicationService.setDownload(false, download_caller_id);
      GUI.setLoadingContent(false);
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

    if ('polygon' !== query.type) {
      runDownload();
    } else { // check if multi-download if present
      const downloadsactions = this.state.layersactions[layer.id].find(action => action.id === 'downloads');
      let {
        fid,
        layer:polygonLayer
      } = query;
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
        // choose between only feature attribute or also polygon attibute
        download: (type) => {
          if ('polygon' === type) { // id type polygon add paramateres to api download
            data.sbp_qgs_layer_id = polygonLayer.getId();
            data.sbp_fid = fid;
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
      if(1 === features.length) {
        this.state.actiontools[QueryPolygonCsvAttributesComponent.name] = this.state.actiontools[layer.id] || {};
        this.state.actiontools[QueryPolygonCsvAttributesComponent.name][layer.id] = config;
        this.setCurrentActionLayerFeatureTool({ layer, index, action, component: QueryPolygonCsvAttributesComponent });
      } else {
        /** @FIXME add description */
        if (undefined === downloadsactions) {
          layer[type].active = !layer[type].active;

          /** @FIXME add description */
          if (layer[type].active) {
            this.setLayerActionTool({ layer, component: QueryPolygonCsvAttributesComponent, config });
          } else {
            /** @FIXME add description */
            this.setLayerActionTool({ layer });
          }
        } else {
          /** @FIXME add description */
          this.setLayerActionTool({ layer, component: QueryPolygonCsvAttributesComponent, config });
        }
      }
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
   *
   * @param layer
   */
  clearSelectionExtenalLayer(layer) {
    layer.selection.active = false;
    const action = (
      this.state.layersactions[layer.id] &&
      this.state.layersactions[layer.id].find(action => action.id === 'selection')
    );
    layer.selection.features
      .forEach((feature, index) => {
        if (feature.selection.selected) {
          feature.selection.selected = false;
          if (action) {
            action.state.toggled[index] = false;
          }
          this.mapService.setSelectionFeatures('remove', { feature });
        }
      });
  }

  /**
   * @FIXME add description
   */
  unlistenerEventsActions() {
    this.unlistenerlayeractionevents.forEach(obj => obj.layer.off(obj.event, obj.handler));
    this.unlistenerlayeractionevents = [];
  }

  /**
   * @FIXME add description
   *
   * @param layer
   */
  addRemoveFilter(layer) {
    CatalogLayersStoresRegistry.getLayerById(layer.id).toggleFilterToken();
  }

  /**
   * @FIXME add description
   *
   * @param layer
   */
  selectionFeaturesLayer(layer) {
    const action = this.state.layersactions[layer.id].find(action => action.id === 'selection');
    const bool   = Object.values(action.state.toggled).reduce((acculmulator, value) => acculmulator && value, true);
    const _layer = layer.external ? layer : CatalogLayersStoresRegistry.getLayerById(layer.id);
    layer.features.forEach((feature, index) => {
      action.state.toggled[index] = !bool;
      this._addRemoveSelectionFeature(_layer, feature, index, bool ? 'remove' : 'add');
    })
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param feature
   * @param index
   * @param force
   */
  async _addRemoveSelectionFeature(layer, feature, index, force) {
    //get feature if from feature
    const fid = feature ? this._getFeatureId(feature, layer.external): null;
    /**
     * In case of external layer (vector) added by add external layer tool
     */
    if (undefined !== "undefined" && layer.external) {

      /** @FIXME add description */
      if (undefined === layer.selection.features) {
        layer.selection.features = {};
      }

      /** @FIXME add description */
      if (undefined !== layer.selection.features.find(selectionFeature => selectionFeature.getId() === fid)) {
        /***
         * Feature used in selection tool action
         */
        const selectionFeature = createFeatureFromFeatureObject({
          feature,
          id: fid
        });
        selectionFeature.__layerId = layer.id;
        selectionFeature.selection = feature.selection;
        layer.selection.features.push(selectionFeature);
      }

      /** @FIXME add description */
      if (
        (force === 'add' && feature.selection.selected) ||
        (
          (force === 'remove') &&
          (false === feature.selection.selected)
        )
      ) {
          return;
      }
      /** @FIXME add description */
      else {
        feature.selection.selected = !feature.selection.selected;
      }
      /** @FIXME add description */
      this.mapService.setSelectionFeatures(feature.selection.selected ? 'add' : 'remove', {
        feature: layer.selection.features.find(selectionFeature => fid === selectionFeature.getId())
      });
      /*
      * Set selection layer active based on features selection selected properties
       */
      layer.selection.active = layer.selection.features.reduce((accumulator, feature) => accumulator || feature.selection.selected, false)
    } else { // case of project layer on TOC

      const hasAlreadySelectioned = layer.getFilterActive() || layer.hasSelectionFid(fid);

      if (false === hasAlreadySelectioned) {
        if (feature && feature.geometry && !layer.getOlSelectionFeature(fid)) {
          layer.addOlSelectionFeature({
            id: fid,
            feature
          })
        }
      }
      /** @FIXME add description */
      if (undefined === force) {
        layer[hasAlreadySelectioned ? 'excludeSelectionFid': 'includeSelectionFid'](fid);
      } else {
        /** @FIXME add description */
        if (false === hasAlreadySelectioned && force === 'add') {
          await layer.includeSelectionFid(fid);
        }
        /** @FIXME add description */
        if (hasAlreadySelectioned && force === 'remove') {
          await layer.excludeSelectionFid(fid);
        }
      }

      /** @FIXME add description */
      if (layer.getFilterActive()) {
        const currentLayer = this.state.layers.find(_layer => _layer.id === layer.getId());
        /** @FIXME add description */
        if (layer.getSelectionFids().size > 0) {
          currentLayer && currentLayer.features.splice(index, 1);
        }
        this.mapService.clearHighlightGeometry();
        this.state.layers.length === 1 && !this.state.layers[0].features.length && this.state.layers.splice(0);
      }
    }

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
      action.state.toggled[index] = (
        CatalogLayersStoresRegistry
            .getLayerById(layer.id)
            .getFilterActive() ||
        CatalogLayersStoresRegistry
            .getLayerById(layer.id)
            .hasSelectionFid(feature ? this._getFeatureId(feature, layer.external): null)
      );
    }
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param feature
   * @param action
   * @param index
   */
  addToSelection(layer, feature, action, index) {
    const external = this._getExternalLayer(layer.id) || false;
    action.state.toggled[index] = !action.state.toggled[index];
    this._addRemoveSelectionFeature(
      (external ? layer : CatalogLayersStoresRegistry.getLayerById(layer.id)),
      feature,
      index
    );
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
    return features.map(feature => this._getFeatureId(feature));
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
   * Add feature from layer
   *
   * @since 3.9.0
   */
  _addFeatureFromLayer(layer, feature) {
    layer.features.push(feature);
  }
  /**
   * Remove feature from layer
   *
   * @since 3.9.0
   */
  _removeFeatureFromLayer(layer, feature, external) {
    layer.features = layer.features.filter(f => this._getFeatureId(f, external) !== this._getFeatureId(feature, external));
    return layer.features;
  }

  /**
   * @since 3.9.0
   */
  _toggleLayerFeatureBox(layer, feature, collapsed) {
    const boxId = this.getBoxId(layer, feature);
    if (boxId && this.state.layersFeaturesBoxes[boxId]) {
      setTimeout(() => this.state.layersFeaturesBoxes[boxId].collapsed = collapsed); // due to vue reactivity, wait a little bit before update layers
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
        state,
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
            const downloadsaction = this.state.layersactions[layer.id].find(action => action.id === 'downloads');
            if (this.state.query.type !== 'polygon') downloadsaction.cbk(layer, feature, downloadsaction, index);
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
        style: {color: 'red'},
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
        id: 'selection',
        download: false,
        class: GUI.getFontClass('success'),
        hint: 'sdk.mapcontrols.query.actions.add_selection.hint',
        state: this.createActionState({ layer }),
        init: ({feature, index, action}={}) => {
          if("undefined" !== typeof layer.selection.active) {
            this.checkFeatureSelection({ layer, index, feature, action })
          }
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
 * Core methods used from other classes to react before or after its call
 */
QueryResultsService.prototype.setters = {

  /**
   * Hook method called when response is handled by Data Provider
   *
   * @param queryResponse
   * @param {{ add: boolean }} options `add` is used to know if is a new query request or add/remove query request
   */
  setQueryResponse(queryResponse, options = { add: false }) {

    // set mandatory queryResponse fields
    if (!queryResponse.data)           queryResponse.data           = [];
    if (!queryResponse.query)          queryResponse.query          = { external: { add: false, filter: { SELECTED: false } } };
    if (!queryResponse.query.external) queryResponse.query.external = { add: false, filter: {SELECTED: false }};

    // whether add response to current results using addLayerFeaturesToResultsAction
    if (false === options.add) {

      // in case of new request results reset the query otherwise maintain the previous request
      this.clearState();
      this.state.query = queryResponse.query;
      this.state.type  = queryResponse.type;

      // if true add external layers to response
      if (true === queryResponse.query.external.add) {
        this._addVectorLayersDataToQueryResponse(queryResponse);
      }

      switch (this.state.query.type) {
        case 'coordinates': this.showCoordinates(this.state.query.coordinates); break;
        case 'bbox':        this.showBBOX(this.state.query.bbox); break;
        case 'polygon':     this.showGeometry(this.state.query.geometry); break;
      }

    }

    this.setLayersData(this._digestFeaturesForLayers(queryResponse.data), options);

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
      this._orderResponseByProjectLayers(layers);
    }
    // get features from add pick layer in case of a new request query
    layers.forEach(layer => { options.add ? this.updateLayerResultFeatures(layer) : this.state.layers.push(layer); });
    this.setActionsForLayers(layers, { add: options.add });
    this.state.changed = true;
  },

  /**
   * Method used to add custom component
   *
   * @param component
   */
  addComponent(component) {
    this._addComponent(component)
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
   * @FIXME add description
   *
   * @param layer
   */
  changeLayerResult(layer) {
    this._changeLayerResult(layer);
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
  openCloseFeatureResult({open, layer, feature, container}={}) {}

};


module.exports = QueryResultsService;