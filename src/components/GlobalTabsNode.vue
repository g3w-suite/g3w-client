<!--
  @file
  @since v3.7
-->

<template>
  <div class="tab-node group">

    <!-- GROUP TITLE -->
    <h5
      v-if   = "showGroupTile"
      class  = "title group-title"
      :class = "{'mobile': isMobile()}"
      :style = "{ fontSize: isMobile() ? '1em' : '1.1em' }"
    >{{ node.name }}</h5>

    <div
      v-for  = "row in rows"
      class  = "node-row"
      :class = "{'mobile': isMobile()}"
    >
      <template v-for="column in columnNumber" style="padding:2px">

        <template v-if="getNode(row, column)">

          <!-- NODE FIELD -->
          <component
            v-if              = "getNodeType(getNode(row, column)) === 'field'"
            style             = "padding: 5px 3px 5px 3px;"
            :state            = "getField(getNode(row, column))"
            @changeinput      = "changeInput"
            @addinput         = "addToValidate"
            @removeinput      = "removeToValidate"
            :changeInput      = "changeInput"
            :addToValidate    = "addToValidate"
            :removeToValidate = "removeToValidate"
            :feature          = "feature"
            :is               = "getComponent(getField(getNode(row, column)))"
          />

          <!-- NODE GROUP / RELATION -->
          <template v-else>

            <tabs
              v-if            = "'group' === getNodeType(getNode(row, column))"
              class           = "sub-group"
              style           = "width: 100% !important"
              :group          = "true"
              :tabs           = "[getNode(row, column)]"
              v-bind          = "$props"
            />

            <template v-else>
              <div
                v-if          = "showRelationByField"
                v-disabled    = "isRelationDisabled(getNode(row, column)) || loadingRelation(getNode(row, column)).loading"
                @click.stop   = "handleRelation({relation: getNode(row, column), feature:feature, layerId: layerid})"
                :style        = "{cursor: showRelationByField && 'pointer'}"
              >
                <bar-loader :loading="loadingRelation(getNode(row, column)).loading" />

                <div style="display: flex; align-items: center">
                  <div class="query_relation_field">
                    <i :class="g3wtemplate.font[`${'query' === context ? 'relation' : 'pencil'}`]"></i>
                  </div>
                  <span class="query_relation_field_message g3w-long-text">
                    <span style="text-transform: uppercase"> {{ getRelationName(getNode(row, column).name) }}</span>
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
  import G3wInput         from 'components/G3WInput.vue';
  import ProjectsRegistry from 'store/projects';
  import { fieldsMixin }  from 'mixins';

  console.assert(undefined !== fieldsMixin, 'fieldsMixin is undefined');

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

    mixins: [fieldsMixin],

    components: {
      G3wInput,
    },

    data() {
      return {
        context: this.contenttype,
        editing_required: false
      };
    },

    computed: {

      filterNodes() {
        const filterNodes = this.node.nodes && this.node.nodes.filter(node => {
          if (this.getNodeType(node) === 'group') {
            return true;
          } else if (!node.nodes && node.name && this.getNodeType(node) != 'group') {
            node.relation = true;
            return true;
          } else {
            return !!this.fields.find(field => {
              return field.name === (node.field_name ? node.field_name.replace(/ /g,"_") : node.field_name) || node.relation;
            })
          }
        });
        return filterNodes || [];
      },

      nodesLength() {
        return this.filterNodes.length;
      },

      rows() {
        let rowCount = 1;
        if (this.nodesLength === 0) {
          rowCount = 0;
        } else if (this.columnNumber <= this.nodesLength) {
          rowCount = Math.floor(this.nodesLength / this.columnNumber) + (this.nodesLength % this.columnNumber);
        }
        return rowCount;
      },

      columnNumber() {
        const columnCount = parseInt(this.node.columncount) ? parseInt(this.node.columncount) : 1;
        return columnCount > this.nodesLength ? this.nodesLength : columnCount;
      },

      showGroupTile() {
        return this.showTitle && this.node.showlabel && this.node.groupbox;
      },

    },

    methods: {
  
      loadingRelation(relation) {
        return ProjectsRegistry
          .getCurrentProject()
          .getLayerById(this.layerid)
          .getRelationById(relation.name)
          .state;
      },

      isRelationDisabled(relation) {
        return undefined === this.getRelationName(relation.name) || (this.contenttype === 'editing' && this.isRelationChildLayerNotEditable(relation));
        //return this.getRelationName(relation.name) === undefined || (this.contenttype === 'editing' && (relation.nmRelationId || this.isRelationChildLayerNotEditable(relation.name)));
      },

      getRelationName(relationId) {
        const relation = ProjectsRegistry.getCurrentProject().getRelationById(relationId);
        return relation && relation.name;
      },
  
      isRelationChildLayerNotEditable(relation) {
        const {/*nmRelationId,*/ name} = relation;

        // TEMPORARY HANDLE N:M RELATION AS 1:N RELATION
        const currentProject  = ProjectsRegistry.getCurrentProject();
        const projectRelation = currentProject.getRelationById(name);
        const relationLayerId = projectRelation.referencingLayer;
        const relationLayer   = currentProject.getLayerById(relationLayerId);

        // check if is editable. In case of nmRelation layer need to be table to be editable
        return !relationLayer.isEditable();

        // if (nmRelationId) return true;
        // else {
        //   const currentProject = ProjectsRegistry.getCurrentProject();
        //   const projectRelation = currentProject.getRelationById(name);
        //   const relationLayerId = projectRelation.referencingLayer;
        //   const relationLayer = currentProject.getLayerById(relationLayerId);
        //   // check if is editable. In case of nmRelation layer need to be table to be editable
        //   return !relationLayer.isEditable();
        // }
        // const relationId = nmRelationId || name;
        // const currentProject = ProjectsRegistry.getCurrentProject();
        // const projectRelation = currentProject.getRelationById(relationId);
        // const relationLayerId = nmRelationId ? projectRelation.referencedLayer : projectRelation.referencingLayer;
        // const relationLayer = currentProject.getLayerById(relationLayerId);
        // // check if is editable. In case of nmRelation layer need to be table to be editable
        // return !relationLayer.isEditable() || (nmRelationId ? relationLayer.isVector() : false);
      },

      getNodes(row) {
        const startIndex = (row - 1) * this.columnNumber;
        return this.filterNodes.slice(startIndex, this.columnNumber + startIndex);
      },

      getNode(row, column) {
        return this.getNodes(row)[column - 1];
      },

      getField(node) {
        if (node.relation) {
          return node;
        }
        return this.fields.find((field) => field.name === (node.field_name ? node.field_name.replace(/ /g,"_") : node.field_name));
      },

      getNodeType(node) {
        const type = (
          node.groupbox ||
          node.nodes
            ? 'group'
            : node.relation
              ? 'relation'
              : 'field'
        );
        if ('field' === type && [undefined, ''].includes(node.alias)) {
          node.alias = node.field_name;
        }
        return type;
      },

      getComponent(field) {
        if (field.relation) return;
        else if (field.query) return field.input.type;
        else return 'g3w-input';
      },

    },

  };
</script>

<style scoped>
  .tab-node {
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
  .row.mobile {
    margin-bottom: 0 !important;
  }
</style>
