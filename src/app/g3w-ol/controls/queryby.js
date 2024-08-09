/**
 * @file
 * @since 3.11.0
 */

import { SPATIAL_METHODS }            from 'app/constant';
import { VM }                         from 'app/eventbus';
import CatalogLayersStoresRegistry    from 'store/catalog-layers';
import GUI                            from 'services/gui';
import DataRouterService              from 'services/data';
import ProjectsRegistry               from 'store/projects';
import { InteractionControl }         from 'g3w-ol/controls/interactioncontrol';
import { throttle }                   from 'utils/throttle';
import { getAllPolygonGeometryTypes } from 'utils/getAllPolygonGeometryTypes';

const PickCoordinatesInteraction      = require('g3w-ol/interactions/pickcoordinatesinteraction');
const { t }                           = require('core/i18n/i18n.service');

const POLYGON_TYPES = getAllPolygonGeometryTypes();

/**
 * Child interaction controls
 */
const CONTROLS = {};

/**
 * Spatial query options
 */
const QUERY = {
  /** @type {ol.coordinate} bbox coordinates */
  bbox:          null,
  /** @type { ol.Feature } drawed feature */
  dfeature:      null,
  layer:         null,
  feature:       null,
  coordinates:   null,
};


/**
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybybboxcontrol.js@v3.9.10
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybypolygoncontrol.js@v3.9.10
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybydrawpolygoncontrol.js@v3.9.10
 */
export class QueryBy extends InteractionControl {

