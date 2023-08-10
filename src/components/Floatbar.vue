<!--
  @file
  @since v3.7
-->

<template>
  <aside class="control-sidebar control-sidebar-light" >
    <a v-show="panelsinstack" href="#" class="floatbar-aside-toggle" data-toggle="control-sidebar" role="button">
      <span class="sr-only">Expand</span>
    </a>
    <div id="floatbar-spinner" style="position:absolute"></div>
    <div v-show="panelsinstack" class="g3w-sidebarpanel">
      <div v-if="closable" class="row">
        <div class="col-xs-12 col-sm-12 col-md-12">
          <button :class="g3wtemplate.getFontClass('close')" class="pull-right close-panel-button" @click="closePanel"></button>
        </div>
      </div>
      <div v-if="panelname">
        <h4 class="g3w-floatbarpanel-name">{{ panelname }}</h4>
      </div>
      <div id="g3w-floatbarpanel-placeholder" class="g3w-floatbarpanel-placeholder"></div>
    </div>
  </aside>
</template>

<script>
  import floatbarService from 'services/floatbar';

  export default {
    name: "Floatbar",
    data() {
    return {
      stack: floatbarService.stack.state,
    };
  },
    computed: {
      // active panels on stack
      panelsinstack(){
        return this.stack.contentsdata.length>0;
      },
      panelname(){
        let name;
        if (this.stack.contentsdata.length){
          name = this.stack.contentsdata.slice(-1)[0].content.getTitle();
        }
        return name;
      },
      closable() {
        return floatbarService.closable;
      }
    },
    watch: {
      "stack.contentsdata"() {
        const children = $("#g3w-floatbarpanel-placeholder").children();
        children.forEach((child, index) => {
          if (index == children.length-1) $(child).show();
          else $(child).hide();
        })
      }
    },
    methods: {
      closePanel(){
        floatbarService.closePanel();
      }
    }

  }
</script>