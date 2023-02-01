<!--
  @file
  @since v3.7
-->

<template>
  <li
    class="tree-item" @contextmenu.prevent.stop="showLayerMenu(layerstree, $event)" @click.stop="selectorZoom" :style="{marginLeft: !isGroup ? '5px' : '0'}"
    :class="{selected: !isGroup || !isTable ? layerstree.selected : false, itemmarginbottom: !isGroup,  disabled: isInGrey, group: isGroup  }">
    <span v-if="isGroup"
      style="padding-right: 2px;"
      :class="[{bold : isGroup}, layerstree.expanded ? g3wtemplate.getFontClass('caret-down') : g3wtemplate.getFontClass('caret-right')]"
      @click="expandCollapse"
      class="root collapse-expande-collapse-icon">
    </span>
    <span v-if="isGroup"
      @click.stop="toggle()"
      style="color: #ffffff"
      :class="[triClass()]">
    </span>
    <span v-else-if="isTable"
          v-show="!layerstree.hidden"
          :style="{paddingLeft: !layerstree.exclude_from_legend && legendplace === 'toc' ? '17px' : '18px'}"
          :class="[parentFolder ? 'child' : 'root', g3wtemplate.getFontClass('table')]">
    </span>
    <template v-else>
      <span style="color: red; padding-left: 1px;" v-if="layerstree.external && layerstree.removable"
        :class="g3wtemplate.getFontClass('trash')" @click="removeExternalLayer(layerstree.name, layerstree._type)">
      </span>
      <span style="color: #ffffff; margin-left: 5px;" v-if="layerstree.external && layerstree.download"
            :class="g3wtemplate.getFontClass('download')"
            @click="downloadExternalLayer(layerstree.download)">
      </span>
      <span v-show="!layerstree.hidden" class="checkbox-layer" :class="parentFolder ? 'child' : 'root'">
        <span class="collapse-expande-collapse-icon" v-if="legendlayerposition === 'toc' || !isGroup && layerstree.categories"
          @click.self.stop="expandCollapse"
          :class="g3wtemplate.getFontClass(layerstree.visible && layerstree.expanded ? 'caret-down' : 'caret-right')">
        </span>
        <span :style="{paddingLeft: legendlayerposition === 'toc' ? '5px' : !isGroup && layerstree.categories ? '5px' : (!layerstree.legend && layerstree.external) ? '1px' :
          (showLayerTocLegend || layerstree.categories) ? '13px' : '18px'}" @click.stop="toggle()"
          :class="[g3wtemplate.getFontClass(layerstree.checked ? 'check': 'uncheck'), {'toc-added-external-layer':(!layerstree.legend && layerstree.external)}]">
        </span>
      </span>
    </template>
    <div v-show="!layerstree.hidden || isGroup" class="tree-node-title" :class="{disabled: !layerstree.external && (layerstree.disabled || (layerstree.id && !layerstree.visible)) , bold: isGroup}">
      <span :class="{highlightlayer: isHighLight, scalevisibility: showscalevisibilityclass}" class="skin-tooltip-top g3w-long-text"
        data-placement="top"
        :current-tooltip="showScaleVisibilityToolip ? `minscale:${layerstree.minscale} - maxscale: ${layerstree.maxscale}` : ''"
        v-t-tooltip.text = "showScaleVisibilityToolip ? `minscale:${layerstree.minscale} - maxscale:${layerstree.maxscale}` : ''">
        {{ layerstree.title }}
      </span>
      <div v-if="(!isGroup && layerstree.selection)">
        <span v-if="layerstree.selection.active" class="action-button skin-tooltip-left selection-filter-icon" data-placement="left" data-toggle="tooltip" :class="g3wtemplate.getFontClass('success')" @click.caputure.prevent.stop="clearSelection" v-t-tooltip.create="'layer_selection_filter.tools.clear'"></span>
        <span v-if="!layerstree.external && (layerstree.selection.active || layerstree.filter.active)" class="action-button skin-tooltip-left selection-filter-icon" data-placement="left" data-toggle="tooltip" :class="[g3wtemplate.getFontClass('filter'), layerstree.filter.active ? 'active' : '']" @click.caputure.prevent.stop="toggleFilterLayer" v-t-tooltip.create="'layer_selection_filter.tools.filter'"></span>
      </div>
    </div>
    <layerlegend v-if="showLayerTocLegend" :legendplace="legendplace" :layer="layerstree"></layerlegend>
    <ul v-if="isGroup" class="tree-content-items group" :class="[`g3w-lendplace-${legendplace}`]" v-show="layerstree.expanded">
      <span v-for="_layerstree in layerstree.nodes" :key="_layerstree.id || _layerstree.groupId">
        <tristate-tree
          :root="false"
          :legendConfig="legend"
          :legendplace="legendplace"
          :highlightlayers="highlightlayers"
          :parentFolder="isGroup"
          :layerstree="_layerstree"
          :storeid="storeid"
          :parent="layerstree"
          :parent_mutually_exclusive="!!layerstree.mutually_exclusive">
        </tristate-tree>
      </span>
    </ul>
  </li>
