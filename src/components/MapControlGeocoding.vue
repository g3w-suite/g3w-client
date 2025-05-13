<!--
  @file need some inspiration for other geocoding providers?

  👉 https://github.com/Dominique92/ol-geocoder
  👉 https://github.com/perliedman/leaflet-control-geocoder

  @since 3.9.0
-->
<template>
  <div
    v-if   = "has_providers"
    :class = "[ 'ol-geocoder', { 'g3w-disabled': disabled }]"
  >

    <div class = "gcd-txt-control">

      <!-- INPUT SEARCH -->
      <input
        ref             = "input"
        type            = "text"
        id              = "gcd-input-query"
        autocomplete    = "off"
        class           = "gcd-txt-input"
        @keyup          = "onQuery"
        @input          = "onValue"
        :placeholder    = "placeholder"
      />

      <!-- RESET SEARCH -->
      <button
        ref         = "reset"
        type        = "button"
        id          = "gcd-input-reset"
        class       = "gcd-txt-reset gcd-hidden"
        @click.stop = "onReset"
        title       = "Reset search"
      ></button>

      <!-- SUBMIT SEARCH -->
      <button
        type            = "button"
        id              = "gcd-search"
        class           = "btn"
        @click.stop     = "() => query($refs.input.value)"
        title           = "Submit search"
      >
        <i
          :class      = "$fa('search')"
          style       = "color: #fff"
          aria-hidden = "true"
        ></i>
      </button>

      <!-- CLEAR MARKERS SELECTION --->
      <button
        v-if="features.length > 0"
        type            = "button"
        id              = "gcd-trash"
        class           = "btn skin-background-color"
        @click.stop     = "clearMarkers"
        title           = "Clear markers selection"
      >
        <i
          :class      = "$fa('trash')"
          aria-hidden = "true"
        ></i>
      </button>

      <!-- TOGGLE MARKERS VISIBLITY -->
      <button
        v-if          = "features.length > 0"
        type          = "button"
        id            = "markers-visibility-layer"
        class         = "btn skin-background-color"
        @click.stop   = "toggleLayerVisibility"
        title         = "Toggle markers visibility"
      >
        <i
        :class      = "$fa(is_layer_visible ? 'eye-close': 'eye')"
        aria-hidden = "true"
        ></i>
      </button>

      <!-- TOGGLE SIDEBAR PANEL -->
      <button
        v-if          = "features.length > 0"
        type          = "button"
        id            = "show-markers-results"
        class         = "btn skin-background-color"
        @click.stop   = "toggleSidebar"
        title         = "Toggle sidebar panel"
      >
      <code :style = "{ opacity: is_sidebar_open ? 0.5 : undefined }">
        {{ features.length > 99 ? '99+' : features.length }}
      </code>
      </button>

    </div>

    <!-- SEARCH RESULTS -->
    <ul
      ref   = "result"
      class = "gcd-txt-result"
    >
      <li
        v-for   = "(item, i) in results"
        :class  = "[
          item.provider,
          item.__icon       ? 'gcd-icon-' + item.__icon : '',
          item.__heading    ? 'skin-background-color' : '',
          item.__no_results ? 'gcd-noresult' : '',
          item.__selected   ? 'selected' : '',
        ]"
        :key        = "item.__uid"
        @click.stop = "!item.__heading && onItemClick(item)" 
      >
        <!-- GEOCODING PROVIDER (eg. "Nominatim OSM") -->
        <span
          v-if  = "item.__heading"
          style = "display: flex; justify-content: space-between; padding: 5px"
        >
          <span style="color: #FFF; font-weight: bold">{{ item.label }}</span>
        </span>
        <!-- NO RESULTS -->
        <span
          v-else-if = "item.__no_results"
          v-t       = "'mapcontrols.geocoding.noresults'"
        ></span>
        <!-- NO RESULTS -->
        <template v-else>
          <i
            style       = "color: #000; padding: 5px;"
            :class      = "$fa(item.__selected ? 'check' : 'uncheck')">
          </i>
          <img
            v-if  = "'poi' === item.__icon"
            class      = "gcd-icon"
            src        = "/static/client/images/pushpin.svg"
            width      = "24"
            height     = "24"
          />
          <i
            v-else-if   = "undefined !== item.__icon"
            :class      = "`fa fa-${item.__icon}`"
            style       = "color:black"
            aria-hidden = "true"
          ></i>
          <span style="display: flex; flex-direction: column; padding: 3px 5px; color: #000; cursor: pointer;">
            <span v-if  = "item.type"                                                                class = "gcd-type">{{ item.type }}</span>
            <span v-if  = "item.name"                                                                class = "gcd-name">{{ item.name }}</span>
            <span v-if  = "item.address_name"                                                        class = "gcd-road">{{ item.address_name }}</span>
            <span v-if  = "item.address_road  || item.address_building || item.address_house_number" class = "gcd-road">{{ item.address_building }} {{ item.address_road }} {{ item.address_house_number }}</span>
            <span v-if  = "item.address_city  || item.address_town     || item.address_village"      class = "gcd-city">{{ item.address_postcode }} {{ item.address_city }} {{ item.address_town }} {{ item.address_village }}</span>
            <span v-if  = "item.address_state || item.address_country"                               class = "gcd-country">{{ item.address_state }} {{ item.address_country }}</span>
          </span>
        </template>
      </li>
    </ul>

  </div>
