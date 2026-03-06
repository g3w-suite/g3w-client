<!--
  @file
  @since v3.7
-->

<template>
  <div id = "search-results" class = "queryresults-wrapper">

    <!-- QUERY RESULTS INFO -->
    <p
      v-if  = "info.message"
      style = "font-size: 1.1em;"
    >
      <i v-if = "info.icon" aria-hidden="true" :class = "$fa(info.icon)"></i>
      <b> {{ info.message }} </b>
    </p>

    <div class = "queryresults-container">
      <ul
        v-if  = "state.queried_layers.length && hasLayers"
        class = "queryresults"
        id    = "queryresults"
        style = "position: relative"
      >
        <li
          v-for = "layer in state.queried_layers.filter(l => showLayer(l))"
        >
          <bar-loader :loading = "layer.loading"/>
          <div class = "box box-primary">
            <div
              class           = "box-header with-border"
              :class          = "{'mobile': isMobile()}"
              @mouseover.stop = "!isMobile() && highlightLayer(layer, { zoom: false, highlight: true, duration: Infinity })"
              @mouseout.stop  = "!isMobile() && highlightLayer(layer, { zoom: false, highlight: false })"
              @click.stop     = "collapseSidebar"
            >
              <button
                class = "btn-box-tool btn-collapser skin-color-dark fas fa-caret-down"
                type  = "button"
                style = "font-weight: 900; font-size: 1.75rem;border: none; margin-left: 5px;"
                title = "Enlarge / Reduce"
              ></button>
              
              <!-- LAYER NAME -->
              <div
                class  = "box-title query-layer-title"
                :style = "{ fontSize: isMobile() && '1em !important' }"
              >
                <!-- OPEN ATTRIBUTE TABLE -->
                <button
                  v-if           = "!layer.external"
                  type           = "button"
                  @click.stop    = "openAttributeTable(layer)"
                  class          = "action-button"
                  title          = "Open Attribute Table"
                  data-placement = "left"
                >
                  <i aria-hidden="true" class="fas fa-list-alt"></i>
                </button>
                {{ layer.title }}
                <span v-if = "!layer.rawdata">
                  ({{
                    canPaginate(layer)
                      ? (layer.features.length + ((state.query.pagination[layer.id].current - 1) * state.query.pagination.getData.params[layer.id].page_size)) + ' - ' + state.query.pagination[layer.id].count
                      : layer.features.length
                  }})
                </span>
              </div>

              <!-- LAYER ACTIONS -->
              <div style = "display: flex; gap: 2.5px; padding-right: 10px;">
                <!-- INFO FORMATS -->
                <select
                  v-if      = "(layer.infoformats || []).length"
                  class     = "form-control"
                  @change   = "changeInfoFormat(layer, $event.target.value)"
                  :disabled = "layer.loading"
                >
                  <option
                    v-for     = "format in layer.infoformats"
                    :key      = "format"
                    :value    = "format"
                    :selected = "format === layer.infoformat"
                  >
                    {{ format }}
                  </option>
                </select>

                <!-- ZOOM TO LAYER -->
                <button
                  v-if           = "layer.hasgeometry"
                  type           = "button"
                  @click.stop    = "zoomToLayer(layer)"
                  class          = "action-button"
                  title          = "Zoom to features extent"
                  data-placement = "top"
                >
                  <i aria-hidden="true" class="fas fa-map-marker-alt"></i>
                </button>

                <!-- PRINT LAYER -->
                <button
                  v-if           = "layer.atlas.length"
                  type           = "button"
                  @click.stop    = "printAtlas(layer)"
                  class          = "action-button"
                  title          = "Print Atlas"
                  data-placement = "top"
                  v-disabled     = "state.download"
                >
                  <i aria-hidden="true" class="fas fa-print"></i>
                </button>

                <!-- DOWNLOAD LAYER -->
                <button
                  v-if           = "(layer.downloads || []).filter(d => 'pdf' !== d).length > 0"
                  type           = "button"
                  @click.stop    = "showDownloadModal(layer)"
                  class          = "action-button"
                  :class         = "{ 'toggled': layer.downloadformats.active }"
                  title          = "Downloads"
                  data-placement = "top"
                  v-disabled     = "state.download"
                >
                  <i aria-hidden="true" class="fas fa-download"></i>
                </button>

                <!-- TOGGLE LAYER FEATURES -->
                <button
                  v-if           = "layer.external || (!layer.filter.active && layer.source && 'wms' !== layer.source.type && !(state.query && state.query.pagination))"
                  type           = "button"
                  @click.stop    = "addLayerFeaturesToResults(layer)"
                  class          = "action-button"
                  :class         = "{ 'toggled': layer.addfeaturesresults.active }"
                  title          = "Add/Remove features to results"
                  data-placement = "top"
                >
                  <i aria-hidden="true" class="fas fa-plus-square"></i>
                </button>

                <!-- TOGGLE LAYER SELECTION -->
                <button
                  v-if           = "canSelect(layer)"
                  type           = "button"
                  @click.stop    = "toggleSelection(layer)"
                  class          = "action-button"
                  title          = "Add/Remove Selection"
                  data-placement = "top"
                  :class         = "{ 'toggled': layer.selection.active && layer.features.every(f => f.selected) }"
                >
                  <i aria-hidden="true" class="fas fa-check-circle"></i>
                </button>

                <!-- TOGGLE LAYER FILTER -->
                <button
                  v-if           = "
                    !layer.external
                    && layer.selection.active
                    && !layer.filter.pagination
                    && layer.features.some(f => f.selected)
                  "
                  type           = "button"
                  @click.stop    = "toggleFilter(layer)"
                  class          = "action-button"
                  :class         = "{'toggled': layer.filter.active }"
                  title          = "Enable/Disable filter"
                  data-placement = "top"
                >
                  <i aria-hidden="true" class="fas fa-filter"></i>
                </button>

                <!-- SAVE LAYER FILTER -->
                <button
                  v-if           = "
                    !layer.external
                    && layer.selection.active
                    && state.logged
                    && layer.filter.active
                    && (null === layer.filter.current || layer.selection.active)
                  "
                  type           = "button"
                  @click.stop    = "saveFilter(layer)"
                  class          = "action-button"
                  title          = "Save Filter"
                  data-placement = "top"
                >
                  <i aria-hidden="true" class="fas fa-save"></i>
                </button>

              </div>
            </div>

            <!-- CUSTOM ACTIONS -->
            <div
              v-if   = "state.layeractiontool[layer.id].component"
              class  = "g3w-layer-action-tools with-border"
              style  = "padding: 5px"
              :class = "{'mobile': isMobile()}"
            >
              <component
                :is     = "state.layeractiontool[layer.id].component"
                :layer  = "layer"
                :config = "state.layeractiontool[layer.id].config"
              />
            </div>
            
            <!-- CUSTOM COMPONENTS -->
            <component
              v-for = "({component}) in getLayerCustomComponents(layer.id, 'layer', 'before')"
              :is   = "component"
              :layer = "layer"
            />

            <!-- PAGINATION -->
            <div
              v-if       = "state.query.pagination && state.query.pagination[layer.id] && state.query.pagination[layer.id].page_sizes.length > 1"
              id         = "g3w-queryresults-pagination"
              v-disabled = "layer.loading"
            >

              <!-- PAGE SIZE -->
              <select
                class   = "form-control"
                @change = "changePage(layer.id, 1, Number($event.target.value))"
                style   = "width: auto;"
              >
                <option
                  v-for  = "page in state.query.pagination[layer.id].page_sizes"
                  :key   = "page"
                  :value = "page"
                >{{ page }}</option>
              </select>

              <!-- PAGINATION BUTTONS -->
              <ul :disabled = "!layer.loading" style="display: flex; align-items: center;">

                <!-- GOTO: PREVIOUS PAGE -->
                <li>
                  <button
                    v-if        =  "state.query.pagination[layer.id].count > layer.features.length"
                    class       = "btn fas fa-angle-left"
                    :disabled   = "1 === state.query.pagination[layer.id].current"
                    @click.stop = "changePage(layer.id, state.query.pagination[layer.id].current - 1)"
                  ></button>
                </li>

                <!-- GOTO: FIRST PAGE -->
                <li>
                  <button
                    class       = "btn"
                    :class      = "{ 'skin-background-color': 1 === state.query.pagination[layer.id].current }"
                    v-disabled  = "layer.features.length === state.query.pagination[layer.id].count"
                    @click.stop = "changePage(layer.id, 1)"
                  >1</button>
                </li>

                <!-- ELLIPSIS SEPARATOR -->
                <li
                  v-if = "state.query.pagination[layer.id].count > layer.features.length && state.query.pagination[layer.id].pages > 4 && state.query.pagination[layer.id].current > 2"
                >…</li>

                <li>
                  <template v-if = "state.query.pagination[layer.id].pages > 1 && state.query.pagination[layer.id].count > layer.features.length">
                    <button
                      v-for = "page in (
                      (state.query.pagination[layer.id].pages < 4 || state.query.pagination[layer.id].current < 3)
                        ? Array.from(Array(state.query.pagination[layer.id].pages - 2).keys()).slice(0, 2).map(i => i + 2)
                        : (state.query.pagination[layer.id].pages - state.query.pagination[layer.id].current) > 2
                        ? [state.query.pagination[layer.id].current, state.query.pagination[layer.id].current + 1 ]
                        : [state.query.pagination[layer.id].pages - 2, state.query.pagination[layer.id].pages - 1 ]
                      )"
                      class       = "btn"
                      :class      = "{ 'skin-background-color': page === state.query.pagination[layer.id].current }"
                      @click.stop = "changePage(layer.id, page)"
                    >{{ page }}
                    </button>
                  </template>
                </li>

                <!-- ELLIPSIS SEPARATOR -->
                <li
                  v-if = "state.query.pagination[layer.id].count > layer.features.length && state.query.pagination[layer.id].pages > 4 && (state.query.pagination[layer.id].current < state.query.pagination[layer.id].pages - 2)"
                >…</li>

                <!-- GOTO: LAST PAGE  -->
                <li>
                  <button
                    v-if        = "state.query.pagination[layer.id].count > layer.features.length && state.query.pagination[layer.id].pages > 1"
                    class       = "btn"
                    :class      = "{ 'skin-background-color': state.query.pagination[layer.id].pages === state.query.pagination[layer.id].current }"
                    @click.stop = "changePage(layer.id, state.query.pagination[layer.id].pages)"
                  >
                    {{ state.query.pagination[layer.id].pages }}
                  </button>
                </li>

                <!-- GOTO: NEXT PAGE -->
                <li>
                  <button
                    v-if        = "state.query.pagination[layer.id].count > layer.features.length"
                    :disabled   = "state.query.pagination[layer.id].pages === state.query.pagination[layer.id].current"
                    class       = "btn fas fa-angle-right"
                    @click.stop = "changePage(layer.id, state.query.pagination[layer.id].current + 1)"
                  ></button>
                </li>

              </ul>
            </div>

            <div class = "box-body" :class = "{'mobile': isMobile()}">

              <!-- LAYER WITH RAW DATA -->
              <div
                v-if   = "layer.rawdata"
                class  = "queryresults-text-html"
                :class = "{ text: layer.infoformat === 'text/plain' }"
                v-html = "layer.rawdata"
              ></div>

              <table v-else class = "table" :class = "{'mobile': isMobile()}">
                <tbody v-for = "(feature, index) in layer.features.filter(f => showFeature(layer, f))" :key = "feature.id">

                  <!-- ORIGINAL SOURCE: src/components/QueryResultsHeaderFeatureActionsBody.vue@v4.0.0 -->
                  <tr
                    @mouseover.stop = "feature.geometry && trigger({ id: 'highlightgeometry'}, layer, feature, index)"
                    @mouseout.stop  = "feature.geometry && trigger({ id: 'clearHighlightGeometry'}, layer, feature, index)"
                    class           = "featurebox-header"
                  >
                    <!-- ORIGINAL SOURCE: src/components/QueryResultsActions.vue@v4.0.0 -->
                    <td
                      v-if     = "state.layersactions[layer.id].length > 0"
                      style    = "padding: 3px"
                      class    = "g3w-feature-actions"
                      :colspan = "getColSpan(layer)"
                    >
                      <!-- ORIGINAL SOURCE: src/components/QueryResultsActions.vue@v4.0.0 -->
                      <button
                        v-for                     = "action in state.layersactions[layer.id].filter(action => initAction({ action, layer, feature, index }))" 
                        type                      = "button"
                        :key                      = "action.id"
                        v-if                      = "(action.state && action.state.show) || true"
                        @contextmenu.prevent.stop = ""
                        @click.stop               = "trigger(action, layer, feature, index)"
                        :class                    = "{'toggled': (action.state || {}).toggled && action.state.toggled[index], 'disabled' :state.download || !!(action.state || {}).disabled } "
                        class                     = "action-button"
                        :title                    = "action.hint"
                        data-placement            = "top"
                      >
                        <i
                          aria-hidden = "true"
                          style       = "padding: 2px;"
                          :style      = "action.style"
                          :class      = "(action.class || '')"
                        ></i>
                      </button>
                    </td>
                  </tr>

                  <tr class = "g3w-feature-result-action-tools">
                    <td
                      v-if     = "state.currentactiontools[layer.id][index]"
                      :colspan = "getColSpan(layer)"
                    >
                      <component
                        :is           = "state.currentactiontools[layer.id][index]"
                        :colspan      = "getColSpan(layer)"
                        :layer        = "layer"
                        :feature      = "feature"
                        :featureIndex = "index"
                        :config       = "state.actiontools[state.currentactiontools[layer.id][index].name][layer.id]"
                      />
                    </td>
                  </tr>

                  <tr
                    v-if  = "!hasLayerOneFeature(layer)"
                    style = "font-weight: bold; text-align: center"
                  >
                    <td
                      v-for = "(attribute, index) in attributesSubset(layer)"
                      class = "centered"
                    >
                      {{ getLayerFeatureBox(layer, feature).collapsed ? attribute.label : '' }}
                    </td>
                    <td
                      @click.stop = "toggleFeatureBoxAndZoom(layer,feature)"
                      class       = "collapsed"
                      style       = "text-align: end"
                      :class      = "{noAttributes: attributesSubset(layer).length === 0}"
                    >
                      <span
                        title  = "Enlarge / Reduce"
                        class  = "fa link morelink skin-color"
                        :class = "getLayerFeatureBox(layer, feature).collapsed  ? 'fas fa-plus': 'fas fa-minus'"
                      ></span>
                    </td>
                  </tr>

                  <!-- ORIGINAL SOURCE: src/components/QueryResultsHeaderFeatureBody.vue@v4.0.0 -->
                  <tr
                    v-if = "!hasLayerOneFeature(layer) && getLayerFeatureBox(layer, feature).collapsed"
                  >
                    <td v-for = "attribute in attributesSubset(layer)" class = "attribute">
                      <i
                        v-if        = "isLink(getLayerField({layer, feature, fieldName: attribute.name}))"
                        class       = "skin-color fas fa-link"
                        aria-hidden = "true"
                      ></i>

                      <g3w-image
                        v-else-if = "isPhoto(getLayerField({layer, feature, fieldName: attribute.name})) || isImage(getLayerField({layer, feature, fieldName: attribute.name}))"
                        :state    = "getLayerField({layer, feature, fieldName: attribute.name})"
                      />

                      <span v-else v-html = "feature.attributes[attribute.name]"></span>
                    </td>
                    <td v-if="!hasLayerOneFeature(layer)"></td>
                  </tr>

                  <tr v-for = "({component}) in getLayerCustomComponents(layer.id, 'feature', 'before')">
                    <td :colspan = "getColSpan(layer)">
                      <component
                        :class   = "hasFormStructure(layer) ? '': 'box-body'"
                        :is      = "component"
                        :layer   = "layer"
                        :feature = "feature"
                      />
                    </td>
                  </tr>

                  <tr
                    v-show = "!collapsedFeatureBox(layer,feature) || hasLayerOneFeature(layer)"
                    :id    = "`${layer.id}_${index}`"
                    class  = "featurebox-body"
                  >
                    <td
                      :colspan              = "getColSpan(layer)"
                      :feature-html-content = "`${layer.id}_${index}`"
                    >
                      <!-- LAYER WITH A FORM STRUCTURE -->
                      <!-- @since v3.10.0  Reference to content of feature html response -->
                      <tabs
                        v-if     = "hasFormStructure(layer)"
                        :fields  = "getQueryFields(layer, feature)"
                        :layerid = "layer.id"
                        :feature = "feature"
                        :tabs    = "getLayerFormStructure(layer)"
                      />

                      <!-- SIMPLE LAYER WITH NO STRUCTURE -->  
                      <table v-else class = "feature_attributes">
                        <template v-for = "attribute in layer.attributes.filter(attribute => attribute.show)">
                          <template v-if = "isJSON(getLayerField({layer, feature, fieldName: attribute.name}))">
                            <!-- DUMP JSON objects (MAX 2 NESTING LEVELS) -->
                            <template v-for = "(v, k) in getLayerField({layer, feature, fieldName: attribute.name}).value">
                              <tr v-for = "(v2, k2) in ('object' === typeof v ? v : { [k]: v })" style = "padding-top:10px; padding-bottom:10px;">
                                <td class = "attr-label">{{ attribute.label }}.<template v-if = "('object' === typeof v)">{{ k }}.</template>{{ k2 }}</td>
                                <td class = "attr-value">{{ v2 }}</td>
                              </tr>
                            </template>
                          </template>
                          <tr v-else>
                            <td class = "attr-label">{{ attribute.label }}</td>
                            <!-- ORIGINAL SOURCE: src/components/QueryResultsTableAttributeFieldValue.vue@v4.0.0 -->
                            <td class = "attr-value" :attribute = "attribute.name">
                              <g3w-vue   v-if      = "isVue(getLayerField({    layer, feature, fieldName: attribute.name}))" :feature = "feature" :state = "getLayerField({ layer, feature, fieldName: attribute.name })" />
                              <span      v-else-if = "isSimple(getLayerField({ layer, feature, fieldName: attribute.name}))" v-html = "getLayerField({ layer, feature, fieldName: attribute.name }).value"></span>
                              <g3w-image v-else-if = "isPhoto(getLayerField({  layer, feature, fieldName: attribute.name}))" :state = "getLayerField({ layer, feature, fieldName: attribute.name })" />
                              <g3w-image v-else-if = "isImage(getLayerField({  layer, feature, fieldName: attribute.name}))" :state = "getLayerField({ layer, feature, fieldName: attribute.name })" />
                              <g3w-link  v-else-if = "isLink(getLayerField({   layer, feature, fieldName: attribute.name}))" :state = "{ value: getLayerField({ layer, feature, fieldName: attribute.name }).value }" />
                            </td>
                          </tr>
                        </template>
                      </table>

                    </td>
                  </tr>

                  <tr v-for = "({component}) in getLayerCustomComponents(layer.id, 'feature', 'after')">
                    <td colspan = "getColSpan(layer)">
                      <component
                        :class   = "hasFormStructure(layer) ? '': 'box-body'"
                        :is      = "component"
                        :layer   = "layer"
                        :feature = "feature"/>
                    </td>
                  </tr>

                </tbody>
              </table>

            </div>
            <div
              v-for  = "({component}) in getLayerCustomComponents(layer.id, 'layer', 'after')"
              class  = "box-body"
              :class = "{'mobile': isMobile()}"
            >
              <component :is = "component" :layer = "layer"/>
            </div>
          </div>
        </li>
        <li v-for = "component in state.components">
          <component :is = "component" @showresults="showResults()" />
        </li>
      </ul>
      <!--   NO RESULTS   -->
      <div
        v-else-if  = "!state.queried_layers.length && state.changed"
        class = "query-results-not-found"
      >
        <h4
          class = "skin-color"
          style = "font-weight: bold; text-align: center"
          v-t   = "'info.no_results'">
        </h4>
      </div>

    </div>

    <!-- TODO: SHOW SELECTED LAYER -->
    <div v-if = "state.query" style="visibility: hidden; position: sticky; bottom: -8px; background: #eee; padding: 8px 0; display: flex; gap: 1em;">
      <label style="margin-top: 5px;">{{ $t('Filter by:') }}</label>
      <select style="flex: 1;">
        <option v-for = "layer in queryableLayers" :selected = "layer === selectedLayer">{{ layer.getName() }}</option>
        <option :selected = "!selectedLayer">{{ $t('mapcontrols.queryby.all') }}</option>
      </select>
    </div>

  </div>
