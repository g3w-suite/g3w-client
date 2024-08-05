<!--
  @file
  @since v3.7
-->

<template>
  <div style = "width:100%">
    <h5
      class = "skin-background-color g3w-polygonattributes-types-title"
      v-t   = "'sdk.mapcontrols.querybypolygon.download.title'">
    </h5>
    <div class = "g3w-polygonattributes-types-content">
      <select
        ref       = "g3w_select_feature_featurepolygon"
        style     = "width: 100%"
        v-select2 = "'type'"
        class     = "form-control"
        :search   = "false"
      >
        <option
          v-for  = "choice in config.choices"
          :key   = "choice.type"
          :value = "choice.type"
          :ref   = "choice.type"
          v-t    = "choice.label">
        </option>
      </select>
      <button
        style       = "border-radius: 0 3px 3px 0;"
        class       = "btn skin-button"
        @click.stop = config.download(type)
      >
        <span :class = "g3wtemplate.getFontClass('download')"></span>
      </button>
    </div>
  </div>
</template>

<script>
  import ApplicationState from 'store/application-state'
  
  const {t} = require('core/i18n/i18n.service');

  export default {

    /** @since 3.8.6 */
    name: "queryresults-querypolygonaddattributes",

    props: {
      layer: {
        type: Object
      },
      config: {
        type:    Object,
        default: null
      },
    },
    data() {
      return {
        type: this.config.choices[0].type
      }
    },
    created() {
      this.unwatch = this.$watch(
        () => ApplicationState.language,
        () => {
          this.config.choices.forEach(c => $(this.$refs[c.type]).text(t(c.label)));
          $(this.$refs.g3w_select_feature_featurepolygon).select2().trigger('change');
        }
      )
    },
    beforeDestroy() {
      this.unwatch && this.unwatch();
      this.unwatch = null;
    }
  }
</script>

<style scoped>
  .g3w-polygonattributes-types-title{
    font-weight: bold;
    padding: 3px;
    color: white;
    margin: 0 0 5px 0;
  }
  .g3w-polygonattributes-types-content{
    display: flex;
    justify-content: space-between;
    padding: 3px;
    border-radius: 3px;
    border: 1px solid #f4f4f4;
  }
</style>