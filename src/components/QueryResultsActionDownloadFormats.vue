<!--
  @file
  @since v3.7
-->

<template>
  <div>
    <div v-if = "layer.hasrelations" style = "display: flex; justify-content: flex-end;">
      <input
        id        = "g3w-download-relations"
        class     = "magic-checkbox"
        v-model   = "down_with_relations"
        type      = "checkbox"/>
        <label for = "g3w-download-relations" v-t = "'sdk.relations.download_with_relations'"></label>
    </div>
    <div
      class               = "g3w-download-formats-content"
      style               = "width: 100%; display: flex"
      @click.prevent.stop = ""
    > 
      <select
        style     = "flex-grow: 1"
        v-select2 = "'download_format'"
        :search   = "false"
        class     ="form-control"
      >
        <option
          v-for  = "download in config.downloads"
          :key   = "download.id"
          :value = "download.format"
          v-download
        >
          <span style = "font-weight: bold">{{download.format}}</span>
        </option>
      </select>
      <button
        style       = "border-radius: 0 3px 3px 0;"
        class       = "btn skin-button"
        @click.stop = download
        v-download
      >
        <span :class = "g3wtemplate.getFontClass('download')">
        </span>
      </button>
    </div>
  </div>
  
</template>

<script>
export default {

  /** @since 3.8.7 */
  name: "downloadformats",

  data() {
    return {
      download_format:     this.config.downloads[0].format,
      down_with_relations: false,
    }
  },
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
      default: null
    },
  },
  methods: {
    pippo(){
      alert()
    },
    async download() {
      try {
        const download = this.config.downloads.find(action => action.format === this.download_format);
        await download.cbk(
          this.layer,
          this.feature
            ? this.feature
            : this.layer.features,
          download,
          this.featureIndex,
          'pdf' === download.format
            ? document.querySelector(`[feature-html-content="${this.layer.id}_${this.featureIndex}"]`).innerHTML
            : null,
          this.down_with_relations,  //
        );
      }
      catch(e) {console.warn(e) }
    }
  },
  created() {
    console.log(this.layer)
  }
}
</script>