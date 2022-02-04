<template>
  <div class="tabs-wrapper">
    <ul class="formquerytabs nav nav-tabs">
      <li v-for="(tab, index) in tabs" :class="{active: index === 0}">
        <a data-toggle="tab" :href="'#'+ ids[index]" :class="{'mobile': isMobile()}" :style="{fontSize: isMobile() ? '1.0em': '1.2em'}">
          {{tab.name}} <span style="padding-left: 3px; font-size: 1.1em;" v-if="contenttype === 'editing' && tab.required">*</span></a>
      </li>
    </ul>
    <div class="tab-content">
      <div :id="ids[index]" class="tab-pane fade" v-for="(tab, index) in tabs" :key="ids[index]" :class="{'in active': index === 0}">
        <node
          :showRelationByField="showRelationByField"
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
    </div>
  </div>
</template>

<script>
  import Node from "./node.vue";
  const {getUniqueDomId} = require ('core/utils/utils');
  export default {
    name: "tabs",
    props: {
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
      }
    },
    data() {
      return {
        ids : []
      }
    },
    computed: {
      required_fields(){
        return this.contenttype === 'editing' && this.fields.filter(field => field.validate.required).map(field => field.name);
      }
    },
    methods: {
      // method to set required tab for editing
      setEditingRequireTab(obj){
        let required = false;
        if (obj.nodes === undefined) {
          required = this.required_fields.indexOf(obj.field_name) !== -1;
        } else required = !!obj.nodes.find(node => this.setEditingRequireTab(node));
        return required;
      },
      getField(fieldName) {
        return this.fields.find(field => field.name === fieldName);
      }
    },
    components: {
      Node
    },
    created() {
      for (const tab of this.tabs) {
        if (this.contenttype === 'editing' && tab.required === undefined) {
          tab.required = this.setEditingRequireTab(tab);
        }
        this.ids.push(`tab_${getUniqueDomId()}`);
      }
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
    margin-top: 10px;
  }
  .nav-tabs > li > a.mobile {
    padding: 5px 10px;
  }
</style>
