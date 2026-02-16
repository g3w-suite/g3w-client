<!--
  @file
  @since v3.7
-->

<template>
  <!-- CHOOSE A RELATION -->
  <div
    v-if  = "'relations' === view"
    class = "layer-relations"
  >
    <div class = "header skin-background-color lighten">
      <span style = "font-size: 1.1em;" v-t:pre = "'List of relations of feature'"></span>
      <ul style = "padding: 1em 0 0 15px; list-style: square;">
        <li v-for = "info in feature_info()"><b>{{ info.key }}</b>: {{ info.value }}</li>
      </ul>
    </div>
    <div style = "display: grid; grid-template-columns: repeat(2, auto); grid-column-gap: 5px;grid-row-gap: 5px;">
      <div
        v-for  = "relation in relations"
        @click = "showRelation(relation)"
        class  = "skin-border-color grid-item"
      >
        <i class = "fas fa-sitemap" style = "padding: 6px;"></i>
        <b style = "padding: 5px; overflow: hidden; white-space: normal; overflow-wrap: break-word;">{{ relation.name }}</b>
      </div>
    </div>
  </div>

  <!-- SELECTED RELATION -->
  <div
    v-else-if = "'relation' === view"
    class     = "layer-relation"
  >
    <div class = "header skin-background-color lighten">

      <div class = "g3w-long-text">

        <!-- BACK BUTTON -->
        <span
          v-if        = "relations.length > 1"
          title       = "Back to relations"
          class       = "action-button-icon action-button back-button fas fa-door-open"
          @click.stop = "back"
        ></span>

        <!-- RELATION NAME -->
        <b class = "relation-tile"> {{ relation.name }} </b>

      </div>
      <div
        v-if  = "table.rows.length"
        class = "table-tools"
      >

        <!-- DOWNLOAD BUTTON -->
        <span
          v-if           = "download_formats.length"
          v-disabled     = "ApplicationState.download"
          class          = "action-button-icon action-button"
          :class         = "$fa('download')"
          @click.stop    = "showDownloadModal"
          title          = "Downloads"
          data-placement = "left"
        ></span>

        <!-- CHART BUTTON -->
        <span
          v-if           = "has_charts"
          class          = "action-button-icon action-button"
          :class         = "[ $fa('chart'), chart.toggled ? 'toggled-white' : '',]"
          @click.stop    = "toggleChart"
          title          = "Show Chart"
          data-placement = "bottom"
        ></span>

      </div>
    </div>
    <div
      v-if       = "table.rows.length" 
      ref        = "wrapper"
      class      = "relation-table"
    >
      <div
        ref    = "content"
        :style = "{
          width:       chart.toggled ? '70%' : '100%',
          marginRight: chart.toggled ? '8px' : '3px',
          position:    'relative',
        }"
      >

        <!-- TOTAL ELEMENTS -->
        <span>{{ table.rows.length }} {{ $t('entries') }}</span>

        <!-- TABLE CONTENT -->
        <table ref = "table">
          <thead>
            <tr style = "height: 0! important;">
              <th
                v-if   = "showTools"
                :style = "{
                  minWidth: showTools * 30 + 'px',
                  padding:  '0 !important',
                }"
              ></th>
              <th
                v-for          = "(c, i) in columns"
                @click.stop    = "sortColumn(i)"
                :class         = "[i === table.ordering[0] ? table.ordering[1] : '' ]"
                :title         = "$t('sort by:') + ' ' + c.label"
                data-placement = "top"
                :style         = "{'width': `${100 / columns.length }%`}"
              >{{ c.label }}</th>
            </tr>
            <tr>
              <th v-if   = "showTools"></th>
              <th v-for = "(c, i) in columns">
                <input
                  type         = "text"
                  class        = "form-control column-search"
                  @keyup       = "changeColumn($event, i)"
                  :placeholder = "c.name"
                  :value       = "c.search"
                  :title       = "$t('search by:') + ' ' + c.name"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for = "(row, i) in table.rows"
              :key  = "table.rows_fid[i]"
            >
              <td
                v-if  = "showTools"
                class = "table-tools"
              >
                <span
                  v-if           = "table.features[i].geometry"
                  @click.stop    = "zoomToGeometry(table.features[i].geometry)"
                  class          = "action-button row-form skin-color"
                  title          = "Zoom to Geometry"
                  data-placement = "right"
                  :class         = "$fa('marker')"
                ></span>
                <span
                  v-if           = "form_structure"
                  @click.stop    = "showForm(i)"
                  title          = "Form View"
                  data-placement = "right"
                  class          = "action-button row-form skin-color"
                  :class         = "$fa('table')"
                ></span>
                <span
                  v-if           = "isEditable"
                  @click.stop    = "editFeature(i)"
                  class          = "action-button row-form skin-color"
                  title          = "Edit"
                  data-placement = "right"
                  :class         = "$fa('pencil')"
                ></span>
              </td>
              <td v-for = "value in row">
                <field :state = "{ value }" />
              </td>
            </tr>
          </tbody>
        </table>

        <!-- TABLE TOOLBAR -->
        <div class = "table-toolbar" style = "display: flex; gap: 1ch; margin-top: 1ch;">

          <!-- PAGE SIZE -->
          <label style = "margin-top: 5px;"><select style = "border: 1px solid #aaa;" v-model = "table.page_size">
            <option v-for = "l in PAGELENGTHS" :value = "l">{{ l }}</option>
          </select> {{ $t('values per page') }}</label>

          <!-- PAGINATION BUTTONS -->
          <div style = "margin-left: auto;" >
            <select
              v-model        = "table.page"
              style          = "padding: 5px 12px; appearance: none; border: 0; text-align: center; border-radius: 3px; cursor: pointer;"
              :title         = "table.page + $t(' of ') + pages"
              data-placement = "top"
            >
              <option v-for = "p in pages" :selected = "p == table.page">{{ p }}</option>
            </select>
            {{ $t(' of ') + pages }}
            <button v-if="pages > 1" title="Backward" data-placement="top" @click.stop = "table.page = Number(table.page) - 1" class="btn" v-disabled = "1 == table.page">🞀</button>
            <button v-if="pages > 1" title="Forward"  data-placement="top" @click.stop = "table.page = Number(table.page) + 1" class="btn" v-disabled = "pages == table.page">🞂</button>
          </div>
        </div>
      </div>

      <!-- VERTICAL RESIZE -->
      <div
        v-show          = "chart.toggled"
        class           = "skin-border-color lighten"
        style           = "border-style: solid; border-width: 0 1px 0 1px; min-width: 5px; background-color: #ddd; cursor: col-resize;"
        @mousedown.stop = "onChartResize"
      ></div>

      <!-- QPLOTLY CHART -->
      <div
        v-show   = "chart.toggled"
        id       = "chart_content"
        ref      = "chart"
        :style   = "{ width: chart.toggled ? '30%' : '0' }"
      ></div>

    </div>
    <div v-else><span v-t = "'No relations found'"></span></div>
  </div>
