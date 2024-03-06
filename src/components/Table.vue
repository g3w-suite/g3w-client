<!--
  @file
  @since v3.7
-->

<template>
  <div id="open_attribute_table" style="margin-top: 5px">
    <table
      v-if  = "hasHeaders()"
      ref   = "attribute_table"
      id    = "layer_attribute_table"
      class = "table table-striped row-border compact nowrap"
      style = "width:100%"
    >
      <thead>
        <tr>
          <th></th>
          <th v-if="i > 0" v-for="(header, i) in state.headers">
            <input
              type         = "text"
              style        = "height: 25px; min-width: 40px; padding: 2px;"
              class        = "form-control column-search"
              @keyup       = "changeColumn($event, i)"
              :placeholder = "header.name"
            />
          </th>
        </tr>
        <tr>
          <th v-for="(header, i) in state.headers">
            <span v-if="0 === i">
              <input
                type      = "checkbox"
                id        = "attribute_table_select_all_rows"
                :checked  = "state.selectAll"
                class     = "magic-checkbox"
                :disabled = "state.nofilteredrow || state.features.length === 0"
              >
              <label
                for                         = "attribute_table_select_all_rows"
                style                       = "margin-bottom:0 !important;"
                @click.capture.stop.prevent = "selectAllRow"
              >
                <span style="padding:5px"></span>
              </label>
            </span>
            <span v-else>{{ header.label }}</span>
          </th>
        </tr>
      </thead>

      <!-- ORIGINAL SOURCE: src/components/TableBody.vue@3.9.3 -->
      <tbody id="table_body_attributes" >
        <tr
          v-for      = "(feature, i) in state.features" :key="feature.id"
          role       = "row"
          class      = "feature_attribute"
          style      = "cursor: pointer"
          @mouseover = "zoomAndHighLightFeature(feature, false)"
          @click     = "zoomAndHighLightFeature(feature, true)"
          :selected  = "selectedRow === i"
          :class     = "[
            i %2 == 1 ? 'odd' : 'pair',
            { geometry: !!feature.geometry },
            { 'selected': feature.selected }
          ]">
          <td v-for="(header, i) in state.headers" :tab-index="1">
            <!-- ORIGINAL SOURCE: src/components/TableSelectRow.vue@3.9.3 -->
            <span v-if   = "0 === i">
              <input
                type     = "checkbox"
                :id      = "get_check_id(true)"
                :checked = "feature.selected"
                class    = "magic-checkbox"
              >
              <label
                :for                        = "get_check_id(false)"
                @click.capture.stop.prevent = "addRemoveSelectedFeature(feature)"
              ><span></span></label>
            </span>
            <field
              v-else
              :feature = "feature"
              :state   = "getField(feature, header)"
            />
          </td>
        </tr>
      </tbody>

    </table>
    <div v-else id="noheaders" v-t="'dataTable.no_data'"></div>
  </div>
</template>

<script>
import G3wTableToolbar             from 'components/TableToolbar.vue';
import Field                       from 'components/FieldG3W.vue';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import GUI                         from 'services/gui';
import { resizeMixin }             from 'mixins';
import { debounce }                from 'utils/debounce';
import Component                   from 'core/g3w-component';
import DataRouterService           from 'services/data';
import { coordinatesToGeometry }   from 'utils/coordinatesToGeometry';
import { noop }                    from 'utils/noop';
import G3WObject                   from 'core/g3w-object';
import { getUniqueDomId } from 'utils/getUniqueDomId';

const { t }                        = require('core/i18n/i18n.service');
const { SELECTION_STATE }          = require('core/layers/layer');

const PAGELENGTHS = [10, 25, 50];

/**
 * Create a unique feature key
 */
function _createFeatureKey(values) {
  return values.join('__');
}

function _createFeatureForSelection(feature) {
  let geometry;
  if (feature.attributes) geometry = feature.geometry;
  if (feature.geometry)   geometry = coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates);
  return {
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry,
  }
}

function _hideDataTableElements() {
      $('.dataTables_info, .dataTables_length').hide();
      $('.dataTables_paginate').css({
        'display': 'flex',
        'justify-content': 'space-between',
        'font-size': '0.8em',
        'margin-top': '5px'
      });
      $('.dataTables_filter').css('float', 'right');
      $('.dataTables_paginate').css('margin', '0');
    };

