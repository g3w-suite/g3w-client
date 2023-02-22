<!--
  @since v3.8.0
-->
<template>
  <li
    v-if="layerMenu.layer.geolayer && layerMenu.layer.visible"
    @mouseleave.self="showLayerOpacityMenu(false,$event)"
    @mouseover.self="showLayerOpacityMenu(true,$event)"
    class="menu-icon"
  >
    <span
      class="menu-icon skin-color-dark"
      :class="g3wtemplate.getFontClass('slider')">
    </span>
    <span
      class="item-text"
      v-t="'catalog_items.contextmenu.layer_opacity'">
    </span>
    <span
      class="menu-icon" style="position: absolute; right: 0; margin-top: 3px"
      :class="g3wtemplate.getFontClass('arrow-right')">
    </span>
    <ul
      v-show="layerMenu.layer && layerOpacityMenu.show"
      style="position:fixed; padding-left: 0; background-color: #FFFFFF; color:#000000"
      :style="{
        top: layerOpacityMenu.top + 'px',
         left: `${layerOpacityMenu.left}px`,
         maxHeight: layerOpacityMenu.maxHeight + 'px',
         overflowY: layerOpacityMenu.overflowY
       }">
      <li>
        <range
          :value="layerMenu.layer.opacity"
          :min="0"
          :max="100"
          :step="1"
          :sync="false"
          :showValue="true"
          :unit="'%'"
          @change-range="setLayerOpacity">
        </range>
      </li>
    </ul>
  </li>
</template>

<script>
  import CatalogLayersStoresRegistry from 'store/catalog-layers';
  import CatalogEventHub from 'gui/catalog/vue/catalogeventhub';

  export default {
    name: 'Cataloglayercontextmenulayeropacity',
    props: {
      layerMenu: {
        type: Object,
        required: true
      }
    },
    data(){
      return {
        layerOpacityMenu: {
          show: false,
          top:0,
          left:0,
          style: null,
          default: null
        }
      }
    },
    methods: {
      setLayerOpacity( {id=this.layerMenu.layer.id, value:opacity}){
        const changed = this.layerMenu.layer.opacity != opacity;
        if (changed) {
          this.layerMenu.layer.opacity = opacity;
          const layer = CatalogLayersStoresRegistry.getLayerById(id);
          if (layer) {
            CatalogEventHub.$emit('layer-change-opacity', {
              layerId: id
            });
            layer.change();
          }
        }
      },
      /**
       * Context menu: toggle "opacity layer" submenu handling its correct horizontal and vertical alignment
       */
      async showLayerOpacityMenu(bool, evt) {
        this.$emit('show-layer-menu', {
          menu: this.layerOpacityMenu,
          bool,
          evt
        });
      },
    },
    created(){
      this.$emit('add-layer-menu-item', {
        layerOpacity: this.layerOpacityMenu
      })
    }
  };
</script>

<style scoped>
  li .item-text{
    font-weight: bold;
  }
</style>