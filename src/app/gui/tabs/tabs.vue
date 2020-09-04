<template>
  <div class="tabs-wrapper">
    <ul class="formquerytabs nav nav-tabs">
      <li v-for="(tab, index) in tabs" :class="{active: index === 0}">
        <a data-toggle="tab" :href="'#'+ ids[index]" :style="{fontSize: isMobile() ? '1.0em': '1.2em'}">{{tab.name}}</a>
      </li>
    </ul>
    <div class="tab-content">
      <div :id="ids[index]" class="tab-pane fade" v-for="(tab, index) in tabs" :key="ids[index]" :class="{'in active': index === 0}">
        <node
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
  const getUniqueDomId = require ('core/utils/utils').getUniqueDomId;
  export default {
    name: "tabs",
    props: {
      contenttype: {
        default: 'query'
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
      changeInput: Function
    },
    data() {
      return {
        ids : []
      }
    },
    methods: {
      getField(fieldName) {
        return this.fields.find(field => field.name === fieldName);
      }
    },
    components: {
      Node
    },
    created() {
      for (const tab of this.tabs) {
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
</style>
