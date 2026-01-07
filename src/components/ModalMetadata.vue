<!--
  @file
  @since v3.7
-->

<template>
  <dialog
    id            = "modal-metadata"
    @beforetoggle = "onBeforetoggle"
    style         = "width: 80vw;"
  >
    <form method = "dialog">

      <!-- METADATA TABS -->
      <ul role = "tablist" class = "nav nav-tabs">
        <li v-for = "tab in ['general', 'spatial', 'layers', 'credits']" :class = "{ active: 'general' === tab }">
          <a data-toggle = "tab" :href="'#metadata_' + tab" :class = "'metadata-item-tab '+ tab">
            <i class = "action-button" :class = "$fa(({ general: 'info', spatial: 'globe', layers: 'bars', credits: 'copyright' })[tab])" aria-hidden = "true"></i>
            <b v-t = "'metadata.'+ tab +'.title'"></b>
          </a>
        </li>
      </ul>

      <div style="min-height: 65vh; max-height: 70vh; padding: 15px;overflow: auto;">

        <div class = "tab-content">

          <!-- GENERAL METADATA -->
          <div id = "metadata_general" class = "tab-pane active">
            <div v-for = "(data, field) in groups.general" class = "row row-info">
              <div class = "col-sm-2 metadata-label" v-t = "data.label"></div>

              <div v-if = "'keywords' === field || 'wms_url'=== field" class = "col-sm-10 value">
                <span>{{ [].concat(data.value).join(', ') }}</span>
              </div>
              
              <div v-else-if = "'abstract' === field || (!Array.isArray(data.value) && typeof data.value !== 'object')" class = "col-sm-10 value">
                <span v-html = "data.value"></span>
              </div>
              
              <div v-else-if ="'contactinformation' == field" class = "col-sm-10 value">
                <div v-for = "(value, info) in data.value">
                  <div class = "row metadata-contact-row">
                    <div class = "col-sm-2 metadata-contact-label">
                      <i class = "contact-icon" :class = "$fa(({ contactelectronicmailaddress: 'mail', personprimary: 'user', contactvoicetelephone: 'mobile' })[info])" aria-hidden = "true"></i>
                      <span v-t = "`metadata.general.fields.subfields.contactinformation.${info}`"></span>
                    </div>
                    <div v-if = "'personprimary' === info" class = "col-sm-10">
                      <div v-for = "(subvalue, key) in value">
                        <span v-t = "`metadata.general.fields.subfields.contactinformation.${key}`" class="metadata-contact-label"> </span>
                        <span>{{ subvalue }}</span>
                      </div>
                    </div>
                    <div v-else-if = "'contactelectronicmailaddress' === info " class = "col-sm-10"><a :href = "`mailto: ${sanitizeValue(value)}`"><b>{{sanitizeValue(value)}}</b></a></div>
                    <div v-else class = "col-sm-10">{{ sanitizeValue(value) }}</div>
                  </div>
                </div>
              </div>

              <div v-else class = "col-sm-10 value">
                <div v-for = "(key, index) in Object.keys(data.value)">
                  <b style = "margin-right: 10px;">{{ key }}</b><span>{{ data.value[key] }}</span>
                </div>
              </div>

            </div>
          </div>

          <!-- SPATIAL METADATA -->
          <div id = "metadata_spatial" class = "tab-pane">
            <div v-for = "(data, field) in groups.spatial" class = "row row-info">
              <div class = "col-sm-2 metadata-label" v-t = "data.label"></div>
              
              <div class = "col-sm-10 value">
                <div v-for = "(key, index) in Object.keys(data.value)">
                  <b style = "margin-right: 10px;">{{ 'extent' === field ? (['minx', 'miny', 'maxx', 'maxy'])[index] : key }}</b><span>{{ data.value[key] }}</span>
                </div>
              </div>

            </div>
          </div>

          <!-- LAYERS METADATA -->
          <div id = "metadata_layers" class = "tab-pane">
            <details v-for = "layer in groups.layers.layers.value" class = "row-info">
              <summary>
                <i :class ="'action-button ' + g3wtemplate.font['NoGeometry' === layer.geometrytype ? 'table' : 'map']" style="margin-right: 10px; color: #999;" aria-hidden = "true"></i>
                <b>{{ layer.name }}</b>
              </summary>

              <ul class = "nav nav-tabs layer-nav-tabs" role = "tablist">

                <!-- LAYER GENERAL TAB -->
                <li role = "presentation" class = "active spatial-tab">
                  <a v-t = "'metadata.layers.groups.general'" :href = "`#layer_general_${layer.id}`" aria-controls = "general" role = "tab" data-toggle = "tab"></a>
                </li>

                <!-- LAYER SPATIAL TAB -->
                <li v-if = "'NoGeometry' !== layer.geometrytype" role = "presentation" class = "spatial-tab">
                  <a v-t = "'metadata.layers.groups.spatial'" :href = "`#layer_spatial_${layer.id}`" aria-controls = "profile" role = "tab" data-toggle = "tab"></a>
                </li>

                <!-- LAYER SPATIAL TAB -->
                <li v-if = "'NoGeometry' !== layer.geometrytype" role = "presentation" class = "legend-tab">
                  <a :href = "`#layer_legend_${layer.id}`" aria-controls = "legend" role = "tab" data-toggle = "tab"> {{ ($t('legend')).toUpperCase() }}</a>
                </li>
              </ul>

              <div class = "tab-content layer-tab-content">
                <div
                  role  = "tabpanel"
                  class = "tab-pane active"
                  :id   = "`layer_general_${layer.id}`"
                  style = "padding: 0 15px;"
                >
                  <template v-for = "attr in ['metadata.title', 'name', 'source', 'metadata.abstract', 'metadata.keywords', 'metadata.metadataurl.onlineresource', 'metadata.dataurl.onlineresources', 'metadata.attributes']">
                    <div v-if = "undefined !== attr.split('.').reduce((a, b) => a[b], layer)" class = "row layer-row">
                      <div v-t = "'metadata.layers.fields.subfields.' + attr.replace('metadata.', '').split('.')[0]" class = "col-md-2 col-sm-12 metadata-label"></div>

                      <!-- LAYER TITLE -->
                      <div v-if = "'metadata.title' === attr" class = "col-md-10 col-sm-12 value">{{ layer.metadata.title }}</div>

                      <!-- LAYER NAME -->
                      <div v-if = "'name' === attr" class = "col-md-10 col-sm-12 value">{{ layer.name }}</div>

                      <!-- LAYER SOURCE -->
                      <div v-if = "'source' === attr" class = "col-md-10 col-sm-12 value">{{ layer.source.type }}</div>

                      <!-- LAYER ABSTRACT -->
                      <div v-if = "'metadata.abstract' === attr" class = "col-md-10 col-sm-12 value" v-html = "layer.metadata.abstract"></div>

                      <!-- LAYER KEYWORDS -->
                      <div v-else-if = "'metadata.keywords' === attr" class = "col-md-10 col-sm-12 value">{{ layer.metadata.keywords.join(', ') }}</div>

                      <!-- LAYER METADATA URL -->
                      <div v-else-if = "'metadata.metadataurl.onlineresource' === attr" class = "col-md-10 col-sm-12 value">
                        <a :href = "layer.metadata.metadataurl.onlineresources">{{ layer.metadata.metadataurl.onlineresources }}</a>
                      </div>

                      <!-- LAYER DATA URL -->
                      <div v-else-if = "'metadata.dataurl.onlineresources' === attr" class = "col-md-10 col-sm-12 value">
                        <a :href = "layer.metadata.dataurl.onlineresources">{{ layer.metadata.dataurl.onlineresources }}</a>
                      </div>

                      <!-- LAYER ATTRIBUTES -->
                      <div v-else-if = "'metadata.attributes' === attr" class = "col-md-10 col-sm-12 value" style = "overflow: auto;">
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
                <!-- LAYER SPATIAL TAB --> 
                <div
                  role  = "tabpanel"
                  class = "tab-pane"
                  :id   = "`layer_spatial_${layer.id}`"
                  style = "padding: 0 15px;"
                >
                  <template v-for = "attr in ['crs', 'geometrytype', 'bbox', 'metadata.crs']">
                    <div v-if  = "undefined !== attr.split('.').reduce((a, b) => a[b], layer)" class = "row layer-row">
                      <div v-if = "'metadata.crs' === attr" class = "col-md-2 col-sm-12 metadata-label">CRS</div>
                      <div v-else v-t = "'metadata.layers.fields.subfields.' + attr.replace('metadata.', '').split('.')[0]" class = "col-md-2 col-sm-12 metadata-label"></div>

                      <!-- LAYER EPSG -->
                      <div v-if = "'crs' === attr" class = "col-sm-10 value">{{ layer.crs.epsg }}</div>

                      <!-- LAYER TYPE -->
                      <div v-else-if = "'geometrytype' === attr" class = "col-sm-10 value">{{ layer.geometrytype }}</div>

                      <!-- LAYER BBOX -->
                      <div v-else-if = "'bbox' === attr" class = "col-sm-10 value">
                        <p v-for = "(value, key) in layer.bbox">
                          <span style = "font-weight: bold; margin-right: 5px;">{{ key }}</span>
                          <span>{{ value }}</span>
                        </p>
                      </div>

                      <!-- LAYER CRS -->
                      <div v-else-if = "'metadata.crs' === attr" class = "col-sm-10 value">
                        <div v-for = "crs in layer.metadata.crs">
                          <span>{{ crs }}</span>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
                <!-- LAYER LEGEND TAB -->
                <div  
                  v-show  = "'NoGeometry' !== layer.geometrytype && open" 
                  role  = "tabpanel"
                  class = "tab-pane"
                  :id   = "`layer_legend_${layer.id}`"
                >
                  <img :src = "getLegendUrl(layer.id)"/>
                </div>
              </div>
            </details>
          </div>

          <!-- MODAL CREDITS -->
          <div
            id       = "metadata_credits"
            class    = "tab-pane"
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
                v-t   = "'Application based on OS framework'"
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
              <div v-t = "'Publish and manage your QGIS projects on the web'" style = "margin-top: 10px;"></div>
            </div>

            <div
              v-if    = "powered_by"
              v-t:pre = "'Framework developed by'"
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
                  style = "margin-left: 5px; display: block; margin-right: auto; margin-left: auto;"
                  :src  = "`${urls.clienturl}images/logo_gis3w_156_85.png`"
                  class = "img-responsive"
                  alt   = ""
                />
              </a>
            </div>

            <address
              v-if    = "powered_by"
              id    = "address-credits"
              style = "line-height: 1.3; text-align: center; margin-top: 5px; display: flex; justify-content: center; gap: 5px;"
            >
              <span>📍 Montecatini Terme - Italy</span>
              <a href = "tel:+393938534336" style = "color:#000">📱 +39 393 8534336</a>
              <a href = "mailto:info@gis3w.it" style = "color:#000">✉️ info@gis3w.it</a>
            </address>

            <div
              v-if  = "powered_by"
              style = "display: flex;justify-content: center;gap: 20px;"
            >
              <a :href = "docs_url" rel = "nofollow" target = "_blank">📖 Docs</a>
              <a href = "mailto:info@gis3w.it?subject=Sponsoring%20G3W-SUITE%20development&amp;body=Hi%20there,%20I'd%20like%20to%20fund%20some%20code%20changes:">❤️ Sponsor</a>
              <a href = "https://github.com/g3w-suite" target = "_blank">🐞 Report a bug</a>
            </div>

            <hr>

            <pre v-if = "powered_by && g3wsdk_info" @click = "copy_g3wsdk_info" style = "cursor: pointer;" title = "click to copy">{{ g3wsdk_info }}</pre>

          </div>
      
        </div>

      </div>

      <menu style = "display: flex; justify-content: end;">
        <button
          v-t          = "'close'"
          type         = "cancel"
          class        = "btn btn-secondary"
        ></button>
      </menu>

    </form>
  </dialog>
