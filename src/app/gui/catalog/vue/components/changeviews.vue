<template>
  <ul class="sidebar-menu">
    <li id="g3w-catalog-toc-views" class="treeview sidebaritem" style="border: 1px solid #394247">
      <a href="#" ref="g3w-view-ancor" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <i :class="g3wtemplate.getFontClass('eye')"></i>
          <span class="treeview-label">{{ currentview }}</span>
        </div>
        <div>
        </div>
        <i class="pull-right"></i>
      </a>
      <ul id="g3w-catalog-views" class="treeview-menu" >
        <li style="padding: 5px">
          <div v-for="(view, index) in views" :key="view.name">
            <input type="radio" name="radio" :id="`g3w-view-${index}`" :value="view.name" v-model="currentview" class="magic-radio" :checked="view.default">
            <label :for="`g3w-view-${index}`" class="" style="display: flex; justify-content: space-between;">
              <span>{{ view.name }}</span>
            </label>
          </div>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script>
  export default {
    name: "changeviews",
    data(){
      const currentview = this.views.find(view => view.default).name;
      return {
        currentview
      }
    },
    props: {
      views: {
        type: Array,
        default: []
      }
    },
    watch: {
      'currentview': {
        immediate: false,
        handler(view){
          //emeit event and close menu
          this.$emit('change-view', view);
          $(this.$refs['g3w-view-ancor']).click();
        }
      }
    },
    created() {}
  }
</script>

<style scoped>

</style>