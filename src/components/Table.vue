<!--
  @file
  @since v3.7
-->

<template>
  <div id = "open_attribute_table">

    <!-- TOTAL ELEMENTS -->
    <span
      ref   = "table_info"
      style = "margin-left: .5ch;"
    >{{ state.allfeatures }} {{ $t('entries') }}</span>

    <!-- GLOBAL SEARCH -->
    <input
      ref          = "table_search"
      type         = "search"
      class        = "form-control search"
      :placeholder = "$t('dosearch')"
      style        = "margin-left: auto !important; margin-right: 1ch;"
      @keyup       = "globalSearch"
    />

    <!-- TABLE CONTENT -->
    <table
      v-if   = "state.headers.length"
      ref    = "attribute_table"
      id     = "layer_attribute_table"
    >
      <thead>
        <tr>
          <th style="pointer-events: none;"></th>
          <th
            v-for          = "(header, i) in state.headers"
            @click.stop    = "sortColumn(i)"
            :class         = "[i === ordering[0] ? ordering[1] : '' ]"
            :title         = "'sort by ' + header.name"
            data-placement = "top"
          >{{ header.label }}</th>
        </tr>
        <tr>
          <th v-disabled       = "disableSelectAll">
            <label @click.stop = "setSelection('all')">
              <input type = "checkbox" :checked = "all" />
            </label>
          </th>
          <th v-for = "(header, i) in state.headers">
            <input
              type           = "text"
              class          = "form-control column-search"
              @keyup         = "changeColumn($event, i)"
              :placeholder   = "header.name"
              :title         = "'search by ' + header.name"
              data-placement = "bottom"
            />
          </th>
        </tr>
      </thead>
      <tbody @mouseleave = "highlight()">
        <tr
          v-for       = "(feature, i) in state.features" :key = "feature.id"
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
            <div style = "display: flex">
              <label
                v-if   = "show_on_active_filter"
                @click = "select(feature)"
              >
                <input type = "checkbox" :checked = "feature.selected" />
              </label>
               <i
                @click.stop     = "openForm(feature)"
                v-t-tooltip:top = "'Form View'"
                :class          = "'action-button skin-color ' + $fa('table')"
              ></i>
              <i
                v-if            = "layer.state.geolayer && !feature.geometry"
                v-t-tooltip:top = "'This item has no geometry'"
                style           = "color: currentColor !important;"
                :class          = "'action-button ' + $fa('alert')"
              ></i>
              <i
                v-if            = "layer.isEditable() && (layer.config.editing || {}).visible"
                @click.stop     = "editFeature(feature)"
                v-t-tooltip:top = "'Editing'"
                :class          = "'action-button skin-color ' + $fa('pencil')"
              ></i>
            </div>
          </td>
          <td v-for = "header in state.headers">
            <field
              :feature = "feature"
              :state   = "({ label: undefined, value: feature.attributes[header.name] })"
            />
          </td>
        </tr>
      </tbody>

    </table>
    <div v-else id = "noheaders" v-t = "'No data'"></div>

    <!-- TABLE TOOLBAR -->
    <div class="table-toolbar" style="display: flex; gap: 1ch; margin-top: 1ch;">

      <!-- FETCH DATA FROM BBOX -->
      <button
        v-if            = "layer.isGeoLayer()"
        v-disabled      = "state.geolayer.active && current_layout.rightpanel.height_100"
        :class          = "['btn', state.geolayer.active ? 'toggled' : '' ]"
        v-t-tooltip:top = "'Update results when map moves'"
        @click.stop     = "getDataFromBBOX"
      ><i class = "far fa-map"></i></button>

      <!-- CLEAR SELECTION -->
      <button
        v-show          = "state.selection.active"
        class           = "btn"
        v-t-tooltip:top = "'Clear Selection'"
        @click.stop     = "layer.clearSelectionFids()"
      ><i class = "fas fa-broom"></i></button>

      <!-- INVERSE SELECTION -->
      <button
        v-show          = "state.selection.active"
        :class          = "[ 'btn', layer.state.filter.active ? 'g3w-disabled': '' ]"
        v-t-tooltip:top = "'Invert Selection'"
        @click.stop     = "setSelection('inverse')"
      ><i class = "fas fa-exchange-alt"></i></button>

      <!-- TOGGLE FILTER -->
      <button
        v-show          = "state.selection.active && show_on_active_filter"
        :class          = "[ 'btn', layer.state.filter.active ? 'toggled' : '' ]"
        v-t-tooltip:top = "'Enable/Disable filter'"
        @click.stop     = "layer.toggleToken()"
      ><i class = "fas fa-filter"></i></button>

      <!-- PAGE SIZE -->
      <label style="margin-top: 5px;">{{ $t('show') }} <select style = "border: 1px solid #aaa;" v-model = "search.page_size">
        <option v-for = "l in PAGELENGTHS" :value = "l">{{ l }}</option>
      </select> {{ $t('values per page') }}</label>

      <!-- PAGINATION BUTTONS -->
      <div style="margin-left: auto;" v-if = "state.featurescount && Math.ceil(state.allfeatures / search.page_size) > 1" >
        <button @click.stop = "changePage(-1)" class="btn" v-disabled = "1 === search.page">«</button>
        <select v-model = "search.page" style = "padding: 5px 12px; appearance: none; border: 0; text-align: center; border-radius: 3px;">
          <option v-for="p in Math.ceil(state.allfeatures / search.page_size)" :selected = "p == search.page">{{ p }}</option>
        </select>
        <button @click.stop = "changePage(+1)" class="btn">»</button>
      </div>

    </div>

  </div>
