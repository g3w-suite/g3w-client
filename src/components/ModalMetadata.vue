<!--
  @file Display project and layer metadata.
  @since v3.7
-->

<template>
  <dialog
    id            = "modal-metadata"
    @beforetoggle = "onBeforetoggle"
    class         = "metadata-dialog"
    :aria-label    = "$t('Metadata')"
  >
    <form method = "dialog" class = "metadata-form">

      <header class = "metadata-header">
        <i class = "fas fa-info-circle" aria-hidden = "true"></i>
        <h1>{{ $t('Metadata') }}</h1>
      </header>

      <!-- METADATA TABS -->
      <ul role = "tablist" class = "metadata-tabs nav nav-tabs">
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

      <div class = "metadata-scroll">

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
                    <div v-if="project.metadata.contactinformation.personprimary?.contactperson || project.metadata.contactinformation.personprimary?.ContactPerson" style = "margin-bottom: 5px;">
                      <i style = "margin-right: 3px;" class = "fas fa-user-tie" aria-hidden = "true"></i>
                      <b hidden>{{ $t('Person') }}</b>
                      {{ project.metadata.contactinformation.personprimary?.contactperson || project.metadata.contactinformation.personprimary?.ContactPerson }}
                    </div>

                    <!-- CONTACT ORGANIZATION -->
                    <div v-if="project.metadata.contactinformation.personprimary?.contactorganization || project.metadata.contactinformation.personprimary?.ContactOrganization" style = "margin-bottom: 5px;">
                      <i style = "margin-right: 3px;" class = "fa fa-building" aria-hidden = "true"></i>
                      <b hidden>{{ $t('Organization') }}</b>
                      {{ project.metadata.contactinformation.personprimary?.contactorganization || project.metadata.contactinformation.personprimary?.ContactOrganization }}
                    </div>

                    <!-- CONTACT ROLE -->
                    <div v-if="project.metadata.contactinformation.personprimary?.contactposition || project.metadata.contactinformation.personprimary?.ContactPosition" style = "margin-bottom: 5px;">
                      <i style = "margin-right: 3px;" class = "fas fa-sitemap" aria-hidden = "true"></i>
                      <b hidden>{{ $t('Role') }}</b>
                      {{ project.metadata.contactinformation.personprimary?.contactposition || project.metadata.contactinformation.personprimary?.ContactPosition }}
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
                <tr v-if  = "project.metadata.keywords && project.metadata.keywords.length">
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
                <i :class = "['metadata-layer-icon', 'NoGeometry' === layer.getGeometryType() ? 'fas fa-table' : 'fas fa-draw-polygon']" aria-hidden = "true"></i>
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
                          <span class="fa-stack metadata-capability" :title="$t('VISIBILITY RANGE') + ': ' + layer.config.maxscale + ' ÷ ' + layer.config.minscale">
                            <i class="fas fa-eye fa-stack-1x" :aria-label="layer.state.geolayer"></i>
                            <i v-if="!layer.state.geolayer" aria-hidden="true" class="fas fa-ban fa-stack-2x"></i>
                          </span>
                          <span class="fa-stack metadata-capability" :title="$t('EDITABLE')">
                            <i class="fas fa-pencil-alt fa-stack-1x" :aria-label="layer.isEditable()"></i>
                            <i v-if="!layer.isEditable()" aria-hidden="true" class="fas fa-ban fa-stack-2x"></i>
                          </span>
                          <span class="fa-stack metadata-capability" :title="$t('FILTERABLE')">
                            <i class="fas fa-filter fa-stack-1x" :aria-label="layer.isFilterable()"></i>
                            <i v-if="!layer.isFilterable()" aria-hidden="true" class="fas fa-ban fa-stack-2x"></i>
                          </span>
                          <span class="fa-stack metadata-capability" :title="$t('QUERYABLE')">
                            <i class="fas fa-info fa-stack-1x" :aria-label="layer.isQueryable()"></i>
                            <i v-if="!layer.isQueryable()" aria-hidden="true" class="fas fa-ban fa-stack-2x"></i>
                          </span>
                          <span class="fa-stack metadata-capability" :title="$t('STYLES') + ': ' + (layer.config.styles || []).map(s => s.name).join(', ')">
                            <i class="fas fa-paint-brush fa-stack-1x" :aria-label="layer.config.styles && layer.config.styles.length > 1"></i>
                            <i v-if="!(layer.config.styles && layer.config.styles.length > 1)" aria-hidden="true" class="fas fa-ban fa-stack-2x"></i>
                          </span>
                          <span class="fa-stack metadata-capability" :title="$t('DOWNLOAD FORMATS') + ': ' + layer.getDownloadFormats().join(', ')">
                            <i class="fas fa-download fa-stack-1x" :aria-label="layer.getDownloadFormats().length > 0"></i>
                            <i v-if="!layer.getDownloadFormats().length" aria-hidden="true" class="fas fa-ban fa-stack-2x"></i>
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
                <div v-if = "url.loading" class = "bar-loader" style = "border: 0"></div>
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

      <menu class = "metadata-footer">
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
      // get all layers with no geometry or with a valid EPSG code.
      const layers  = ApplicationState.project.getLayers().filter(l => 'NoGeometry' === l.getGeometryType() || l.config.crs?.epsg);
      const project = ApplicationState.project.getState();

      // @since 4.1.0 set WMS URL if not set by QGIS project
      if (!project.metadata.wms_url) {
        project.metadata.wms_url = `${project.WMSUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;
      } 

      // @since 4.1.0 set WMTS URL if not set by QGIS project (and some layer has WMTS capability)
      if (!project.metadata.wmts_url && layers.some(l => l?.state?.ows?.includes?.('WMTS'))) {
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
          const url = new URL(layer.getLegendUrl({ all: true }));
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
  .metadata-dialog {
    width: min(1200px, 80vw);
    min-width: 0;
    max-width: calc(100vw - 24px);
    height: min(82vh, 820px);
    max-height: calc(100vh - 24px);
    padding: 0;
    overflow: hidden;
    border: 1px solid #d7dde0;
    border-radius: 8px;
    color: #263238;
    background: #fff;
    box-shadow: 0 8px 24px rgb(20 35 45 / 18%);
  }

  .metadata-form {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 0 !important;
  }

  .metadata-header {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 52px;
    padding: 8px 18px;
    border-bottom: 1px solid #e1e6e7;
    background: #fff;
  }

  .metadata-header > i {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 6px;
    color: #2c3b41;
    background: #edf1f2;
    font-size: 1.5rem;
  }

  .metadata-header h1 { margin: 0; color: #2c3b41; font-size: 1.9rem; font-weight: 700; }

  .metadata-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    margin: 0;
    padding: 8px 14px 0;
    overflow-x: auto;
    border-bottom: 1px solid #d7dde0;
    background: #f4f5f5;
    scrollbar-width: thin;
  }

  .metadata-tabs > li {
    width: auto;
    margin: 0;
    overflow: hidden;
    border-radius: 6px 6px 0 0;
    background: transparent;
  }

  .metadata-tabs > li.active { background: #fff; }

  .metadata-tabs > li > a.metadata-item-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 50px;
    margin: 0;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-bottom: 3px solid transparent;
    border-radius: 6px 6px 0 0;
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.3;
    text-align: center;
    white-space: nowrap;
  }

  .metadata-tabs > li > a.metadata-item-tab > i {
    display: grid;
    place-items: center;
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: color-mix(in srgb, currentColor 12%, #fff);
    font-size: 1.3rem;
  }

  .metadata-tabs > li > a.metadata-item-tab:hover { background: rgb(255 255 255 / 75%); }

  .metadata-tabs > li.active > a.metadata-item-tab,
  .metadata-tabs > li.active > a.metadata-item-tab:hover,
  .metadata-tabs > li.active > a.metadata-item-tab:focus {
    border-bottom-color: currentColor;
    border-left-color: #e1e6e7;
    border-right-color: #e1e6e7;
    background: #fff;
    cursor: default;
  }

  .metadata-tabs > li > a.metadata-item-tab:focus-visible,
  .layer-nav-tabs > li > a:focus-visible {
    outline: 2px solid var(--skin-focus);
    outline-offset: -3px;
  }

  .metadata-scroll {
    flex: 1;
    min-height: 0;
    padding: 10px 18px 16px;
    overflow: auto;
    background: #fff;
  }

  .tab-title {
    position: absolute;
    bottom: 10px;
    right: auto;
  }

  #metadata_general table { width: 100%; border-collapse: collapse; }
  #metadata_general table td { padding: 10px 8px; border-bottom: 1px solid #e8eceb; line-height: 1.5; }
  #metadata_general td.label { color: #536267; font-size: 1.2rem; font-weight: 700; text-align: left; }
  #metadata_general td.value { color: #263238; font-size: 1.4rem; overflow-wrap: anywhere; }

  #metadata_layers > details { margin-bottom: 8px; overflow: hidden; border: 1px solid #dfe5e3; border-radius: 6px; background: #fff; }
  #metadata_layers > details > summary { display: flex; align-items: center; gap: 10px; min-height: 54px; cursor: pointer; font-size: 1.5rem; position: relative; padding: 10px 14px; background: #f7f8f8; }
  .metadata-layer-icon { display: inline-grid; place-items: center; flex: 0 0 30px; width: 30px; height: 30px; margin-right: 2px; border-radius: 6px; color: var(--skin-color); background: hsl(from var(--skin-color) h s calc(l + 44)); font-size: 1.4rem; }
  #metadata_layers > details > summary::marker      { content: ""; }
  #metadata_layers > details > summary::after       { content: '+'; margin-left: auto; color: var(--skin-color); font-weight: bold; font-size: 2rem; }
  #metadata_layers > details[open] > summary::after { content: '-' }

  .layer-nav-tabs { gap: 6px; margin-top: 8px; border-bottom: 1px solid #e1e6e7; }

  .layer-nav-tabs > li.active > a,
  .layer-nav-tabs > li.active > a:focus,
  .layer-nav-tabs > li.active > a:hover {
    border-width: 0;
  }

  .layer-nav-tabs > li > a {
    position: relative;
    padding: 7px 10px;
    border: 0;
    color: #aeaeae;
    font-weight: 700;
  }

  .layer-nav-tabs > li.active > a,
  .layer-nav-tabs > li > a:hover {
    border: none;
    background: transparent;
  }

  .layer-nav-tabs > li > a::after {
    position: absolute;
    right: 0;
    bottom: -1px;
    left: 0;
    height: 2px;
    background: var(--skin-color);
    content: "";
    transform: scaleX(0);
    transition: transform .16s ease;
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
  
  .layer-tab-content { margin-top: 8px; overflow: auto; }
  .metadata-capability { position: relative; display: inline-block; width: 34px; height: 34px; margin: 0 6px 6px 0; border: 1px solid #d7dde0; border-radius: 50%; color: var(--skin-color); background: #f4f6f5; font-size: 1.4rem; line-height: 32px; text-align: center; vertical-align: middle; }
  .metadata-capability .fa-stack-1x,
  .metadata-capability .fa-stack-2x { line-height: 32px; }
  .metadata-capability .fa-ban { color: var(--skin-danger) !important; }
  #metadata_legend img { max-width: 100%; height: auto; }

  .metadata-footer {
    display: flex;
    justify-content: flex-end;
    margin: 0;
    padding: 10px 18px;
    border-top: 1px solid #e1e6e7;
    background: #f7f8f8;
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
    .metadata-dialog {
      width: calc(100vw - 16px);
      height: calc(100vh - 16px);
      max-height: calc(100vh - 16px);
      border-radius: 6px;
    }

    .metadata-header { min-height: 48px; padding: 7px 14px; }
    .metadata-tabs { grid-template-columns: repeat(4, max-content); padding: 0 8px; }
    .metadata-scroll { padding: 8px 14px 12px; }
    #metadata_general table td { padding: 8px 5px; }
    .metadata-footer { padding: 8px 14px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .layer-nav-tabs > li > a::after { transition: none; }
  }
</style>