</template>

<script>
  import ApplicationState         from 'g3w-state';
  import { fieldsMixin }          from 'mixins';
  import Link                     from 'components/FieldLink.vue';
  import VueField                 from 'components/FieldVue.vue';
  import Image                    from 'components/FieldImage.vue'
  import { toRawType }            from 'utils/toRawType';
  import { throttle }             from 'utils/throttle';
  import { getCatalogLayerById }  from 'utils/getCatalogLayerById';
  import { downloadFeatures }     from 'utils/downloadFeatures';
  import GUI                      from 'g3w-app';
  import { Layer }                from 'g3w-layer';
  import { getAlphanumericProps } from 'utils/getAlphanumericProps';
  
  const HEADERTYPESFIELD = [
    'varchar',
    'integer',
    'float',
    'bigint', //@since v3.9
    'date',
  ];

  export default {

    /** @since 3.8.6 */
    name: 'queryresults',

    data() {
      return {
        state:                       ApplicationState,
        headerExpandActionCellWidth: 10,
        headerActionsCellWidth:      10,
        /** @since 4.1.0 */
        proxied_layers:              [],
      }
    },

    mixins: [fieldsMixin],

    components: {
      'g3w-link':  Link,
      'g3w-vue':   VueField,
      'g3w-image': Image,
    },

    computed: {

      onelayerresult() {
        return 1 === this.state.queried_layers.length;
      },

      hasLayers() {
        return this.hasResults || this.state?.components?.length > 0;
      },

      hasResults() {
        return this.state.queried_layers.length > 0;
      },

      /**
       * @typedef QueryResultsInfo
       * 
       * @property { string | null }     icon
       * @property { string | null }     message
       */
      /**
       * @returns { QueryResultsInfo } query info
       */
      info() {
        const precision = 'degrees' === GUI.getMapUnits() ? 4 : 2;

        if ('coordinates' === this.state?.query?.type) {
          return {
            icon:    'marker',
            message: `  ${this.state.query.coordinates[0].toFixed(precision)}, ${this.state.query.coordinates[1].toFixed(precision)}`
          };
        }

        if ('bbox' === this.state?.query?.type) {
          return {
            icon:    'square',
            message: `  [${this.state.query.bbox.map(c => c.toFixed(precision)).join(' , ')}]`
          };
        }

        if ('circle' === this.state?.query?.type) {
          return {
            icon:    'empty-circle',
            message: ' ',
          };
        }

        if (['polygon', 'drawpolygon'].includes(this.state?.query?.type)) {
          return {
            icon: 'draw',
            message: 
              this.state.query.layerName
              ? `${this.state.query.layerName} ${undefined !== this.state.query.fid ? ` - Feature Id: ${this.state.query.fid}` : ''}` // <Feature ID>:   when polygon feature comes from a Feature layer
              : ' '                                                                                                                   // <empty string>: when polygon feature comes from a Drawed layer (temporary layer)
          };
        }

        return { icon: null, message: null };
      },

      queryableLayers() {
        return Object.values(ApplicationState.layers)
          .flatMap(s => s.isQueryable() ? s.getLayers() : [])
          .filter(l => l.isGeoLayer() && l.isQueryable());
      },

      selectedLayer() {
        return GUI.getSelectedLayer();
      },

    },

    methods: {

      /**
       * @returns { boolean } whether can paginate layer results
       */
      canPaginate(layer) {
        return !!this.state?.query?.pagination?.[layer.id]?.paginate;
      },

      /**
       * @returns { boolean } whether can show "add to select" action
       */
      canSelect(layer) {
        return (
          !layer.filter.active //@since 4.0.4 In case of filter active, doen't show select action
          && GUI.getService('queryresults').getActionLayerById({ layer, id: 'selection' })
          && (!this.canPaginate(layer) || (layer.selection.active && layer.filter.active))
        );
      },

      /**
       * @param { Object } layer
       * 
       * @return { boolean } whether layer need to be show on query result list
       * 
       * @since 3.9.1
       */
      showLayer(layer) {
        return (
          layer.show &&                    // check if is set show
          (
            layer?.features?.length > 0 // whether has at least one feature
            || layer.rawdata            // whether has rawdata
            || layer?.infoformats?.length > 0 // whether has info formats (eg. external wms layer)
          )
        )
      },

      /**
       * @param { string }              id //layer id
       * @param { 'feature' | 'layer' } type
       * @param { 'before' | 'after' }  position
       */
      getLayerCustomComponents(id, type, position) {
        return this.state?.layerscustomcomponents?.[id]?.[type]?.[position] || [];
      },

      getLayerField({ layer, feature, fieldName }) {
        return {
          ...layer.attributes.find(a => fieldName === a.name), // layer field
          label: null,                                         // hide label in query result (dom table value content)
          value: Array.isArray(feature.attributes[fieldName]) ? feature.attributes[fieldName].join(',') : feature.attributes[fieldName],
        };
      },

      getQueryFields(layer, feature) {
        const fields = [];
        for (const field of layer.formStructure.fields) {
          const _field = {
            ...field,
            query: true,
            //@since 4.1.0 support array value https://github.com/g3w-suite/g3w-client-plugin-editing/issues/186
            value: feature.attributes[field.name] ?? feature.attributes[field.name.replace(/ /g,"_")],
          };
          _field.input = { type: `${this.getFieldType(_field)}` };
          fields.push(_field);
        }
        return fields;
      },

      getColSpan(layer) {
        return this.attributesSubset(layer).length + (!this.hasLayerOneFeature(layer)*1);
      },

      addLayerFeaturesToResults(layer) {
        GUI.addLayerFeaturesToResultsAction(layer);
      },

      printAtlas(layer) {
        GUI.printAtlas(layer);
      },

      showDownloadModal(layer) {
        downloadFeatures({
          layer,
          features:          layer.features,
          down_with_polygon: 'polygon' === this.state.query.type && `${ this.state.query.fid }`,
          filter: this.state.query?.pagination?.getData?.params?.[layer.id] && {
            ...('search' === this.state.query.type 
              ? { field: this.state.query?.pagination?.getData?.params?.[layer.id]?.filter } 
              : this.state.query?.pagination?.getData?.params?.[layer.id]?.download 
            ),
          },
        });
      },

      hasLayerOneFeature(layer) {
        return 1 === layer.features.length;
      },

      /**
       * @param layer
       *
       * @since 3.9.0
       */
      saveFilter(layer) {
        getCatalogLayerById(layer.id).saveFilter();
      },

      async toggleFilter(layer) {
        await getCatalogLayerById(layer.id).toggleToken();
      },

      hasFormStructure(layer) {
        return !!layer.formStructure;
      },

      async toggleSelection(layer) {
        await GUI.toggleSelection(layer);
      },

      attributesSubset(layer) {
        let attributes;
        
        // extract attributes from first tab of form structure layers
        if (this.hasFormStructure(layer)) {
          const attrs = new Set();
          const traverse = item => {
            if (item.nodes) {
              item.nodes.forEach(n => traverse(n));
            } else {
              let field = layer.formStructure.fields.find(f => item.field_name === f.name);
              if (field) {
                if ('ows'=== this.state.type) {
                  // clone it to avoid replacing original
                  field = { ...field };
                  field.name = field.name.replace(/ /g, '_');
                }
                attrs.add(field);
              }
            }
          };
          (layer.formStructure.structure || []).forEach(struct => traverse(struct));
          attributes = Array.from(attrs);
        } else {
          attributes = layer.attributes;
        }
        const _attributes = attributes.filter(a => a.show && HEADERTYPESFIELD.includes(a.type));
        // TODO: find a clever way to handle geocoding results..
        const end = Math.min(/*'__g3w_marker' === layer.id ? 0 :*/ layer.max_preview_fields, attributes.length);
        return _attributes.slice(0, end);
      },

      getLayerFormStructure(layer) {
        return layer.formStructure.structure.map(n => Vue.observable(structuredClone(n))); // clone deep + set reactive with Vue.observable
      },

      getLayerFeatureBox(layer, feature, relation_index) {
        const boxid = GUI.getBoxId(layer, feature, relation_index);
        if (undefined === this.state.layersFeaturesBoxes[boxid] ) {
          this.state.layersFeaturesBoxes[boxid] = Vue.observable({ collapsed: true });
          this.state.layersFeaturesBoxes[boxid].collapsed = layer.features.length > 1;
        }
        return this.state.layersFeaturesBoxes[boxid];
      },

      // to CHECK NOT GOOD
      collapsedFeatureBox(layer, feature, relation_index) {
        return this.state.layersFeaturesBoxes[GUI.getBoxId(layer, feature, relation_index)]?.collapsed ?? true;
      },

      showFeatureInfo(layer, boxid) {
        GUI.emit('show-query-feature-info', {
          layer,
          tabs: this.hasFormStructure(layer),
          show: !((this.state.layersFeaturesBoxes[boxid] ?? { collapsed: true }).collapsed),
        });
      },

      /**
       * Show only features that have show true and in case of active filter, only selected
       * 
       * @since 3.11.8
       */
      showFeature(layer, feature) {
        return GUI.showFeature(layer, feature);
      },

      async toggleFeatureBox(layer, feature, relation_index) {
        const boxid = GUI.getBoxId(layer, feature, relation_index);
        this.state.layersFeaturesBoxes[boxid].collapsed = !this.state.layersFeaturesBoxes[boxid].collapsed;
        await this.$nextTick();
        this.showFeatureInfo(layer, boxid);
      },

      toggleFeatureBoxAndZoom(layer, feature, relation_index) {
        if (!this.hasLayerOneFeature(layer)) {
          this.toggleFeatureBox(layer, feature, relation_index);
        }
      },

      async trigger(action, layer, feature, index) {
        //In case of action is disbled do nothing
        if (state.download || !!(action.state || {}).disabled) {
          return;
        }
        
        if (action.opened && 'none' === document.getElementById(`${layer.id}_${index}`)?.style?.display) {
          this.toggleFeatureBox(layer, feature);
          await this.$nextTick();
        }
        if ('highlightgeometry' === action.id) {
          GUI.highlight(layer, feature, index);
        }
        if ('clearHighlightGeometry' === action.id) {
          GUI.highlight(false);
        }
        const _action = layer && GUI.getActionLayerById({ layer, id: action.id });
        if (_action?.cbk) {
          await _action.cbk(layer, feature, _action, index, $(`#${layer.id}_${index} > td`));
        }
      },

      openLink(link_url) {
        window.open(link_url, '_blank');
      },

      /**
       * @since 3.9.0
       */
       isJSON(field) {
        return !this.isVue(field) && this.isSimple(field) && 'Object' === toRawType(field.value);
      },

      /**
       * @since 3.10.0
       */
      openAttributeTable(layer) {
        getCatalogLayerById(layer.id).openAttributeTable({ perc: 100 });
      },

      /**
       * Highlight all features of layer
       *
       * @param layer
       * @param opts
       *
       * @since 4.1.0
       */
      highlightLayer(layer, opts = {}) {
        if (layer.hasgeometry) {
          const features = (layer.features || []).filter(f => GUI.showFeature(layer, f));
          const async    = document.querySelector('#g3w-view-content')?.classList?.contains?.('full-size');
          GUI.once('asyncFnc.todo', () => {
            let type, geometry;
            const coordinates = features
              .map(f => f.getGeometry ? f.getGeometry() : f.geometry)
              .map(geom => {
                type = type ? type : (geom instanceof ol.geom.Geometry) ? geom.getType() : geom.type;
                return geom?.getCoordinates?.() ?? geom.coordinates;
              });
            // whether features have geometry
            if (coordinates.length > 0) {
              try {
                geometry = new ol.geom[type.includes('Multi') ? type : `Multi${type}`](type.includes('Multi') ? coordinates.flat(): coordinates);
              } catch(e) {
                console.warn(e);
              }
            }
            GUI.highlight(geometry, opts);
          });
          if (!async) {
            GUI.emit('asyncFnc.todo');
          }
        }
      },

      /**
       * @since 3.11.0
       */
      collapseSidebar(e) {
        const box       = e.target.closest(".box");
        const collapsed = box.classList.contains('collapsed-box');
        box.classList.toggle('collapsed-box');
        box.querySelector(".btn-collapser").classList.toggle('fa-caret-right', !collapsed);
        box.querySelector(".btn-collapser").classList.add('fa-caret-down', collapsed);
      },

      /**
       * @param { number } id    layer id
       * @param { number } page  page number
       * @param { number } size  features per page
       */
      async changePage(id, page, size) {
        const { query, queried_layers } = this.state;
        const index                     = queried_layers.findIndex(l => id === l.id);
        queried_layers[index].loading   = true;
        GUI.disableContent(true);

        try {
          // set current features count shown by selection 
          if (undefined !== size) {
            query.pagination[id].current_sizes = size;
          }

          const page_size = query.pagination[id].current_sizes;

          // remove "autofilter" parameter (on first request)
          if (query.autofilter && query.pagination[id].paginate) {
            query.autofilter = false;
            Object.keys(query.pagination.getData.params).forEach(id => delete query.pagination.getData.params[id].autofilter);
          }

          // set page size
          if (page_size) {
            query.pagination.getData.params[id].page_size = page_size;
          }

          // get config from getData object
          const layer           = query.pagination[id].layer;

          // whehter layer has filter
          const has_filtertoken = !!layer.getToken();

          if ('search' === query.type) {
            query.pagination.getData.params[id].field = this.state.query?.pagination?.getData?.params?.[id]?.filter;
          }
          const data = await layer[query.pagination.getData.method]({ ...query.pagination.getData.params[id], page });
          
          // set response data
          GUI.setQueryResponse(
            { ...data, query },
            { add: false, update: true }
          );

          Object.assign(query.pagination[id], {
            paginate: data.count > (data.data || [])[0].features.length, // paginate in base of change amount of features request changing select value on query result
            pages:    Math.ceil(data.count / page_size),                 // new number of pages
            current:  page,                                              // current page
          });

          // set filter pagination in case of all features are get from pagination
          queried_layers[index].filter.pagination  = queried_layers[index].filter.active && query.pagination[id].paginate;

          const page_size_change                   = layer.state.selection.active || has_filtertoken ;

          // get selection action
          const action = this.state.layersactions[layer.getId()].find(({ id }) => 'selection' === id);

          queried_layers[index].features.forEach((f, i) => {
            if (page_size_change && !f.selected && f.geometry && layer.isGeoLayer()) {
              GUI.toggleSelection(queried_layers[index], f, 'paginate');
            }
            f.selected              = page_size_change;
            action.state.toggled[i] = page_size_change;
          });

          layer.state.filter.active    = page_size_change;
          layer.state.selection.active = page_size_change;

          // zoom to features when layer has geometry
          if (queried_layers[index].hasgeometry) {
            this.highlightLayer(queried_layers[index], { zoom: false });
          }
        } catch(e) {
          console.warn(e);
        }

        GUI.disableContent(false);
        queried_layers[index].loading = false;
      },

      /**
       * @since 4.1.0 
       */
      async changeInfoFormat(layer, contenttype) {
        layer.loading = true;
        try {
          const catalog_layer = getCatalogLayerById(layer.id);

          if (!this.proxied_layers.includes(catalog_layer)) {
            this.proxied_layers.push(catalog_layer);
          }
          
          const response      = await catalog_layer.fetchProxyData('wms', { changes: {
            headers: { 'Content-Type': contenttype },
            params:  { INFO_FORMAT:    contenttype }
          }});

          layer.infoformat = contenttype;

          catalog_layer.setInfoFormat(layer.infoformat);

          const [data] = Layer._parse(contenttype, { layers: [catalog_layer], response });

          // parse as raw data
          if (!data.features) {
            layer.features.splice(0);
            await this.$nextTick();
            layer.rawdata = data.rawdata;
          }

          // parse data
          if (data.features) {
            layer.rawdata = null;
            data.features.forEach(f => {
              const feature = {
                id:         f instanceof ol.Feature ? f.getId()         : f.id,
                attributes: f instanceof ol.Feature ? f.getProperties() : f.properties,
                geometry:   f instanceof ol.Feature ? f.getGeometry()   : f.geometry,
                show:       true,
              };
              // raw data (html) → set attributes to visualize it on result
              if (0 === layer.attributes.length) {
                layer.hasgeometry = !!feature.geometry;
                GUI.setActionsForLayers([layer]);
                getAlphanumericProps(feature.attributes).forEach(name => layer.attributes.push({ name, label: name, show: true }));
              }
              layer.features.push(feature);
            });
          }
        } catch(e) {
          console.warn(e);
        }
        layer.loading = false;
      },

      /**@since 4.1.0 */
      async initAction({ action, layer, feature, index } = {}) {
        let show = true;

        //check if action has condition to show action button in feature box header
        if ('function' === typeof action.condition) {
          show = await action.condition({ layer, feature });
        }

        show = show && (undefined === (action.state || {}).show ? show : action.state.show);

        //check if has init function 
        if (show && action.init) {
          action.init({ layer, feature, index, action });
        }

        //check if action has clear function to clear action state and store it in clear_actions array to be cleared on component destroy
        if (show && 'function' === typeof action.clear) {
          this.clear_actions.push(() => action.clear({ action, layer, feature }));
        }

        return show;
      }, 
    },

    watch: {

      async 'state.queried_layers'(queried_layers = []) {
        queried_layers.forEach(layer => {
          if (layer.attributes.length <= layer.max_preview_fields && !layer.hasImageField) {
            layer.expandable = false;
          }
          layer.features.forEach(feature => {
            this.getLayerFeatureBox(layer, feature);
            if (feature.attributes.relations) {
              feature.attributes.relations
                .forEach(relation => {
                  relation.elements
                    .forEach((_, index) => this.state.layersFeaturesBoxes[`${layer.id}_${feature.id}_${relation.name}${index}`] = { collapsed: true });
                })
            }
          })
        });

        // check if is a single result layer and if it has one feature
        if (this.onelayerresult && this.hasLayerOneFeature(queried_layers[0])) {
          const layer   = queried_layers[0];
          const boxid   = GUI.getBoxId(layer, layer.features[0]);
          GUI.onceafter('postRender', () => this.showFeatureInfo(layer, boxid));
        }
        requestAnimationFrame(() => GUI.postRender(this.$el));
        await this.$nextTick();
      },

      onelayerresult(bool) {
        if (bool && !this.state.query?.pagination?.[this.state.queried_layers[0].id]?.paginate && !this.state.queried_layers[0].filter.active) {
          let type, geometry;
          const coordinates = this.state.queried_layers[0].features
            .map(f => f.getGeometry ? f.getGeometry() : f.geometry)
            .map(geom => {
              type = type ? type : (geom instanceof ol.geom.Geometry) ? geom.getType() : geom?.type;
              return geom?.getCoordinates?.() ?? geom?.coordinates;
            })
            .filter(c => c); //filter geometry valid

          //check if features have geometry
          if (coordinates.length > 0) {
            try {
              geometry = new ol.geom[type.includes('Multi') ? type : `Multi${type}`](type.includes('Multi') ? coordinates.flat(): coordinates);
            } catch(e) {
              console.warn(e);
            }
          }
          GUI.highlightGeometry(geometry, { duration: Infinity, zoom: false });
        }
      }

    },

    created() {
      this.zoomToLayer   = throttle(l => GUI.zoomToLayer(l));
      this.clear_actions = [];
    },
    
    beforeDestroy() {
      this.proxied_layers.forEach(l => l?.clearProxyData?.('wms'));
      this.clear_actions.forEach(clear => clear());
      this.proxied_layers = [];
      this.clear_actions  = [];
    },

    destroyed() {
      GUI.clear();
    },

  };
</script>

<style scoped>
.noAttributes {
  display: flex;
  justify-content: flex-end;
}
.g3w-feature-actions {
  padding: 3px;
  background-color: rgba(34, 45, 50, 0.1) !important;
}
.feature_attributes tr {
  line-height: 1.8em;
}
.featurebox-body + tr {
  border-top: 2px groove #000;
}
#g3w-queryresults-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  flex-wrap: wrap;
  margin-left: 10px;
}
#g3w-queryresults-pagination > ul > li > * {
  background-color: transparent;
  margin: 2px;
  font-weight: bold;
  font-size: 0.8em;
}
.action-button.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>