</template>

<script>
import GUI                              from 'services/gui';
import ApplicationState                 from 'store/application';
import QueryResultsActionChooseLayer    from 'components/QueryResultsActionChooseLayer.vue';
import PluginsRegistry                  from 'store/plugins';
import Projections                      from 'store/projections';
import { getUniqueDomId }               from 'utils/getUniqueDomId';
import { flattenObject }                from 'utils/flattenObject';
import { addZValue }                    from 'utils/addZValue';
import { isPointGeometryType }          from 'utils/isPointGeometryType';
import { convertSingleMultiGeometry }   from 'utils/convertSingleMultiGeometry';
import { getCatalogLayerById }          from 'utils/getCatalogLayerById';
import { getCatalogLayers }             from 'utils/getCatalogLayers';
import { createSelectedStyle }          from 'utils/createSelectedStyle';
import { t }                            from 'g3w-i18n';

/**
 * Provider definitions.
 * 
 * @example adding a new provider → `my_custom_provider.js`:
 * 
 * http://localhost:8000/static/client/geocoding-providers/bing_streets.js
 * http://localhost:8000/static/client/geocoding-providers/bing_places.js
 * http://localhost:8000/static/client/geocoding-providers/nominatim.js
 * http://localhost:8000/static/client/geocoding-providers/my_custom_provider.js
 * 
 * ```py
 * # config/g3w-suite/settings_docker.py
 * 
 * GEOCODING_PROVIDERS = {
 *   "bing_streets": { ... },
 *   "bing_places":  { ... },
 *   "nominatim":    { ... },
 *   "my_custom_provider": {
 *     "label": "Custom Provider",
 *     "url": "https://example.com/search",
 *     "icon": "road",
 *   },
 * }
 * 
 * VENDOR_KEYS['my_custom_provider'] = 'super.secret.key'
 * ```
 */
const PROVIDERS = window.initConfig.mapcontrols.geocoding ? window.initConfig.mapcontrols.geocoding.providers : {};
Object
  .keys(PROVIDERS)
  .forEach(function(p) {
      const script = document.createElement('script');
      script.src   = window.initConfig.staticurl + 'client/geocoding-providers/'+ p + '.js';
      script.async = true;
      document.head.appendChild(script);
  });

/**
 * CUSTOM GEOCODING PROVIDER: "qes"
 */