</template>

<script>

  import { G3W_FID, PAGELENGTHS, TIMEOUT } from 'g3w-constants';
  import ApplicationState                  from 'g3w-state';
  import Component                         from 'g3w-component';
  import Field                             from 'components/FieldG3W.vue';
  import { FieldsService }                 from 'components/g3w-fields';
  import GUI                               from 'g3w-app';
  import { debounce }                      from 'utils/debounce';
  import { getCatalogLayerById }           from 'utils/getCatalogLayerById';
  import { createRelationsUrl }            from 'utils/createRelationsUrl';
  import { getAlphanumericProps }          from 'utils/getAlphanumericProps';
  import { saveBlob }                      from 'utils/saveBlob';

  export default {

    /** @since 3.8.6 */
    name: 'relation',

    components: {
      Field,
    },

    data() {
      const layer = getCatalogLayerById(this.$options.nmRelation?.referencedLayer || this.$options.relation?.referencingLayer || this.$options.layerId);
      return {

        layer,

        /**
         * @since 4.0.0
         */
        ApplicationState,

        /**
         * @since 4.0.0 chart state (action button)
         */
        chart: {
          toggled: false,
        },

        /**
         * @since 3.11.2 table state
         */
        table: {
          layerId:       layer.getId(),
          features:      [],
          page:          1,
          page_size:     layer.getAttributeTablePageLength() || PAGELENGTHS[1],
          rows:          [],
          rows_fid:      [],
          ordering:      [-1, 'asc']
        },

        /**
         * @since 4.1.0
         */
        PAGELENGTHS,

        /**
         * @since 4.1.0
         */
        loading:     false,

        /**
         * @since 4.1.0
         */
        feature:     this.$options.feature ?? null,

        /**
         * @since 4.1.0
         */
        view:        'relations',

        /**
         * @since 4.1.0
         */
        relation:    this.$options.relation ?? null,

        /**
         * @since 4.1.0
         */
        relations: ((ApplicationState.project.getRelations() || []).reduce((group, r) => {
          group[r.referencedLayer] = group[r.referencedLayer] || [];
          group[r.referencedLayer].push(r);
          return group;
        }, {})[this.$options.layerId] || [])
          .filter(r => 'MANY' === r.type)
          .sort((a, b) => a.name.localeCompare(b.name)),

        /**
         * @since 4.1.0
         */
        layerId:     this.$options.layerId,
      };
    },

    computed: {

      /**
       * @returns { number } count of available tools (editing icon, form structure, zoom to feature, ...)
       *
       * @since 3.9.0
       */
      showTools() {
        return [!!this.isEditable, !!this.form_structure, !!this.table.features?.some(f => f.geometry)].filter(Boolean).length;
      },

      /**
       * @since 4.1.0
       */
      pages() {
        return Math.ceil(this.table.rows.length / this.table.page_size);
      },

      /**
       * @since 4.1.0
       */
      nmRelation() {
        return ApplicationState.project.getRelationById(this?.relation?.nmRelationId);
      },

      /**
       * @since 4.1.0
       */
      download_formats() {
        return this.layer.getDownloadFormats().filter(f => 'pdf' !== f); // exclude pdf because already includes all features
      },

      /**
       * @since 4.1.0
       */
      form_structure() {
        return this.layer.getLayerEditingFormStructure();
      },

      /**
       * @since 4.1.0
       */
      columns() {
        return this.layer.getTableHeaders();
      },

      /**
       * @returns { boolean } whether relation layer is editable
       * 
       * @since 4.1.0 
       */
      isEditable() {
        return this.layer.isEditable() && !this.layer.isInEditing();
      },

      /**
       * @since 4.1.0
       */
      featureId() {
        return this.feature.attributes[G3W_FID] ?? this.feature.attributes.fid;
      },

      /**
       * @since 4.1.0
       */
      charts() {
        if ('relation' === this.view) {
          return GUI.plotLayerIds.find(pid => this.relation.referencingLayer == pid) ? [this.relation.referencingLayer] : [];
        } else {
          return this.relations.map(r => GUI.plotLayerIds.find(id => r.referencingLayer === id)).filter(Boolean);
        }
      },

      /**
       * @since 4.1.0
       */
      has_charts() {
        return !!this.charts.find(id => this?.relation?.referencingLayer === id);
      },

    },

    watch: {
      async 'table.page_size'() {
        this.getData();
      },
    },

    methods: {

      /**
       * @param relation
       * 
       * @since 4.1.0
       */
      async showRelation(relation) {
        this.loading  = true;
        this.relation = relation;
        try {
          GUI.setCurrentContentOptions({ title: relation.name, crumb: { title: relation.name, text: true } });
          this.view = 'relation';

          await this.$nextTick();

          this.layer = getCatalogLayerById(this.nmRelation?.referencedLayer || this.relation?.referencingLayer || this.layerId);
         
          this.relation.title = this.relation.name;

          if ('ONE' !== this.relation.type) {
            this.getData();
          }
        } catch(e) {
          console.warn(e);
        }
        this.loading = true;
      },

      /**
       * Preview feature attributes [max. 3]
       * 
       * @since 4.1.0
       */
      feature_info() {
        return Object
          .entries(this.feature.attributes)
          .filter(([_, value]) => (value && 'string' === typeof value && !value.includes('/')))
          .map(([key, value]) => ({key, value})).slice(0,3)
      },

     /**
      * @param { Object } geometry
      * @param geometry.type        Point, MultiPoint, etc ...
      * @param geometry.coordinates
      *
      * @since 3.9.0
      */
      zoomToGeometry(geometry) {
        if (geometry) {
          const geom = new ol.geom[geometry.type](geometry.coordinates);
          GUI.zoomToExtent(geom?.getExtent(), { highlight: true, highLightGeometry: geom });
        }
      },

      /**
       * @param { number } index column index
       */
      sortColumn(index) {
        if (index === this.table.ordering[0]) {
          this.table.ordering[1] = 'asc' === this.table.ordering[1] ? 'desc' : 'asc';
        } else {
          this.table.ordering[0] = index;
          this.table.ordering[1] = 'asc';
        }
        this.getData({ ordering: index });
      },

      /**
       * Fetch data from server
       * 
       * @param opts
       * @param { number } opts.ordering
       * @param { number } opts.page current page
       * 
       * @since 4.0.0
       */
      async getData({
        ordering  = 0,
        page      = 1,
      } = {}) {
        GUI.setLoadingContent(true);
        GUI.disableContent(true);

        try {
          // get relations from server
          const response = await (await fetch(createRelationsUrl({
              layerId:  this.layerId,
              fid:      this.featureId,
              relation: this.relation,
            }), {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              page,
              page_size: this.table.page_size,
              formatter: 1,
              ordering:  ordering ? ('asc' === this.table.ordering[1] ? '' : '-') + this.columns[ordering].name : undefined,
              field:     this.columns?.filter(c => c.search).map(c => `${c.name}|ilike|${c.search}`).join('|AND,') || undefined,
            }),
          })).json();

          // extract features attributes
          let features = (response?.vector?.data?.features || []).map(f => ({
            id:         f.id,
            geometry:   f.geometry,
            attributes: Object.assign(f.properties, { [G3W_FID]: f.id }),
          }));

          // handle NM relations
          if (this.nmRelation && features.length) {
            features = (await GUI.getData('search:features', {
              inputs: {
                layer:     getCatalogLayerById(this.nmRelation.referencedLayer),
                filter:    features.map(f => `${this.nmRelation.fieldRef.referencedField}|eq|${encodeURIComponent(f.attributes[this.nmRelation.fieldRef.referencingField])}`).join(`|OR,`),
                formatter: 1,
              },
              outputs: null
            })?.data?.[0]?.features || []).map(f => ({
              id:         f.getId(),
              geometry:   f.getGeometry(),
              attributes: getAlphanumericProps(f.getProperties()).reduce((props, p) => Object.assign(props, { [p]: f.get(p)}), {}),
            }));
          }

          this.table.features = features;
          this.table.rows     = features.map(f => this.columns.filter(h => h).map(h => (h.value = (f.attributes || f.properties)[h.name])))
          this.table.rows_fid = features.map(r => r.attributes[G3W_FID]);
          this.table.page     = page;

        } catch(e) {
          console.warn(e);
        }

        GUI.setLoadingContent(false);
        GUI.disableContent(false);
      },

      /**
       * @param i index
       */
      async showForm(i) {
        GUI.showContent({
          content: new Component({
            internalComponent: new (Vue.extend({
              data: () => ({
                layerid:        this.table.layerId,
                feature:        this.table.features[i],
                fields:         this.columns.map(c => Object.assign(c, {
                  value: this.table.features[i].attributes[c.name],
                  query: true,
                  input: {
                    type: `${FieldsService.getType(c)}`
                  }
                })),
                form_structure: this.form_structure,
              }),
              template: /* html */`
                <div class="queryresults-wrapper">
                  <div class ="queryresults-container">
                    <table ref="table" class="table">
                      <tbody>
                        <tr class="featurebox-body">
                          <td>
                            <tabs
                              :layerid = "layerid"
                              :feature = "feature"
                              :fields  = "fields"
                              :tabs    = "form_structure"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              `,
              async mounted() {
                await this.$nextTick();
                this.$refs.table.click();
              }
            }))
          }),
          push:       true,
          showgoback: true,
          closable:   false,
          title:      this.layer.getName() || this.layer.getTitle(),
        });
      },

      /**
       * @param index
       */
      editFeature(index) {
        GUI.editFeature({
          layer: {
            id:         this?.nmRelation?.referencedLayer ?? this.relation.referencingLayer,
            attributes: this.columns,
          },
          feature: this.table.features[index],
        });
      },

      /**
       * @FIXME add description
       */
      async back() {
        // hide opened chart
        if (this.chart.toggled) {
          this.toggleChart();
        }
        this.view = 'relations';
        await this.$nextTick();
        if (1 === this.relations.length) {
          this.relations[0].noback = true;
          await this.showRelation(this.relations[0]);
        }
        GUI.setCurrentContentOptions({ crumb: { title: 'info.list_of_relations' } });
        this.loading = false;
      },

      onChartResize() {
        const move = e => {
          const perc                     =  (Math.abs(e.x - window.innerWidth) * 100 / this.$refs.wrapper.clientWidth); // percentage
          this.$refs.content.style.width = `${100 - perc}%`;
          this.$refs.chart.style.width   = `${perc}%`;
        };
        const el = document.getElementById('g3w-view-content');
        el.addEventListener('mousemove', move);
        el.addEventListener('mouseup', async () => { 
          el.removeEventListener('mousemove', move); 
          await this.$nextTick();
          GUI.emit('resize') 
        }, { once: true });
      },

      /**
       * @since 4.1.0
       */
      async showDownloadModal() {
        const _   = g3w.gettext;

        let layer = getCatalogLayerById(this.nmRelation?.referencedLayer || this.relation?.referencingLayer || this.layerId);
        layer     = layer.state;

        if (!layer) {
          throw 'no layer';
        }

        const catalog_layer  = getCatalogLayerById(layer.id);

        const dialog = Object.assign(document.createElement('template'), {
          innerHTML: /* html */`
            <dialog>
              <h4 style="margin: 0; padding: .5em; color: #FFF; position: sticky; top: 0; background-color: #212c31"><i class="fas fa-download" style="margin-right: .5ch;"></i> ${ _('Export features') }</h4>
              <form method="dialog">

                <div class="form-group">
                  <label>${ _('Layer') }</label>
                  <select name="layer" class="form-control" disabled>
                    <option value="${layer.id}" selected>${ layer.name || layer.title } (${ this.layerId })</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>${ _('Data Format') }</label>
                  <select name="format" class="form-control">
                    ${[
                        catalog_layer?.isGeoTIFFDownloadable?.() ? /* html */`<option value="GeoTiff">${ _('GeoTiff') }</option>` : '',
                        catalog_layer?.isShpDownloadable?.()     ? /* html */`<option value="Shp">${ _('Shapefile') }</option>` : '',
                        catalog_layer?.isGpxDownloadable?.()     ? /* html */`<option value="Gpx">${ _('GPX') }</option>` : '',
                        catalog_layer?.isGpkgDownloadable?.()    ? /* html */`<option value="Gpkg">${ _('GeoPackage') }</option>` : '',
                        catalog_layer?.isCsvDownloadable?.()     ? /* html */`<option value="Csv">${ _('CSV') }</option>` : '',
                        catalog_layer?.isXlsDownloadable?.()     ? /* html */`<option value="Xls">${ _('Excel') }</option>` : '',
                      ].filter(Boolean).join('')
                    }
                  </select>
                </div>

                <menu style="display: flex; justify-content: space-between;">
                  <button id="confirm_button" type="submit" value="confirm" class="btn btn-block btn-success">Download</button>
                </menu>
              </form>

            </dialog>
          `.trim()
        }).content.firstChild;

        dialog.addEventListener("click", e => {
          if (e.target === dialog) {
            dialog.close();
          }
        });

        dialog.addEventListener('close', async () => {
          if ('confirm' === dialog.returnValue) {

            ApplicationState.download = true;
            try {
              const format   = dialog.querySelector('[name="format"]').value.toLowerCase();

              const response = await fetch(createRelationsUrl({
                  layerId:  this.layerId,
                  fid:      this.featureId,
                  relation: this.relation,
                  type:     format
                }), {
                method:  'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Expose-Headers': 'Content-Disposition', // get filename from server
                },
                body: JSON.stringify({ formatter: 1 }),
                signal: AbortSignal.timeout(TIMEOUT),
              });

              if (!response?.ok) {
                throw (await response.json()).message;
              }

              saveBlob(await response.blob(), response.headers.get('content-disposition').split('filename=').at(-1));

            } catch(e) {
              console.warn(e);
              GUI.showUserMessage({
                type:     'alert',
                message:  e ?? 'info.server_error',
                closable: true,
              });
            }

            ApplicationState.download = false;
          }
          dialog.remove();
        });

        document.body.appendChild(dialog);
        dialog.showModal();
      },

      /**
       * @since 4.1.0
       */
      async toggleChart() {
        this.chart.toggled = !this.chart.toggled;
        await this.$nextTick();
        this.chart.container = this.chart.container || document.querySelector('#chart_content');
        if (this.chart.toggled) {
          GUI.showChart([this.relation.referencingLayer], this.chart.container, { relations: [this.relation], fid: this.featureId });
        } else {
          GUI.hideChart(this.chart.container);
        }
      },

    },

    async mounted() {
      this.changeColumn = debounce((e, i) => {
        this.columns[i].search = e.target.value.trim();
        this.getData();
      });

      // autoload selected relation
      if (this.relation) {
        this.showRelation(this.relation);
      }
    },

    /**
     * @fires hide-chart
     */
    async beforeDestroy() {
      // hide opened chart
      if (this.chart.toggled) {
         GUI.hideChart(this.chart.container);
      }
      if (this.chart.container) {
        this.$emit('hide-chart', this.chart.container);
        this.chart.container = null;
      }
      // reset columns search
      this.columns.forEach(c => delete c.search); 
      if (1 === this.relations.length) {
        delete this.relations[0].noback;
      }
    },

  };
