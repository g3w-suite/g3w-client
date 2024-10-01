<!--
  @file
  @since v3.7
-->

<template>
  <div id = "project-catalog">

    <!-- METADATA TABS -->
    <div
      id     = "project-catalog-container"
      :class = "isMobile() ? 'mobile' : null"
    >
      <ul role = "tablist" class = "nav nav-tabs metadata-nav-bar">
        <li v-for="tab in ['general', 'spatial', 'layers']" :class = "{ active: 'general' === tab }">
          <a data-toggle="tab" :href="'#metadata_' + tab" :class="'metadata-item-tab '+ tab">
            <i class="action-button" :class="g3wtemplate.getFontClass(({general: 'info', spatial: 'globe', layers: 'bars' })[tab])" aria-hidden="true"></i>
            <b v-t = "'sdk.metadata.groups.'+ tab +'.title'"></b>
          </a>
        </li>
      </ul>
    </div>

    <div class = "col-sm-12 metadata-body tab-content">

      <!-- GENERAL METADATA | SPATIAL METADATA -->
      <div v-for="item in ['general', 'spatial']" :id = "'metadata_' + item" class = "tab-pane fade" :class="{ in: 'general' === item, active: 'general' === item }">
        <div v-for = "(data, field) in $options.state.groups[item]" class = "row row-info">
          <div class="wrap-content-tab">
            <div class="col-sm-2 metadata-label" v-t="data.label"></div>

            <div v-if="'keywords' === field || 'wms_url'=== field" class="col-sm-10 value">
              <span>{{ [].concat(data.value).join(', ') }}</span>
            </div>
            
            <div v-else-if="'abstract' === field || (!Array.isArray(data.value) && typeof data.value !== 'object')" class="col-sm-10 value">
              <span v-html="data.value"></span>
            </div>
            
            <div v-else-if="'contactinformation' !== field" class="col-sm-10 value">
              <div v-for = "(value, index) in data.value">
                <span v-if="'extent' === field" class="bbox-labels">{{ (['MINX', 'MINY', 'MAXX', 'MAXY'])[index] }}</span>
                <span>{{ value }}</span>
              </div>
            </div>

            <div v-else class = "col-sm-10 value">
              <div v-for = "(value, info) in data.value">
                <div class = "row metadata-contact-row">
                  <div class = "col-sm-2 metadata-contact-label">
                    <i class = "contact-icon" :class = "g3wtemplate.getFontClass(({ contactelectronicmailaddress: 'mail', personprimary: 'user', contactvoicetelephone: 'mobile' })[info])" aria-hidden = "true"></i>
                    <span v-t="`sdk.metadata.groups.general.fields.subfields.contactinformation.${info}`"></span>
                  </div>
                  <div v-if = "'personprimary' === info" class = "col-sm-10">
                    <div v-for = "(subvalue, key) in value">
                      <span v-t="`sdk.metadata.groups.general.fields.subfields.contactinformation.${key}`" class="metadata-contact-label"> </span>
                      <span>{{ subvalue }}</span>
                    </div>
                  </div>
                  <div v-else-if = "'contactelectronicmailaddress' === info " class = "col-sm-10"><a :href = "`mailto: ${sanitizeValue(value)}`"><b>{{sanitizeValue(value)}}</b></a></div>
                  <div v-else class = "col-sm-10">{{ sanitizeValue(value) }}</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- LAYERS METADATA -->
      <div id="metadata_layers" class = "tab-pane fade">
        <div v-for = "layer in $options.state.groups.layers.layers.value" class = "row-info">

          <h4
            @click       = "showHideInfo"
            class        = "layer_header"
            data-toggle  = "collapse"
            :data-target = "`#${layer.id}`"
          >
            <i :class="'layer-header-icon action-button ' + g3wtemplate.font['NoGeometry' === layer.geometrytype ? 'table' : 'map']" aria-hidden="true"></i>
            <span class = "layer-name">{{ layer.name }}</span>
            <span class = "action-button open-close" :class = "g3wtemplate.getFontClass('plus')"></span>
          </h4>

          <div :id = "layer.id" class = "collapse">

            <ul class = "metadata-nav-tabs nav nav-tabs layer-nav-tabs" role = "tablist">

              <!-- LAYER GENERAL TAB -->
              <li role = "presentation" class = "active spatial-tab">
                <a v-t="'sdk.metadata.groups.layers.groups.general'" :href="`#layer_general_${layer.id}`" aria-controls="general" role="tab" data-toggle="tab"></a>
              </li>

              <!-- LAYER SPATIAL TAB -->
              <li v-if="'NoGeometry' !== layer.geometrytype" role="presentation" class="spatial-tab">
                <a v-t="'sdk.metadata.groups.layers.groups.spatial'" :href="`#layer_spatial_${layer.id}`" aria-controls="profile" role="tab" data-toggle="tab"></a>
              </li>

            </ul>

            <div class = "tab-content layer-tab-content">
              <div
                role  = "tabpanel"
                class = "tab-pane active"
                :id   = "`layer_general_${layer.id}`"
              >
                <div class="container-fluid">
                  <template v-for="attr in ['metadata.title', 'name', 'source', 'metadata.abstract', 'metadata.keywords', 'metadata.metadataurl.onlineresource', 'metadata.dataurl.onlineresources', 'metadata.attributes']">
                    <div v-if  = "undefined !== attr.split('.').reduce((a, b) => a[b], layer)" class="row layer-row">
                      <div v-t = "'sdk.metadata.groups.layers.fields.subfields.' + attr.replace('metadata.', '').split('.')[0]" class = "col-md-2 col-sm-12 metadata-label"></div>

                      <!-- LAYER TITLE -->
                      <div v-if="'metadata.title' === attr" class = "col-md-10 col-sm-12 value">{{ layer.metadata.title }}</div>

                      <!-- LAYER NAME -->
                      <div v-if="'name' === attr" class = "col-md-10 col-sm-12 value">{{ layer.name }}</div>

                      <!-- LAYER SOURCE -->
                      <div v-if="'source' === attr" class = "col-md-10 col-sm-12 value">{{ layer.source.type }}</div>

                      <!-- LAYER ABSTRACT -->
                      <div v-if="'metadata.abstract' === attr" class = "col-md-10 col-sm-12 value" v-html = "layer.metadata.abstract"></div>

                      <!-- LAYER KEYWORDS -->
                      <div v-else-if="'metadata.keywords' === attr" class = "col-md-10 col-sm-12 value">{{ layer.metadata.keywords.join(', ') }}</div>

                      <!-- LAYER METADATA URL -->
                      <div v-else-if="'metadata.metadataurl.onlineresource' === attr" class = "col-md-10 col-sm-12 value">
                        <a :href = "layer.metadata.metadataurl.onlineresources">{{ layer.metadata.metadataurl.onlineresources }}</a>
                      </div>

                      <!-- LAYER DATA URL -->
                      <div v-else-if="'metadata.dataurl.onlineresources' === attr" class = "col-md-10 col-sm-12 value">
                        <a :href = "layer.metadata.dataurl.onlineresources">{{ layer.metadata.dataurl.onlineresources }}</a>
                      </div>

                      <!-- LAYER ATTRIBUTES -->
                      <div v-else-if="'metadata.attributes' === attr" class = "col-md-10 col-sm-12 value" style = "overflow: auto;">
                        <table class = "table table-striped" style = "background-color: #eee !important">
                          <thead>
                            <tr><th v-for = "(value, header) in layer.metadata.attributes[0]">{{ header }}</th></tr>
                          </thead>
                          <tbody>
                            <tr v-for = "a in layer.metadata.attributes">
                              <td v-for = "(value, header) in a">{{ value }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                    </div>
                  </template>
                </div>
              </div>
              <div
                role  = "tabpanel"
                class = "tab-pane"
                :id   ="`layer_spatial_${layer.id}`"
              >
                <div class = "container-fluid">
                  <template v-for="attr in ['crs', 'geometrytype', 'bbox', 'metadata.crs']">
                    <div v-if  = "undefined !== attr.split('.').reduce((a, b) => a[b], layer)" class="row layer-row">
                      <div v-if="'metadata.crs' === attr" class = "col-md-2 col-sm-12 metadata-label">CRS</div>
                      <div v-else v-t = "'sdk.metadata.groups.layers.fields.subfields.' + attr.replace('metadata.', '').split('.')[0]" class = "col-md-2 col-sm-12 metadata-label"></div>

                      <!-- LAYER EPSG -->
                      <div v-if="'crs' === attr" class = "col-sm-10 value">{{ layer.crs.epsg }}</div>

                      <!-- LAYER TYPE -->
                      <div v-else-if="'geometrytype' === attr" class = "col-sm-10 value">{{ layer.geometrytype }}</div>

                      <!-- LAYER BBOX -->
                      <div v-else-if="'bbox' === attr" class = "col-sm-10 value">
                        <p v-for = "(value, key) in layer.bbox">
                          <span style = "font-weight: bold; margin-right: 5px;">{{ key }}</span>
                          <span>{{ value }}</span>
                        </p>
                      </div>

                      <!-- LAYER CRS -->
                      <div v-else-if="'metadata.crs' === attr" class = "col-sm-10 value">
                        <div v-for = "crs in layer.metadata.crs">
                          <span>{{ crs }}</span>
                        </div>
                      </div>
                    </div>

                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>

  export default {
    name: "project",
    methods: {
      showHideInfo(e) {
        const box       = e.target.closest(".layer_header");
        box.querySelector(".open-close").classList.toggle('fa-plus');
        box.querySelector(".open-close").classList.toggle('fa-minus');
      },
      sanitizeValue(value) {
        if (Array.isArray(value) || ('object' === typeof value && null !== value)) {
          value = Object.values(value).length ? value : '';
        }
        return value;
      },
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

  .h_100 {
    height: 100%;
  }

  #project-catalog {
    position: relative;
    overflow: auto;
  }

  .nav-tabs {
    border-bottom: 0 none;
  }

  .metadata-label {
    font-weight: bold;
    font-size: 1.1em;
  }

  .bbox-labels {
    font-weight: bold;
  }

  .metadata-contact-label {
    font-weight: bold;
  }

  .contact-icon {
    margin-right: 3px;
  }

  .metadata-contact-row {
    margin-bottom: 5px;
  }

  .layer_header {
    padding: 5px;
    margin-bottom: 0;
    margin-top:0;
    cursor: pointer;
  }

  .layer-name {
    font-weight: bold;
  }

  .layer-header-icon {
    margin-right: 10px;
    color: #999;
  }

  .layer_header span.open-close {
    position: absolute;
    right: 5px;
    color: #999;
  }

  .layer-row {
    padding: 10px;
    border-bottom: 1px solid #e2e2e2;
  }

  .layer-nav-tabs {
    border-bottom: 0 solid #DDD;
  }

  .layer-nav-tabs > li.active > a,
  .layer-nav-tabs > li.active > a:focus,
  .layer-nav-tabs > li.active > a:hover {
    border-width: 0;
  }

  .layer-nav-tabs > li > a {
    border: none;
    color: #aeaeae;
  }

  .layer-nav-tabs > li.active > a,
  .layer-nav-tabs > li > a:hover {
    border: none;
    background: transparent;
  }

  .layer-nav-tabs > li > a::after {
    content: "";
    height: 2px;
    position: absolute;
    width: 100%;
    left: 0px;
    bottom: -1px;
    transition: all 250ms ease 0s;
    transform: scale(0);
  }

  .layer-nav-tabs > li.active > a::after,
  .layer-nav-tabs > li:hover > a::after {
    transform: scale(1);
  }

  .layer-tab-content {
    margin: 10px;
    background-color: #eeeeee;
    overflow: auto;
  }

  .spatial-tab {
    font-weight: bold;
  }

  .metadata-nav-tabs > li.active > a,
  .metadata-nav-tabs > li > a:hover {
    color: var(--skin-color) !important;
  }
  
  .metadata-nav-tabs > li > a::after {
    background: var(--skin-color);
  }

  .metadata-nav-bar .action-button:hover {
    background-color: transparent;
  }
</style>