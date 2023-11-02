<!--
  @file
  @since 3.9.0
-->
<template>
  <section
    v-if  = "config.layers.length > 0"
    class = "action-choose-layer"
  >
    <label v-html="config.label"></label>
    <div
      style               = "width: 100%; display: flex"
      @click.prevent.stop = ""
    >
      <select
        v-select2 = "'layerId'"
        :search   = "false"
        style     = "flex-grow: 1;"
        class     = "form-control">
        <option
          v-for   = "layer in config.layers"
          :key    = "layer.id"
          :value  = "layer.id">
          <b>{{ layer.name }}</b>
        </option>
      </select>
      <button
        style       = "border-radius: 0 3px 3px 0;"
        class       = "btn skin-button"
        @click.stop = "() => config.cbk(layerId, feature)"
      >
        <span :class="g3wtemplate.getFontClass(config.icon)"></span>
      </button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'choose_layer',

  props: {
    featureIndex: {
      type: Number,
    },
    feature: {
      type: Object
    },
    layer: {
      type: Object
    },
    config: {
      type: Object,
      default: {
        icon: 'pencil',
        label: 'Choose a Layer',
        layers: [],
        cbk: () => {},
      }
    },
  },

  data() {
    return {
      layerId: null,
    };
  },

  created() {
    if (this.config.layers.length > 0) {
      this.layerId = this.config.layers[0].id;
    }
  },

};
</script>