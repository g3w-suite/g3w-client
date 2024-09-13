<!--
  @file
  @since v3.7
-->

<template>
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
      <template
        v-for = "column in columnNumber"
        style = "padding:2px"
      >
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
              class  = "sub-group" style="width: 100% !important"
              :group = "true"
              :tabs  = "[getNode(row, column)]"
              v-bind = "$props"/>
            <template v-else>
              <div
                v-if        = "showRelationByField"
                v-disabled  = "isRelationDisabled(getNode(row, column)) || loadingRelation(getNode(row, column)).loading"
                @click.stop = "handleRelation({relation: getNode(row, column), feature:feature, layerId: layerid})"
                :style      = "{cursor: showRelationByField && 'pointer'}"
              >
                <bar-loader :loading="loadingRelation(getNode(row, column)).loading"/>
                <div style = "display: flex; align-items: center">
                  <div  class = "query_relation_field">
                    <i :class = "g3wtemplate.font[`${context === 'query' ? 'relation' : 'pencil'}`]"></i>
                  </div>
                  <span class = "query_relation_field_message g3w-long-text">
                    <span style = "text-transform: uppercase"> {{ getRelationName(getNode(row, column).name)}}</span>
                  </span>
                </div>
              </div>
            </template>
          </template>
        </template>
      </template>
    </div>
  </div>
</template>

<script>
  import G3wInput         from 'components/InputG3W.vue';
  import ApplicationState from 'store/application-state'

  const Fields = require('gui/fields/fields');

  export default {
    name: "node",
    props: [
      'contenttype',
      'node',
      'fields',
      'showTitle',
      'addToValidate',
      'removeToValidate',
      'changeInput',
      'layerid',
      'feature',
      'showRelationByField',
      'handleRelation'
    ],
    components: {
      G3wInput,
      ...Fields
    },
    data() {
      return {
        context:          this.contenttype,
        editing_required: false
      }
    },
    computed: {
      /**
       *
       * @returns {*|*[]}
       */
      filterNodes() {
        const filterNodes = this.node.nodes && this.node.nodes.filter(node => {
          if ('group' === this.getNodeType(node) ) { return true }
          else if (!node.nodes && node.name && 'group' != this.getNodeType(node)) {
            node.relation = true;
            return true
          } else {
            return !!this.fields.find(field => {
              return (node.field_name ? node.field_name.replace(/ /g,"_") : node.field_name) === field.name  || node.relation;
            })
          }
        });
        return filterNodes || [];
      },
      /**
       *
       * @returns {number}
       */
      nodesLength() {
        return this.filterNodes.length;
      },
      /**
       *
       * @returns {number}
       */
      rows() {
        let rowCount = 1;
        if (0 === this.nodesLength ) {
          rowCount = 0;
        } else if (this.columnNumber  <= this.nodesLength) {
          rowCount = Math.floor(this.nodesLength / this.columnNumber) + (this.nodesLength % this.columnNumber);
        }
        return rowCount;
      },
      /**
       *
       * @returns {number|number|number}
       */
      columnNumber() {
        const columnCount = parseInt(this.node.columncount) ? parseInt(this.node.columncount): 1;
        return columnCount > this.nodesLength ? this.nodesLength:  columnCount;
      },
      /**
       *
       * @returns {*}
       */
      showGroupTile() {
        return this.showTitle && this.node.showlabel && this.node.groupbox
      }
    },
    methods: {
      /**
       *
       * @param relation
       * @returns {*|{loading: boolean}}
       */
      loadingRelation(relation) {
        const layer = ApplicationState.project.getLayerById(this.layerid);
        // FIXME: prevent a fatal error when creating a relation Tab (even if the project has no relations)
        return layer.getRelationById(relation.name) || ({ state: {loading: false} }).state;
      },
      /**
       *
       * @param relation
       * @returns {boolean|false|*}
       */
      isRelationDisabled(relation) {
        return undefined === this.getRelationName(relation.name) ||
          ('editing' === this.contenttype  && this.isRelationChildLayerNotEditable(relation));
        //return this.getRelationName(relation.name) === undefined || (this.contenttype === 'editing' && (relation.nmRelationId || this.isRelationChildLayerNotEditable(relation.name)));
      },
      /**
       *
       * @param relationId
       * @returns {*}
       */
      getRelationName(relationId) {
        const relation = ApplicationState.project.getRelationById(relationId);
        return relation && relation.name;
      },
      /**
       *
       * @param relation
       * @returns {boolean}
       */
      isRelationChildLayerNotEditable(relation) {
        // HANDLE N:M RELATION AS 1:N RELATION
        const projectRelation = ApplicationState.project.getRelationById(relation.name);
        const relationLayerId = projectRelation.referencingLayer;
        const relationLayer   = ApplicationState.project.getLayerById(relationLayerId);
        // check if is editable. In case of nmRelation layer need to be table to be editable
        return !relationLayer.isEditable();
      },
      /**
       *
       * @param row
       * @returns {T[]}
       */
      getNodes(row) {
        const startIndex = (row - 1) * this.columnNumber;
        return this.filterNodes.slice(startIndex, this.columnNumber + startIndex);
      },
      /**
       *
       * @param row
       * @param column
       * @returns {T}
       */
      getNode(row, column) {
        return this.getNodes(row)[column - 1];
      },
      /**
       *
       * @param node
       * @returns {{relation}|*}
       */
      getField(node) {
        if (node.relation) { return node }
        return this.fields.find(f => (node.field_name ? node.field_name.replace(/ /g,"_") : node.field_name) === f.name);
      },
      /**
       *
       * @param node
       * @returns {string}
       */
      getNodeType(node) {
        const type = (node.groupbox || node.nodes) ?
          'group' :
          node.relation ? 'relation': 'field';
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
  }
</script>

<style scoped>
  .tab-node{
    min-width: 0;
    overflow: hidden;
  }
  .title {
    font-weight: bold;
    width: 100%;
    color: #ffffff;
    padding: 3px;
    margin-top: 5px;
    margin-bottom: 5px;
    border-radius: 2px;
  }
  .node-row {
    margin-bottom: 0;
    column-gap: 2px;
    margin-top: 0;
    display: grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
  }
  .row.mobile{
    margin-bottom: 0 !important;
  }
</style>