  constructor(opts = {}) {

    super({
      ...opts,
      name:     'queryby',
      label:    "\ue903",
      tipLabel: "sdk.mapcontrols.queryby.title",
      enabled:  true,
    });

    this.types = [];

    (opts.types || []).forEach(type => this.addType(type));

    // no type set, hide control
    if (0 === this.types.length) {
      this.setVisible(false);
    } else {
      this.element.classList.add('ol-' + this.types[0]);
    }

    CONTROLS['queryby'] = this;

    // toolbox (options)
    this.on('toggled', ({ toggled }) => {
      if (!toggled) {
        return GUI.closeUserMessage();
      }
      GUI.showUserMessage({
        title: 'sdk.mapcontrols.queryby.title',
        type: 'tool',
        size: 'small',
        closable: false,
        hooks: {
          body: {
            data: () => ({
              types:         this.types,
              type:          this.types[0],
              methods:       SPATIAL_METHODS,
              method:        this.getSpatialMethod(),
              layers:        [],
              selectedLayer: GUI.getService('map').getSelectedLayer(),
            }),
            template: /* html */ `
              <div style="width: 100%;">
                <!-- DOCS URL -->
                <a
                  :href  = "'https://g3w-suite.readthedocs.io/en/v3.8.x/g3wsuite_client.html#map-controls'"
                  target = "_blank"
                  style  = "position: absolute;inset: 1em 1em auto auto;"
                  title  = "Docs"
                >
                  <i :class = "g3wtemplate.getFontClass('external-link')"></i>
                </a>
                <!-- SPATIAL METHOD -->
                <div style="padding: 5px;">
                  <select :search="false" v-select2="'method'">
                    <option v-for="method in methods" :value="method" v-t="'sdk.mapcontrols.queryby.methods.' + method"></option>
                  </select>
                </div>
                <!-- QUERY TYPE -->
                <div style="padding: 5px;">
                  <select :search="false" v-select2="'type'" :templateSelection="templateType" :templateResult="templateType">
                    <option v-for="type in types" :value="type" v-t="'sdk.mapcontrols.queryby.' + type + '.tooltip'"></option>
                  </select>
                </div>
                <!-- SELECTED LAYER -->
                <div style="padding: 5px;">
                  <label v-t="'sdk.mapcontrols.queryby.layer'"></label>
                  <select ref="layer" v-select2="'selectedLayer'" @change="selectLayer" :templateSelection="templateLayer" :templateResult="templateLayer">
                    <option v-t="all" :value="'__ALL__'"></option>
                    <option v-for="layer in layers" :value="layer.getId()" :selected="layer.getId() === selectedLayer">{{ layer.get('name') }}</option>
                    <option :value="'__NEW__'" v-t="'sdk.mapcontrols.queryby.new'"></option>
                  </select>
                </div>
                <!-- HELP TEXT -->
                <div class="queryby-control-help-message" ref="help" v-t-html="help"></div>
                <!-- CLEAR SELECTION -->
                <button class="clear-selected-layer btn btn-block btn-warning" :class="{ 'hidden': !selectedLayer }" @click="clearSelectedLayer"><i :class = "g3wtemplate.getFontClass('clear')"></i> <span v-t="'layer_selection_filter.tools.clear'"></span></button>
              </div>`,
            computed: {
              control()   { return CONTROLS[this.type]; },
              queryable() { return (this.control.layers || []).filter(l => 'querybypolygon' === this.type ? POLYGON_TYPES.includes(l.getGeometryType()) : true); },
              no_layers() { return !this.queryable || !_hasVisible(this.control) },
              help()      { return `sdk.mapcontrols.${this.type}.help.message`; },
              all()       { return this.no_layers ? 'sdk.mapcontrols.queryby.none' : 'sdk.mapcontrols.queryby.all'; }
            },
            watch: {
              method()  { this.reset(); },
              type()    { this.reset(); },
              control() { this.types.forEach(t => CONTROLS['queryby'].element.classList.toggle('ol-' + t, t === this.type)); },
              // see: https://forums.select2.org/t/cannot-rename-selected-option/154/2
              no_layers() {
                if (this.no_layers) { $(this.$refs.layer).val('__ALL__'); }
                $(this.$refs.layer).select2('close');
                $(this.$refs.layer).find('option[value="__ALL__"]').text(t(this.all));
                $(this.$refs.layer).select2('data')[0].text = t(this.all);
                $(this.$refs.layer).trigger('change');
              },
            },
            methods: {
              reset() {
                /** @FIXME use v-t="help" */
                this.$refs.help.innerHTML = t(this.help);
                this.layers.splice(0);
                // reset autorun options
                this.types.filter(t => t !== this.type).forEach(t => {
                  if ('querybbox' === t)          { QUERY.bbox     = null; }
                  if ('querybypolygon' === t)     { QUERY.layer    = null; QUERY.feature = null; QUERY.coordinates = null; }
                  if ('querybydrawpolygon' === t) { QUERY.dfeature = null; }
                  CONTROLS[t].autorun = false;
                });
                this.control.spatialMethod = this.method;
                this.control.toggle(true, { parent: CONTROLS['queryby'].id });
                // show highlight class
                if ('querybbox' === this.type) {
                  this.control.layers.forEach(l => l.setTocHighlightable(true));
                  GUI.getService('map').getLegacyExternalLayers().forEach(l => l.tochighlightable = true);
                }
                // set queryable layers (select2)
                setTimeout(() => {
                  this.layers.push(...this.queryable);
                  // ensure selected layer can be used for current control
                  if (!this.layers.find(l => l.getId() === this.selectedLayer)) {
                    this.clearSelectedLayer();
                  }
                });
                if ('querybypolygon' === this.type) {
                  this.control.setEnable(false);
                }
                // re-run query when changing spatial method
                if (this.control.autorun) {
                  CONTROLS['queryby'].runSpatialQuery(this.type);  
                }
              },
              selectLayer(id) {
                const map = GUI.getService('map'); 
                if ('string' === typeof id) {
                  this.selectedLayer = id;
                }
                // auto select added layer
                if ('__NEW__' === this.selectedLayer) {
                  const listener = map.onafter('loadExternalLayer', l => {
                    map.selectLayer(l.get('id'));
                    this.reset();
                  });
                  $('#modal-addlayer').one('hidden.bs.modal', () => map.un('loadExternalLayer', listener));
                  map.showAddLayerModal();
                }
                if (['__ALL__', '__NEW__'].includes(this.selectedLayer)) {
                  this.selectedLayer = false;
                }
                if (id instanceof Event) {
                  GUI.getService('map').selectLayer(this.selectedLayer);
                } else {
                  $(this.$refs.layer).val(id).trigger('change');
                }
              },
              clearSelectedLayer() {
                this.selectedLayer = false;
                $(this.$refs.layer).val('__ALL__').trigger('change');
                GUI.getService('map').selectLayer();
              },
              templateType(state) {
                if (!state.id) { return state.text }
                return $(/*html*/`<span><i class="${ GUI.getFontClass(({
                  'querybbox':          'square',
                  'querybydrawpolygon': 'draw',
                  'querybypolygon':     'pointer',
                })[state.id]) }"></i>&nbsp;&nbsp;${state.text}</span>`);
              },
              templateLayer(state) {
                if (!state.id || '__NEW__' === state.id) { return state.text }
                const externalLayers = GUI.getService('map').getLegacyExternalLayers();
                const layer = CatalogLayersStoresRegistry.getLayerById(state.id) || externalLayers.find(l => l.get('id') === state.id);
                /** @FIXME layer is undefined when removing an external layer */
                const icon = ('__ALL__' === state.id || !layer ? '' : /*html */ `<i class="${ GUI.getFontClass( layer.isVisible() ? 'eye' : 'eye-close') }"></i>&nbsp;&nbsp;`)
                return $(/*html*/`<span>${ icon }${ state.text }</span>`);  
              } 
            },
            mounted() {
              CONTROLS['queryby'].usermessage = this;
              GUI.setCloseUserMessageBeforeSetContent(false);
              this.reset();
            },
            beforeDestroy: () => {
              GUI.setCloseUserMessageBeforeSetContent(true);
              this.types.forEach(t => {
                CONTROLS[t].toggle(false);
                CONTROLS[t].autorun = false;
                CONTROLS['queryby'].element.classList.toggle('ol-' + t, t === this.types[0])
              });
              GUI.getService('map').selectLayer();
            }
          }
        }
      });
    });
  }

