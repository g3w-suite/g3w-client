<!--
  @file
  @since v3.7
-->

<template>
  <div id="open_attribute_table" style="margin-top: 5px">

    <!-- TABLE TOOLBAR -->
    <!-- ORIGINAL SOURCE: src/components/TableToolBar.vue@3.9.7 -->
    <div
      ref   = "table_toolbar"
      style = "display: flex; justify-content: space-between; padding: 1px;"
    >

      <!-- FETCH DATA FROM BBOX -->
      <div
        v-if               = "layer.isGeoLayer()"
        class              = "skin-color action-button skin-tooltip-right"
        v-disabled         = "state.geolayer.active && ApplicationService.getCurrentLayout().rightpanel.height_100"
        :class             = "[ g3wtemplate.getFontClass('map'), state.geolayer.active ? 'toggled' : '' ]"
        v-t-tooltip.create = "'layer_selection_filter.tools.show_features_on_map'"
        data-placement     = "right"
        @click.stop        = "getDataFromBBOX"
      ></div>

      <!-- CLEAR SELECTION -->
      <div
        v-show             = "state.show_tools"
        class              = "skin-color action-button skin-tooltip-right"
        :class             = "g3wtemplate.getFontClass('clear')"
        v-t-tooltip.create = "'layer_selection_filter.tools.clear'"
        data-placement     = "right"
        @click.stop        = "layer.clearSelectionFids()"
      ></div>

      <!-- INVERSE SELECTION -->
      <div
        v-show             = "state.show_tools"
        class              = "skin-color action-button skin-tooltip-right"
        :class             = "[ g3wtemplate.getFontClass('invert'), layer.state.filter.active ? 'g3w-disabled': '' ]"
        v-t-tooltip.create = "'layer_selection_filter.tools.invert'"
        data-placement     = "right"
        @click.stop        = "inverseSelection"
      ></div>

      <!-- TOGGLE FILTER -->
      <div
        v-show             = "state.show_tools"
        class              = "skin-color action-button skin-tooltip-right"
        :class             = "[ g3wtemplate.getFontClass('filter'), layer.state.filter.active ? 'toggled' : '' ]"
        v-t-tooltip.create = "'layer_selection_filter.tools.filter'"
        data-placement     = "right"
        @click.stop        = "layer.toggleFilterToken()"
      ></div>

    </div>

    <!-- TABLE CONTENT -->
    <table
      v-if   = "state.headers.length"
      ref    = "attribute_table"
      id     = "layer_attribute_table"
      class  = "table table-striped row-border compact nowrap"
    >
      <thead>
        <tr>
          <th></th>
          <th v-for="(header, i) in state.headers" v-if="i > 0">{{ header.label }}</th>
        </tr>
        <tr>
          <th>
            <input
              type      = "checkbox"
              id        = "attribute_table_select_all_rows"
              :checked  = "state.selectAll"
              class     = "magic-checkbox"
              :disabled = "state.nofilteredrow || state.features.length === 0"
            />
            <label for="attribute_table_select_all_rows" @click.capture.stop.prevent="selectAllRows">&nbsp;</label>
          </th>
          <th v-for="(header, i) in state.headers" v-if="i > 0">
            <input
              type         = "text"
              class        = "form-control column-search"
              @keyup       = "changeColumn($event, i)"
              :placeholder = "header.name"
              :title        = "'search by ' + header.name"
            />
          </th>
        </tr>
      </thead>

      <!-- ORIGINAL SOURCE: src/components/TableBody.vue@3.9.3 -->
      <tbody id="table_body_attributes" hidden></tbody>
      <tbody ref="table_body" @mouseleave="highlight()">
        <tr
          v-for       = "(feature, i) in state.features" :key="feature.id"
          role        = "row"
          @mouseover  = "highlight(feature, false)"
          @click.stop = "highlight(feature, true)"
          :class      = "[
            i % 2 == 1 ? 'odd' : 'pair',
            'feature_attribute',
            { geometry: !!feature.geometry },
            { 'selected': feature.selected }
          ]">
          <!-- ORIGINAL SOURCE: src/components/TableSelectRow.vue@3.9.3 -->
          <td>
            <div style="display: flex">
              <input
                type     = "checkbox"
                :id      = "get_check_id(true)"
                :checked = "feature.selected"
                class    = "magic-checkbox"
              />
              <label :for="get_check_id(false)" @click.capture.stop.prevent="select(feature)"></label>
              <span
                v-if                   = "layer.isEditable()"
                @click.stop            = "editFeature(feature)"
                v-t-tooltip:top.create = "'sdk.tooltips.editing'"
              >
                <i :class="'action-button skin-color ' + g3wtemplate.getFontClass('pencil')"></i>
              </span>
            </div>
          </td>
          <td v-for="(header, j) in state.headers" v-if="j > 0">
            <field
              :feature = "feature"
              :state   = "({ label: undefined, value: feature.attributes[header.name] })"
            />
          </td>
        </tr>
      </tbody>

    </table>
    <div v-else id="noheaders" v-t="'dataTable.no_data'"></div>
  </div>
