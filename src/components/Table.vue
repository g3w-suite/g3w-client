<!--
  @file
  @since v3.7
-->

<template>
  <div id="open_attribute_table" style="margin-top: 5px">

    <!-- TABLE TOOLBAR -->
    <!-- ORIGINAL SOURCE: src/components/TableToolBar.vue@3.9.7 -->
    <div
      v-if  = "state.headers.length"
      ref   = "table_toolbar"
      style = "display: flex; justify-content: space-between; padding: 1px;"
    >

      <!-- FETCH DATA FROM BBOX -->
      <div
        v-if               = "layer.isGeoLayer()"
        class              = "skin-color action-button skin-tooltip-right"
        data-placement     = "right"
        v-disabled         = "state.geolayer.active && ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel.height_100"
        data-toggle        = "tooltip"
        data-container     = "body"
        :class             = "[ g3wtemplate.getFontClass('map'), state.geolayer.active ? 'toggled' : '' ]"
        v-t-tooltip.create = "'layer_selection_filter.tools.show_features_on_map'"
        @click.stop        = "getDataFromBBOX"
      ></div>

      <!-- CLEAR SELECTION -->
      <div
        v-show             = "state.show_tools"
        class              = "skin-color action-button skin-tooltip-right"
        data-placement     = "right"
        data-toggle        = "tooltip"
        data-container     = "body"
        :class             = "g3wtemplate.getFontClass('clear')"
        v-t-tooltip.create = "'layer_selection_filter.tools.clear'"
        @click.stop        = "layer.clearSelectionFids()"
      ></div>

      <!-- INVERSE SELECTION -->
      <div
        v-show             = "state.show_tools"
        class              = "skin-color action-button skin-tooltip-right"
        data-placement     = "right"
        data-toggle        = "tooltip"
        data-container     = "body"
        :class             = "[ g3wtemplate.getFontClass('invert'), layer.state.filter.active ? 'g3w-disabled': '' ]"
        v-t-tooltip.create = "'layer_selection_filter.tools.invert'"
        @click.stop        = "inverseSelection"
      ></div>

      <!-- TOGGLE FILTER -->
      <div
        v-show             = "state.show_tools"
        class              = "skin-color action-button skin-tooltip-right"
        data-placement     = "right"
        data-toggle        = "tooltip"
        data-container     = "body"
        @click.stop        = "layer.toggleFilterToken()"
        :class             = "[ g3wtemplate.getFontClass('filter'), layer.state.filter.active ? 'toggled' : '' ]"
        v-t-tooltip.create = "'layer_selection_filter.tools.filter'"
      ></div>

    </div>

    <!-- TABLE CONTENT -->
    <table
      v-if  = "state.headers.length"
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
            <span v-if="i > 0">{{ header.label }}</span>
            <span v-else>
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
                @click.capture.stop.prevent = "selectAllRows"
              >
                <span style="padding:5px"></span>
              </label>
            </span>
          </th>
        </tr>
      </thead>

      <!-- AJAX CONTENT (TABLE ROWS) -->
      <!-- ORIGINAL SOURCE: src/components/TableBody.vue@3.9.3 -->
      <tbody id="table_body_attributes"></tbody>

    </table>
    <div v-else id="noheaders" v-t="'dataTable.no_data'"></div>
  </div>
</template>

<script>
import G3WObject                   from 'core/g3w-object';
import Component                   from 'core/g3w-component';
import Field                       from 'components/FieldG3W.vue';
import ApplicationState            from 'store/application-state';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import GUI                         from 'services/gui';
import DataRouterService           from 'services/data';
import { resizeMixin }             from 'mixins';
import { debounce }                from 'utils/debounce';
import { coordinatesToGeometry }   from 'utils/coordinatesToGeometry';
import { noop }                    from 'utils/noop';
import { getUniqueDomId }          from 'utils/getUniqueDomId';
import { promisify }               from 'utils/promisify';

const { t }                        = require('core/i18n/i18n.service');
const { SELECTION_STATE }          = require('core/layers/layer');

