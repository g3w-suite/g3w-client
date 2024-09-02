import localforage                          from 'localforage';
import G3WObject                            from 'core/g3w-object';
import PluginsRegistry                      from 'store/plugins';
import { createVectorLayerFromFile }        from 'utils/createVectorLayerFromFile';
import { createStyleFunctionToVectorLayer } from 'utils/createStyleFunctionToVectorLayer';
import { createSelectedStyle }              from 'utils/createSelectedStyle';
import { getMapLayersByFilter }             from 'utils/getMapLayersByFilter';
import { getScaleFromResolution }           from 'utils/getScaleFromResolution';
import { getResolutionFromScale }           from 'utils/getResolutionFromScale';
import { getUniqueDomId }                   from 'utils/getUniqueDomId';
import { throttle }                         from 'utils/throttle';
import { createFilterFromString }           from 'utils/createFilterFromString';
import { InteractionControl }               from 'g3w-ol/controls/interactioncontrol';
import { QueryBy }                          from 'g3w-ol/controls/queryby';
import { GeolocationControl }               from 'g3w-ol/controls/geolocationcontrol';
import { StreetViewControl }                from 'g3w-ol/controls/streetviewcontrol';
import { ScaleControl }                     from 'g3w-ol/controls/scalecontrol';
import { ScreenshotControl }                from 'g3w-ol/controls/screenshotcontrol';
import { MeasureControl }                   from 'g3w-ol/controls/measurecontrol';
import { MAP_SETTINGS }                     from 'app/constant';
import DataRouterService                    from 'services/data';
import ProjectsRegistry                     from 'store/projects';
import ApplicationService                   from 'services/application';
import GUI                                  from 'services/gui';
import MapControlZoomHistory                from 'components/MapControlZoomHistory.vue';
import MapControlGeocoding                  from 'components/MapControlGeocoding.vue';
import { groupBy }                          from 'utils/groupBy';

const { VectorLayer }            = require('core/layers/vectorlayer');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');

/**
 * Open Layers controls (zoom, streetrview, screnshoot, ruler, ...)
 */
const MAP = {
  controls:           {},
  offlineids:         [],
  selectedLayer:      null,
  stores:             {},
  externalLayers:     [],
  animatingHighlight: false,
  layers:             Object.assign(new G3WObject({ setters: {
    addLayersStore:          store  => { MAP.stores[store.getId()] = store; },
    removeLayersStore:       store  => { if (store) { delete MAP.layers.stores[store.getId()]; } },
    removeLayersStores:      ()     => { MAP.stores = {}; },
  }}), {
    getLayerById:            id     => Object.values(MAP.stores).map(s => s.getLayerById(id)).find(l => l),
    getLayers:               filter => Object.values(MAP.stores).flatMap(s => s.getLayers(filter)),
    getQuerableLayersStores: ()     => Object.values(MAP.stores).filter(s => s.isQueryable()),
    getLayersStore:          id     => MAP.stores[id],
    getLayersStores:         ()     => Object.values(MAP.stores),
  }),
};

/**
 * Controls factory
 */
const CONTROLS = {
  'zoomtoextent':       (opts = {}) => new InteractionControl({ ...opts, ol: new ol.control.ZoomToExtent(opts) }),
  'zoom':               (opts = {}) => new InteractionControl({ ...opts, ol: new ol.control.Zoom(opts) }),
  'scaleline':          (opts = {}) => new InteractionControl({ ...opts, ol: new ol.control.ScaleLine(opts) }),
  'overview':           (opts = {}) => new InteractionControl({ ...opts, ol: new ol.control.OverviewMap(opts) }),
  /** @since 3.8.0 */
  'zoomhistory':        (opts = {}) => new InteractionControl({ element: (new (Vue.extend(MapControlZoomHistory))()).$mount().$el, tipLabel: "sdk.mapcontrols.addlayer.tooltip" }),
  'geocoding':          (opts = {}) => new InteractionControl({ element: (new (Vue.extend(MapControlGeocoding))({
    propsData: {
      ...opts.config, // pass configuration from server
      placeholder:    opts.placeholder || 'mapcontrols.geocoding.placeholder',
      noresults:      opts.noresults   || 'mapcontrols.geocoding.noresults',
      limit:          opts.limit       || 5,
      viewbox:        opts.bbox        || (GUI.getService('map').getProject().state.initextent || GUI.getService('map').getProject().state.extent),
      mapCrs:         opts.mapCrs      || GUI.getService('map').getProject().state.crs.epsg,
    }
  })).$mount().$el, offline: false}),
  'zoombox':            (opts = {}) => new InteractionControl({
    ...opts,
    name:             'zoombox',
    tipLabel:         'Zoom to box',
    label:            '\ue901',
    interactionClass: ol.interaction.DragBox,
    cursorClass:      'ol-crosshair',
    onSetMap({ setter, map }) {
      if ('after' === setter) {
        // zoom box
        this._startCoordinate = null;
        this._interaction.on('boxstart', e => this._startCoordinate = e.coordinate);
        this._interaction.on('boxend',   e => {
          this.dispatchEvent({ type: 'zoomend', extent: ol.extent.boundingExtent([this._startCoordinate, e.coordinate]) });
          this._startCoordinate = null;
          if (this._autountoggle) { this.toggle(); }
        });
      }
    }
  }),
  'query':              (opts = {}) => new InteractionControl({
    ...opts,
    offline:          false,
    name:             "querylayer",
    tipLabel:         "sdk.mapcontrols.query.tooltip",
    label:            opts.label || "\uea0f",
    clickmap:         true,
    interactionClass: PickCoordinatesInteraction,
    cursorClass:      'ol-help',
    onSetMap({ map, setter }) {
      this.runQuery = this.runQuery || (async ({ coordinates }) => {
        GUI.closeSideBar();
        try {
          const project = ProjectsRegistry.getCurrentProject();
          await DataRouterService.getData('query:coordinates', {
            inputs: {
              coordinates,
              feature_count:         project.getQueryFeatureCount(),
              query_point_tolerance: project.getQueryPointTolerance(),
              multilayers:           project.isQueryMultiLayers(this.name),
            }
          });
        } catch(e) {
          console.warn('Error running spatial query: ', e)
        }
      });
      if ('before' === setter) {
        let key = null;
        this.on('toggled', ({ toggled }) => {
          if (true !== toggled) {
            ol.Observable.unByKey(key);
            key = null;
          } else if (null === key && map) {
            key = this.getInteraction().on('picked', throttle(e => this.runQuery({coordinates: e.coordinate })));
          }
        });
        this.setEventKey({ eventType: 'picked', eventKey: this.on('picked', this.runQuery) });
      }
    }
  }),
  'queryby':            QueryBy,
  'geolocation':        GeolocationControl,
  'streetview':         StreetViewControl,
  'addlayers':          (opts = {}) => new InteractionControl({ ...opts, tipLabel: "sdk.mapcontrols.addlayer.tooltip",        label: "\ue907", name: 'addlayer', onSetMap(e) { if ('after' === e.setter) $(this.element).on('click', () => this.dispatchEvent('addlayer')); } }),
  'measure':            MeasureControl,
  'mouseposition':      (opts = {}) => Object.assign((new ol.control.MousePosition({ ...opts, target: opts.target || 'mouse-position-control' })), { offline: true }),
  'scale':              ScaleControl,
  'onclick':            InteractionControl,
  'screenshot':         ScreenshotControl,
};

/**
 * BACKCOMP v3.x
 */
CONTROLS['nominatim']          = CONTROLS['geocoding'];
CONTROLS['ontoggle']           = CONTROLS['onclick'];
CONTROLS['area']               = CONTROLS['measure'];
CONTROLS['length']             = CONTROLS['measure'];
CONTROLS['geoscreenshot']      = CONTROLS['screenshot'];
CONTROLS['querybbox']          = CONTROLS['queryby'];
CONTROLS['querybycircle']      = CONTROLS['queryby'];
CONTROLS['querybydrawpolygon'] = CONTROLS['queryby'];
CONTROLS['querybypolygon']     = CONTROLS['queryby'];

class MapService extends G3WObject {

  constructor(options = {}) {

    super();

    this.state = {
      mapUnits:              'm',
      bbox:                  [],
      hidemaps:              [],
      resolution:            null,
      center:                null,
      loading:               false,
      hidden:                true,
      scale:                  0,
      mapcontrolsalignement: 'rv',
      mapcontrolDOM:         null,
      mapcontrolready:       false,
      mapControl:            { disabled: false },
      map_info:              { info: null, style: null },
      mapunits:              ['metric']
    };

    this.id = 'MapService';

    /**
     * internal promise. Resolved when view is set
     *
     * @since 3.8.3
     */
    this._ready = new Promise(res => this.once('viewerset', res));

    this.viewer = null;

    this.target = options.target || 'map';

    this.layersCount = 0; // useful to set Zindex to layer order on map

    this.maps_container = options.maps_container || 'g3w-maps';

    this.project = options.project || ProjectsRegistry.getCurrentProject();

    this._controls = [];

    this._layers = {
      base:            {},
      g3w:             [],
      external_wms:    [],
      external_vector: [],
      external:        [],
    };

    /**
     * Store interactions added by plugin or external application
     */
    this._externalInteractions = [];

    /**
     * Default layers are OL layers that are add to map by default.
     * Are used to show selection Features and/or highlight Layer feature
     */
    this.defaultsLayers = {

      mapcenter: new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: new ol.style.Style({
          image: new ol.style.Icon({
            opacity: 1,
            src: '/static/client/images/mapcentermarker.svg',
            scale: 0.8
          }),
        })
      }),

      _style: {
        highlightLayer: { color: undefined },
        selectionLayer: { color: 'red' }
      },