  /**
   * @param { 'area' | 'length' } type 
   *
   * @since 3.11.0
   */
  addType(type) {

    // skip when already added
    if (this.types.includes(type)) {
      return;
    }

    // keep "querybypolygon" at last position
    this.types.splice(
      this.types.includes('querybypolygon')
        ? this.types.indexOf('querybypoyling')
        : this.types.length,
        0,
        type
    );

    /**
     * @TODO remove `InteractionControl` and use a standard `ol.interaction`
     */
    const control = CONTROLS[type] = new InteractionControl({
      name:             type,
      offline:          false,
      visible:          false,
      geometryTypes:    ['querybypolygon','querybydrawpolygon'].includes(type) ? POLYGON_TYPES : [],
      interactionClass: ({
        'querybbox':          ol.interaction.DragBox,
        'querybydrawpolygon': ol.interaction.Draw,
        'querybypolygon':     PickCoordinatesInteraction,
      })[type],
      interactionClassOptions: 'querybydrawpolygon' === type ? { type: 'Polygon' } : {},
      layers: _getAvailableLayers(type),
      onSetMap({ setter, map }) {
        if ('after' !== setter) {
          return;
        }

        if ('querybbox' === type) {
          let startCoord = null;
          this._interaction.on('boxstart',        e => startCoord = e.coordinate);
          this._interaction.on('boxend', throttle(e => {
            QUERY.bbox = ol.extent.boundingExtent([startCoord, e.coordinate]);
            this.dispatchEvent({ type: 'bboxend', extent: QUERY.bbox });
            startCoord = null;
            if (this._autountoggle) {
              this.toggle();
            }
          }));
          this.setEventKey({
            eventType: 'bboxend',
            eventKey: this.on('bboxend', () => CONTROLS['queryby'].runSpatialQuery('querybbox'))
          });
        }

        if ('querybydrawpolygon' === type) {
          this._interaction.on('drawend', throttle(e => {
            QUERY.dfeature = e.feature;
            this.dispatchEvent({ type: 'drawend', feature: QUERY.dfeature });
            if (this._autountoggle) {
              this.toggle();
            }
          }));
          this.setEventKey({
            eventType: 'drawend',
            eventKey: this.on('drawend', () => CONTROLS['queryby'].runSpatialQuery('querybydrawpolygon'))
          });
        }

        if ('querybypolygon' === type) {

          this._interaction.on('picked', throttle(async e => {
            QUERY.coordinates = e.coordinate;
            this.dispatchEvent({ type: 'picked', coordinates: QUERY.coordinates });
            if (this._autountoggle) {
              this.toggle();
            }
          }));
      
          // get polygon feature from coordinates
          this.setEventKey({
            eventType: 'picked',
            eventKey: this.on('picked', async () => {

              GUI.closeOpenSideBarComponent();
          
              // ask for coordinates
              try {
                const { data = [] } = await DataRouterService.getData('query:coordinates', {
                  inputs: {
                    feature_count: ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
                    coordinates: QUERY.coordinates
                  },
                  outputs: {
                    // whether to show picked coordinates on map
                    show({data = [], query}) {
                      const show = data.length === 0;
                      // set query coordinates to null in case to avoid `externalvector` added to query response
                      query.coordinates = show ? query.coordinates : null;
                      return show;
                    }
                  }
                });
                if (data.length && data[0].features.length) {
                  QUERY.feature = data[0].features[0];
                  QUERY.layer   = data[0].layer;
                  CONTROLS['queryby'].runSpatialQuery('querybypolygon')
                }
              } catch(e) {
                console.warn('Error running spatial query:', e);
              }
            })
          });
      
          this.setEnable(false);
        }
      },
    });

    GUI.getService('map').addControl(type, type, control, false, false);

    control._interaction.on('change:active', e => {
      if ('querybbox' === type) {
        this.setMouseCursor(e.target.get(e.key), 'ol-crosshair');              // set mouse cursor
      }
      if (['querybbox', 'querybydrawpolygon'].includes(type)) {
        GUI.getService('catalog').state.highlightlayers = e.target.get(e.key); // highlight layers in legend
      }
    });

    // listen for layers visibility change
    this.unwatches = this.unwatches || [];
    this.unwatches.forEach(unwatch => unwatch());
    this.unwatches.splice(0);
    this.unwatches.push(
      ...this.types.flatMap(t => {
        const control = CONTROLS[t];
        return (control.layers || []).map(layer => VM.$watch(
          () => layer.state.visible,
          () => {
            // toggle "eye" / "eye-close" icon
            if(this.usermessage) {
              $(this.usermessage.$refs.layer).trigger('change');
            }
            // toggle control interaction
            control.setEnable(control.isToggled() && _hasVisible(control))
            control._interaction.setActive(control.getEnable());
          })
        )
      })
    );

  }

