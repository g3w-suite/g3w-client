<!-- ORIGINAL SOURCE: -->
<!-- gui/form/components/header/vue/header.html@v3.4 -->
<!-- gui/form/components/header/vue/header.js@v3.4 -->

<template>
  <div class="g3wform_header box-header with-border">
    <span style="display:flex; justify-content: space-between; align-items: baseline"
      class="title"
      :style="{fontSize: isMobile() && '1em !important'}"
      :class="[{item_selected: currentid === header.id && headers.length > 1},[headers.length > 1 ? 'tabs' : 'one' ]]"
      v-for="header in headers" :key="header.id"
      @click="click(header.id)">
      <span v-if="header.icon" style="margin-right: 5px">
        <i :class="header.icon"></i>
      </span>
      <span v-t:pre="header.title">{{ header.name }}</span>
     <component :valid="valid" :update="update" :is="header.component"></component>
    </span>
  </div>
</template>

<script>
// TODO: remove "Vue.extend" from module export
export default Vue.extend({
  props: {
    headers: {
      type: Array,
      default:[]
    },
    currentid: {
      type: 'String'
    },
    update: {
      type: Boolean
    },
    valid: {
      type: Boolean
    }
  },
  methods: {
    click(id) {
      if (this.currentid !== id)
        this.$emit('clickheader', id);
    },
    resizeForm(perc){
      this.$emit('resize-form', perc);
    }
  }
});
</script>