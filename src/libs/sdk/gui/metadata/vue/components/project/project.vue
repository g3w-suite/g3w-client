<template>
  <div id="project-catalog">
    <h2>{{ state.name }}</h2>
    <div id="project-catalog-container" class="container-fluid h_90">
      <div class="row h_100" >
        <div class="col-sm-3 metadata-header left-vertical-tabs">
          <div class="nav-tabs-wrapper stacked">
            <ul role="tablist" class="nav nav-tabs  nav-stacked">
              <li class="active">
                <a data-toggle="tab" href="#general" class="metadata-item-tab general">
                  <div class="title title_center">
                    <i :class="iconsClass.info" class="fa-2x" aria-hidden="true"></i>
                  </div>
                  <div v-t="'sdk.metadata.groups.general.title'" class="tab-title"></div>
                </a>
              </li>
              <li>
                <a data-toggle="tab" href="#spatial" class="metadata-item-tab spatial">
                  <div class="title title_center">
                    <i :class="iconsClass.globe" class="fa-2x" aria-hidden="true"></i>
                  </div>
                  <div v-t="'sdk.metadata.groups.spatial.title'" class="tab-title"></div>
                </a></li>
              <li>
                <a data-toggle="tab" href="#layers"  class="metadata-item-tab layers">
                  <div class="title title_center">
                    <i :class="iconsClass.bars" class="fa-2x" aria-hidden="true"></i>
                  </div>
                  <div v-t="'sdk.metadata.groups.layers.title'" class="tab-title"></div>
                </a>
              </li>
            </ul>
        </div>
        </div>
        <div class="col-sm-9 metadata-body tab-content">
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
      </div>
    </div>
</template>

<script>
  import Layer from '../layer/layer.vue';
  import MetadataTabContent from './metadatatabcontent.vue';
  import MetadataBBOXContent from './metadatabboxcontent.vue';
  import MetadataContactsContent from './metadatacontactscontent.vue';
  export default {
    name: "project",
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
    mounted() {
      this.$nextTick(() => {
      })
    }
  }
</script>

<style scoped>
  .metadata-item-tab {
    height: 90px;
    margin-right: 10px;
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
    border-radius: 3px;
    margin-bottom: 10px;
  }

  .metadata-item-tab.spatial {
    background-color: #019A4C;
  }

  .metadata-item-tab.layers {
    background-color: #FF9B21;
  }

  .metadata-body {
    overflow-y: auto;
    overflow-x: hidden;
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
    padding: 3px 10px 3px 10px;
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

  .nav-tabs > li.active > a {
    background-color: #2c3b41 !important;
  }


</style>
