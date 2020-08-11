import Tabs from '../../tabs/tabs.vue';
import Link from '../../fields/link.vue';
import { createCompiledTemplate } from 'gui/vue/utils';
const inherit = require('core/utils/utils').inherit;
const base = require('core/utils/utils').base;
const Component = require('gui/vue/component');
const QueryResultsService = require('gui/queryresults/queryresultsservice');
const GUI = require('gui/gui');
const fieldsMixin = require('gui/vue/vue.mixins').fieldsMixin;
const maxSubsetLength = 3;
const headerExpandActionCellWidth = 10;
const headerActionsCellWidth = 10;
const compiledTemplate = createCompiledTemplate(require('./queryresults.html'));

const vueComponentOptions = {
  ...compiledTemplate,
  mixins: [fieldsMixin],
  data: function() {
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
    hasLayers: function() {
      return this.hasResults || !!this.state.components.length;
    },
    hasResults() {
      return this.state.layers.length > 0
    }
  },
  methods: {
    saveLayerResult(layer, type="csv") {
      this.$options.queryResultsService.saveLayerResult({layer, type});
    },
    hasLayerOneFeature(layer) {
      return layer.features.length === 1;
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
    isArray: function (value) {
      return _.isArray(value);
    },
    isSimple: function(layer,attributeName,attributeValue) {
      return !this.isArray(attributeValue) && this.fieldIs(Fields.SIMPLE,layer,attributeName,attributeValue);
    },
    isLink: function(layer,attributeName,attributeValue) {
      return this.fieldIs(Fields.LINK,layer,attributeName,attributeValue);
    },
    is: function(type,layer,attributeName,attributeValue) {
      return this.fieldIs(type,layer,attributeName,attributeValue);
    },
    checkField: function(type, fieldname, attributes) {
      return attributes.find((attribute) => {
        return (attribute.name === fieldname) && (attribute.type === type);
      }) ? true : false;
    },
    layerHasFeatures: function(layer) {
      if (layer.features) {
        return layer.features.length > 0;
      }
      return false;
    },
    zoomToLayerFeaturesExtent(layer) {
      this.$options.queryResultsService.zoomToLayerFeaturesExtent(layer, {
        highlight: true
      });
    },
    layerHasActions: function(layer) {
      return this.state.layersactions[layer.id].length > 0;
    },
    featureHasActions: function(layer,feature) {
      return this.geometryAvailable(feature);
    },
    geometryAvailable: function(feature) {
      return feature.geometry ? true : false;
    },
    attributesSubset: function(attributes) {
      const _attributes = _.filter(attributes, function(attribute) {
        return attribute.type != 'image';
      });
      const end = Math.min(maxSubsetLength, attributes.length);
      return _attributes.slice(0, end);
    },
    relationsAttributesSubset: function(relationAttributes) {
      const attributes = [];
      _.forEach(relationAttributes, function (value, attribute) {
        if (_.isArray(value)) return;
        attributes.push({label: attribute, value: value})
      });
      const end = Math.min(maxSubsetLength, attributes.length);
      return attributes.slice(0, end);
    },
    relationsAttributes: function(relationAttributes) {
      const attributes = [];
      _.forEach(relationAttributes, function (value, attribute) {
        attributes.push({label: attribute, value: value})
      });
      return attributes;
    },
    attributesSubsetLength: function(attributes) {
      return this.attributesSubset(attributes).length;
    },
    cellWidth: function(index,layer) {
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
    featureBoxColspan: function(layer) {
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
    collapsedFeatureBox: function(layer, feature, relation_index) {
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
      let boxid;
      if (!_.isNil(relation_index)) {
        boxid = layer.id + '_' + feature.id+ '_' + relation_index;
      } else {
        boxid = layer.id + '_' + feature.id;
      }
      return boxid;
    },
    toggleFeatureBox: function(layer, feature, relation_index) {
      const boxid = this.getBoxId(layer, feature, relation_index);
      this.layersFeaturesBoxes[boxid].collapsed = !this.layersFeaturesBoxes[boxid].collapsed;
      requestAnimationFrame(() => {
        this.showFeatureInfo(layer, boxid);
      })
    },
    toggleFeatureBoxAndZoom: function(layer, feature, relation_index) {
      this.toggleFeatureBox(layer, feature, relation_index);
    },
    trigger: function(action,layer,feature) {
      this.$options.queryResultsService.trigger(action,layer,feature);
    },
    showFullPhoto: function(url) {
      this.$options.queryResultsService.showFullPhoto(url);
    },
    openLink: function(link_url) {
      window.open(link_url, '_blank');
    },
    fieldIs: function(TYPE,layer,attributeName,attributeValue) {
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
    showAction({action, layer, feature} = {}){
      return typeof action.condition === 'function' ? action.condition({layer, feature}) : true;
    }
  },
  watch: {
    'state.layers': function(layers) {
      if (layers.length && layers.length === 1 && layers[0].features.length && this.state.zoomToResult) {
        //   this.zoomToLayerFeaturesExtent(layers[0], {
        //     maxZoom: 8
        //   });
      }
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
    if (!this.internalComponent) {
      this.setInternalComponent();
    }
    this.createLayersFeaturesBoxes();
    await this.internalComponent.$nextTick();
    $('.action-button[data-toggle="tooltip"]').tooltip();
  });

  this.createLayersFeaturesBoxes = function() {
    const layersFeaturesBoxes = {};
    const layers = this._service.state.layers;
    layers.forEach((layer) => {
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
