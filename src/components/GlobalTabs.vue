<!--
  @file
  @since v3.7
-->

<template>
  <div
    v-if  = "show"
    class = "tabs-wrapper">
    <template v-for = "(root_tab, i) in root_tabs">

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
                 {{ tab.name }} <span style = "padding-left: 3px; font-size: 1.1em;" v-if = "contenttype === 'editing' && tab.required">*</span>
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
              class  = "tab-pane"
              :class = "{'active': index === 0}"
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
        :class               = "[(i % 2 ) ? 'odd': 'even']"
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

  import ApplicationState         from 'g3w-state';
  import { G3W_FID }              from 'g3w-constants';
  import G3wInput                 from 'components/InputG3W.vue';
  import Text                     from 'components/FieldText.vue';
  import Link                     from 'components/FieldLink.vue';
  import Image                    from 'components/FieldImage.vue';
  import Geo                      from 'components/FieldGeo.vue';
  import Media                    from 'components/FieldMedia.vue';
  import VueField                 from 'components/FieldVue.vue';
  import GUI                      from 'g3w-app';
  import { getAlphanumericProps } from 'utils/getAlphanumericProps';
  import { getUniqueDomId }       from 'utils/getUniqueDomId';
  import { noop }                 from 'utils/noop';
  import { XHR }                  from 'utils/XHR';

  const Node = {
    name: 'node',
    template: /* html */`
      <div class = "tab-node group">
        <h5
          v-if   = "showGroupTile"
          class  = "title group-title"
          :class = "{'mobile': isMobile()}"
          :style = "{fontSize: isMobile() ? '1em' : '1.1em'}">{{ node.name }}
        </h5>
        <div
          v-for  = "row in rows"
          class  = "node-row"
          :class = "{'mobile': isMobile()}"
        >
          <template v-for = "column in columnNumber" style = "padding:2px">
            <template v-if = "getNode(row, column)">
              <component
                v-if              = "'field' === getNodeType(getNode(row, column))"
                style             = "padding: 5px 3px 5px 3px;"
                :state            = "getField(getNode(row, column))"
                @changeinput      = "changeInput"
                @addinput         = "addToValidate"
                @removeinput      = "removeToValidate"
                :changeInput      = "changeInput"
                :addToValidate    = "addToValidate"
                :removeToValidate = "removeToValidate"
                :feature          = "feature"
                :is               = "getComponent(getField(getNode(row, column)))"/>
              <template v-else>
                <tabs
                  v-if   = "'group' === getNodeType(getNode(row, column))"
                  class  = "sub-group" style = "width: 100% !important"
                  :group = "true"
                  :tabs  = "[getNode(row, column)]"
                  v-bind = "$props"/>
                <template v-else>
                  <div
                    v-if        = "showRelationByField"
                    v-disabled  = "isRelationDisabled(getNode(row, column)) || loadingRelation(getNode(row, column)).loading"
                    @click.stop = "handleRelation({ relation: getNode(row, column), feature:feature, layerId: layerid })"
                    :style      = "{cursor: showRelationByField && 'pointer'}"
                  >
                    <bar-loader :loading = "loadingRelation(getNode(row, column)).loading"/>
                    <div style = "display: flex; align-items: center">
                      <div class = "query_relation_field">
                        <i :class = "g3wtemplate.font[context === 'query' ? 'relation' : 'pencil']"></i>
                      </div>
                      <span class = "query_relation_field_message g3w-long-text">
                        <span style = "text-transform: uppercase">{{ getRelationName(getNode(row, column).name) }}</span>
                      </span>
                    </div>
                  </div>
                </template>
              </template>
            </template>
          </template>
        </div>
      </div>`,
    props: [
      'contenttype', 'node', 'fields', 'showTitle', 'addToValidate',
      'removeToValidate', 'changeInput', 'layerid', 'feature',
      'showRelationByField', 'handleRelation'
    ],
    components: {
      G3wInput,
      simple_field: Text,
      text_field:   Text,
      link_field:   Link,
      image_field:  Image,
      geo_field:    Geo,
      photo_field:  Image,
      media_field:  Media,
      vue_field:    VueField
    },
    data() {
      return {
        context:          this.contenttype,
        editing_required: false
      }
    },
    computed: {
      filterNodes() {
        const filterNodes = this.node?.nodes?.filter(node => {
          if ('group' === this.getNodeType(node) ) { return true }
          else if (!node.nodes && node.name && 'group' != this.getNodeType(node)) {
            node.relation = true;
            return true;
          } else {
            return !!this.fields.find(f => node.field_name === (f.name || node.relation));
          }
        });
        return filterNodes || [];
      },
      nodesLength() {
        return this.filterNodes.length;
      },
      rows() {
        let rowCount = 1;
        if (0 === this.nodesLength ) {
          rowCount = 0;
        } else if (this.columnNumber <= this.nodesLength) {
          rowCount = Math.floor(this.nodesLength / this.columnNumber) + (this.nodesLength % this.columnNumber);
        }
        return rowCount;
      },
      columnNumber() {
        const columnCount = parseInt(this.node.columncount) ? parseInt(this.node.columncount): 1;
        return columnCount > this.nodesLength ? this.nodesLength: columnCount;
      },
      showGroupTile() {
        return this.showTitle && this.node.showlabel && this.node.groupbox;
      }
    },
    methods: {
      loadingRelation(relation) {
        return (ApplicationState.project.getLayerById(this.layerid)?.getRelationById(relation.name) || { state: { loading: false } }).state;
      },
      isRelationDisabled(relation) {
        return undefined === this.getRelationName(relation.name) ||
          ('editing' === this.contenttype && this.isRelationChildLayerNotEditable(relation));
      },
      getRelationName(relationId) {
        return (ApplicationState.project.getRelationById(relationId) || {}).name;
      },
      isRelationChildLayerNotEditable(relation) {
        const projectRelation = ApplicationState.project.getRelationById(relation.name);
        const relationLayer   = ApplicationState.project.getLayerById(projectRelation.referencingLayer);
        return !(relationLayer && relationLayer.isEditable());
      },
      getNodes(row) {
        const startIndex = (row - 1) * this.columnNumber;
        return this.filterNodes.slice(startIndex, this.columnNumber + startIndex);
      },
      getNode(row, column) {
        return this.getNodes(row)[column - 1];
      },
      getField(node) {
        if (node.relation) { return node }
        const field = this.fields.find(f => node.field_name === f.name);
        field.showlabel = node.showlabel;
        return field;
      },
      getNodeType(node) {
        const type = (node.groupbox || node.nodes) ? 'group' : node.relation ? 'relation' : 'field';
        if ('field' === type && [undefined, ''].includes(node.alias)) {
          node.alias = node.field_name;
        }
        return type;
      },
      getComponent(field) {
        if (field.relation) { return }
        else if (field.query) { return field.input.type }
        else { return 'g3w-input' }
      }
    }
  };

  /**
   * Convert feature to form Data for expression/expression_eval request
   */
  function getFormData(feature, contenttype) {
    let _feature = feature;

    if ('editing' !== contenttype) {
      delete feature.attributes.geometry;

      _feature   = new ol.Feature(feature.geometry);
      const properties = {};

      getAlphanumericProps(feature.attributes)
        .filter(p => G3W_FID !== p)
        .forEach(p => properties[p] = feature.attributes[p]);
      _feature.setProperties(properties);
      _feature.setId(feature.id || feature.attributes[G3W_FID]);
    }

    return (new ol.format.GeoJSON()).writeFeatureObject(_feature);
  }

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
        default: ({ relation, layerId, feature } = {}) => {
          // GUI.showRelations({ layerId, feature });
          GUI.showRelations({ relationId: relation.name, layerId, feature });
        }
      }
    },
    data() {
      return {
        ids : []
      }
    },
    computed: {
      required_fields() {
        return 'editing' === this.contenttype && this.fields.filter(f => f.validate.required).map(f => f.name);
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
        const response = await XHR.post({
          url:         `/api/expression_eval/${ApplicationState.project.getId()}/`,
          contentType: 'application/json',
          data:        JSON.stringify({
            qgs_layer_id: this.layerid,
            form_data:    getFormData(this.feature || {}, this.contenttype),
            expression:   tab.visibility_expression.expression,
            formatter:    ('query' === this.contenttype ? 1 : 0),
          }),
        });
        if (response.result) {
          tab.visible = response.value;
        } else {
          throw JSON.stringify(response.error);
        }
      },
      // method to set required tab for editing
      setEditingRequireTab(obj = {}) {
        if (undefined === obj.nodes) {
          return this.required_fields.includes(obj.field_name);
        } else {
          return !!obj.nodes.find(n => this.setEditingRequireTab(n));
        }
      },
      getField(name) {
        return this.fields.find(f => name === f.name);
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
                    async () => {
                      //need to wait that form set new value of change field to feature
                      await this.$nextTick();
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
          this.root_tabs.push(nodes);
        }
      } else {
        this.root_tabs = [this.tabs];
      }
    },
    beforeDestroy() {
      this.unwatch.forEach(u => u());
      this.unwatch = null;
    }
  }
