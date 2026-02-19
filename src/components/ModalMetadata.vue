<!--
  @file
  @since v3.7
-->

<template>
  <dialog
    id            = "modal-metadata"
    @beforetoggle = "onBeforetoggle"
    style         = "width: 80vw;"
    :aria-label    = "$t('Metadata')"
  >
    <form method = "dialog">

      <!-- METADATA TABS -->
      <ul role = "tablist" class = "nav nav-tabs">
        <li class = "active">
          <a data-toggle = "tab" href="#metadata_general" class = "metadata-item-tab general" style="color: var(--skin-primary);">
            <i class = "fas fa-info-circle" aria-hidden = "true"></i>
            <b>{{ $t('GENERAL') }}</b>
          </a>
        </li>
        <li>
          <a data-toggle = "tab" href="#metadata_layers" class = "metadata-item-tab layers" style="color: var(--skin-warning);">
            <i class = "fas fa-layer-group" aria-hidden = "true"></i>
            <b>{{ $t('data').toUpperCase() }}</b>
          </a>
        </li>
        <li>
          <a data-toggle = "tab" href="#metadata_legend" class = "metadata-item-tab legend" style="color: purple;">
            <i class = "fas fa-list" aria-hidden = "true"></i>
            <b>{{ $t('legend').toUpperCase() }}</b>
          </a>
        </li>
        <li>
          <a data-toggle = "tab" href="#metadata_credits" class = "metadata-item-tab credits">
            <i class = "fa fa-copyright" aria-hidden = "true"></i>
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
                <tr v-if  = "project.metadata.name" style="display:none !important;">
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

                <!-- PROJECT CONTACTS -->
                <tr v-if  = "project.metadata.contactinformation">
                  <td class = "col-sm-2 label">{{ $t('CONTACTS') }}</td>
                  <td class = "col-sm-10 value">

                    <!-- CONTACT NAME -->
                    <div v-if="(project.metadata.contactinformation.personprimary || {}).contactperson || (project.metadata.contactinformation.personprimary || {}).ContactPerson" style = "margin-bottom: 5px;">
                      <i style = "margin-right: 3px;" class = "fas fa-user-tie" aria-hidden = "true"></i>
                      <b hidden>{{ $t('Person') }}</b>
                      {{ (project.metadata.contactinformation.personprimary || {}).contactperson || (project.metadata.contactinformation.personprimary || {}).ContactPerson }}
                    </div>

                    <!-- CONTACT ORGANIZATION -->
                    <div v-if="(project.metadata.contactinformation.personprimary || {}).contactorganization || (project.metadata.contactinformation.personprimary || {}).ContactOrganization" style = "margin-bottom: 5px;">
                      <i style = "margin-right: 3px;" class = "fa fa-building" aria-hidden = "true"></i>
                      <b hidden>{{ $t('Organization') }}</b>
                      {{ (project.metadata.contactinformation.personprimary || {}).contactorganization || (project.metadata.contactinformation.personprimary || {}).ContactOrganization }}
                    </div>

                    <!-- CONTACT ROLE -->
                    <div v-if="(project.metadata.contactinformation.personprimary || {}).contactposition || (project.metadata.contactinformation.personprimary || {}).ContactPosition" style = "margin-bottom: 5px;">
                      <i style = "margin-right: 3px;" class = "fas fa-sitemap" aria-hidden = "true"></i>
                      <b hidden>{{ $t('Role') }}</b>
                      {{ (project.metadata.contactinformation.personprimary || {}).contactposition || (project.metadata.contactinformation.personprimary || {}).ContactPosition }}
                    </div>

                    <!-- CONTACT EMAIL -->
                    <div v-if="project.metadata.contactinformation.contactelectronicmailaddress" style = "margin-bottom: 5px;">
                      <i style = "margin-right: 3px;" class = "fas fa-envelope" aria-hidden = "true"></i>
                      <b hidden>{{ $t('Email') }}</b>
                      <a :href = "`mailto: ${sanitizeValue(project.metadata.contactinformation.contactelectronicmailaddress)}`">
                        {{ sanitizeValue(project.metadata.contactinformation.contactelectronicmailaddress) }}
                      </a>
                    </div>

                    <!-- CONTACT PHONE -->
                    <div v-if="project.metadata.contactinformation.contactvoicetelephone" style = "margin-bottom: 5px;">
                      <i style = "margin-right: 3px;" class = "fas fa-mobile" aria-hidden = "true"></i>
                      <b hidden>{{ $t('Phone') }}</b>
                      <a :href = "`tel: ${sanitizeValue(project.metadata.contactinformation.contactvoicetelephone)}`">
                        {{ sanitizeValue(project.metadata.contactinformation.contactvoicetelephone) }}
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- PROJECT VERSION (LAST MODIFIED) -->
                <tr v-if  = "project.modified || project.qgis_version">
                  <td class = "col-sm-2 label">{{ $t('LAST MODIFIED') }}</td>
                  <td class = "col-sm-10 value">
                    <template v-if  = "project.modified">
                      <i class="far fa-clock" aria-hidden="true" style="margin-right: 3px;"></i>
                      {{ (new Date(project.modified * 1000)).toISOString() }}
                    </template>
                    <template v-if  = "project.qgis_version">
                      <i class="fas fa-code-branch" aria-hidden="true" style="margin-right: 3px;margin-left: 1ch;"></i>
                      <a
                        :href          = "'https://docs.qgis.org/'+project.qgis_version.split('.').slice(0, 2).join('.')"
                        target         = "_blank"
                        title          = "QGIS version"
                        data-placement = "right"
                      >
                        {{ project.qgis_version }}
                      </a>
                    </template>
                  </td>
                </tr>

                <!-- PROJECT KEYWORDS -->
                <tr v-if  = "project.metadata.keywords">
                  <td class = "col-sm-2 label">{{ $t('KEYWORDS') }}</td>
                  <td class = "col-sm-10 value">
                    <i style = "margin-right: 3px;" class = "fas fa-tags" aria-hidden = "true"></i>
                    <span>{{ [].concat(project.metadata.keywords).join(', ') }}</span>
                  </td>
                </tr>

                <!-- PROJECT FEES -->
                <tr v-if  = "project.metadata.fees">
                  <td class = "col-sm-2 label">{{ $t('FEES') }}</td>
                  <td class = "col-sm-10 value">
                    <i style = "margin-right: 3px;" class = "fas fa-shopping-cart" aria-hidden = "true"></i>
                    <span>{{ project.metadata.fees }}</span>
                  </td>
                </tr>

                <!-- PROJECT ACCESS CONSTRAINTS -->
                <tr v-if  = "project.metadata.accessconstraints">
                  <td class = "col-sm-2 label">{{ $t('ACCESS CONSTRAINT') }}</td>
                  <td class = "col-sm-10 value">
                    <i style = "margin-right: 3px;" class = "far fa-copyright" aria-hidden = "true"></i>
                    <span>{{ project.metadata.accessconstraints }}</span>
                  </td>
                </tr>

                <!-- PROJECT WMS (URL) -->
                <tr v-if  = "project.metadata.wms_url">
                  <td class = "col-sm-2 label">{{ $t('WMS') }}</td>
                  <td class = "col-sm-10 value">
                    <i class="far fa-image" style="margin-right: 3px;"></i>
                    <a :href = "project.metadata.wms_url" target="_blank">{{ project.metadata.wms_url }}</a>
                  </td>
                </tr>

                <!-- PROJECT WMTS (URL) -->
                <tr v-if  = "project.metadata.wmts_url">
                  <td class = "col-sm-2 label">{{ $t('WMTS') }}</td>
                  <td class = "col-sm-10 value">
                    <i class="far fa-image" style="margin-right: 3px;"></i>
                    <a :href = "project.metadata.wmts_url" target="_blank">{{ project.metadata.wmts_url }}</a>
                  </td>
                </tr>

                <!-- PROJECT WFS (URL) -->
                <tr v-if  = "project.metadata.wfs_url">
                  <td class = "col-sm-2 label">{{ $t('WFS') }}</td>
                  <td class = "col-sm-10 value">
                    <i class="fas fa-layer-group" style="margin-right: 3px;"></i>
                    <a :href = "project.metadata.wfs_url" target="_blank" :title="layers.filter(l => l.isWfsActive()).map(l => l.getName()).join('<br>')">{{ project.metadata.wfs_url }} </a>
                  </td>
                </tr>

                <!-- PROJECT WFS3 (URL) -->
                <tr v-if  = "project.metadata.wfs_url">
                  <td class = "col-sm-2 label">{{ $t('WFS3') }}</td>
                  <td class = "col-sm-10 value">
                    <i class="fas fa-layer-group" style="margin-right: 3px;"></i>
                    <a :href = "project.metadata.wfs3_url" target="_blank" :title="layers.filter(l => l.isWfsActive()).map(l => l.getName()).join('<br>')">{{ project.metadata.wfs3_url }} </a>
                  </td> 
                </tr>

                <!-- PROJECT CRS -->
                <tr v-if  = "project.crs">
                  <td class = "col-sm-12 label">{{ $t('EPSG') }}</td>
                  <td class = "col-sm-12 value">
                    <dl style="gap: 0;">
                      <template v-for = "(key, index) in Object.keys(project.crs)">
                        <dt class="col-sm-2">{{ key }}</dt>
                        <dd class="col-sm-10">
                          <template v-if="'epsg' === key">
                            <i  class="fas fa-globe" aria-hidden="true" style="margin-right: 3px;"></i>
                            <a
                              :href  = "`https://epsg.io/${(project.crs.epsg || '').toLowerCase().replace('epsg:', '')}`"
                              target = "_blank"
                              title  = "Docs"
                            >
                              <b>{{ project.crs.epsg }}</b>
                            </a>
                          </template>
                          <template v-else>{{ project.crs[key] }}</template>
                        </dd>
                      </template>
                    </dl>
                  </td>
                </tr>

                <!-- PROJECT EXTENT -->
                <tr v-if  = "project.extent">
                  <td class = "col-md-2 col-sm-12 label">{{ $t('BBOX') }}</td>
                  <td class = "col-sm-10 value" style="display: flex; gap: 20px;">
                    <span v-for = "(key, index) in Object.keys(project.extent)">
                      <b>{{ (['minx', 'miny', 'maxx', 'maxy'])[index] }}</b> {{ project.extent[key] }}
                    </span>
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          <!-- LAYERS METADATA -->
          <div id = "metadata_layers" class = "tab-pane">
            <details v-for = "layer in layers" :hidden="layer.isBaseLayer()">
              <summary>
                <i :class ="('NoGeometry' === layer.getGeometryType() ? 'fas fa-table' : 'far fa-image')" style="margin-right: 10px; color: #999;" aria-hidden = "true"></i>
                <b>{{ layer.getName() }}</b>
              </summary>

              <ul class = "nav nav-tabs layer-nav-tabs" role = "tablist">

                <!-- LAYER GENERAL TAB -->
                <li role = "presentation" class = "active spatial-tab">
                  <a :href = "`#layer_general_${layer.getId()}`" aria-controls = "general" role = "tab" data-toggle = "tab">{{ $t('GENERAL') }}</a>
                </li>

                <!-- LAYER LEGEND TAB -->
                <li v-if = "'NoGeometry' !== layer.getGeometryType()" role = "presentation" class = "legend-tab">
                  <a :href = "`#layer_legend_${layer.getId()}`" aria-controls = "legend" role = "tab" data-toggle = "tab"> {{ $t('legend').toUpperCase() }}</a>
                </li>

                <!-- LAYER ATTRIBUTES TAB -->
                <li v-if  = "layer.config.metadata && layer.config.metadata.attributes && layer.config.metadata.attributes.length" role = "presentation" class = "attributes-tab">
                  <a :href = "`#layer_attributes_${layer.getId()}`" aria-controls = "attributes" role = "tab" data-toggle = "tab"> {{ $t('ATTRIBUTES') }}</a>
                </li>
              </ul>

              <div class = "tab-content layer-tab-content">
                <div
                  role  = "tabpanel"
                  class = "tab-pane active"
                  :id   = "`layer_general_${layer.getId()}`"
                  style = "padding: 0 15px;"
                >

                  <table style="width: 100%;">
                    <tbody>

                      <!-- LAYER NAME -->
                      <tr v-if="layer.config.name">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('NAME') }}</td>
                        <td class = "col-md-10 col-sm-12 value">{{ layer.config.name }}</td>
                      </tr>

                      <!-- LAYER TITLE -->
                      <tr v-if="layer.config.metadata && layer.config.metadata.title && layer.config.name !== layer.config.metadata.title">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('TITLE') }}</td>
                        <td class = "col-md-10 col-sm-12 value">{{ layer.config.metadata.title }}</td>
                      </tr>

                      <!-- LAYER ABSTRACT -->
                      <tr v-if="layer.config.metadata && layer.config.metadata.abstract">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('ABSTRACT') }}</td>
                        <td class = "col-md-10 col-sm-12 value" v-html = "layer.config.metadata.abstract"></td>
                      </tr>

                      <!-- LAYER SOURCE -->
                      <tr v-if="layer.config.source">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('SOURCE') }}</td>
                        <td class = "col-md-10 col-sm-12 value"><i class="fas fa-database" aria-hidden="true" style="margin-right: 3px;"></i> {{ layer.config.source.type }}</td>
                      </tr>

                      <!-- LAYER KEYWORDS -->
                      <tr v-if="layer.config.metadata && layer.config.metadata.keywords">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('KEYWORDS') }}</td>
                        <td class = "col-md-10 col-sm-12 value"><i class = "fas fa-tags" aria-hidden = "true" style = "margin-right: 3px;"></i> {{ layer.config.metadata.keywords.join(', ') }}</td>
                      </tr>

                      <!-- LAYER ID -->
                      <tr v-if="layer.config.metadata">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('ID') }}</td>
                        <td class = "col-md-10 col-sm-12 value"><i class="fas fa-key" aria-hidden="true" style="margin-right: 3px;"></i> {{ layer.getId() }}</td>
                      </tr>

                      <!-- LAYER TYPE -->
                      <tr v-if = "layer.getGeometryType()">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('GEOMETRY') }}</td>
                        <td class = "col-sm-10 value"><i class="fas fa-shapes" aria-hidden="true" style="margin-right: 3px;"></i> {{ layer.getGeometryType() }}</td>
                      </tr>

                      <!-- LAYER RELATIONS -->
                      <tr v-if="layer.getRelations().getArray().length">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('RELATIONS') }}</td>
                        <td class = "col-md-10 col-sm-12 value"><i class="fas fa-sitemap" aria-hidden="true" style="margin-right: 3px;"></i> {{ layer.getRelations().getArray().map(r => r.state.name).join(' - ') }}</td>
                      </tr>

                      <!-- LAYER EPSG -->
                      <tr v-if = "layer.config.crs && 'NoGeometry' !== layer.getGeometryType()">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('EPSG') }}</td>
                        <td class = "col-sm-10 value">
                          <i  class="fas fa-globe" aria-hidden="true" style="margin-right: 3px;"></i>
                          <a
                            :href  = "`https://epsg.io/${(layer.config.crs.epsg || '').toLowerCase().replace('epsg:', '')}`"
                            target = "_blank"
                            title  = "Docs"
                          >
                            <b>{{ layer.config.crs.epsg }}</b>
                          </a>
                        </td>
                      </tr>

                      <!-- LAYER CRS -->
                      <tr v-if = "layer.config.metadata && layer.config.metadata.crs && layer.config.metadata.crs.length && 'NoGeometry' !== layer.getGeometryType()">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('CRS') }}</td>
                        <td  class = "col-sm-10 value">
                          <div v-for = "crs in layer.config.metadata.crs">
                            <span>{{ crs }}</span>
                          </div>
                        </td>
                      </tr>

                      <!-- LAYER BBOX -->
                      <tr v-if = "layer.config.bbox">
                        <td class = "col-md-2 col-sm-12 label">{{ $t('BBOX') }}</td>
                        <td class = "col-sm-10 value" style="display: flex; gap: 20px;">
                          <span v-for = "(value, key) in layer.config.bbox">
                            <b style = "margin-right: 5px;">{{ key }}</b> {{ value }}
                          </span>
                        </td>
                      </tr>

                      <!-- LAYER CAPABILITIES -->
                      <tr>
                        <td class = "col-md-2 col-sm-12 label">{{ $t('CAPABILITIES') }}</td>
                        <td class = "col-sm-10 value">
                          <span class="fa-stack" style="vertical-align: top;" :title="$t('VISIBILITY RANGE') + ': ' + layer.config.maxscale + ' ÷ ' + layer.config.minscale">
                            <i class="fas fa-eye fa-stack-1x" :aria-label="layer.state.geolayer"></i>
                            <i v-if="!layer.state.geolayer" aria-hidden="true" class="fas fa-ban fa-stack-2x" style="color: rgba(255, 99, 71, .7);"></i>
                          </span>
                          <span class="fa-stack" style="vertical-align: top;" :title="$t('EDITABLE')">
                            <i class="fas fa-pencil-alt fa-stack-1x" :aria-label="layer.isEditable()"></i>
                            <i v-if="!layer.isEditable()" aria-hidden="true" class="fas fa-ban fa-stack-2x" style="color: rgba(255, 99, 71, .7);"></i>
                          </span>
                          <span class="fa-stack" style="vertical-align: top;" :title="$t('FILTERABLE')">
                            <i class="fas fa-filter fa-stack-1x" :aria-label="layer.isFilterable()"></i>
                            <i v-if="!layer.isFilterable()" aria-hidden="true" class="fas fa-ban fa-stack-2x" style="color: rgba(255, 99, 71, .7);"></i>
                          </span>
                          <span class="fa-stack" style="vertical-align: top;" :title="$t('QUERYABLE')">
                            <i class="fas fa-info fa-stack-1x" :aria-label="layer.isQueryable()"></i>
                            <i v-if="!layer.isQueryable()" aria-hidden="true" class="fas fa-ban fa-stack-2x" style="color: rgba(255, 99, 71, .7);"></i>
                          </span>
                          <span class="fa-stack" style="vertical-align: top;" :title="$t('STYLES') + ': ' + (layer.config.styles || []).map(s => s.name).join(', ')">
                            <i class="fas fa-paint-brush fa-stack-1x" :aria-label="layer.config.styles && layer.config.styles.length > 1"></i>
                            <i v-if="!(layer.config.styles && layer.config.styles.length > 1)" aria-hidden="true" class="fas fa-ban fa-stack-2x" style="color: rgba(255, 99, 71, .7);"></i>
                          </span>
                          <span class="fa-stack" style="vertical-align: top;" :title="$t('DOWNLOAD FORMATS') + ': ' + layer.getDownloadFormats().join(', ')">
                            <i class="fas fa-download fa-stack-1x" :aria-label="layer.getDownloadFormats().length > 0"></i>
                            <i v-if="!layer.getDownloadFormats().length" aria-hidden="true" class="fas fa-ban fa-stack-2x" style="color: rgba(255, 99, 71, .7);"></i>
                          </span>
                          <p style="margin-top: 1em;"><b style="color: rgba(255, 99, 71, 1);">{{ $t('Restrictions applied to user') }}:</b> <span>{{ username }}</span></p>
                        </td>
                      </tr>

                    </tbody>
                  </table>


                </div>

                <!-- LAYER LEGEND TAB -->
                <div  
                  v-show  = "'NoGeometry' !== layer.getGeometryType() && open" 
                  role  = "tabpanel"
                  class = "tab-pane"
                  :id   = "`layer_legend_${layer.getId()}`"
                >
                  <img :src = "getLegendUrlById(layer.getId())"/>
                </div>

                <!-- LAYER ATTRIBUTES TAB --> 
                <div
                  v-if  = "layer.config.metadata && layer.config.metadata.attributes && layer.config.metadata.attributes.length"
                  role  = "tabpanel"
                  class = "tab-pane"
                  :id   = "`layer_attributes_${layer.getId()}`"
                  style = "padding: 0 15px;"
                >
                  <table class = "table table-striped" style = "background-color: #eee !important">
                    <thead>
                      <tr><th v-for = "(value, header) in layer.config.metadata.attributes[0]">{{ header }}</th></tr>
                    </thead>
                    <tbody>
                      <tr v-for = "attr in layer.config.metadata.attributes">
                        <td v-for = "(value, header) in attr">{{ value }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>

            </details>
          </div>

          <!-- LAYERS LEGEND -->
          <div id = "metadata_legend" class = "tab-pane">
            <b style="display: block;">{{ $t('legend').toUpperCase() }}</b> 
              <div v-for = "url in legendurls" :key = "url.url">
                <bar-loader :loading = "url.loading"/>
                <img
                  :src       = "getLegendUrl(url.url)"
                  loading    = "lazy"
                  alt        = ""
                  @load      = "url.loading = false"
                  @loaderror = "url.loading = false"
                />
                <hr>
              </div>
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
  import GUI                     from 'g3w-app';
  import { XHR }                 from 'utils/XHR';
  import { getCatalogLayerById } from 'utils/getCatalogLayerById';


  export default {

    name: "modal-metadata",

    data() {
      const project = ApplicationState.project.getState();
      const layers  = Object.values(ApplicationState.layers).flatMap(s => s.showOnCatalog() ? s : [])
        .flatMap(s => s.showOnCatalog() ? s.getLayers() : [])
        // In case of layers that has geometry and no epsg, filter according to filter of project layers
        .filter(l => 'NoGeometry' === l.getGeometryType() || (l.config.crs && l.config.crs.epsg));

      // @since 4.1.0 set WMS URL if not set by QGIS project
      if (!project.metadata.wms_url) {
        project.metadata.wms_url = `${project.WMSUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;
      } 

      // @since 4.1.0 set WMTS URL if not set by QGIS project
      if (!project.metadata.wmts_url) {
        project.metadata.wmts_url = `${project.WMSUrl}?service=WMTS&version=1.3.0&request=GetCapabilities`;
      } 

      // @since 4.1.0 check if exist a layer with wfs capability
      const wfs_layer = layers.find(l => l.isWfsActive?.());
      if (wfs_layer) {
        project.metadata.wfs_url  = `${project.WMSUrl}?service=WFS&version=1.3.0&request=GetCapabilities`;
        project.metadata.wfs3_url = `${project.WMSUrl}wfs3/`;
      }

      const version = window.initConfig.version.split('-')[0].split('.');
      return {
        open:          false, //@since 4.1.0 modal state
        customcredits: false,
        powered_by:    window.initConfig.powered_by,
        urls:          window.initConfig.urls,
        docs_url:      `https://g3w-suite.readthedocs.io/en/v${version[0].replace('v','')}.${version[1]}.x/`,
        g3wsdk_info:  '',
        project,
        layers,
        legendurls:   [],
      };
    },

    computed: {
      username() {
        return (window.initConfig?.user?.username ?? 'anonymous');
      },
    },

    methods: {

      /**
       * @returns layer legend url
       * 
       * @since 4.1.0
       */
      getLegendUrlById(id) {
        try {
          const layer = getCatalogLayerById(id);
          const url = new URL(layer.getLegendUrl(window.initConfig?.layout?.legend, { all: true }));
          url.searchParams.set('STYLES', layer.getCurrentStyle()?.name || '');
          // force black color for text
          if ('true' === url.searchParams.get('TRANSPARENT') && 'white' === url.searchParams.get('ITEMFONTCOLOR')) {
            url.searchParams.delete('ITEMFONTCOLOR');
          }
          // force black color for text
          if ('true' === url.searchParams.get('TRANSPARENT') && 'white' === url.searchParams.get('LAYERFONTCOLOR')) {
            url.searchParams.delete('LAYERFONTCOLOR');
          }
          url.searchParams.set('LAYERTITLE', 'false');
          return url.toString();
        } catch(e) {
          return ''; // fails silently
        }
      },

      /**
       * @since 4.1.0
       */
      getLegendUrl(url) {
        try {
          return (new URL(url)).toString();
        } catch(e) {
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
      //Load legend layers url one time
      this.$el.querySelector('li a[href="#metadata_legend"]').addEventListener('click', async () => {
        if (0 === this.legendurls.length) {
          //clone legend config
          const olegend = { ...(window.initConfig?.layout?.legend || {}) };
          // force black color for text
          if (olegend.transparent && (!olegend.color || 'white' === olegend.color)) {
            window.initConfig.layout.legend.color = 'black'; //set black
          }
          if (!olegend.layertitle) {
            window.initConfig.layout.legend.layertitle = true;
          }
          this.legendurls = await GUI.getLegendSrc({ all: true });
          window.initConfig.layout.legend = olegend; // restore legend config
        }
      })
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
    overflow: auto;
  }

  .spatial-tab, .legend-tab, .attributes-tab {
    font-weight: bold;
  }

  .layer-nav-tabs > li.active > a,
  .layer-nav-tabs > li > a:hover {
    color: var(--skin-color) !important;
  }
  
  .layer-nav-tabs > li > a::after {
    background: var(--skin-color);
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

  #metadata_general dt          { font-weight: bold;}
  #metadata_general :is(dt, dd) { margin: 0; padding: .5em; }

  @media (max-width: 767px) {
    #modal-metadata > form > .nav-tabs {
      display: none;
    }
  }
</style>