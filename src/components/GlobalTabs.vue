<!--
  @file
  @since v3.7
-->

<template>
  <div
    v-if  = "show"
    class = "tabs-wrapper">
    <template v-for = "root_tab in root_tabs">

      <template v-if = "Array.isArray(root_tab)">

        <ul class = "formquerytabs nav nav-tabs">
          <template v-for = "(tab, index) in root_tab">
            <li
              v-if   = "tab.visible === undefined || tab.visible"
              :class = "{active: index === 0}"
              >
                <a
                  data-toggle = "tab"
                  class       = "tab_a"
                  :href       = "`#${ids[index]}`"
                  :class      = "{'mobile': isMobile(), 'group-title': group}"
                  :style      = "{fontSize: isMobile() ? '1.0em': `${group ? '1.1': '1.2'}em`}"
                  @click      = "group && toggleGroup($event)"
                >
                 {{tab.name}} <span style = "padding-left: 3px; font-size: 1.1em;" v-if = "contenttype === 'editing' && tab.required">*</span>
                </a>
            </li>

          </template>
        </ul>
        <div
          class  = "tab-content"
          :class = "{editing: 'editing' === contenttype }"
        >
          <template v-for = "(tab, index) in root_tab">
            <div
              v-if   = "undefined === tab.visible || tab.visible"
              :id    = "ids[index]"
              class  = "tab-pane fade"
              :class = "{'in active': index === 0}"
            >
              <node
                :showRelationByField = "showRelationByField"
                :handleRelation      = "handleRelation"
                :feature             = "feature"
                :layerid             = "layerid"
                :contenttype         = "contenttype"
                :addToValidate       = "addToValidate"
                :removeToValidate    = "removeToValidate"
                :changeInput         = "changeInput"
                :fields              = "fields"
                :showTitle           = "false"
                :node                = "tab"/>
            </div>
          </template>
        </div>
      </template>
      <node v-else
        :showRelationByField = "showRelationByField"
        :handleRelation      = "handleRelation"
        :feature             = "feature"
        :layerid             = "layerid"
        :contenttype         = "contenttype"
        :addToValidate       = "addToValidate"
        :removeToValidate    = "removeToValidate"
        :changeInput         = "changeInput"
        :fields              = "fields"
        :showTitle           = "false"
        :node                = "root_tab"/>
    </template>
  </div>
</template>

<script>

  import DataRouterService                           from 'services/data';
  import Node                                        from 'components/GlobalTabsNode.vue';
  import GUI                                         from 'services/gui';
  import { getFormDataExpressionRequestFromFeature } from 'utils/getFormDataExpressionRequestFromFeature';
  import { convertFeatureToGEOJSON }                 from 'utils/convertFeatureToGEOJSON';
  import { getUniqueDomId }                          from 'utils/getUniqueDomId';
  import { noop }                                    from 'utils/noop';

  export default {
    name: "tabs",
    props: {
      group: {
        type:    Boolean,
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
        type:    Function,
        default: noop
      },
      removeToValidate: {
        type:    Function,
        default: noop
      },
      changeInput: {
        type:    Function,
        default: noop
      },
      showRelationByField: {
        type:    Boolean,
        default: true
      },
      handleRelation: {
        type:     Function,
        default: ({relation, layerId, feature}={}) => GUI.getService('queryresults').showRelation({relation, layerId, feature})
      }
    },
    data() {
      return {
        ids : []
      }
    },
    computed: {
      required_fields() {
        return 'editing' ===  this.contenttype && this.fields.filter(f => f.validate.required).map(f => f.name);
      },
      show() {
        return this.tabs.reduce((a, t) => a || (t.visible === undefined || !!t.visible), false);
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
        if (undefined === obj.nodes) {
          return this.required_fields.includes(obj.field_name);
        } else {
          return !!obj.nodes.find(n => this.setEditingRequireTab(n));
        }
      },
      getField(fieldName) {
        return this.fields.find(f => fieldName === f.name);
      },

      /**
       * Mimics <details> tag behaviour
       * 
       * @since 3.10.0 
       */
      toggleGroup(e) {
        const wrapper = e.target.closest('.tabs-wrapper');
        wrapper.classList.toggle('collapsed');
      },

    },
    components: {
      Node
    },
    async created() {
      this.unwatch = [];
      this.tabs.forEach(async (tab , i) => {
        if (tab.visibility_expression) {
          if (undefined === tab.visible) { this.$set(tab, 'visible', 0) }
          await this.setVisibility(tab);
        }
        if ('editing' === this.contenttype) {
          if (undefined === tab.required) {
            tab.required = this.setEditingRequireTab(tab);
          }
          if (tab.visibility_expression) {
            tab.visibility_expression
              .referenced_columns
              .forEach(c => {
                const field = this.fields.find(f => c === f.name);
                this.unwatch.push(
                  this.$watch(() => field.value,
                    async (v) => {
                      this.feature.set(field.name, v);
                      await this.setVisibility(tab);
                    })
                )
              })
          }
        }
        this.ids.push(`tab_${getUniqueDomId()}`);
      });

      this.root_tabs = [];
      if (!this.group) {
        const nodes = [];
        this.tabs.forEach(tab_node => {
          if (tab_node.nodes) { nodes.push(tab_node) }
          else {
            if (nodes.length) {
              this.root_tabs.push([...nodes]);
              nodes.splice(0);
            }
            this.root_tabs.push({nodes:[tab_node]});
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
  .nav-tabs > li > a.mobile {
    padding: 5px 10px;
  }
  .tab_a {
    padding:5px;
    margin-right: 0 !important;
    border-bottom: 0;
    margin-bottom: 3px;
    border-radius: 3px 3px 0 0;
  }
  .formquerytabs li a.tab_a.group-title {
    color: inherit !important;
    font-weight: 500;
    font-size: 1em !important;
    padding: 0.25em;
    cursor: pointer;
  }
  .tabs-wrapper > .formquerytabs li a.tab_a.group-title:before {
    content: '▾';
  }
  .tabs-wrapper.collapsed > .formquerytabs li a.tab_a.group-title:before {
    content: '▸';
  }
  .tabs-wrapper.collapsed > .formquerytabs + .tab-content {
    display: none;
  }
</style>