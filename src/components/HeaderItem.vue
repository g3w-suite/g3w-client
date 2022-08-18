<!-- ORIGINAL SOURCE: -->
<!-- gui/header/headeritem.html@v3.4 -->
<!-- gui/header/headeritem.js@v3.4 -->

<template>
  <li class="customheaderlink dropdown user user-menu" :title="state.title">
    <a v-if="state.type === 'link'" :href="state.url" :class="{ imagelink : !!state.img}" :target="state.target" class="dropdown-toggle">
      <img style="max-height: 20px" v-if="state.img" :src="state.img">
      <span v-else>
        <span v-if="state.i18n" v-t="state.title"></span>
        <span v-else>{{state.title}}</span>
      </span>
    </a>
    <a v-else-if="state.type === 'modal'" style="cursor: pointer" @click="showCustomModal(state.id)" data-toggle="modal" data-target="#custom_modal" class="dropdown-toggle">
      <span>{{state.title}}</span>
    </a>
  </li>
</template>

<script>
export default {
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