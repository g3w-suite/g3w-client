<!--
  @file
  @since v3.7
-->

<template>
  <div>
    <div v-if = "layer.hasdownloadablerelations">
      <input
        :id        = "`g3w-download-relations_${featureIndex}`"
        class     = "magic-checkbox"
        v-model   = "down_with_relations"
        type      = "checkbox"/>
        <label :for = "`g3w-download-relations_${featureIndex}`" v-t = "'sdk.relations.download_with_relations'"></label>
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
          v-for  = "download in downloads_formats"
          :key   = "download.id"
          :value = "download.format"
          v-download
        >
          <span style = "font-weight: bold">{{ download.format }}</span>
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
      downloads_formats:   [...this.config.downloads],
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
  watch: {
    down_with_relations(bool) {
      //In case of download relation is checked
      if (bool) {
        //filter download formats without pdf because it isn't possible download relation in pdf format
        this.downloads_formats = this.downloads_formats.filter(({ format }) => 'pdf' !== format);
      }
      //If checked download relation and current dowload format is pdf, need to set another format
      if (bool && 'pdf' === this.download_format) {
        this.download_format   =  this.downloads_formats[0].format;
      }
      //in case of no checked downloa relations, get all formats
      if (!bool) {
        this.downloads_formats = [...this.config.downloads];
      }
    }
  },
  methods: {
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
          Number(this.down_with_relations),  //@since 3.11.7 Convert boolean to 0/1
        );
      }
      catch(e) { console.warn(e); }
    }
  },
}
</script>