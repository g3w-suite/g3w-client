<!--
  @file
  @since v3.7
-->

<template>
  <li
    class  = "customheaderlink dropdown user user-menu"
    :title = "state.title"
  >
    <a
      v-if    = "'link' === state.type"
      :href   = "state.url"
      class   = "dropdown-toggle"
      :class  = "{ imagelink : !!state.img}"
      :target = "state.target"
    >
      <img
        v-if  = "state.img"
        style = "max-height: 20px"
        :src  = "state.img">
      <span v-else>
        <span
          v-if = "state.i18n"
          v-t  = "state.title">
        </span>
        <span v-else>{{state.title}}</span>
      </span>
    </a>
    <a
      v-else-if   = "'modal' === state.type"
      style       = "cursor: pointer"
      @click.stop = "showCustomModal(state.id)"
      data-toggle = "modal"
      data-target = "#custom_modal"
      class       = "dropdown-toggle"
    >
      <span>{{state.title}}</span>
    </a>
  </li>
</template>

<script>
export default {

  /** @since 3.8.6 */
  name:'header-item',

  props: ['state'],
  methods: {
    showCustomModal(id) {
      this.$emit('show-custom-modal-content', id)
    }
  },
  created() {
    this.state.type = this.state.type || 'link';
  }
};
</script>