</template>

<script>
import LayerLegend from 'components/CatalogLayerLegend.vue';
import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import GUI from 'services/gui';

const { downloadFile } = require('core/utils/utils');
const CLICKSELECTZOOMEVENT = {
  count: 0,
  timeout: null
};

export default {
  props : ['layerstree', 'storeid', 'legend', 'legendplace', 'highlightlayers', 'parent_mutually_exclusive', 'parentFolder', 'externallayers', 'root', 'parent'],
  components: {
    'layerlegend': LayerLegend
  },
  data() {
    return {
      expanded: this.layerstree.expanded,
      isGroupChecked: true,
      controltoggled: false,
      n_childs: null,
      filtered: false
    }
  },
  computed: {
    showLegendLayer(){
      return !this.layerstree.exclude_from_legend;
    },
    showLayerTocLegend(){
      return !this.isGroup && this.showLegendLayer && this.layerstree.geolayer && this.legendplace === 'toc';
    },
    isGroup() {
      return !!this.layerstree.nodes
    },
    legendlayerposition(){
      return this.showLegendLayer && this.layerstree.legend ? this.legendplace : 'tab';
    },
    showscalevisibilityclass(){
      return !this.isGroup && this.layerstree.scalebasedvisibility
    },
    showScaleVisibilityToolip(){
      return this.showscalevisibilityclass && this.layerstree.disabled && this.layerstree.checked;
    },
    isTable() {
      return !this.isGroup && !this.layerstree.geolayer && !this.layerstree.external;
    },
    isHidden() {
      return this.layerstree.hidden && (this.layerstree.hidden === true);
    },
    selected() {
      this.layerstree.selected = this.layerstree.disabled && this.layerstree.selected ? false : this.layerstree.selected;
    },
    isHighLight() {
      const id = this.layerstree.id;
      return this.highlightlayers && !this.isGroup && CatalogLayersStoresRegistry.getLayerById(id).getTocHighlightable() && this.layerstree.visible;
    },
    isInGrey() {
      return (!this.isGroup && !this.isTable && !this.layerstree.external && (!this.layerstree.visible || this.layerstree.disabled));
    }
  },
  watch:{
    'layerstree.disabled'(bool) {},
    'layerstree.checked'(n, o) {
      this.isGroup ? this.handleGroupChecked(this.layerstree) : this.handleLayerChecked(this.layerstree)
    }
  },
  methods: {
    //method to inizialize layer (disable, visible etc..)
    init(){
      if (this.isGroup && !this.layerstree.checked) this.handleGroupChecked(this.layerstree);
      if (this.isGroup && !this.root) {
        this.layerstree.nodes.forEach(node => {
          if (this.parent_mutually_exclusive && !this.layerstree.mutually_exclusive)
            if (node.id) node.uncheckable = true;
        })
      }
    },
    /**
     * Handel change checked property of group
     * @param group
     */
    handleGroupChecked(group){
      let {checked, parentGroup, nodes} = group;
      const setAllLayersVisible = ({nodes, visible}) => {
        nodes.forEach(node => {
          if (node.id !== undefined){
            if (node.parentGroup.checked && node.checked) {
              const projectLayer = CatalogLayersStoresRegistry.getLayerById(node.id);
              projectLayer.setVisible(visible);
            }
          } else setAllLayersVisible({
            nodes: node.nodes,
            visible: visible && node.checked
          })
        });
      };
      if (checked){
        const visible = parentGroup ? parentGroup.checked : true;
        if (parentGroup && parentGroup.mutually_exclusive){
          parentGroup.nodes.forEach(node => {
            node.checked = node.groupId === group.groupId;
            node.checked && setAllLayersVisible({
              nodes: node.nodes,
              visible
            })
          })
        } else setAllLayersVisible({
          nodes,
          visible
        });
        while (parentGroup){
          parentGroup.checked = parentGroup.root || parentGroup.checked;
          parentGroup = parentGroup.parentGroup
        }
      } else {
        nodes.forEach(node => {
          if (node.id !== undefined) {
            if (node.checked) {
              const projectLayer = CatalogLayersStoresRegistry.getLayerById(node.id);
              projectLayer.setVisible(false);
            }
          } else setAllLayersVisible({
            nodes: node.nodes,
            visible: false
          })
        });
      }
    },
    /**
     * Handle changing checked property of layer
     * @param layer
     */
    handleLayerChecked(layerObject){
      let {checked, id, disabled, projectLayer=false, parentGroup} = layerObject;
      // in case of external layer
      if (!projectLayer){
        const mapService = GUI.getService('map');
        mapService.changeLayerVisibility({
          id,
          visible: checked
        });
      } else {
        const layer = CatalogLayersStoresRegistry.getLayerById(id);
        if (checked) {
          const visible = layer.setVisible(!disabled);
          visible && this.legendplace === 'toc' && setTimeout(()=> CatalogEventHub.$emit('layer-change-style', {
            layerId: id
          }));
          if (parentGroup.mutually_exclusive) {
            parentGroup.nodes.forEach(node => node.checked = node.id === id);
          }
          while (parentGroup){
            parentGroup.checked = true;
            parentGroup = parentGroup.parentGroup;
          }
        } else layer.setVisible(false);
        CatalogEventHub.$emit('treenodevisible', layer);
      }
    },
    toggleFilterLayer(){
      CatalogEventHub.$emit('activefiltertokenlayer', this.storeid, this.layerstree);
    },
    clearSelection(){
      CatalogEventHub.$emit('unselectionlayer', this.storeid, this.layerstree);
    },
    toggle() {
      this.layerstree.checked = !this.layerstree.checked;
    },
    expandCollapse() {
      this.layerstree.expanded = !this.layerstree.expanded;
    },
    select(){
      if (!this.layerstree.external) {
        CatalogEventHub.$emit('treenodeselected',this.storeid, this.layerstree);
      }
    },
    selectorZoom() {
      if (!this.isTable && !this.isGroup) {
        CLICKSELECTZOOMEVENT.count+=1;
        if (!CLICKSELECTZOOMEVENT.timeout) {
          CLICKSELECTZOOMEVENT.timeout = setTimeout(()=>{
            if (CLICKSELECTZOOMEVENT.count === 1) {
              this.select();
            } else if (CLICKSELECTZOOMEVENT.count === 2){
              if (this.layerstree.bbox) {
                const bbox = [
                  this.layerstree.bbox.minx,
                  this.layerstree.bbox.miny,
                  this.layerstree.bbox.maxx,
                  this.layerstree.bbox.maxy
                ] ;
                GUI.getService('map').goToBBox(bbox, this.layerstree.epsg);
              }
            }
            CLICKSELECTZOOMEVENT.timeout = null;
            CLICKSELECTZOOMEVENT.count = 0;
          }, 300)
        }
      }
    },
    triClass () {
      return this.layerstree.checked ? this.g3wtemplate.getFontClass('check') : this.g3wtemplate.getFontClass('uncheck');
    },
    downloadExternalLayer(download) {
      if (download.file) {
        downloadFile(download.file);
      } else if (download.url) {}
    },
    removeExternalLayer(name, type) {
      const mapService = GUI.getService('map');
      mapService.removeExternalLayer(name, wms);
    },
    showLayerMenu(layerstree, evt) {
      if (!this.isGroup && (this.layerstree.openattributetable || this.layerstree.downloadable || this.layerstree.geolayer || this.layerstree.external)) {
        CatalogEventHub.$emit('showmenulayer', layerstree, evt);
      }
    }
  },
  created() {
    // just firs time
    this.init();
  },
  async mounted() {
    await this.$nextTick();
    $('span.scalevisibility').tooltip();
  }
};
</script>