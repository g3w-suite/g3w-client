import Tabs from '../../tabs/tabs.vue';
import Link from '../../fields/link.vue';
import HeaderFeatureBody from './headerfeaturebody.vue';
import { createCompiledTemplate } from 'gui/vue/utils';
const {base, inherit, throttle} = require('core/utils/utils');
const Component = require('gui/vue/component');
const QueryResultsService = require('gui/queryresults/queryresultsservice');
const {fieldsMixin } = require('gui/vue/vue.mixins');
const maxSubsetLength = 3;
const headerExpandActionCellWidth = 10;
const headerActionsCellWidth = 10;
const compiledTemplate = createCompiledTemplate(require('./queryresults.html'));

const vueComponentOptions = {
  ...compiledTemplate,
  mixins: [fieldsMixin],
  data() {
    return {
      state: this.$options.queryResultsService.state,
      headerExpandActionCellWidth: headerExpandActionCellWidth,
      headerActionsCellWidth: headerActionsCellWidth,
    }
  },
  components: {
    Tabs,
    'g3w-link': Link,
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
      return this.state.layers.length > 0
    },
    info(){
      const info = {
        icon: null,
        message: null,
        action: null
      };
      const {query, search} = this.state;
      if (query){
        if (query.coordinates) {
          info.icon = 'marker';
          info.message = `  ${query.coordinates[0]}, ${query.coordinates[1]}`;
          info.action = () => this.$options.queryResultsService.showCoordinates(query.coordinates);
        } else if (query.bbox)  {
          info.icon = 'square';
          info.message = `  [${query.bbox.join(' , ')}]`;
          info.action = ()=>this.$options.queryResultsService.showBBOX(query.bbox);
        } else if (query.geometry) {
          info.icon =  'draw';
          info.message =  `  ${query.name} - Feature Id: ${query.fid}`;
          info.action = () =>this.$options.queryResultsService.showGeometry(query.geometry);
        }
      } else if (search){}

      return info;
    }
  },
  methods: {
    addLayerFeaturesToResults(layer){
      this.$options.queryResultsService.addLayerFeaturesToResultsAction(layer);
    },
    showDownloadAction(evt){
      const display = evt.target.children[0].style.display;
      evt.target.children[0].style.display = display === 'none' ? 'inline-block' : 'none';
    },
    printAtlas(layer){
      this.$options.queryResultsService.printAtlas(layer)
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
    hasFieldOutOfFormStructure(layer) {
      return this.hasFormStructure(layer) ? layer.getFieldsOutOfFormStructure() : [];
    },
    isArray (value) {
      return Array.isArray(value);
    },
    isSimple(layer,attributeName,attributeValue) {
      return !this.isArray(attributeValue) && this.fieldIs(Fields.SIMPLE,layer,attributeName,attributeValue);
    },
    isLink(layer,attributeName,attributeValue) {
      return this.fieldIs(Fields.LINK,layer,attributeName,attributeValue);
    },
    is(type,layer,attributeName,attributeValue) {
      return this.fieldIs(type,layer,attributeName,attributeValue);
    },
    checkField(type, fieldname, attributes) {
      return attributes.find(attribute => (attribute.name === fieldname) && (attribute.type === type)) ? true : false;
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
        if (item.nodes) {
          item.nodes.forEach(node => traverseStructure(node));
        } else {
          const field = layer.formStructure.fields.find(field => field.name === item.field_name);
          field && attributes.add(field);
        }
      };
      layer.formStructure.structure.length && traverseStructure(layer.formStructure.structure[0]);
      return Array.from(attributes);
    },
    attributesSubset(layer) {
      const attributes = this.hasFormStructure(layer) ? this.extractAttributesFromFirstTabOfFormStructureLayers(layer) : layer.attributes;
      const _attributes = attributes.filter(attribute => attribute.show && attribute.type != 'image');
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
    getItemsFromStructure(layer) {
      let prevtabitems = [];
      const newstructure = [];
      layer.formStructure.structure.forEach(item => {
        const _item = this.isAttributeOrTab(layer, item);
        if (_item.type === 'field') {
          newstructure.push(_item);
          prevtabitems = [];
        } else {
          if (!prevtabitems.length) {
            newstructure.push(_item);
            prevtabitems = _item.item;
          } else prevtabitems.push(_item.item[0]);
        }
      });
      return newstructure;
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
        show: !this.layersFeaturesBoxes[boxid].collapsed
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
      this.$options.queryResultsService.trigger(action.id, layer,feature, index, container);
    },
    showFullPhoto(url) {
      this.$options.queryResultsService.showFullPhoto(url);
    },
    openLink(link_url) {
      window.open(link_url, '_blank');
    },
    fieldIs(TYPE,layer,attributeName,attributeValue) {
      const fieldType = this.getFieldType(attributeValue);
      return fieldType === TYPE;
    },
    getQueryFields(layer, feature) {
      const fields = [];
      for (const field of layer.formStructure.fields) {
        const _field = {...field};
        _field.query = true;
        _field.value = feature.attributes[field.name];
        _field.input = {
          type: `${this.getFieldType(_field.value)}_field`
        };
        fields.push(_field);
      }
      return fields;
    }
  },
  watch: {
    'state.layers'(layers) {
      layers.forEach(layer => {
        if (layer.attributes.length <= maxSubsetLength && !layer.hasImageField) layer.expandable = false;
        layer.features.forEach(feature => {
          this.getLayerFeatureBox(layer, feature);
         if (feature.attributes.relations) {
            const relations = feature.attributes.relations;
            relations.forEach(relation => {
              const boxid = layer.id + '_' + feature.id + '_' + relation.name;
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
      requestAnimationFrame(() => this.$options.queryResultsService.postRender(this.$el))
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
    setTimeout(()=>this.$options.queryResultsService.clear())
  }
};

const InternalComponent = Vue.extend(vueComponentOptions);

function QueryResultsComponent(options={}) {
  base(this, options);
  this.id = "queryresults";
  this.title = "Query Results";
  this._service = new QueryResultsService();
  this.setInternalComponent = function() {
    this.internalComponent = new InternalComponent({
      queryResultsService: this._service
    });
    this.internalComponent.querytitle = this._service.state.querytitle;
  };

  this.getElement = function() {
    if (this.internalComponent) return this.internalComponent.$el;
  };

  this._service.onafter('setLayersData', async () => {
    !this.internalComponent && this.setInternalComponent();
    await this.internalComponent.$nextTick();
    $('.action-button[data-toggle="tooltip"]').tooltip();
  });

  this.layout = function(width,height) {};
  this.unmount = function() {
    this.getService().closeComponent();
    return base(this, 'unmount')
  }
}

inherit(QueryResultsComponent, Component);

module.exports = QueryResultsComponent;
