<!--
  @file
  @since v3.7
-->

<template>
  <div class="g3wform_header box-header with-border" style="display: flex; flex-direction: column">
    <section class="g3wform_header_content">
      <span
        v-for       = "header in headers" :key="header.id"
        style       = "display:flex; justify-content: space-between; align-items: center"
        class       = "title"
        :style      = "{ fontSize: isMobile() && '1em !important' }"
        :class      = "[{ item_selected: currentid === header.id && headers.length > 1 }, [ headers.length > 1 ? 'tabs' : 'one' ]]"
        @click.stop = "click(header.id)"
      >
        <span v-if="header.icon" style="margin-right: 5px">
          <i :class="header.icon"></i>
        </span>
        <span v-t:pre="header.title" class="g3w-long-text">{{ header.name }}</span>
        <component
          :valid  = "valid"
          :update = "update"
          :is     = "header.component"
        />
      </span>
    </section>
  </div>
</template>

<script>
/**
 * @TODO remove "Vue.extend" from module export
 */
export default Vue.extend({

  /** @since 3.8.6 */
  name: 'form-header',

  props: {

    headers: {
      type: Array,
      default:[]
    },

    currentid: {
      type: String
    },

    update: {
      type: Boolean
    },

    valid: {
      type: Boolean
    },

  },

  methods: {

    click(id) {
      /**
       * @deprecated since 3.6.2
       * This was used when form headers has more than one (case relation)
       */
      if (this.currentid !== id && this.headers.length > 1) {
        this.$emit('clickheader', id);
      }
    },

    resizeForm(perc) {
      this.$emit('resize-form', perc);
    },

  },

});
</script>