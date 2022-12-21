<!-- ORIGINAL SOURCE: -->
<!-- gui/form/components/header/vue/header.html@v3.4 -->
<!-- gui/form/components/header/vue/header.js@v3.4 -->

<template>
  <div class="g3wform_header box-header with-border" style="display: flex; flex-direction: column">
    <section class="g3wform_header_breadcrumb" v-if="breadcrumb.length > 0">
      <span class="skin-color" @click.stop="triggerCrumbCbk(index)" :style="{fontWeight: isNotLastCrumb(index) ? 'bold' : 'normal'}" v-for="(crumb, index) in breadcrumb">{{crumb.title}} <span v-if="isNotLastCrumb(index)"> / </span></span>
    </section>
    <section class="g3wform_header_content">
      <span style="display:flex; justify-content: space-between; align-items: baseline" class="title" :style="{fontSize: isMobile() && '1em !important'}"
        :class="[{item_selected: currentid === header.id && headers.length > 1},[headers.length > 1 ? 'tabs' : 'one' ]]"
        v-for="header in headers" :key="header.id"
        @click="click(header.id)">
      <span v-if="header.icon" style="margin-right: 5px">
        <i :class="header.icon"></i>
      </span>
      <span v-t:pre="header.title">{{ header.name }}</span>
     <component :valid="valid" :update="update" :is="header.component"></component>
    </span>
    </section>
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
    },
    breadcrumb: {
      type: Array,
      default: []
    }
  },
  methods: {
    triggerCrumbCbk(index){
      const {cbk} = this.breadcrumb[index];
      cbk && typeof cbk === 'function' && cbk(index);
    },
    isNotLastCrumb(index){
      return index < this.breadcrumb.length -1;
    },
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