</template>

<script>
import Component                   from 'core/g3w-component';
import Field                       from 'components/FieldG3W.vue';
import CatalogLayersStoresRegistry from 'store/catalog-layers';
import ApplicationService          from 'services/application';
import GUI                         from 'services/gui';
import DataRouterService           from 'services/data';
import { resizeMixin }             from 'mixins';
import { debounce }                from 'utils/debounce';
import { coordinatesToGeometry }   from 'utils/coordinatesToGeometry';
import { noop }                    from 'utils/noop';
import { getUniqueDomId }          from 'utils/getUniqueDomId';
import { promisify }               from 'utils/promisify';
import { SELECTION }               from 'core/layers/mixins/selection';

const { t }                        = require('core/i18n/i18n.service');


//Supported page lengths
const PAGELENGTHS = [10, 25, 50];

function _createFeatureForSelection(f) {
  return {
    id: f.id,
    feature: {
      attributes: f.attributes || f.properties,
      geometry: f.geometry ? coordinatesToGeometry(f.geometry.type, f.geometry.coordinates) : f.geometry,
    },
  }
}

export default {

  name: "G3WTable",

  mixins: [resizeMixin],

  components: {
    Field
  },

  data() {
    const layer = CatalogLayersStoresRegistry.getLayerById(this.$options.layerId);

    return {
      layer,
      state: {
        pagination:    true,
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
      // when current layer is: alphanumerical + not child of relation + relation has geometry
      relationsGeometry: (layer.isGeoLayer() ? [] : layer.getRelations().getArray())
        .map(relation => [relation, CatalogLayersStoresRegistry.getLayerById(relation.getFather())])
        .filter(([relation, father]) => layer.getId() !== relation.getFather() && father.isGeoLayer())
        .map(([relation, father]) => ({
          layer:         father,
          father_fields: relation.getFatherField(), // NB: since g3w-admin@v3.7.0 this is an Array value.
          fields:        relation.getChildField(),  // NB: since g3w-admin@v3.7.0 this is an Array value.
          features:      {},
        })),
      paginationfilter:    false,
      allfeaturesnumber:   undefined,
      nopaginationsfilter: [],
      /** Pagination filter features */
      _async:              Object.assign({ state: false, fnc: noop}, (this._async || {})),
      getAll:              false,
      paginationParams:    {},
      firstCall:           true,
    };
  },
  
  computed: {

    ApplicationService() {
      return ApplicationService;
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
          $(this.$refs.attribute_table).DataTable().ajax.reload();
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
            this.layer.addOlSelectionFeature(_createFeatureForSelection(f));
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

      // no feature → clear highlight
      if (!feature) {
        return map.clearHighlightGeometry();
      }

      const cb = () => {
        map.clearHighlightGeometry();
        map.highlightGeometry(feature.geometry, { zoom, duration: Infinity })
      };

      // async highlight
      if (feature.geometry && this._async.state) {
        this._async.fnc = cb;
        return;
      }

      // sync highlight
      if (feature.geometry && !this._async.state) {
        cb();
        return;
      }

      // skip when there is no relation features geometry
      if (feature.geometry || (!feature.geometry && !this.relationsGeometry.length > 0)) {
        return;
      }

      // zoom and highlight relation features 
      const features     = [];
      const field_values = []; // check if add or not

      (await Promise.allSettled(this.relationsGeometry.flatMap(({ layer, father_fields, fields }) => {
        const values = fields.map(f => feature.attributes[f]);
        field_values.push(values);
        console.log(fields, father_fields, values, feature.attributes);
        return zoom
          ? DataRouterService.getData('search:features', {
              inputs: {
                layer,
                formatter: 1,
                filter: father_fields.map((field, i) => `${field}|eq|${encodeURIComponent(values[i])}`).join('|AND,'),
              },
              outputs: false, // just a request not show on result
            })
          : [];
      })))
        .forEach((response, index) => {
          if ('fulfilled' === response.status) {
            const relation = this.relationsGeometry[index];
            const k        = field_values[index].join('__'); // create a unique feature key
            const data     = response.value && response.value.data[0];
            if (undefined === relation.features[k]) {
              relation.features[k] = data && data.features || [];
            }
            features.push(...relation.features[k]);
          }
          if (zoom) {
            map.zoomToFeatures(features, { highlight: true });
          } else {
            map.highlightFeatures(features);
          }
        });
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

      const is_exclude     = !select_all && selected.has(SELECTION.EXCLUDE);
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
      if ([0, this.allfeaturesnumber].includes(index.length)) {
        this.checkSelectAll();
      } else {
        this.checkSelectAll(filter.map(i => this.state.features[i]));
      }
    },

    checkSelectAll(features) {
      features = undefined === features ? this.state.features : features;
      this.state.selectAll = (
        this.layer.getSelectionFids().has(SELECTION.ALL) ||
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
            .forEach(f => this.layer.addOlSelectionFeature(_createFeatureForSelection(f)));
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
     * 
     * @returns {Promise<{{ data: [], recordsTotal: number, recordsFiltered: number }}>}
     */
    async getData({
      start     = 0,
      order     = [],
      length    = this.layer.getAttributeTablePageLength() || PAGELENGTHS[0],
      columns   = [],
      search    = { value: null },
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

        this.state.allfeatures   = data.count || this.state.features.length;
        this.state.featurescount = (data.features || []).length;
        this.allfeaturesnumber   = (undefined === this.allfeaturesnumber ? data.count : this.allfeaturesnumber);
        this.paginationfilter    = (data.count !== this.allfeaturesnumber);

        if (this.firstCall) {
          this.state.pagination = this.layer.state.filter.active || this.state.featurescount < this.allfeaturesnumber;
          this.firstCall        = false;
        }

        // add features
        this.state.features.push(
          ...(data.features || []).map(f => {
            if (this.layer.isGeoLayer() && f.geometry && !this.layer.getOlSelectionFeature(f.id)) {
              this.layer.addOlSelectionFeature(_createFeatureForSelection(f));
            }
            return {
              id:         f.id,
              selected:   this.layer.hasSelectionFid(f.id),
              attributes: f.attributes || f.properties,
              geometry:   this.layer.isGeoLayer() && f.geometry || undefined
            };
          })
        );

        this.state.show_tools = this.layer.getFilterActive() || this.layer.getSelectionFids().size > 0;

        this.checkSelectAll(); 

        return {
          // DataTable pagination
          data: this.state.features.map(f => [null].concat(this.state.headers.filter(h => h).map(h => { h.value = (f.attributes || f.properties)[h.name]; return h.value; }))),
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

      if (false === (type === 'in_bbox' || !this.layer.getSelectionFids().has(SELECTION.ALL))) {
        return;
      }

      let data = [];

      // reload data
      if (!this.state.pagination) {
        this.state.features.splice(0);
        this.state.pagination = false;
        data = (await this.getData()).data || [];
      }

      // force redraw
      /** @TODO use "table.ajax.reload()"" instead? */
      const table = $(this.$refs.attribute_table).DataTable();
      table.clear();
      table.draw(false);
      setTimeout(async() => {
        table.rows.add(data);
        table.draw(false);
        await this.$nextTick();
        table.columns.adjust();
      });
  
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

    GUI.closeContent();

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

    GUI.closeOpenSideBarComponent(); // close other sidebar components

    /** @FIXME `perc` parameter is not honored by `GUI.showContent` */
    ApplicationService.getCurrentLayout().rightpanel.height = 60;

    GUI.showContent({
      content: new Component({
        id: 'openattributetable',
        service: { state: this.state },
        internalComponent: this,
      }),
      // perc: undefined !== this.$options.perc ? this.$options.perc : 60,
      split: GUI.isMobile() ? 'h': 'v',
      push: false,
      title: this.layer.getName(),
    });

    if (this.isMobile()) {
      GUI.hideSidebar();
    }
  },

  async mounted() {

    this.setContentKey = GUI.onafter('setContent', this.resize);

    await this.$nextTick();

    const table = $(this.$refs.attribute_table).DataTable({
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
          // disable table content to avoid clicking on table during loading of new data
          GUI.disableContent(true);
          cb(await this.getData(data));
          await this.$nextTick();
          table.columns.adjust();
        } catch(e) {
          console.warn(e);
        }
        //enable table data content after get data
        GUI.disableContent(false);
      }, 800),
      "serverSide": true,
      "deferLoading": this.state.allfeatures,
      "bSortCellsTop": true,
    });

    // no pagination all data
    if (!this.state.pagination) {
      table.on('search.dt', debounce(() => { this.setFilteredFeature(table.rows( { search:'applied' } )[0]) }, 600));
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

    // hide datatable rows → show only our custom "table_body"
    document.getElementById('table_body_attributes').remove();

    table.ajax.reload();
  },

  beforeDestroy() {
    this.layer.off('unselectionall',    this.unSelectAll);
    this.layer.off('filtertokenchange', this.changeFilter);

    this.resetMapBBoxEventHandlerKey();
    this.highlight();

    this.allfeaturesnumber = null;

    if (this._async.state) {
      setTimeout(() => {
        this._async.fnc();
        this._async.state = false;
        this._async.fnc   = noop;
      });
    }

    GUI.un('setContent', this.setContentKey);

    $(this.$refs.attribute_table).DataTable().destroy(true);
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
    font-style: italic;
    height: 25px;
    min-width: 40px;
    padding: 2px;
  }
  #g3w-table-toolbar .action-button {
    padding: 4px;
  }
  #g3w-table-toolbar .action-button.toggled {
    border: 1px solid #cccccc;
  }
  #layer_attribute_table {
    width: 100%;
  }
  #layer_attribute_table > tbody > tr {
    cursor: pointer;
  }
  label[for="attribute_table_select_all_rows"] {
    margin-bottom: 0 !important;
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