  /**
   * @param layer 
   */
  onSelectLayer(layer) {

    /** @FIXME handle "selectedLayer" within usermessage */
    const btn = document.querySelector('.usermessage-content .clear-selected-layer');
    if (btn) {
      btn.classList.toggle('hidden', !layer);
    }

    if (this.usermessage) {
      this.usermessage.selectLayer(layer ? layer.getId() : '__ALL__'); 
    }

    this.types.forEach(t => {
      const control = CONTROLS[t];

      const selected = layer && control.layers.find(l => l === layer);
      const queryable = layer && layer.isQueryable() && (control.getGeometryTypes() || []).includes(layer.getGeometryType());

      if (['querybbox', 'querybydrawpolygon'].includes(t)) {
        control.setEnable(control.isToggled() && (layer ? (selected && selected.isVisible()) : _hasVisible(control)));
      }

      if ('querybypolygon' === t) {
        control.setEnable(control.isToggled() && queryable && _hasVisible(control));
      }

      control._interaction.setActive(control.getEnable());
    });
  }

  /**
   * @param {{ layer, unWatches }}
   */
  onAddExternalLayer({ layer, unWatches }) {
    this.types.forEach(t => {
      const control = CONTROLS[t];

      control.layers = _getAvailableLayers(t);

      // set layer property
      if ('querybbox' === t) {
        layer.setTocHighlightable(control.isToggled() && control.getEnable())
      }

      // watch `layer.selected` and `layer.visible` properties
      unWatches.push(VM.$watch(
        () => [layer.selected, layer.visible],
        () => {
          control.setEnable(control.isToggled() && (layer.selected ? layer.visible : _hasVisible(control)));
          control._interaction.setActive(control.getEnable());
        },
        { immediate: true }
      ));
    });
  }

  /**
   * @since 3.8.0
   */
  onRemoveExternalLayer(layer) {
    this.types.forEach(t => {
      const control = CONTROLS[t];
      control.layers = _getAvailableLayers(t).filter(l => l.getId() !== layer.getId());
      control.setEnable(control.isToggled() && _hasVisible(CONTROLS[t]));
      control._interaction.setActive(control.getEnable());
    });
    /** @TODO find a better way to update "layers" list (select2) within vue component */
    setTimeout(() => {
      if (this.usermessage) {
        this.usermessage.reset();
      }
    });
  }