window.initConfig.mapcontrols.geocoding.providers['qes'] = {
  label: window.location.host,
  fetch: async (opts) => ({
    provider: 'qes',
    icon:     'layer-group',
    results:
    (
      await g3wsdk.core.utils.XHR.get({ url: `${initConfig.baseurl}qes/api/search/${g3wsdk.core.ApplicationState.project.getId()}/?q=${opts.query}` })
    ).results.map(result => ({
      name:  result.attributes.name || result.feature_id,
      type:  result.layer_name,
      qes:   result,
    })),
  }),
  fetch_geom: async item => (await g3wsdk.core.utils.XHR.get({ url: `${initConfig.baseurl}vector/api/editing/qdjango/${g3wsdk.core.ApplicationState.project.getId()}/${item.qes_layer_id}/?fids=${item.qes_feature_id}` })).vector.data.features[0].geometry,
};

/**
 * Search results layer (pushpin marker)
 *
 * @TODO move to parent `Control` class? (duplicated also in GEOLOCATION CONTROL)
 */
const LAYER = new ol.layer.Vector({
  id: '__g3w_marker',
  name: 'Geocoding',
  source: new ol.source.Vector(),
  style(feature) { // set style function to check if a coordinate search or a search from provider
    if ('__g3w_marker_coordinates' === feature.getId()) {
      return new ol.style.Style({
        text: new ol.style.Text({
          offsetY: -15, //move marker icon on base point coordinate and not center
          text: '\uf3c5',
          font: '900 3em "Font Awesome 5 Free"',
          stroke: new ol.style.Stroke({
            color: 'red',
            width: 3
          }),
          fill: new ol.style.Fill({
            color: 'rgba(255, 0,0, 0.7)'
          })
        })
      })
    }
    
    if (isPointGeometryType(feature.getGeometry().getType())) {
      return [
        // pusphin icon
        new ol.style.Style({
          image: new ol.style.Icon({
            opacity: 1,
            src: '/static/client/images/pushpin.svg',
            scale: 0.8
          }),
        }),
        // increase clickable icon area (invisible buffer)
        new ol.style.Style({
          image: new ol.style.RegularShape({
            stroke: new ol.style.Stroke({ color: [0, 0, 0, 0] }),
            points: 4,
            radius: 50,
            angle: Math.PI / 4
          })
        })
      ];
    } else {
      return createSelectedStyle({
        geometryType: feature.getGeometry().getType(),
        color:        'orange',
        fill:         false,
      })
    }
  }
});

/**
 * Setted to true while running `clearMarkers()`
 */
let is_clearing = false;

