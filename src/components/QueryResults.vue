<!--
  @file
  @since v3.7
-->

<template>
  <div
    id    = "search-results"
    class = "queryresults-wrapper"
  >

    <div
      v-if  = "info.message"
      class = "query-results-info-message skin-color"
    >
      <span
        v-if   = "info.icon"
        class  = "action-button skin-tooltip-bottom"
        :class = "g3wtemplate.getFontClass(info.icon)"
      ></span>
      <span>{{info.message}}</span>
    </div>

    <div class="queryresults-container">

      <div v-if="!state.layers.length && state.changed" class="query-results-not-found">
          <h4 class="skin-color" v-t="'info.no_results'"></h4>
      </div>

      <ul
        v-if  = "state.layers.length && hasLayers"
        class = "queryresults"
        id    = "queryresults"
      >
        <li
          v-for  = "layer in state.layers"
          v-show = "showLayer(layer)"
        >
          <bar-loader :loading="layer.loading" />

          <div class="box box-primary">
            <div
              class       = "box-header with-border"
              :class      = "{ 'mobile': isMobile()}"
              data-widget = "collapse"
            >

              <div
                class  = "box-title query-layer-title"
                :style = "{fontSize: isMobile() && '1em !important'}"
                >{{ layer.title }}
                <span class="query-layer-feature-count" v-show="!layer.rawdata">({{layer.features.length}})</span>
              </div>

              <div class="box-features-action" @click.stop="">

                <!-- LAYER INFO FORMATS -->
                <infoformats :layer="layer"/>

                <!-- ZOOM TO FEATURES -->
                <span
                  v-if                    = "layer.features.length > 1 && layer.hasgeometry"
                  @click.stop             = "zoomToLayerFeaturesExtent(layer)"
                  class                   = "action-button"
                  v-t-tooltip:left.create = "'sdk.mapcontrols.query.actions.zoom_to_features_extent.hint'"
                >
                  <span class="action-button-icon" :class="g3wtemplate.getFontClass('marker')"></span>
                </span>

                <!-- PRINT ATLAS -->
                <span
                  v-if                    = "layer.features.length > 1 && layer.atlas.length"
                  @click.stop             = "printAtlas(layer)"
                  class                   = "action-button"
                  v-t-tooltip:left.create = "'sdk.mapcontrols.query.actions.atlas.hint'"
                  v-download
                >
                  <span class="action-button-icon" :class="g3wtemplate.getFontClass('print')"></span>
                </span>

                <!-- DOWNLOAD LAYER -->
                <span
                  v-if                    = "layer.features.length > 1 && layer.downloads.length === 1"
                  class                   = "action-button"
                  :class                  = "{ 'toggled': layer[layer.downloads[0]].active }"
                  v-t-tooltip:left.create = "`sdk.mapcontrols.query.actions.download_features_${layer.downloads[0]}.hint`"
                  v-download
                >
                  <span class="action-button-icon" :class="g3wtemplate.getFontClass('download')" @click.stop="saveLayerResult(layer, layer.downloads[0])"></span>
                </span>

                <!-- DOWNLOAD LAYER (MULTIPLE FORMATS) -->
                <span
                  v-if="layer.features.length > 1 && layer.downloads.length > 1" 
                  class="action-button"
                  :class="{ 'toggled': layer.downloadformats.active }"
                  v-t-tooltip:left.create="'Downloads'"
                  v-download
                >
                  <span class="action-button-icon" :class="g3wtemplate.getFontClass('download')" @click.stop="showLayerDownloadFormats(layer)"></span>
                </span>

                <!-- ADD FEATURES TO RESULTS -->
                <span
                  v-if                    = "layer.external || (layer.source && 'wms' !== layer.source.type)"
                  @click.stop             = "addLayerFeaturesToResults(layer)"
                  class                   = "action-button"
                  :class                  = "{ 'toggled': layer.addfeaturesresults.active }"
                  v-t-tooltip:left.create = "'sdk.mapcontrols.query.actions.add_features_to_results.hint'"
                >
                  <span class="action-button-icon" :class="g3wtemplate.getFontClass('plus-square')"></span>
                </span>

                <!-- SELECT FEATURES -->
                <span
                  v-if                    = "'__g3w_marker' !== layer.id && layer.features.length > 1 && (layer.external || (layer.source && 'wms' !== layer.source.type))"
                  @click.stop             = "selectionFeaturesLayer(layer)"
                  class                   = "action-button skin-tooltip-left"
                  v-t-tooltip:left.create = "'sdk.mapcontrols.query.actions.add_selection.hint'"
                  :class                  = "{ 'toggled': layer.selection.active }"
                >
                  <span class="action-button-icon" :class="g3wtemplate.getFontClass('success')"></span>
                </span>

                <!-- FILTER (ADD / REMOVE) -->
                <span
                  v-if                    = "layer.selection.active && !layer.external"
                  @click.stop             = "addRemoveFilter(layer)"
                  class                   = "action-button skin-tooltip-left"
                  :class                  = "{ 'toggled': layer.filter.active }"
                  v-t-tooltip:left.create = "'layer_selection_filter.tools.filter'"
                >
                  <span class="action-button-icon" :class="g3wtemplate.getFontClass('filter')"></span>
                </span>
              </div>

              <!-- NEW FILTER (SAVE) -->
              <span
                v-if                      = "layer.filter.active && (null === layer.filter.current || layer.selection.active)"
                @click.stop               = "saveFilter(layer)"
                class                     = "action-button skin-tooltip-left"
                v-t-tooltip:left.create   = "'layer_selection_filter.tools.savefilter'"
              >
                <span
                  class="action-button-icon"
                  :class="g3wtemplate.getFontClass('save')"
                ></span>
              </span>

              <!-- COLLAPSE BUTTON -->
              <button class="btn btn-box-tool" data-widget="collapse">
                <i class="btn-collapser skin-color" :class="g3wtemplate.font['minus']"></i>
              </button>

            </div>

            <!-- CUSTOM COMPONENTS (layer actions) -->
            <div
              v-if   = "state.layeractiontool[layer.id].component"
              class  = "g3w-layer-action-tools with-border"
              :class = "{ 'mobile': isMobile() }"
            >
              <g3w-field
                :layer   = "layer"
                :config  = "state.layeractiontool[layer.id].config"
                :_type   = "state.layeractiontool[layer.id].component"
              />
            </div>

            <g3w-field
              v-for   = "({ component }) in getLayerCustomComponents(layer.id, 'layer', 'before')"
              :layer  = "layer"
              :_type  = "component"
            />

            <div
              class="box-body"
              :class="{'mobile': isMobile()}"
            >

              <!-- OUTPUT as TEXT/PLAIN -->
              <div
                v-if   = "layer.rawdata"
                class  = "queryresults-text-html"
                :class = "{ text: 'text/plain' === layer.infoformat }"
                v-html = "layer.rawdata"
              ></div>

              <!-- OUTPUT as HTML -->
              <table
                v-else
                class  = "table"
                :class = "{ 'mobile': isMobile() }"
              >

                <!-- HTML SECTIONS: use multiple <tbody> tags when layer has no Form Structure -->
                <component
                  :is = "hasFormStructure(layer) ? 'tbody' : 'fragment'"
                >
                  <component
                    :is   = "hasFormStructure(layer) ? 'fragment' : 'tbody'"
                    v-for = "(feature, index) in layer.features"
                    :key  = "hasFormStructure(layer) ? undefined : feature.id"
                  >
                    <template v-if="feature.show">

                      <!-- ADDED BY: https://github.com/g3w-suite/g3w-client/pull/505) -->
                      <!-- ORIGINAL SOURCE: src/components/QueryResultsHeaderFeatureActionsBody.vue@3.9 -->
                      <tr
                        @mouseover = "trigger({ id:'highlightgeometry' }, layer, feature, index)"
                        @mouseout  = "trigger({ id:'clearHighlightGeometry' }, layer, feature, index)"
                        class      = "featurebox-header"
                      >

                        <td
                          v-if     = "state.layersactions[layer.id].length"
                          class    = "g3w-feature-actions"
                          :colspan = "getColSpan(layer)"
                        >
                          <action
                            v-for   = "action in state.layersactions[layer.id]"
                            :key    = "action.id"
                            v-bind  = "{
                              layer:        layer,
                              featureIndex: index,
                              trigger:      trigger,
                              feature:      feature,
                              actions:      state.layersactions[layer.id]
                            }"
                            :action = "action"
                          />
                        </td>

                      </tr>

                      <tr class="g3w-feature-result-action-tools">
                        <td
                          v-if     = "state.currentactiontools[layer.id][index]"
                          :colspan = "getColSpan(layer)"
                        >
                        <g3w-field
                            :colspan      = "getColSpan(layer)"
                            :layer        = "layer"
                            :feature      = "feature"
                            :featureIndex = "index"
                            :config       = "state.actiontools[state.currentactiontools[layer.id][index].name][layer.id]"
                            :_type        = "state.currentactiontools[layer.id][index]"
                          />
                        </td>
                      </tr>

                      <!-- ADDED BY: https://github.com/g3w-suite/g3w-client/pull/505 -->
                      <tr
                        v-if     = "!hasLayerOneFeature(layer)"
                        style    = "font-weight: bold; text-align: center"
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
                          :class      = "{ noAttributes: 0 === attributesSubset(layer).length }"
                        >
                          <span
                            class  = "fa link morelink skin-color"
                            :class = "[g3wtemplate.font[getLayerFeatureBox(layer, feature).collapsed ? 'plus' : 'minus']]">
                          </span>
                        </td>
                      </tr>

                      <!-- ORIGINAL SOURCE: src/components/QueryResultsHeaderFeatureBody.vue@3.8 -->
                      <tr>

                        <td v-for="attr in attributesSubset(layer)" class="attribute">
                          <span v-if="getIcon({ layer, feature, attr })" class="skin-color" :class="getIcon({ layer, feature, attr })"></span>
                          <span v-else>{{ feature.attributes[attr.name] }}</span>
                        </td>

                        <td v-if= "!hasLayerOneFeature(layer)"></td>

                      </tr>

                      <tr
                        v-for = "({ component }) in getLayerCustomComponents(layer.id, 'feature', 'before')"
                      >
                        <td
                          :colspan="getColSpan(layer)"
                        >
                          <g3w-field
                            :class   = "{ 'box-body': !hasFormStructure(layer) }"
                            :layer   = "layer"
                            :feature = "feature"
                            :_type   = "component"
                          />
                        </td>
                      </tr>
                      <tr
                        v-show = "!collapsedFeatureBox(layer,feature) || hasOneLayerAndOneFeature(layer)"
                        :id    = "`${layer.id}_${index}`"
                        class  = "featurebox-body"
                      >
                        <td
                          :colspan="getColSpan(layer)"
                        >
                          <tabs
                            v-if      = "hasFormStructure(layer)"
                            :fields   = "getQueryFields(layer, feature)"
                            :layerid  = "layer.id"
                            :feature  = "feature"
                            :tabs     = "getLayerFormStructure(layer)"
                          />
                          <table
                            v-else
                            class="feature_attributes"
                          >
                            <tr v-for="attr in layer.attributes.filter(attr => attr.show)">

                              <!-- TODO: simplify, merge into below component: <g3w-field> -->
                              <!-- ADDED BY: https://github.com/g3w-suite/g3w-client/pull/505 -->
                              <template v-if="isJSON(getLayerField({ layer, feature, fieldName: attribute.name }))">
                                <!-- DUMP JSON objects (MAX 2 NESTING LEVELS) -->
                                <template v-for="(v, k) in getLayerField({ layer, feature, fieldName: attribute.name }).value">
                                  <tr v-for="(v2, k2) in ('object' === typeof v ? v : { [k]: v })" style="padding-top:10px; padding-bottom:10px;">
                                    <td class="attr-label">{{ attribute.label }}.<template v-if="('object' === typeof v)">{{ k }}.</template>{{ k2 }}</td>
                                    <td class="attr-value">{{ v2 }}</td>
                                  </tr>
                                </template>
                              </template>

                              <template v-else>
                                <td class="attr-label">{{ attr.label }}</td>
                                <td class="attr-value" :attribute="attr.name">
                                  <g3w-field
                                    :layer   = "layer"
                                    :feature = "feature"
                                    :state   = "getLayerField({ layer, feature, fieldName: attr.name })"
                                  />
                                </td>
                              </template>

                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr
                        v-for = "({ component }) in getLayerCustomComponents(layer.id, 'feature', 'after')"
                      >
                        <td
                          :colspan="getColSpan(layer)"
                        >
                        <g3w-field
                          :class   = "{ 'box-body': !hasFormStructure(layer) }"
                          :layer   = "layer"
                          :feature = "feature"
                          :_type   = "component"
                        />
                        </td>
                      </tr>
                    </template>

                  </component>
                </component>

              </table>
            </div>

            <div
              v-for  = "({ component }) in getLayerCustomComponents(layer.id, 'layer', 'after')"
              class  = "box-body"
              :class = "{'mobile': isMobile()}"
            >
              <g3w-field
                :layer  = "layer"
                :_type  = "component"
              />
            </div>
          </div>

        </li>
        <li
          v-for="component in state.components"
        >
          <g3w-field
            @showresults = "showResults()"
            :_type       = "component"
          />
        </li>
      </ul>

    </div>

  </div>
