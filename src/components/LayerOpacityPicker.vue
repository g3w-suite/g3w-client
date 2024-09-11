<!--
  @file
  @since v3.8.0
-->

<template>

  <div
    @mouseleave.self = "showLayerOpacityMenu(false, $event)"
    @mouseover.self  = "showLayerOpacityMenu(true, $event)"
  >

    <span class = "menu-icon skin-color-dark" :class = "g3wtemplate.getFontClass('slider')"></span>
    <span class = "item-text" v-t = "'catalog_items.contextmenu.layer_opacity'"></span>
    <span class = "menu-icon" style = "position: absolute; right: 0; margin-top: 3px" :class = "g3wtemplate.getFontClass('arrow-right')"></span>
    <ul
      v-show = "layer && menu.show"
      :style = "{
        top:             menu.top       + 'px',
        left:            menu.left - 15 + 'px',
        maxHeight:       menu.maxHeight + 'px',
        overflowY:       menu.overflowY,
        paddingLeft:     0,
        position:        'fixed',
        backgroundColor: '#FFF',
        color:           '#000',
       }">
      <li>
        <range
          :value        = "layer.opacity"
          :min          = "0"
          :max          = "100"
          :step         = "1"
          :sync         = "false"
          :showValue    = "true"
          :unit         = "'%'"
          @change-range = "setLayerOpacity"/>
      </li>
    </ul>

  </div>

</template>

<script>
  import CatalogLayersStoresRegistry from 'store/catalog-layers';
  import { VM }                      from 'g3w-eventbus';

  export default {

    /** @since 3.8.6 */
    name: 'Layeropacitypicker',

    props: {
      layer: {
        type: Object,
        required: true
      }
    },

    data() {
      return {
        menu: {
          show: false,
          top:0,
          left:0,
          overflowY: 'none',
          style: null,
          default: null
        }
      }

    },
    methods: {

      /**
       * @param {{ id:? string, value: number }}
       * 
       * @fires VM~layer-change-opacity
       */
      setLayerOpacity( { id = this.layer.id, value: opacity }) {
        // skip if nothing has changed
        if (this.layer.opacity == opacity) {
          return;
        }
        this.layer.opacity = opacity;
        const layer = CatalogLayersStoresRegistry.getLayerById(id);
        if (layer) {
          VM.$emit('layer-change-opacity', { layerId: id });
          layer.change();
        }
      },

      /**
       * Context menu: toggle "opacity layer" submenu handling its correct horizontal and vertical alignment
       * 
       * @fires show-menu-item
       */
      async showLayerOpacityMenu(bool, evt) {
        this.$emit('show-menu-item', { menu: this.menu, bool, evt });
      },

    },

    /**
     * @fires init-menu-item
     */
    created() {
      this.$emit('init-menu-item', { layerOpacity: this.menu })
    }

  };
</script>

<style scoped>
  li .item-text{
    font-weight: bold;
  }
</style>