export default {

  data() {
    return {
      /** @since 3.9.0 */
      results:            [],
      /** @since 3.9.0 */
      disabled:           false, // disabled boolean control
    };
  },

  props: {

    /**
     * @since 3.9.0
     */
    providers: {
      type:     Object, // {nominatim: {url:<url>, bing:{url:<url}}}
      default:  {}
    },

  },

  computed: {

    /**
     * @returns { boolean } layer visible (property)
     * 
     * @since 3.9.0
     */
    is_layer_visible() {
      return LAYER.getVisible();
    },

    /**
     * @returns { array } layer markers (features)
     * 
     * @since 3.9.0
     */
    features() {
      return LAYER.getSource().getFeatures();
    },

    /**
     * @since 3.9.0
     */
    has_providers() {
      return Object.keys(this.providers).length > 0;
    },

    /**
     * Get a dynamic extent (e.g., Bing Places)
     * 
     * @TODO add a checkbox to let user choose whether include searches only from current map extent
     * 
     * - "dynamic": filter search results based on current map extent
     * - "initial": filter search results based on initial map extent
     * 
     * @since 3.9.0
     */
    extent() {
      const map = GUI.getService('map');
      const project = map.getProject().state;
      return ol.proj.transformExtent(
        Object.keys(this.providers).filter(p => 'nominatim' != p).length > 0
          ? map.getMapExtent()
          : (project.initextent || project.extent),
        project.crs.epsg,
        'EPSG:4326'
      );
    },

    /**
     * @since 3.11.0
     */
    placeholder() {
      return ApplicationState.language && t('mapcontrols.geocoding.placeholder');
    },

    is_sidebar_open() {
      return GUI.getCurrentContent();
    },

  },

  methods: {

    /**
     * Toggle marker layer visibility
     *
     * @since 3.9.0
     */
    toggleLayerVisibility() {
      LAYER.setVisible(!this.is_layer_visible);
    },

    /**
     * Clear Result list only
     *
     * @since 3.9.0
     */
    clearResults() {
      this.results.splice(0);
      //Remove eventually marker coordinates
      if (LAYER.getSource().getFeatureById('__g3w_marker_coordinates')) {
        LAYER.getSource().removeFeature(LAYER.getSource().getFeatureById('__g3w_marker_coordinates'));
      }
    },

    clearMarkers() {
      is_clearing = true;
      LAYER.getSource().clear(); // clear layer features marker
      LAYER.setVisible(true);    // force layer visibilty to true
      // set false to add
      this.results.forEach(i => i.__selected = false);
      const layer = GUI.getService('queryresults').getState().layers.find(l => l.id === LAYER.get('id'));
      // check if marker is in query results
      if (layer) {
        layer.features.forEach(f => GUI.getService('queryresults').removeFeatureLayerFromResult(layer, f));
      }
      is_clearing = false;
    },

    /**
     * Clear all
     *
     * @since 3.9.0
     */
    clear() {
      this.clearResults();
      this.clearMarkers();
    },

    /**
     * Run geocoding request
     *
     * @param { string } q query string in this format: "XCoord,YCoord,EPSGCode"
     *
     * @since 3.9.0
     */
    async query(q) {

      const map = GUI.getService('map');

      const isNumber     = value => 'number' === typeof value && !Number.isNaN(value);
      let coordinates    = null;
      let transform      = false;
      const [x, y, epsg] = (q || '').split(',');
      // get projection of coordinates is pass as third value
      const projection   = epsg && await Projections.registerProjection(`EPSG:${epsg.trim()}`);

      // extract xCoord and yCoord
      if (isNumber(1 * x) && isNumber(1 * y)) {
        coordinates = [1 * x, 1 * y];
      }

      // whether EPSGCode is allowed on this project
      try {
        if (projection) {
          coordinates = ol.proj.transform(coordinates, projection.getCode(), 'EPSG:4326');
          transform = true;
        }
      } catch (e) {
        console.warn(e);
      }

      // request is for a single point (XCoord,YCoord)
      if (coordinates) {
        const source = LAYER.getSource();
        //check if already added
        if (source.getFeatureById('__g3w_marker_coordinates')) {
          //remove
          source.removeFeature(source.getFeatureById('__g3w_marker_coordinates'));
        }
        //create marker coordinate feature
        const feature = new ol.Feature({
          geometry: new ol.geom.Point(transform ? ol.proj.transform(coordinates, 'EPSG:4326', map.getEpsg()) : coordinates),
          //add info for eventually query result
          lon: coordinates[0],
          lat: coordinates[1],
        });
        //set id
        feature.setId('__g3w_marker_coordinates');
        //add to a layer marker source
        LAYER.getSource().addFeature(feature);
        // show marker
        map.zoomToGeometry(new ol.geom.Point(transform ? ol.proj.transform(coordinates, 'EPSG:4326', map.getEpsg()) : coordinates));
        return coordinates;
      }

      // request is for a place (Address, Place, etc..)
      if (!coordinates) {

        // clear previous result
        this.clearResults();
        this.$refs.reset.classList.add("gcd-spin");

        // request data and update search results
        (await Promise.allSettled(
          Object
            .entries(this.providers)
            .map(([ p, config = {} ]) => PROVIDERS[p].fetch({
              url:          config.url,
              icon:         config.icon,
              query:        q,
              lang:         ApplicationState.language || 'it-IT',
              // countrycodes: _options.countrycodes,             // <-- TODO ?
              limit:        5,
              extent:       this.extent,
            }))
        ))
          .filter(p => 'fulfilled' === p.status)
          .forEach((p) => {

            // heading
            this.results.push({
              __heading: true,
              provider:  p.value.provider,
              label:     this.providers[p.value.provider].label || p.value.label,
            });

            // no results
            if (!(p.value.results && p.value.results.length)) {
              this.results.push({
                __no_results: !(p.value.results && p.value.results.length),
              });
              return;
            }

            // results
            p.value.results.forEach(item => {
              this.results.push(flattenObject({
                ...item,
                provider:   p.value.provider,
                __uid:      getUniqueDomId(),
                __icon:     this.providers[p.value.provider].icon || p.value.icon,
                __selected: false,
              }));
            });

          });

        this.$refs.reset.classList.remove("gcd-spin");
      }

    },

    /**
     * @since 3.9.0
     */
    onQuery(evt) {
      if ('Enter' === evt.key || 13 === evt.which || 13 === evt.keyCode) {
        evt.preventDefault();
        this.query(evt.target.value.trim());
      }
    },

    /**
     * @since 3.9.0
     */
    onValue(e) {
      this.$refs.reset.classList.toggle("gcd-hidden",0 === e.target.value.trim().length);
    },

    /**
     * @since 3.9.0
     */
    onReset() {
      this.$refs.input.focus();
      this.$refs.input.value = '';
      this.$refs.reset.classList.add("gcd-hidden");
      this.clearResults();
    },

    /**
     * @param uid
     * 
     * @since 3.9.0
     */
    _removeItem(uid) {
      const item = (this.results || []).find(r => uid === r.__uid);

      // check if clear markers are running
      if (this.features.length) {
        const source = LAYER.getSource();
        source.removeFeature(source.getFeatureById(uid));
      }

      // check if is an open result list
      if (item) {
        item.__selected = false;
      }

      // no markers are on the map
      if (0 === this.features.length) {
        LAYER.getSource().clear(); // clear layer features marker
        LAYER.setVisible(true);    // force layer visibilty to true
      }

      // show remaining results or close panel
      if (!is_clearing) {
        GUI.closeContent().then(() => {
          GUI.showQueryResults('Geocoding', { data: [{ layer: LAYER, features: LAYER.getSource().getFeatures() }] });
        });
      }

    },

    /**
     * @since 3.9.0
     */
    async onItemClick(item) {
      try {
        let feature;

        // lazy load item geometry
        if (PROVIDERS[item.provider]?.fetch_geom) {
    
          feature = new ol.Feature({ geometry: (new ol.format.GeoJSON()).readGeometry(await PROVIDERS[item.provider].fetch_geom(item))});
        }

        // skip invalid items (ie. no geometry)
        if ((!item.lat || !item.lon) && !feature) {
          return;
        }

        // in case of already add marker
        if (LAYER.getSource().getFeatureById(item.__uid)) {
          this._removeItem(item.__uid);
        } else {
          // add feature marker and zoom on it
          const { __uid, __icon, __selected, ...properties } = item; // exclude internal properties
          feature = feature || new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.transform([parseFloat(item.lon), parseFloat(item.lat)], 'EPSG:4326', GUI.getService('map').getEpsg())),
          });
          //add properties
          feature.setProperties(properties);
          // set id of the feature
          feature.setId(__uid);
          LAYER.getSource().addFeature(feature);
          GUI.getService('map').zoomToFeatures([feature])
          item.__selected = true;
          await GUI.closeContent();
          GUI.showQueryResults('Geocoding', { data: [{ layer: LAYER, features: [feature] }] });
        }
      } catch (e) {
        console.warn(e);
      }
    },

    /**
     * Show markers on query results panel
     * 
     * @since 4.0.0
     */
    toggleSidebar() {
      const features = LAYER.getSource().getFeatures();
      if (!this.is_sidebar_open && features.length) {
        GUI.showQueryResults('Geocoding', { data: [{ layer: LAYER, features }] });
      } else {
        GUI.closeContent();
      }
    },

    /**
     * Create new feature on selected Point/Multipoint layer
     * 
     * @since 3.9.0 
     */
    async _editItem(layerId, feature) {
      const editing = PluginsRegistry.getPlugin('editing');

      // skip on missing plugin dependency
      if (!editing) {
        return;
      }

      // disable ol-gecoder while editing
      this.disabled = true;
      try {

        // get a geometry type of target layer
        const type = getCatalogLayerById(layerId).getGeometryType();

        // create a new editing feature (Point/MultiPoint + safe alias for keys without `raw_` prefix)
        const _feature = addZValue({
          geometryType: type,
          feature:      new ol.Feature({
            ...Object.entries(feature.attributes).reduce((acc, attr) => ({ ...acc, [attr[0].replace(feature.attributes.provider + '_', '').toLowerCase()]: attr[1] }), {}),
            ...feature.attributes,
            geometry: convertSingleMultiGeometry(feature.geometry, type),
          }),
        });

        // start editing session
        await editing.addLayerFeature({ layerId: layerId, feature: _feature });

      } catch(e) {
        console.warn(e);
      }
      this.disabled = false;
    },

  },

  created() {

    const queryresults = GUI.getService('queryresults');
    const map          = GUI.getService('map');

    /** @TODO keep layer on top when adding an external layer ? (wms, vector, ...) */
    map.getMap().addLayer(LAYER);

    //register change z-index layer position when new layer is added (ex wms or vector)
    map.on('set-layer-zindex', ({layer, zindex}) => {
      if (layer.get('id') !== LAYER.get('id')) {
        LAYER.setZIndex(zindex+1);
      }
    })

    // register vector layer for query results
    queryresults.registerVectorLayer(LAYER);

    queryresults.onafter('removeFeatureLayerFromResult', (layer, feature) => {
      if (LAYER.get('id') === layer.id) {
        this._removeItem(feature.id);
      }
    });

    /** @TODO delegate attaching listener to addCurrentActionToolsLayer */
    queryresults.onafter('addActionsForLayers', (actions, layers) => {

      const layer = layers.find(l => LAYER.get('id') === l.id);

      if (!layer) {
        return;
      }

      // Get editing layers that has Point/MultiPoint Geometry type
      const editablePointLayers =  getCatalogLayers({ EDITABLE: true, GEOLAYER: true })
        .filter(l => isPointGeometryType(l.getGeometryType()))
        .map((l) => ({ id: l.getId(), name: l.getName(), inediting: l.isInEditing() }));

      // skip adding action icon when there is no editable layer
      // or editing panel is open (layer is in editing)
      if (editablePointLayers.find(l => l.inediting)) {
        return;
      }

      // Add
      queryresults.addCurrentActionToolsLayer({
        id: QueryResultsActionChooseLayer.name,
        layer,
        action: {
          id:         'choose_layer',
          class:      GUI.getFontClass('pencil'),
          state:      Vue.observable({ toggled: Array(layer.features.length).fill(null) }),
          toggleable: true,
          hint:       'Choose a layer',
          cbk:        (layer, feature, action, index) => {
            // skip layer choose when there is only a single editable layer
            if (1 === editablePointLayers.length) {
              this._editItem(editablePointLayers[0].id, feature);
              return;
            }
            // let user choose an editable layer
            action.state.toggled[index] = !action.state.toggled[index];
            queryresults.setCurrentActionLayerFeatureTool({
              layer,
              index,
              action,
              component: (action.state.toggled[index] ? QueryResultsActionChooseLayer : null),
            });
          },
        },
        config: {
          layers:   editablePointLayers,
          icon:     'pencil',
          label:    'mapcontrols.geocoding.choose_layer',
          nolayers: 'mapcontrols.geocoding.nolayers',
          cbk:      this._editItem,
        },
      });

    });

  },

  destroyed() {
    GUI.getService('queryresults').unregisterVectorLayer(LAYER);
  }

};
</script>