      highlightLayer: new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: feat => [createSelectedStyle({
          geometryType: feat.getGeometry().getType(),
          color:        this.defaultsLayers._style.highlightLayer.color,
          fill:         true
        })]
      }),

      selectionLayer: new ol.layer.Vector({
        source: new ol.source.Vector(),
        style: feat => [createSelectedStyle({
          geometryType: feat.getGeometry().getType(),
          color:        this.defaultsLayers._style.selectionLayer.color,
          fill:         true
        })]
      }),

    };

    this.layersExtraParams = {};

    this._drawShadow = {
      type:     'coordinate',
      outer:    [],
      inner:    [],
      scale:    null,
      rotation: null,
      listener: null,
    };

    this.config = options.config || ApplicationService.getConfig();

    this._howManyAreLoading = 0;

    this._marker = null;

    this.onLayerLoadStart    = this.onLayerLoadStart.bind(this);
    this.onLayerLoadEnd      = this.onLayerLoadEnd.bind(this);
    this.onLayerLoadError    = this.onLayerLoadError.bind(this);
    this.onExtraParamsSet    = this.onExtraParamsSet.bind(this);
    this.onSetCurrentProject = this.onSetCurrentProject.bind(this);
    this.updateMapLayers     = this.updateMapLayers.bind(this);

    this._keyEvents = {
      ol:           [],
      g3wobject:    [],
      stores:       [], // layers stores
      base:         this.project.onafter('setBaseLayer', this.updateMapLayers), // base layer
      unwatches:    [],
    };

    // on after setting a current project
    if (!options.project) {
      this._keyEvents.g3wobject.push({
        who:     ProjectsRegistry,
        setter: 'setCurrentProject',
        key:     ProjectsRegistry.onafter('setCurrentProject', this.onSetCurrentProject)
      });
    }

    this.debounces =  {
      setupCustomMapParamsToLegendUrl: {
        fnc: (...args) => { this._setupCustomMapParamsToLegendUrl(...args) },
        delay: 1000
      }
    };

    this.setters = {

      setupControls() {

        const { header_terms_of_use_text, header_terms_of_use_link } = this.config.group;

        // set layers attribution
        const attribution = header_terms_of_use_text
          ? header_terms_of_use_link
            ? `<a href="${header_terms_of_use_link}">${header_terms_of_use_text}</a>`
            : `<span class="skin-color" style="font-weight: bold">${header_terms_of_use_text}</span>`
          : false;

        this.getMapLayers().forEach(l => l.getSource().setAttributions(attribution));

        // check if a base layer is set. If true, add attribution control
        if (attribution || getMapLayersByFilter({ BASELAYER: true }).length) {
          this.getMap().addControl(new ol.control.Attribution({ collapsible: false, target: 'map_footer_left' }));
        }

        // skip when no controls
        if (!this.config || !this.config.mapcontrols) {
          return;
        }

        // BACKCOMP (g3w-admin < v3.7.0)
        const mapcontrols = Array.isArray(this.config.mapcontrols)
          ? this.config.mapcontrols.reduce((a, v) => { a[v] = {}; return a; }, {}) // convert `initConfig.group.mapcontrols` from an array of strings to a key-value config Object (eg. ["geocoding"] --> "geocoding" = {})
          : this.config.mapcontrols;

        Object
          .entries(mapcontrols)
          .forEach(([type, config = {}]) => {
            switch (type) {
              case 'zoom':
                this.createMapControl(type);
                break;

              case 'zoombox':
                if (!isMobile.any) {
                  this.createMapControl(type, {}).on('zoomend', (e) => this.viewer.fit(e.extent) );
                }
                break;

              case 'zoomtoextent':
                this.createMapControl(type, {
                  options: {
                    label: "\ue98c",
                    extent: this.project.state.initextent
                  }
                });
                break;

              case 'mouseposition':
                if (!isMobile.any) {
                  // @since 3.8.
                  const degrees = 'degrees' === this.getProjection().getUnits();
                  const mapEpsg = this.getEpsg();
                  const coordinateFormat = (epsg, coords) => {
                    if ('EPSG:4326' === epsg) {
                      return ol.coordinate.format(ol.proj.transform(coords, mapEpsg, 'EPSG:4326'), `\u00A0Lng: {x}, Lat: {y}\u00A0\u00A0 [EPSG:4326]\u00A0`, 4);
                    }
                    return ol.coordinate.format(coords, `\u00A0${degrees ? 'Lng' : 'X'}: {x}, ${degrees ? 'Lat' : 'Y'}: {y}\u00A0\u00A0 [${epsg}]\u00A0`, degrees ? 4 : 2);
                  };
                  const control = this.createMapControl(type, {
                    add: false,
                    options: {
                      coordinateFormat: coordinateFormat.bind(null, mapEpsg),
                      undefinedHTML:    false,
                      projection:       this.getCrs()
                    }
                  });
                  if ('EPSG:4326' !== mapEpsg) {
                    control.on('change:epsg', e => control.setCoordinateFormat(coordinateFormat.bind(null, e.epsg)));
                  }
                }
                break;

              case 'screenshot':
              case 'geoscreenshot':
                if (!isMobile.any ) {
                  if (this.getMapControlByType('screenshot')) {
                    this.getMapControlByType('screenshot').addType(type)
                  } else {
                    this.createMapControl('screenshot', {
                      options: {
                        types:   [type],
                        layers:  [...MAP.layers.getLayers(), ...this._layers.external],
                      }
                    });
                  }
                }
                break;

              case 'scale':
                this.createMapControl(type, {
                  add: false,
                  options: {
                    coordinateFormat: ol.coordinate.createStringXY(4),
                    projection:       this.getCrs(),
                    isMobile:         isMobile.any
                  }
                });
                break;

              case 'query':
                this.createMapControl(type, {
                  add: true,
                  toggled: true
                });
                break;

              case 'querybypolygon':
              case 'querybbox':
              case 'querybycircle':
              case 'querybydrawpolygon':
                if (!isMobile.any) {
                  if (this.getMapControlByType('queryby')) {
                    this.getMapControlByType('queryby').addType(type)
                  } else {
                    this.createMapControl('queryby', {
                      options: {
                        types:   [type],
                      }
                    });
                  }
                }
                break;

              case 'streetview':
                this.createMapControl(type, {});
                break;

              case 'scaleline':
                this.createMapControl(type, {
                  add: false,
                  options: {
                    position: 'br'
                  }
                });
                break;

              case 'overview':
                if (!isMobile.any && this.config.overviewproject && this.config.overviewproject.gid) {
                  ProjectsRegistry
                    .getProject(this.config.overviewproject.gid)
                    .then(project => {
                      //create a view for overview map
                      const map = this.getMap();
                      const view = new ol.View(this._calculateViewOptions({ project, width: 200, height: 150 })); // at moment hardcoded
                      view.on('change:center', function() {
                        const current = view.getCenter();
                        const center  = map.getView().constrainCenter(current);
                        if (center[0] !== current[0] || center[1] !== current[1]) {
                          view.setCenter(center);
                        }
                      });
                      this.createMapControl(type, {
                        add: false,
                          options: {
                            view,
                            position:      'bl',
                            collapsed:     false,
                            className:     'ol-overviewmap ol-custom-overviewmap',
                            collapseLabel: $(`<span class="${GUI.getFontClass('arrow-left')}"></span>`)[0],
                            label:         $(`<span class="${GUI.getFontClass('arrow-right')}"></span>`)[0],
                            layers:        Object
                              .entries(
                                //group layer by multilayerId
                                project.getLayersStore().getLayers({ GEOLAYER: true, BASELAYER: false })
                                  .reduce((group, l) => {
                                    const id = l.getMultiLayerId();
                                    //initialize group[id] layer
                                    if (undefined === group[id]) {
                                      group[id] = [];
                                    }
                                    group[id].push(l);
                                    return group;
                                  }, {}) || []
                              ).map(([id, layers]) => {
                                const { WMSLayer } = require('core/layers/imagelayer');
                                const mapLayer = new WMSLayer({
                                  url:   project.getWmsUrl(),
                                  id:    `overview_layer_${id}`,
                                  tiled: layers[0].state.tiled,
                                });
                                layers.reverse().forEach(l => mapLayer.addLayer(l));
                                return mapLayer.getOLLayer(true);
                              }).reverse()
                          }
                      })
                      /** @since 3.10.0 Move another bottom left map controls bottom to a left of overview control**/
                      document.querySelector('.g3w-map-controls-left-bottom').style.left = '230px';
                      const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                          if ("class" === mutation.attributeName) {
                            document.querySelector('.g3w-map-controls-left-bottom').style.left = mutation.target.classList.contains('ol-collapsed') ? '50px' : '230px';
                          }
                        });
                      });
                      observer.observe(document.querySelector('.ol-custom-overviewmap'), {attributes: true});
                    })
                    .catch(e => console.warn(e))
                }
                break;

              case 'geocoding':
              case 'nominatim':
                this.createMapControl(type, {
                  add: false,
                  options: { config }
                });
                break;

              case 'geolocation':
                this.createMapControl(type).on('click', throttle(e => this.showMarker(e.coordinates)));
                break;

              case 'addlayers':
                if (!isMobile.any) {
                  this.createMapControl(type, {}).on('addlayer', () => this.showAddLayerModal());
                }
                break;

              case 'length':
              case 'area':
                if (!isMobile.any) {
                  if (this.getMapControlByType('measure')) {
                    this.getMapControlByType('measure').addType(type)
                  } else {
                    this.createMapControl('measure', {
                      options: {
                        name: "measure",
                        tipLabel: 'sdk.mapcontrols.measures.title',
                        types: [type],
                        interactionClassOptions: {
                          projection: this.getProjection(),
                          help:       `sdk.mapcontrols.measures.${type}.help`
                        }
                      }
                    });
                  }
                }
                break;

              /**
               * @since 3.8.0
               */
              case 'zoomhistory':
                $('.g3w-map-controls-left-bottom').append(this.createMapControl(type, { add: false }).element);
                break;

            }
        });
        return this.getMapControls()
      },

      addHideMap({ switchable=false } = {}) {
        const idMap = {
          id: `hidemap_${Date.now()}`,
          map: null,
          switchable
        };
        this.state.hidemaps.push(idMap);
        return idMap;
      },

      setHidden(bool) {
        this.state.hidden = bool;
      },

      /** Set view based on project config */
      async setupViewer(width, height) {
        if (0 === width || 0 === height) {
          console.warn('[G3W-CLIENT] map was hidden during bootstrap');
          return;
        }

        const search = new URLSearchParams(location.search); // search params

        const showmarker       = 1 * (search.get('showmarker') || 0);  /** @since 3.10.0 0 or 1. Show marker on map center*/
        const iframetype       = search.get('iframetype');             /** @since 3.10.0 type of iframe: map (only map, no control)*/
        const zoom_to_fid      = search.get('zoom_to_fid');
        const zoom_to_features = search.get('ztf');                    // zoom to features
        const coords           = {
          lat: parseFloat(search.get('lat')),
          lon: parseFloat(search.get('lon')),
          x:   parseFloat(search.get('x')),
          y:   parseFloat(search.get('y')),
        };

        if (this.viewer) {
          this.viewer.destroy();
        }

        const olView = this._calculateViewOptions({
          width,
          height,
          project: this.project,
          map_extent: search.get('map_extent'), /** @since 3.10.0 */
        });

        const olMap = new ol.Map({
          controls:            ol.control.defaults({ attribution: false, zoom: false, rotateOptions: { autoHide: true, tipLabel: "Reset rotation (CTRL+DRAG to rotate)" } }),
          interactions:        ol.interaction.defaults().extend([ new ol.interaction.DragRotate({ condition: ol.events.condition.platformModifierKeyOnly, }) ]),
          ol3Logo:             false,
          view:                new ol.View(olView),
          keyboardEventTarget: document,
          target:              this.target,
        });

        this.viewer = {
          map: olMap,
          getMap:        () => this.viewer.map,
          getView:       () => this.viewer.map.getView(),
          getZoom:       () => this.viewer.map.getView().getZoom(),
          getResolution: () => this.viewer.map.getView().getResolution(),
          getCenter:     () => this.viewer.map.getView().getCenter(),
          destroy:       () => { if (this.viewer.map) { this.viewer.map.dispose(); this.viewer.map = null } },
          zoomTo:        this.zoomTo.bind(this),
          goTo:          this.goTo.bind(this),
          fit:           this._fit.bind(this),
          /** @TODO check if deprecated */
          changeBaseLayer: name => this.map.getLayers().insertAt(0, this.map.getLayers().find(l => name === l.get('name'))),
        };

        const map = this.viewer.getMap();

        // disable douclickzoom
        map.getInteractions().getArray().find(i => i instanceof ol.interaction.DoubleClickZoom).setActive(false);

        // visual click (sonar effect)
        map.on('click', ({ coordinate }) => {
          const circle = new ol.layer.Vector({
            source: new ol.source.Vector({ features: [ new ol.Feature({ geometry: new ol.geom.Point(coordinate) }) ] }),
            style: new ol.style.Style()
          });
          const start    = +new Date();
          const duration = 1700;
          const interval = circle.on('postcompose', ({ frameState }) => {
            const elapsed  = frameState.time - start;
            const ratio   = ol.easing.easeOut(elapsed / duration);
            circle.setStyle(
              new ol.style.Style({
                image: new ol.style.Circle({
                  radius: 40 * ratio, // start = 0, end = 40
                  fill:   new ol.style.Fill({ color: [225, 227, 228, .1] }),
                  stroke: new ol.style.Stroke({ color: [225, 227, 228, 1], width: 1.85 * (1 - ratio) }), // start = 1.85, end = 0
                })
              })
            );
            if (elapsed > duration) {
              map.removeLayer(circle);
              ol.Observable.unByKey(interval); // stop the effect
            }
          });
          map.addLayer(circle);
        });

        let currentControl;
        let can_drag = false;

        // set mouse cursor (dragging)
        (new Vue()).$watch(
          () => [this.getCurrentToggledMapControl(), (PluginsRegistry.getPlugin('editing') && PluginsRegistry.getPlugin('editing').getActiveTool())],
          ([control, activeTool]) => {
            currentControl = control
            can_drag = !control && !activeTool;
            map.getViewport().classList.toggle('ol-grab', can_drag);
            map.getInteractions().getArray().find(i => i instanceof ol.interaction.DoubleClickZoom).setActive(can_drag);
          }
        );
        map.on(['pointerdrag', 'pointerup'], (e) => {
          /** @TODO disable default interaction "shift+zoom" ? */
          map.getViewport().classList.toggle('ol-grabbing', e.type == 'pointerdrag' && (!currentControl || !(currentControl.getInteraction() instanceof ol.interaction.DragBox)));
          map.getViewport().classList.toggle('ol-grab',     e.type == 'pointerup' && can_drag);
        });

        let geom;
        if (zoom_to_fid) {
          await this.zoomToFid(zoom_to_fid);
        } else if (zoom_to_features) {
          await this.zoomToFeaturesUrl(zoom_to_features);
        } else if (!isNaN(coords.lat) && !isNaN(coords.lon)) {
          geom = new ol.geom.Point(ol.proj.transform([coords.lon, coords.lat], 'EPSG:4326', this.getEpsg()));
        } else if (!isNaN(coords.x) && !isNaN(coords.y)) {
          geom = new ol.geom.Point([coords.x, coords.y]);
        }

        if (geom && geom.getExtent()) {
          await this.zoomToGeometry(geom);
        }

        // show marker on map center
        if (1 === showmarker) {
          this.defaultsLayers.mapcenter.getSource().addFeature(new ol.Feature({ geometry: new ol.geom.Point(this.getCenter()) }))
        }

        // iframe → hide map controls (empty object)
        if ('map' === iframetype) {
          this.config.mapcontrols = {};
        }

        // update max scale
        MAP_SETTINGS.ZOOM.maxScale = Math.min(
          getScaleFromResolution(this.getMap().getView().getResolutionForExtent(this.project.state.initextent, this.getMap().getSize()), this.getMapUnits()),
          MAP_SETTINGS.ZOOM.maxScale
        );

        this.state.size     = this.viewer.map.getSize();
        this.state.mapUnits = this.viewer.map.getView().getProjection().getUnits();

        if (this.config.background_color) {
          $('#' + this.target).css('background-color', this.config.background_color);
        }

        $(this.viewer.map.getViewport()).prepend('<div id="map-spinner" style="position:absolute; top: 50%; right: 50%"></div>');

        this.viewer.map.getInteractions().forEach(     int => this._watchInteraction(int));
        this.viewer.map.getInteractions().on('add',    int => this._watchInteraction(int.element));
        this.viewer.map.getInteractions().on('remove', int => { /* this._onRemoveInteraction(int);); */ });

        this._marker = new ol.Overlay({
          position:    null,
          positioning: 'center-center',
          element:     document.getElementById('marker'),
          stopEvent:   false,
        });

        this.viewer.map.addOverlay(this._marker);

        // keep default layers above others
        this.viewer.map.getLayers().on('add', e => {
          const zindex = this.setLayerZIndex({
            layer:  e.element,
            zindex: e.element.get('basemap') || 'bottom' === e.element.get('position') ? 0 : undefined,
          });
          if (this.defaultsLayers.mapcenter)      { this.defaultsLayers.mapcenter.setZIndex(zindex + 1); }
          if (this.defaultsLayers.highlightLayer) { this.defaultsLayers.highlightLayer.setZIndex(zindex + 1); }
          if (this.defaultsLayers.selectionLayer) { this.defaultsLayers.selectionLayer.setZIndex(zindex + 2); }
        });

        this.viewer.map.getLayers().on('remove', e => {
          if (e.element.getZIndex() === this.layersCount) {
            this.layersCount--;
          }
        })

        this.state.bbox       = this.getMapBBOX();
        this.state.resolution = this.viewer.getResolution();
        this.state.center     = this.viewer.getCenter();
        this._setupAllLayers();
        this.setUpMapOlEvents();

        // CHECK IF MAPLAYESRSTOREREGISTRY HAS LAYERSTORE
        MAP.layers.getLayersStores().forEach(this._setUpEventsKeysToLayersStore.bind(this));
        MAP.layers.onafter('addLayersStore',    this._setUpEventsKeysToLayersStore.bind(this));
        MAP.layers.onafter('removeLayersStore', this._removeEventsKeysToLayersStore.bind(this));

        this.emit('viewerset');
        this.setupControls();
        this.emit('ready');
      },

      controlClick(mapcontrol, info={}) {},
      loadExternalLayer(layer) {}, // used in general to alert external layer is  loaded
      unloadExternalLayer(layer) {},

    };

    this.on('extraParamsSet', this.onExtraParamsSet);

  }

  /**
   * @since 3.11.0
   */
  onExtraParamsSet(extraParams, update) {
    if (update) {
      this.getMapLayers().forEach(l => l.update(this.state, extraParams));
    }
  }

  /**
   * @since 3.11.0
   */
  onSetCurrentProject(project) {
    this.removeLayers();
    // remove listeners
    if (this._keyEvents.base) {
      this.project.un('setBaseLayer', this._keyEvents.base);
    }
    // check if reload a same project
    const reload = this.project.getId() === project.getId();
    this.project = project;
    const changeProjectCallBack = () => {

      // reset view
      const [width, height] = this.viewer.map.getSize();
      const extent = this.project.state.extent;
      const maxxRes = ol.extent.getWidth(extent) / width;
      const minyRes = ol.extent.getHeight(extent) / height;
      const maxResolution = Math.max(maxxRes,minyRes) > this.viewer.map.getView().getMaxResolution() ? Math.max(maxxRes,minyRes): this.viewer.map.getView().getMaxResolution();
      const view = new ol.View({
        extent,
        projection: this.viewer.map.getView().getProjection(),
        center:     this.viewer.map.getView().getCenter(),
        resolution: this.viewer.map.getView().getResolution(),
        maxResolution
      });
      // update max scale
      MAP_SETTINGS.ZOOM.maxScale = Math.min(
        getScaleFromResolution(this.getMap().getView().getResolutionForExtent(this.project.state.initextent, this.getMap().getSize()), this.getMapUnits()),
        MAP_SETTINGS.ZOOM.maxScale
      );
      this.viewer.map.setView(view);

      this._setupAllLayers();
      this.setUpMapOlEvents();
      this.setupCustomMapParamsToLegendUrl();
    };
    if (reload || ApplicationService.isIframe()) {
      changeProjectCallBack();
    }
    if (!reload) {
      this.getMap().once('change:size', changeProjectCallBack);
    }
  }

  /**
   * show spinner layers
   *
   * @since 3.11.0
   */
  onLayerLoadStart() {
    if (0 === this._howManyAreLoading) {
      this.emit('loadstart');
      GUI.showSpinner({ container: $('#map-spinner'), id: 'maploadspinner', style: 'transparent' });
    }
    this._howManyAreLoading += 1;
  }

  /**
   * @since 3.11.0
   */
  onLayerLoadEnd() {
    this._howManyAreLoading -= 1;
    if (0 === this._howManyAreLoading) {
      this.emit('loadend');
      GUI.hideSpinner('maploadspinner');
    }
  }

  /**
   * @since 3.11.0
   */
  onLayerLoadError() {
    /** @since 3.10.0 - fails silently */
    if (!this.project.state.show_load_layer_error) {
      return;
    }
    if (!this.onLayerLoadError.shown) {
      GUI.notify.warning('sdk.errors.layers.load');
      this.onLayerLoadError.shown = true;
    }
    this.onLayerLoadEnd();
  }

  /**
   * @returns promise ready
   *
   * @since 3.8.3
   */
  isReady() {
    return this._ready;
  }

  setUpMapOlEvents() {
    const dynamicLegend = this.project.getContextBaseLegend();
    // set change resolution
    this._keyEvents.ol.forEach(k => ol.Observable.unByKey(k));
    this._keyEvents.ol.push(
      this.viewer.map.getView().on('change:resolution', () => {
        this.state.bbox       = this.getMapBBOX();
        this.state.resolution = this.viewer.getResolution();
        this.state.center     = this.viewer.getCenter();
        this.updateMapLayers();
        if (dynamicLegend) {
          this.setupCustomMapParamsToLegendUrl();
        }
      })
    );
    if (dynamicLegend) {
      this._keyEvents.ol.push(
        this.viewer.map.on('moveend', () => this.setupCustomMapParamsToLegendUrl())
      );
    } else {
      //set always to show legend at the start
      this.setupCustomMapParamsToLegendUrl();
    }
  }

  /**
   * Clear methods to remove all listeners events
   */
  clear() {
    this.removeListener('extraParamsSet', this.onExtraParamsSet);
    ['ol', 'g3wobject'].forEach(type => {
      switch(type) {
        case 'ol':           this._keyEvents[type].forEach(key => ol.Observable.unByKey(key)); break;
        case 'g3wobject':    this._keyEvents[type].forEach(({ who, setter, key }) => who.un(setter, key)); break;
        case 'eventemitter': this._keyEvents[type].forEach(({ event, listener }) => this.removeListener(event, listener)); break;
      }
      this._keyEvents[type].splice(0);
    });
    MAP.layers.getLayersStores().forEach(this._removeEventsKeysToLayersStore.bind(this))
  }

  /**
   * @TODO refactor CDU plugin in order to remove `OlMapViewer` class
   */
  _addHideMap({ratio, layers=[], mainview=false} = {}) {
    const idMap  = this.state.hidemaps.at(-1);
    const view   = this.getMap().getView();

    const olView = mainview ? view : {
      projection: view.getProjection(),
      center:     view.getCenter(),
      resolution: this.getResolution()
    };

    // set Map
    idMap.map = new ol.Map({
      controls:            ol.control.defaults({ attribution: false, zoom: false }),
      interactions:        ol.interaction.defaults(),
      ol3Logo:             false,
      view:                olView instanceof ol.View ? olView : new ol.View(olView),
      keyboardEventTarget: document,
      target:              idMap.id,
    });

    // in case of rate
    if (ratio) {
      const [w, h] = idMap.map.getSize();
      idMap.map.setSize([w, w * ratio]);
    }

    (layers || []).forEach(l => idMap.map.addLayer(l));

    return idMap.map;
  }

  /**
   * Used by the following plugins: "cdu"
   */
  removeHideMap(id) {
    const i = (this.state.hidemaps || []).findIndex(m => id === m.id);
    if (-1 !== i) {
      this.state.hidemaps.splice(i, 1);
    }
  }

  /**
   * Used by the following plugins: "cdu", "archiweb"
   */
  createMapImage({map, background} = {}) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = $(
          map
            ? map.getViewport()
            : $(`#${this.maps_container} .g3w-map`).last().children('.ol-viewport')[0]
        ).children('canvas')[0];
        if (navigator.msSaveBlob) resolve(canvas.msToBlob());
        else canvas.toBlob(blob => resolve(blob));
      } catch (e) {
        console.warn(e);
        reject(e);
      }
    })
  }

  getProject() {
    return this.project;
  }

  getMap() {
    try {
      return this.viewer.map;
    } catch(e) {
      console.warn(e);
    }
  }

  getProjection() {
    return this.project.getProjection();
  }

  isMapHidden() {
    return this.state.hidden;
  }

  getCrs() {
    return this.project.getProjection().getCode();
  }

  getViewport() {
    return this.viewer.map.getViewport();
  }

  getResolution() {
    return this.viewer.map.getView().getResolution();
  }

  getEpsg() {
    return this.viewer.map.getView().getProjection().getCode();
  }

  /**
   * Show Marker on map
   * @param coordinates
   * @param duration
   */
  showMarker(coordinates, duration=1000) {
    this._marker.setPosition(coordinates);
    setTimeout(() => this._marker.setPosition(), duration);
  }

  /**
   * @returns layer by name
   */
  getLayerByName(name) {
    return this.getMap().getLayers().getArray().find(l => l.get('name') === name);
  }

  /**
   * @returns layer by id
   */
  getLayerById(id) {
    return this.getMap().getLayers().getArray().find(l => id === l.get('id'));
  }

  /**
   * Used by the following plugins: "strees"
   *
   * get all features from vector layer based on coordinates
   */
  getVectorLayerFeaturesFromCoordinates(layerId, coordinates) {
    let intersectGeom;
    let features      = [];
    const map         = this.getMap();
    const vectorLayer = this.getLayerById(layerId);
    if (Array.isArray(coordinates)) {
      if (2 === coordinates.length) {
        const pixel = map.getPixelFromCoordinate(coordinates);
        map.forEachFeatureAtPixel(pixel,
          feature => features.push(feature),
          {layerFilter(layer) {return layer === vectorLayer;}
        });
      } else if (4 === coordinates.length) {
        intersectGeom = ol.geom.Polygon.fromExtent(coordinates);
        switch (vectorLayer.constructor) {
          case VectorLayer:
            features = vectorLayer.getIntersectedFeatures(intersectGeom);
            break;
          case ol.layer.Vector:
            vectorLayer.getSource().getFeatures().forEach(feature => {
              intersectGeom.intersectsExtent(feature.getGeometry().getExtent()) && features.push(feature);
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
          vectorLayer
            .getSource()
            .getFeatures()
            .forEach(feat => {
              intersectGeom.intersectsExtent(feature.getGeometry().getExtent()) && features.push(feat);
          });
          break;
      }
    }
    return features;
  }

  /**
   * Used by the following plugins: "cdu"
   */
  getQueryLayerByCoordinates({layer, coordinates} = {}) {
    return new Promise((resolve, reject) => {
      layer.query({
        coordinates,
        mapProjection: this.getProjection(),
        resolution:    this.getResolution(),
      })
      .then((response) => resolve(response))
      .fail(e => { console.warn(e); reject(e); })
    })
  }

  //setup controls
  /*
    layout : {
      lv: <options> h : horizontal (default), v vertical
      lh: <options> h: horizontal: v vertical (default)
    }
  */

  createMapControl(type, {
    id,
    visible,
    add     = true,
    toggled = false,
    options = {},
  } = {}) {
    const control = CONTROLS[type] ? new CONTROLS[type]({ type, toggled, ...options }) : undefined;
    if (undefined === visible) {
      visible = (control.isVisible ? control.isVisible() : true)
    }
    if (control) {
      this.addControl(id || type, type, control, add, visible);
    }
    return control;
  }

  showAddLayerModal() {
    this.emit('addexternallayer');
  }

  getCenter() {
    return this.getMap().getView().getCenter();
  }

  /**
   * Zoom to Feature ID
   */
  async zoomToFid(zoom_to_fid = '', separator = '|') {
    const [layerId, fid] = zoom_to_fid.split(separator);

    if (undefined === layerId && undefined === fid) {
      return;
    }

    const { data = [] } = await DataRouterService.getData('search:fids', {
      inputs: {
        layer: this.project.getLayerById(layerId),
        fids:  [fid]
      },
      outputs: {
        show: {
          loading: false,
          condition({ data = [] } = {}) {
            return data[0] && data[0].features.length > 0;
          }
        }
      }
    });

    const feature = data[0] && data[0].features[0];

    if (feature) {
      await this.zoomToFeatures([feature]);
    }
  }

  /**
   * Handle ztf url parameter
   *
   * @param zoom_to_feature
   */
  async zoomToFeaturesUrl(zoom_to_features = '') {
    try {
      const [id, filter] = zoom_to_features.split(':');

      if (!id || !filter) {
        return;
      }

      // find project layer
      const pLayer = this.project.getLayers().find(l =>
        id === l.id ||
        id === l.name ||
        id === l.origname
      );

      const layer = pLayer && this.project.getLayerById(pLayer.id);

      const r = pLayer && await DataRouterService.getData('search:features', {
        inputs: {
          layer,
          filter: createFilterFromString({ layer, filter }),
        },
        outputs: {
          show: {
            loading: false
          }
        }
      });

      const features = r && r.data && r.data[0] && r.data[0].features;

      if (features) {
        this.zoomToFeatures(features);
      }
    } catch(e) {
      console.warn(e);
    }
  }

  getMapExtent() {
    const map = this.getMap();
    return map.getView().calculateExtent(map.getSize());
  }

  /**
   * @param url
   * @param epsg cordinate referece system (since 3.8.0)
   *
   * @returns {string}
   */
  addMapExtentUrlParameterToUrl(url, epsg) {
    url = new URL(url);
    url.searchParams.set(
      'map_extent',
      (
        undefined !== epsg && epsg !== this.getEpsg()
          ? ol.proj.transformExtent(this.getMapExtent(), this.getEpsg(), epsg)
          : this.getMapExtent()
      ).toString()
    )
    return url.toString()
  }

  setMapControlsContainer(mapControlDom) {
    this.state.mapcontrolDOM = mapControlDom;
  }

  getMapControlByType(type) {
    // BACKOMP v3.x
    if ("string" !== typeof type) {
      type = type.type;
    }
    const mapControl = this._controls.find(control => type === control.type);
    return mapControl && mapControl.control;
  }

  /**
   * @param id
   * @param type
   * @param control
   * @param addToMapControls
   * @param visible
   */
  addControl(id, type, control, addToMapControls=true, visible=true) {
    this.state.mapcontrolready = false;
    this.viewer.map.addControl(control);

    control.on('toggled', evt => this.emit('mapcontrol:toggled', evt));

    this._controls.push({ id, type, control, visible, mapcontrol: addToMapControls && visible });

    control.on('controlclick', ({ target: mapcontrol }) => {
      const clickmap = !!(mapcontrol.isClickMap && mapcontrol.isClickMap());
      if (clickmap) {
        this._externalInteractions.forEach(int => int.setActive(false));
      }
      this.controlClick(mapcontrol, { clickmap })
    });

    const buttonControl = $(control.element).find('button');

    buttonControl.tooltip({
      placement: 'bottom',
      container: 'body',
      trigger:   GUI.isMobile() ? 'click': 'hover'
    });

    // in case of mobile hide tooltip after click
    if (GUI.isMobile()) {
      buttonControl.on('shown.bs.tooltip', function() { setTimeout(() => $(this).tooltip('hide'), 600); });
    }

    if (addToMapControls && !visible) {
      control.element.style.display = "none";
    }

    if (addToMapControls) {
      $('.g3w-map-controls').append(control.element);
    }

    MAP.controls[type] = control;

    if (false === control.offline) {
      MAP.offlineids.push({ id: type, enable: control.getEnable() });
    }

    if (false === control.offline && control.getEnable()) {
      control.setEnable(ApplicationService.isOnline());
    }

    this.state.mapcontrolready = true;
  }

  showControls(types) {
    this._controls.forEach(c => this.viewer.map.removeControl(c.control));
    this._controls.forEach(c => {
      c.visible = !types || types.indexOf(c.type) > -1 ? true : c.visible;
      if (c.visible) {
        this.viewer.map.addControl(c.control);
      }
    });
  }

  getMapControls() {
    return this._controls;
  }

  /**
   * Used by the following plugins: "archiweb"
   */
  removeControlById(id) {
    this._controls.find((c, i) => {
      if (id === c.id) {
        this._controls.splice(i, 1);
        this.viewer.map.removeControl(c.control);
        if (c.control.hideControl) {
          c.control.hideControl();
        }
        return true;
      }
    })
  }

  removeControl(type) {
    this._controls.find((c, i) => {
      if (type === c.type) {
        this._controls.splice(i, 1);
        this.viewer.map.removeControl(c.control);
        if (c.control.hideControl) {
          c.control.hideControl();
        }
        return true;
      }
    })
  }

  /**
   * untoggle mapcontrol
   * @param close GUI content
   * @private
   */
  _unToggleControls({close=true} = {}) {
    this._controls.forEach(c => {
      if (c.control.isToggled && c.control.isToggled()) {
        c.control.toggle(false);
        if (close) {
          GUI.closeContent();
        }
      }
    });
  }

  deactiveMapControls() {
    this._unToggleControls({ close: false });
  }

  /**
   *
   * Method to disable
   */
  disableClickMapControls(bool=true) {
    this._controls
      .filter(c => c.control.isClickMap && c.control.isClickMap())
      .forEach(c => {
        c.control.isToggled() && c.control.toggle();
        c.control[bool ? 'disable' : 'enable']();
    })
  }

  _setupCustomMapParamsToLegendUrl(bool=true) {
    if (bool) {
      const map  = this.getMap();
      const size = map && map.getSize().filter(value => value > 0) || null;
      const bbox = size && size.length === 2 ? map.getView().calculateExtent(size) : this.project.state.initextent;
      this.getMapLayers().forEach(l => l.setupCustomMapParamsToLegendUrl) && l.setupCustomMapParamsToLegendUrl({
        crs: this.getEpsg(),
        // in the case of axis orientation inverted if it needs to invert the axis
        bbox: map.getView().getProjection().getAxisOrientation() === "neu" ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox,
      });
      this.emit('change-map-legend-params')
    }
  }

  getMapLayerByLayerId(layerId) {
    return this.getMapLayers().find(l => l.getLayerConfigs().find(l => layerId === l.getId()))
  }

  getMapLayers() {
    return this._layers.g3w;
  }

  getBaseLayers() {
    return this._layers.base;
  }

  getMapLayerForLayer(layer) {
    return this.getMapLayers().find(mapLayer => `layer_${layer.getMultiLayerId()}` ===  mapLayer.getId());
  }

  getProjectLayer(layerId) {
    return MAP.layers.getLayerById(layerId);
  }

  /**
   * @param project
   * @param width
   * @param height
   * @param { Array } map_extent since 3.10.0: in case of true, use url parameter to set view options
   * @return {{extent: *, maxResolution: number, center: *, projection: *, resolution: number}}
   * @private
   */
  _calculateViewOptions({
    project,
    width,
    height,
    map_extent,
  } = {}) {
    const initextent = map_extent ? map_extent.split(',').map(coord => 1 * coord) : project.state.initextent;
    const extent     = project.state.extent;
    return {
      extent,
      projection:    this.getProjection(),
      center:        ol.extent.getCenter(initextent),
      maxResolution: Math.max(ol.extent.getWidth(extent) / width,     ol.extent.getHeight(extent) / height),     // max(xRes, yRes)
      resolution:    Math.max(ol.extent.getWidth(initextent) / width, ol.extent.getHeight(initextent) / height), // max(xInitRes, yInitRes)
    }
  }

  getMapUnits() {
    return this.state.mapUnits;
  }

  // remove all events of layersStore
  _removeEventsKeysToLayersStore(store) {
    const id = store.getId();
    if (this._keyEvents.stores[id]) {
      this._keyEvents.stores[id].forEach(evt => { Object.entries(evt).forEach(([event, key]) => store.un(event, key)); });
      delete this._keyEvents.stores[id];
    }
  }

  // register all events of layersStore and relative keys
  _setUpEventsKeysToLayersStore(store) {
    const id = store.getId();
    // check if already store a key of events
    this._keyEvents.stores[id] = [];

    //In the case of store that has layers @since 3.10.0
    store.getLayers().forEach(l => 'vector' === l.getType() && this.addLayerToMap(l.getMapLayer()));

    this._keyEvents.stores[id].push({
      addLayer: store.onafter('addLayer', l => { 'vector' === l.getType() && this.addLayerToMap(l.getMapLayer()) }),
    });
    this._keyEvents.stores[id].push({
      removeLayer: store.onafter('removeLayer', l => { 'vector' === l.getType() && this.viewer.map.removeLayer(l.getOLLayer()) }),
    });
  }

  // SETUP ALL LAYERS
  _setupAllLayers() {

    // base layers
    const blayers = getMapLayersByFilter({ BASELAYER: true });
    blayers.forEach(l => {
      const base = l.getMapLayer();
      this.registerMapLayerListeners(base);
      this._layers.base[l.getId()] = base;
    });
    Object.values(blayers.length ? this._layers.base : {}).reverse().forEach(l => {
      l.update(this.state, this.layersExtraParams);
      this.addLayerToMap(l);
    });

    // map layers: geolayers exclude baselayers and eventually vector layers
    const layers = getMapLayersByFilter({ BASELAYER: false, VECTORLAYER: false });

    // set map projection on each layer
    layers.forEach(l => l.setMapProjection(this.getProjection()));

    //store incremental value for qtimesriable layer with same multilayer id
    const cache     = {};
    const mapLayers = [];

  Object
    .entries(
      // Group layers by multilayer property (from project config)
      // to speed up "qtimeseriesries" loading for single layers
      groupBy(layers, layer => {
        let id = layer.getMultiLayerId();
        if (layer.isQtimeseries()) {
          cache[id] = undefined === cache[id] ? 0 : cache[id] + 1;
          return `${id}_${cache[id]}`;
        }
        return id = undefined === cache[id] ? id : `${id}_${cache[id] + 1}`;
      })
    )
    .forEach(([id, layers]) => {
      const layer    = layers[0] || [];
      const mapLayer = layer.getMapLayer(
        {
          id: `layer_${id}`,
          projection: this.getProjection(),
          /** @since 3.9.1 */
          format: 1 === layers.length ? layer.getFormat() : null
        },
        1 === layers.length ? {} : this.layersExtraParams
      );
      layers.reverse().forEach(l => mapLayer.addLayer(l));
      mapLayers.push(mapLayer);
      this.registerMapLayerListeners(mapLayer);
    });

    mapLayers.reverse().forEach(l => {
      this._layers.g3w.push(l);
      this.addLayerToMap(l);
    });

    this.updateMapLayers();

    // vector layers
    const vlayers = getMapLayersByFilter({ VECTORLAYER: true });
    // set map projection on each layer
    vlayers.forEach(l => { l.setMapProjection(this.getProjection()); this.addLayerToMap(l.getMapLayer()) })

    // set default layers order
    const map = this.getMap();
    map.addLayer(this.defaultsLayers.mapcenter);
    map.addLayer(this.defaultsLayers.selectionLayer);
    map.addLayer(this.defaultsLayers.highlightLayer);

    /** @since 3.11.0 - temporary layers from local storage (ref: `addlayers` map control) */
    localforage.getItem('externalLayers').then(externalLayers => {
      Object.entries(externalLayers || {}).forEach(([id, layer]) => {
        const olLayer = new ol.layer.Vector({
          source: new ol.source.Vector({ features: new ol.format.GeoJSON().readFeatures(layer.features) })
        });
        olLayer.set('name', id);
        this.addExternalLayer(olLayer, { ...layer.options, zoomToExtent: false });
      });
    });

  }

  setDefaultLayerStyle(type, style = {}) {
    if (type && this.defaultsLayers[type]) {
      this.defaultsLayers._style[type] = style;
    }
  }

  removeLayers() {
    Object.keys(this._layers.base).forEach(id => this.viewer.map.removeLayer(this._layers.base[id].getOLLayer()))
    this.getMapLayers().forEach(l => { this.unregisterMapLayerListeners(l); this.viewer.map.removeLayer(l.getOLLayer()); });
    this._layers.g3w = [];
    // remove external layers
    this._layers.external.forEach(layer => { this.removeExternalLayer(layer.get('name')); });
    this._layers.external.splice(0);
    // remove default layers
    this.defaultsLayers.mapcenter.getSource().clear();
    this.defaultsLayers.highlightLayer.getSource().clear();
    this.defaultsLayers.selectionLayer.getSource().clear();
    this.getMap().removeLayer(this.defaultsLayers.mapcenter);
    this.getMap().removeLayer(this.defaultsLayers.highlightLayer);
    this.getMap().removeLayer(this.defaultsLayers.selectionLayer);
  }

  //set ad increase layerIndex
  setLayerZIndex({ layer, zindex=this.layersCount+=1 }) {
    layer.setZIndex(zindex);
    this.emit('set-layer-zindex', { layer, zindex });
    return zindex;
  }

  /**
   * Add olLayer to mapLayer
   * @param layer
   */
  addLayerToMap(layer) {
    const olLayer = layer.getOLLayer();
    if (olLayer) {
      this.getMap().addLayer(olLayer);
    }
  }

  /**
   * Used by the following plugins: "cdu"
   */
  createMapLayer(layer) {
    layer.setMapProjection(this.getProjection());
    const mapLayer = layer.getMapLayer({
      id:         `layer_${layer.getMultiLayerId()}`,
      projection:  this.getProjection()
    }, this.layersExtraParams);
    mapLayer.addLayer(layer);
  return mapLayer;
  }

  /**
   * Used by the following plugins: "qtimeseries"
   *
   * Update MapLayer
   *
   * @param layer
   * @param options
   */
  updateMapLayer(layer, options = { force: false }, { showSpinner = true } = {}) {
    // if force to add g3w_time parameter to force request of map layer from server
    if (options.force) {
      options.g3w_time = Date.now();
    }
    if (showSpinner !== layer.showSpinnerWhenLoading) {
      layer.showSpinnerWhenLoading = showSpinner;
      if (showSpinner) {
        layer.on('loadstart', this.onLayerLoadStart);
        layer.on('loadend',   this.onLayerLoadEnd);
        layer.on('loaderror', this.onLayerLoadError);
      } else {
        layer.off('loadstart', this.onLayerLoadStart);
        layer.off('loadend',   this.onLayerLoadEnd);
        layer.off('loaderror', this.onLayerLoadError);
      }
    }
    layer.update(this.state, options);
    return layer;
  }

  // run update function on each mapLayer
  updateMapLayers(options = {}) {
    this.getMapLayers().forEach(l => this.updateMapLayer(l, options));
    Object.values(this.getBaseLayers()).forEach(l => l.update(this.state, this.layersExtraParams));
  }

  // register map Layer listeners of creation
  registerMapLayerListeners(layer, projectLayer = true) {
    layer.on('loadstart', this.onLayerLoadStart);
    layer.on('loadend',   this.onLayerLoadEnd);
    layer.on('loaderror', this.onLayerLoadError);
    // listen change filter token
    if (projectLayer) {
      (Array.isArray(layer.layers) ? layer.layers : []).forEach(l => {
        l.onbefore('change',      () => this.updateMapLayer(layer, { force: true }));
        l.on('filtertokenchange', () => this.updateMapLayer(layer, { force: true }))
      });
    }
  }

  // unregister listeners of mapLayers creation
  unregisterMapLayerListeners(layer, projectLayer=false) {
    layer.un('loadstart', this.onLayerLoadStart);
    layer.un('loadend',   this.onLayerLoadEnd);
    layer.un('loaderror', this.onLayerLoadError);
    // try to remove layer filter token
    if (projectLayer) {
      (Array.isArray(layer.layers) ? layer.layers : []).forEach(l => {
        l.un('change');
        l.removeEvent('filtertokenchange')
      });
    }
  }

  setTarget(elId) {
    this.target = elId;
  }

  getCurrentToggledMapControl() {
    return (this._controls.find(c => c.control && c.control.isToggled && c.control.isToggled()) || {}).control;
  }

  /**
   * close: param to close eventually right content open
   * @param interaction
   * @param options is an object contain: {
   *   active: If set new interaction active or not
   *   active: If set new interaction active or not
   *   close: if eventually close GUI Content (es. result right content)
   * }
   * return object having current toggled control if there is a toggled mapcontrol
   */
  addInteraction(interaction, options = { active:true, close:true }) {
    const { active=true }     = options;
    const control             = this.getCurrentToggledMapControl();
    const toggled             = control && control.isToggled && control.isToggled() || false;
    const untoggleMapControls = control && control.isClickMap ? control.isClickMap() : true;
    if (untoggleMapControls && active) {
      this._unToggleControls(options);
    }
    this.getMap().addInteraction(interaction);
    interaction.setActive(active);
    this._externalInteractions.push(interaction);
    return {
      control,
      toggled// return current toggled map control if toggled
    }
  }

  removeInteraction(interaction) {
    if (interaction) {
      interaction.setActive(false);
    }
    this.viewer.map.removeInteraction(interaction);
    this._externalInteractions = this._externalInteractions.filter(_interaction => interaction !== _interaction);
  }

  _watchInteraction(interaction) {
    interaction.on('change:active', e => {
      if ((e.target instanceof ol.interaction.Pointer) && e.target.getActive()) {
        this.emit('mapcontrol:active', e.target);
      }
    })
  }

  /**
   * Used by the following plugins: "qtimeseries"
   *
   * Show map Info
   * @param info
   */
  showMapInfo({ info, style } = {}) {
    this.state.map_info.info = info;
    this.state.map_info.style = style || this.state.map_info.style;
  }

  /**
   * @param { Array } coordinate
   * @param { Number } zoom
   */
  zoomTo(coordinate, zoom=6) {
    const view = this.viewer.map.getView();
    view.setCenter(coordinate);
    view.setZoom(zoom);
  }

  goTo(coordinates, zoom, animate = true) {
    const view    = this.viewer.map.getView();
    zoom = zoom || 6;

    if (animate) {
      view.animate(
        { duration: 300, center: coordinates },
        (zoom ? ({ zoom, duration: 300 }) : ({ duration: 300, resolution: view.getResolution() })
      ));
    } else {
      view.setCenter(coordinates);
    }

    if (zoom && !animate) {
      view.setZoom(zoom);
    }
  }

  /**
   * Set map center to coordinates at resolution
   *
   * @param { Array } coordinates
   * @param resolution
   * @param { boolean } animate
   */
  async goToRes(coordinates, resolution, animate = true) {

    resolution = resolution || this.viewer.map.getView().getResolution();

    await (new Promise(res => {

      this.viewer.map.getView().once('change:center', () => setTimeout(res, 500));

      if (animate) {
        this.viewer.map.getView().animate(
          { duration: 200, center: coordinates },
          { duration: 200, resolution }
        );
      } else {
        this.viewer.map.getView().setCenter(coordinates);
        this.viewer.map.getView().setResolution(resolution);
      }
    }));
  }

  getGeometryAndExtentFromFeatures(features=[]) {
    let extent;
    let geometryType;
    let geometry;
    let coordinates;
    let geometryCoordinates = [];
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const geometry = feature.getGeometry ? feature.getGeometry() : feature.geometry;
      if (geometry) {
        if (geometry instanceof ol.geom.Geometry) {
          const featureExtent = [...geometry.getExtent()];
          extent = !extent ? featureExtent : ol.extent.extend(extent, featureExtent);
          geometryType = geometryType ? geometryType : geometry.getType();
          coordinates = geometry.getCoordinates();
          if (geometryType.includes('Multi')) {
            geometryCoordinates = [...geometryCoordinates, ...coordinates];
          } else {
            geometryCoordinates.push(coordinates);
          }
        } else {
          const featureExtent = feature.bbox;
          extent = !extent ? featureExtent : ol.extent.extend(extent, featureExtent);
          geometryType = geometry.type;
          coordinates = geometry.coordinates;
        }
        if (geometryType.includes('Multi')) {
          geometryCoordinates = [...geometryCoordinates, ...coordinates];
        } else {
          geometryCoordinates.push(coordinates);
        }
      }
    }
    try {
      geometry = new ol.geom[geometryType.includes('Multi') ? geometryType : `Multi${geometryType}`](geometryCoordinates);
      if (undefined === extent) {
        extent = geometry.getExtent();
      }
    } catch(e) {
      console.warn(e);
    }
    return {
      extent,
      geometry
    }
  }

  highlightFeatures(features, options = {}) {
    const { geometry } = this.getGeometryAndExtentFromFeatures(features);
    // force zoom false
    options.zoom = false;
    this.highlightGeometry(geometry, options);
  }

  zoomToGeometry(geometry, options = { highlight: false }) {
    const extent = geometry && geometry.getExtent();
    if (options.highlight && extent) {
      options.highLightGeometry = geometry;
    }
    return this.zoomToExtent(extent, options);
  }

  zoomToFeatures(features, options = { highlight: false }) {
    let { geometry, extent } = this.getGeometryAndExtentFromFeatures(features);
    if (options.highlight && extent) {
      options.highLightGeometry = geometry;
    }
    return this.zoomToExtent(extent, options);
  }

  /**
   * @param   { ol.extent }   extent
   * @param   { Object }      options
   * @param   { boolean }     options.force
   * @param   { ol.geometry } options.highLightGeometry
   *
   * @returns { Promise<void> }
   */
  async zoomToExtent(extent, options = {}) {

    if (!extent) {
      return Promise.resolve();
    }

    const map = this.getMap();

    let resolution;

    // if outside project extent, return max resolution
    if (false === ol.extent.containsExtent(this.project.state.extent, extent)) {
      resolution = map.getView().getResolutionForExtent(this.project.state.extent, map.getSize());
    }

    // retrieve resolution from given `extent`
    else if (true === options.force) {
      resolution = map.getView().getResolutionForExtent(extent, map.getSize()); // resolution of request extent
    }

    // calculate main resolutions from map
    else {
      const curr = map.getView().getResolution();
      // max resolution of the map
      resolution = Math.max(map.getView().getResolutionForExtent(extent, map.getSize()), getResolutionFromScale(MAP_SETTINGS.ZOOM.maxScale, this.getMapUnits()));
      resolution = (curr < resolution) && (curr > resolution) ? curr : resolution;
    }


    await this.goToRes(ol.extent.getCenter(extent), resolution);

    if (options.highLightGeometry) {
      await this.highlightGeometry(options.highLightGeometry, { zoom: false, duration: options.duration });
    }

  }

  goToBBox(bbox, epsg = this.getEpsg()) {
    bbox = epsg === this.getEpsg() ? bbox : ol.proj.transformExtent(bbox, epsg, this.getEpsg());
    // compare bbox extent with project max extent
    this.viewer.fit(ol.extent.containsExtent(this.project.state.extent, bbox) ? bbox : this.project.state.extent);
  }

  /**
   * @since 3.11.0
   */
  _fit(geometry, options = {}) {
    const view    = this.viewer.map.getView();
    const animate = 'boolean' === typeof options.animate ? options.animate : true;

    if (animate) {
      view.animate({ duration: 200, center: view.getCenter() });
      view.animate({ duration: 200, resolution: view.getResolution() });
    }

    delete options.animate; // non lo passo al metodo di OL3 perché è un'opzione interna

    view.fit(geometry, {
      ...options,
      constrainResolution: (undefined !== options.constrainResolution ? options.constrainResolution : true),
      size:  this.viewer.map.getSize()
    });
  }

  /*
  * geometries = array of geometries
  * action: add, clear, remove :
  *   - add: feature/features to selectionLayer. If selectionLayer doesn't exist create a  new vector layer.
  *   - clear: remove selectionLayer
  *   - remove: remove feature from selection layer. If no more feature are in selectionLayer it will be removed
  * */
  setSelectionFeatures(action = 'add', opts = {}) {
    if (opts.color) {
      this.setDefaultLayerStyle('selectionLayer', { color: opts.color });
    }
    const source = this.defaultsLayers.selectionLayer.getSource();
    switch (action) {
      case 'add':    source.addFeature(opts.feature); break;
      case 'remove': source.removeFeature(opts.feature); break;
      case 'update': source.getFeatureById(opts.feature.getId()).setGeometry(opts.feature.getGeometry()); break;
      case 'clear':  source.clear(); break;
    }
  }

  /**
   * @since 3.11.0
   */
  toggleSelection(visible = true) {
    this.defaultsLayers.selectionLayer.setVisible(visible);
  }

  /**
   *
   * @param { ol.geom.Geometry | * } geometryObj
   * @param { Object } options
   * @param { boolean } options.zoom
   * @param { boolean } options.highlight
   * @param options.style
   * @param options.color
   *
   * @returns { Promise<any> }
   */
  async highlightGeometry(geometryObj, options = {}) {
    const duration  = options.duration || MAP_SETTINGS.ANIMATION.duration;
    const hlayer    = this.defaultsLayers.highlightLayer;
    const hide      = 'function' === typeof options.hide      ? options.hide      : null;
    const highlight = 'boolean' === typeof options.highlight  ? options.highlight : true;
    const zoom      = 'boolean' === typeof options.zoom       ? options.zoom      : true;
    let geometry    = geometryObj instanceof ol.geom.Geometry ? geometryObj       : (new ol.format.GeoJSON()).readGeometry(geometryObj);

    this.clearHighlightGeometry();
    this.setDefaultLayerStyle('highlightLayer', { color: options.color });

    if (zoom) {
      await this.zoomToExtent(geometry.getExtent());
    }

    if (!highlight) {
      return;
    }

    if (options.style) {
      hlayer.setStyle(options.style);
    }

    hlayer.getSource().addFeature(new ol.Feature({ geometry }));

    return new Promise(async resolve => {

      const cb = () => {
        hlayer.getSource().clear();
        // set default style
        if (options.style) {
          hlayer.setStyle(feat => [createSelectedStyle({ geometryType: feat.getGeometry().getType(), color: options.color, fill: true })]);
        }
        if (!hide) {
          MAP.animatingHighlight = false;
        }
        resolve();
      }

      if (hide) {
        hide(cb);
      }

      if (duration && duration !== Infinity && !hide) {
        MAP.animatingHighlight = true;
        setTimeout(cb, duration);
      }

    });
  }

  clearHighlightGeometry() {
    if (!MAP.animatingHighlight) {
      this.defaultsLayers.highlightLayer.getSource().clear();
    }
    // reset default layer style
    this.defaultsLayers._style.highlightLayer = { color: undefined };
  }

  /**
   * Force to referesh map
   * @param options
   */
  refreshMap(options = { force: true }) {
    this.updateMapLayers(options);
  }

  // called when layout (window) resizes
  layout({ width, height }) {
    const el = document.getElementById(this.target);

    if (el) {
      el.style.height = height + 'px';
      el.style.width  = width + 'px';
    }

    const is_hidden  = (width <= 0 || height <= 0);
    const has_viewer = !!this.viewer;

    if (has_viewer && !is_hidden) {
      this.getMap().updateSize();
      this.state.hidemaps.forEach(h => h.map.updateSize());
      this.state.bbox       = this.getMapBBOX();
      this.state.resolution = this.viewer.getResolution();
      this.state.center     = this.viewer.getCenter();
      this.updateMapLayers();
    }

    if (!has_viewer) {
      this.setupViewer(width, height);
    }

    this.setHidden(is_hidden);
  }

  getMapBBOX() {
    return this.viewer.map.getView().calculateExtent(this.viewer.map.getSize());
  }

  setInnerGreyCoverBBox(opts = {}) {
    const map      = this.viewer.map;
    let lowerLeft;
    let upperRight;

    if (opts.inner) {
      switch (opts.type) {
        case 'pixel':
          lowerLeft  = [opts.inner[0], opts.inner[1]];
          upperRight = [opts.inner[2], opts.inner[3]];
          break
        case 'coordinate':
        default:
          lowerLeft  = map.getPixelFromCoordinate([opts.inner[0], opts.inner[1]]);
          upperRight = map.getPixelFromCoordinate([opts.inner[2], opts.inner[3]]);
          break;
      }
      this._drawShadow.inner[0] = lowerLeft[0]  * ol.has.DEVICE_PIXEL_RATIO; // x_min
      this._drawShadow.inner[1] = lowerLeft[1]  * ol.has.DEVICE_PIXEL_RATIO; // y_min
      this._drawShadow.inner[2] = upperRight[0] * ol.has.DEVICE_PIXEL_RATIO; // x_max
      this._drawShadow.inner[3] = upperRight[1] * ol.has.DEVICE_PIXEL_RATIO; // y_max
    }

    this._drawShadow.scale    = [null, undefined].includes(opts.scale) ? this._drawShadow.scale || 1 : opts.scale;
    this._drawShadow.rotation = [null, undefined].includes(opts.rotation) ? this._drawShadow.rotation || 0 : opts.rotation;

    if (this._drawShadow.outer) {
      map.render();
    }
  }

  // grey map precompose mapcompose
  startDrawGreyCover(message) {
    // after rendering the layer, restore the canvas context
    const map = this.viewer.map;
    let x_min, x_max, y_min, y_max, rotation, scale;
    this.stopDrawGreyCover();
    this._drawShadow.listener = map.on('postcompose', e => {
      const ctx  = e.context;
      const size = this.getMap().getSize();
      // Inner polygon must be counter-clockwise
      const height = size[1] * ol.has.DEVICE_PIXEL_RATIO;
      const width  = size[0] * ol.has.DEVICE_PIXEL_RATIO;
      this._drawShadow.outer = [0,0,width, height];
      ctx.restore();
      ctx.beginPath();
      // Outside polygon must be clockwise
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.lineTo(0, 0);
      ctx.closePath();
      // end external bbox (map is cover)
      if (this._drawShadow.inner.length) {
        ctx.save();
        x_min    = this._drawShadow.inner[0];
        y_min    = this._drawShadow.inner[3];
        x_max    = this._drawShadow.inner[2];
        y_max    = this._drawShadow.inner[1];
        rotation = this._drawShadow.rotation;
        scale    = this._drawShadow.scale;
        // Inner polygon must be counter-clockwise antiorario
        ctx.translate((x_max+x_min)/2, (y_max+y_min)/2);
        ctx.rotate(rotation*Math.PI / 180);
        ctx.moveTo(-((x_max-x_min)/2),((y_max-y_min)/2));
        ctx.lineTo(((x_max-x_min)/2),((y_max-y_min)/2));
        ctx.lineTo(((x_max-x_min)/2),-((y_max-y_min)/2));
        ctx.lineTo(-((x_max-x_min)/2),-((y_max-y_min)/2));
        ctx.lineTo(-((x_max-x_min)/2),((y_max-y_min)/2));
        ctx.closePath();
        // end inner bbox
      }
      ctx.fillStyle = 'rgba(0, 5, 25, 0.40)';
      ctx.fill();
      if (message) {
        ctx.font = "bold 25px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        message.split('\n').forEach((m, i) => ctx.fillText(m, width / 2, (height / 2) + 30 * i));
      }
      ctx.restore();
    });
  }

  stopDrawGreyCover() {
    if (this._drawShadow.listener) {
      ol.Observable.unByKey(this._drawShadow.listener);
      // reset inner draw shadow
      if (this._drawShadow.inner.length) {
        this._drawShadow = {
          type:     'coordinate',
          outer:    [],
          inner:    [],
          scale:    null,
          rotation: null
        };
      }
      this._drawShadow.listener = null;
    }
    this.getMap().render();
  }

  /**
   * Remove external layer
   *
   * @param name
   */
  removeExternalLayer(name) {
    const layer = this.getLayerByName(name);
    const type = layer._type || 'vector';

    GUI.getService('queryresults').unregisterVectorLayer(layer);
    GUI.getService('catalog').removeExternalLayer({ name, type });

    this.viewer.map.removeLayer(layer);

    if ('vector' === type) {
      this._keyEvents.unwatches[name].forEach(unWatch => unWatch());
      delete this._keyEvents.unwatches[name];
    }

    /** @since 3.11.0 - temporary layers from local storage (ref: `addlayers` map control) */
    if ('vector' === type) {
      localforage.getItem('externalLayers').then(externalLayers => {
        externalLayers  = externalLayers || {}
        if (name in externalLayers) {
          delete externalLayers[name];
        }
        localforage.setItem('externalLayers', externalLayers);
      });
    }

    if ('vector' === type) {
      this._layers.external_vector = this._layers.external_vector.filter(l => {
        if (name !== l.name) {
          return true;
        }
        Object.values(MAP.controls).forEach(c => c.onRemoveExternalLayer && c.onRemoveExternalLayer(l));
        if (l === MAP.selectedLayer) {
          MAP.selectedLayer = null;
        }
      });
    }

    if ('wms' === type) {
      this._layers.external_wms = this._layers.external_wms.filter(l => {
        if (l.getId() !== layer.id) {
          return true;
        }
        this.unregisterMapLayerListeners(l, layer.projectLayer);
      });
    }

    this._layers.external = this._layers.external.filter(l => l.get('id') !== layer.get('id'));

    this.unloadExternalLayer(layer);

    this.emit('remove-external-layer', name);
  }

  /**
   * @TODO deprecate in favour of `getExternalLayers`
   *
   * @since 3.11.0
   */
  getLegacyExternalLayers() {
    return this._layers.external_vector;
  }

  /**
   * Return extanla layers added to map
   * @returns {[]|*[]|T[]}
   */
  getExternalLayers() {
    return this._layers.external;
  }

  /**
   * Add an external layer to the map (eg. ZIP, KMZ, GPX, ...)
   *
   * @param { ol.layer.Vector | ol.layer.Image | unknown } externalLayer
   * @param { Object }  options
   * @param { unknown } options.position
   * @param { number }  options.opacity
   * @param { boolean } options.visible
   * @param { unknown } options.crs
   * @param { unknown } options.type
   * @param { unknown } options.download
   * @param { string }  options.downloadUrl (since 3.8.3) an alternate external server url where to perfom download.
   *
   * @returns { Promise<unknown> }
   */
  async addExternalLayer(externalLayer, options={}) {

    // extract OL layer from a G3W layer
    const olLayer = externalLayer.getOLLayer ? externalLayer.getOLLayer() : externalLayer;
    if (olLayer !== externalLayer) {
      olLayer.set('id',   externalLayer.getId());
      olLayer.set('name', externalLayer.getId());
    }
    externalLayer = olLayer;

    let vectorLayer;

    options.position = undefined !== options.position ? options.position : MAP_SETTINGS.LAYER_POSITIONS.default;
    options.opacity  = undefined !== options.opacity ? options.opacity : 1;
    options.visible  = undefined !== options.visible ? options.visible : true;

    // vector layer
    if (externalLayer instanceof ol.layer.Vector) {

      externalLayer.set('id', externalLayer.get('id') || getUniqueDomId());

      vectorLayer           = externalLayer;
      vectorLayer.filter    = { // used by `selection` for query result purpose ?
        active: false           // UNUSED - it means not yet implemented?
      };
      vectorLayer.selection = {
        active: false,
        features: []
      };

      if (options.color && options.field) {
        vectorLayer.setStyle(createStyleFunctionToVectorLayer({
          color: options.color,
          field: options.field
        }));
      }

      let color;
      try {
        const style = externalLayer.getStyle();
        color = style._g3w_options ? style._g3w_options.color : 'blue'; //setted by geo utils create style function
      } catch(e) { console.warn(e); }

      externalLayer = {
        id:               externalLayer.get('id'),
        name:             vectorLayer.get('name') || vectorLayer.get('id'),
        projectLayer:     false,
        title:            vectorLayer.get('name') || vectorLayer.get('id'),
        removable:        true,
        external:         true,
        crs:              options.crs,
        type:             options.type,
        _type:            'vector',
        visible:          options.visible,
        checked:          true,
        position:         options.position,
        opacity:          options.opacity,
        color:            color || 'blue',
        filter:           vectorLayer.filter,
        selection:        vectorLayer.selection,
        /** @since 3.8.0 */
        tochighlightable: false,
        download:         options.download || false,
        /**
         * An alternate (external) server url where to perfom download.
         *
         * @example
         *
         * ```js
         * GUI.getService('map').addExternalLayer(layer, {
         *   type: 'geojson',
         *   downloadUrl:  _<URL WHERE DOWNLOAD FILE>_
         * });
         * ```
         *
         * @since 3.8.3
         */
        downloadUrl: options.downloadUrl,
      };
    }

    // image layer
    if (externalLayer instanceof ol.layer.Image) {
      externalLayer.id           = externalLayer.get('id');
      externalLayer.removable    = true;
      externalLayer.projectLayer = false;
      externalLayer.name         = externalLayer.get('name');
      externalLayer.title        = externalLayer.get('name');
      externalLayer._type        = 'wms';
      externalLayer.opacity      = options.opacity;
      externalLayer.position     = options.position;
      externalLayer.external     = true;
      externalLayer.checked      = options.visible;
    }

    // skip when another layer with the same name was already added
    if (this.getLayerByName(externalLayer.name)) {
      GUI.notify.warning("layer_is_added", false);
    }

    const type  = externalLayer._type || externalLayer.type;

    const layer = ({
      'vector': vectorLayer,
      'wms':    externalLayer,
    })[type] || await createVectorLayerFromFile({
      name: externalLayer.name,
      type,
      crs:  externalLayer.crs,
      data: externalLayer.data,
    });

    // skip if is not a valid layer
    if (!layer) {
      return Promise.reject();
    }

    const features = ('vector' === type && layer.getSource().getFeatures()) || [];
    const extent   = ('vector' === type && layer.getSource().getExtent()) || [];

    // add id value
    features.forEach((f, i) => f.setId(i));

    if (features.length) {
      externalLayer.geometryType = features[0].getGeometry().getType();
      externalLayer.selected = false;
    }

    if (extent.length) {
      externalLayer.bbox = { minx: extent[0], miny: extent[1], maxx: extent[2], maxy: extent[3] };
    }

    layer.set('position', options.position);
    layer.setOpacity(options.opacity);
    layer.setVisible(options.visible);

    /** @TODO use a common parent class (project/external layers) */
    externalLayer.set                 = externalLayer.set                 || ((a, d) => externalLayer[a] = d);
    externalLayer.get                 = externalLayer.get                 || (a => externalLayer[a]);
    externalLayer.getId               = externalLayer.getId               || (() => externalLayer.id);
    externalLayer.getName             = externalLayer.getName             || (() => externalLayer.name);
    externalLayer.getGeometryType     = externalLayer.getGeometryType     || (() => externalLayer.geometryType);
    externalLayer.setTocHighlightable = externalLayer.setTocHighlightable || (h => externalLayer.tochighlightable = h);
    externalLayer.getTocHighlightable = externalLayer.getTocHighlightable || (() => externalLayer.tochighlightable);
    externalLayer.isSelected          = externalLayer.isSelected          || (() => externalLayer.selected);
    externalLayer.setSelected         = externalLayer.setSelected         || (s => externalLayer.selected = s);
    externalLayer.isQueryable         = externalLayer.isQueryable         || (() => !!vectorLayer);
    externalLayer.isVisible           = externalLayer.isVisible           || (() => {
      if (vectorLayer) { externalLayer.visible = vectorLayer.getVisible(); }
      return externalLayer.visible;
    });
    externalLayer.setVisible          = externalLayer.setVisible          || (v => {
      if (vectorLayer) { vectorLayer.setVisible(v); }
      externalLayer.visible = v;
    });

    this.viewer.map.addLayer(layer);

    this._layers.external.push(layer);

    if ('vector' === type) {
      this._layers.external_vector.push(externalLayer);
    }

    // register and dispatch layer add event
    if ('wms' === type) {
      this._layers.external_wms.push(externalLayer);
      this.registerMapLayerListeners(externalLayer, false);
    }

    if (vectorLayer) {
      localforage.getItem('externalLayers').then(externalLayers => {
        localforage.setItem('externalLayers', {
          ...(externalLayers || {}),
          [vectorLayer.get('name')]: {
            features: new ol.format.GeoJSON().writeFeatures(vectorLayer.getSource().getFeatures()),
            options
          }
        });
      });
    }

    GUI.getService('queryresults').registerVectorLayer(layer);
    GUI.getService('catalog').addExternalLayer({ layer: externalLayer, type });

    // invoke `onAddExternalLayer` on each map control
    if ('vector' === type) {
      this._keyEvents.unwatches[externalLayer.name] = [];
      Object.values(MAP.controls).forEach(c => c.onAddExternalLayer && c.onAddExternalLayer({ layer: externalLayer, unWatches: this._keyEvents.unwatches[externalLayer.name] }));
    }

    if (extent && options.zoomToExtent) {
      this.viewer.map.getView().fit(extent);
    }

    this.loadExternalLayer(layer);

    return layer;
  }

  getCookie(name) {
    Vue.cookie.get(name)
  }

  /**
   * @param { unknown | string | null } layer
   *
   * @since 3.11.0
   */
  selectLayer(layer) {

    const catalog = require('store/catalog-layers').default;

    let id = 'string'=== typeof layer ? layer : layer && layer.getId();

    // toggle previous selection
    if (MAP.selectedLayer && id === MAP.selectedLayer.getId()) {
      id = null;
    }

    layer = catalog.getLayerById(id) || this.getLegacyExternalLayers().find(l => id === l.getId());

    // select layer by id
    catalog.getLayers().concat(this.getLegacyExternalLayers()).forEach(l => l.setSelected(l.getId() === id));

    MAP.selectedLayer = layer && layer.isSelected() ? layer : null;

    Object.values(MAP.controls).forEach(c => c.onSelectLayer && c.onSelectLayer(MAP.selectedLayer));
  }

  /**
   * @since 3.11.0
   */
  getSelectedLayer() {
    return MAP.selectedLayer;
  }

};

/** @since 3.8.0 */
ApplicationService.onbefore('offline', () => MAP.offlineids.forEach(c => { c.enable = MAP.controls[c.id].getEnable(); MAP.controls[c.id].setEnable(false); }));

/** @since 3.8.0 */
ApplicationService.onbefore('online', () => MAP.offlineids.forEach(({ id, enable }) => MAP.controls[id].setEnable(enable)));

module.exports = {

  MapService,

  MapLayersStoresRegistry: MAP.layers,

  /** ORIGINAL SOURCE: src/app/gui/map/control/factory.js@v3.8.0 */
  ControlsFactory: {
    create(options = {}) {
      return CONTROLS[options.type] ? new CONTROLS[options.type](options) : undefined;
    }
  },
};