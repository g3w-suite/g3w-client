import Tabs from '../../tabs/tabs.vue';
import Link from '../../fields/link.vue';
import { createCompiledTemplate } from 'gui/vue/utils';
const {base, inherit} = require('core/utils/utils');
const Component = require('gui/vue/component');
const QueryResultsService = require('gui/queryresults/queryresultsservice');
const GUI = require('gui/gui');
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
      layersFeaturesBoxes: {},
      headerExpandActionCellWidth: headerExpandActionCellWidth,
      headerActionsCellWidth: headerActionsCellWidth,
    }
  },
  components: {
    Tabs,
    'g3w-link': Link
  },
  computed: {
    hasLayers() {
      return this.hasResults || !!this.state.components.length;
    },
    hasResults() {
      return this.state.layers.length > 0
    }
  },
  methods: {
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
    hasOneLayerAndOneFeature(layer) {
      const one = this.hasLayerOneFeature(layer);
      if (one) {
        const feature = layer.features[0];
        const boxid = this.getBoxId(layer, feature);
        this.layersFeaturesBoxes[boxid].collapsed = false;
        this.$options.queryResultsService.onceafter('postRender', () => {
          this.showFeatureInfo(layer, boxid);
        });
      }
      return one;
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
      return attributes.find((attribute) => {
        return (attribute.name === fieldname) && (attribute.type === type);
      }) ? true : false;
    },
    layerHasFeatures(layer) {
      if (layer.features) {
        return layer.features.length > 0;
      }
      return false;
    },
    selectionFeaturesLayer(layer) {
      this.$options.queryResultsService.selectionFeaturesLayer(layer);
    },
    zoomToLayerFeaturesExtent(layer) {
      this.$options.queryResultsService.zoomToLayerFeaturesExtent(layer, {
        highlight: true
      });
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
    attributesSubset: function(attributes) {
      const _attributes = _.filter(attributes, function(attribute) {
        return attribute.type != 'image';
      });
      const end = Math.min(maxSubsetLength, attributes.length);
      return _attributes.slice(0, end);
    },
    relationsAttributesSubset(relationAttributes) {
      const attributes = [];
      _.forEach(relationAttributes, function (value, attribute) {
        if (_.isArray(value)) return;
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
    attributesSubsetLength: function(attributes) {
      return this.attributesSubset(attributes).length;
    },
    cellWidth(index,layer) {
      const headerLength = maxSubsetLength + this.state.layersactions[layer.id].length;
      const subsetLength = this.attributesSubsetLength(layer.attributes);
      const diff = headerLength - subsetLength;
      const actionsCellWidth = layer.hasgeometry ? headerActionsCellWidth : 0;
      const headerAttributeCellTotalWidth = 100 - headerExpandActionCellWidth - actionsCellWidth;
      const baseCellWidth = headerAttributeCellTotalWidth / maxSubsetLength;
      if ((index === subsetLength-1) && diff>0) {
        return baseCellWidth * (diff+1);
      }
      else {
        return baseCellWidth;
      }
    },
    featureBoxColspan(layer) {
      let colspan = this.attributesSubsetLength(layer.attributes);
      if (layer.expandable) colspan += 1;
      if (layer.hasgeometry) colspan += 1;
      return colspan;
    },
    relationsAttributesSubsetLength: function(elements) {
      return this.relationsAttributesSubset(elements).length;
    },
    getItemsFromStructure(layer) {
      let prevtabitems = [];
      const newstructure = [];
      layer.formStructure.structure.forEach((item) => {
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
      return layer.attributes.find((attribute) => {
        return attribute.name === field_name;
      })
    },
    collapsedFeatureBox(layer, feature, relation_index) {
      const boxid = !_.isNil(relation_index) ? layer.id + '_' + feature.id+ '_' + relation_index : layer.id + '_' + feature.id;
      const collapsed = this.layersFeaturesBoxes[boxid] ? this.layersFeaturesBoxes[boxid].collapsed : true;
      return collapsed;
    },
    showFeatureInfo(layer, boxid) {
      this.$options.queryResultsService.emit('show-query-feature-info', {
        layer,
        tabs: this.hasFormStructure(layer),
        show: !this.layersFeaturesBoxes[boxid].collapsed
      });
    },
    getBoxId(layer, feature, relation_index) {
      const boxid = (!_.isNil(relation_index)) ? layer.id + '_' + feature.id+ '_' + relation_index : layer.id + '_' + feature.id;
      return boxid;
    },
    toggleFeatureBox(layer, feature, relation_index) {
      const boxid = this.getBoxId(layer, feature, relation_index);
      this.layersFeaturesBoxes[boxid].collapsed = !this.layersFeaturesBoxes[boxid].collapsed;
      requestAnimationFrame(() => {
        this.showFeatureInfo(layer, boxid);
      })
    },
    toggleFeatureBoxAndZoom(layer, feature, relation_index) {
      this.toggleFeatureBox(layer, feature, relation_index);
    },
    async trigger(action,layer,feature, index) {
      if (action.opened && $(`#${layer.id}_${index}`).css('display') === 'none') {
        this.toggleFeatureBox(layer, feature);
        await this.$nextTick();
      }
      this.$options.queryResultsService.trigger(action.id,layer,feature, index);
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
    },
    showAction({action, layer, index,  feature} = {}){
      action.init && action.init({feature, index, action});
      return typeof action.condition === 'function' ? action.condition({layer, feature}) : true;
    }
  },
  watch: {
    'state.layers'(layers) {
      requestAnimationFrame(() => {
        this.$options.queryResultsService.postRender(this.$el);
      })
    }
  },
  beforeMount() {
    this.isMobile() && GUI.hideSidebar();
  },
  beforeDestroy() {
    this.state.zoomToResult = true;
  },
  async destroyed() {
    await this.$nextTick();
    setTimeout(()=>{
      this.$options.queryResultsService.clear();
    })
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
    this.createLayersFeaturesBoxes();
    this.internalComponent.querytitle = this._service.state.querytitle;
  };

  this.getElement = function() {
    if (this.internalComponent) {
      return this.internalComponent.$el;
    }
  };

  this._service.onafter('setLayersData', async () => {
    !this.internalComponent && this.setInternalComponent();
    this.createLayersFeaturesBoxes();
    await this.internalComponent.$nextTick();
    $('.action-button[data-toggle="tooltip"]').tooltip();
  });

  this.createLayersFeaturesBoxes = function() {
    const layersFeaturesBoxes = {};
    const layers = this._service.state.layers;
    layers.forEach(layer => {
      if (layer.attributes.length <= maxSubsetLength && !layer.hasImageField) {
        layer.expandable = false;
      }
      layer.features.forEach((feature, index) => {
        let collapsed = true;
        let boxid = layer.id+'_'+feature.id;
        layersFeaturesBoxes[boxid] = {
          collapsed: collapsed
        };
        if (feature.attributes.relations) {
          boxid = '';
          const relations = feature.attributes.relations;
          relations.forEach((relation) => {
            boxid = layer.id + '_' + feature.id + '_' + relation.name;
            const elements = relation.elements;
            elements.forEach((element, index) =>{
              layersFeaturesBoxes[boxid+index] = {
                collapsed: true
              };
            });
          })
        }
      })
    });
    this.internalComponent.layersFeaturesBoxes = layersFeaturesBoxes;
  };

  this.layout = function(width,height) {};
  this.unmount = function() {
    this.getService().closeComponent();
    return base(this, 'unmount')
  }
}
inherit(QueryResultsComponent, Component);

module.exports = QueryResultsComponent;