<style>
  /* Geocoder */
  .ol-geocoder {
    box-sizing: border-box;
    position: absolute;
    max-width: 300px;
    top: 3px;
    left: 45px;
    width: 50%;
    height: 6px;
    font-size: 1.1em;
  }

  @media (max-width: 767px) {
    .ol-geocoder {
      left: 10px;
    }
  }

  .ol-geocoder > ul > li:hover {
    background-color: #eee;
  }

  .ol-geocoder > ul > li {
    width: 100%;
    overflow: hidden;
    padding: 0;
    min-height: 30px;
    padding-left: 3px;
    border-bottom: 2px solid var(--skin-color);
    min-height: 20px;
    padding: 10px;
  }

  .ol-geocoder > ul {
    border-radius: 3px !important;
    width: 100%;
    max-height: 65vh;
    padding: 0;
    margin-top: 3px;
    background-color: white;
    border-top: none;
    overflow-x: hidden;
    overflow-y: auto;
    transition: max-height 300ms ease-in;
    margin-bottom: 0;
  }

  .ol-geocoder > ul > li:last-child {
    border-bottom: 0 !important;
  }

  .ol-geocoder li:not(.skin-background-color) {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .ol-geocoder li.gcd-icon-road .gcd-name,
  .ol-geocoder li.gcd-icon-road .gcd-type,
  .ol-geocoder li.gcd-icon-road .gcd-icon,
  .ol-geocoder li.gcd-icon-poi .gcd-road,
  .ol-geocoder li.gcd-icon-poi .gcd-city,
  .ol-geocoder li.gcd-icon-poi .gcd-country {
    display: none;
  }

  .ol-geocoder #gcd-search {
    z-index: 1;
    width: 2.5em;
    height: 100%;
    border-radius: 0;
    background-color: var(--skin-color, #fff);
  }

  .ol-geocoder #gcd-trash,
  .ol-geocoder #show-markers-results,
  .ol-geocoder #markers-visibility-layer {
    z-index: 1;
    border-radius: 0 !important;
    color: #FFF;
    border-left: 1px solid #fff;
  }

  .ol-geocoder #gcd-trash {
    color: #f00;
  }

  .ol-geocoder #gcd-input-query {
    font-weight: bold;
  }

  .ol-geocoder .gcd-txt-reset::after {
    content: "\d7";
    display: inline-block;
    font-weight: bold;
    font-size: 2em;
    cursor: pointer;
    color: var(--skin-color);
  }

  .ol-geocoder .gcd-txt-reset {
    z-index: 1;
    width: 2.5em;
    height: 100%;
    line-height: 100%;
    border: none;
    background-color: transparent;
    display: inline-block;
    vertical-align: middle;
    outline: 0;
    cursor: pointer;
  }

  .ol-geocoder .gcd-txt-input:focus {
    outline: none;
  }

  .ol-geocoder .gcd-txt-input {
    z-index: 1;
    border: 0;
    width: 100%;
    height: 100%;
    padding: 5px 5px 5px 5px;
    text-indent: 6px;
    background-color: transparent;
    font-family: inherit;
    font-size: 1em;
  }

  .ol-geocoder .gcd-txt-control {
    position: relative;
    display: flex;
    justify-content: flex-end;
    height: 41px;
    background-color: #fff;
    overflow: hidden;
    border-radius: 2px;
    width: 100%;
    border: 2px solid var(--skin-color)
  }

  @keyframes ol-geocoder-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .ol-geocoder .gcd-road {
    font-size: 0.875em;
    font-weight: 500;
  }

  .ol-geocoder .gcd-city {
    font-size: 1em;
    font-weight: bold;
  }

  .ol-geocoder .gcd-country {
    font-size: 0.75em;
  }

  .ol-geocoder .gcd-spin::after {
    animation: ol-geocoder-spin .7s linear infinite;
  }

  .ol-geocoder .gcd-hidden {
    display: none !important;
  }

  .ol-geocoder li.skin-background-color {
    position: sticky;
    top: 0;
  }

  .ol-geocoder li.selected {
    background-color: #f7fabf !important;
  }

  .ol-geocoder li.gcd-noresult:hover {
    background-color: transparent !important;
  }

  .ol-geocoder li.gcd-noresult {
    font-weight: bold;
    color: #384247;
    margin: 10px;
    border-bottom: 0 !important;
  }
</style>