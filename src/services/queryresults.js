/**
 * @file ORIGINAL SOURCE: src/app/gui/queryresults/queryresultsservice.js@v3.10.2
 * @since 3.11.0
 */

import { VM }                                   from 'g3w-eventbus';
import GUI                                      from 'services/gui';
import { G3W_FID }                              from 'g3w-constants';
import G3WObject                                from 'g3w-object';
import Component                                from 'g3w-component';
import PickCoordinatesInteraction               from 'map/interactions/pickcoordinatesinteraction';

import ApplicationState                         from 'store/application';

import DataRouterService                        from 'services/data';

import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';
import { intersects }                           from 'utils/intersects';
import { within }                               from 'utils/within';
import { printAtlas }                           from 'utils/printAtlas';
import { saveBlob }                             from 'utils/saveBlob';
import { throttle }                             from 'utils/throttle';
import { getUniqueDomId }                       from 'utils/getUniqueDomId';
import { getCatalogLayerById }                  from 'utils/getCatalogLayerById';

import { Layer }                                from 'map/layers/layer';
import { VectorLayer }                          from 'map/layers/vectorlayer';
import { gettext as _ }                         from 'g3w-i18n';

function _setRelationField(node) {
  if (node.nodes) {
    for (const _node of node.nodes) {
      _setRelationField(_node);
    }
  } else if (node.name) {
    node.relation = true;
  }
}

