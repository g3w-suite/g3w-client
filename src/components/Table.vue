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
          <th v-disabled = "disableSelectAll">
            <input
              type       = "checkbox"
              id         = "attribute_table_select_all_rows"
              :checked   = "state.selectAll"
              class      = "magic-checkbox"
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
               <i
                @click.stop            = "openForm(feature)"
                v-t-tooltip:top.create = "'sdk.tooltips.relations.row_to_form'"
                :class                 = "'action-button skin-color ' + g3wtemplate.getFontClass('table')"
              ></i>
              <i
                v-if                   = "!feature.geometry"
                v-t-tooltip:top.create = "'no_geometry'"
                style                  = "color: currentColor !important;"
                :class                 = "'action-button ' + g3wtemplate.getFontClass('alert')"
              ></i>
              <i
                v-if                   = "layer.isEditable()"
                @click.stop            = "editFeature(feature)"
                v-t-tooltip:top.create = "'sdk.tooltips.editing'"
                :class                 = "'action-button skin-color ' + g3wtemplate.getFontClass('pencil')"
              ></i>
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
const PAGELENGTHS = [10, 25, 50, 100];

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
      // when the current layer is: alphanumerical + not child of relation + relation has geometry
      relations: (layer.isGeoLayer() ? [] : layer.getRelations().getArray())
        .map(relation => [relation, CatalogLayersStoresRegistry.getLayerById(relation.getFather())])
        .filter(([relation, father]) => layer.getId() !== relation.getFather() && father.isGeoLayer())
        .map(([relation, father]) => ({
          layer:         father,
          father_fields: relation.getFatherField(), // NB: since g3w-admin@v3.7.0 this is an Array value.
          fields:        relation.getChildField(),  // NB: since g3w-admin@v3.7.0 this is an Array value.
          features:      {},
        })),
      filter:              [],
      has_map:             true,
      async_highlight:     noop,
      getAll:              false,
      search:              {},
      firstCall:           true,
      map_bbox:            { key: null, cb: null },
      disableSelectAll:    false,
    };
  },
  
  computed: {

    /** @since 3.10.0 */
    has_features() {
      return !!this.state.features.length;
    },

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
      $('.tooltip').remove();
      GUI
        .getService('queryresults')
        .editFeature({ layer: { id: this.layer.getId() }, feature })
    },

    /**
     * @param feature
     * 
     * @since 3.10.0
     */
     async openForm(feature) {
      $('.tooltip').remove();
      try {
        await promisify(
          DataRouterService.getData('search:fids', {
            inputs: {
              layer: this.layer,
              fids: [feature.id],
              formatter: 1
            }
          })
        );
        // zoom to feature
        if (feature.geometry) {
          GUI.getService('map').zoomToGeometry(coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates));
        }
        this.zoomToGeometry(feature);
      } catch (e) {
       console.warn(e); 
      }
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

      if (is_active) {
        this.map_bbox.cb = () => {
          this.state.geolayer.in_bbox = this.state.geolayer.active ? map.getMapBBOX().join(',') : undefined;
          $(this.$refs.attribute_table).DataTable().ajax.reload();
        };
      }

      if (is_active) {
        this.map_bbox.key = map.getMap().on('moveend', this.map_bbox.cb);
      }

      if (this.map_bbox.cb) {
        this.map_bbox.cb();
      }

      // reset bbox event handler
      if (!is_active) {
        ol.Observable.unByKey(this.map_bbox.key);
        this.map_bbox.key = null;
        this.map_bbox.cb  = null;
      }
    },
    /**
    * @since 3.10.0
    */
    checkSelectAll() {
      this.state.selectAll = this.layer.getSelectionFids().has(SELECTION.ALL) || this.state.features.every(f => f.selected);
    },

    async inverseSelection() {
        //need to get all features
        if (!this.getAll) { await this.getFeatures() }
        this.state.features.forEach(f => f.selected = !f.selected);
        this.layer.invertSelectionFids();
        //set selectAll checkbox
        this.checkSelectAll();
    },

    /**
     * Called when a selected feature is checked
     */
    async selectAllRows() {

      // set inverse of selectAll
      this.state.selectAll = !this.state.selectAll;

      const filter         = this.filter.length > 0;

      if (!filter) {
        if (!this.getAll) { await this.getFeatures() }
        this.state.features.forEach(f => f.selected = this.state.selectAll)
        await this.layer[this.state.selectAll ? 'setSelectionFidsAll' : 'clearSelectionFids']();
      }

      if (filter) {
        // in case of select all true
        if (this.state.selectAll) {
          this.state
            .features
            .filter(f => this.filter.includes(f.id))
            .forEach(f => {
              f.selected = true;
              this.layer.includeSelectionFid(f.id);
            });

        } else {
          this.state.features.forEach(f => f.selected = false);
          this.layer.clearSelectionFids();
        }
      }

      this.state.show_tools = this.state.features.some(f => f.selected);
    },

    /**
     * Highlight or zoom to feature
     * 
     * @param {*} feature
     * @param {*} zoom    - whether zoom to feature
     */
    async highlight(feature, zoom = true) {
      const map = GUI.getService('map');

      // no feature or no feature geometry → clear highlight
      if (!feature || !feature.geometry) {
        return map.clearHighlightGeometry();
      }

      this.async_highlight = () => {
        map.clearHighlightGeometry();
        map.highlightGeometry(feature.geometry, { zoom, duration: Infinity })
      };

      // sync highlight
      if (feature.geometry && this.has_map) {
        return this.async_highlight();
      }

      // skip when there is no relation features geometry
      if (feature.geometry || (!feature.geometry && !this.relations.length > 0)) {
        return;
      }

      // zoom and highlight relation features 
      const features     = [];
      const field_values = []; // check if add or not

      (await Promise.allSettled(this.relations.flatMap(({ layer, father_fields, fields }) => {
        const values = fields.map(f => feature.attributes[f]);
        field_values.push(values);
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
            const relation = this.relations[index];
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
      //invert selected of feature
      feature.selected = !feature.selected;

      this.state.selectAll = this.state.features.every(f => f.selected);

      this.layer[feature.selected ? 'includeSelectionFid' : 'excludeSelectionFid'](feature.id);

      /** Show tools based on selected state */
      this.state.show_tools = this.layer.getSelectionFids().size > 0;

    },

    async resize() {
      await this.$nextTick();
      const table = this.$el.querySelector('div.dataTables_scrollBody');
      if (table) {
        table.style.height = GUI.isMobile() ? '100%' : (
            ((document.querySelector('.content')                       || {}).clientHeight || 0) // table height
          - ((this.$el.querySelector('div.dataTables_scrollHeadInner') || {}).clientHeight || 0) // table header height
          - 100
        ) + 'px';
      }
    },

    async getFeatures(params) {
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
      length    = this.layer.getAttributeTablePageLength() || PAGELENGTHS[1],
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

      this.search = {
        field:     columns.filter(c => c.search && c.search.value).map(c => `${c.name}|ilike|${c.search.value}|and`).join(',') || undefined,
        page:      (start === 0 || this.layer.state.filter.active) ? 1 : (start/length) + 1, // get current page
        page_size: length,
        search:    search.value && search.value.length > 0 ? search.value : null,
        in_bbox:   this.state.geolayer.in_bbox,
        ordering:  ('asc' === order[0].dir ? '' : '-') + this.state.headers[order[0].column].name,
        formatter: 1,
      };

      try {
        const data = await promisify(
          this.layer.getDataTable(this.search)
        );

        this.state.allfeatures   = data.count;
        this.state.featurescount = (data.features || []).length;

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
        this.state.selectAll  = this.layer.state.filter.active || this.state.features.every(f => f.selected);
        return {
          // DataTable pagination
          data: this.state.features.map(f => [null].concat(this.state.headers.filter(h => h).map(h => { h.value = (f.attributes || f.properties)[h.name]; return h.value; }))),
          recordsFiltered: data.count,
          recordsTotal:    data.count,
          filter:          this.state.features.map(f => f.id)

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

    /**
     * @param { Object } opts
     * @param { string } opts.type
     * 
     * @fires redraw when `opts.type` in_bbox filter (or not select all)
     */
    // async changeFilter({ type } = {}) {

    //   if (false === (type === 'in_bbox' || !this.layer.getSelectionFids().has(SELECTION.ALL))) {
    //     return;
    //   }

    //   // force redraw
    //   /** @TODO use "table.ajax.reload()"" instead? */
    //   const table = $(this.$refs.attribute_table).DataTable();
    //   table.rows.add([]);     // substitute data
    //   table.draw(false);      // redraw
    //   table.columns.adjust(); // adjust column
    // },

    onGUIContent(opts) {
      this.has_map = (100 !== opts.perc);
    },
    /**
     * Reload data from server
     * @since 3.10.0
     */
    filterChangeHandler() {
      $(this.$refs.attribute_table).DataTable().ajax.reload();
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

    // disable any previous active map control
    this.last_map_control = GUI.getService('map').getMapControls().find(c => c.control.isToggled && c.control.isToggled());
    if (this.last_map_control) {
      this.last_map_control.control.toggle();
    }

    GUI.closeContent();

    // bind context on event listeners
    this.unSelectAll  = this.unSelectAll.bind(this);
    // this.changeFilter = this.changeFilter.bind(this);
    this.onGUIContent = this.onGUIContent.bind(this)

    GUI.onbefore('setContent',   this.onGUIContent);
    this.layer.on('unselectionall',    this.unSelectAll);
    this.layer.on('filtertokenchange', this.filterChangeHandler);

    GUI.closeOpenSideBarComponent(); // close other sidebar components

    /** @FIXME `perc` parameter is not honored by `GUI.showContent` */
    ApplicationService.getCurrentLayout().rightpanel.height = 55;

    GUI.showContent({
      content: new Component({
        id: 'openattributetable',
        service: { state: this.state },
        internalComponent: this,
      }),
      // perc: undefined !== this.$options.perc ? this.$options.perc : 55,
      split: GUI.isMobile() ? 'h': 'v',
      push: false,
      title: this.layer.getTitle(),
    });

    if (this.isMobile()) {
      GUI.hideSidebar();
    }
  },

  async mounted() {
    this.setContentKey = GUI.onafter('setContent', this.resize);

    await this.$nextTick();
    //resolve data from server
    let pResolve;
    //store columns index value search
    let filterColumns = {};
    //set data table
    const table = $(this.$refs.attribute_table).DataTable({
      ajax: debounce(async (opts, cb) => {
        try {
          // disable table content to avoid clicking on table during loading of new data
          GUI.disableContent(true);
          const data = await this.getData(opts);
          cb(data);
          this.disableSelectAll = 0 === this.state.features.length;
          if (pResolve) { pResolve(data.filter) }
          await this.$nextTick();
          table.columns.adjust();
        } catch(e) {
          console.warn(e);
        }
        //enable table data content after get data
        GUI.disableContent(false);
      }, 800),
      bSortCellsTop:  true,
      columns:        this.state.headers,
      columnDefs:     [{ orderable: false, searchable: false, targets: 0, width: '1%' }],
      deferLoading:   this.state.allfeatures,
      dom:            'frt<"#g3w-table-toolbar">lip',
      lengthMenu:     PAGELENGTHS,
      order:          [ 1, 'asc' ],
      pageLength:     this.layer.getAttributeTablePageLength() || PAGELENGTHS[1],
      processing:     false,
      responsive:     true,
      scrollCollapse: true,
      scrollX:        true,
      serverSide:     true,
      sSearch:        false,
    });

    this.changeColumn = debounce(async (e, i) => {
      const value = e.target.value.trim();
      table.one('draw', async() => {
        filterColumns[i] = value;
        this.disableSelectAll = 0 === this.state.features.length;
        this.filter           = Object.values(filterColumns).find(f => f) ? await (new Promise((resolve) => pResolve = resolve)) : [];
      })
      table.columns(i).search(value).draw();
    });

    // move "table_toolbar" DOM element under datatable 
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this.$refs.table_toolbar);
    document.getElementById('g3w-table-toolbar').appendChild(fragment);

    // move "dataTables_info" and "dataTables_filter" before header action tools
    document.querySelector('#g3w-view-content .g3-content-header-action-tools').insertAdjacentElement('beforebegin', document.querySelector('.dataTables_info'));  
    document.querySelector('#g3w-view-content .g3-content-header-action-tools').insertAdjacentElement('beforebegin', document.querySelector('.dataTables_filter'));  

    // hide datatable rows → show only our custom "table_body"
    document.getElementById('table_body_attributes').remove();

    table.ajax.reload();
  },

  beforeDestroy() {
    // restore any previous active map control
    if (this.last_map_control) {
      this.last_map_control.control.toggle();
    }

    this.layer.off('unselectionall',    this.unSelectAll);
    this.layer.off('filtertokenchange', this.filterChangeHandler);

    // reset bbox event handler
    ol.Observable.unByKey(this.map_bbox.key);
    this.map_bbox.key = null;
    this.map_bbox.cb  = null;

    this.highlight();

    if (!this.has_map) {
      setTimeout(() => {
        this.async_highlight();
        this.has_map = true;
        this.async_highlight = noop;
      });
    }

    GUI.un('setContent', this.setContentKey);

    document.querySelector('#g3w-view-content .dataTables_info').remove();
    document.querySelector('#g3w-view-content .dataTables_filter').remove();
    $(this.$refs.attribute_table).DataTable().destroy(true);
  },

};
</script>

<style>
#g3w-table-toolbar {
  margin: 0.755em 1ch 0 0;
  position: relative;
  bottom: 3px;
  display: inline-flex;
  border-radius: 2px;
  border: 1px solid #d2d6de;
  background-color: #fff;
  float: left;
}
</style>

<style scoped>
  .geometry {
    cursor: pointer
  }
  #noheaders {
    background-color: #ffffff;
    font-weight: bold;
    margin-top: 10px;
  }
  input.form-control.column-search::placeholder{
    font-weight: normal;
    font-style: italic;
  }
  input.form-control.column-search {
    height: 25px;
    min-width: 40px;
    padding: 2px;
  }
  #open_attribute_table .action-button {
    padding: 5px;
  }
  #g3w-table-toolbar .action-button {
    padding: 4px;
  }
  #g3w-table-toolbar .action-button.toggled {
    border: 1px solid #cccccc;
  }
  #layer_attribute_table {
    width: 100%;
    user-select: none;
  }
  /* #layer_attribute_table > tbody > tr {
    cursor: pointer;
  } */
  #layer_attribute_table > tbody > tr:not(.selected):hover {
    background-color: rgb(255, 255, 0, 0.15);
  }
  label[for="attribute_table_select_all_rows"] {
    margin-bottom: 0 !important;
  }
</style>

<style>
  #g3w-view-content .dataTables_filter {
    margin-left: auto;
    margin-right: 1ch;
  }
  #g3w-view-content .dataTables_info {
    padding-left: .5ch;
    font-weight: lighter;
  }
  #open_attribute_table .paginate_button {
    background: transparent;
    color: currentColor !important;
    box-shadow: none;
  }
  #open_attribute_table .paginate_button.disabled {
    opacity: 0.25;
  }  
  #open_attribute_table #layer_attribute_table_length {
    padding-top: .755em;
  }
</style>