/**
 * @file
 * @since 3.11.0
 */

import {
  GEOMETRY_TYPES,
  SPATIAL_METHODS
}                                     from 'g3w-constants';
import { VM }                         from 'g3w-eventbus';
import GUI                            from 'services/gui';
import DataRouterService              from 'services/data';
import ApplicationState               from 'store/application'
import InteractionControl             from 'map/controls/interactioncontrol';
import PickCoordinatesInteraction     from 'map/interactions/pickcoordinatesinteraction';
import { throttle }                   from 'utils/throttle';
import { getCatalogLayerById }        from 'utils/getCatalogLayerById';

const { t }                           = require('g3w-i18n');

const POLYGON_TYPES = [
  GEOMETRY_TYPES.POLYGON,
  GEOMETRY_TYPES.POLYGONZ,
  GEOMETRY_TYPES.POLYGONM,
  GEOMETRY_TYPES.POLYGONZM,
  GEOMETRY_TYPES.POLYGON25D,
  GEOMETRY_TYPES.MULTIPOLYGON,
  GEOMETRY_TYPES.MULTIPOLYGONZ,
  GEOMETRY_TYPES.MULTIPOLYGONM,
  GEOMETRY_TYPES.MULTIPOLYGONZM,
  GEOMETRY_TYPES.MULTIPOLYGON25D,
];

/**
 * Child interaction controls
 */
const CONTROLS = {};

/**
 * Spatial query options
 */
const QUERY = Vue.observable({
  /** @type {ol.coordinate} bbox coordinates */
  bbox:          null,
  /** @type { ol.Feature } drawed feature */
  dfeature:      null,
  layer:         null,
  feature:       null,
  coordinates:   null,
  radius:        0,
});

/**
 * Return current layer id selected or __ALL__ (no layer selected)
 * @return {string}
 */
function getSelectedLayerId() {
  return (GUI.getService('map').getSelectedLayer() || { getId() { return '__ALL__'; } }).getId();
}

/**
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybybboxcontrol.js@v3.9.10
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybypolygoncontrol.js@v3.9.10
 * ORIGINAL SOURCE: src/app/g3w-ol/controls/querybydrawpolygoncontrol.js@v3.9.10
 */
export class QueryBy extends InteractionControl {