/** Data Table */
let table;
let fieldsComponents = [];

export default {
  name: "G3WTable",
  mixins: [resizeMixin],
  components: {
    Field
  },
  data() {

    let relationsGeometry = [];

    // layer not has geometry  
    if (!this.layer.isGeoLayer()) {
      this.layer
        .getRelations()
        .getArray()
        .forEach(relation => {
          const layer = CatalogLayersStoresRegistry.getLayerById(relation.getFather()); // get project layer
          if (
            this.layer.getId() !== relation.getFather() && // current layer is not child layer of relation
            layer.isGeoLayer()                             // relation layer has geometry
          ) {
            relationsGeometry.push({
              layer,
              father_fields: relation.getFatherField(),    // NB: since g3w-admin@v3.7.0 this is an Array value.
              fields:        relation.getChildField(),     // NB: since g3w-admin@v3.7.0 this is an Array value.
              features:      {},
            })
          }
        });
    }

    return {
      service: this.service || undefined,
      layer: this.layer || undefined,
      state: this.service.state,
      table: null,
      selectedRow: null,
      relationsGeometry,
      paginationfilter: false,
      selectedfeaturesfid: this.layer.getSelectionFids(),
      formatter: 1,
      allfeaturesnumber: undefined,
      nopaginationsfilter: [],
      /** Number of pages */
      currentPage: 0,
      /** Pagination filter features */
      _async: Object.assign({
        state: false,
        fnc:   noop
      }, (this._async || {})),
      getAll: !this.service.state.pagination,
      /** Whether layer has geometry */
      geolayer: this.layer.isGeoLayer(),
      paginationParams: {},
    }
  },
  methods: {

    get_check_id(cache) {
      if (cache) {
        this.get_check_id.cached_id = getUniqueDomId();
      }
      return this.get_check_id.cached_id
    },

    getField(feature, header) {
      return {
        value: feature.attributes[header.name],
        label: undefined // temporary to avoid label
      }
    },

    async getDataFromBBOX() {
      const map = GUI.getService('map');

      this.service.state.tools.geolayer.active = !this.service.state.tools.geolayer.active;

      const is_active = this.service.state.tools.geolayer.active;
      const listener  = this.mapBBoxEventHandlerKey;

      if (is_active && this.service.state.pagination) {
        listener.cb = () => {
          this.service.state.tools.geolayer.in_bbox = this.service.state.tools.geolayer.active ? map.getMapBBOX().join(',') : undefined;
          this.service.emit('ajax-reload');
        };
      }

      if (is_active && !this.service.state.pagination) {
        listener.cb = async () => {
          this.service.state.tools.geolayer.in_bbox = this.service.state.tools.geolayer.active ? map.getMapBBOX().join(',') : undefined;
          this.filterChangeHandler({ type: 'in_bbox' });
        };
      }

      if (is_active) {
        listener.key = map.getMap().on('moveend', listener.cb);
      }

      if (listener.cb) {
        listener.cb();
      }

      if (!is_active) {
        this.resetMapBBoxEventHandlerKey();
      }
    },

    async toggleFilterToken() {
      await this.layer.toggleFilterToken();
    },

    clearAllSelection() {
      this.layer.clearSelectionFids();
    },

    async switchSelection() {
      const has_pagination = this.service.state.pagination;
      const filter         = this.nopaginationsfilter;
      const filtered       = !has_pagination && filter.length ? [] : undefined;
      let selected         = false;

      // pagination
      if (has_pagination) {
        this.service.state.features.forEach(f => {
          f.selected = !f.selected;
          selected   = f.selected;
        });
      }

      if (has_pagination && !this.getAll) {
        await this.getAllFeatures();
      }

      this.service.state.selectAll = (has_pagination && this.paginationfilter) ? selected : this.service.state.selectAll;

      // filtered
      if (!has_pagination && filter.length) {
        this.service.state.features.forEach((f, i) => {
          if (-1 !== filter.indexOf(i)) {
            filtered.push(f);
          }
          f.selected = !f.selected;
          this.layer[f.selected ? 'includeSelectionFid' : 'excludeSelectionFid' ](f.id);
          selected = selected || f.selected;
        });
        this.service.state.tools.show = selected;
      }
      
      // no filter
      if (!has_pagination && !filter.length) {
        this.service.state.features.forEach(f => { f.selected = !f.selected; });
      }

      if (has_pagination || !filter.length) {
        this.layer.invertSelectionFids();
      }

      if (!has_pagination) {
        this.checkSelectAll(filtered);
      }

      if (has_pagination || !filter.length) {
        this.service.state.tools.show = this.selectedfeaturesfid.size > 0;
      }

    },

    /**
     * Called when a selected feature is checked
     */
    async selectAllRow() {
      if (!this.state.features.length) {
        return;
      }
      // set inverse of selectAll
      this.service.state.selectAll = !this.service.state.selectAll;

      const has_pagination = this.service.state.pagination;
      const filter         = this.nopaginationsfilter;
      let selected         = false;

      // filtered
      if (!has_pagination && filter.length) {
        this.service.state.features.forEach((f, i) =>{
          if (-1 !== filter.indexOf(i)) {
            f.selected = this.service.state.selectAll;
            this.layer[f.selected ? 'includeSelectionFid': 'excludeSelectionFid'](f.id);
            selected = selected || f.selected;
          }
        });
        this.service.state.tools.show = selected;
      }

      // no filter
      if (!has_pagination && !filter.length) {
        this.service.state.tools.show = this.service.state.selectAll;
        this.layer[this.service.state.selectAll ? 'setSelectionFidsAll': 'clearSelectionFids']();
        this.service.state.features.forEach(f => f.selected = this.service.state.selectAll);
      }

      // filtered pagination
      if (has_pagination && this.paginationfilter && this.service.state.featurescount >= this.service.state.allfeatures) {
        this.service.state.features.forEach(f => {
          f.selected = this.service.state.selectAll;
          this.layer[f.selected ? 'includeSelectionFid': 'excludeSelectionFid'](f.id);
        });
      }

      if (has_pagination && this.paginationfilter && this.service.state.featurescount < this.service.state.allfeatures) {
        const features = await this.getAllFeatures({
          search:    this.paginationParams.search,
          ordering:  this.paginationParams.ordering,
          formatter: this.paginationParams.formatter,
          in_bbox:   this.paginationParams.in_bbox,
        });
        features.forEach(f => {
          if (!this.getAll && this.geolayer && f.geometry) {
            this.layer.addOlSelectionFeature({
              id: f.id,
              feature: _createFeatureForSelection(f)
            });
          }
          this.layer[this.service.state.selectAll ? 'includeSelectionFid' : 'excludeSelectionFid'](f.id);
        })
      }

      if (has_pagination) {
        this.service.state.features.forEach(f => f.selected = this.service.state.selectAll);
      }

      if (has_pagination && !this.paginationfilter && !this.getAll) {
        await this.getAllFeatures();
      }

      if (has_pagination && !this.paginationfilter) {
        this.layer[this.service.state.selectAll ? 'setSelectionFidsAll': 'clearSelectionFids']();
      }

      if (has_pagination) {
        this.service.state.tools.show = this.service.state.selectAll || this.selectedfeaturesfid.size > 0;
      }

    },

    async zoomAndHighLightFeature(feature, zoom=true) {
      const map = GUI.getService('map');

      // this._async = this._async || {};

      // async highlight
      if (feature.geometry && this._async.state) {
        this._async.fnc = map.highlightGeometry.bind(map, feature.geometry, { zoom });
        return;
      }

      // sync highlight
      if (feature.geometry && !this._async.state) {
        map.highlightGeometry(feature.geometry , { zoom });
        return;
      }

      // skip when there are no relation features geometry
      if (!feature.geometry && !this.relationsGeometry.length > 0) {
        return;
      }

      // zoom and highlight relation features 
      if (!feature.geometry) {

        const features     = [];
        const promises     = [];
        const field_values = []; // check if add or not

        this.relationsGeometry.forEach(({ layer, father_fields, fields, features }) => {
          const values = fields.map(f => feature.attributes[f]);

          field_values.push(values);

          let promise;

          if (zoom && undefined === features[k]) {
            promise = DataRouterService
              .getData('search:features', {
                inputs: {
                  layer,
                  formatter:       1,
                  search_endpoint: 'api',
                  filter: (
                    father_fields
                      .reduce((filter, field, index) => {
                        filter = `${filter}${index > 0 ? '|AND,' : ''}${field}|eq|${encodeURIComponent(values[index])}`
                        return filter;
                      }, '')
                  ),
                },
                outputs: false, // just a request not show on result
              });
          }

          promises.push(promise);
        });

        (await Promise.allSettled(promises))
          .forEach(({
            status,
            value
          }, index) => {
            if ('fulfilled' === status) {

              const relation = this.relationsGeometry[index];
              const k        = _createFeatureKey(field_values[index]);
              const data     = value && value.data[0];
            
              if (undefined === relation.features[k]) {
                relation.features[k] = data && data.features || [];
              }        

              relation.features[k].forEach(f => features.push(f));

            }
          });

        if (zoom) {
          map.zoomToFeatures(features, { highlight: true });
        } else {
          map.highlightFeatures(features);
        }
        return;
      }

    },

    addRemoveSelectedFeature(feature) {
      feature.selected = !feature.selected;

      const selected       = this.selectedfeaturesfid;
      const filter         = this.nopaginationsfilter;
      const count          = this.allfeaturesnumber;

      const select_all     = this.service.state.selectAll;
      const has_pagination = this.service.state.pagination;
      const features       = this.service.state.features;
      const is_active      = this.service.state.tools && this.service.state.tools.filter && this.service.state.tools.filter.active

      const is_exclude     = !select_all && selected.has(SELECTION_STATE.EXCLUDE);
      const is_default     = !select_all && !is_exclude;

      /** @FIXME add description */
      if (select_all) {
        this.service.state.selectAll = false;
      }

      /** @FIXME add description */
      if (select_all) {
        this.layer.excludeSelectionFid(feature.id, has_pagination);
      }

      /** @FIXME add description */
      if (is_exclude || is_default) {
        this.layer[feature.selected ? 'includeSelectionFid' : 'excludeSelectionFid'](feature.id);
      }

      /** @FIXME add description */
      if (!is_active && ( (is_exclude && 1 === selected.size) || (is_default && selected.size === count)) ) {
        this.layer.setSelectionFidsAll();
      }

      /** @FIXME add description */
      if (is_exclude && 1 !== selected.size && selected.size === features.length + 1) {
        this.layer.clearSelectionFids();
      }

      /** @FIXME add description */
      this.service.state.tools.show = selected.size > 0;

      /** @FIXME add description */
      if (
        (is_exclude && 1 === selected.size) ||
        (is_default && selected.size === count) ||
        (!has_pagination && filter.length && filter.length === features.filter(f => f.selected).length)
      ) {
        this.service.state.selectAll = true;
      }

    },

    async reloadLayout() {
      await this.$nextTick();
      if (table) {
        table.columns.adjust();
      }
    },

    hasHeaders() {
      return !!this.state.headers.length;
    },

    createdContentBody() {
      fieldsComponents = fieldsComponents.filter(fieldComponent => {
        fieldComponent.$destroy();
        return false;
      });
      const trDomeElements = table.rows().nodes();
      //trDomeElements
      trDomeElements.each((rowElement, index) => {
        $(rowElement).css('cursor', 'pointer');
        if (this.state.features.length) {
          const feature = this.state.features[index];
          const hasGeometry = !!feature.geometry;
          $(rowElement).addClass('feature_attribute');
          feature.selected && $(rowElement).addClass('selected');
          $(rowElement).on('click', () => {
            if (hasGeometry) {
              this.zoomAndHighLightFeature(feature);
            }
          });
          $(rowElement).on('mouseover', () => {
            if (hasGeometry) {
              this.zoomAndHighLightFeature(feature, false);
            }
          });
          $(rowElement)
            .children()
            .each((index, element) => {
              const header = this.state.headers[index];
              let contentDOM;
              if (header === null) {
                const SelectRowClass = Vue.extend(SelectRow);
                const SelectRowInstance = new SelectRowClass({
                  propsData: {
                    feature
                  }
                });
                SelectRowInstance.$on('selected', feature => this.addRemoveSelectedFeature(feature));
                this.$watch(
                  () => feature.selected,
                  function (selected) {
                    selected ? $(rowElement).addClass('selected'): $(rowElement).removeClass('selected');
                  }
                );
                contentDOM = SelectRowInstance.$mount().$el;
              } else {
                const fieldClass = Vue.extend(Field);
                const fieldInstance = new fieldClass({
                  propsData: {
                    state: {
                      value: feature.attributes[header.name]
                    }
                  }
                });
                fieldInstance.$mount();
                fieldsComponents.push(fieldInstance);
                contentDOM = fieldInstance.$el
              }
              $(element).html(contentDOM);
          })
        }
      });
      setTimeout(() => this.reloadLayout(), 0)
    },

    async resize() {
      await this.$nextTick();
      $('#open_attribute_table div.dataTables_scrollBody').height(
        $(".content").height()                                               // table height
        - $('#open_attribute_table div.dataTables_scrollHeadInner').height() // table header height
        - 130
      );
    },

    /**
     * Set filtered features
     * 
     * @param index features index
     */
    setFilteredFeature(index) {
      const filter = this.nopaginationsfilter = index;
      if (0 === index.length || index.length === this.allfeaturesnumber) {
        this.checkSelectAll();
      } else {
        this.checkSelectAll(filter.map(i => this.service.state.features[i]));
      }
    },

    checkSelectAll(features) {
      features = undefined === features ? this.service.state.features : features;
      this.service.state.selectAll = (
        this.selectedfeaturesfid.has(SELECTION_STATE.ALL) ||
        (features.length && features.reduce((selectAll, f) => selectAll && f.selected, true))
      );
    },

    getAllFeatures(params) {
      GUI.setLoadingContent(true);
      return new Promise((resolve, reject) => {
        this.layer
          .getDataTable(params || {})
          .then(data => {
            const is_valid = this.geolayer && data.features;

            if (is_valid && !params) {
              const loaded_features = this.service.state.features.map(f => f.id);
              data.features.forEach(f => {
                if (-1 === loaded_features.indexOf(f.id) && f.geometry) {
                  this.layer.addOlSelectionFeature({ id: f.id, feature: _createFeatureForSelection(f) });
                }
              });
              this.getAll = true;
            }

            if (is_valid) {
              resolve(data.features);
            }        
          })
          .fail(()   => reject())
          .always(() => GUI.setLoadingContent(false));
      });
    },

    /**
     * Get DataTable layer
     * 
     * @param data.start
     * @param data.order
     * @param data.length
     * @param data.columns
     * @param data.search
     * @param data.firstCall
     * 
     * @returns {Promise<{{ data: [], recordsTotal: number, recordsFiltered: number }}>}
     */
    getData({
      start     = 0,
      order     = [],
      length    = this.service.state.pageLength,
      columns   = [],
      search    = { value: null },
      firstCall = false,
    } = {}) {

      // reset features before load
      GUI.setLoadingContent(true);

      this.layer.setAttributeTablePageLength(length);

      return new Promise((resolve, reject) => {

        // skip when ..
        if (!this.service.state.headers.length) {
          resolve({
            data: [],
            recordsTotal: 0,
            recordsFiltered: 0
          });
          return;
        }

        let searchText = search.value && search.value.length > 0 ? search.value : null;

        this.service.state.features.splice(0);

        if (!order.length) {
          order.push({
            column: 1,
            dir: 'asc',
          });
        }

        const ordering = ('asc' === order[0].dir ? '' : '-') + this.service.state.headers[order[0].column].name;

        this.currentPage = (start === 0 || (this.service.state.pagination && this.service.state.tools.filter.active)) ? 1 : (start/length) + 1;

        const in_bbox = this.service.state.tools.geolayer.in_bbox;

        const field =  this.service.state.pagination
          ? columns.filter(c => c.search && c.search.value).map(c => `${c.name}|ilike|${c.search.value}|and`).join(',')
          : undefined;

          this.paginationParams = {
          field:     field || undefined,
          page:      this.currentPage,
          page_size: length,
          search:    searchText,
          in_bbox,
          formatter: this.formatter,
          ordering
        };

        this.layer
          .getDataTable(
            this.service.state.pagination
              ? this.paginationParams
              : ({ ordering, in_bbox, formatter: this.formatter })
          )
          .then(data => {
            const { features = [] }  = data;

            this.service.state.allfeatures   = data.count || this.service.state.features.length;
            this.service.state.featurescount = features.length;
            this.allfeaturesnumber           = (undefined === this.allfeaturesnumber ? data.count : this.allfeaturesnumber);
            this.paginationfilter            = (data.count !== this.allfeaturesnumber);
            this.service.state.pagination    = firstCall
              ? this.service.state.tools.filter.active || features.length < this.allfeaturesnumber
              : this.service.state.pagination;

            // add features
            (features || []).forEach(feature => {
              const tableFeature = {
                id:         feature.id,
                selected:   this.layer.hasSelectionFid(feature.id),
                attributes: feature.attributes                || feature.properties,
                geometry:   this.geolayer && feature.geometry || undefined
              };

              const has_geom  = this.geolayer && feature.geometry;
              const selection = has_geom && this.layer.getOlSelectionFeature(feature.id);

              if (has_geom && !selection) {
                this.layer.addOlSelectionFeature({
                  id:      feature.id,
                  feature: _createFeatureForSelection(feature)
                });
              }

              this.service.state.features.push(tableFeature);
            });

            this.service.state.tools.show = this.layer.getFilterActive() || this.selectedfeaturesfid.size > 0;

            this.checkSelectAll(); 

            resolve({
              // DataTable pagination
              data: this.service.state.features.map(f => {
                const attrs = f.attributes ? f.attributes : f.properties;
                const values = [null];
                this.service.state.headers.filter(h => h).forEach(h => {
                  h.value = attrs[h.name];
                  values.push(h.value);
                });
                return values;
              }),
              recordsFiltered: data.count,
              recordsTotal:    data.count
            });
          })
          .fail(e  => { console.warn(e); GUI.notify.error(t("info.server_error")); reject(e); })
          .always(() => { GUI.setLoadingContent(false); })
      });
    },

    clearAllServiceSelection() {
      this.state.features.forEach(f => f.selected = false);
      this.state.tools.show = false;
      this.state.selectAll = false;
    },

    clearService() {
      this.layer.off('unselectionall',    this.clearAllServiceSelection);
      this.layer.off('filtertokenchange', this.filterChangeHandler);

      this.resetMapBBoxEventHandlerKey();

      this.allfeaturesnumber = null;

      if (this._async.state) {
        setTimeout(() => {
          this._async.fnc();
          this._async.state = false;
          this._async.fnc   = noop;
        });
      }
    },

    resetMapBBoxEventHandlerKey() {
      const listener = this.mapBBoxEventHandlerKey;
      ol.Observable.unByKey(listener.key);
      listener.key = null;
      listener.cb  = null;
    },

    /**
     * @param { Object } opts
     * @param { string } opts.type
     * 
     * @fires redraw when `opts.type` in_bbox filter (or not select all)
     */
    async filterChangeHandler({ type } = {}) {
      this.allfeaturesnumber = undefined;

      if (false === (type === 'in_bbox' || !this.selectedfeaturesfid.has(SELECTION_STATE.ALL))) {
        return;
      }

      let data = [];

      // reload data
      if (!this.service.state.pagination) {
        this.service.state.features.splice(0);
        this.service.state.pagination = false;
        data = (await this.getData()).data || [];
      }

      this.service.emit('redraw', data);
    },

    onGUIContent(options) {
      this._async = this._async || {};
      this._async.state = (100 === options.perc);
    },

  },

  beforeCreate() {
    this.delayType = 'debounce';
    this.layer = CatalogLayersStoresRegistry.getLayerById(this.$options.layerId);
    this.service = new G3WObject();
    this.service.state = {
      pageLengths:   PAGELENGTHS,
      pageLength:    this.layer.getAttributeTablePageLength() || PAGELENGTHS[0],
      features:      [],
      title:         this.layer.getTitle(),
      headers:       [null, ...this.layer.getTableHeaders()], // first value is `null` for DataTable purpose (used to add a custom input selector)
      geometry:      true,
      loading:       false,
      allfeatures:   0,
      pagination:    true,
      selectAll:     false,
      nofilteredrow: false,
      tools: {
        geolayer: {
          show:      this.layer.isGeoLayer(),
          active:    false,
          in_bbox:   undefined,
        },
        show:        false,
        filter:      this.layer.state.filter
      }
    };
  },

  /**
   * TableService Class
   * 
   * ORIGINAL SOURCE: src/app/gui/table/tableservice.js@v3.9.3
   */
  async created() {
    // table content
    const comp = this.g3wComponent = new Component({
      id: 'openattributetable',
      service: this.service,
      internalComponent: this,
    });

    comp.layout = () => { comp.internalComponent.reloadLayout(); };
    this.service.on('redraw', ()=> { comp.layout(); });
    comp.on('unmount', () => { this.clearService(); })

    // bind context on event listeners
    this.clearAllServiceSelection = this.clearAllServiceSelection.bind(this);
    this.filterChangeHandler      = this.filterChangeHandler.bind(this);
    this.onGUIContent             = this.onGUIContent.bind(this)

    GUI.onbefore('setContent', this.onGUIContent);
    this.layer.on('unselectionall',    this.clearAllServiceSelection);
    this.layer.on('filtertokenchange', this.filterChangeHandler);

    // overwrite show method
    comp.show = async (opts = {}) => {
      try {
        GUI.closeOpenSideBarComponent(); // close other sidebar components
        await this.getData({ firstCall: true });
        GUI.showContent({
          content: comp,
          perc: 50,
          split: GUI.isMobile() ? 'h': 'v',
          push: false,
          title: opts.title
        });
      } catch (e) {
        console.warn(e);
        GUI.notify.error(t("info.server_error"))
      } finally {
        comp.emit('show')
      }
    };

    comp.on('show', () => {
      if (this.isMobile()) {
        GUI.hideSidebar();
      }
      this.$options.onShow()
    });

    comp.show({ title: this.layer.getName() });
  },

  async mounted() {

    this.setContentKey = GUI.onafter('setContent', this.resize);

    await this.$nextTick();

    this.first = false;

    table = $(this.$refs.attribute_table).DataTable({
      "scrollX": true,
      "processing": false,
      "scrollCollapse": true,
      "sSearch": false,
      "order": [ 1, 'asc' ],
      "dom": 'l<"#g3w-table-toolbar">frtip',
      "columnDefs": [ {
        "targets": 0,
        "orderable": false,
        "searchable": false,
        "width": '1%'
      } ],
      "lengthMenu": this.state.pageLengths,
      "pageLength": this.state.pageLength,
      ...(
        this.state.pagination
        ? {
          "columns": this.state.headers,
          "ajax": debounce((data, cb) => {
            //remove listeners
            $('#open_attribute_table table tr').each(el => { $(el).off('click'); $(el).off('mouseover'); });
            this
              .getData(data)
              .then(async d => {
                cb(d);
                await this.$nextTick();
                this.createdContentBody();
                this.isMobile() && _hideDataTableElements();
              })
              .catch(console.warn)
          }, 800),
          "serverSide": true,
          "deferLoading": this.state.allfeatures,
        } : {
          "searchDelay": 600,
        }
      )
    });

    // pagination
    if (this.state.pagination) {
      this.service.on('ajax-reload', table.ajax.reload);
    } else { // no pagination all data
      table.on('search.dt', debounce(() => { this.setFilteredFeature(table.rows( {search:'applied'} )[0]) }, 600));
      table.on('length.dt', (e, opts, len) => { this.layer.setAttributeTablePageLength(len); });
    }

    this.changeColumn = debounce(async (e, i) => {
      table.columns(i).search(e.target.value.trim()).draw();
      if (!this.state.pagination) {
        this.setFilteredFeature(table.rows( {search:'applied'})[0]);
      }
    });

    if (this.isMobile()) {
      _hideDataTableElements();
    }

    $('#g3w-table-toolbar').html((new (Vue.extend(G3wTableToolbar))({
      propsData: {
        tools:             this.state.tools,
        geolayer:          this.state.geolayer,
        switchSelection:   this.switchSelection,
        clearAllSelection: this.clearAllSelection,
        toggleFilterToken: this.toggleFilterToken,
        getDataFromBBOX:   this.getDataFromBBOX
      },
    })).$mount().$el);

    this.service.on('redraw', data => {
      table.clear();
      table.draw(false);
      setTimeout(() => {
        table.rows.add(data);
        table.draw(false);
        this.createdContentBody();
        if (this.isMobile()) {
          _hideDataTableElements();
        }
      })
    })
  },

  beforeDestroy() {
    this.clearService();
    this.service.off('ajax-reload');
    this.service.off('redraw');
    GUI.un('setContent', this.setContentKey);
    table.destroy(true);
    table = null;
  },

};
</script>

<style scoped>
  .geometry {
    cursor: pointer
  }
  #noheaders {
    background-color: #ffffff;
    font-weight: bold;
    margin-top: 10px;
  }
</style>
