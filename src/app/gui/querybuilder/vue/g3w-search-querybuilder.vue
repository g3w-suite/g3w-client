<template>
  <li>
    <div style="position:relative">
      <bar-loader :loading="loading"></bar-loader>
      <div class="querybuliserch-tools" style="display:flex; align-items: baseline">
        <i :class="g3wtemplate.getFontClass('filter')" style="margin-right: 14px; margin-left: 1px;"></i>
        <span style="white-space: pre-wrap">{{querybuildersearch.name}}</span>
        <div style="margin-left: auto">
          <span class="icon-search-action skin-tooltip-bottom" data-placement="bottom" data-toggle="tooltip" v-t-tooltip="'sdk.querybuilder.search.run'">
            <i @click.stop="run" style="color: green;  padding: 3px; font-size: 1.3em;" :class="g3wtemplate.getFontClass('run')"></i>
          </span>
          <span class="icon-search-action skin-tooltip-bottom"  data-placement="bottom" data-toggle="tooltip" v-t-tooltip="'sdk.querybuilder.search.info'">
            <i @click.stop="showinfo=!showinfo" style="color: #FFFFFF; padding: 3px; font-size: 1.3em;" :class="g3wtemplate.getFontClass('info')"></i>
          </span>
          <span class="icon-search-action skin-tooltip-bottom"  data-placement="bottom" data-toggle="tooltip" v-t-tooltip="'sdk.querybuilder.search.edit'">
            <i @click.stop="edit" style="color: #307095; padding: 3px; font-size: 1.3em;" :class="g3wtemplate.getFontClass('pencil')"></i>
          </span>
          <span class="icon-search-action skin-tooltip-bottom"  data-placement="bottom" data-toggle="tooltip" v-t-tooltip="'sdk.querybuilder.search.delete'">
            <i @click.stop="remove" style="color: red;  padding: 3px; font-size: 1.3em;" :class="g3wtemplate.getFontClass('trash')"></i>
          </span>
        </div>
      </div>
      <div class="querybuildsearch-info" v-show="showinfo" style="margin-top: 5px;">
        <div>
          <span style="font-weight: bold; white-space: pre">LAYER: </span>
          <span style="white-space: pre-wrap;">{{querybuildersearch.layerName}}</span>
        </div>
        <div>
          <span style="font-weight: bold;">EXPRESSION: </span>
          <span style="white-space: pre-wrap;">{{querybuildersearch.filter}}</span>
        </div>
      </div>
    </div>
  </li>
</template>

<script>
  import Service from '../service';
  QueryBuilderUIFactory = require('../querybuilderuifactory');
  export default {
    name: "g3w-querybuilder-search",
    props: {
      querybuildersearch: {
        required: true
      }
    },
    data() {
      return {
        loading: false,
        showinfo: false
      }
    },
    methods: {
      async remove(){
        try {
          await Service.delete(this.querybuildersearch);
          this.$emit('delete');
        } catch(err){}

      },
      edit(){
        QueryBuilderUIFactory.show({
          options: {
            id: this.querybuildersearch.id,
            name: this.querybuildersearch.name,
            layerId: this.querybuildersearch.layerId,
            filter:  this.querybuildersearch.filter
          }
        });
      },
      run() {
        this.loading = true;
        Service.run({
          layerId: this.querybuildersearch.layerId,
          filter:  this.querybuildersearch.filter
        }).finally(()=>{
          this.loading = false;
        })
      }
    }
  }
</script>

<style scoped>

</style>