</template>

<script>
import { PAGELENGTHS }             from 'g3w-constants';
import Component                   from 'g3w-component';
import ApplicationState            from 'g3w-state';
import Field                       from 'components/FieldG3W.vue';
import GUI                         from 'g3w-app';
import { debounce }                from 'utils/debounce';
import { getCatalogLayerById }     from 'utils/getCatalogLayerById';
import { gettext as _ }            from 'g3w-i18n';

function toOLGeom(geom) {
  return new (Object.entries({
    'MultiPolygon': ol.geom.MultiPolygon,
    'MultiLine':    ol.geom.MultiLineString,
    'MultiPoint':   ol.geom.MultiPoint,
    'Polygon':      ol.geom.Polygon,
    'Line':         ol.geom.LineString,
    'Point':        ol.geom.Point,
    '':             ol.geom.Point, // fallback
  }).find(o => geom.type.startsWith(o[0])))[1](geom.coordinates);
}

export default {

  name: "G3WTable",

  components: {
    Field
  },

  data() {
    const layer   = getCatalogLayerById(this.$options.layerId);
    const headers = layer.getTableHeaders();
    return {
      layer,
      state: {
        id:            layer.getId(), //@since 4.1.0 aligned with query state layer
        external:      false,         //@since 4.1.0 aligned with query state layer
        selection:     layer.state.selection,//@since 4.1.0 aligned with query state layer
        features:      [],
        headers,      
        geometry:      true,
        allfeatures:   0,
        nofilteredrow: false,
        geolayer: {
          active:    false,
          in_bbox:   undefined,
        },
      },
      // when the current layer is: alphanumerical + not child of relation + relation has geometry
      relations: (layer.isGeoLayer() ? [] : layer.getRelations().getArray())
        .map(relation => [relation, getCatalogLayerById(relation.getFather())])
        .filter(([relation, father]) => layer.getId() !== relation.getFather() && father.isGeoLayer())
        .map(([relation, father]) => ({
          layer:         father,
          father_fields: relation.getFatherField(), // NB: since g3w-admin@v3.7.0 this is an Array value.
          fields:        relation.getChildField(),  // NB: since g3w-admin@v3.7.0 this is an Array value.
          features:      {},
        })),
      filter:              [],
      has_map:             true,
      async_highlight:     () => {},
      firstCall:           true,
      map_bbox:            { key: null, cb: null },
      disableSelectAll:    false,
      all:                 false, //@since all features loaded are selected
      PAGELENGTHS,
      ordering:            [0, 'asc'],
      search: {
        field:     undefined,
        page:      1, // get current page
        page_size: PAGELENGTHS[1],
        search:    null,
        in_bbox:   undefined,
        ordering:  headers[0].name,
        formatter: 1,
      }
    };
  },
  
  computed: {

    /**
     * @returns { Boolean } In case of filter without pagination active
     * 
     * @since 4.0.0
     */
    show_on_active_filter() {
      return !(this.layer.state.filter.pagination && (this.layer.state.filter.active || !this.layer.getSelection().fids.has('__ALL__')));
    },

    current_layout() {
      return ApplicationState.layout[ApplicationState.layout.__current];
    }

  },

  watch: {
    async 'search.page_size'(length) {
      try {
        const data = await this.getData({ length });
        this.disableSelectAll = 0 === this.state.features.length;
      } catch (e) {
        console.warn(e);
      }
    },
  },

  methods: {

    /**
     * @param feature
     * 
     * @since 3.10.0
     */
    editFeature(feature) {
      GUI.editFeature({ layer: { id: this.layer.getId() }, feature })
    },

    /**
     * @param feature
     * 
     * @since 3.10.0
     */
     async openForm(feature) {
      try {
        await GUI.getData('search:fids', {
          inputs: {
            layer:     this.layer,
            fids:      [feature.id],
            formatter: 1
          }
        });
        // zoom to feature
        if (feature.geometry) {
          GUI.zoomToExtent(toOLGeom(feature.geometry)?.getExtent());
        }
      } catch (e) {
       console.warn(e); 
      }
    },

    async getDataFromBBOX() {
      this.state.geolayer.active = !this.state.geolayer.active;

      const is_active = this.state.geolayer.active;

      if (is_active) {
        this.map_bbox.cb = () => {
          this.state.geolayer.in_bbox = this.state.geolayer.active ? GUI.getMapBBOX().join(',') : undefined;
          this.reload();
        };
      }

      if (is_active) {
        this.map_bbox.key = GUI.getMap().on('moveend', this.map_bbox.cb);
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
     * Highlight or zoom to feature
     * 
     * @param {*} feature
     * @param {*} zoom    - whether zoom to feature
     */
    async highlight(feature, zoom = true) {
      // no feature or no feature geometry → clear highlight
      if (!feature || !feature.geometry) {
        return GUI.highlight(false);
      }

      this.async_highlight = () => {
        GUI.highlight(false);
        GUI.highlight(feature.geometry, { zoom, duration: Infinity })
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
          ? GUI.getData('search:features', {
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
            GUI.zoomToFeatures(features, { highlight: true });
          } else {
            let type, geometry;
            const coordinates = features
              .map(f => f.getGeometry ? f.getGeometry() : f.geometry)
              .map(geom => {
                type = type ? type : (geom instanceof ol.geom.Geometry) ? geom.getType() : geom.type;
                return geom?.getCoordinates?.() ?? geom.coordinates;
              });

            //check if features have geometry
            if (coordinates.length > 0) {
              try {
                geometry = new ol.geom[type.includes('Multi') ? type : `Multi${type}`](type.includes('Multi') ? coordinates.flat(): coordinates);
              } catch(e) {
                console.warn(e);
              }
            }
            GUI.highlight(geometry, { zoom: false });
          }
        });
    },

    /**
     * Add or Remove feature to selection
     */
    select(feature) {
      GUI.toggleSelection(this.state, feature);
    },

    /**
     * @param { number } dir +1 = next page, -1 = previous page
     *
     * @since 4.1.0
     */
    changePage(dir) {
      this.getData({ start: this.search.page_size / (this.search.page + dir) });
    },

    /**
     * @param { number } index column index
     */
    sortColumn(index) {
      if (index === this.ordering[0]) {
        this.ordering[1] = 'asc' === this.ordering[1] ? 'desc' : 'asc';
      } else {
        this.ordering[0] = index;
        this.ordering[1] = 'asc';
      }
      this.reload({ ordering: index });
    },

    /**
     * @param {'all' | 'inverse' } status whether to select all/inverse features
     */
    async setSelection(status) {
      GUI.disableContent(true);
      GUI.setLoadingContent(true);
      try {        
        const features = [
          ...this.state.features,
          ...((await this.layer.getDataTable({ formatter: 1, field: this.search.field }))?.features || [])
            .filter(f => !this.state.features.find(({ id }) => id === f.id)).map(f => ({
              id:         f.id,
              selected:   this.layer.state.filter.active || this.all,
              attributes: f.attributes || f.properties,
              geometry:   f.geometry
            }))
        ]
        await GUI.toggleSelection({ ...this.state, features }, status);
        this.all = features.every(f => f.selected);
      } catch(e) {
        console.warn(e);
      } finally {
        GUI.setLoadingContent(false);
        GUI.disableContent(false);
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
      ordering  = 0,
      length    = this.layer.getAttributeTablePageLength() || PAGELENGTHS[1],
      columns   = [],
      search    = { value: null },
    } = {}) {
      GUI.setLoadingContent(true);
      GUI.disableContent(true);

      this.layer.setAttributeTablePageLength(length);

      // no headers are set
      if (0 === this.state.headers.length) {
        return {
          data:            [],
          recordsTotal:    0,
          recordsFiltered: 0
        };
      }

      this.search = {
        field:     columns.filter(c => c.search && c.search.value).map((c, i, arr) => `${c.name}|ilike|${c.search.value}${i < arr.length - 1 ? '|AND' : ''}`).join(',') || undefined,
        page:      (start === 0 || this.layer.state.filter.active) ? 1 : (start/length) + 1, // get current page
        page_size: length,
        search:    search.value && search.value.length > 0 ? search.value : null,
        in_bbox:   this.state.geolayer.in_bbox,
        ordering:  ('asc' === this.ordering[1] ? '' : '-') + this.state.headers[ordering].name,
        formatter: 1,
      };

      try {
        const data     = await this.layer.getDataTable(this.search);
        const features = (data.features || []).map(f => ({
          id:         f.id,
          selected:   this.layer.state.filter.active || this.layer.isSelected(f.id),
          attributes: f.attributes || f.properties,
          geometry:   f.geometry
        }))

        this.state.allfeatures   = data.count;
        this.state.featurescount = (features || []).length;

        // reset features
        this.state.features.splice(0);
        this.state.features.push(...features);
        
        //In case of no filter and get all features
        if (!this.search.field && this.state.allfeatures === this.state.featurescount) {
          //set selected all
          this.all = this.state.features.every(f => f.selected);
        }

        return {
          data:            this.state.features.map(f => this.state.headers.filter(h => h).map(h => { h.value = (f.attributes || f.properties)[h.name]; return h.value; })),
          recordsFiltered: data.count,
          recordsTotal:    data.count,
          filter:          this.state.features.map(f => f.id),
        };
      } catch(e) {
        console.warn(e);
        GUI.notify.error(_("info.server_error"));
        return Promise.reject(e);
      } finally {
        GUI.setLoadingContent(false);
        GUI.disableContent(false);
      }
    },

    unSelectAll() {
      this.state.features.forEach(f => f.selected = false);
      this.state.selection.active  = false;
    },

    onGUIContent(opts = {}) {
      this.has_map = (100 !== opts.perc);
    },

    /**
     * Reload data from server
     * 
     * @since 4.1.0
     */
    async reload(opts = {}) {
      try {
        const data = await this.getData(opts);
        this.disableSelectAll = 0 === this.state.features.length;
      } catch (e) {
        console.warn(e);
      }
    },

  },

  async created() {

    this.currentFilter = null

    this.unSelectAll  = this.unSelectAll.bind(this);
    this.onGUIContent = this.onGUIContent.bind(this)

    GUI.onbefore('setContent',         this.onGUIContent);
    this.layer.on('unselectionall',    this.unSelectAll);
    this.layer.on('filtertokenchange', this.reload);

    this.globalSearch = debounce(e => {
      this.getData({ search: e.target });
    });

    GUI.closeSideBar();

    GUI.showContent({
      content: new Component({
        id:                'openattributetable',
        service:           { state: this.state },
        internalComponent: this,
      }),
      split: GUI.isMobile() ? 'h': 'v',
      push: false,
      title: this.layer.getTitle(),
      text:  true,
    });

    if (this.isMobile()) {
      GUI.hideSidebar();
    }
  },

  async mounted() {
  
    // un-toggle map controls
    this.last_map_control = GUI.getMapControls().find(c => c.control.isToggled && c.control.isToggled());
    if (this.last_map_control) {
      this.last_map_control.control.toggle();
    }

    await this.$nextTick();

    let resolve;              // resolve data from server
    const filterColumns = {}; // store columns index value search

    try {
      const data = await this.getData();
      this.disableSelectAll = 0 === this.state.features.length;
      if (resolve) { resolve(data.filter); }
    } catch (e) {
      console.warn(e);
    }

    // set data table
    // const table = $(this.$refs.attribute_table).DataTable({
    //   ajax: debounce(async (opts, cb) => {
    //     GUI.disableContent(true);
    //     try {
    //       const data = await this.getData(opts);
    //       cb(data);
    //       this.disableSelectAll = 0 === this.state.features.length;
    //       if (resolve) { resolve(data.filter); }
    //       await this.$nextTick();
    //       table.columns.adjust();
    //     } catch(e) {
    //       console.warn(e);
    //     }
    //     this.resize();
    //   }, 800),
    //   bSortCellsTop:  true,
    //   columns:        this.state.headers,
    //   columnDefs:     [{ orderable: false, searchable: false, targets: 0, width: '1%' }],
    //   deferLoading:   this.state.allfeatures,
    //   dom:            'frt<"#g3w-table-toolbar">lip',
    //   lengthMenu:     PAGELENGTHS,
    //   order:          [ 1, 'asc' ],
    //   pageLength:     this.layer.getAttributeTablePageLength() || PAGELENGTHS[1],
    //   processing:     false,
    //   responsive:     true,
    //   scrollCollapse: true,
    //   scrollX:        true,
    //   serverSide:     true,
    //   sSearch:        false,
    // });

    this.changeColumn = debounce(async (e, i) => {
      const value = e.target.value.trim();
      // table.one('draw', async() => {
        filterColumns[i]      = value;
        this.disableSelectAll = 0 === this.state.features.length;
        this.filter           = Object.values(filterColumns).find(f => f)
          ? await (new Promise(res => resolve = res))
          : [];
      // })
      // table.columns(i).search(value).draw();
    });

    // move "table_info" and "table_search" before header action tools
    document.querySelector('#g3w-view-content .g3-content-header-action-tools').insertAdjacentElement('beforebegin', this.$refs['table_info']);
    document.querySelector('#g3w-view-content .g3-content-header-action-tools').insertAdjacentElement('beforebegin', this.$refs['table_search']);
  },

  async beforeDestroy() {

    // restore any previous active map control
    if (this.last_map_control && !this.last_map_control.control.isToggled()) {
     this.last_map_control.control.toggle();
    }

    this.last_map_control = null;

    this.layer.off('unselectionall',    this.unSelectAll);
    this.layer.off('filtertokenchange', this.reload);

    // reset bbox event handler
    ol.Observable.unByKey(this.map_bbox.key);
    this.map_bbox.key = null;
    this.map_bbox.cb  = null;

    this.highlight();

    if (!this.has_map) {
      setTimeout(() => {
        this.async_highlight();
        this.has_map         = true;
        this.async_highlight = () => {};
      });
    }

    this.$refs['table_info'].remove();
    this.$refs['table_search'].remove();
  },

};
</script>

<style scoped>
  .geometry {
    cursor: pointer
  }

  #noheaders {
    background-color: #fff;
    font-weight: bold;
    margin-top: 10px;
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

  #open_attribute_table {
    margin-top: 5px;
  }

  .action-button {
    padding: 5px !important;
  }

  button.toggled {
    color: #FFF !important;
    background-color: var(--skin-color);
  }

  table {
    width: 100%;
    user-select: none;
    display: block;
    height: calc(100% - 25px);
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

  th.asc, th.desc { 
    border-top: var(--skin-color) medium solid;
  }

  th.asc::after {
    content: "▴";
  }

  th.desc::after {
    content: "▾";
  }
</style>