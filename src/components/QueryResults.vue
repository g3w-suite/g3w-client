<!--
  @file
  @since v3.7
-->

<template>
  <div id="search-results" class="queryresults-wrapper">
    <div class="skin-color" style="font-weight: bold; margin-bottom: 3px; font-size: 1.1em;" v-if="info.message">
      <span v-if="info.icon" class="action-button skin-tooltip-bottom" :class="g3wtemplate.getFontClass(info.icon)"></span>
      <span>{{info.message}}</span>
    </div>
    <div class="queryresults-container">
      <template v-if="state.layers.length">
        <ul v-if="hasLayers" class="queryresults" id="queryresults" style="position: relative">
          <li v-show="(layerHasFeatures(layer) || layer.rawdata) && layer.show" v-for="layer in state.layers">
            <bar-loader :loading="layer.loading"/>
            <div class="box box-primary">
              <div class="box-header with-border"  :class="{'mobile': isMobile()}" data-widget="collapse">
                <div class="box-title query-layer-title" :style="{fontSize: isMobile() && '1em !important'}">{{ layer.title }}
                  <span class="query-layer-feature-count" v-show="!layer.rawdata">({{layer.features.length}})</span>
                </div>
                <div class="box-features-action" @click.stop="">
                  <infoformats :layer="layer"/>
                  <template v-if="layer.features.length > 1">
                    <span v-if="layer.hasgeometry" @click.stop="zoomToLayerFeaturesExtent(layer)" class="action-button"
                      v-t-tooltip:left.create="'sdk.mapcontrols.query.actions.zoom_to_features_extent.hint'">
                      <span class="action-button-icon" :class="g3wtemplate.getFontClass('marker')"></span>
                    </span>
                    <span v-if="layer.atlas.length" v-download @click.stop="printAtlas(layer)" class="action-button"
                      v-t-tooltip:left.create="'sdk.mapcontrols.query.actions.atlas.hint'">
                      <span class="action-button-icon" :class="g3wtemplate.getFontClass('print')"></span>
                    </span>
                    <!--        DOWNLOAD        -->
                    <template v-if="layer.downloads.length === 1">
                      <span v-download class="action-button" :class="{'toggled': layer[layer.downloads[0]].active}" v-t-tooltip:left.create="`sdk.mapcontrols.query.actions.download_features_${layer.downloads[0]}.hint`">
                        <span class="action-button-icon" :class="g3wtemplate.getFontClass('download')" @click.stop="saveLayerResult(layer, layer.downloads[0])"></span>
                      </span>
                    </template>
                    <template v-else-if="layer.downloads.length > 1">
                    <span v-download class="action-button" :class="{'toggled': layer.downloadformats.active}" v-t-tooltip:left.create="'Downloads'">
                      <span class="action-button-icon" :class="g3wtemplate.getFontClass('download')" @click.stop="showLayerDownloadFormats(layer)"></span>
                    </span>
                    </template>
                    <!--        DOWNLOAD        -->
                  </template>
                  <span v-if="layer.external || (layer.source && layer.source.type !== 'wms')" @click.stop="addLayerFeaturesToResults(layer)" class="action-button" :class="{'toggled': layer.addfeaturesresults.active}"
                        v-t-tooltip:left.create="'sdk.mapcontrols.query.actions.add_features_to_results.hint'">
                    <span class="action-button-icon" :class="g3wtemplate.getFontClass('plus-square')"></span>
                  </span>
                  <span v-if="layer.features.length > 1 && (layer.external || (layer.source && layer.source.type !== 'wms'))" @click.stop="selectionFeaturesLayer(layer)" class="action-button skin-tooltip-left"
                        v-t-tooltip:left.create="'sdk.mapcontrols.query.actions.add_selection.hint'"  :class="{'toggled': layer.selection.active}">
                    <span class="action-button-icon" :class="g3wtemplate.getFontClass('success')"></span>
                  </span>
                  <span v-show="layer.selection.active && !layer.external" @click.stop="addRemoveFilter(layer)" class="action-button skin-tooltip-left" :class="{'toggled': layer.filter.active}"
                        v-t-tooltip:left.create="'layer_selection_filter.tools.filter'">
                  <span class="action-button-icon" :class="g3wtemplate.getFontClass('filter')"></span>
                </span>
                </div>
                <button class="btn btn-box-tool" data-widget="collapse">
                  <i class="btn-collapser skin-color" :class="g3wtemplate.font['minus']"></i>
                </button>
              </div>
              <template v-if="state.layeractiontool[layer.id].component">
                <div class="g3w-layer-action-tools with-border" style="padding: 5px" :class="{'mobile': isMobile()}">
                  <component :is="state.layeractiontool[layer.id].component" :layer="layer" :config="state.layeractiontool[layer.id].config"/>
                </div>
              </template>
              <!--     Add Custom layer components      -->
              <component v-for="({component}) in getLayerCustomComponents(layer.id, 'layer', 'before')" :is="component" :layer="layer"/>
              <!--   End custom layer component         -->
              <div class="box-body" :class="{'mobile': isMobile()}">
                <template v-if="layer.rawdata">
                  <div class="queryresults-text-html" :class="{text: layer.infoformat === 'text/plain'}" v-html="layer.rawdata"></div>
                </template>
                <template v-else-if="hasFormStructure(layer)">
                  <table class="table" :class="{'mobile': isMobile()}">
                    <thead>
                      <tr>
                        <th v-if="state.layersactions[layer.id].length" :style="{width: `${state.layersactions[layer.id].length *26}px`, maxWidth:`${state.layersactions[layer.id].length * 26}px`}"></th>
                        <th class="centered" v-for="(attribute, index) in attributesSubset(layer)">{{attribute.label}}</th>
                        <th class="collapsed" v-if="!hasLayerOneFeature(layer)"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-if="feature.show" v-for="(feature, index) in layer.features">
                        <header-feature-body :actions="state.layersactions[layer.id]" :layer="layer" :feature="feature" :index="index" :onelayerresult="onelayerresult"
                          :trigger="trigger" :toggleFeatureBoxAndZoom="toggleFeatureBoxAndZoom" :hasLayerOneFeature="hasLayerOneFeature"
                          :boxLayerFeature="getLayerFeatureBox(layer, feature)"
                          :attributesSubset="attributesSubset" :getLayerField="getLayerField"/>
                        <tr class="g3w-feature-result-action-tools">
                          <template v-if="state.currentactiontools[layer.id][index]">
                            <td :colspan="getColSpan(layer)">
                              <component :is="state.currentactiontools[layer.id][index]" :colspan="getColSpan(layer)" :layer="layer" :feature="feature" :featureIndex="index" :config="state.actiontools[state.currentactiontools[layer.id][index].name][layer.id]"/>
                            </td>
                          </template>
                        </tr>
                        <tr v-for="({component}) in getLayerCustomComponents(layer.id, 'feature', 'before')">
                          <td :colspan="getColSpan(layer)">
                            <component :is="component" :layer="layer" :feature="feature"/>
                          </td>
                        </tr>
                        <tr v-show="!collapsedFeatureBox(layer,feature) || hasOneLayerAndOneFeature(layer)" :id="`${layer.id}_${index}`" class="featurebox-body">
                          <td :colspan="getColSpan(layer)">
                            <tabs :fields="getQueryFields(layer, feature)" :layerid="layer.id" :feature="feature" :tabs="getLayerFormStructure(layer)"></tabs>
                          </td>
                        </tr>
                        <tr v-for="({component}) in getLayerCustomComponents(layer.id, 'feature', 'after')">
                          <td :colspan="getColSpan(layer)">
                            <component :is="component" :layer="layer" :feature="feature"/>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </template>
                <table v-else class="table" :class="{'mobile': isMobile()}">
                  <thead>
                    <tr>
                      <th v-if="state.layersactions[layer.id].length" :style="{width: `${state.layersactions[layer.id].length *26}px`, maxWidth:`${state.layersactions[layer.id].length * 26}px`}"></th>
                      <th class="centered" v-for="(attribute, index) in attributesSubset(layer)">{{attribute.label}}</th>
                      <th class="collapsed" v-if="!hasLayerOneFeature(layer)"></th>
                    </tr>
                  </thead>
                  <tbody v-if="feature.show" v-for="(feature, index) in layer.features" :key="feature.id">
                    <header-feature-body :actions="state.layersactions[layer.id]" :layer="layer" :feature="feature" :index="index" :onelayerresult="onelayerresult"
                    :trigger="trigger" :toggleFeatureBoxAndZoom="toggleFeatureBoxAndZoom" :hasLayerOneFeature="hasLayerOneFeature"
                    :boxLayerFeature="getLayerFeatureBox(layer, feature)"
                    :attributesSubset="attributesSubset" :getLayerField="getLayerField"/>
                    <tr class="g3w-feature-result-action-tools">
                      <template v-if="state.currentactiontools[layer.id][index]">
                        <td :colspan="getColSpan(layer)">
                          <component :is="state.currentactiontools[layer.id][index]" :colspan="getColSpan(layer)" :layer="layer" :feature="feature" :featureIndex="index" :config="state.actiontools[state.currentactiontools[layer.id][index].name][layer.id]"/>
                        </td>
                      </template>
                    </tr>
                    <tr v-for="({component}) in getLayerCustomComponents(layer.id, 'feature', 'before')">
                      <td colspan="getColSpan(layer)">
                        <component class="box-body" :is="component" :layer="layer" :feature="feature"/>
                      </td>
                    </tr>
                    <tr v-show="!collapsedFeatureBox(layer,feature) || hasOneLayerAndOneFeature(layer)" :id="`${layer.id}_${index}`" class="featurebox-body">
                      <td :colspan="getColSpan(layer)">
                        <table class="feature_attributes">
                            <tr v-for="attribute in layer.attributes.filter(attribute => attribute.show)">
                              <td class="attr-label">{{ attribute.label }}</td>
                              <td class="attr-value" :attribute="attribute.name">
                                <table-attribute-field-value :feature="feature" :field="getLayerField({layer, feature, fieldName: attribute.name})"/>
                              </td>
                            </tr>
                          </table>
                      </td>
                    </tr>
                    <tr v-for="({component}) in getLayerCustomComponents(layer.id, 'feature', 'after')">
                      <td colspan="getColSpan(layer)">
                        <component class="box-body" :is="component" :layer="layer" :feature="feature"/>
                      </td>
                    </tr>
                  </tbody>
                  <tbody v-else></tbody>
                </table>
              </div>
              <div class="box-body"  :class="{'mobile': isMobile()}" v-for="({component}) in getLayerCustomComponents(layer.id, 'layer', 'after')">
                <component :is="component" :layer="layer"/>
              </div>
            </div>
          </li>
          <li v-for="component in state.components">
            <component @showresults="showResults()" :is="component"/>
          </li>
        </ul>
      </template>
      <template v-else>
        <div class="query-results-not-found" v-if="state.changed">
          <h4 class="skin-color" style="font-weight: bold; text-align: center" v-t="'info.no_results'"></h4>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
  import { fieldsMixin } from 'mixins';
  import TableAttributeFieldValue from 'components/QueryResultsTableAttributeFieldValue.vue';
  import InfoFormats from 'components/QueryResultsActionInfoFormats.vue';
  import HeaderFeatureBody from 'components/QueryResultsHeaderFeatureBody.vue';

  const { throttle } = require('core/utils/utils');

  const maxSubsetLength = 3;
  const headerExpandActionCellWidth = 10;
  const headerActionsCellWidth = 10;
  const HEADERTYPESFIELD = ['varchar', 'integer', 'float', 'date'];

  export default {
    data() {
      return {
        state: this.$options.queryResultsService.state,
        headerExpandActionCellWidth: headerExpandActionCellWidth,
        headerActionsCellWidth: headerActionsCellWidth
      }
    },
    mixins: [fieldsMixin],
    components: {
      TableAttributeFieldValue,
      'infoformats': InfoFormats,
      'header-feature-body': HeaderFeatureBody
    },
    computed: {
      layersFeaturesBoxes() {
        return this.state.layersFeaturesBoxes;
      },
      onelayerresult(){
        return this.state.layers.length  === 1;
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
       *
       * @param layerId
       * @param type feature or layer
       * @returns {*}
       */
      getLayerCustomComponents(layerId, type='feature', position='after'){
        return this.state.layerscustomcomponents[layerId] &&
          this.state.layerscustomcomponents[layerId][type] &&
          this.state.layerscustomcomponents[layerId][type][position] ||
          [];
      },
      getLayerField({layer, feature, fieldName}) {
        const layerField = layer.attributes.find(attribute => attribute.name === fieldName);
        const field = {
          ...layerField,
          label: null, // needed to hide label in query result dom table value content
          value: feature.attributes[fieldName]
        };
        return field;
      },
      getQueryFields(layer, feature) {
        const fields = [];
        for (const field of layer.formStructure.fields) {
          const _field = {...field};
          _field.query = true;
          _field.value = feature.attributes[field.name];
          _field.input = {
            type: `${this.getFieldType(_field)}`
          };
          fields.push(_field);
        }
        return fields;
      },
      getColSpan(layer){
        return this.attributesSubsetLength(layer)+(this.state.layersactions[layer.id].length ? 1 : 0)+(!this.hasLayerOneFeature(layer)*1)
      },
      getDownloadActions(layer){
        return this.state.layersactions[layer.id].find(action => action.formats);
      },
      addLayerFeaturesToResults(layer){
        this.$options.queryResultsService.addLayerFeaturesToResultsAction(layer);
      },
      showDownloadAction(evt){
        const display = evt.target.children[0].style.display;
        evt.target.children[0].style.display = display === 'none' ? 'inline-block' : 'none';
      },
      printAtlas(layer){
        this.$options.queryResultsService.printAtlas(layer);
      },
      showLayerDownloadFormats(layer){
        this.$options.queryResultsService.showLayerDownloadFormats(layer)
      },
      saveLayerResult(layer, type="csv") {
        this.$options.queryResultsService.saveLayerResult({layer, type});
      },
      hasLayerOneFeature(layer) {
        return layer.features.length === 1;
      },
      addRemoveFilter(layer){
        this.$options.queryResultsService.addRemoveFilter(layer);
      },
      getContainerFromFeatureLayer({layer, index}={}){
        return $(`#${layer.id}_${index} > td`);
      },
      hasOneLayerAndOneFeature(layer) {
        return this.hasLayerOneFeature(layer);
      },
      hasFormStructure(layer) {
        return !!layer.formStructure;
      },
      layerHasFeatures(layer) {
        return layer.features && layer.features.length > 0 ? true: false;
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
        return feature.geometry ? true : false;
      },
      extractAttributesFromFirstTabOfFormStructureLayers(layer){
        const attributes = new Set();
        const traverseStructure = item => {
          if (item.nodes) item.nodes.forEach(node => traverseStructure(node));
          else {
            let field = layer.formStructure.fields.find(field => field.name === item.field_name);
            if (field) {
              if (this.state.type === 'ows'){
                // clone it to avoid to replace original
                field = {...field};
                field.name = field.name.replace(/ /g, '_');
              }
              attributes.add(field);
            }
          }
        };
        layer.formStructure.structure.length && layer.formStructure.structure.forEach(structure => traverseStructure(structure));
        return Array.from(attributes);
      },
      attributesSubset(layer) {
        const attributes = this.hasFormStructure(layer) ? this.extractAttributesFromFirstTabOfFormStructureLayers(layer) : layer.attributes;
        const _attributes = attributes.filter(attribute => attribute.show && HEADERTYPESFIELD.indexOf(attribute.type) !== -1);
        const end = Math.min(maxSubsetLength, attributes.length);
        return _attributes.slice(0, end);
      },
      relationsAttributesSubset(relationAttributes) {
        const attributes = [];
        _.forEach(relationAttributes, function (value, attribute) {
          if (Array.isArray(value)) return;
          attributes.push({label: attribute, value: value})
        });
        const end = Math.min(maxSubsetLength, attributes.length);
        return attributes.slice(0, end);
      },
      relationsAttributes(relationAttributes) {
        const attributes = [];
        _.forEach(relationAttributes, function (value, attribute) {
          attributes.push({label: attribute, value: value})
        });
        return attributes;
      },
      attributesSubsetLength(layer) {
        return this.attributesSubset(layer).length;
      },
      cellWidth(index,layer) {
        const headerLength = maxSubsetLength + this.state.layersactions[layer.id].length;
        const subsetLength = this.attributesSubsetLength(layer);
        const diff = headerLength - subsetLength;
        const actionsCellWidth = layer.hasgeometry ? headerActionsCellWidth : 0;
        const headerAttributeCellTotalWidth = 100 - headerExpandActionCellWidth - actionsCellWidth;
        const baseCellWidth = headerAttributeCellTotalWidth / maxSubsetLength;
        if ((index === subsetLength-1) && diff>0) return baseCellWidth * (diff+1);
        else return baseCellWidth;
      },
      featureBoxColspan(layer) {
        let colspan = this.attributesSubsetLength(layer);
        if (layer.expandable) colspan += 1;
        if (layer.hasgeometry) colspan += 1;
        return colspan;
      },
      relationsAttributesSubsetLength(elements) {
        return this.relationsAttributesSubset(elements).length;
      },
      getLayerFormStructure(layer) {
        return layer.formStructure.structure;
      },
      isAttributeOrTab(layer, item) {
        const isField = item.field_name !== undefined;
        return  {
          type: isField && 'field' || 'tab',
          item: isField && this.getLayerAttributeFromStructureItem(layer, item.field_name) || [item]
        };
      },
      getLayerAttributeFromStructureItem(layer, field_name) {
        return layer.attributes.find(attribute => attribute.name === field_name);
      },
      getLayerFeatureBox(layer, feature, relation_index){
        const boxid = this.getBoxId(layer, feature, relation_index);
        if (this.layersFeaturesBoxes[boxid] === undefined) {
          this.layersFeaturesBoxes[boxid] = Vue.observable({
            collapsed: true
          });
          this.$watch(()=> this.layersFeaturesBoxes[boxid].collapsed, collapsed => {
            const index = layer.features.findIndex(_feature => feature.id === _feature.id);
            const container = this.getContainerFromFeatureLayer({
              layer,
              index
            });
            this.$options.queryResultsService.openCloseFeatureResult({
              open:!collapsed,
              layer,
              feature,
              container
            })
          });
          this.layersFeaturesBoxes[boxid].collapsed = layer.features.length > 1;
        }
        return this.layersFeaturesBoxes[boxid];
      },
      // to CHECK NOT GOOD
      collapsedFeatureBox(layer, feature, relation_index) {
        const boxid = this.getBoxId(layer, feature, relation_index);
        return this.layersFeaturesBoxes[boxid] ? this.layersFeaturesBoxes[boxid].collapsed : true;
      },
      showFeatureInfo(layer, boxid) {
        this.$options.queryResultsService.emit('show-query-feature-info', {
          layer,
          tabs: this.hasFormStructure(layer),
          show: this.layersFeaturesBoxes[boxid] ? !this.layersFeaturesBoxes[boxid].collapsed : false
        });
      },
      getBoxId(layer, feature, relation_index) {
        return this.$options.queryResultsService.getBoxId(layer, feature, relation_index);
      },
      async toggleFeatureBox(layer, feature, relation_index) {
        const boxid = this.getBoxId(layer, feature, relation_index);
        this.layersFeaturesBoxes[boxid].collapsed = !this.layersFeaturesBoxes[boxid].collapsed;
        await this.$nextTick();
        this.showFeatureInfo(layer, boxid);
      },
      toggleFeatureBoxAndZoom(layer, feature, relation_index) {
        !this.hasLayerOneFeature(layer) && this.toggleFeatureBox(layer, feature, relation_index);
      },
      async trigger(action,layer,feature, index) {
        if (action.opened && $(`#${layer.id}_${index}`).css('display') === 'none') {
          this.toggleFeatureBox(layer, feature);
          await this.$nextTick();
        }
        const container = this.getContainerFromFeatureLayer({layer, index});
        await this.$options.queryResultsService.trigger(action.id, layer,feature, index, container);
      },
      showFullPhoto(url) {
        this.$options.queryResultsService.showFullPhoto(url);
      },
      openLink(link_url) {
        window.open(link_url, '_blank');
      }
    },
    watch: {
      async 'state.layers'(layers) {
        layers.forEach(layer => {
          if (layer.attributes.length <= maxSubsetLength && !layer.hasImageField) layer.expandable = false;
          layer.features.forEach(feature => {
            this.getLayerFeatureBox(layer, feature);
           if (feature.attributes.relations) {
              const relations = feature.attributes.relations;
              relations.forEach(relation => {
                const boxid = `${layer.id}_${feature.id}_${relation.name}`;
                const elements = relation.elements;
                elements.forEach((element, index) =>{
                  this.layersFeaturesBoxes[boxid+index] = {
                    collapsed: true
                  };
                });
              })
            }
          })
        });

        this.onelayerresult = layers.length === 1;
        // check if is a single result layer and if has one feature
        if (this.onelayerresult && this.hasLayerOneFeature(layers[0])) {
          const layer = layers[0];
          const feature = layer.features[0];
          const boxid = this.getBoxId(layer, feature);
          this.$options.queryResultsService.onceafter('postRender', () => {
            this.showFeatureInfo(layer, boxid);
          });
        }
        requestAnimationFrame(() => this.$options.queryResultsService.postRender(this.$el));
        await this.$nextTick();
      },
      onelayerresult(bool) {
        bool && this.$options.queryResultsService.highlightFeaturesPermanently(this.state.layers[0]);
      }
    },
    created(){
      //PUT HERE THROTTLED FUNCTION
      this.zoomToLayerFeaturesExtent = throttle(layer => {
        this.$options.queryResultsService.zoomToLayerFeaturesExtent(layer, {
          highlight: true
        });
      })
    },
    beforeDestroy() {
      this.state.zoomToResult = true;
      this.layersFeaturesBoxes = null;
    },
    destroyed() {
      this.$options.queryResultsService.clear();
    }
  };
</script>