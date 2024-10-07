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
            v-show = "showLayer(layer)"
            v-for = "layer in state.layers"
          >
            <bar-loader :loading = "layer.loading"/>
            <div class = "box box-primary">
              <div
                class      = "box-header with-border"
                :class     = "{'mobile': isMobile()}"
                @mouseover = "highLightLayerFeatures(layer, { highlight: true, duration: Infinity })"
                @mouseout  = "highLightLayerFeatures(layer, { highlight: false })"
                @click     = "collapseSidebar"
              >
                <div
                  class  = "box-title query-layer-title"
                  :style = "{fontSize: isMobile() && '1em !important'}">
                  <span
                    v-if                    = "!layer.external"
                    @click.stop             = "openAttributeTable(layer)"
                    class                   = "action-button"
                    v-t-tooltip:left.create = "'catalog_items.contextmenu.open_attribute_table'"
                  >
                    <span
                      class  = "action-button-icon"
                      :class = "g3wtemplate.getFontClass('list')"
                    ></span>
                  </span>
                  {{ layer.title }}
                  <span
                    v-show = "!layer.rawdata"
                    class  = "query-layer-feature-count">({{ layer.features.length }})</span>
                </div>
                <div
                  class       = "box-features-action"
                  @click.stop = ""
                >
                  <!-- info format layer component -->
                  <infoformats :layer = "layer"/>
                  <template v-if = "layer.features.length > 1">
                    <span
                      v-if                    = "layer.hasgeometry"
                      @click.stop             = "zoomToLayerFeaturesExtent(layer)"
                       class                  = "action-button"
                      v-t-tooltip:left.create = "'sdk.mapcontrols.query.actions.zoom_to_features_extent.hint'"
                    >
                      <span
                        class  = "action-button-icon"
                        :class = "g3wtemplate.getFontClass('marker')">
                      </span>
                    </span>
                    <span
                      v-if                    = "layer.atlas.length"
                      @click.stop             = "printAtlas(layer)"
                      class                   = "action-button"
                      v-t-tooltip:left.create = "'sdk.mapcontrols.query.actions.atlas.hint'"
                      v-download
                    >
                      <span
                        class  = "action-button-icon"
                        :class = "g3wtemplate.getFontClass('print')">
                      </span>
                    </span>
                    <!--        DOWNLOAD        -->
                    <template v-if = "1 === getLayerDownloads(layer.downloads).length ">
                      <span
                        class                   = "action-button"
                        :class                  = "{'toggled': layer.downloadformats.active}"
                        v-t-tooltip:left.create = "`sdk.mapcontrols.query.actions.download_features_${layer.downloads[0]}.hint`"
                        v-download
                      >
                        <span
                          class       = "action-button-icon"
                          :class      = "g3wtemplate.getFontClass('download')"
                          @click.stop = "saveLayerResult(layer, getLayerDownloads(layer.downloads)[0])"
                        ></span>
                      </span>
                    </template>
                    <template v-else-if = "getLayerDownloads(layer.downloads).length > 1">
                      <span
                        class                   = "action-button"
                        :class                  = "{'toggled': layer.downloadformats.active}"
                        v-t-tooltip:left.create = "'Downloads'"
                        v-download
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
                    v-if                    = "layer.external || (layer.source && 'wms' !== layer.source.type )"
                    @click.stop             = "addLayerFeaturesToResults(layer)"
                    class                   = "action-button"
                    :class                  = "{'toggled': layer.addfeaturesresults.active}"
                    v-t-tooltip:left.create = "'sdk.mapcontrols.query.actions.add_features_to_results.hint'"
                  >
                    <span
                      class  = "action-button-icon"
                      :class = "g3wtemplate.getFontClass('plus-square')"
                    ></span>
                  </span>
                  <span
                    v-if                    = "
                      layer.toc &&
                      layer.id !== '__g3w_marker' &&
                      layer.features.length > 1 &&
                      (layer.external || (layer.source && layer.source.type !== 'wms'))
                    "
                    @click.stop             = "addToSelection(layer)"
                    class                   = "action-button skin-tooltip-left"
                    v-t-tooltip:left.create = "'sdk.mapcontrols.query.actions.add_selection.hint'"
                    :class                  = "{'toggled': layer.selection.active}"
                  >
                    <span
                      class  = "action-button-icon"
                      :class = "g3wtemplate.getFontClass('success')"
                    ></span>
                  </span>
                  <!-- Filter template tools -->
                  <template v-if = "!layer.external && layer.selection.active">
                    <span
                      @click.stop             = "addRemoveFilter(layer)"
                      class                   = "action-button skin-tooltip-left"
                      :class                  = "{'toggled': layer.filter.active}"
                      v-t-tooltip:left.create = "'layer_selection_filter.tools.filter'"
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
                      @click.stop             = "saveFilter(layer)"
                      class                   = "action-button skin-tooltip-left"
                      v-t-tooltip:left.create = "'layer_selection_filter.tools.savefilter'"
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
                    <tbody>
                      <template v-if = "feature.show" v-for = "(feature, index) in layer.features">
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
                        <tr
                          v-for = "({component}) in getLayerCustomComponents(layer.id, 'feature', 'after')"
                        >
                          <td :colspan = "getColSpan(layer)">
                            <component
                              :is      = "component"
                              :layer   = "layer"
                              :feature = "feature"/>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </template>
                <template v-else>
                  <!-- CASE SIMPLE LAYER WITH NO STRUCTURE -->
                  <table class = "table" :class = "{'mobile': isMobile()}">
                    <tbody
                      v-if  = "feature.show"
                      v-for = "(feature, index) in layer.features"
                      :key  = "feature.id"
                    >
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
                        v-if="!hasLayerOneFeature(layer) && getLayerFeatureBox(layer, feature).collapsed"
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
                    <tbody v-else></tbody>
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
  </div>
</template>

<script>
  import { fieldsMixin }             from 'mixins';
  import TableAttributeFieldValue    from 'components/QueryResultsTableAttributeFieldValue.vue';
  import InfoFormats                 from 'components/QueryResultsActionInfoFormats.vue';
  import HeaderFeatureBody           from 'components/QueryResultsHeaderFeatureBody.vue';
  import HeaderFeatureActionsBody    from "components/QueryResultsHeaderFeatureActionsBody.vue";
  import { toRawType }               from 'utils/toRawType';
  import { throttle }                from 'utils/throttle';
  import { getCatalogLayerById }     from 'utils/getCatalogLayerById';
  import GUI                         from 'services/gui';

  const MAX_SUBSET_LENGTH           = 3;
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

      }

    },
    methods: {

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
        this.$options.service.showLayerDownloadFormats(layer)
      },
      saveLayerResult(layer, type="csv") {
        this.$options.service.downloadFeatures(type, layer, layer.features);
      },
      hasLayerOneFeature(layer) {
        return layer.features.length === 1;
      },

      /**
       * @param layer
       *
       * @since 3.9.0
       */
      saveFilter(layer) {
        getCatalogLayerById(layer.id).saveFilter();
      },

      addRemoveFilter(layer) {
        getCatalogLayerById(layer.id).toggleFilterToken();
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
      addToSelection(layer) {
        this.$options.service.addToSelection(layer);
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
        const end = Math.min(/*'__g3w_marker' === layer.id ? 0 :*/ MAX_SUBSET_LENGTH, attributes.length);
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

    },

    watch: {
      async 'state.layers'(layers = []) {
        layers.forEach(layer => {
          if (layer.attributes.length <= MAX_SUBSET_LENGTH && !layer.hasImageField) {
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
        if (bool) {
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
</style>