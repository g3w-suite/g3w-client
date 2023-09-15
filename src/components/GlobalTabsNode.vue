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
      :class = "{ mobile: isMobile() }"
    >{{ node.name }}</h5>

    <div
      v-for  = "row in rows"
      class  = "node-row"
      :class = "{ mobile: isMobile() }"
    >

      <template v-for="node in getNodes(row)" :style="{ padding: node ? '2px' : undefined }">

        <!-- NODE FIELD -->
        <g3w-input
          v-if              = "'field' === getNodeType(node) && !getField(node).relation"
          class             = "tab-node-field"
          :state            = "getField(node)"
          @changeinput      = "changeInput"
          @addinput         = "addToValidate"
          @removeinput      = "removeToValidate"
          :changeInput      = "changeInput"
          :addToValidate    = "addToValidate"
          :removeToValidate = "removeToValidate"
          :feature          = "feature"
          :_type            = "getField(node).query ? getField(node).input.type : undefined"
          _legacy           = "g3w-input"
          mode              = "read"
        />

        <!-- NODE GROUP -->
        <tabs
          v-else-if         = "'group' === getNodeType(node)"
          class             = "sub-group"
          :group            = "true"
          :tabs             = "[node]"
          v-bind            = "$props"
        />

        <!-- NODE RELATION -->
        <div
          v-else-if         = "showRelationByField"
          class             = "tab-node-relation"
          v-disabled        = "is_disabled(node)"
          @click.stop       = "onRelationClick(node)"
        >
          <bar-loader :loading="is_loading(node)" />
          <div class="tab-node-flex">
            <div  class="query_relation_field">                      <i :class="getRelationIcon(context)"></i>    </div>
            <span class="query_relation_field_message g3w-long-text"><span>{{ getRelationName(node.name) }}</span></span>
          </div>
        </div>

      </template>

    </div>

  </div>
</template>

<script>
  import ProjectsRegistry from 'store/projects';

  Object
    .entries({
      ProjectsRegistry,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

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

    data() {
      return {
        context:          this.contenttype,
        editing_required: false,
      };
    },

    computed: {

      filterNodes() {
        return (this.node.nodes || []).filter(node => {

          /** @FIXME add description */
          if ('group' === this.getNodeType(node)) {
            return true;
          }

          /** @FIXME add description */
          if (!node.nodes && node.name) {
            node.relation = true;
            return true;
          }

          /** @FIXME add description */
          return !!this.fields.find(field => (
            field.name === (node.field_name ? node.field_name.replace(/ /g,"_") : node.field_name) || node.relation
          ));
        });
      },

      nodesLength() {
        return this.filterNodes.length;
      },

      rows() {
        // rows = 0
        if (this.nodesLength === 0) {
          return 0;
        }
        // rows > 0
        if (this.columnNumber <= this.nodesLength) {
          return Math.floor(this.nodesLength / this.columnNumber) + (this.nodesLength % this.columnNumber);
        }
        // rows = 1
        return 1;
      },

      columnNumber() {
        const columnCount = parseInt(this.node.columncount) || 1;
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
        return (
          undefined === this.getRelationName(relation.name) ||
          ('editing' === this.contenttype && /*(*/ this.isRelationChildLayerNotEditable(relation) /*|| relation.nmRelationId )*/)
        );
      },

      /**
       * @since 3.9.0 
       */
      is_disabled(node) {
        return this.isRelationDisabled(node) || this.loadingRelation(node).loading;
      },

      /**
       * @since 3.9.0 
       */
      is_loading(node) {
        return this.loadingRelation(node).loading;
      },

      /**
       * @since 3.9.0
       */
      onRelationClick(node) {
        return this.handleRelation({
          layerId: this.layerid,
          feature: this.feature,
          relation: node
        });
      },

      /**
       * @since 3.9.0 
       */
      getRelationIcon(context) {
        return this.g3wtemplate.font['query' === context ? 'relation' : 'pencil'];
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
        let type;
        
        if (node.groupbox || node.nodes) type = 'group';
        else if (node.relation)          type = 'relation';
        else                             type = 'field';

        /** @FIXME add description */
        if ('field' === type && [undefined, ''].includes(node.alias)) {
          node.alias = node.field_name;
        }

        return type;
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
  .tab-node > .group-title {
    font-size: 1.1em;
  }
  .tab-node > .group-title.mobile {
    font-size: 1em;
  }
  .node-row > .sub-group {
    width: 100% !important;
  }
  .tab-node-field {
    padding: 5px 3px 5px 3px;
  }
  .tab-node-relation {
    cursor: pointer;
  }
  .tab-node-flex {
    display: flex;
    align-items: center;
  }
  .query_relation_field_message > span {
    text-transform: uppercase;
  }
</style>
