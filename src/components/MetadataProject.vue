<!--
  @file
  @since v3.7
-->

<template>
  <!-- Modal -->
  <div
    class    = "modal fade"
    id       = "modal-metadata"
    tabindex = "-1"
  >
    <div class = "modal-dialog" style="min-width: 80vw;">
      <div class = "modal-content">

        <!-- METADATA TABS -->
        <ul role = "tablist" class = "modal-header nav nav-tabs">
          <li v-for="tab in ['general', 'spatial', 'layers', 'credits']" :class = "{ active: 'general' === tab }">
            <a data-toggle="tab" :href="'#metadata_' + tab" :class="'metadata-item-tab '+ tab">
              <i class="action-button" :class="$fa(({ general: 'info', spatial: 'globe', layers: 'bars', credits: 'copyright' })[tab])" aria-hidden="true"></i>
              <b v-t = "'sdk.metadata.groups.'+ tab +'.title'"></b>
            </a>
          </li>
        </ul>

        <div id = "project-catalog" class="modal-body" style="min-height: 65vh; max-height: 70vh;">

          <div class = "tab-content">

            <!-- GENERAL METADATA | SPATIAL METADATA -->
            <div v-for="item in ['general', 'spatial']" :id = "'metadata_' + item" class = "tab-pane fade" :class="{ in: 'general' === item, active: 'general' === item }">
              <div v-for = "(data, field) in groups[item]" class = "row row-info">
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
                          <i class = "contact-icon" :class = "$fa(({ contactelectronicmailaddress: 'mail', personprimary: 'user', contactvoicetelephone: 'mobile' })[info])" aria-hidden = "true"></i>
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
              <div v-for = "layer in groups.layers.layers.value" class = "row-info">

                <h4
                  @click       = "showHideInfo"
                  class        = "layer_header"
                  data-toggle  = "collapse"
                  :data-target = "`#${layer.id}`"
                >
                  <i :class="'layer-header-icon action-button ' + g3wtemplate.font['NoGeometry' === layer.geometrytype ? 'table' : 'map']" aria-hidden="true"></i>
                  <span class = "layer-name">{{ layer.name }}</span>
                  <span class = "action-button open-close" :class = "$fa('plus')"></span>
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

            <!-- MODAL CREDITS -->
            <div
              id       = "metadata_credits"
              class    = "tab-pane fade"
            >
              <div
                v-if   = "!!customcredits"
                class  = "customcredits"
                v-html = "customcredits"
              ></div>

              <div
                v-if  = "powered_by"
                class = "g3w-credits-block"
              >
                <div
                  v-t   = "'credits.g3wSuiteFramework'"
                  style = "padding: 5px;"
                  class = "credit-title-logo">
                </div>
                <a
                  target = "_blank"
                  href   = "https://g3wsuite.it/"
                >
                  <img
                    class = "g3w-suite-logo"
                    :src  = "`${urls.clienturl}images/g3wsuite_logo.png`"
                    alt   = ""
                  />
                </a>
                <div v-t = "'credits.g3wSuiteDescription'" style = "margin-top: 10px;"></div>
              </div>

              <div
                v-if    = "powered_by"
                v-t:pre = "'credits.productOf'"
                class   = "credit-title-logo g3w-credits-block"
                style   = "font-size: 1em; display: flex; justify-content: center"
              >
                <a
                  style  = "text-align: center!important;"
                  href   = "http://www.gis3w.it"
                  target = "_blank"
                >
                  <img
                    width = "60"
                    style = "margin-left: 5px"
                    :src  = "`${urls.clienturl}images/logo_gis3w_156_85.png`"
                    class = "img-responsive center-block"
                    alt   = ""
                  />
                </a>
              </div>

              <address
              v-if    = "powered_by"
                id    = "address-credits"
                style = "line-height: 1.3; text-align: center; margin-top: 5px; display: flex; justify-content: center; gap: 2px;"
              >
                <span><b :class = "$fa('marker')" style = "color: #95ad36;" aria-hidden="true"></b> Montecatini Terme - Italy</span>
                <span><i :class = "$fa('mobile')" style = "color: #95ad36"  aria-hidden="true"></i> <a href = "tel:+393938534336"    style = "color:#000">+39 393 8534336</a></span>
                <span><i :class = "$fa('mail')"   style = "color: #95ad36"  aria-hidden="true"></i> <a href = "mailto:info@gis3w.it" style = "color:#000">info@gis3w.it</a></span>
              </address>

              <div
                v-if  = "powered_by"
                style = "display: flex;justify-content: center;gap: 20px;"
              >
                <a :href="docs_url" rel="nofollow">📖 Docs</a>
                <a href="mailto:info@gis3w.it?subject=Sponsoring%20G3W-SUITE%20development&amp;body=Hi%20there,%20I'd%20like%20to%20fund%20some%20code%20changes:">❤️ Sponsor</a>
                </div>

            </div>
        
          </div>

        </div>

        <div class = "modal-footer" style="position: relative; background: #fff;">
          <button
            v-t          = "'close'"
            type         = "button"
            class        = "btn btn-default"
            data-dismiss = "modal"
          ></button>
        </div>

      </div>
    </div>
  </div>
