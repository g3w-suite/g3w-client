<!--
  @file
  @since 3.9.0
-->
<template>
  <section class="action-choose-layer">
    <label v-t="config.label"></label>
    <div
      style               = "width: 100%; display: flex"
      @click.prevent.stop = ""
    >
      <select
        v-select2 = "'layerId'"
        :search   = "false"
        style     = "flex-grow: 1;"
        class     = "form-control"
        :disabled = "!has_layers"
      >
        <option
          v-for   = "layer in config.layers"
          :key    = "layer.id"
          :value  = "layer.id">
          <b>{{ layer.name }}</b>
        </option>
        <option v-if="!has_layers" v-t="config.nolayers"></option>
      </select>
      <button
        v-if        = "has_layers"
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
        icon:     'pencil',
        label:    'Choose a Layer',
        nolayers: 'No layers found',
        layers:   [],
        cbk:      () => {},
      }
    },
  },

  data() {
    return {
      layerId: null,
    };
  },

  computed: {

    has_layers() {
      return this.config.layers && this.config.layers.length > 0; 
    },

  },

  created() {
    if (this.has_layers) {
      this.layerId = this.config.layers[0].id;
    }
  },

};
</script>