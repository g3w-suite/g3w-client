<!--
  @file
  @since v3.7
-->

<template>
  <div
    v-if="show"
    class="tabs-wrapper">
    <template v-for="root_tab in root_tabs">
      <template v-if="Array.isArray(root_tab)">
        <ul class="formquerytabs nav nav-tabs">
          <template v-for="(tab, index) in root_tab">
            <li
              v-if="tab.visible === undefined || tab.visible"
              :class="{active: index === 0}"
              >
                <a
                  data-toggle="tab"
                  class="tab_a"
                  :href="`#${ids[index]}`"
                  :class="{'mobile': isMobile(), 'group-title': group}"
                  :style="{fontSize: isMobile() ? '1.0em': `${group ? '1.1': '1.2'}em`}"
                >
                 {{tab.name}} <span style="padding-left: 3px; font-size: 1.1em;" v-if="contenttype === 'editing' && tab.required">*</span>
                </a>
            </li>
          </template>
        </ul>
        <div
          class="tab-content"
          :class="{editing: contenttype === 'editing'}"
        >
          <template v-for="(tab, index) in root_tab">
            <div
              v-if="tab.visible === undefined || tab.visible"
              :id="ids[index]"
              class="tab-pane fade"
              :class="{'in active': index === 0}"
            >
              <node
                :showRelationByField="showRelationByField"
                :handleRelation="handleRelation"
                :feature="feature"
                :layerid="layerid"
                :contenttype="contenttype"
                :addToValidate="addToValidate"
                :removeToValidate="removeToValidate"
                :changeInput="changeInput"
                :fields="fields"
                :showTitle="false"
                :node="tab"/>
            </div>
          </template>
        </div>
      </template>
      <node v-else
        :showRelationByField="showRelationByField"
        :handleRelation="handleRelation"
        :feature="feature"
        :layerid="layerid"
        :contenttype="contenttype"
        :addToValidate="addToValidate"
        :removeToValidate="removeToValidate"
        :changeInput="changeInput"
        :fields="fields"
        :showTitle="false"
        :node="root_tab"/>
    </template>
  </div>
</template>

<script>

  import DataRouterService                           from 'services/data';
  import Node                                        from 'components/GlobalTabsNode.vue';
  import GUI                                         from 'services/gui';
  import { getFormDataExpressionRequestFromFeature } from 'utils/getFormDataExpressionRequestFromFeature';
  import { convertFeatureToGEOJSON }                 from 'utils/convertFeatureToGEOJSON';

  const {
    getUniqueDomId,
    noop
  }                        = require ('utils');

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
      addToValidate: {
        type: Function,
        default: noop
      },
      removeToValidate: {
        type: Function,
        default: noop
      },
      changeInput: {
        type: Function,
        default: noop
      },
      showRelationByField: {
        type: Boolean,
        default: true
      },
      handleRelation: {
        type: Function,
        default: ({relation, layerId, feature}={}) => GUI.getService('queryresults').showRelation({relation, layerId, feature})
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
      },
      show(){
        return this.tabs.reduce((accumulator, tab) => accumulator || (tab.visible === undefined || !!tab.visible), false);
      }
    },
    methods: {
      /**
       * ORIGINAL SOURCE: src/app/core/expression/tabservice.js@3.8.6
       */
      async setVisibility(tab) {
        tab.visible = await DataRouterService
          .getData(
            'expression:expression_eval',
              {
              inputs: {
                qgs_layer_id: this.layerid,
                form_data:    (
                  'editing' === this.contenttype ?
                    convertFeatureToGEOJSON :
                    getFormDataExpressionRequestFromFeature)(this.feature || {}
                ),
                expression:   tab.visibility_expression.expression,
                formatter:    ('query' === this.contenttype ? 1 : 0),
              },
              outputs: false,
            }
          );
      },
      // method to set required tab for editing
      setEditingRequireTab(obj) {
        let required = false;
        if (obj.nodes === undefined) {
          required = this.required_fields.indexOf(obj.field_name) !== -1;
        } else {
          required = !!obj.nodes.find(node => this.setEditingRequireTab(node));
        }
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
           if (tab.visible === undefined) {
             this.$set(tab, 'visible', 0);
           }
           this.setVisibility(tab);
        }
        if (this.contenttype === 'editing') {
          if (tab.required === undefined) {
            tab.required = this.setEditingRequireTab(tab);
          }
          if (tab.visibility_expression) {
            tab.visibility_expression
              .referenced_columns
              .forEach(column => {
                const field = this.fields
                  .find(field => field.name === column);
                this.unwatch.push(
                  this.$watch(() => field.value,
                    async (value) => {
                      this.feature.set(field.name, value);
                      this.setVisibility(tab);
                    })
                )
              })
          }
        }
        this.ids.push(`tab_${getUniqueDomId()}`);
      }
      this.root_tabs = [];
      if (!this.group){
        const nodes = [];
        this.tabs.forEach(tab_node => {
          if (tab_node.nodes) {
            nodes.push(tab_node);
          } else {
            if (nodes.length) {
              this.root_tabs.push([...nodes]);
              nodes.splice(0);
            } this.root_tabs.push({nodes:[tab_node]});
          }
        });
        if (nodes.length) {
          this.root_tabs.push(nodes)
        }
      } else {
        this.root_tabs = [this.tabs];
      }
    },
    beforeDestroy() {
      this.unwatch
        .forEach(unwatch => unwatch());
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
  .formquerytabs li a.tab_a.group-title {
    color: inherit !important;
    font-weight: 600;
    font-size: 1em !important;
    padding: 0.25em;
  }
</style>