</template>

<script>

  import ApplicationState        from 'g3w-state';
  import { XHR }                 from 'utils/XHR';
  import { getCatalogLayerById } from 'utils/getCatalogLayerById';


  export default {

    name: "modal-metadata",

    data() {
      const project = ApplicationState.project.getState();
      const version = window.initConfig.version.split('-')[0].split('.');
      return {
        open:          false, //@since 4.1.0 modal state
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
            let value = project?.metadata?.[field] || project[field];
            if (value) {
              //In case of layers that has geometry and no epsg, filter according to filter of project layers
              if ('layers' === field) {
                value = value.filter(l => 'NoGeometry' === l.geometrytype || ('NoGeometry' !== l.geometrytype && l.crs && l.crs.epsg) )
              }
              f[field] = { value, label: `metadata.${name}.fields.${field}` };
            }
            return f;
          }, {});
          return g;
        }, {}),
        g3wsdk_info: '',
      };
    },

    methods: {

      /**
       * @returns layer legend url
       * 
       * @since 4.1.0
       */
      getLegendUrl(id) {
        try {
          const layer = getCatalogLayerById(id);
          const url = new URL(layer.getLegendUrl((window.initConfig.layout || {}).legend, { all: true }));
          url.searchParams.set('STYLES', layer.getCurrentStyle()?.name || '');
          // force black color for text
          if ('true' === url.searchParams.get('TRANSPARENT') && 'white' === url.searchParams.get('ITEMFONTCOLOR')) {
            url.searchParams.delete('ITEMFONTCOLOR');
          }
          // force black color for text
          if ('true' === url.searchParams.get('TRANSPARENT') && 'white' === url.searchParams.get('LAYERFONTCOLOR')) {
            url.searchParams.delete('LAYERFONTCOLOR');
          }
          return url.toString();
        } catch (e) {
          return ''; // fails silently
        }
      },

      sanitizeValue(value) {
        if (Array.isArray(value) || ('object' === typeof value && null !== value)) {
          value = Object.values(value).length ? value : '';
        }
        return value;
      },

      copy_g3wsdk_info(e) {
        const range = document.createRange();
        range.selectNode(e.target);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        alert('Copied to clipboard!');
      },

      /**
       * @since 4.1.0
       */
      async onBeforetoggle(e) {
        this.open = 'open' === e.newState;
        if (this.open) {
          await Promise
                  .allSettled([
                    new Promise((resolve) => $script('https://unpkg.com/platform@1.3.6/platform.js', resolve)),
                    new Promise((resolve) => g3wsdk.core.ApplicationService.complete ? resolve() : g3wsdk.core.ApplicationService.on('complete', resolve))
                  ]);

                  /** @since 3.8.0 */
                  const platform = window.platform || {};

                  this.g3wsdk_info = `
          [g3wsdk.info]\n
          - g3w-admin: __${initConfig.version}__
          - g3w-client: __${process.env.g3w_client_rev}__
          ${Object.entries(window.initConfig.plugins).map((p) => (`    - ${p[0]}: __${p[1].version}__`)).join('\n')}
          - browser: __${platform.name} ${platform.version}__
          - operating system: __${platform.os.toString()}__
          `.trim();
        }
      },

    },

    async created() {
      if (!!window.initConfig.credits) {
        try {
          const credits      = await XHR.get({ url: window.initConfig.credits });
          this.customcredits = 'None' !== credits && credits;
        } catch(e) {
          console.warn(e);
        }
      }
    },

    mounted() {
      document.body.appendChild(this.$el);
    },

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

  .nav[role="tablist"] {
    display: flex;
    gap: 1px;
    justify-content: space-between;
  }

  .nav[role="tablist"] li {
    background-color: #e4e4e4;
    width: 100%;
  }

  .nav[role="tablist"] li.active {
    background-color: #FFF;
  }

  .nav[role="tablist"] li.active a.metadata-item-tab {
    border-bottom-color: var(--bgcolor) !important;
    border-bottom-width: 4px;
    background-color: transparent !important;
    color: #2c3b41 !important;
  }

  .nav[role="tablist"] li a.metadata-item-tab {
    height: 100%;
    margin:0;
    font-size: 1.1em;
    border-top: 0;
    border-right: 0;
    border-left: 0;
    border-bottom: 4px solid #e2e2e2;
  }

  .nav[role="tablist"] li a {
    text-align: center;
  }

  .nav[role="tablist"] li a i {
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
    border-bottom: 1px solid #eee;
  }

  .row-info .label {
    font-weight: bold;
  }

  .nav-tabs {
    border-bottom: 0 none;
  }

  .metadata-label {
    font-weight: bold;
    font-size: 1.1em;
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

  #metadata_layers > details > summary {
    cursor: pointer;
    font-size: 18px;
    position: relative;
    padding: 20px 0;
  }

  #metadata_layers > details > summary::marker { content: ""; }
  #metadata_layers > details > summary::after { content: '+'; float: right; font-weight: bold; font-size: 25px; margin-top: -4px; }
  #metadata_layers > details[open] > summary::after { content: '-' }

  .layer-row {
    padding: 10px;
    border-bottom: 1px solid #e2e2e2;
  }

  .layer-nav-tabs {
    border-bottom: 0 solid #ddd;
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
    margin-top: 10px;
    background-color: #eee;
    overflow: auto;
  }

  .spatial-tab, .legend-tab {
    font-weight: bold;
  }

  .layer-nav-tabs > li.active > a,
  .layer-nav-tabs > li > a:hover {
    color: var(--skin-color) !important;
  }
  
  .layer-nav-tabs > li > a::after {
    background: var(--skin-color);
  }

  .nav[role="tablist"] .action-button:hover {
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
</style>