</script>

<style scoped>
  .formquerytabs.nav-tabs > li                                { margin-right: 3px; }
  .formquerytabs.nav-tabs > li:last-child                     { margin-right: 0; }
  .formquerytabs.nav-tabs li:not(.active) > a                 { color: var(--skin-color); background-color: hsl(from var(--skin-color) h s calc(l + 48)) !important; border: 1px solid hsl(from var(--skin-color) h s calc(l + 30)); margin: 0 3px 3px 0; border-bottom: 0 !important; }
  .formquerytabs.nav-tabs li > a                              { color: var(--skin-color); }
  .formquerytabs.nav-tabs li a.tab_a.group-title              { background-color: hsl(from var(--skin-color) h s calc(l + 20)) !important; }
  .formquerytabs.nav-tabs li.active > a,
  .formquerytabs.nav-tabs li.active > a:focus,
  .formquerytabs.nav-tabs .nav-tabs > li.active > a:hover     { background-color: var(--skin-color) !important; color: #fff; }

  .skin-green  .formquerytabs.nav-tabs li:not(.active) > a    { background-color: #e4ffcb !important; }
  .skin-green  .formquerytabs.nav-tabs li a.tab_a.group-title { background-color: rgba(61, 166, 90, 0.85) !important; }
  .skin-red    .formquerytabs.nav-tabs li:not(.active) > a    { background-color: hsl(from var(--skin-danger) h s calc(l + 40)) !important; }
  .skin-yellow .formquerytabs.nav-tabs li:not(.active) > a    { background-color: hsl(37, 87%, 99%) !important; border: 1px solid var(--skin-warning-d40); }

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

<style>
  .tabs-wrapper .tab-node { min-width: 0; overflow: hidden; }
  .tabs-wrapper .tab-node.odd { background-color: hsl(from var(--skin-color) h s l / 0.1); }
  .tabs-wrapper .tab-node > .title { font-weight: bold; width: 100%; color: #ffffff; padding: 3px; margin-top: 5px; margin-bottom: 5px; border-radius: 2px; }
  .tabs-wrapper .tab-node > .node-row { margin-bottom: 0; column-gap: 2px; margin-top: 0; display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; }
  .tabs-wrapper .tab-node .row.mobile { margin-bottom: 0 !important; }
</style>