  constructor(opts = {}) {

    super({
      ...opts,
      name:        'queryby',
      label:       "\ue903",
      tipLabel:    "sdk.mapcontrols.queryby.title",
      enabled:     true,
      cursorClass: null, //store cursorClass of a current sub control enabled (querybbox, etc..)
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

    this.selectedLayer = '__ALL__';

    // toolbox (options)
    this.on('toggled', ({ toggled }) => {
      if (!toggled) {
        return GUI.closeUserMessage();
      }
      GUI.showUserMessage({
        title: 'sdk.mapcontrols.queryby.title',
        type: 'tool',
        size: 'small',
        iconClass: 'info',
        closable: false,
        hooks: {
          body: {
            data: () => ({
              types:         this.types,
              type:          this.types[0],
              methods:       SPATIAL_METHODS,
              method:        this.getSpatialMethod(),
              layers:        [],
              selectedLayer: getSelectedLayerId(),
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
                  <i :class = "$fa('external-link')"></i>
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
                <!-- RADIUS TYPE IN METERS-->
                <div v-if="'querybycircle' === type" style="padding: 5px;">
                  <label for="g3w_querybycircle_radius" v-t:pre="'sdk.mapcontrols.querybycircle.label'">[m]</label>
                  <div style = "display: flex">
                    <input
                      id      = "g3w_querybycircle_radius"
                      v-model = "radius"
                      class   =  "form-control"
                      step    = '1'
                      min     = '0'
                      type    = "number"/>
                    <!-- CLEAR RADIUS -->
                    <button 
                      type        = "button" 
                      @click.stop = "radius = 0" 
                      class       = "btn btn-default"
                    >
                      <i :class="$fa('clear')"></i>
                    </button>
                  </div>
                </div>
                <!-- SELECTED LAYER -->
                <div style = "padding: 5px;">
                  <label v-t="'sdk.mapcontrols.queryby.layer'"></label>
                  <select ref="layer" :select2_value = "selectedLayer" v-select2="'selectedLayer'" :templateSelection="templateLayer" :templateResult="templateLayer">
                    <option v-t="all" :value ="'__ALL__'"></option>
                    <option v-for="layer in layers" :value="layer.getId()" :selected="selectedLayer === layer.getId()">{{ layer.get('name') }}</option>
                    <option :value="'__NEW__'" v-t="'sdk.mapcontrols.queryby.new'"></option>
                  </select>
                </div>
                <!-- HELP TEXT -->
                <div ref="help" v-t-html="help"></div>
                <!-- CLEAR SELECTION -->
                <button v-if = "!['__ALL__', '__NEW__'].includes(selectedLayer)" class="clear-selected-layer btn btn-block btn-warning"  @click.stop="selectedLayer = '__ALL__'"><i :class = "$fa('clear')"></i> <span v-t="'layer_selection_filter.tools.clear'"></span></button>
              </div>`,
            computed: {
              control()   { return CONTROLS[this.type]; },
              queryable() { return (this.control.layers || []).filter(l => 'querybypolygon' === this.type ? POLYGON_TYPES.includes(l.getGeometryType()) : true); },
              no_layers() { return !this.queryable || !_hasVisible(this.control) },
              help()      { return `sdk.mapcontrols.${this.type}.help.message`; },
              all()       { return this.no_layers ? 'sdk.mapcontrols.queryby.none' : 'sdk.mapcontrols.queryby.all'; },
              radius:    {
                get() { return QUERY.radius },
                set(v) {
                  if (Number.isNaN(v) || v < 0) {
                    this.radius = QUERY.radius;
                    return;
                  }
                  //need to convert degree in meter
                  QUERY.radius = Math.floor(v * ('m' === GUI.getService('map').getMapUnits() ? 1 : ol.proj.Units.METERS_PER_UNIT.degrees));
                  //already circle drawed but not clear (0) value
                  if (QUERY.dfeature && QUERY.radius > 0) {
                    QUERY.dfeature.getGeometry().setRadius(QUERY.radius);
                    CONTROLS['queryby'].runSpatialQuery(this.type);
                  }
                }
              }
            },
            watch: {
              method()  { this.reset(); },
              type()    {
                //after a change type needs to check, is all being updated to change select2 option text
                this.reset().then( () => this.update__ALL__Text())
              },
              control() { this.types.forEach(t => CONTROLS['queryby'].element.classList.toggle('ol-' + t, t === this.type)); },
              layers() {
                this.selectedLayerNotQuerable();
              },
              // see: https://forums.select2.org/t/cannot-rename-selected-option/154/2
              all() {
                this.update__ALL__Text();
              },
              selectedLayer: {
                immediate: true,
                handler(value, oldValue) {
                  this.selectedLayerNotQuerable();
                  //It means that it is mounted. No value before
                  if (undefined === oldValue) {
                    return;
                  }
                  const map = GUI.getService('map');
                  // auto selects added layer
                  if ('__NEW__' === value) {
                    const listener = map.onafter('loadExternalLayer', l => {
                      map.selectLayer(l.get('id'));
                      this.reset();
                    });
                    $('#modal-addlayer').one('hidden.bs.modal', () => map.un('loadExternalLayer', listener));
                    map.showAddLayerModal();
                  }

                  if (!['__ALL__', '__NEW__'].includes(value) && value !== getSelectedLayerId() ) {
                    map.selectLayer(value);
                  }
                  //reset selection if a selection is done by TOC catalog
                  if (['__ALL__', '__NEW__'].includes(value) && '__ALL__' !== getSelectedLayerId()) {
                    map.selectLayer();
                  }
                }
              },
            },
            methods: {
              /**
               * Update selects2 the __ALL__ option text as to select all change text
               */
              update__ALL__Text() {
                $(this.$refs.layer).select2('close');
                $(this.$refs.layer).find('option[value="__ALL__"]').text(t(this.all));
                $(this.$refs.layer).select2('data')[0].text = t(this.all);
                $(this.$refs.layer).trigger('change');
              },
              selectedLayerNotQuerable() {
                //In the case of selection of layer (by TOC) that not belong to a layer list,
                // set the value of selectedLayer __ALL__
                if (
                  !['__ALL__', '__NEW__'].includes(this.selectedLayer)
                  && this.layers.length
                  && !this.layers.map(l => l.getId()).includes(this.selectedLayer)
                ) { this.selectedLayer = '__ALL__'; }
              },
              async reset() {
                this.layers.splice(0);
                // reset autorun options
                this.types.filter(t => t !== this.type).forEach(t => {
                  if ('querybycircle' === t)      { QUERY.radius   = 0; }
                  if ('querybbox' === t)          { QUERY.bbox     = null; }
                  if ('querybypolygon' === t)     { QUERY.layer    = null; QUERY.feature = null; QUERY.coordinates = null; }
                  if (![
                    'querybydrawpolygon','querybycircle'
                  ].includes(this.type))          { QUERY.dfeature = null; }
                  CONTROLS[t].autorun = false;
                });
                //set spatial method
                this.control.spatialMethod = this.method;
                this.control.toggle(true, { parent: CONTROLS['queryby'].id });
                // show highlight class only if 'querybbox' or 'querybydrawpolygon' type control
                this.control.layers.forEach(l => l.setTocHighlightable(['querybbox', 'querybydrawpolygon'].includes(this.type)));
                await this.$nextTick();
                // set queryable layers (select2)
                this.layers.push(...this.queryable);

                if ('querybypolygon' === this.type) {
                  this.control.setEnable(false);
                }
                // re-run query when changing spatial method
                if (this.control.autorun) {
                  CONTROLS['queryby'].runSpatialQuery(this.type);  
                }
              },
              templateType(state) {
                if (!state.id) { return state.text }
                return $(/*html*/`<span><i class="${ GUI.getFontClass(({
                  'querybbox':          'square',
                  'querybycircle':      'empty-circle',
                  'querybydrawpolygon': 'draw',
                  'querybypolygon':     'pointer',
                })[state.id]) }"></i>&nbsp;&nbsp;${state.text}</span>`);
              },
              templateLayer(state) {
                if (!state.id || '__NEW__' === state.id) { return state.text }
                const externalLayers = GUI.getService('map').getLegacyExternalLayers();
                const layer = getCatalogLayerById(state.id) || externalLayers.find(l => l.get('id') === state.id);
                /** @FIXME layer is undefined when removing an external layer */
                const icon = ('__ALL__' === state.id || !layer ? '' : /*html */ `<i class="${ GUI.getFontClass( layer.isVisible() ? 'eye' : 'eye-close') }"></i>&nbsp;&nbsp;`)
                return $(/*html*/`<span>${ icon }${ state.text }</span>`);  
              } 
            },
            mounted() {
              CONTROLS['queryby'].usermessage = this;
              GUI.toggleUserMessage(false);
              this.reset();
            },
            beforeDestroy: () => {
              GUI.toggleUserMessage(true);
              this.types.forEach(t => {
                CONTROLS[t].toggle(false);
                CONTROLS[t].autorun = false;
                CONTROLS['queryby'].element.classList.toggle('ol-' + t, t === this.types[0]);
                CONTROLS[t].layers.forEach(l => l.setTocHighlightable(false));
              });
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
      cursorClass:      'querybypolygon' !== type ? 'ol-crosshair': 'ol-pointer',
      interactionClass: ({
        'querybbox':          ol.interaction.DragBox,
        'querybycircle':      ol.interaction.Draw,
        'querybydrawpolygon': ol.interaction.Draw,
        'querybypolygon':     PickCoordinatesInteraction,
      })[type],
      interactionClassOptions: ['querybydrawpolygon', 'querybycircle'].includes(type)
        ? { type: 'querybydrawpolygon' === type ? 'Polygon' : 'Circle' }
        :  {},
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
            eventKey:  this.on('bboxend', () => CONTROLS['queryby'].runSpatialQuery('querybbox'))
          });
        }

        if ('querybycircle' === type) {
          this._interaction.on('drawstart', e => {
            const geometry = e.feature.getGeometry();
            geometry.setRadius(QUERY.radius);
            geometry.on('change', () => QUERY.radius = geometry.getRadius())
            if (QUERY.radius > 0) {
              this._interaction.finishDrawing();
            }
          })
        }

        if (['querybydrawpolygon', 'querybycircle'].includes(type)) {
          this._interaction.on('drawend', throttle(e => {
            //convert circle geometry to polygon
            if ('querybycircle' === type) {
              const radius = e.feature.getGeometry().getRadius();
              //in the case of map unit degrees, convert it to meter
              QUERY.radius = radius * ('m' === GUI.getService('map').getMapUnits() ? 1 : ol.proj.Units.METERS_PER_UNIT.degrees);
            }
            QUERY.dfeature = e.feature;
            this.dispatchEvent({ type: 'drawend', feature: QUERY.dfeature });
            if (this._autountoggle) {
              this.toggle();
            }
          }));

          this.setEventKey({
            eventType: 'drawend',
            eventKey:   this.on('drawend', () => CONTROLS['queryby'].runSpatialQuery(type))
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
            eventKey:  this.on('picked', async () => {

              GUI.closeSideBar();
          
              // ask for coordinates
              try {
                const { data = [] } = await DataRouterService.getData('query:coordinates', {
                  inputs: {
                    feature_count: ApplicationState.project.state.feature_count || 5,
                    coordinates:   QUERY.coordinates
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
      clickmap: true,
    });

    GUI.getService('map').addControl(type, type, control, false, false);

    control._interaction.on('change:active', e => {
      //set current cursor class on map
      this.setMouseCursor(e.target.get(e.key), control.cursorClass);              // set mouse cursor
      //set same cursor class to parent queryby control
      this.cursorClass = control.cursorClass;

      if (['querybbox', 'querybydrawpolygon'].includes(type)) {
        ApplicationState.highlightlayers = e.target.get(e.key); // highlight layers in legend
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
            if (this.usermessage) {
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

    const btn = document.querySelector('.usermessage-content .clear-selected-layer');
    if (btn) {
      btn.classList.toggle('hidden', !layer);
    }

    if (this.usermessage) {
      this.usermessage.selectedLayer = layer ? layer.getId() : '__ALL__';
    }

    this.types.forEach(t => {
      const control = CONTROLS[t];

      const selected  = layer && control.layers.find(l => l === layer);
      const queryable = layer && layer.isQueryable() && (control.getGeometryTypes() || []).includes(layer.getGeometryType());

      if (['querybbox', 'querybydrawpolygon', 'querybycircle'].includes(t)) {
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

      GUI.closeSideBar();

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
      const project        = ApplicationState.project;

      if ('querybbox' === type) {
        await DataRouterService.getData('query:bbox', {
          inputs: {
            bbox:          QUERY.bbox,
            feature_count: project.state.feature_count || 5,
            addExternal:   (!selected || externalLayers.some(l => l === selected)),
            // Catalog layers (TOC) properties that need to be satisfied
            layersFilterObject: {
              SELECTED_OR_ALL: true, // selected or all
              FILTERABLE: true,      // see: src/app/core/layers/layer.js#L925
              VISIBLE: true          // need to be visible
            },
            condition:     { filtrable: { ows: 'WFS' } },
            multilayers:   [].concat(project.state.querymultilayers).includes(control.name),
            filterConfig:  { spatialMethod: control.getSpatialMethod() }, // added spatial method to polygon filter
          }
        });
      }

      if (['querybypolygon','querybydrawpolygon', 'querybycircle'].includes(type)) {
        await DataRouterService.getData('query:polygon', {
          inputs: {
            layerName:       'querybypolygon' === type ? (QUERY.layer.getName ? QUERY.layer.getName() : QUERY.layer.get('name')) : '',
            excludeSelected: 'querybypolygon' === type || !selected,
            feature:         (() => {
                              switch (type) {
                                case 'querybypolygon':     return QUERY.feature;
                                case 'querybydrawpolygon': return QUERY.dfeature;
                                case 'querybycircle':
                                  const feat = QUERY.dfeature.clone();
                                  feat.setGeometry(ol.geom.Polygon.fromCircle(QUERY.dfeature.getGeometry(), 64));
                                  return feat;
                              }
                             })(),
            external:        {
              add:           'querybypolygon' === type || (!selected || externalLayers.some(l => l === selected)),
              filter: {
                SELECTED:    ['querybydrawpolygon', 'querybycircle'].includes(type) && (!selected || externalLayers.some(l => l === selected))
              }
            },
            type:            (type || '').replace('queryby', '') || undefined,
            multilayers:     [].concat(project.state.querymultilayers).includes('querybypolygon'), //hardcoded using querymultilayers server config
            filterConfig:    { spatialMethod: control.getSpatialMethod() }, // added spatial method to polygon filter
          },
          outputs: {
            show: ({ error = false }) => !error,
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
      // check if the current selected layer is visible
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
  const { MapLayersStoresRegistry } = require('services/map').default;
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