</script>

<style scoped>
  .grid-item {
    min-width: 0;
    min-height: 80px;
    border: 2px solid;
    cursor:pointer;
    border-radius: 4px;
    background-color: #fff;
    display: flex;
    align-items: center;
  }

  .grid-item:hover {
    background-color: transparent;
  }

  .layer-relations {
    overflow-y: auto;
  }

  .layer-relations > .header {
    margin: 5px 0 10px 0;
    padding: 5px;
  }

  .layer-relation {
    margin-top: 3px;
  }

  .layer-relation > .header {
    margin-top: 5px;
    margin-bottom: 5px;
    padding: 3px;
    display: flex;
    justify-content:
    space-between;
    align-items: center;
    width: 100%;
    margin: 0 !important;
  }

  .layer-relation > .header > .g3w-long-text {
    border-radius: 3px;
    font-size: 1.3em;
  }

  .table-tools {
    font-size: 1.1em;
    margin-bottom: 3px
  }

  .table-tools > .action-button {
    padding: 5px;
  }

  .back-button {
    font-size: 0.8em;
  }

  .header-component {
    width: 100%;
    display: flex;
    margin-left: auto;
    margin-bottom: 5px;
    margin-right: 4px;
  }

  .table-tools .action-button:hover {
    background-color: transparent;
  }

  #chart_content {
    padding-bottom: 5px;
    margin-bottom: 5px;
    margin-left: 8px;
  }

  input.form-control.column-search::placeholder {
    font-weight: normal;
    font-style: italic;
  }

  input.form-control.column-search {
    height: 25px;
    min-width: 40px;
    padding: 2px;
  }

  table {
    width: 100%;
    user-select: none;
    display: block;
    height: calc(100% - 60px);
    overflow: auto;
    border-collapse: separate
  }

  thead {
    position: sticky;
    top: 0;
    background-color: #fff;
  }

  tbody > tr.selected {
    box-shadow: inset 0 0 0 9999px rgb(13, 110, 253, .9);
    color: #fff;
  }

  tbody > tr:not(.selected):hover {
    background-color: rgb(255, 255, 0, 0.15);
  }

  th, td {
    white-space: nowrap;
  }

  th {
    cursor: pointer;
  }

  td {
    border-top: 1px solid rgba(0,0,0,.15);
  }

  th.asc, th.desc { 
    border-top: var(--skin-color) medium solid;
  }

  th.asc::after {
    content: "▴";
  }

  th.desc::after {
    content: "▾";
  }

  .relation-table {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    margin-top: 3px;
    height: 95%;
  }
</style>