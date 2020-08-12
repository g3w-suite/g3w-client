<template>
  <div id="project-catalog">
    <h3 class="content-header-component skin-color">{{ state.name }}</h3>
    <div id="project-catalog-container" style="padding:0">
      <ul role="tablist" class="nav nav-tabs metadata-nav-bar">
        <li class="active">
          <a data-toggle="tab" href="#general"  class="metadata-item-tab general">
            <i :class="g3wtemplate.getFontClass('info')" aria-hidden="true"></i>
            <span v-t="'sdk.metadata.groups.general.title'"  style="font-weight: bold"></span>
          </a>
        </li>
        <li>
          <a data-toggle="tab" href="#spatial" class="metadata-item-tab spatial">
            <i :class="iconsClass.globe"  aria-hidden="true"></i>
            <span v-t="'sdk.metadata.groups.spatial.title'" style="font-weight: bold"></span>
          </a></li>
        <li>
          <a data-toggle="tab" href="#layers" class="metadata-item-tab layers">
            <i :class="iconsClass.bars" aria-hidden="true"></i>
            <span v-t="'sdk.metadata.groups.layers.title'"  style="font-weight: bold"></span>
          </a>
        </li>
      </ul>
    </div>
    <div class="col-sm-12 metadata-body tab-content">
            <div id="general" class="tab-pane fade in active nano-content">
              <template>
                <div v-for="(data, key) in state.groups.general" class="row h_100 row-info">
                  <component :data="data" :fieldName="key" :is="setComponent(key)"></component>
                </div>
              </template>
            </div>
            <div id="spatial" class="tab-pane fade">
              <div class="container-fluid">
                <template>
                  <div v-for="(data, key) in state.groups.spatial" class="row row-info">
                    <component :data="data" :fieldName="key" :is="setComponent(key)"></component>
                  </div>
                </template>
              </div>
            </div>
            <div id="layers" class="tab-pane fade">
              <metadata-layer :state="layer" v-for="layer in state.groups.layers.layers.value"></metadata-layer>
            </div>
          </div>
    </div>
</template>

<script>
  import Layer from '../layer/layer.vue';
  import MetadataTabContent from './metadatatabcontent.vue';
  import MetadataBBOXContent from './metadatabboxcontent.vue';
  import MetadataContactsContent from './metadatacontactscontent.vue';
  const {resizeMixin} = require('gui/vue/vue.mixins');
  export default {
    name: "project",
    mixins: [resizeMixin],
    data() {
      return {
        state: this.$options.state,
        iconsClass: {
          info: this.g3wtemplate.getFontClass("info-circle"),
          globe: this.g3wtemplate.getFontClass("globe"),
          bars: this.g3wtemplate.getFontClass("bars")
        }
      }
    },
    components: {
      'metadata-layer': Layer,
      'metadata-tab-content': MetadataTabContent,
      'metadata-bbox-content': MetadataBBOXContent,
      'metadata-contacts-content': MetadataContactsContent
    },
    methods: {
      resize(){
        const projectcatalogheight = $('#project-catalog').outerHeight();
        const titleHeight= $('.content-header-component').outerHeight();
        const metadatanavbarHeight = $('.metadata-nav-bar').outerHeight();
        $('.metadata-body').height(projectcatalogheight - titleHeight - metadatanavbarHeight - 50);
      },
      isArrayorObject(value) {
        return Array.isArray(value) || typeof value === 'object';
      },
      setComponent(key) {
        let component;
        switch(key) {
          case 'extent':
            component = 'metadata-bbox-content';
            break;
          case 'contactinformation':
            component = 'metadata-contacts-content';
            break;
          default:
            component = 'metadata-tab-content';
        }
        return component;
      }
    },
    async mounted() {
      await this.$nextTick();
    },

  }
</script>

<style scoped>
  .metadata-item-tab {
    margin-right: 10px;
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
    border-radius: 3px;
    margin-bottom: 10px;
  }

  .metadata-body {
    overflow-y: auto;
    overflow-x: hidden;
    padding-left: 0;
  }

  .metadata-body div {
    margin-top: 10px;
  }

  .tab-title {
    position: absolute;
    bottom: 10px;
    right: auto;
  }

  .row-info {
    padding-bottom: 5px;
    border-bottom: 1px solid #e2e2e2;
  }

  .row-info .label {
    font-weight: bold;
  }

  .h_90 {
    height: 90%;
  }
  .h_100 {
    height: 100%;
  }

  #project-catalog {
    position: relative;
    overflow: auto;
  }
  .nav-tabs-wrapper {
    display: inline-block;
    margin-bottom: -6px;
    margin-left: 1.25%;
    margin-right: 1.25%;
    position: relative;
    width: 100%;
  }

  .nav-tabs {
    border-bottom: 0 none;
  }
  .nav-stacked {
    font-size: 1.2em;
    font-weight: 700;
    padding: 10px 0;
  }
  .nav-stacked li a {
    color: #ffffff;
  }

  .left-vertical-tabs {
    padding-left: 0 !important;
  }



</style>
