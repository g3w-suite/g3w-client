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
        <li class = "active">
          <a data-toggle = "tab" href="#metadata_general" class = "metadata-item-tab general" style="color: var(--skin-primary);">
            <i class = "action-button" :class = "$fa('info')" aria-hidden = "true"></i>
            <b>{{ $t('GENERAL') }}</b>
          </a>
        </li>
        <li>
          <a data-toggle = "tab" href="#metadata_spatial" class = "metadata-item-tab spatial" style="color: var(--skin-success);">
            <i class = "action-button" :class = "$fa('globe')" aria-hidden = "true"></i>
            <b>{{ $t('SPATIAL') }}</b>
          </a>
        </li>
        <li>
          <a data-toggle = "tab" href="#metadata_layers" class = "metadata-item-tab layers" style="color: var(--skin-warning);">
            <i class = "action-button" :class = "$fa('bars')" aria-hidden = "true"></i>
            <b>{{ $t('LAYERS') }}</b>
          </a>
        </li>
        <li>
          <a data-toggle = "tab" href="#metadata_credits" class = "metadata-item-tab credits">
            <i class = "action-button" :class = "$fa('copyright')" aria-hidden = "true"></i>
            <b>{{ $t('Credits') }}</b>
          </a>
        </li>
      </ul>

      <div style="min-height: 65vh; max-height: 70vh; padding: 15px;overflow: auto;">

        <div class = "tab-content">

          <!-- GENERAL METADATA -->
          <div id = "metadata_general" class = "tab-pane active">
            <table style="width: 100%;">
              <tbody>
                <!-- PROJECT TITLE -->
                <tr v-if  = "project.metadata.title">
                  <td class = "col-sm-2 label">{{ $t('TITLE') }}</td>
                  <td class = "col-sm-10 value" v-html = "project.metadata.title"></td>
                </tr>

                <!-- PROJECT NAME -->
                <tr v-if  = "project.metadata.name">
                  <td class = "col-sm-2 label">{{ $t('NAME') }}</td>
                  <td class = "col-sm-10 value" v-html = "project.metadata.name"></td>
                </tr>

                <!-- PROJECT DESCRIPTION -->
                <tr v-if  = "project.metadata.description">
                  <td class = "col-sm-2 label">{{ $t('DESCRIPTION') }}</td>
                  <td class = "col-sm-10 value" v-html = "project.metadata.description"></td>
                </tr>

                <!-- PROJECT ABSTRACT -->
                <tr v-if  = "project.metadata.abstract">
                  <td class = "col-sm-2 label">{{ $t('ABSTRACT') }}</td>
                  <td class = "col-sm-10 value" v-html = "project.metadata.abstract"></td>
                </tr>

                <!-- PROJECT KEYWORDS -->
                <tr v-if  = "project.metadata.keywords">
                  <td class = "col-sm-2 label">{{ $t('KEYWORDS') }}</td>
                  <td class = "col-sm-10 value" v-html="[].concat(project.metadata.keywords).join(', ')"></td>
                </tr>

                <!-- PROJECT FEES -->
                <tr v-if  = "project.metadata && project.metadata.fees">
                  <td class = "col-sm-2 label">{{ $t('FEES') }}</td>
                  <td class = "col-sm-10 value" v-html = "project.metadata.fees"></td>
                </tr>

                <!-- PROJECT ACCESS CONSTRAINTS -->
                <tr v-if  = "project.metadata && project.metadata.accessconstraints">
                  <td class = "col-sm-2 label">{{ $t('ACCESS CONSTRAINT') }}</td>
                  <td class = "col-sm-10 value" v-html = "project.metadata.accessconstraints"></td>
                </tr>

                <!-- PROJECT CONTACTS -->
                <tr v-if  = "project.metadata.contactinformation">
                  <td class = "col-sm-2 label">{{ $t('CONTACTS') }}</td>
                  <td class = "col-sm-10 value">
                    <div v-for = "(value, info) in project.metadata.contactinformation" style = "margin-bottom: 5px;">
                      <b class = "col-sm-2">
                        <i style = "margin-right: 3px;" :class = "$fa(({ contactelectronicmailaddress: 'mail', personprimary: 'user', contactvoicetelephone: 'mobile' })[info])" aria-hidden = "true"></i>
                        {{ $t(`metadata.${info}`) }}
                      </b>
                      <div v-if = "'personprimary' === info" class = "col-sm-10">
                        <div v-for = "(subvalue, key) in value">
                          <b>{{ $t(`metadata.${key}`) }}</b> {{ subvalue }}
                        </div>
                      </div>
                      <div v-else-if = "'contactelectronicmailaddress' === info " class = "col-sm-10"><a :href = "`mailto: ${sanitizeValue(value)}`"><b>{{sanitizeValue(value)}}</b></a></div>
                      <div v-else class = "col-sm-10">{{ sanitizeValue(value) }}</div>
                    </div>
                  </td>
                </tr>

                <!-- PROJECT WMS (URL) -->
                <tr v-if  = "project.metadata.wms_url">
                  <td class = "col-sm-2 label">{{ $t('WMS') }}</td>
                  <td class = "col-sm-10 value">
                    <a :href = "project.metadata.wms_url" target="_blank">{{ project.metadata.wms_url }}</a>
                  </td>
                </tr>

                <!-- PROJECT WFS (URL) -->
                <tr v-if  = "project.metadata.wfs_url">
                  <td class = "col-sm-2 label">{{ $t('WFS') }}</td>
                  <td class = "col-sm-10 value">
                    <a :href = "project.metadata.wfs_url" target="_blank">{{ project.metadata.wfs_url }}</a>
                    <span>{{ layers.filter(l => l.isWfsActive()).map(l => l.getName()) }}</span>
                  </td>
                </tr>

                <!-- PROJECT WFS3 (URL) -->
                <tr v-if  = "project.metadata.wfs_url">
                  <td class = "col-sm-2 label">{{ $t('WFS3') }}</td>
                  <td class = "col-sm-10 value">
                    <a :href = "project.metadata.wfs3_url" target="_blank">{{ project.metadata.wfs3_url }}</a>
                    <span>{{ layers.filter(l => l.isWfsActive()).map(l => l.getName()) }}</span>
                  </td> 
                </tr>

              </tbody>
            </table>
          </div>

          <!-- SPATIAL METADATA -->
          <div id = "metadata_spatial" class = "tab-pane">
            <table style="width: 100%;">
              <tbody>
                <!-- PROJECT CRS -->
                <tr v-if  = "project.crs">
                  <td class = "col-sm-12 label" v-t = "'EPSG'"></td>
                  <td class = "col-sm-12 value">
                    <dl style="gap: 0;">
                      <template v-for = "(key, index) in Object.keys(project.crs)">
                        <dt class="col-sm-2">{{ key }}</dt>
                        <dd class="col-sm-10">{{ project.crs[key] }}</dd>
                      </template>
                    </dl>
                  </td>
                </tr>

                <!-- PROJECT EXTENT -->
                <tr v-if  = "project.extent">
                  <td class = "col-sm-12 label" v-t = "'BBOX'"></td>
                  <td class = "col-sm-12 value">
                    <dl style="gap: 0;">
                      <template v-for = "(key, index) in Object.keys(project.extent)">
                        <dt class="col-sm-2">{{ (['minx', 'miny', 'maxx', 'maxy'])[index] }}</dt>
                        <dd class="col-sm-10">{{ project.extent[key] }}</dd>
                      </template>
                    </dl>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- LAYERS METADATA -->
          <div id = "metadata_layers" class = "tab-pane">
            <details v-for = "layer in layers" :hidden="layer.isBaseLayer()">
              <summary>
                <i :class ="'action-button ' + g3wtemplate.font['NoGeometry' === layer.getGeometryType() ? 'table' : 'map']" style="margin-right: 10px; color: #999;" aria-hidden = "true"></i>
                <b>{{ layer.getName() }}</b>
              </summary>

              <ul class = "nav nav-tabs layer-nav-tabs" role = "tablist">

                <!-- LAYER GENERAL TAB -->
                <li role = "presentation" class = "active spatial-tab">
                  <a :href = "`#layer_general_${layer.getId()}`" aria-controls = "general" role = "tab" data-toggle = "tab">{{ $t('GENERAL') }}</a>
                </li>

                <!-- LAYER SPATIAL TAB -->
                <li v-if = "'NoGeometry' !== layer.getGeometryType()" role = "presentation" class = "spatial-tab">
                  <a :href = "`#layer_spatial_${layer.getId()}`" aria-controls = "profile" role = "tab" data-toggle = "tab">{{ $t('SPATIAL') }}</a>
                </li>

                <!-- LAYER SPATIAL TAB -->
                <li v-if = "'NoGeometry' !== layer.getGeometryType()" role = "presentation" class = "legend-tab">
                  <a :href = "`#layer_legend_${layer.getId()}`" aria-controls = "legend" role = "tab" data-toggle = "tab"> {{ ($t('legend')).toUpperCase() }}</a>
                </li>
              </ul>

              <div class = "tab-content layer-tab-content">
                <div
                  role  = "tabpanel"
                  class = "tab-pane active"
                  :id   = "`layer_general_${layer.getId()}`"
                  style = "padding: 0 15px;"
                >
                  <!-- LAYER TITLE -->
                  <div v-if="layer.config.metadata && layer.config.metadata.title" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('TITLE') }}</div>
                    <div class = "col-md-10 col-sm-12 value">{{ layer.config.metadata.title }}</div>
                  </div>

                  <!-- LAYER NAME -->
                  <div v-if="layer.config.name" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('NAME') }}</div>
                    <div class = "col-md-10 col-sm-12 value">{{ layer.config.name }}</div>
                  </div>

                  <!-- LAYER SOURCE -->
                  <div v-if="layer.config.source" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('SOURCE') }}</div>
                    <div class = "col-md-10 col-sm-12 value">{{ layer.config.source.type }}</div>
                  </div>

                  <!-- LAYER ABSTRACT -->
                  <div v-if="layer.config.metadata" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('ABSTRACT') }}</div>
                    <div class = "col-md-10 col-sm-12 value" v-html = "layer.config.metadata.abstract"></div>
                  </div>

                  <!-- LAYER KEYWORDS -->
                  <div v-if="layer.config.metadata && layer.config.metadata.keywords" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('KEYWORDS') }}</div>
                    <div class = "col-md-10 col-sm-12 value">{{ layer.config.metadata.keywords.join(', ') }}</div>
                  </div>

                  <!-- LAYER ATTRIBUTES -->
                  <div v-if="layer.config.metadata" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('ATTRIBUTES') }}</div>
                    <div class = "col-md-10 col-sm-12 value" style = "overflow: auto;">
                      <table class = "table table-striped" style = "background-color: #eee !important">
                        <thead>
                          <tr><th v-for = "(value, header) in layer.config.metadata.attributes[0]">{{ header }}</th></tr>
                        </thead>
                        <tbody>
                          <tr v-for = "a in layer.config.metadata.attributes">
                            <td v-for = "(value, header) in a">{{ value }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <!-- LAYER ID -->
                  <div v-if="layer.config.metadata" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('ID') }}</div>
                    <div class = "col-md-10 col-sm-12 value">{{ layer.getId() }}</div>
                  </div>

                  <!-- LAYER RELATIONS -->
                  <div v-if="layer.getRelations().getArray().length" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('RELATIONS') }}</div>
                    <div class = "col-md-10 col-sm-12 value">{{ layer.getRelations().getArray().map(r => r.state.name).join(' - ') }}</div>
                  </div>

                </div>

                <!-- LAYER SPATIAL TAB --> 
                <div
                  role  = "tabpanel"
                  class = "tab-pane"
                  :id   = "`layer_spatial_${layer.getId()}`"
                  style = "padding: 0 15px;"
                >
                  <!-- LAYER EPSG -->
                  <div v-if = "layer.config.crs" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('EPSG') }}</div>
                    <div class = "col-sm-10 value">{{ layer.config.crs.epsg }}</div>
                  </div>

                  <!-- LAYER TYPE -->
                  <div v-if = "layer.getGeometryType()" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('GEOMETRY') }}</div>
                    <div class = "col-sm-10 value">{{ layer.getGeometryType() }}</div>
                  </div>

                  <!-- LAYER BBOX -->
                  <div v-if = "layer.config.bbox" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('BBOX') }}</div>
                    <div class = "col-sm-10 value">
                      <p v-for = "(value, key) in layer.config.bbox">
                        <span style = "font-weight: bold; margin-right: 5px;">{{ key }}</span>
                        <span>{{ value }}</span>
                      </p>
                    </div>
                  </div>

                  <!-- LAYER CRS -->
                  <div v-if = "layer.config.metadata" class = "layer-row">
                    <div class = "col-md-2 col-sm-12 label">{{ $t('CRS') }}</div>
                    <div  class = "col-sm-10 value">
                      <div v-for = "crs in layer.config.metadata.crs">
                        <span>{{ crs }}</span>
                      </div>
                    </div>
                  </div>

                </div>
                <!-- LAYER LEGEND TAB -->
                <div  
                  v-show  = "'NoGeometry' !== layer.getGeometryType() && open" 
                  role  = "tabpanel"
                  class = "tab-pane"
                  :id   = "`layer_legend_${layer.getId()}`"
                >
                  <img :src = "getLegendUrl(layer.getId())"/>
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
      const layers  = Object.values(ApplicationState.layers).flatMap(s => s.showOnCatalog() ? s.getLayers() : []).filter(l => 'NoGeometry' === l.getGeometryType() || (l.config.crs && l.config.crs.epsg)); //(project.layers || []).filter(l => 'NoGeometry' === l.geometrytype || ('NoGeometry' !== l.geometrytype && l.crs && l.crs.epsg)),
      //@since 4.1.0 check if exist a layer with wfs capability
      const wfs_layer = layers.find(l => l.isWfsActive?.());
      if (wfs_layer) {
        project.metadata.wfs_url  = `${wfs_layer.getWfsUrl()}?service=WFS&version=1.1.0&request=GetCapabilities`;
        project.metadata.wfs3_url = `${wfs_layer.getWfsUrl()}wfs3/`;
      }
      const version = window.initConfig.version.split('-')[0].split('.');
      return {
        open:          false, //@since 4.1.0 modal state
        customcredits: false,
        powered_by:    window.initConfig.powered_by,
        urls:          window.initConfig.urls,
        docs_url:      `https://g3w-suite.readthedocs.io/en/v${version[0].replace('v','')}.${version[1]}.x/`,
        project,
        layers,
        // In case of layers that has geometry and no epsg, filter according to filter of project layers
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
      console.log(this);
    },

  }
</script>

<style scoped>
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

  .tab-pane > table > tbody > tr {
    margin: 0 !important;
    padding-top: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }

  .nav-tabs {
    border-bottom: 0 none;
  }

  .label {
    font-weight: bold;
    font-size: 1.1em;
    color: unset;
    text-align: unset;
    line-height: unset;
    padding: unset;
    white-space: unset;
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

  #metadata_spatial dt          { background: #fee; font-weight: bold;}
  #metadata_spatial dd          { background: hsl(220, 10%, 95%); }
  #metadata_spatial :is(dt, dd) { margin: 0; padding: .5em; border-top: 1px solid #fff; }
</style>