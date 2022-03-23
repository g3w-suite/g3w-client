<template>
  <div class="tabs-wrapper" v-if="show">
    <template v-for="root_tab in root_tabs">
      <template v-if="Array.isArray(root_tab)">
        <ul class="formquerytabs nav nav-tabs">
          <template v-for="(tab, index) in root_tab">
            <li :class="{active: index === 0}" v-if="tab.visible === undefined || tab.visible">
              <a data-toggle="tab" class="tab_a" :href="`#${ids[index]}`" :class="{'mobile': isMobile(), 'group-title': group}" :style="{fontSize: isMobile() ? '1.0em': `${group ? '1.1': '1.2'}em`}">
                {{tab.name}} <span style="padding-left: 3px; font-size: 1.1em;" v-if="contenttype === 'editing' && tab.required">*</span></a>
            </li>
          </template>
        </ul>
        <div class="tab-content" :class="{editing: contenttype === 'editing'}">
          <template v-for="(tab, index) in root_tab">
            <div :id="ids[index]" class="tab-pane fade" :class="{'in active': index === 0}" v-if="tab.visible === undefined || tab.visible">
              <node :showRelationByField="showRelationByField"
                    :handleRelation="handleRelation"
                    :feature="feature"
                    :layerid="layerid"
                    :contenttype="contenttype"
                    :addToValidate="addToValidate"
                    :changeInput="changeInput"
                    :fields="fields"
                    :showTitle="false"
                    :node="tab">
              </node>
            </div>
          </template>
        </div>
      </template>
      <node v-else :showRelationByField="showRelationByField"
            :handleRelation="handleRelation"
            :feature="feature"
            :layerid="layerid"
            :contenttype="contenttype"
            :addToValidate="addToValidate"
            :changeInput="changeInput"
            :fields="fields"
            :showTitle="false"
            :node="root_tab">
      </node>
    </template>
  </div>
</template>

<script>
  import TabService from 'core/expression/tabservice';
  import Node from './node.vue';
  const GUI = require('gui/gui');
  const {getUniqueDomId} = require ('core/utils/utils');
  export default {
    name: "tabs",
    props: {
      group: {
        type: Boolean,
        default: false
      },
      contenttype: {
        default: 'query'//or editing
      },
      layerid:{
        required: true
      },
      tabs: {
        required: true
      },
      feature: {
        required: true
      },
      fields: {
        required: true
      },
      addToValidate: Function,
      changeInput: Function,
      showRelationByField: {
        type: Boolean,
        default: true
      },
      handleRelation: {
        type: Function,
        default: ({relation, layerId, feature}={}) => GUI.getService('queryresults').showRelation({relation, layerId, feature})
      }
    },
    components :{
      Node
    },
    data() {
      return {
        ids : []
      }
    },
    computed: {
      required_fields(){
        return this.contenttype === 'editing' && this.fields.filter(field => field.validate.required).map(field => field.name);
      },
      show(){
        return this.tabs.reduce((accumulator, tab) =>{
          return accumulator || (tab.visible === undefined || !!tab.visible)
        }, false)
      }
    },
    methods: {
      async setVisibility(tab){
        const visible = await TabService.getVisibility({
          qgs_layer_id: this.layerid,
          expression: tab.visibility_expression.expression,
          feature: this.feature,
          contenttype: this.contenttype
        });
        tab.visible =  visible;
      },
      // method to set required tab for editing
      setEditingRequireTab(obj){
        let required = false;
        if (obj.nodes === undefined) required = this.required_fields.indexOf(obj.field_name) !== -1;
        else required = !!obj.nodes.find(node => this.setEditingRequireTab(node));
        return required;
      },
      getField(fieldName) {
        return this.fields.find(field => field.name === fieldName);
      }
    },
    components: {
      Node
    },
    async created() {
      this.unwatch = [];
      for (const tab of this.tabs) {
        if (tab.visibility_expression) {
           if (tab.visible === undefined) this.$set(tab, 'visible', 0);
           this.setVisibility(tab);
        }
        if (this.contenttype === 'editing') {
          if (tab.required === undefined) tab.required = this.setEditingRequireTab(tab);
          if (tab.visibility_expression){
            tab.visibility_expression.referenced_columns.forEach(column =>{
              const field = this.fields.find(field => field.name === column);
              this.unwatch.push(this.$watch(()=> field.value, async value=>{
                this.feature.set(field.name, value);
                this.setVisibility(tab);
              }))
            })
          }
        }
        this.ids.push(`tab_${getUniqueDomId()}`);
      }
      this.root_tabs = [];
      if (!this.group){
        const nodes = [];
        this.tabs.forEach(tab_node =>{
          if (tab_node.nodes) nodes.push(tab_node);
          else {
            if (nodes.length){
              this.root_tabs.push([...nodes]);
              nodes.splice(0);
            } this.root_tabs.push({nodes:[tab_node]});
          }
        });
        if (nodes.length) this.root_tabs.push(nodes)
      } else this.root_tabs = [this.tabs];
    },
    beforeDestroy() {
      this.unwatch.forEach(unwatch => unwatch());
      this.unwatch = null;
    }
  }
</script>

<style scoped>
  .formquerytabs {
    overflow: hidden !important;
    display: flex;
    flex-wrap: wrap;
  }
  .formquerytabs > li {
    flex: 1;
    display: flex;
  }
  .formquerytabs > li > a {
    font-weight: bold;
    flex: 1;
  }
  .tab-content {
    //margin-top: 10px;
  }
  .nav-tabs > li > a.mobile {
    padding: 5px 10px;
  }
  .tab_a {
    padding:5px;
    margin-right: 0 !important;
    //border: 1px solid #eeeeee;
    border-bottom: 0;
    margin-bottom: 3px;
    border-radius: 3px 3px 0 0;
  }
</style>