</template>

<script>
  import { Fragment }            from 'vue-fragment';

  import { toRawType, throttle } from 'utils';
  import G3WField                from 'components/G3WField.vue';
  import InfoFormats             from 'components/QueryResultsActionInfoFormats.vue';
  import QueryResultsAction      from 'components/QueryResultsAction.vue';
  import { getFieldType }        from 'utils/getFieldType';

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

  Object
    .entries({
      Fragment,
      toRawType,
      throttle,
      G3WField,
      InfoFormats,
      QueryResultsAction,
      getFieldType,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

  export default {

    /** @since 3.8.6 */
    name: 'queryresults',

    data() {
      return {
        state:                       this.$options.queryResultsService.state,
        headerExpandActionCellWidth: headerExpandActionCellWidth,
        headerActionsCellWidth:      headerActionsCellWidth,
      };
    },


    components: {
      Fragment,
      'g3w-field':   G3WField,
      'infoformats': InfoFormats,
      'action':      QueryResultsAction,
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
          const query = this.state.query;
          switch (query.type) {
            case 'coordinates':
              return {
                icon: 'marker',
                message: `  ${query.coordinates[0]}, ${query.coordinates[1]}`
              };
            case 'bbox':
              return {
                icon: 'square',
                message: `  [${query.bbox.join(' , ')}]`
              };
            case 'polygon':
            case 'drawpolygon':
              return {
                icon: 'draw',
                message: (query.layerName) ?
                  `${query.layerName} ${"undefined" !== typeof query.fid ? ` - Feature Id: ${query.fid}` : ''}` // <Feature ID>:   when polygon feature comes from a Feature layer
                  : ' '                                                                                         // <empty string>: when polygon feature comes from a Drawed layer (temporary layer)
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
       * @param { Object } layer
       * 
       * @return { boolean } whether layer need to be show on query result list
       * 
       * @since 3.9.1
       */
      showLayer(layer){
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
       * @param layerId
       * @param {'feature' | 'layer'} type
       * 
       * @returns {*}
       */
      getLayerCustomComponents(
        layerId,
        type    = 'feature',
        position= 'after'
      ) {
        return (
          this.state.layerscustomcomponents[layerId] &&
          this.state.layerscustomcomponents[layerId][type] &&
          this.state.layerscustomcomponents[layerId][type][position] ||
          []
        );
      },

      getLayerField({
        layer,
        feature,
        fieldName,
      }) {
        return {
          ...layer.attributes.find(attr => attr.name === fieldName), // layer field.
          label: null,                                               // hide label in query result table content.
          value: feature.attributes[fieldName]
        };
      },

      getQueryFields(layer, feature) {
        const fields = [];
        for (const field of layer.formStructure.fields) {
          const _field = {
            ...field,
            query: true,
            value: feature.attributes[field.name],
          };
          _field.input = { type: getFieldType(_field) };
          fields.push(_field);
        }
        return fields;
      },

      getColSpan(layer) {
        return this.attributesSubsetLength(layer) + (!this.hasLayerOneFeature(layer) * 1);
      },

      getDownloadActions(layer) {
        return this.state.layersactions[layer.id].find(action => action.formats);
      },

      addLayerFeaturesToResults(layer) {
        this.$options.queryResultsService.addLayerFeaturesToResultsAction(layer);
      },

      showDownloadAction(evt) {
        evt.target.children[0].style.display = ('none' === evt.target.children[0].style.display ? 'inline-block' : 'none');
      },

      printAtlas(layer) {
        this.$options.queryResultsService.printAtlas(layer);
      },

      showLayerDownloadFormats(layer) {
        this.$options.queryResultsService.showLayerDownloadFormats(layer)
      },

      saveLayerResult(layer, type = "csv") {
        this.$options.queryResultsService.saveLayerResult({ layer, type });
      },

      hasLayerOneFeature(layer) {
        return 1 === layer.features.length;
      },

      addRemoveFilter(layer) {
        this.$options.queryResultsService.addRemoveFilter(layer);
      },

      /**
       * @param layer
       *
       * @since 3.9.0
       */
      saveFilter(layer) {
        this.$options.queryResultsService.saveFilter(layer);
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

      selectionFeaturesLayer(layer) {
        this.$options.queryResultsService.selectionFeaturesLayer(layer);
      },

      layerHasActions(layer) {
        return this.state.layersactions[layer.id].length > 0;
      },

      featureHasActions(layer,feature) {
        return this.geometryAvailable(feature);
      },

      geometryAvailable(feature) {
        return !!feature.geometry;
      },

      extractAttributesFromFirstTabOfFormStructureLayers(layer) {
        const attributes = new Set();
        const traverseStructure = item => {
          if (item.nodes) {
            item.nodes.forEach(node => traverseStructure(node));
          } else {
            let field = layer.formStructure.fields.find(field => field.name === item.field_name);
            if (field) {
              if ('ows' === this.state.type) {
                // clone it to avoid to replace original
                field      = { ...field };
                field.name = field.name.replace(/ /g, '_');
              }
              attributes.add(field);
            }
          }
        };
        if (layer.formStructure.structure.length) {
          layer.formStructure.structure.forEach(struct => traverseStructure(struct));
        }
        return Array.from(attributes);
      },

      attributesSubset(layer) {
        const attributes =
          this.hasFormStructure(layer)
            ? this.extractAttributesFromFirstTabOfFormStructureLayers(layer)
            : layer.attributes;
        return attributes
          .filter(attr => attr.show && -1 !== HEADERTYPESFIELD.indexOf(attr.type))
          .slice(0, Math.min(MAX_SUBSET_LENGTH, attributes.length));
      },

      relationsAttributesSubset(relationAttributes) {
        const attributes = [];
        _.forEach(relationAttrs, function (value, attr) {
          if (!Array.isArray(value)) {
            attributes.push({ label: attr, value })
          }
        });
        return attributes.slice(0, Math.min(MAX_SUBSET_LENGTH, attributes.length));
      },

      relationsAttributes(relationAttrs) {
        const attributes = [];
        _.forEach(relationAttrs, function (value, attr) {
          attributes.push({ label: attr, value })
        });
        return attributes;
      },

      attributesSubsetLength(layer) {
        return this.attributesSubset(layer).length;
      },

      cellWidth(index,layer) {
        const headerLength     = MAX_SUBSET_LENGTH + this.state.layersactions[layer.id].length;
        const subsetLength     = this.attributesSubsetLength(layer);
        const diff             = headerLength - subsetLength;
        const actionsCellWidth = layer.hasgeometry ? headerActionsCellWidth : 0;
        const baseCellWidth    = (100 - headerExpandActionCellWidth - actionsCellWidth) / MAX_SUBSET_LENGTH;
        return (diff > 0 && index === subsetLength - 1) ? baseCellWidth * (diff + 1) : baseCellWidth;
      },

      featureBoxColspan(layer) {
        let colspan = this.attributesSubsetLength(layer);
        if (layer.expandable) {
          colspan += 1;
        }
        if (layer.hasgeometry) {
          colspan += 1;
        }
        return colspan;
      },

      relationsAttributesSubsetLength(elements) {
        return this.relationsAttributesSubset(elements).length;
      },

      getLayerFormStructure(layer) {
        //need to clone structure objects in deep and set reactive with Vue.observable
        return layer.formStructure.structure.map(n => Vue.observable(structuredClone(n)));
      },

      isAttributeOrTab(layer, item) {
        const isField = undefined !== item.field_name;
        return  {
          type: isField && 'field' || 'tab',
          item: isField && this.getLayerAttributeFromStructureItem(layer, item.field_name) || [item]
        };
      },

      getLayerAttributeFromStructureItem(layer, field_name) {
        return layer.attributes.find(attr => attr.name === field_name);
      },

      getLayerFeatureBox(layer, feature, relation_index) {
        const boxid = this.getBoxId(layer, feature, relation_index);

        if (undefined === this.state.layersFeaturesBoxes[boxid]) {
          this.state.layersFeaturesBoxes[boxid] = Vue.observable({ collapsed: true });
          this.$watch(
            ()        => this.state.layersFeaturesBoxes[boxid].collapsed,
            collapsed => {
              this.$options.queryResultsService
                .openCloseFeatureResult({
                  open:!collapsed,
                  layer,
                  feature,
                  container: this.getContainerFromFeatureLayer({
                    index: layer.features.findIndex(f => f.id === feature.id),
                    layer,
                  }),
                });
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
        this.$options.queryResultsService
          .emit('show-query-feature-info', {
            layer,
            tabs: this.hasFormStructure(layer),
            show: this.state.layersFeaturesBoxes[boxid] ? !this.state.layersFeaturesBoxes[boxid].collapsed : false,
          });
      },

      getBoxId(layer, feature, relation_index) {
        return this.$options.queryResultsService.getBoxId(layer, feature, relation_index);
      },

      async toggleFeatureBox(layer, feature, relation_index) {
        const boxid = this.getBoxId(layer, feature, relation_index);
        this.state.layersFeaturesBoxes[boxid].collapsed = !this.state.layersFeaturesBoxes[boxid].collapsed;
        await this.$nextTick();
        this.showFeatureInfo(layer, boxid);
      },

      toggleFeatureBoxAndZoom(layer, feature, relation_index) {
        if (!this.hasLayerOneFeature(layer)) {
          this.toggleFeatureBox(layer, feature, relation_index);
        }
      },

      async trigger(action,layer,feature, index) {
        if (action.opened && 'none' === $(`#${layer.id}_${index}`).css('display')) {
          this.toggleFeatureBox(layer, feature);
          await this.$nextTick();
        }
        await this.$options.queryResultsService.trigger(
          action.id,
          layer,
          feature,
          index,
          this.getContainerFromFeatureLayer({ layer, index }),
        );
      },

      showFullPhoto(url) {
        this.$options.queryResultsService.showFullPhoto(url);
      },

      openLink(link_url) {
        window.open(link_url, '_blank');
      },

      /**
       * @since 3.10.0
       */
      getIcon({ layer, feature, attr }) {

        const field = this.getLayerField({
          layer:     layer,
          feature:   feature,
          fieldName: attr.name,
        });

        return this.g3wtemplate.getFontClass(({
          'link_field':  'link',
          'image_field': 'image',
          'photo_field': 'image',
        })[getFieldType(field)]);

      },

      /**
       * @since 3.9.0
       */
      isJSON(field) {
        return !this.isVue(field) && this.isSimple(field) && 'Object' === toRawType(field.value);
      }

    },

    watch: {

      async 'state.layers'(layers) {

        layers.forEach(layer => {

          if (
            layer.attributes.length <= MAX_SUBSET_LENGTH &&
            !layer.hasImageField
          ) {
            layer.expandable = false;
          }

          layer.features
            .forEach(feature => {
              this.getLayerFeatureBox(layer, feature);
              const relations = feature.attributes.relations;
              if (relations) {
                relations.forEach(relation => {
                  relation.elements.forEach((element, index) => {
                    this.state.layersFeaturesBoxes[`${layer.id}_${feature.id}_${relation.name}` + index] = { collapsed: true };
                  });
                })
              }
            });

        });

        // check if is a single result layer and if it has one feature
        if (this.onelayerresult && this.hasLayerOneFeature(layers[0])) {
          const layer = layers[0];
          const boxid = this.getBoxId(layer, layer.features[0]);
          this.$options.queryResultsService.onceafter('postRender', () => {
            this.showFeatureInfo(layer, boxid);
          });
        }

        requestAnimationFrame(() => this.$options.queryResultsService.postRender(this.$el));

        await this.$nextTick();
      },

      onelayerresult(bool) {
        if (bool) {
          this.$options.queryResultsService.highlightFeaturesPermanently(this.state.layers[0]);
        } 
      },

    },

    created() {
      this.zoomToLayerFeaturesExtent = throttle(layer => {
        this.$options.queryResultsService.zoomToLayerFeaturesExtent(layer, { highlight: true });
      });
    },

    beforeDestroy() {
      this.state.zoomToResult = true;
    },

    destroyed() {
      this.$options.queryResultsService.clear();
    },

  };
</script>

<style scoped>
.query-results-info-message {
  font-weight: bold;
  margin-bottom: 3px;
  font-size: 1.1em;
}
.queryresults-container > .query-results-not-found > h4 {
  font-weight: bold;
  text-align: center;
}

.queryresults-container > ul.queryresults {
  position: relative;
}

.g3w-layer-action-tools {
  padding: 5px;
}

.noAttributes {
  display: flex;
  justify-content: flex-end;
}
.feature_attributes tr {
  line-height: 1.8em;
}
</style>