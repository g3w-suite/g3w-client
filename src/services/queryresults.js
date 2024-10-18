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

import DownloadFormats                          from 'components/QueryResultsActionDownloadFormats.vue';
import QueryPolygonCsvAttributesComponent       from 'components/QueryResultsActionQueryPolygonCSVAttributes.vue';

import { getAlphanumericPropertiesFromFeature } from 'utils/getAlphanumericPropertiesFromFeature';
import { intersects }                           from 'utils/intersects';
import { within }                               from 'utils/within';
import { printAtlas }                           from 'utils/printAtlas';
import { downloadFile }                         from 'utils/downloadFile';
import { throttle }                             from 'utils/throttle';
import { getUniqueDomId }                       from 'utils/getUniqueDomId';
import { copyUrl }                              from 'utils/copyUrl';
import { getCatalogLayerById }                  from 'utils/getCatalogLayerById';

import { Layer }                                from 'map/layers/layer';
import { VectorLayer }                          from 'map/layers/vectorlayer';

const { t } = require('g3w-i18n');

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
    this.setters = {

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
          const catalog = GUI.getService('catalog');

          /** @type { boolean | undefined } */
          const FILTER_SELECTED = queryResponse.query.external.filter.SELECTED;
      
          // add visible layers to query response (vector layers)
          this._vectorLayers.forEach(layer => {
            const id = layer.get('id');
            // TODO: extract this into `layer.isSomething()` ?
            if (layer.getVisible() && [undefined, !!(catalog.state.external.vector.find(l => l.id === id) || {}).selected].includes(FILTER_SELECTED)) {
              queryResponse.data[
                '__g3w_marker' === id // keep geocoding control "marker" layer at top
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

        // show query result on map
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
        // Skip when layer has no features or rawdata is undefined (external wms)
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
        
            // Parse attributes to show on result based on field
        
            let attrs = !attributes && getAlphanumericPropertiesFromFeature(
              Object.keys(features[0] instanceof ol.Feature ? features[0].getProperties() : features[0].properties)
            );
        
            if (!attributes) {
              attributes = (layerAttrs && layerAttrs.length > 0)
                ? layerAttrs.filter(attr => attrs.indexOf(attr.name) > -1)
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
                selection:  f.selection,
                show:       true,
              })),
              hasgeometry:            Array.isArray(features) && !rawdata && features.some(f => f instanceof ol.Feature ? f.getGeometry() : f.geometry),
              hasImageField:          Array.isArray(features) && !rawdata && features.length && attributes.some(attr => 'image' === attr.type),
              loading:                false,
              show:                   true,
              expandable:             true,
              addfeaturesresults:     { active: false },
              downloadformats:        { active: false },
              editable:               is_layer   ? layer.isEditable()             : false,
              inediting:              is_layer   ? layer.isInEditing()            : false,
              source:                 is_layer   ? layer.getSource()              : undefined,
              infoformat:             is_layer   ? layer.getInfoFormat()          : undefined,
              infoformats:            is_layer   ? layer.getInfoFormats()         : [],
              downloads:              is_layer   ? layer.getDownloadableFormats() : [],
              formStructure:          structure  ? {
                structure,
                // get field show
                fields: layer.getFields().filter(f => f.show).concat(
                  (Array.isArray(features) && !rawdata && features.length > 0 && attributes || []).filter(attr => layer.getFields().some(f => f.name === attr.name))
                ),
              } : undefined,
              relationsattributes:    (is_layer || is_vector || is_string)                       ? []                     : undefined,
              filter:                 (is_layer && !['wms', 'wcs', 'wmst'].includes(sourceType)) ? layer.state.filter     : {},
              selection:              (is_layer && !['wms', 'wcs', 'wmst'].includes(sourceType) && layer.state.selection) || (is_vector && layer.selection) || {},
              title:                  (is_layer && layer.getTitle()) || (is_vector && layer.get('name')) || (is_string && name && (name.length > 4 ? name.slice(0, name.length - 4).join(' ') : layer)) || undefined,
              atlas:                  this.getAtlasByLayerId(id),
              rawdata:                rawdata  || null,
              error:                  error    || '',
              toc:                    external || layer.state.toc, //@since v3.10.0
            };
          });

        this.setLayersData(layers, options);

      },

      /**
       * Setter method called when adding layer and feature for response
       *
       * @param layers
       * @param options
       */
      setLayersData(layers = [], options = { add: false }) {
        if (false === options.add) {
          // sort layers as Catalog project layers.
          //external layer always on bottom
          layers.sort((a, b) => a.external ? 0 : (this._projectLayerIds.indexOf(a.id) > this._projectLayerIds.indexOf(b.id) ? 1 : -1));
        }
        // get features from added pick layer in case of a new request query
        layers.forEach(l => options.add ? this.updateLayerResultFeatures(l) : this.state.layers.push(l));
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
     * @deprecated since 3.8
     * It used to register a change project from Change map button
     */
    g3wsdk.core.project.ProjectsRegistry.onafter('setCurrentProject', project => {
      this._project = project;
      this._setRelations(project);
      this._atlas = project.getPrint().filter(p => p.atlas) || [];
      this.state.download_data = false;
      this.plotLayerIds = [];
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
   *
   * @since 3.8.0
   */
  updateLayerResultFeatures(responseLayer) {
    const layer        = this.state.layers.find(l => l.id === responseLayer.id)                   // get layer from current `state.layers` showed on a result
      responseFeatures = responseLayer.features || [],                                            // extract features from responseLayer object
      external         = (this.state.layers.find(l => l.id === responseLayer.id) || {}).external, // get id of external layer or not (`external` is a layer added by mapcontrol addexternlayer)
      has_features     = layer && (layer.features || []).length > 0;                              // check if the current layer has features on response

    if (has_features) {
      const features_ids = layer.features.map(f => external ? f.id : f.attributes[G3W_FID]) // get features id from current layer on a result
      responseFeatures.forEach(feat => {
        const feature_id = this._getFeatureId(feat, external);
        if (features_ids.some(id => id === feature_id)) {                     // remove feature (because is already loaded)
          setTimeout(() => delete this.state.layersFeaturesBoxes[this.getBoxId(layer, feat)]);
          layer.features = (layer.features || []).filter(f => this._getFeatureId(f, external) !== feature_id);
        } else {                                                              // add feature
          layer.features.push(feat);
        }
      });
      // toggle layer feature box
      (layer.features || []).forEach(feature => {
        const collapsed = (layer.features || []).length > 1;
        const box       = this.state.layersFeaturesBoxes[this.getBoxId(layer, feature)];
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
  setActionsForLayers(layers, options = { add: false }) {
    if (options.add) {
      return;
    }

    // reset array
    this.unlistenerlayeractionevents = [];

    // loop results
    layers.forEach(layer => {

      // set eventually layer action tool and need to be reactive
      this.state.layeractiontool[layer.id]           = Vue.observable({ component: null, config: null });
      this.state.currentactiontools[layer.id]        = Vue.observable({ ...Array((layer.features || []).length).fill(null) });
      this.state.currentactionfeaturelayer[layer.id] = Vue.observable({ ...Array((layer.features || []).length).fill(null) });
      this.state.layersactions[layer.id]             = this.state.layersactions[layer.id] || [];

      const download_format  = 1 === layer.downloads.length && (layer.downloads || []).at(0); // NB: format == layer.downloads[0]
      const relations        = (this._relations[layer.id] || []).filter(r => 'MANY' === r.type);
      const chartRelationIds = relations.map(r => this.plotLayerIds.find(id => id === r.referencingLayer)).filter(Boolean);

      if (download_format) {
        layer[download_format] = Vue.observable({ active: false });
      }

      // set actionstools configs
      if (layer.downloads.length > 1) {
        this.state.actiontools.downloadformats = this.state.actiontools.downloadformats || {};
        this.state.actiontools.downloadformats[layer.id] = {
          downloads: layer.downloads.map(format => ({
            id:       `download_${format}_feature`,
            download: true,
            format,
            class:    GUI.getFontClass(format),
            hint:     `sdk.tooltips.download_${format}`,
            cbk: (layer, feature, action, index, html) => {
              // un-toggle downloads action
              this.downloadFeatures(format, layer, feature, action, index, html);
              if ('polygon' !== this.state.query.type) {
                const downloadsaction = this.state.layersactions[layer.id].find(a => 'downloads' === a.id);
                downloadsaction.cbk(layer, feature, downloadsaction, index, html);
              }
            }
          }))
        };
      }

      this.state.layersactions[layer.id].push(...([

        // zoom to geometry
        layer.hasgeometry && {
          id:        'gotogeometry',
          mouseover: true,
          class:     GUI.getFontClass('marker'),
          hint:      'sdk.mapcontrols.query.actions.zoom_to_feature.hint',
          cbk:       throttle(this.goToGeometry.bind(this))
        },

        // show relations (query)
        relations.length && {
          id:       'show-query-relations',
          class:    GUI.getFontClass('relation'),
          hint:     'sdk.mapcontrols.query.actions.relations.hint',
          cbk(layer, feature, action) {
            GUI.setCurrentContentOptions({ crumb: { text: true, title: layer.title } });
            GUI.pushContent({
              content: new Component({
                internalComponent: new (Vue.extend(require('components/RelationsPage.vue')))({
                  relations:        action.relations,
                  chartRelationIds: action.chartRelationIds,
                  feature,
                  layer
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
          relations,
          chartRelationIds
        },

        // show relations (plot)
        chartRelationIds.length && {
          id:       'show-plots-relations',
          opened:   true,
          class:    GUI.getFontClass('chart'),
          state:    Vue.observable({ toggled: layer.features.reduce((a, _ , i ) => { a[i] = null; return a; }, {}) }),
          hint:     'sdk.mapcontrols.query.actions.relations_charts.hint',
          cbk: throttle((layer, feature, action, index, container) => {
            action.state.toggled[index] = !action.state.toggled[index];
            if (action.state.toggled[index]) {
              this.emit('show-chart', chartRelationIds, container, {
                relations: this._relations[layer.id],
                fid:       feature.attributes[G3W_FID],
                height:    400
              });
            } else {
              this.hideChart(container);
            }
          }),
        },

        // print (atlas)
        this.getAtlasByLayerId(layer.id).length && {
          id:       'printatlas',
          download: true,
          class:    GUI.getFontClass('print'),
          hint:     'sdk.tooltips.atlas',
          cbk:      this.printAtlas.bind(this)
        },

        // download features (single)
        download_format && {
          id:       `download_${download_format}_feature`,
          download: true,
          state:    Vue.observable({ toggled: layer.features.reduce((a, _ , i ) => {a[i] = null; return a; }, {}) }),
          class:    GUI.getFontClass('download'),
          hint:     `sdk.tooltips.download_${download_format}`,
          cbk: (layer, feature, action, index, container) => {
            action.state.toggled[index] = !action.state.toggled[index];
            if (action.state.toggled[index]) {
              this.downloadFeatures(download_format, layer, feature, action, index, ('pdf' === download_format ? container[0].innerHTML : null));
            } else {
              this.setCurrentActionLayerFeatureTool({ index, action, layer })
            }
          }
        },

        // download features (multi)
        layer.downloads.length > 1 && {
          id:         'downloads',
          download:   true,
          class:      GUI.getFontClass('download'),
          state:    Vue.observable({ toggled: layer.features.reduce((a, _ , i ) => { a[i] = null; return a; }, {}) }),
          toggleable: true,
          hint:       'Downloads',
          change({ features }) {
            features.forEach((_, i) => undefined === this.state.toggled[i] ? VM.$set(this.state.toggled, i, false) : (this.state.toggled[i] = false))
          },
          cbk: (layer, feature, action, index) => {
            action.state.toggled[index] = !action.state.toggled[index];
            this.setCurrentActionLayerFeatureTool({ layer, index, action, component: (action.state.toggled[index] ? DownloadFormats : null) });
          }
        },

        // remove feature
        ('__g3w_marker' === layer.id || (!layer.external && 'wms' !== (layer.source || {}).type)) && {
          id:        'removefeaturefromresult',
          mouseover: true,
          class:     GUI.getFontClass('minus-square'),
          style:     { color: 'red' },
          hint:      'sdk.mapcontrols.query.actions.remove_feature_from_results.hint',
          cbk:       this.removeFeatureLayerFromResult.bind(this)
        },

        // select feature
        (layer.toc && undefined !== layer.selection.active) && {
          id:       'selection',
          class:    GUI.getFontClass('success'),
          hint:     'sdk.mapcontrols.query.actions.add_selection.hint',
          state:    Vue.observable({ toggled: layer.features.reduce((a, _ , i ) => { a[i] = null; return a; }, {}) }),
          // check feature selection
          init:     ({ feature, index, action } = {}) => {
            if (layer.external && undefined !== layer.selection.active) { // external layer
              action.state.toggled[index] = feature.selection.selected;
            } else if (feature && undefined !== layer.selection.active) { // project layer
              const pLayer = getCatalogLayerById(layer.id);
              action.state.toggled[index] = (
                //need to check if set active filter and no saved filter is set
                (pLayer.state.filter.active && null == pLayer.state.filter.current) ||
                //or if feature fid is in selected array
                pLayer.hasSelectionFid(feature ? this._getFeatureId(feature, layer.external): null)
              );
            }
          },
          /** @since 3.9.0 reactive `toggled` when adding new feature and then bind click on query result context (exclude existing features and add reactive array property) */
          change({ features }) { features.forEach((_, index) => undefined === this.state.toggled[index] && VM.$set(this.state.toggled, index, false)) },
          cbk: throttle(this.addToSelection.bind(this))
        },

        // permalink (click to copy)
        (layer.hasgeometry && !layer.external && 'wms' !== (layer.source || {}).type) && {
          id:          'link_zoom_to_fid',
          class:       GUI.getFontClass('share-alt'),
          hint:        'sdk.mapcontrols.query.actions.copy_zoom_to_fid_url.hint',
          hint_change: { hint: 'sdk.mapcontrols.query.actions.copy_zoom_to_fid_url.hint_change', duration: 1000 },
          cbk(layer, feature, action) {
            const url = new URL(location.href);
            url.searchParams.set('zoom_to_fid', `${layer.id}|${feature.attributes[G3W_FID]}`);
            copyUrl(url.toString());
            action.hint_changed = true;
          }
        },

        // edit
        (layer.editable && layer.config.editing.visible && false === layer.inediting) && {
          id:    'editing',
          class: GUI.getFontClass('pencil'),
          hint:  'sdk.tooltips.editing',
          cbk:   (layer, feature) => this.editFeature({ layer, feature })
        },

      ]).filter(Boolean));


      // In case of external layer don't listen to `selection` event
      if (layer.external && layer.toc && undefined !== layer.selection.active) {
        layer.features.forEach(f => f.selection = (layer.selection.features.find(s => f.id === s.getId()) || ({ selection: { selected: false }})).selection);
      } else if(!layer.external && layer.toc && undefined !== layer.selection.active) {
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
   * @TODO rename misleading method name: `addActionToolsLayer`
   * @param {Object } opts
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
    this._asyncFnc.todo()
    // unlistener events actions
    this.unlistenerlayeractionevents.forEach(obj => obj.layer.off(obj.event, obj.handler));
    this.unlistenerlayeractionevents = [];
    GUI.getService('map').clearHighlightGeometry();
    this.resultsQueryLayer.getSource().clear();
    this.removeAddFeaturesLayerResultInteraction(true);
    this._asyncFnc = {
      todo:                      () => {},
      zoomToLayerFeaturesExtent: { async: false },
      highLightLayerFeatures:    { async: false },
      goToGeometry:              { async: false },
    };
    this.clearState();
    this.closeComponent();
    this.resultsQueryLayer.getSource().clear();
    GUI.getService('map').getMap().removeLayer(this.resultsQueryLayer);
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
    if (this._asyncFnc.zoomToLayerFeaturesExtent.async) {
      this._asyncFnc.todo = GUI.getService('map').zoomToFeatures.bind(GUI.getService('map'), layer.features || [], options);
    } else {
      GUI.getService('map').zoomToFeatures(layer.features || [], options);
    }
  }

  /**
   * @FIXME add description
   *
   * @param layer
   * @param options
   */
  highLightLayerFeatures(layer, options = {}) {
    if (this._asyncFnc.highLightLayerFeatures.async) {
      this._asyncFnc.todo = GUI.getService('map').highlightFeatures.bind(GUI.getService('map'), layer.features || [], options);
    } else {
      GUI.getService('map').highlightFeatures(layer.features || [], options);
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
    // clear actions
    Object.values(this.state.layersactions).forEach(l => l.forEach(a => a.clear && a.clear()));
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
   * @param layerId
   */
  getAtlasByLayerId(layerId) {
    return this._atlas.filter(a => a.atlas.qgs_layer_id === layerId);
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
          case 'intersects': add = intersects(geometry, f.getGeometry());                  break;
          case 'within':     add = within(geometry, f.getGeometry());                      break;
          default:           add = geometry.intersectsExtent(f.getGeometry().getExtent()); break;
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
  _printSingleAtlas({
    atlas    = {},
    features = [],
  } = {}) {
    let field = atlas.atlas && atlas.atlas.field_name ? atlas.atlas.field_name : '$id';
    return printAtlas({
      field,
      values:   features.map(feat => feat.attributes['$id' === field ? G3W_FID : field]),
      template: atlas.name,
      download: true
    })
    .then(({ url }) => GUI.downloadWrapper(downloadFile, { url, filename: atlas.name, mime_type: 'application/pdf' }));
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
    layer.downloadformats.active = !layer.downloadformats.active;
    this.setLayerActionTool({
      layer,
      component: layer.downloadformats.active ? DownloadFormats : null,
      config: layer.downloadformats.active
        ? {
            ...this.state.actiontools.downloadformats[layer.id],
            //for download layer need to filter pdf format because it works only for a single feature
            downloads: this.state.actiontools.downloadformats[layer.id].downloads.filter(d => 'pdf' !== d.format)
          }
        : null
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
   * @param html
   */
  async downloadFeatures(type, layer, features = [], action, index, html) {

    if (features && !Array.isArray(features)) {
      features = [features];
    }

    const { query = {} } = this.state;
    const data           = {
      fids: features.map(f => f.attributes[G3W_FID]).join(',')
    };

    //In the case of pdf type need to add html element
    if ('pdf' === type) {
      data.html = html;
    }

    /**
     * A function that che be called in case of querybypolygon
     *
     * @param active
     */
    const runDownload = async (active=false) => {

      if (features.length > 1) {
        layer.downloadformats.active = active;
        this.setLayerActionTool({ layer });
      }

      await GUI.downloadWrapper(
        ({layer, type, data}= {}) => getCatalogLayerById(layer.id).getDownloadFilefromDownloadDataType(type, { data }) || Promise.resolve(),
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
      if (features.length > 1 && undefined !== downloadsactions) {
        layer.downloadformats.active = false;
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
    if (this.isOneLayerResult()) {
      GUI.getService('map').highlightFeatures(layer.features, { duration: Infinity });
    }
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
        internalComponent: new (Vue.extend(require('components/RelationsPage.vue')))({
          currentview:      'relation',
          relations:        [projectRelation],
          chartRelationIds: this.plotLayerIds.find(pid => pid == projectRelation.referencingLayer) ? [projectRelation.referencingLayer] : [],
          nmRelation:       this._project.getRelationById(relation.nmRelationId),
          layer:            { id: layerId },
          feature,
        })
      }),
      crumb: {
        title: projectRelation.name,
        text: true,
      },
      title: projectRelation.name,
      text  : true,
      closable: false
    })
  };

  /**
   * Get id of the  feature
   *
   * @since 3.9.0
   */
  _getFeatureId(feature, external) {
    return external ? feature.id : feature.attributes[G3W_FID];
  }

  /**
   * @TODO make it simpler..
   * @TODO make it a Layers class function ? 
   * 
   * Add / Remove features from selection
   * 
   * ORIGINAL SOURCE: src/app/gui/queryresults/queryresultsservice.js@3.8.12::addToSelection
   * 
   * @since 3.9.0
   */
  addToSelection(layer, feature, action, index) {
    const service          = GUI.getService('queryresults');
    const map              = GUI.getService('map');

    // TODO: avoid referencing this private stuff
    const getFeatureId       = service._getFeatureId.bind(service);
    const getActionLayerById = service.getActionLayerById.bind(service);

    const GIVE_ME_A_NAME = undefined === feature && undefined === action && undefined === index;
    const _action        = GIVE_ME_A_NAME ? getActionLayerById({ layer, id: 'selection' })                  : action;
    const toggled        = GIVE_ME_A_NAME && Object.values(_action.state.toggled).reduce((prev, curr) => prev && curr, true);
    const _layer         = GIVE_ME_A_NAME ? (layer.external ? layer : getCatalogLayerById(layer.id))        : (((service.state.layers.find(l => l.id === layer.id) || {}).external || false) ? layer : getCatalogLayerById(layer.id));
    const features       = GIVE_ME_A_NAME ? (layer.features && layer.features.length ? layer.features : []) : [feature];
    const params         = GIVE_ME_A_NAME ? {
      fids: features.length > 0 ? features.map(f => _layer.external ? f.id : f.attributes[G3W_FID]) : null,
      features,
      force: toggled ? 'remove' : 'add'
    } : {
      fids: [feature ? getFeatureId(feature, _layer.external) : null],
      features,
      index,
      force: undefined
    };

    if (!GIVE_ME_A_NAME) {
      _action.state.toggled[index] = !_action.state.toggled[index];
    }

    /**
     * PROJECT LAYER
     */
    if (!layer.external && ![null, undefined].includes(params.fids)) {
      let layer                     = _layer;
      let { fids, features, force } = params;

      fids     = Array.isArray(fids) ? fids : [fids];
      features = Array.isArray(features) ? features : [features];
    
      const include = []; // fid of features to include
      const exclude = []; // fid of features to exclude
    
      fids.forEach((fid, idx) => {
        const feature     = features[idx];
        const is_selected = layer.state.filter.active || layer.hasSelectionFid(fid);
      
        // if not already selected and feature is not added to OL selection layer on map --> add as feature of selected layer
        if (!is_selected && feature && feature.geometry && !layer.getOlSelectionFeature(fid)) {
          layer.addOlSelectionFeature({ id: fid, feature });
        }
      
        // force action
        if (undefined === force) {
          layer[is_selected ? 'excludeSelectionFid' : 'includeSelectionFid'](fid);
        }
    
        // force add
        if ('add' === force && !is_selected) {
          include.push(fid);
        }
    
        // force remove
        if ('remove' === force) {
          exclude.push(fid);
        }
      });
    
      layer.includeSelectionFids(include, false);
      layer.excludeSelectionFids(exclude, false);

      (
        layer.state.filter.active
          ? layer.createFilterToken()
          : Promise.resolve()
      ).then(() => {
        const { layers } = GUI.getService('queryresults').getState();
    
        /** @TODO add description */
        fids.forEach((fid, idx) => {
          const currentLayer = (
            !layer.hasSelectionFid(fid) &&
            layer.state.filter.active &&
            layer.getSelectionFids().size > 0 &&
            layers.find(l => l.id === layer.getId())
          );
          if (currentLayer) {
            currentLayer.features.splice(undefined === index ? idx : index, 1);
          }
        })
      
        map.clearHighlightGeometry();
      
        /** @TODO add description */
        if (1 === layers.length && !layers[0].features.length) {
          layers.splice(0);
        }
      });

    }

    /**
     * EXTERNAL LAYER
     */
    if (layer.external && ![null, undefined].includes(params.fids)) {

      let layer                     = _layer;
      let { fids, features, force } = params;

      //Take in account array or single fid
      features = Array.isArray(features) ? features : [features];

      //check if layer.selection.features is undefined
      if (undefined === layer.selection.features) {
        //set array
        layer.selection.features = [];
      }
    
      fids.forEach((fid, i) => {
        const feature = features[i];

        // Set feature used in selection tool action
        if (undefined === layer.selection.features.find(f => f.getId() === fid)) {
          // create ol feature from object
          let feat = feature;
          const { attributes } = feature;
          if (feature.geometry) {
            feat = new ol.Feature(feature.geometry);
            feat.setId(fid);
          }
          Object.keys(attributes).forEach(attr => feat.set(attr, attributes[attr]));
          feat.__layerId = layer.id;
          feat.selection = feature.selection;
          layer.selection.features.push(feat);
        }
    
        //check if feature is already select or feature is already removed (no selected)
        /** If not changes to apply return */
        if (('add' === force && feature.selection.selected) || ('remove' === force && !feature.selection.selected)) {
          return;
        }
    
        /**Switch selected boolean value */
        feature.selection.selected = !feature.selection.selected;
    
        /** Need to add selection on map */
        map.setSelectionFeatures(
          (feature.selection.selected ? 'add' : 'remove'),
          {
            feature: layer.selection.features.find(selectionFeature => fid === selectionFeature.getId())
          }
        );
      })

      // Set selection layer active based on features selection selected properties.
      layer.selection.active = layer.selection.features.reduce((acc, feature) => acc || feature.selection.selected, false);
    }

    if (GIVE_ME_A_NAME) {
      layer.features.forEach((f, i) => _action.state.toggled[i] = !toggled);
    }

  }

});