</template>

<script>

  import ApplicationState from 'store/application';
  import { XHR }          from 'utils/XHR';

  export default {

    name: "metadata-project",

    data() {
      const project = ApplicationState.project.getState();
      const version = window.initConfig.version.split('-')[0].split('.');

      return {
        customcredits: false,
        powered_by:    window.initConfig.powered_by,
        urls:          window.initConfig.urls,
        docs_url:      `https://g3w-suite.readthedocs.io/en/v${version[0].replace('v','')}.${version[1]}.x/`,
        groups: Object.entries({
          general: [ 'title', 'name', 'description', 'abstract', 'keywords', 'fees', 'accessconstraints', 'contactinformation', 'wms_url' ],
          spatial: [ 'crs', 'extent' ],
          layers:  [ 'layers' ],
        }).reduce((g, [name, fields]) => {
          g[name] = fields.reduce((f, field) => {
            const value = project.metadata && project.metadata[field] ? project.metadata[field] : project[field];
            if (value) {
              f[field] = { value, label: `sdk.metadata.groups.${name}.fields.${field}` };
            }
            return f;
          }, {});
          return g;
        }, {}),
      };
    },

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

    },

    async created() {
      if (!!window.initConfig.credits) {
        try {
          const credits = await XHR.get({ url: window.initConfig.credits });
          this.customcredits = 'None' !== credits && credits;
        } catch (e) {
          console.warn(e);
        }
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

  #project-catalog {
    background: transparent;
  }

  .modal-header.nav {
    display: flex;
    gap: 1px;
    justify-content: space-between;
  }

  .modal-header.nav li {
    background-color: #e4e4e4;
    width: 100%;
  }

  .modal-header.nav li.active {
    background-color: #FFF;
  }

  .modal-header.nav li.active a.metadata-item-tab {
    border-bottom-color: #222d32 !important;
    border-bottom-width: 4px;
    background-color: transparent !important;
    color: #2c3b41 !important;
  }

  .modal-header.nav li a.metadata-item-tab {
    height: 100%;
    margin:0;
    font-size: 1.1em;
    border-top: 0;
    border-right: 0;
    border-left: 0;
    border-bottom: 4px solid #e2e2e2;
  }

  .modal-header.nav li a {
    text-align: center;
  }

  .modal-header.nav li a i {
    margin-right: 5px;
  }

  .metadata-item-tab {
    margin-right: 10px;
    border-radius: 3px;
    margin-bottom: 10px;
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

  .modal-header.nav .action-button:hover {
    background-color: transparent;
  }

  .credit-title-logo {
    font-weight: bold;
    font-size: 1.2em;
    margin-bottom: 15px;
  }
  .g3w-credits-block {
    text-align: center!important;
    margin-bottom: 20px;
  }
  .g3w-suite-logo {
    width: 50% !important;
  }
  .customcredits {
    margin-bottom : 10px;
    margin-top: 5px;
    text-align: center;
  }
  #address-credits span {
    padding-left: 3px;
  }
</style>