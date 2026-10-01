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
              <div class = "tab-node group">
                <div
                  v-for  = "row in getNodeRows(tab)"
                  class = "node-row"
                  :class = "{'mobile': isMobile()}"
                >
                  <template v-for = "column in row">
                    <component
                      v-if              = "'field' === getNodeType(column)"
                      style             = "padding: 5px 3px 5px 3px;"
                      :state            = "getNodeField(column)"
                      @changeinput      = "changeInput"
                      @addinput         = "addToValidate"
                      @removeinput      = "removeToValidate"
                      :changeInput      = "changeInput"
                      :addToValidate    = "addToValidate"
                      :removeToValidate = "removeToValidate"
                      :feature          = "feature"
                      :is               = "getNodeComponent(getNodeField(column))"/>
                    <tabs
                      v-else-if = "'group' === getNodeType(column)"
                      class     = "sub-group" style = "width: 100% !important"
                      v-bind    = "{ ...$props, group: true, tabs: [column] }"/>
                    <div
                      v-else-if       = "showRelationByField"
                      v-disabled     = "isRelationDisabled(column) || loadingRelation(column).loading"
                      @click.stop    = "handleRelation({ relation: column, feature: feature, layerId: layerid })"
                      :style         = "{cursor: showRelationByField && 'pointer'}"
                    >
                      <bar-loader :loading = "loadingRelation(column).loading"/>
                      <div style = "display: flex; align-items: center">
                        <div class = "query_relation_field">
                          <i :class = "g3wtemplate.font[contenttype === 'query' ? 'relation' : 'pencil']"></i>
                        </div>
                        <span class = "query_relation_field_message g3w-long-text">
                          <span style = "text-transform: uppercase">{{ getRelationName(column.name) }}</span>
                        </span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <div v-else class = "tab-node group" :class = "[(i % 2) ? 'odd' : 'even']">
        <div
          v-for  = "row in getNodeRows(root_tab)"
          class = "node-row"
          :class = "{'mobile': isMobile()}"
        >
          <template v-for = "column in row">
            <component
              v-if              = "'field' === getNodeType(column)"
              style             = "padding: 5px 3px 5px 3px;"
              :state            = "getNodeField(column)"
              @changeinput      = "changeInput"
              @addinput         = "addToValidate"
              @removeinput      = "removeToValidate"
              :changeInput      = "changeInput"
              :addToValidate    = "addToValidate"
              :removeToValidate = "removeToValidate"
              :feature          = "feature"
              :is               = "getNodeComponent(getNodeField(column))"/>
            <tabs
              v-else-if = "'group' === getNodeType(column)"
              class     = "sub-group" style = "width: 100% !important"
              v-bind    = "{ ...$props, group: true, tabs: [column] }"/>
            <div
              v-else-if    = "showRelationByField"
              v-disabled  = "isRelationDisabled(column) || loadingRelation(column).loading"
              @click.stop = "handleRelation({ relation: column, feature: feature, layerId: layerid })"
              :style      = "{cursor: showRelationByField && 'pointer'}"
            >
              <bar-loader :loading = "loadingRelation(column).loading"/>
              <div style = "display: flex; align-items: center">
                <div class = "query_relation_field">
                  <i :class = "g3wtemplate.font[contenttype === 'query' ? 'relation' : 'pencil']"></i>
                </div>
                <span class = "query_relation_field_message g3w-long-text">
                  <span style = "text-transform: uppercase">{{ getRelationName(column.name) }}</span>
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>
        
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
      getNodeType(node) {
        const type = (node.groupbox || node.nodes) ? 'group' : node.relation ? 'relation' : 'field';
        if ('field' === type && [undefined, ''].includes(node.alias)) {
          node.alias = node.field_name;
        }
        return type;
      },
      getNodeRows(node) {
        const nodes = node?.nodes?.filter(child => {
          if ('group' === this.getNodeType(child)) { return true }
          if (!child.nodes && child.name && 'group' != this.getNodeType(child)) {
            child.relation = true;
            return true;
          }
          return !!this.fields.find(field => child.field_name === (field.name || child.relation));
        }) || [];
        if (!nodes.length) { return [] }
        const columns = Math.min(parseInt(node.columncount) || 1, nodes.length);
        const rows = columns <= nodes.length ? Math.floor(nodes.length / columns) + (nodes.length % columns) : 1;
        return Array.from({ length: rows }, (_, index) => nodes.slice(index * columns, (index + 1) * columns));
      },
      getNodeField(node) {
        if (node.relation) { return node }
        const field = this.fields.find(field => node.field_name === field.name);
        field.showlabel = node.showlabel;
        return field;
      },
      getNodeComponent(field) {
        if (field.relation) { return }
        if (field.query) { return field.input.type }
        return 'g3w-input';
      },
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
  .tabs-wrapper .tab-node > .node-row { margin-bottom: 0; column-gap: 2px; margin-top: 0; display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; }
</style>