export default new (class QueryResultsService extends G3WObject {

  constructor() {

    super();

    /**
     * Core methods used from other classes to react before or after its call
     */
    this.setters = [
      'setQueryResponse',
      'setLayersData',
      'addComponent',
      'addActionsForLayers',
      'postRender',
      'closeComponent',
      'changeLayerResult',
      'activeMapInteraction',
      'editFeature',
      'openCloseFeatureResult',
      'removeFeatureLayerFromResult',
    ];

    /**
     * @FIXME add description
     */
    this.unlistenerlayeractionevents = [];

    /**
     * <Object> to store relations (key is referenceLayer of relation)
     */
    this._relations = {};

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

      logged: undefined !== ApplicationState.user.id,

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
      actiontools: {},

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
      layerscustomcomponents: {}

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
      todo:                      () => {},
      zoomToLayerFeaturesExtent: { async: false },
      highLightLayerFeatures:    { async: false },
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
      style: feat => new ol.style.Style('Point' === feat.getGeometry().getType()
        ? { text:   new ol.style.Text({ fill: new ol.style.Stroke({ color: 'black' }), text: '\uf3c5', font: '900 3em "Font Awesome 5 Free"', offsetY : -15 }) }
        : { stroke: new ol.style.Stroke({ color: 'black' }) }
      )
    });

    /**
     * Current project <Project>
     */
    this._project = ApplicationState.project;

    /**
     * Keep the right order for a query result based on TOC order layers
     */
    this._projectLayerIds = (() => {
      const layersId = [];
      const traverse = tree => {
        (tree.nodes || [tree]).forEach(n => {
          if (n.id) { layersId.push(n.id) }
          else { traverse(n) }
        });
      };
      this._project.state.layerstree.forEach(traverse);
      return layersId;
    })()

    /**
     * @FIXME add description
     */
    this._setRelations(this._project);

    /**
     * @FIXME add description
     */
    this._atlas = this._project.getPrint().filter(p => p.atlas) || [];

    /**
     * @FIXME add description
     */
    GUI.onbefore('setContent', (options) => {
      if (100 === options.perc && GUI.isMobile()) {
        this._asyncFnc.zoomToLayerFeaturesExtent.async = true;
        this._asyncFnc.highLightLayerFeatures.async    = true;
        this._asyncFnc.goToGeometry.async              = true;
      }
    });

  }

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
   * 
   * @since 4.0.0
   */
  setQueryResponse(queryResponse, options = { add: false, update: false }) {
    // set mandatory queryResponse fields
    if (!queryResponse.data)           queryResponse.data           = [];
    if (!queryResponse.query)          queryResponse.query          = { external: { add: false, filter: { SELECTED: false } } };
    if (!queryResponse.query.external) queryResponse.query.external = { add: false, filter: { SELECTED: false }};


    if (false === options.add && !!options.update) {
      // in case of new request results reset the query otherwise maintain the previous request
      this.state.query      = queryResponse.query;
      this.state.type       = queryResponse.type;
    }
    // whether add response to current results using addLayerFeaturesToResultsAction
    if (false === options.add && !options.update) {
      // in case of new request results reset the query otherwise maintain the previous request
      this.clearState();
      this.state.query      = queryResponse.query;
      this.state.type       = queryResponse.type;
    }
    // whether add external layers to response
    if (true === queryResponse.query.external.add && false === options.add) {
      const catalog = GUI.getService('catalog');

      /** @type { boolean | undefined } */
      const FILTER_SELECTED = queryResponse.query.external.filter.SELECTED;
  
      // add visible layers to query response (vector layers)
      this._vectorLayers.forEach(layer => {
        const id = layer.get('id');
        // TODO: extract this into `layer.isSomething()` ?
        if (
          layer.getVisible()
          && [undefined, !!(catalog.state.external.vector.find(l => l.id === id) || {}).selected].includes(FILTER_SELECTED)
        ) {
          queryResponse.data[
            '__g3w_marker' === id // keep geocoding control "marker" layer at the top
            ? 'unshift'
            : 'push'
          ](this.getVectorLayerFeaturesFromQueryRequest(layer, queryResponse.query));
        }
      });
    }

    const geom = false === options.add && ({
      'coordinates': 2 === (this.state.query.coordinates || []).length && new ol.geom.Point(this.state.query.coordinates),
      'bbox':        4 === (this.state.query.bbox || []).length        && ol.geom.Polygon.fromExtent(this.state.query.bbox),
      'polygon':     this.state.query.geometry,
      'drawpolygon': this.state.query.geometry,
      'circle':      this.state.query.geometry,
    })[this.state.query.type];

    // show a query result on map
    if (geom) {
      const feature = new ol.Feature(geom);
      feature.setId(undefined);
      this.resultsQueryLayer.getSource().clear();
      GUI.getService('map').getMap().removeLayer(this.resultsQueryLayer);
      this.resultsQueryLayer.getSource().addFeature(feature);
      GUI.getService('map').getMap().addLayer(this.resultsQueryLayer);
      this.resultsQueryLayer.setZIndex(GUI.getService('map').getMap().getLayers().getLength()); // ensure layer is on top of others
    }

    // Convert response from DataProvider into a QueryResult component data structure
    // Skip when the layer has no features or rawdata is undefined (external wms)
    const layers = queryResponse.data
      .flatMap(d => [].concat(d))
      .filter(d => d && (undefined !== d.rawdata || (Array.isArray(d.features) && d.features.length > 0)))
      .map(({
        layer,
        features,
        rawdata, // rawdata response
        error
      } = {}) => {

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
            console.warn('uknown source type for layer:', error, layer);
          }
        }
        
        const name = is_string && layer.split('_');

        const id = (is_layer ? layer.getId() : undefined) ||
          (is_vector ? layer.get('id') : undefined) ||
          (is_string ? layer : undefined);

        let attributes;
        let layerAttrs;

        // sanity check (eg. external layers ?)
        if (!features || !features.length) {
          attributes = [];
        }
    
        // Sanitize OWS Layer attributes
        if (!attributes && layer instanceof Layer) {
          layerAttrs = layer.getAttributes().map(attr => 'ows' === this.state.type ? ({ ...attr, name: attr.name.replace(/ /g, '_') }) : attr);
        }
    
        if (!attributes && layer instanceof ol.layer.Vector) {
          layerAttrs = layer.getProperties();
        }
    
        if (!attributes && 'string' === typeof layer || layer instanceof String) {
          layerAttrs = (features[0] ? features[0].getProperties() : [])
        }
    
        const specialAttrs = (!attributes && layer instanceof Layer && layerAttrs || []).filter(attr => {
            try {
              return ('_' === attr.name[0] || Number.isInteger(1 * attr.name[0]))
            } catch(e) {
              return false;
            }
          }).map(attr => ({ alias: attr.name.replace(/_/, ''), name: attr.name }));
    
        if (!attributes && specialAttrs.length) {
          features.forEach(f => {
            // get attributes special keys from feature properties received by server request
            const attrs = Object.keys(f.getProperties());
            specialAttrs.forEach(layerAttr => {
              attrs.find(attr => {
                if (attr === layerAttr.alias) {
                  f.set(layerAttr.name, f.get(attr));
                  return true
                }
              })
            });
          });
        }
    
        // Parse attributes to show on a result based on field
    
        let attrs = !attributes && getAlphanumericPropertiesFromFeature(
          Object.keys(features[0] instanceof ol.Feature ? features[0].getProperties() : features[0].properties)
        );
    
        if (!attributes) {
          attributes = (layerAttrs && layerAttrs.length > 0)
            ? layerAttrs.filter(attr => attrs.includes(attr.name))
            : attrs.map(featureAttr => ({
              name:  featureAttr,
              label: featureAttr,
              show:  G3W_FID !== featureAttr && [undefined, 'gdal', 'wms', 'wcs', 'wmst', 'postgresraster'].includes(sourceType),
              type:  'varchar'
            }));
        }

        const external   = (is_vector || is_string);
        const structure  = is_layer && layer.hasFormStructure() && layer.getLayerEditingFormStructure();

        if (structure && Array.isArray(this._relations[layer.getId()]) && this._relations[layer.getId()].length > 0) {
          for (const node of structure) {
            _setRelationField(node);
          }
        }
        
        // layerObj
        return {
          id,
          attributes,
          external,
          features: (!rawdata && features || []).map(f => ({
            id:         external ? f.getId() : (f instanceof ol.Feature ? f.getId() : f.id),
            attributes: f instanceof ol.Feature ? f.getProperties() : f.properties,
            geometry:   f instanceof ol.Feature ? f.getGeometry()   : f.geometry,
            selection:  { selected: !external && (!!queryResponse.query.autofilter || layer.state.filter.active || layer.hasSelectionFid((f instanceof ol.Feature ? f.getId() : f.id)))}, //@since 3.11.8 check if autofilter is set
            show:       true,
          })),
          hasgeometry:            Array.isArray(features) && !rawdata && features.some(f => f instanceof ol.Feature ? f.getGeometry() : f.geometry),
          hasImageField:          Array.isArray(features) && !rawdata && features.length && attributes.some(attr => 'image' === attr.type),
          loading:                false,
          show:                   true,
          expandable:             true,
          addfeaturesresults:     { active: false },
          downloadformats:        { active: false },
          editable:               is_layer   ? layer.isEditable() && layer.config.editing.visible : false,
          inediting:              is_layer   ? layer.isInEditing()                                : false,
          source:                 is_layer   ? layer.getSource()                                  : undefined,
          infoformat:             is_layer   ? layer.getInfoFormat()                              : undefined,
          infoformats:            is_layer   ? layer.getInfoFormats()                             : [],
          downloads:              is_layer   ? layer.getDownloadableFormats()                     : [],
          formStructure:          structure  ? {
            structure,
            // get field show
            fields: layer.getFields().filter(f => f.show).concat(
              (Array.isArray(features) && !rawdata && features.length > 0 && attributes || []).filter(attr => layer.getFields().some(f => f.name === attr.name))
            ),
          } : undefined,
          relationsattributes:       (is_layer || is_vector || is_string)                       ? []                     : undefined,
          hasdownloadablerelations:  !external && layer.hasDowloadableRelations(), //@since 3.11.7
          filter:                    (is_layer && !['wms', 'wcs', 'wmst'].includes(sourceType)) ? layer.state.filter     : {},
          selection:                 (is_layer && !['wms', 'wcs', 'wmst'].includes(sourceType) && layer.state.selection) || (is_vector && layer.selection) || { active: false },
          title:                     (is_layer && layer.getTitle()) || (is_vector && layer.get('name')) || (is_string && name && (name.length > 4 ? name.slice(0, name.length - 4).join(' ') : layer)) || undefined,
          atlas:                     this._atlas.filter(a => a.atlas.qgs_layer_id === id),
          rawdata:                   rawdata  || null,
          error:                     error    || '',
          toc:                       external || layer.state.toc, //@since v3.10.0
          max_preview_fields:        layer.state?.max_preview_fields || 3, //@since 4.0.0 
        };
      });
    this.setLayersData(layers, options);
  }

  /**
   * Setter method called when adding layer and feature for response
   *
   * @param layers
   * @param options
   */
  setLayersData(layers = [], options = { add: false, update: false }) {
    // sort layers as Catalog project layers (external layer always on bottom)
    if (false === options.add) {
      layers.sort((a, b) => a.external ? 0 : (this._projectLayerIds.indexOf(a.id) > this._projectLayerIds.indexOf(b.id) ? 1 : -1));
    }
    // get features from added pick layer in case of a new request query
    layers.forEach((l, index) => {
      // whether result comes from pagination or previous requestis a filter pagination (case search with autofilter)
      l.filter.pagination = l.filter.active && (l.filter.pagination || !!(this.state.query?.pagination?.paginate?.at(index)));
      if (options.add || options.update) {
        this.updateLayerResultFeatures(l, options.update);
      } else {
        this.state.layers.push(l);
      }
    });
    this.setActionsForLayers(layers, { add: options.add, update: options.update });
    this.state.changed = true;
  }

  /**
   * Add custom component in query result
   *
   * @param component
   * 
   * @since 4.0.0
   */
  addComponent(component) {
    this.state.components.push(component)
  }

  /**
   * @FIXME add description
   *
   * @param actions
   * @param layers
   * 
   * @since 4.0.0
   */
  addActionsForLayers(actions, layers) {}

  /**
   * @FIXME add description
   *
   * @param element
   * 
   * @since 4.0.0
   */
  postRender(element) {}

  /**
   * @FIXME add description
   * 
   * @since 4.0.0
   */
  closeComponent() {}

  /**
   * Called when layer result features is changed
   *
   * @param layer
   * 
   * @since 4.0.0
   */
  changeLayerResult(layer) {
    this.state.layersactions[layer.id].forEach(action => action.change && action.change(layer));  // call if present change method to action
    // reset layer current actions tools
    (layer.features || []).forEach((_, idx) => {
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
   * 
   * @since 4.0.0
   */
  activeMapInteraction() {}

  /**
   * Setter method related to relation table
   * 
   * @since 4.0.0
   */
  editFeature({layer, feature}={}) {}

  /**
   * Setter method called when opening/closing feature info data content.
   *
   * @param opts.open
   * @param opts.layer
   * @param opts.feature
   * @param opts.container
   * 
   * @since 4.0.0
   */
  openCloseFeatureResult({open, layer, feature, container}={}) {}

  /**
   * Remove a feature from current layer result
   *
   * @param layer
   * @param feature
   * 
   * @since 4.0.0
   */
  removeFeatureLayerFromResult(layer, feature) {
    this.updateLayerResultFeatures({ id: layer.id, external: layer.external, features: [feature] });
  }

  /**
   * used by the following plugins: "qplotly"
   */
  addLayersPlotIds(layerIds = []) {
    this.plotLayerIds = layerIds;
  }

  /**
   * used by the following plugins: "br-service"
   * 
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
   * Loop over response features based on layer response and
   * check if features layer needs to be added or removed to
   * current `state.layers` results.
   *
   * @param responseLayer layer structure coming from request
   * @param replace    @since 3.11.0 mean replace current state layer features
   *
   * @since 3.8.0
   */
  updateLayerResultFeatures(responseLayer, replace = false) {
    const layer            = this.state.layers.find(l => l.id === responseLayer.id);                // get layer from current `state.layers` showed on a result
    const responseFeatures = responseLayer.features || [];                                            // extract features from responseLayer object
    const external         = (layer || {}).external; // get id of external layer or not (`external` is a layer added by mapcontrol addexternlayer)
    const has_features     = layer && (layer.features || []).length > 0;                              // check if the current layer has features on response
    if (has_features) {
      const features_ids = replace ? [] : layer.features.map(f => this._getFeatureId(f, external)) // get features id from current layer on a result
      //get action selection;
      const action = this.state.layersactions[layer.id].find(a => 'selection' === a.id);
      if (replace) {
        layer.features.forEach(f => delete this.state.layersFeaturesBoxes[this.getBoxId(layer, f)]);
        layer.features.splice(0);
      }
      responseFeatures.forEach((feat, index) => {
        const feature_id = this._getFeatureId(feat, external);
        // If true, remove the feature because is already loaded
        if (features_ids.some(id => id === feature_id)) {
          //@since 3.11.0
          if (action && feat.selection.selected) {
            (external ? layer : getCatalogLayerById(layer.id)).excludeSelectionFid(feature_id, layer.filter.active);
          }
          //filter feature
          layer.features = layer.features.filter(f => feature_id !== this._getFeatureId(f, external));
          delete this.state.layersFeaturesBoxes[this.getBoxId(layer, feat)]
          if (action) {
            delete action.state.toggled[index];
            //need to reset toggled state in reactive mode
            action.state.toggled = Vue.observable(layer.features.reduce((a,f,i) => { a[i] = f.selection.selected; return a }, {}));
          }
        } else {                                                              // add feature
          layer.features.push(feat);
        }
      });
      // toggle layer feature box
      (layer.features || []).forEach(f => {
        const collapsed = (layer.features || []).length > 1;
        const box       = this.state.layersFeaturesBoxes[this.getBoxId(layer, f)];
        if (box) {
          setTimeout(() => box.collapsed = collapsed); // due to vue reactivity, wait a little bit before update layers
        }
      });
    }

    // no more features on layer → remove interaction pickcoordinate to get a result from a map
    if (layer && 0 === (layer.features || []).length) {
      // due to vue reactivity, wait a little bit before update layers
      setTimeout(() => {
        this.state.layers = this.state.layers.filter(l => l.id !== layer.id);
        this.clearHighlightGeometry(layer);
        this.removeAddFeaturesLayerResultInteraction(true);
      })
    }

    // highlight new feature
    if (1 === this.state.layers.length) {
      GUI.getService('map').highlightFeatures(this.state.layers[0].features, { duration: Infinity });
    }

    this.changeLayerResult(layer);
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
  setActionsForLayers(layers, options = { add: false, update: false }) {
    if (options.add || options.update) {
      return;
    }

    // reset array
    this.unlistenerlayeractionevents = [];

    // loop results
    layers.forEach((layer, index) => {
      // eventually set layer action tool and need to be reactive
      this.state.layeractiontool[layer.id]           = Vue.observable({ component: null, config: null });
      this.state.currentactiontools[layer.id]        = Vue.observable({ ...Array((layer.features || []).length).fill(null) });
      this.state.currentactionfeaturelayer[layer.id] = Vue.observable({ ...Array((layer.features || []).length).fill(null) });
      this.state.layersactions[layer.id]             = this.state.layersactions[layer.id] || [];
      this.state.layersactions[layer.id].push(...([

        // zoom to geometry
        layer.hasgeometry && {
          id:        'gotogeometry',
          mouseover: true,
          class:     GUI.getFontClass('marker'),
          hint:      'Zoom to feature',
          cbk:       throttle(this.goToGeometry.bind(this))
        },

        // show relations (query)
        (this._relations[layer.id] || []).some(r => 'MANY' === r.type) && {
          id:       'show-query-relations',
          class:    GUI.getFontClass('relation'),
          hint:     'Show Relations',
          cbk(layer, feature, action) {
            GUI.setCurrentContentOptions({ title: layer.title, crumb: { text: true, title: layer.title } });
            GUI.pushContent({
              content: new Component({
                internalComponent: new (Vue.extend(require('components/RelationsPage.vue').default))({
                  relations:        action.relations,
                  chartRelationIds: action.relations.map(r => GUI.getService('queryresults').plotLayerIds.find(id => id === r.referencingLayer)).filter(Boolean),
                  feature,
                  layer,
                })
              }),
              backonclose: true,
              title:      'info.list_of_relations',
              id:         '__G3W_LIST_OF_RELATIONS_ID__',
              crumb: {
                title: 'info.list_of_relations',
                trigger: null
              },
              closable: false
            });
          },
          relations: (this._relations[layer.id] || []).filter(r => 'MANY' === r.type),
        },

        // print (atlas)
        this._atlas.filter(a => a.atlas.qgs_layer_id === layer.id).length && {
          id:       'printatlas',
          download: true,
          class:    GUI.getFontClass('print'),
          hint:     'Print Atlas',
          cbk:      this.printAtlas.bind(this)
        },

        // remove feature
        ('__g3w_marker' === layer.id || (!layer.external && 'wms' !== (layer.source || {}).type)) && {
          id:        'removefeaturefromresult',
          mouseover: true,
          class:     GUI.getFontClass('minus-square'),
          style:     { color: 'red' },
          /** @since 3.11.0 hide element in case of pagination (show = false) */
          state:     Vue.observable({ show: !layer.filter.pagination }),
          hint:      'Remove feature from results',
          cbk:       this.removeFeatureLayerFromResult.bind(this),
          init() {
            this.unwatch = VM.$watch(() => layer.filter.pagination, bool => this.state.show = !bool ); // listen filter layer pagination change
          },
          clear() {
            this.unwatch && this.unwatch(); // remove action when destroy
          },
          change() {
            this.state.disabled = !layer.filter.pagination;
          }
        },

        // select feature
        (layer.toc && undefined !== layer.selection.active) && {
          id:       'selection',
          class:    GUI.getFontClass('success'),
          hint:     'Add/Remove Selection',
          state:    Vue.observable({
            toggled: layer.features.reduce((a, _ , i ) => { a[i] = false; return a; }, {}),
            show:    !layer.filter.active // show action when filter is not set
          }),
          init({ layer, feature, index, action } = {}) {
            this.unwatch = VM.$watch(() => layer.filter.active, bool => this.state.show = !bool ); // listen filter layer pagination change
            if (!feature) {
              return console.trace('Invalid feature');
            }
            const _layer                = getCatalogLayerById(layer.id);
            const fid                   = feature.attributes[G3W_FID] || feature.id;
            action.state.toggled[index] = feature.selection.selected;
            //In case of filter pagination, no need to set selection on map
            if (_layer && !_layer.state.filter.pagination && feature.selection.selected && !_layer.hasSelectionFid(fid)) {
              _layer.addOlSelectionFeature({ id: fid, feature }).selected = true;
              _layer.includeSelectionFid(fid, false);
            }
          },
          clear() {
            this.unwatch && this.unwatch(); // remove action when destroy
          },
          change({ features }) {
            // wait for pagination change request
            setTimeout(() => {
              features.forEach((_, index) => undefined === this.state.toggled[index] && VM.$set(this.state.toggled, index, false))
            })
          },
          cbk: throttle(this.toggleSelection.bind(this))
        },

        // permalink (click to copy)
        (layer.hasgeometry && !layer.external && 'wms' !== (layer.source || {}).type) && {
          id:          'link_zoom_to_fid',
          class:       GUI.getFontClass('share-alt'),
          hint:        'Share via link',
          cbk(layer, feature, action) {
            const url = new URL(location.href);
            url.searchParams.set('zoom_to_fid', `${layer.id}|${feature.attributes[G3W_FID]}`);
            GUI.getPermalink(url, {});
          }
        },

        // edit
        (layer.editable && false === layer.inediting) && {
          id:    'editing',
          class: GUI.getFontClass('pencil'),
          hint:  'Editing',
          cbk:   (layer, feature) => this.editFeature({ layer, feature })
        },

      ]).filter(Boolean));


      // In case of external layer don't listen to `selection` event
      if (layer.external && layer.toc && undefined !== layer.selection.active) {
        //in case 
        layer.selection.features = layer.selection.features || [];
        layer.features.forEach(f => f.selection = (layer.selection.features.find(s => f.id === s.getId()) || ({ selection: { selected: false }})).selection);
      } else if (!layer.external && layer.toc && undefined !== layer.selection.active) {
        const handler = () => layer.features.forEach((_, i) => this.state.layersactions[layer.id].find(a => a.id === 'selection').state.toggled[i] = false);
        getCatalogLayerById(layer.id).on('unselectionall', handler);
        this.unlistenerlayeractionevents.push({ layer: getCatalogLayerById(layer.id), event: 'unselectionall', handler });
      }

    });

    this.addActionsForLayers(this.state.layersactions, this.state.layers);

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
   * @param {Object } opts
   * @param opts.layer current layer
   * @param opts.index feature index
   * @param opts.action action
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
   * @FIXME add description
   * @param {Object } opts
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
   * Clear all
   */
  clear() {
    // unlistener events actions
    this.unlistenerlayeractionevents.forEach(obj => obj.layer.off(obj.event, obj.handler));
    this.unlistenerlayeractionevents = [];
    GUI.getService('map').clearHighlightGeometry();
    this.resultsQueryLayer.getSource().clear();
    this.removeAddFeaturesLayerResultInteraction(true);
    
    //reset pagination
    this.clearState();
    this.closeComponent();
    this.resultsQueryLayer.getSource().clear();
    GUI.getService('map').getMap().removeLayer(this.resultsQueryLayer);
    setTimeout(() => {
      this._asyncFnc.todo();
      this._asyncFnc = {
        todo:                      () => {},
        zoomToLayerFeaturesExtent: { async: false },
        highLightLayerFeatures:    { async: false },
        goToGeometry:              { async: false },
      };
    })
  }

  /**
   * Check if a one layer result
   *
   * @returns {boolean}
   */
  isOneLayerResult() {
    return (1 === this.state.layers.length);
  }

  /**
   * @FIXME add description
   *
   * @param {boolean} toggle whether toggle mapcontrol
   */
  removeAddFeaturesLayerResultInteraction(toggle) {
    const interaction = this._addFeaturesLayerResultInteraction;

    if (null !== interaction.toggleeventhandler) {
      GUI.getService('map').off('mapcontrol:toggled', interaction.toggleeventhandler);
    }

    // remove current interaction to get features from layer
    if (null !== interaction.interaction) {
      GUI.getService('map').removeInteraction(interaction.interaction);
    }

    // check if query map control is toggled and registered
    if (null !== interaction.mapcontrol) {
      interaction.mapcontrol.toggle(toggle);
    }

    // reset values
    Object.assign(interaction, {
      interaction:        null,
      id:                 null,
      toggleeventhandler: null,
      mapcontrol:         null,
    });

  }

  /**
   * Adds feature to Features layer results
   *
   * @param layer
   */
  addLayerFeaturesToResultsAction(layer) {
    const interaction = this._addFeaturesLayerResultInteraction;

    const not_current = ![null, layer.id].includes(interaction.id);
    const new_layer   = not_current && this.state.layers.find(l => l.id === interaction.id);

    // disable previous layer
    if (not_current && new_layer) {
      new_layer.addfeaturesresults.active = false;
    }

    // remove previous interaction
    if (not_current && interaction.interaction) {
      GUI.getService('map').removeInteraction(interaction.interaction);
    }

    // set new layer
    interaction.id = layer.id;

    layer.addfeaturesresults.active = !layer.addfeaturesresults.active;

    if (false === layer.addfeaturesresults.active) {
      this.removeAddFeaturesLayerResultInteraction(true);
    } else {

      this.activeMapInteraction(); // useful to send an event

      const external_layer = (this.state.layers.find(l => l.id === layer.id) || {}).external;

      interaction.mapcontrol  =
        interaction.mapcontrol ||
        GUI.getService('map').getCurrentToggledMapControl() ||
        null; //need to be set null when this.mapService.getCurrentToggledMapControl() is undefined
      interaction.interaction = new PickCoordinatesInteraction();

      GUI.getService('map').addInteraction(interaction.interaction, { close: false });

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

      GUI.getService('map').once('mapcontrol:toggled', interaction.toggleeventhandler);

    }
  }

  /**
   * used by the following plugins: "bforest"
   */
  deactiveQueryInteractions() {
    this.state.layers.forEach(l => {
      if (l.addfeaturesresults) { l.addfeaturesresults.active = false }
    })
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
    const features = (layer.features || []).filter(f => this.showFeature(layer, f));
    if (this._asyncFnc.zoomToLayerFeaturesExtent.async) {
      this._asyncFnc.todo = GUI.getService('map').zoomToFeatures.bind(GUI.getService('map'), features, options);
    } else {
      GUI.getService('map').zoomToFeatures(features, options);
    }
  }

  /**
   * @returns { boolean } whether show feature in results (show + active filter + selected)
   * 
   * @since 3.11.8
   */
  showFeature(layer, feature) {
    return feature.show && ((layer.filter || {}).active ? feature.selection.selected : true);
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param options
   */
  highLightLayerFeatures(layer, options = {}) {
    const features = (layer.features || []).filter(f => this.showFeature(layer, f));
    if (this._asyncFnc.highLightLayerFeatures.async) {
      this._asyncFnc.todo = GUI.getService('map').highlightFeatures.bind(GUI.getService('map'), features, options);
    } else {
      GUI.getService('map').highlightFeatures(features, options);
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
    this.state.layersactions       = {};
    this.state.actiontools         = {};
    this.state.layeractiontool     = {};
    this.state.currentactiontools  = {};
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
    this._relations = (project.getRelations() || []).reduce((group, r) => {
      group[r.referencedLayer] = group[r.referencedLayer] || [];
      group[r.referencedLayer].push(r);
      return group;
    }, {});
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
   *
   * @param actionId
   * @param layer
   * @param feature
   * @param index
   * @param container
   */
  async trigger(actionId, layer, feature, index, container) {
    if ('highlightgeometry' === actionId) {
      this.highlightGeometry(layer, feature, index);
    }
    if ('clearHighlightGeometry' === actionId) {
      this.clearHighlightGeometry(layer, feature, index);
    }
    if (layer && this.state.layersactions[layer.id]) {
      const action = this.state.layersactions[layer.id].find(layerAction => layerAction.id === actionId);
      if (action && action.cbk) {
        await action.cbk(layer, feature, action, index, container);
      }
      if (action &&  action.route) {
        let url = action.route.replace(/{(\w*)}/g, (m, key) => feature.attributes.hasOwnProperty(key) ? feature.attributes[key] : "");
        if (url && '' !== url) {
          GUI.goto(url);
        }
      }
    }
  }

  /**
   * @FIXME add description
   *
   * @param vectorLayer
   */
  registerVectorLayer(vectorLayer) {
    if (!this._vectorLayers.includes(vectorLayer)) {
      this._vectorLayers.push(vectorLayer);
    }
  }

  /**
   * @FIXME add description
   *
   * @param vectorLayer
   */
  unregisterVectorLayer(vectorLayer) {
    this._vectorLayers = this._vectorLayers.filter(vl => {
      this.state.layers = this.state.layers.filter(l => l.id !== vectorLayer.get('id'));
      return vl !== vectorLayer;
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
    } = query; // extract information about a query type

    let features = [];

    const has_coords = coordinates && Array.isArray(coordinates);
    const has_bbox   = bbox && Array.isArray(bbox);

    // case query coordinates
    if (has_coords) {
      GUI.getService('map').viewer.map.forEachFeatureAtPixel(
        GUI.getService('map').viewer.map.getPixelFromCoordinate(coordinates),
        f => { features.push(f); },
        { layerFilter: l => l === vectorLayer }
      );
    }

    // case query bbox
    if (has_bbox && !has_coords) {
      //set geometry has Polygon
      geometry = ol.geom.Polygon.fromExtent(bbox);
    }

    const is_poly    = geometry instanceof ol.geom.Polygon || geometry instanceof ol.geom.MultiPolygon;

    // check query geometry (Polygon or MultiPolygon)
    if (is_poly && !has_coords && VectorLayer === vectorLayer.constructor) {
      features = vectorLayer.getIntersectedFeatures(geometry);
    } else if (is_poly && !has_coords && ol.layer.Vector === vectorLayer.constructor) {
      vectorLayer.getSource().getFeatures().forEach(f => {
        let add;
        switch (filterConfig.spatialMethod) {
          case 'within':     add = within(geometry, f.getGeometry());                      break;
          case 'intersects':
          default:           add = intersects(geometry, f.getGeometry());                  break;
        }
        if (true === add) {
          features.push(f);
        }
      });
    }

    return {
      features,
      layer: vectorLayer
    };

  }

  /**
   *  @FIXME add description
   */
  async _printSingleAtlas({
    atlas    = {},
    features = [],
  } = {}) {
    let field = atlas.atlas?.field_name || '$id';

    ApplicationState.download = true;

    GUI.setLoadingContent(true);

    try {
      const { url } = await printAtlas({
        field,
        values:   features.map(feat => feat.attributes['$id' === field ? G3W_FID : field]),
        template: atlas.name,
        download: true
      });
      const response = url && await fetch(url);

      if (!response?.ok) {
        throw (await response.json()).message;
      }

      saveBlob(await response.blob(), atlas.name || (response.headers.get('content-disposition') || 'filename=g3w_download_file').split('filename=').at(1));
    } catch(e) {
      GUI.showUserMessage({ type: 'alert', message: e || 'server_error', textMessage: !!e })
    }

    ApplicationState.download = false;

    GUI.setLoadingContent(false);
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
   * @param layer
   * @param feature
   */
  printAtlas(layer, feature) {
    const features   = feature ? [feature] : layer.features;
    const atlasLayer = this._atlas.filter(a => a.atlas.qgs_layer_id === layer.id);

    /** @FIXME add description */
    if (atlasLayer.length <= 1) {
      this._printSingleAtlas({ features, atlas: atlasLayer[0] });
      return;
    }

    let inputs = '';

    atlasLayer.forEach((atlas, index) => {
      const id = getUniqueDomId();
      inputs += /* html */`<label for="${id}"><input id="${id}" g3w_atlas_index="${index}" type="radio" name="template" value="${atlas.name}" /> ${atlas.name}</label><br>`;
    });

    GUI.showModalDialog({
      title: _('Select Template'),
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
   * @param feature
   */
  goToGeometry(layer, feature) {
    if (!feature.geometry) {
      return;
    }
    if (this._asyncFnc.goToGeometry.async) {
      this._asyncFnc.todo = GUI.getService('map')[this.isOneLayerResult() ? 'zoomToFeatures' : 'highlightGeometry'].bind(
        GUI.getService('map'),
        this.isOneLayerResult() ? [feature] : feature.geometry,
        this.isOneLayerResult() ? {} : { layerId: layer.id, duration: 1500 }
      );
    } else {
      setTimeout(() => GUI.getService('map')[this.isOneLayerResult() ? 'zoomToFeatures' : 'highlightGeometry'](
        this.isOneLayerResult() ? [feature] : feature.geometry,
        this.isOneLayerResult() ? {} : { layerId: layer.id, duration: 1500 }
      ));
    }
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param feature
   */
  highlightGeometry(layer, feature) {
    if (feature.geometry) {
      GUI.getService('map').highlightGeometry(
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
    GUI.getService('map').clearHighlightGeometry();
  }

  /**
   * Handle show Relation on result
   * @param { Object } opts
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
      content: new Component({
        vueComponentObject: require('components/Relation.vue').default,
        propsData: {
          relation:         projectRelation,
          chartRelationIds: this.plotLayerIds.find(pid => pid == projectRelation.referencingLayer) ? [projectRelation.referencingLayer] : [],
          nmRelation:       this._project.getRelationById(relation.nmRelationId),
          layer:            { id: layerId },
          feature,
        }
      }),
      crumb: {
        title: projectRelation.name,
        text:  true,
      },
      title:    projectRelation.name,
      text  :   true,
      closable: false
    })
  };

  /**
   * Get id of the  feature
   *
   * @since 3.9.0
   */
  _getFeatureId(feature, external) {
    return external ? feature.id : (feature.attributes[G3W_FID] || feature.id); // in case of query by geometry, features are returned without G3W_FID. They have id 
  }

  /**
   * Add / Remove features from selection
   * 
   * ORIGINAL SOURCE: src/app/gui/queryresults/queryresultsservice.js@3.8.12::addToSelection
   * 
   * @param layer queried layer instance
   * @param feature when provided, the feature to be toggled (otherwise, toggle all features)
   * 
   * @since 4.0.0
   */
  async toggleSelection(layer, feature) {
    
    const query         = GUI.getService('queryresults'); //get query service
    const action        = query.getActionLayerById({ layer, id: 'selection' }); //get selction action
    const index         = (layer.features || []).findIndex(f => f == feature); // find feature index when selection is set to single feature
    const toggled       = layer.features.every(f => f.selection.selected); // check if all features are selected  
    const catalog_layer = layer.external ? layer : getCatalogLayerById(layer.id);
    const features      = [].concat(feature || layer.features || []);

    if (!features.length) {
      return console.warn('no features');
    }

    // toggle selection
    layer.features.forEach((f, i) => {
      if (!feature) {
        action.state.toggled[i] = !toggled;
      } else if (i === index) {
        action.state.toggled[i] = !action.state.toggled[i];
      }
      f.selection.selected = action.state.toggled[i];
    });


    // handle pagination
    if (!layer.external && !feature && toggled && layer.filter.pagination) {
      await catalog_layer.clearSelectionFids();
      return;
    }

    // ensure "layer.selection.features" is defined
    layer.selection.features = layer.selection.features || [];

    // external layer (click on layer)
    if (layer.external && !feature) {
      // set selection to all features
      layer.selection.active = !toggled;
      layer.features.forEach(feature => {
        let feat       = layer.selection.features.find(f => feature.id === f.getId()); // check feature if has been already added to selection
        if (!feat) {
          feat = new ol.Feature(feature.geometry);
          feat.setId(feature.id);
          Object.keys(feature.attributes).forEach(attr => feat.set(attr, feature.attributes[attr]));
          layer.selection.features.push(
            Object.assign(feat, {
            __layerId: layer.id,
            selection: { selected: layer.selection.active },
          }));
        }
        // set current selection selected attribute
        feat.selection.selected = layer.selection.active;
        // add remove selection feature
        GUI.getService('map').setSelectionFeatures(
          layer.selection.active ? 'add' : 'remove',
          { feature: feat }
        );
      });
    
      return;
    }

    // external layer (click on feature)
    if (layer.external && feature) {
      let feat = catalog_layer.selection.features.find(f => feature.id === f.getId()); // check feature if has been already added to selection
      if (feat) {
        feat.selection.selected = action.state.toggled[index];
      }
      // create selection feature for external if not yet added
      if (!feat) {
        feat = new ol.Feature(feature.geometry);
        feat.setId(feature.id); 
        Object.keys(feature.attributes).forEach(attr => feat.set(attr, feature.attributes[attr]));
        // add feature to selection layer features
        catalog_layer.selection.features.push(
            Object.assign(feat, {
            __layerId: catalog_layer.id,
            selection: { selected: true }, // NB: default true because otherwise it means that is clicked on selection
          })
        );
      }

      // handle map selection layer adding or remove feature based on selection boolean value
      GUI.getService('map').setSelectionFeatures(
        feat.selection.selected ? 'add' : 'remove',
        { feature: feat }
      );

      // set selection property (external layer)
      catalog_layer.selection.active = catalog_layer.selection.features.some(f => f.selection.selected);;
      
      return;
    }

    // get fids (unique id) of features
    const fids = (features || []).map(f => f.attributes[G3W_FID] || f.id);

    fids.forEach((fid, i) => {
      const is_selected = catalog_layer.state.filter.active || catalog_layer.hasSelectionFid(fid);

      // if not already selected and feature is not added to OL selection layer on map --> add as feature of selected layer
      if (!is_selected && features[i]?.geometry && !catalog_layer.getOlSelectionFeature(fid)) {
        catalog_layer.addOlSelectionFeature({ id: fid, feature: features[i] });
      }
    
      // exclude
      if (feature && is_selected) {
        catalog_layer.excludeSelectionFid(fid);
      }

      // include
      if (feature && !is_selected) {
        catalog_layer.includeSelectionFid(fid);
      }
  
      // add
      if (!feature && !toggled && !is_selected) {
        catalog_layer.includeSelectionFid(fid, false);
      }
  
      // remove
      if (!feature && toggled) {
        catalog_layer.excludeSelectionFid(fid, false);
      }

    });

    // set layer selection state

    // PROJECT LAYER and not all toggled
    if (catalog_layer.state.filter.active && !toggled) {
      fids.forEach((_, idx) => {
        // index of feature to remove
        const i = feature ? index : idx;
        layer.features.splice(i, 1);
        // delete related action
        delete action.state.toggled[i];
        // reset toggled state 
        action.state.toggled = Object.entries(action.state.toggled).reduce((a, t, i) => Object.assign(a, { [i]: t }), {});
      });
    }
    //@since 4.0.4 set active base on toggled or selection fids
    catalog_layer.state.selection.active = Object.values(action.state.toggled).some(t => t) || catalog_layer.state.selectionFids.size > 0;

    //remove Highlight geometry layer fetures
    GUI.getService('map').clearHighlightGeometry();
    
    // PROJECT LAYER - In case of single layer and no features, remove layer
    if (1 === query.getState().layers.length && !query.getState().layers[0].features.length) {
      query.getState().layers.splice(0);
    }

  }

});