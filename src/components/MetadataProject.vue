<!--
  @file
  @since v3.7
-->

<template>
  <div id = "project-catalog">
    <div
      id     = "project-catalog-container"
      style  = "padding:0"
      :class = "isMobile() ? 'mobile' : null"
    >
      <ul role = "tablist" class = "nav nav-tabs metadata-nav-bar">
        <!-- GENERAL TAB -->
        <li class = "active">
          <a
            data-toggle = "tab"
            href        = "#general"
            class       = "metadata-item-tab general"
          >
            <i
              class       = "action-button nohover"
              :class      = "g3wtemplate.getFontClass('info')"
              aria-hidden = "true">
            </i>
            <span v-t = "'sdk.metadata.groups.general.title'" style = "font-weight: bold"></span>
          </a>
        </li>
        <!-- SPATIAL INFO TAB -->
        <li>
          <a
            data-toggle = "tab"
            href        = "#spatial"
            class       = "metadata-item-tab spatial"
          >
            <i
              class       = "action-button nohover"
              :class      = "iconsClass.globe"
              aria-hidden = "true">
            </i>
            <span v-t = "'sdk.metadata.groups.spatial.title'" style = "font-weight: bold"></span>
          </a>
        </li>
        <!-- LAYERS TAB -->
        <li>
          <a
            data-toggle = "tab"
            href        = "#metadata_layers"
            class       = "metadata-item-tab layers"
          >
            <i
              class       = "action-button nohover"
              :class      = "iconsClass.bars"
              aria-hidden = "true">
            </i>
            <span v-t = "'sdk.metadata.groups.layers.title'" style = "font-weight: bold"></span>
          </a>
        </li>
      </ul>
    </div>
    <div class = "col-sm-12 metadata-body tab-content">
      <div id = "general" class = "tab-pane fade in active">
        <template>
          <div v-for = "(data, key) in state.groups.general" class = "row h_100 row-info">
            <component :data = "data" :fieldName = "key" :is = "setComponent(key)"/>
          </div>
        </template>
      </div>
      <div id = "spatial" class = "tab-pane fade">
        <div>
          <template>
            <div v-for = "(data, key) in state.groups.spatial" class = "row row-info">
              <component :data = "data" :fieldName = "key" :is = "setComponent(key)"/>
            </div>
          </template>
        </div>
      </div>
      <div id = "metadata_layers" class = "tab-pane fade">
        <metadata-layer :state = "layer" v-for = "layer in state.groups.layers.layers.value"/>
      </div>
    </div>
  </div>
</template>

<script>
  import Layer                   from 'components/MetadataLayer.vue';
  import MetadataTabContent      from 'components/MetadataProjectTabContent.vue';
  import MetadataBBOXContent     from 'components/MetadataProjectBBoxContent.vue';
  import MetadataContactsContent from 'components/MetadataProjectContactsContent.vue';

  export default {
    name: "project",
    data() {
      return {
        state: this.$options.state,
        iconsClass: {
          info:  this.g3wtemplate.getFontClass("info-circle"),
          globe: this.g3wtemplate.getFontClass("globe"),
          bars:  this.g3wtemplate.getFontClass("bars")
        }
      }
    },
    components: {
      'metadata-layer':            Layer,
      'metadata-tab-content':      MetadataTabContent,
      'metadata-bbox-content':     MetadataBBOXContent,
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
    }
  }
</script>

<style scoped>
  .metadata-item-tab.general {
    color: var(--skin-primary);
  }
  .metadata-item-tab.layers  {
    color: var(--skin-warning);
  }
  .metadata-item-tab.spatial {
    color: var(--skin-success);
  }

  .metadata-nav-tabs > li.active > a,
  .metadata-nav-tabs > li > a:hover {
    color: var(--skin-color) !important;
  }
  
  .metadata-nav-tabs > li > a::after {
    background: var(--skin-color);
  }

  #project-catalog {
    background: transparent;
  }

  #project-catalog-container.mobile .metadata-nav-bar li a.metadata-item-tab {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
  }
  
  .metadata-nav-bar {
    display: flex;
    justify-content: space-between;
  }

  .metadata-nav-bar li {
    background-color: #e4e4e4;
    border-radius: 3px;
    padding: 0;
    width: 100%;
    margin:1px;
  }

  .metadata-nav-bar li.active {
    background-color: #FFF;
  }

  .metadata-nav-bar li.active a.metadata-item-tab {
    border-bottom-color: #222d32 !important;
    border-bottom-width: 4px;
    background-color: transparent !important;
    color: #2c3b41 !important;
  }

  .metadata-nav-bar li a.metadata-item-tab {
    height: 100%;
    margin:0;
    font-size: 1.1em;
    border-top: 0;
    border-right: 0;
    border-left: 0;
    border-bottom: 4px solid #e2e2e2;
  }

  .metadata-nav-bar li a {
    text-align: center;
  }
  .metadata-nav-bar li a i {
    margin-right: 5px;
  }
  .metadata-item-tab {
    margin-right: 10px;
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
    border-radius: 3px;
    margin-bottom: 10px;
  }

  .metadata-body {
    background: #FFF;
    margin-top: 5px;
    border-radius: 3px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    overflow-y: auto;
    overflow-x: hidden;
    padding-left: 0;
    padding-right: 0;
  }

  .tab-title {
    position: absolute;
    bottom: 10px;
    right: auto;
  }

  .row-info {
    margin: 0 !important;
    padding-top: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eeeeee;
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

  .left-vertical-tabs {
    padding-left: 0 !important;
  }
</style>
