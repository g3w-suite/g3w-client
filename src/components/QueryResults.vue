<!--
  @file
  @since v3.7
-->

<template>
  <div id = "search-results" class = "queryresults-wrapper">
    <div
      v-if  = "info.message"
      class = "skin-color"
      style = "font-weight: bold; margin-bottom: 3px; font-size: 1.1em;"
    >
      <span
        v-if   = "info.icon"
        :class = "g3wtemplate.getFontClass(info.icon)">
      </span>
      <span> {{ info.message }} </span>
    </div>
    <div class = "queryresults-container">
      <template v-if = "state.layers.length">
        <ul
          v-if  = "hasLayers"
          class = "queryresults"
          id    = "queryresults"
          style = "position: relative"
        >
          <li
            v-for = "(layer, index) in state.layers.filter(l => showLayer(l))"
          >
            <bar-loader :loading = "layer.loading"/>
            <div class = "box box-primary">
              <div
                class            = "box-header with-border"
                :class           = "{'mobile': isMobile()}"
                @mouseover.stop  = "!isMobile() && highLightLayerFeatures(layer, { highlight: true, duration: Infinity })"
                @mouseout.stop   = "!isMobile() && highLightLayerFeatures(layer, { highlight: false })"
                @click.stop      = "collapseSidebar"
              >
                <div
                  class  = "box-title query-layer-title"
                  :style = "{fontSize: isMobile() && '1em !important'}">
                  <span
                    v-if             = "!layer.external"
                    @click.stop      = "openAttributeTable(layer)"
                    class            = "action-button"
                    v-t-tooltip:left = "'Open Attribute Table'"
                  >
                    <span
                      class  = "action-button-icon"
                      :class = "g3wtemplate.getFontClass('list')"
                    ></span>
                  </span>
                  {{ layer.title }}
                  <span v-if = "!layer.rawdata">
                    ({{
                      canPaginate(layer)
                        ? (layer.features.length + ((state.query.pagination.current.at(index) - 1) * state.query.pagination.getData.params.at(index).page_size)) + ' - ' + state.query.pagination.counts[index]
                        : layer.features.length
                    }})
                  </span>
                </div>
                <div
                  class       = "box-features-action"
                  @click.stop = ""
                >
                  <!-- info format layer component -->
                  <infoformats :layer = "layer"/>
                  <template v-if = "layer.features.length > 0">
                    <span
                      v-if             = "layer.hasgeometry"
                      @click.stop      = "zoomToLayerFeaturesExtent(layer)"
                       class           = "action-button"
                      v-t-tooltip:top = "'Zoom to features extent'"
                    >
                      <span
                        class  = "action-button-icon"
                        :class = "g3wtemplate.getFontClass('marker')">
                      </span>
                    </span>
                    <span
                      v-if             = "layer.atlas.length"
                      @click.stop      = "printAtlas(layer)"
                      class            = "action-button"
                      v-t-tooltip:left = "'Print Atlas'"
                      v-disabled       = "ApplicationState.download"
                    >
                      <span
                        class  = "action-button-icon"
                        :class = "g3wtemplate.getFontClass('print')">
                      </span>
                    </span>
                    <!--        DOWNLOAD        -->
                    <template v-if = "getLayerDownloads(layer.downloads).length > 0">
                      <span
                        class            = "action-button"
                        :class           = "{'toggled': layer.downloadformats.active}"
                        v-t-tooltip:left = "'Downloads'"
                        v-disabled       = "ApplicationState.download"
                      >
                        <span
                          class       = "action-button-icon"
                          :class      = "g3wtemplate.getFontClass('download')"
                          @click.stop = "showLayerDownloadFormats(layer)"
                        ></span>
                      </span>
                    </template>
                    <!--        END DOWNLOAD        -->
                  </template>
                  <span
                    v-if             = "layer.external || (!layer.filter.active && layer.source && 'wms' !== layer.source.type && !(state.query && state.query.pagination))"
                    @click.stop      = "addLayerFeaturesToResults(layer)"
                    class            = "action-button"
                    :class           = "{'toggled': layer.addfeaturesresults.active}"
                    v-t-tooltip:left = "'Add/Remove features to results'"
                  >
                    <span
                      class  = "action-button-icon"
                      :class = "g3wtemplate.getFontClass('plus-square')"
                    ></span>
                  </span>

                  <!-- TOGGLE LAYER SELECTION -->
                  <span
                    v-if             = "canSelect(layer)"
                    @click.stop      = "toggleSelection(layer)"
                    class            = "action-button"
                    v-t-tooltip:left = "'Add/Remove Selection'"
                    :class           = "{'toggled': layer.selection.active && layer.features.every(f => f.selection.selected)}"
                  >
                    <span
                      class  = "action-button-icon"
                      :class = "g3wtemplate.getFontClass('success')"
                    ></span>
                  </span>

                  <!-- Filter template tools -->
                  <template v-if = "!layer.external && layer.selection.active">
                    <span
                      v-if             = "!layer.filter.pagination && layer.features.some(f => f.selection.selected)"
                      @click.stop      = "addRemoveFilter(layer)"
                      class            = "action-button"
                      :class           = "{'toggled': layer.filter.active}"
                      v-t-tooltip:left = "'Enable/Disable filter'"
                    >
                      <span
                        class  = "action-button-icon"
                        :class = "g3wtemplate.getFontClass('filter')"
                      ></span>
                    </span>
                    <!-- @since 3.9 add save -->
                    <span
                      v-if                    = "
                        state.logged
                        && layer.filter.active
                        && (null === layer.filter.current || layer.selection.active)
                      "
                      @click.stop      = "saveFilter(layer)"
                      class            = "action-button"
                      v-t-tooltip:left = "'Save Filter'"
                    >
                      <span
                        class  = "action-button-icon"
                        :class = "g3wtemplate.getFontClass('save')"
                      ></span>
                    </span>
                  </template>

                </div>
                <button
                  class          = "btn btn-box-tool"
                  style          = "pointer-events: none;"
                >
                  <i
                    class  = "btn-collapser skin-color"
                    :class = "g3wtemplate.font['minus']">
                  </i>
                </button>
              </div>
              <template v-if = "state.layeractiontool[layer.id].component">
                <div
                  class  = "g3w-layer-action-tools with-border"
                  style  = "padding: 5px"
                  :class = "{'mobile': isMobile()}">
                  <component
                    :is     = "state.layeractiontool[layer.id].component"
                    :layer  = "layer"
                    :config = "state.layeractiontool[layer.id].config"/>
                </div>
              </template>
              <!--     Add Custom layer components      -->
              <component
                v-for = "({component}) in getLayerCustomComponents(layer.id, 'layer', 'before')"
                :is   = "component"
                :layer = "layer"/>
              <!--   End custom layer component         -->

              <!-- PAGINATION -->
              <div
                v-if       = "state.query.pagination && state.query.pagination.page_sizes[index].length > 1"
                id         = "g3w-queryresults-pagination"
                v-disabled = "layer.loading"
              >

                <!-- PAGE SIZE -->
                <select
                  class   = "form-control"
                  @change = "changePage(index, 1, Number($event.target.value))"
                  style   = "width: auto;"
                >
                  <option
                    v-for  = "page in state.query.pagination.page_sizes[index]"
                    :key   = "page"
                    :value = "page"
                  >{{ page }}</option>
                </select>

                <!-- PAGINATION BUTTONS -->
                <ul :disabled ="!layer.loading" style="display: flex; align-items: center;">

                  <!-- GOTO: PREVIOUS PAGE -->
                  <li>
                    <button
                      v-if        =  "state.query.pagination.counts[index] > layer.features.length"
                      class       = "btn fas fa-angle-left"
                      :disabled   = "1 === state.query.pagination.current[index]"
                      @click.stop = "changePage(index, state.query.pagination.current[index] - 1)"
                    ></button>
                  </li>

                  <!-- GOTO: FIRST PAGE -->
                  <li>
                    <button
                      class       = "btn"
                      :class      = "{ 'skin-background-color': 1 === state.query.pagination.current[index] }"
                      v-disabled  = "layer.features.length === state.query.pagination.counts[index]"
                      @click.stop = "changePage(index, 1)"
                    >1</button>
                  </li>

                  <!-- ELLIPSIS SEPARATOR -->
                  <li
                    v-if = "state.query.pagination.counts[index] > layer.features.length && state.query.pagination.pages[index] > 4 && state.query.pagination.current[index] > 2"
                  >…</li>

                  <li>
                    <template v-if = "state.query.pagination.pages[index] > 1 && state.query.pagination.counts[index] > layer.features.length">
                      <button
                        v-for= "page in (
                        (state.query.pagination.pages[index] < 4 || state.query.pagination.current[index] < 3)
                          ? Array.from(Array(state.query.pagination.pages[index] - 2).keys()).slice(0, 2).map(i => i + 2)
                          : (state.query.pagination.pages[index] - state.query.pagination.current[index]) > 2
                          ? [state.query.pagination.current[index], state.query.pagination.current[index] + 1 ]
                          : [state.query.pagination.pages[index] - 2, state.query.pagination.pages[index] - 1 ]
                        )"
                        class       = "btn"
                        :class      = "{ 'skin-background-color': page === state.query.pagination.current[index]  }"
                        @click.stop = "changePage(index, page)"
                      >{{ page }}
                      </button>
                    </template>
                  </li>

                  <!-- ELLIPSIS SEPARATOR -->
                  <li
                    v-if = "state.query.pagination.counts[index] > layer.features.length && state.query.pagination.pages[index] > 4 && (state.query.pagination.current[index] < state.query.pagination.pages[index] - 2)"
                  >…</li>

                  <!-- GOTO: LAST PAGE  -->
                  <li>
                    <button
                      v-if        = "state.query.pagination.counts[index] > layer.features.length && state.query.pagination.pages[index] > 1"
                      class       = "btn"
                      :class      = "{ 'skin-background-color': state.query.pagination.pages[index] === state.query.pagination.current[index]  }"
                      @click.stop = "changePage(index, state.query.pagination.pages[index])"
                    >
                      {{ state.query.pagination.pages[index] }}
                    </button>
                  </li>

                  <!-- GOTO: NEXT PAGE -->
                  <li>
                    <button
                      v-if="state.query.pagination.counts[index] > layer.features.length"
                      :disabled   = "state.query.pagination.pages[index] === state.query.pagination.current[index]"
                      class       = "btn fas fa-angle-right"
                      @click.stop = "changePage(index, state.query.pagination.current[index] + 1)"
                    ></button>
                  </li>

                </ul>
              </div>

              <div class = "box-body" :class = "{'mobile': isMobile()}">
                <template v-if = "layer.rawdata">
                  <div
                    class  = "queryresults-text-html"
                    :class = "{text: layer.infoformat === 'text/plain'}"
                    v-html = "layer.rawdata">
                  </div>
                </template>
                <!-- CASE FORM STRUCTURE LAYER-->
                <template v-else-if = "hasFormStructure(layer)">
                  <table class = "table" :class = "{'mobile': isMobile()}">
                    <tbody v-for = "(feature, index) in layer.features.filter(f => showFeature(layer, f))" :key  = "feature.id"> 
                      <header-feature-actions-body
                        :colspan                 = "getColSpan(layer)"
                        :actions                 = "state.layersactions[layer.id]"
                        :layer                   = "layer"
                        :feature                 = "feature"
                        :index                   = "index"
                        :onelayerresult          = "onelayerresult"
                        :trigger                 = "trigger"
                        :toggleFeatureBoxAndZoom = "toggleFeatureBoxAndZoom"
                        :hasLayerOneFeature      = "hasLayerOneFeature"
                        :boxLayerFeature         = "getLayerFeatureBox(layer, feature)"
                        :attributesSubset        = "attributesSubset"
                        :getLayerField           = "getLayerField"/>
                        <tr class = "g3w-feature-result-action-tools">
                          <template v-if = "state.currentactiontools[layer.id][index]">
                            <td :colspan = "getColSpan(layer)">
                              <component
                                :is           = "state.currentactiontools[layer.id][index]"
                                :colspan      = "getColSpan(layer)"
                                :layer        = "layer"
                                :feature      = "feature"
                                :featureIndex = "index"
                                :config       = "state.actiontools[state.currentactiontools[layer.id][index].name][layer.id]"
                              />
                            </td>
                          </template>
                        </tr>
                        <tr
                          v-if  = "!hasLayerOneFeature(layer)"
                          style = "font-weight: bold; text-align: center" >
                          <td
                            v-for = "(attribute, index) in attributesSubset(layer)"
                            class = "centered"
                          >
                            {{getLayerFeatureBox(layer, feature).collapsed ? attribute.label : ''}}
                          </td>
                          <td
                            @click.stop = "toggleFeatureBoxAndZoom(layer,feature)"
                            class       = "collapsed"
                            style       = "text-align: end"
                            :class      = "{noAttributes: attributesSubset(layer).length === 0}">
                            <span
                              class  = "fa link morelink skin-color"
                              :class = "g3wtemplate.font[getLayerFeatureBox(layer, feature).collapsed  ? 'plus': 'minus']">
                            </span>
                          </td>
                        </tr>
                      <header-feature-body
                        v-if = "!hasLayerOneFeature(layer) && getLayerFeatureBox(layer, feature).collapsed"
                        :actions                 = "state.layersactions[layer.id]"
                        :layer                   = "layer"
                        :feature                 = "feature"
                        :index                   = "index"
                        :onelayerresult          = "onelayerresult"
                        :trigger                 = "trigger"
                        :toggleFeatureBoxAndZoom = "toggleFeatureBoxAndZoom"
                        :hasLayerOneFeature      = "hasLayerOneFeature"
                        :boxLayerFeature         = "getLayerFeatureBox(layer, feature)"
                        :attributesSubset        = "attributesSubset"
                        :getLayerField           = "getLayerField"/>
                      <tr v-for = "({component}) in getLayerCustomComponents(layer.id, 'feature', 'before')">
                        <td :colspan = "getColSpan(layer)">
                          <component
                            :is      = "component"
                            :layer   = "layer"
                            :feature = "feature"/>
                        </td>
                      </tr>
                      <tr
                        v-show = "!collapsedFeatureBox(layer,feature) || hasOneLayerAndOneFeature(layer)"
                        :id    = "`${layer.id}_${index}`"
                        class  = "featurebox-body"
                      >
                        <td
                          :colspan              = "getColSpan(layer)"
                          :feature-html-content = "`${layer.id}_${index}`"
                        > <!-- @since v3.10.0  Reference to content of feature html response -->
                          <tabs
                            :fields  = "getQueryFields(layer, feature)"
                            :layerid = "layer.id"
                            :feature = "feature"
                            :tabs    = "getLayerFormStructure(layer)"/>
                        </td>
                      </tr>
                      <tr v-for = "({component}) in getLayerCustomComponents(layer.id, 'feature', 'after')">
                        <td :colspan = "getColSpan(layer)">
                          <component
                            :is      = "component"
                            :layer   = "layer"
                            :feature = "feature"/>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </template>
                <template v-else>
                  <!-- CASE SIMPLE LAYER WITH NO STRUCTURE -->
                  <table class = "table" :class = "{'mobile': isMobile()}">
                    <tbody v-for = "(feature, index) in layer.features.filter(f => showFeature(layer, f))" :key  = "feature.id">
                      <header-feature-actions-body
                        :colspan                 = "getColSpan(layer)"
                        :actions                 = "state.layersactions[layer.id]"
                        :layer                   = "layer"
                        :feature                 = "feature"
                        :index                   = "index"
                        :onelayerresult          = "onelayerresult"
                        :trigger                 = "trigger"
                        :toggleFeatureBoxAndZoom = "toggleFeatureBoxAndZoom"
                        :hasLayerOneFeature      = "hasLayerOneFeature"
                        :boxLayerFeature         = "getLayerFeatureBox(layer, feature)"
                        :attributesSubset        = "attributesSubset"
                        :getLayerField           = "getLayerField"/>
                      <tr class = "g3w-feature-result-action-tools">
                        <template v-if = "state.currentactiontools[layer.id][index]">
                          <td :colspan = "getColSpan(layer)">
                            <component
                              :is           = "state.currentactiontools[layer.id][index]"
                              :colspan      = "getColSpan(layer)"
                              :layer        = "layer"
                              :feature      = "feature"
                              :featureIndex = "index"
                              :config       = "state.actiontools[state.currentactiontools[layer.id][index].name][layer.id]"/>
                            </td>
                        </template>
                      </tr>
                      <tr
                        v-if  = "!hasLayerOneFeature(layer)"
                        style = "font-weight: bold; text-align: center" >
                        <td
                          v-for = "(attribute, index) in attributesSubset(layer)"
                          class = "centered"
                        >
                          {{getLayerFeatureBox(layer, feature).collapsed ? attribute.label : ''}}
                        </td>
                        <td
                          @click.stop = "toggleFeatureBoxAndZoom(layer,feature)"
                          class       = "collapsed"
                          style       = "text-align: end"
                          :class      = "{ noAttributes: 0 === attributesSubset(layer).length }">
                            <span
                              class  = "fa link morelink skin-color"
                              :class = "g3wtemplate.font[getLayerFeatureBox(layer, feature).collapsed ? 'plus': 'minus']">
                            </span>
                        </td>
                      </tr>
                      <header-feature-body
                        v-if = "!hasLayerOneFeature(layer) && getLayerFeatureBox(layer, feature).collapsed"
                        :actions                 = "state.layersactions[layer.id]"
                        :layer                   = "layer"
                        :feature                 = "feature"
                        :index                   = "index"
                        :onelayerresult          = "onelayerresult"
                        :trigger                 = "trigger"
                        :toggleFeatureBoxAndZoom = "toggleFeatureBoxAndZoom"
                        :hasLayerOneFeature      = "hasLayerOneFeature"
                        :boxLayerFeature         = "getLayerFeatureBox(layer, feature)"
                        :attributesSubset        = "attributesSubset"
                        :getLayerField           = "getLayerField"/>
                      <tr v-for = "({component}) in getLayerCustomComponents(layer.id, 'feature', 'before')">
                        <td :colspan = "getColSpan(layer)">
                          <component
                            class    = "box-body"
                            :is      = "component"
                            :layer   = "layer"
                            :feature = "feature"/>
                        </td>
                      </tr>
                      <tr
                        v-show = "!collapsedFeatureBox(layer,feature) || hasOneLayerAndOneFeature(layer)"
                        :id    = "`${layer.id}_${index}`"
                        class  = "featurebox-body"
                      >
                        <td
                          :colspan              = "getColSpan(layer)"
                          :feature-html-content = "`${layer.id}_${index}`"
                        ><!--@since v3.10.0  Reference to content of feature html response-->
                          <table class = "feature_attributes">
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
                                <td class = "attr-value" :attribute = "attribute.name">
                                  <table-attribute-field-value
                                    :feature = "feature"
                                    :field   = "getLayerField({layer, feature, fieldName: attribute.name})"
                                  />
                                </td>
                              </tr>
                            </template>
                          </table>
                        </td>
                      </tr>
                      <tr v-for = "({component}) in getLayerCustomComponents(layer.id, 'feature', 'after')">
                        <td colspan = "getColSpan(layer)">
                          <component
                            class    = "box-body"
                            :is      = "component"
                            :layer   = "layer"
                            :feature = "feature"/>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </template>
              </div>
              <div
                v-for  = "({component}) in getLayerCustomComponents(layer.id, 'layer', 'after')"
                class  = "box-body"
                :class = "{'mobile': isMobile()}" >
                <component :is = "component" :layer = "layer"/>
              </div>
            </div>
          </li>
          <li v-for = "component in state.components">
            <component :is = "component" @showresults="showResults()" />
          </li>
        </ul>
      </template>
      <!--   NO RESULTS   -->
      <template v-else>
        <div
          v-if  = "state.changed"
          class = "query-results-not-found"
        >
          <h4
            class = "skin-color"
            style = "font-weight: bold; text-align: center"
            v-t   = "'info.no_results'">
          </h4>
        </div>
      </template>

    </div>

    <!-- TODO: SHOW SELECTED LAYER -->
    <div v-if = "state.query" style="visibility: hidden; position: sticky; bottom: -8px; background: #eee; padding: 8px 0; display: flex; gap: 1em;">
      <label style="margin-top: 5px;">{{ $t('Filter by:') }}</label>
      <select style="flex: 1;">
        <option v-for="layer in queryableLayers" :selected ="layer === selectedLayer">{{ layer.getName() }}</option>
        <option :selected="!selectedLayer">{{ $t('mapcontrols.queryby.all') }}</option>
      </select>
    </div>

  </div>