//Supported page lengths
const PAGELENGTHS = [10, 25, 50];

/**
 * Create a unique feature key
 */
function _createFeatureKey(values) {
  return values.join('__');
}

function _createFeatureForSelection(feature) {
  let geometry;
  if (feature.attributes) { geometry = feature.geometry }
  if (feature.geometry) { geometry = coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates) }
  return {
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry,
  }
}

/** Data Table */
let table;

export default {

  name: "G3WTable",

  mixins: [resizeMixin],

  components: {
    Field
  },

  data() {
    //Get layer
    const layer           = CatalogLayersStoresRegistry.getLayerById(this.$options.layerId);
    let relationsGeometry = [];

    // In the case of alphanumerical layer
    if (!layer.isGeoLayer()) {
      layer
        .getRelations()
        .getArray()
        .forEach(relation => {
          const father = CatalogLayersStoresRegistry.getLayerById(relation.getFather()); // get project layer
          if (
            layer.getId() !== relation.getFather() &&   // the current layer is not child layer of relation
            father.isGeoLayer()                         // relation layer has geometry
          ) {
            relationsGeometry.push({
              layer:         father,
              father_fields: relation.getFatherField(), // NB: since g3w-admin@v3.7.0 this is an Array value.
              fields:        relation.getChildField(),  // NB: since g3w-admin@v3.7.0 this is an Array value.
              features:      {},
            })
          }
        });
    }

    const pagination = true;

    return {
      layer,
      state: {
        pagination,
        features:      [],
        headers:       [null, ...layer.getTableHeaders()], // first value is `null` for DataTable purpose (used to add a custom input selector)
        geometry:      true,
        allfeatures:   0,
        selectAll:     false,
        nofilteredrow: false,
        show_tools:    false,
        geolayer: {
          active:    false,
          in_bbox:   undefined,
        },
      },
      table:               null,
      relationsGeometry,
      paginationfilter:    false,
      allfeaturesnumber:   undefined,
      nopaginationsfilter: [],
      /** Pagination filter features */
      _async:              Object.assign({ state: false, fnc: noop}, (this._async || {})),
      getAll:              !pagination,
      paginationParams:    {},
    };
  },
  
  computed: {

    ApplicationState() {
      return ApplicationState;
    },

  },

  methods: {

    /**
     * @param feature
     * 
     * @since 3.10.0
     */
    editFeature(feature) {
      GUI
        .getService('queryresults')
        .editFeature({ layer: { id: this.layer.getId() }, feature })
    },

    get_check_id(cache) {
      if (cache) {
        this.get_check_id.cached_id = getUniqueDomId();
      }
      return this.get_check_id.cached_id
    },

    async getDataFromBBOX() {
      const map = GUI.getService('map');

      this.state.geolayer.active = !this.state.geolayer.active;

      const is_active = this.state.geolayer.active;
      const listener  = this.mapBBoxEventHandlerKey;

      if (is_active && this.state.pagination) {
        listener.cb = () => {
          this.state.geolayer.in_bbox = this.state.geolayer.active ? map.getMapBBOX().join(',') : undefined;
          this.service.emit('ajax-reload');
        };
      }

      if (is_active && !this.state.pagination) {
        listener.cb = async () => {
          this.state.geolayer.in_bbox = this.state.geolayer.active ? map.getMapBBOX().join(',') : undefined;
          this.changeFilter({ type: 'in_bbox' });
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

    async inverseSelection() {
      const has_pagination = this.state.pagination;
      const filter         = this.nopaginationsfilter;
      const filtered       = !has_pagination && filter.length ? [] : undefined;
      let selected         = false;

      // pagination
      if (has_pagination) {
        this.state.features.forEach(f => {
          f.selected = !f.selected;
          selected   = f.selected;
        });
      }

      if (has_pagination && !this.getAll) {
        await this.getAllFeatures();
      }

      this.state.selectAll = (has_pagination && this.paginationfilter) ? selected : this.state.selectAll;

      // filtered
      if (!has_pagination && filter.length) {
        this.state.features.forEach((f, i) => {
          if (-1 !== filter.indexOf(i)) {
            filtered.push(f);
          }
          f.selected = !f.selected;
          this.layer[f.selected ? 'includeSelectionFid' : 'excludeSelectionFid' ](f.id);
          selected = selected || f.selected;
        });
        this.state.show_tools = selected;
      }
      
      // no filter
      if (!has_pagination && !filter.length) {
        this.state.features.forEach(f => { f.selected = !f.selected; });
      }

      if (has_pagination || !filter.length) {
        this.layer.invertSelectionFids();
      }

      if (!has_pagination) {
        this.checkSelectAll(filtered);
      }

      if (has_pagination || !filter.length) {
        this.state.show_tools = this.layer.getSelectionFids().size > 0;
      }

    },

    /**
     * Called when a selected feature is checked
     */
    async selectAllRows() {
      if (!this.state.features.length) {
        return;
      }
      // set inverse of selectAll
      this.state.selectAll = !this.state.selectAll;

      const has_pagination = this.state.pagination;
      const filter         = this.nopaginationsfilter;
      let selected         = false;

      // filtered
      if (!has_pagination && filter.length) {
        this.state.features.forEach((f, i) => {
          if (-1 !== filter.indexOf(i)) {
            f.selected = this.state.selectAll;
            this.layer[f.selected ? 'includeSelectionFid': 'excludeSelectionFid'](f.id);
            selected = selected || f.selected;
          }
        });
        this.state.show_tools = selected;
      }

      // no filter
      if (!has_pagination && !filter.length) {
        this.state.show_tools = this.state.selectAll;
        this.layer[this.state.selectAll ? 'setSelectionFidsAll': 'clearSelectionFids']();
        this.state.features.forEach(f => f.selected = this.state.selectAll);
      }

      // filtered pagination
      if (has_pagination && this.paginationfilter && this.state.featurescount >= this.state.allfeatures) {
        this.state.features.forEach(f => {
          f.selected = this.state.selectAll;
          this.layer[f.selected ? 'includeSelectionFid': 'excludeSelectionFid'](f.id);
        });
      }

      if (has_pagination && this.paginationfilter && this.state.featurescount < this.state.allfeatures) {
        const features = await this.getAllFeatures({
          formatter: 1,
          search:    this.paginationParams.search,
          ordering:  this.paginationParams.ordering,
          in_bbox:   this.paginationParams.in_bbox,
        });
        features.forEach(f => {
          if (!this.getAll && this.layer.isGeoLayer() && f.geometry) {
            this.layer.addOlSelectionFeature({
              id: f.id,
              feature: _createFeatureForSelection(f)
            });
          }
          this.layer[this.state.selectAll ? 'includeSelectionFid' : 'excludeSelectionFid'](f.id);
        })
      }

      if (has_pagination) {
        this.state.features.forEach(f => f.selected = this.state.selectAll);
      }

      if (has_pagination && !this.paginationfilter && !this.getAll) {
        await this.getAllFeatures();
      }

      if (has_pagination && !this.paginationfilter) {
        this.layer[this.state.selectAll ? 'setSelectionFidsAll': 'clearSelectionFids']();
      }

      if (has_pagination) {
        this.state.show_tools = this.state.selectAll || this.layer.getSelectionFids().size > 0;
      }

    },

    /**
     * Highlight or zoom to feature
     * 
     * @param {*} feature
     * @param {*} zoom    - whether zoom to feature
     */
    async highlight(feature, zoom = true) {
      const map = GUI.getService('map');

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

      // skip when there is no relation features geometry
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

          if (zoom) {
              promises.push(DataRouterService
              .getData('search:features', {
                inputs: {
                  layer,
                  formatter: 1,
                  filter: (
                    father_fields
                      .reduce((filter, field, index) => {
                        filter = `${filter}${index > 0 ? '|AND,' : ''}${field}|eq|${encodeURIComponent(values[index])}`
                        return filter;
                      }, '')
                  ),
                },
                outputs: false, // just a request not show on result
              }));
          }
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
            if (zoom) {
              map.zoomToFeatures(features, { highlight: true });
            } else {
              map.highlightFeatures(features);
            }
          });
      }

    },

    /**
     * Add or Remove feature to selection
     */
    select(feature) {
      feature.selected = !feature.selected;

      const selected       = this.layer.getSelectionFids();
      const filter         = this.nopaginationsfilter;
      const count          = this.allfeaturesnumber;

      const select_all     = this.state.selectAll;
      const has_pagination = this.state.pagination;
      const features       = this.state.features;
      const is_active      = this.layer && this.layer.state.filter && this.layer.state.filter.active

      const is_exclude     = !select_all && selected.has(SELECTION_STATE.EXCLUDE);
      const is_default     = !select_all && !is_exclude;

      /** @FIXME add description */
      if (select_all) {
        this.state.selectAll = false;
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
      this.state.show_tools = selected.size > 0;

      /** @FIXME add description */
      if (
        (is_exclude && 1 === selected.size) ||
        (is_default && selected.size === count) ||
        (!has_pagination && filter.length && filter.length === features.filter(f => f.selected).length)
      ) {
        this.state.selectAll = true;
      }

    },

    async reloadLayout() {
      await this.$nextTick();
      if (table) {
        table.columns.adjust();
      }
    },

    /**
     * Update DataTable content (with a custom html structure)
     */
    updateTableBody() {
      document
        .querySelector('#table_body_attributes')
        .replaceWith((new (Vue.extend({ template: /* html */ `
          <tbody id="table_body_attributes">
            <tr
              v-for       = "(feature, i) in state.features" :key="feature.id"
              role        = "row"
              style       =  "cursor: pointer;""
              @mouseover  = "highlight(feature, false)"
              @click.stop = "highlight(feature, true)"
              :class      = "[
                i % 2 == 1 ? 'odd' : 'pair',
                'feature_attribute',
                { geometry: !!feature.geometry },
                { 'selected': feature.selected }
              ]">
              <td v-for="(header, j) in state.headers" :tab-index="1">
                <div
                  v-if  = "0 === j"
                  style = "display: flex"
                >
                  <!-- ORIGINAL SOURCE: src/components/TableSelectRow.vue@3.9.3 -->
                  <input
                    type     = "checkbox"
                    :id      = "get_check_id(true)"
                    :checked = "feature.selected"
                    class    = "magic-checkbox"
                  >
                  <label :for="get_check_id(false)" @click.capture.stop.prevent="select(feature)"></label>
                  <span
                    v-if                   = "layer.isEditable()"
                    @click.stop            = "editFeature(feature)"
                    v-t-tooltip:top.create = "'sdk.tooltips.editing'"
                  >
                    <i :class="'action-button skin-color ' + g3wtemplate.getFontClass('pencil')"></i>
                  </span>
                </div>
                <field
                  v-else
                  :feature = "feature"
                  :state   = "({ label: undefined, value: feature.attributes[header.name] })"
                />
              </td>
            </tr>
          </tbody>`,
          components: { Field },
          data: () => ({ ...this.$data }),
          methods: {
            get_check_id: this.get_check_id.bind(this),
            select:       this.select.bind(this),
            editFeature:  this.editFeature.bind(this),
            highlight:    this.highlight.bind(this),
          }
        }))()).$mount().$el);

      setTimeout(() => this.reloadLayout(), 0)
    },

    async resize() {
      await this.$nextTick();
      const table = this.$el.querySelector('div.dataTables_scrollBody');
      if (table) {
        table.style.height = (
            ((document.querySelector('.content')                       || {}).clientHeight || 0) // table height
          - ((this.$el.querySelector('div.dataTables_scrollHeadInner') || {}).clientHeight || 0) // table header height
          - 130
        ) + 'px';
      }
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
        this.checkSelectAll(filter.map(i => this.state.features[i]));
      }
    },

    checkSelectAll(features) {
      features = undefined === features ? this.state.features : features;
      this.state.selectAll = (
        this.layer.getSelectionFids().has(SELECTION_STATE.ALL) ||
        (features.length && features.reduce((selectAll, f) => selectAll && f.selected, true))
      );
    },

    async getAllFeatures(params) {
      try {
        GUI.setLoadingContent(true);

        const data = await promisify(this.layer.getDataTable(params || {}));
        const is_valid = this.layer.isGeoLayer() && data.features;

        if (is_valid && !params) {
          const loaded_features = this.state.features.map(f => f.id);
          data.features
            .filter(f => f.geometry && -1 === loaded_features.indexOf(f.id))
            .forEach(f => this.layer.addOlSelectionFeature({ id: f.id, feature: _createFeatureForSelection(f) }));
          this.getAll = true;
        }

        if (is_valid) {
          return data.features;
        }
      } catch(e) {
        console.warn(e);
        return Promise.reject();
      } finally {
        GUI.setLoadingContent(false);
      }
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
    async getData({
      start     = 0,
      order     = [],
      length    = this.layer.getAttributeTablePageLength() || PAGELENGTHS[0],
      columns   = [],
      search    = { value: null },
      firstCall = false,
    } = {}) {

      // reset features before a load
      GUI.setLoadingContent(true);

      this.layer.setAttributeTablePageLength(length);

      // If no headers are set, exit
      if (0 === this.state.headers.length) {
        return {
          data: [],
          recordsTotal: 0,
          recordsFiltered: 0
        };
      }

      this.state.features.splice(0);

      if (0 === order.length) {
        order.push({ column: 1, dir: 'asc', });
      }

      this.paginationParams = {
        field:     this.state.pagination && columns.filter(c => c.search && c.search.value).map(c => `${c.name}|ilike|${c.search.value}|and`).join(',') || undefined,
        page:      (start === 0 || (this.state.pagination && this.layer.state.filter.active)) ? 1 : (start/length) + 1, // get current page
        page_size: length,
        search:    search.value && search.value.length > 0 ? search.value : null,
        in_bbox:   this.state.geolayer.in_bbox,
        ordering:  ('asc' === order[0].dir ? '' : '-') + this.state.headers[order[0].column].name,
      };

      try {
        const data = await promisify(
          this.layer.getDataTable(
            this.state.pagination
              ? this.paginationParams
              : ({
                  formatter: 1,
                  ordering:  this.paginationParams.ordering,
                  in_bbox:   this.paginationParams.in_bbox,
                })
          )
        );
        const { features = [] }  = data;

        this.state.allfeatures   = data.count || this.state.features.length;
        this.state.featurescount = features.length;
        this.allfeaturesnumber   = (undefined === this.allfeaturesnumber ? data.count : this.allfeaturesnumber);
        this.paginationfilter    = (data.count !== this.allfeaturesnumber);

        if (firstCall) {
          this.state.pagination = this.layer.state.filter.active || features.length < this.allfeaturesnumber;
        }

        // add features
        this.state.features.push(
          ...(features || []).map(feature => {
            const tableFeature = {
              id:         feature.id,
              selected:   this.layer.hasSelectionFid(feature.id),
              attributes: feature.attributes || feature.properties,
              geometry:   this.layer.isGeoLayer() && feature.geometry || undefined
            };
            if (this.layer.isGeoLayer() && feature.geometry && !this.layer.getOlSelectionFeature(feature.id)) {
              this.layer.addOlSelectionFeature({
                id:      feature.id,
                feature: _createFeatureForSelection(feature)
              });
            }
            return tableFeature;
          })
        );

        this.state.show_tools = this.layer.getFilterActive() || this.layer.getSelectionFids().size > 0;

        this.checkSelectAll(); 

        return {
          // DataTable pagination
          data: this.state.features.map(f => {
            const attrs = f.attributes ? f.attributes : f.properties;
            return [null].concat(this.state.headers.filter(h => h).map(h => { h.value = attrs[h.name]; return h.value; }));
          }),
          recordsFiltered: data.count,
          recordsTotal:    data.count
        };
      } catch(e) {
        console.warn(e);
        GUI.notify.error(t("info.server_error"));
        return Promise.reject(e);
      } finally {
        GUI.setLoadingContent(false);
      }
    },

    unSelectAll() {
      this.state.features.forEach(f => f.selected = false);
      this.state.show_tools = false;
      this.state.selectAll = false;
    },

    clearService() {
      this.layer.off('unselectionall',    this.unSelectAll);
      this.layer.off('filtertokenchange', this.changeFilter);

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
    async changeFilter({ type } = {}) {
      this.allfeaturesnumber = undefined;

      if (false === (type === 'in_bbox' || !this.layer.getSelectionFids().has(SELECTION_STATE.ALL))) {
        return;
      }

      let data = [];

      // reload data
      if (!this.state.pagination) {
        this.state.features.splice(0);
        this.state.pagination = false;
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
  },

  /**
   * TableService Class
   * 
   * ORIGINAL SOURCE: src/app/gui/table/tableservice.js@v3.9.3
   */
  async created() {

    this.service = new G3WObject();
    this.service.state = this.state;

    // table content
    const comp = this.g3wComponent = new Component({
      id: 'openattributetable',
      service: this.service,
      internalComponent: this,
    });

    comp.layout = () => { comp.internalComponent.reloadLayout(); };
    this.service.on('redraw', () => { comp.layout(); });
    comp.on('unmount', () => { this.clearService(); })

    this.mapBBoxEventHandlerKey = {
      key: null,
      cb: null
    };

    // bind context on event listeners
    this.unSelectAll  = this.unSelectAll.bind(this);
    this.changeFilter = this.changeFilter.bind(this);
    this.onGUIContent = this.onGUIContent.bind(this)

    GUI.onbefore('setContent',         this.onGUIContent);
    this.layer.on('unselectionall',    this.unSelectAll);
    this.layer.on('filtertokenchange', this.changeFilter);

    // overwrite show method
    comp.show = async (opts = {}) => {
      try {
        GUI.closeOpenSideBarComponent(); // close other sidebar components
        // await this.getData({ firstCall: true });
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
      "lengthMenu": PAGELENGTHS,
      "pageLength": this.layer.getAttributeTablePageLength() || PAGELENGTHS[0],
      "columns": this.state.headers,
      "ajax": debounce(async (data, cb) => {
        try {
          //disable table content to avoid clicking on table during loading of new data
          GUI.disableContent(true);
          // remove listeners
          $('#open_attribute_table table tr').each(el => { $(el).off('click'); $(el).off('mouseover'); });
          cb(await this.getData(data));
          await this.$nextTick();
          this.updateTableBody();
        } catch(e) {
          console.warn(e);
        }
        //enable table data content after get data
        GUI.disableContent(false);

      }, 800),
      "serverSide": true,
      "deferLoading": this.state.allfeatures,
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
        this.setFilteredFeature(table.rows( { search:'applied' })[0]);
      }
    });

    // move "table_toolbar" DOM element under datatable 
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this.$refs.table_toolbar);
    document.getElementById('g3w-table-toolbar').appendChild(fragment);

    this.service.on('redraw', data => {
      table.clear();
      table.draw(false);
      setTimeout(() => {
        table.rows.add(data);
        table.draw(false);
        this.createdContentBody();
      })
    });

    table.ajax.reload();
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
  input.form-control.column-search {
    font-weight: normal;
  }
  #g3w-table-toolbar .action-button {
    padding: 4px;
  }
  #g3w-table-toolbar .action-button.toggled {
    border: 1px solid #cccccc;
  }
</style>

<style>
  .is-mobile .dataTables_info,
  .is-mobile .dataTables_length {
    display: none;
  }
  .is-mobile .dataTables_paginate {
    display: flex;
    justify-content: space-between;
    font-size: 0.8em;
    margin: 0;
  }
  .is-mobile .dataTables_filter {
    float: right;
  }
</style>