  async runSpatialQuery(type) {
    try {

      const control = CONTROLS[type];

      GUI.closeOpenSideBarComponent();

      if (
        // skip if bbox is not set
        ('querybbox' === type && null === QUERY.bbox) ||
        // skip when .. ?
        ('querybypolygon' === type && [QUERY.coordinates, QUERY.feature, QUERY.layer].includes(null))
      ) {
        return;
      }

      const selected       = GUI.getService('map').getSelectedLayer();
      const externalLayers = GUI.getService('map').getLegacyExternalLayers();

      if ('querybbox' === type) {
        await DataRouterService.getData('query:bbox', {
          inputs: {
            bbox:          QUERY.bbox,
            feature_count: ProjectsRegistry.getCurrentProject().getQueryFeatureCount(),
            addExternal:   (!selected || externalLayers.some(l => l === selected)),
            // Catalog layers (TOC) properties that need to be satisfied
            layersFilterObject: {
              SELECTED_OR_ALL: true, // selected or all
              FILTERABLE: true,      // see: src/app/core/layers/layer.js#L925
              VISIBLE: true          // need to be visible
            },
            condition:     { filtrable: { ows: 'WFS' } },
            multilayers:   ProjectsRegistry.getCurrentProject().isQueryMultiLayers(control.name),
            filterConfig:  { spatialMethod: control.getSpatialMethod() }, // added spatial method to polygon filter
          }
        });
      }

      if (['querybypolygon','querybydrawpolygon'].includes(type)) {
        await DataRouterService.getData('query:polygon', {
          inputs: {
            layerName:       'querybypolygon' === type ? (QUERY.layer.getName ? QUERY.layer.getName() : QUERY.layer.get('name')) : '',
            excludeSelected: 'querybypolygon' === type || !selected,
            feature:         'querybypolygon' === type ? QUERY.feature : QUERY.dfeature,
            external:        {
              add:           'querybypolygon' === type || (!selected || externalLayers.some(l => l === selected)),
              filter: {
                SELECTED:    'querybydrawpolygon' === type && (!selected || externalLayers.some(l => l === selected))
              }
            },
            /** @since 3.9.0 - custom 'drawpolygon' type **/
            type:            'querybypolygon' === type ? 'polygon' : 'drawpolygon',
            multilayers:     ProjectsRegistry.getCurrentProject().isQueryMultiLayers(control.name),
            filterConfig:    { spatialMethod: control.getSpatialMethod() }, // added spatial method to polygon filter
          },
          outputs: {
            show: ({ error=false }) => !error,
          },
        });
      }

      control.autorun = true;

    } catch(e) {
      console.warn('Error running spatial query: ', e);
    }

  }

}

/**
 * @returns {boolean} whether control has a visible layer 
 */
function _hasVisible(control) {

  const selected = GUI.getService('map').getSelectedLayer();

  // whether one layer is visible (and not selected)
  if ('querybypolygon' === control.name) {
    return !!(
      // check if current selected layer is visible
      selected && selected.isVisible() &&
      // check if at least one layer is visible (project or external layer)
      (
        control.layers.some(l => (l !== selected) && (l.isVisible() && l.isFilterable({ ows: 'WFS' }))) ||
        GUI.getService('map').getLegacyExternalLayers().find(l => l !== selected && true === l.visible)
      )
    );
  }

  // whether one layer is visible
  return !!((control.layers || []).some(l => l.isVisible()) || GUI.getService('map').getLegacyExternalLayers().some(l => l.visible));
}

/**
 * @TODO get rid of `s.getLayers` call
 */
function _getAvailableLayers(type) {
  const { MapLayersStoresRegistry } = require('gui/map/mapservice');
  const queryable = MapLayersStoresRegistry.getQuerableLayersStores();
  return [...new Set([

    // WFS
    ...queryable
        .flatMap(s => s.getLayers({ GEOLAYER: true, FILTERABLE: true, SELECTED_OR_ALL: true }, { filtrable: { ows: 'WFS' } }))
        .filter(l => 'wfs' === l.getProvider('filter').getName()),

    // POLYGONS
    ...(GUI.getService('map').getLegacyExternalLayers() || [])
      .filter(l => 'querybypolygon' === type ? POLYGON_TYPES.includes(l.getGeometryType()) : true),

    // SELECTED POLYGONS
    ...(
      'querybypolygon' === type
        ? queryable.flatMap(s => s.getLayers({ GEOLAYER: true, QUERYABLE: true, SELECTED_OR_ALL: true }, {}))
        : []
      ),
  ])];
}