</template>

<script>
  import { G3W_FID }                 from 'g3w-constants';
  import ApplicationState            from 'store/application';
  import { fieldsMixin }             from 'mixins';
  import TableAttributeFieldValue    from 'components/QueryResultsTableAttributeFieldValue.vue';
  import InfoFormats                 from 'components/QueryResultsActionInfoFormats.vue';
  import HeaderFeatureBody           from 'components/QueryResultsHeaderFeatureBody.vue';
  import HeaderFeatureActionsBody    from "components/QueryResultsHeaderFeatureActionsBody.vue";
  import { toRawType }               from 'utils/toRawType';
  import { throttle }                from 'utils/throttle';
  import { getCatalogLayerById }     from 'utils/getCatalogLayerById';
  import { getMapLayersByFilter }    from 'utils/getMapLayersByFilter';
  import { downloadFeatures }        from 'utils/downloadFeatures';
  import { showDownloadFormats }     from 'utils/downloadFeatures';
  import GUI                         from 'services/gui';
  
  const headerExpandActionCellWidth = 10;
  const headerActionsCellWidth      = 10;
  const HEADERTYPESFIELD            = [
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
        /** @since 4.0.0 */
        ApplicationState,
        state:                       this.$options.service.state,
        headerExpandActionCellWidth: headerExpandActionCellWidth,
        headerActionsCellWidth:      headerActionsCellWidth,
      }
    },
    mixins: [fieldsMixin],
    components: {
      TableAttributeFieldValue,
      'infoformats':         InfoFormats,
      'header-feature-body': HeaderFeatureBody,
      HeaderFeatureActionsBody
    },
    computed: {
      onelayerresult() {
        return 1 === this.state.layers.length;
      },
      hasLayers() {
        return this.hasResults || !!this.state.components.length;
      },
      hasResults() {
        return this.state.layers.length > 0;
      },

      /**
       * @typedef QueryResultsInfo
       * 
       * @property { string | null }     icon
       * @property { string | null }     message
       * @property { (() => {}) | null } action
       */
      /**
       * @returns {QueryResultsInfo} query info
       */
      info() {
        if (this.state.query) {
          const query         = this.state.query;
          //@since 3.8.1 coordinates show only four decimal numbers
          //In case of map units degrees, show four decimal numbers otherwise, meter, show only two decimal numbers
          const decimalNumber = 'degrees' === GUI.getService('map').getMapUnits() ? 4 : 2;
          switch (query.type) {
            case 'coordinates':
              return {
                icon:    'marker',
                message: `  ${query.coordinates[0].toFixed(decimalNumber)}, ${query.coordinates[1].toFixed(decimalNumber)}`
              };
            case 'bbox':
              return {
                icon:    'square',
                message: `  [${query.bbox.map(c => c.toFixed(decimalNumber)).join(' , ')}]`
              };
            case 'polygon':
            case 'drawpolygon':
              return {
                icon: 'draw',
                message: (query.layerName) ?
                  `${query.layerName} ${undefined !== query.fid ? ` - Feature Id: ${query.fid}` : ''}` // <Feature ID>:   when polygon feature comes from a Feature layer
                  : ' '                                                                                         // <empty string>: when polygon feature comes from a Drawed layer (temporary layer)
              };
              case 'circle':
                return {
                  icon: 'empty-circle',
                  message: ' ',                                                                                     // <empty string>: when polygon feature comes from a Drawed layer (temporary layer)
                };
            default:
              console.warn(`Unsupported query type:  ${query.type}`);
              break;
          }
        } else if (this.state.search) {
          /** @FIXME missing implementation? */
        }

        return { icon: null, message: null };

      },

      queryableLayers() {
        return getMapLayersByFilter({ QUERYABLE: true });
      },

      selectedLayer() {
        return GUI.getService('map').getSelectedLayer();
      },

    },
    methods: {

      /**
       * @returns { boolean } whether can paginate layer results
       */
      canPaginate(layer) {
        return !!(this.state.query && this.state.query.pagination && this.state.query.pagination.paginate[this.state.layers.findIndex(l => l == layer)]);
      },

      /**
       * @returns { boolean } whether can show "add to select" action
       */
      canSelect(layer) {
        return (
          !layer.filter.active //@since 4.0.4 In case of filter active, doen't show select action
          && GUI.getService('queryresults').getActionLayerById({ layer, id: 'selection' })
          && (!this.canPaginate(layer) || (layer.selection.active && layer.filter.active))
          && layer.features.length > 1
        );
      },

      /**
       * @since v3.10.0
       *
       * @param { Array.<string> } downloads
       *
       * return {Array} return array of download formats enable of layer features
       */
      getLayerDownloads(downloads = []) {
        return downloads.filter(d => 'pdf' !== d);
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
          layer.show &&                                                      // check if is set show
          (
            this.layerHasFeatures(layer) ||                                  // check if layer has at least one features
            layer.rawdata ||                                                 // check if layer has rawdata
            Array.isArray(layer.infoformats) && layer.infoformats.length > 0 // check if it has info formats (eg. external wms layer)
          )
        )
      },

      /**
       *
       * @param layerId
       * @param type feature or layer
       * @param position
       * @returns {*}
       */
      getLayerCustomComponents(layerId, type = 'feature', position = 'after') {
        return this.state.layerscustomcomponents[layerId]
          && this.state.layerscustomcomponents[layerId][type]
          && this.state.layerscustomcomponents[layerId][type][position]
          || [];
      },
      getLayerField({ layer, feature, fieldName }) {
        const layerField = layer.attributes.find(a => fieldName === a.name);
        return {
          ...layerField,
          label: null, // needed to hide label in query result dom table value content
          value: feature.attributes[fieldName]
        };
      },
      getQueryFields(layer, feature) {
        const fields = [];
        for (const field of layer.formStructure.fields) {
          const _field = { ...field };
          _field.query = true;
          _field.value = feature.attributes[field.name];
          _field.input = {
            type: `${this.getFieldType(_field)}`
          };
          fields.push(_field);
        }
        return fields;
      },
      getColSpan(layer) {
        return this.attributesSubsetLength(layer)+(!this.hasLayerOneFeature(layer)*1);
      },
      addLayerFeaturesToResults(layer) {
        this.$options.service.addLayerFeaturesToResultsAction(layer);
      },
      printAtlas(layer) {
        this.$options.service.printAtlas(layer);
      },
      showLayerDownloadFormats(layer) {
        showDownloadFormats(layer);
      },
      saveLayerResult(layer, type = "csv") {
        downloadFeatures(type, layer, layer.features);
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
      async addRemoveFilter(layer) {
        await getCatalogLayerById(layer.id).toggleFilterToken();
      },
      getContainerFromFeatureLayer({ layer, index } = {}) {
        return $(`#${layer.id}_${index} > td`);
      },
      hasOneLayerAndOneFeature(layer) {
        return this.hasLayerOneFeature(layer);
      },
      hasFormStructure(layer) {
        return !!layer.formStructure;
      },
      layerHasFeatures(layer) {
        return Array.isArray(layer.features) && layer.features.length > 0;
      },
      async toggleSelection(layer) {
        await this.$options.service.toggleSelection(layer);
      },
      extractAttributesFromFirstTabOfFormStructureLayers(layer) {
        const attributes = new Set();
        const traverseStructure = item => {
          if (item.nodes) {
            item.nodes.forEach(node => traverseStructure(node));
          } else {
            let field = layer.formStructure.fields.find(f => item.field_name === f.name);
            if (field) {
              if (this.state.type === 'ows') {
                // clone it to avoid replacing original
                field = {...field};
                field.name = field.name.replace(/ /g, '_');
              }
              attributes.add(field);
            }
          }
        };
        if (layer.formStructure.structure.length) {
          layer.formStructure.structure.forEach(structure => traverseStructure(structure));
        }
        return Array.from(attributes);
      },

      attributesSubset(layer) {
        const attributes = this.hasFormStructure(layer)
          ? this.extractAttributesFromFirstTabOfFormStructureLayers(layer)
          : layer.attributes;
        const _attributes = attributes.filter(attribute => attribute.show && HEADERTYPESFIELD.includes(attribute.type));
        // TODO: find a clever way to handle geocoding results..
        const end = Math.min(/*'__g3w_marker' === layer.id ? 0 :*/ layer.max_preview_fields, attributes.length);
        return _attributes.slice(0, end);
      },
      attributesSubsetLength(layer) {
        return this.attributesSubset(layer).length;
      },
      getLayerFormStructure(layer) {
        //need to clone structure objects in deep and set reactive with Vue.observable
        return layer.formStructure.structure.map(n => Vue.observable(structuredClone(n)));
      },
      getLayerFeatureBox(layer, feature, relation_index) {
        const boxid = this.getBoxId(layer, feature, relation_index);
        if (undefined === this.state.layersFeaturesBoxes[boxid] ) {
          this.state.layersFeaturesBoxes[boxid] = Vue.observable({
            collapsed: true
          });
          this.$watch(
            () => this.state.layersFeaturesBoxes[boxid].collapsed,
            collapsed => {
              const index     = layer.features.findIndex(_feature => feature.id === _feature.id);
              const container = this.getContainerFromFeatureLayer({ layer, index });
              this.$options.service.openCloseFeatureResult({ open:!collapsed, layer, feature, container })
            }
          );
          this.state.layersFeaturesBoxes[boxid].collapsed = layer.features.length > 1;
        }
        return this.state.layersFeaturesBoxes[boxid];
      },

      // to CHECK NOT GOOD
      collapsedFeatureBox(layer, feature, relation_index) {
        const box = this.state.layersFeaturesBoxes[this.getBoxId(layer, feature, relation_index)];
        return box ? box.collapsed : true;
      },

      showFeatureInfo(layer, boxid) {
        const box = this.state.layersFeaturesBoxes[boxid];
        this.$options.service.emit('show-query-feature-info', {
          layer,
          tabs: this.hasFormStructure(layer),
          show: box ? !box.collapsed : false,
        });
      },

      /**
       * @since 3.11.8
       * Show only features that have show true and in case of active filter, only selected 
       */
      showFeature(layer, feature) {
        return this.$options.service.showFeature(layer, feature);
      },
      getBoxId(layer, feature, relation_index) {
        return this.$options.service.getBoxId(layer, feature, relation_index);
      },
      async toggleFeatureBox(layer, feature, relation_index) {
        const boxid = this.getBoxId(layer, feature, relation_index);
        this.state.layersFeaturesBoxes[boxid].collapsed = !this.state.layersFeaturesBoxes[boxid].collapsed;
        await this.$nextTick();
        this.showFeatureInfo(layer, boxid);
      },
      toggleFeatureBoxAndZoom(layer, feature, relation_index) {
        if (!this.hasLayerOneFeature(layer)) { this.toggleFeatureBox(layer, feature, relation_index) }
      },
      async trigger(action,layer,feature, index) {
        if (action.opened && 'none' === $(`#${layer.id}_${index}`).css('display')) {
          this.toggleFeatureBox(layer, feature);
          await this.$nextTick();
        }
        await this.$options.service.trigger(action.id, layer,feature, index, this.getContainerFromFeatureLayer({ layer, index }));
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
       * @since 3.11.0
       */
      highLightLayerFeatures(layer, opts = { highlight: true }) {
        if (layer.hasgeometry) {
          this.$options.service.highLightLayerFeatures(layer, opts);
        }
      },

      /**
       * @since 3.11.0
       */
      collapseSidebar(e) {
        const box       = e.target.closest(".box");
        const collapsed = box.classList.contains('collapsed-box');
        box.classList.toggle('collapsed-box');
        box.querySelector(".btn-collapser").classList.toggle('fa-plus', !collapsed);
        box.querySelector(".btn-collapser").classList.add('fa-minus', collapsed);
      },

      /**
       * @param { number } index index of layer
       * @param { number } page  page number
       * @param { number } size  features per page
       */
      async changePage(index, page, size) {
        const { query, layers } = this.state;

        layers[index].loading = true;

        try {
          // set current features count shown by selection 
          if (undefined !== size) {
            query.pagination.current_sizes[index] = size;
          }

          const page_size = query.pagination.current_sizes[index];

          // remove "autofilter" parameter (on first request)
          if (query.autofilter && query.pagination.paginate[index]) {
            query.autofilter = false;
            query.pagination.getData.params.forEach(p => delete p.autofilter);
          }

          // set page size
          if (page_size) {
            query.pagination.getData.params[index].page_size = page_size;
          }

          // get config from getData object
          const { method, params } = query.pagination.getData;
          //@since 4.0.1 need to checck layer id of layer beacause can happend,
          // that order of this.state.layers is not equal to 
          const layer              = (query.pagination.getData.layers || []).find(l => layers[index].id === l.getId());

          // whehter layer has filter
          const has_filtertoken = !!layer.getFilterToken();

          // get layer pagination data
          const data = await layer[method]({ ...params[index], page });
          
          // set response data
          this.$options.service.setQueryResponse(
            { ...data, query },
            { add: false, update: true }
          );

          // set paginate base of change amount of features request changing select value on query result
          query.pagination.paginate[index] = data.count > (data.data || [])[0].features.length;

          // set new number of pages
          query.pagination.pages[index]    = Math.ceil(data.count / page_size);

          // set filter pagination in case of all features are get from pagination
          layers[index].filter.pagination  = layers[index].filter.active && query.pagination.paginate[index];

          // set the current page
          query.pagination.current[index]  = page;

          const page_size_change = layer.state.selection.active || has_filtertoken ;

          // get selection action
          const action = this.state.layersactions[layer.getId()].find(({ id }) => 'selection' === id);

          layers[index].features.forEach((f, i) => {
            if (page_size_change && !f.selection.selected && f.geometry && layer.isGeoLayer()) {
              const fid = layers[index].external ? f.id : (f.attributes[G3W_FID] || f.id);
              layer.addOlSelectionFeature({ id: fid, feature:f }).selected = true;
              layer.includeSelectionFid(fid, false);
            }
            f.selection.selected    = page_size_change;
            action.state.toggled[i] = page_size_change;
          });

          layer.state.filter.active    = page_size_change;
          layer.state.selection.active = page_size_change;

          // zoom to features when layer has geometry
          if (layers[index].hasgeometry) {
            this.$options.service.highLightLayerFeatures(layers[index]);
          }
        } catch(e) {
          console.warn(e);
        }

        layers[index].loading = false;
      },
    },

    watch: {
      async 'state.layers'(layers = []) {
        layers.forEach(layer => {
          if (layer.attributes.length <= layer.max_preview_fields && !layer.hasImageField) {
            layer.expandable = false;
          }
          layer.features.forEach(feature => {
            this.getLayerFeatureBox(layer, feature);
            if (feature.attributes.relations) {
              feature.attributes.relations
                .forEach(relation => {
                  relation.elements
                    .forEach((element, index) => this.state.layersFeaturesBoxes[`${layer.id}_${feature.id}_${relation.name}${index}`] = { collapsed: true });
                })
            }
          })
        });

        // check if is a single result layer and if it has one feature
        if (this.onelayerresult && this.hasLayerOneFeature(layers[0])) {
          const layer   = layers[0];
          const feature = layer.features[0];
          const boxid   = this.getBoxId(layer, feature);
          this.$options.service.onceafter('postRender', () => {
            this.showFeatureInfo(layer, boxid);
          });
        }
        requestAnimationFrame(() => this.$options.service.postRender(this.$el));
        await this.$nextTick();
      },
      onelayerresult(bool) {
        if (bool && !this.state.query.pagination?.paginate?.at(0) && !this.state.layers[0].filter.active) {
          GUI.getService('map').highlightFeatures(this.state.layers[0].features, { duration: Infinity });
        }
      }
    },
    created() {
      //PUT HERE THROTTLED FUNCTION
      this.zoomToLayerFeaturesExtent = throttle(layer => {
        this.$options.service.zoomToLayerFeaturesExtent(layer);
      })
    },
    destroyed() {
      this.$options.service.clear();
    }
  };
</script>

<style scoped>
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
</style>