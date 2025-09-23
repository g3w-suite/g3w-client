<!--
  @file
  @since v3.7
-->

<template>
  <div id = "open_attribute_table">

    <!-- TABLE TOOLBAR -->
    <!-- ORIGINAL SOURCE: src/components/TableToolBar.vue@3.9.7 -->
    <div
      ref   = "table_toolbar"
      style = "display: flex; justify-content: space-between; padding: 1px;"
    >

      <!-- FETCH DATA FROM BBOX -->
      <div
        v-if           = "layer.isGeoLayer()"
        class          = "skin-color action-button"
        v-disabled     = "state.geolayer.active && current_layout.rightpanel.height_100"
        :class         = "[ $fa('map'), state.geolayer.active ? 'toggled' : '' ]"
        v-t-tooltip    = "'Update results when map moves'"
        data-placement = "right"
        @click.stop    = "getDataFromBBOX"
      ></div>

      <!-- CLEAR SELECTION -->
      <div
        v-show         = "state.selection.active"
        class          = "skin-color action-button"
        :class         = "$fa('clear')"
        v-t-tooltip    = "'Clear Selection'"
        data-placement = "right"
        @click.stop    = "layer.clearSelectionFids()"
      ></div>

      <!-- INVERSE SELECTION -->
      <div
        v-show         = "state.selection.active"
        class          = "skin-color action-button"
        :class         = "[ $fa('invert'), layer.state.filter.active ? 'g3w-disabled': '' ]"
        v-t-tooltip    = "'Invert Selection'"
        data-placement = "right"
        @click.stop    = "setSelection({ inverse :true })"
      ></div>

      <!-- TOGGLE FILTER -->
      <div
        v-show         = "state.selection.active && show_on_active_filter"
        class          = "skin-color action-button"
        :class         = "[ $fa('filter'), layer.state.filter.active ? 'toggled' : '' ]"
        v-t-tooltip    = "'Enable/Disable filter'"
        data-placement = "right"
        @click.stop    = "toggleToken(layer)"
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
          <th v-for = "(header, i) in state.headers" v-if = "i > 0">{{ header.label }}</th>
        </tr>
        <tr>
          <th v-disabled       = "disableSelectAll">
            <label @click.stop = "setSelection({ inversion: false })">
              <input type = "checkbox" :checked = "state.selection.active && state.features.length > 0 && state.features.every(f => f.selected)" />
            </label>
          </th>
          <th v-for = "(header, i) in state.headers" v-if = "i > 0">
            <input
              type         = "text"
              class        = "form-control column-search"
              @keyup       = "changeColumn($event, i)"
              :placeholder = "header.name"
              :title       = "'search by ' + header.name"
            />
          </th>
        </tr>
      </thead>

      <!-- ORIGINAL SOURCE: src/components/TableBody.vue@3.9.3 -->
      <tbody id = "table_body_attributes" hidden></tbody>
      <tbody ref = "table_body" @mouseleave = "highlight()">
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
          <td v-for = "(header, j) in state.headers" v-if="j > 0">
            <field
              :feature = "feature"
              :state   = "({ label: undefined, value: feature.attributes[header.name] })"
            />
          </td>
        </tr>
      </tbody>

    </table>
    <div v-else id = "noheaders" v-t = "'No data'"></div>
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
    const layer = getCatalogLayerById(this.$options.layerId);
    return {
      layer,
      state: {
        id:            layer.getId(), //@since 4.1.0 aligned with query state layer
        external:      false,         //@since 4.1.0 aligned with query state layer
        selection:     layer.state.selection,//@since 4.1.0 aligned with query state layer
        features:      [],
        headers:       [null, ...layer.getTableHeaders()], // first value is `null` for DataTable purpose (used to add a custom input selector)
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
      search:              {},
      firstCall:           true,
      map_bbox:            { key: null, cb: null },
      disableSelectAll:    false,
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

  methods: {

    /**
     * @param layer
     * 
     * @since 3.11.0
     */
    toggleToken(layer) {
      layer.toggleToken();
    },

    /**
     * @param feature
     * 
     * @since 3.10.0
     */
    editFeature(feature) {
      $('.tooltip').remove();
      GUI.editFeature({ layer: { id: this.layer.getId() }, feature })
    },

    /**
     * @param feature
     * 
     * @since 3.10.0
     */
     async openForm(feature) {
      $('.tooltip').remove();
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
          $(this.$refs.attribute_table).DataTable().ajax.reload();
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
     * 
     * @param opts @since 4.1.0
     * 
     */
    async setSelection(opts = { inverse : false }) {
      GUI.disableContent(true);
      GUI.setLoadingContent(true);
      try {
        
        // fetch features from server in case not all feature are loaded
        if (this.state.allfeatures > this.state.featurescount) {
          const { count, features = [] } = (await this.layer.getDataTable({ formatter: 1, ...(this.filter.length > 0 ? { field: this.search.field } : {} ) }));
          this.state.allfeatures   = count; //all count features 
          this.state.featurescount = features.length; //all returned feature
          // reset features
          this.state.features.splice(0);
          //fill with new values
          this.state.features.push(...features.map(f => {
            return {
              id:         f.id,
              selected:   this.layer.state.filter.active || (this.state.features.find(({id}) => id === f.id)?.selected ?? false),
              attributes: f.attributes || f.properties,
              geometry:   f.geometry 
            };
          }));
        }
        //In case of inverse selection
        if (opts.inverse) {
          this.state.features.forEach(feature => GUI.toggleSelection(this.state, feature));
        } else {
          GUI.toggleSelection(this.state);
        }
      } catch(e) {
        console.warn(e);
      } finally {
        GUI.setLoadingContent(false);
        GUI.disableContent(false);
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
        return GUI.clearHighlightGeometry();
      }

      this.async_highlight = () => {
        GUI.clearHighlightGeometry();
        GUI.highlightGeometry(feature.geometry, { zoom, duration: Infinity })
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
            GUI.highlightFeatures(features);
          }
        });
    },

    /**
     * Add or Remove feature to selection
     */
    select(feature) {
      GUI.toggleSelection(this.state, feature);
    },

    async resize() {
      await this.$nextTick();
      const table = this.$el.querySelector('div.dataTables_scrollBody');
      if (table) {
        table.style.height = GUI.isMobile() ? '100%' : (
            (ApplicationState.content.sizes.height)                              // table height
          - (this.$el.querySelector('div.dataTables_scrollHeadInner')?.clientHeight || 0) // table header height
          - 100
        ) + 'px';
      }
      // adjust columns when resize
      $(this.$refs.attribute_table).DataTable().columns.adjust();
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

      // reset features
      this.state.features.splice(0);

      await this.$nextTick();


      if (0 === order.length) {
        order.push({ column: 1, dir: 'asc', });
      }

      this.search = {
        field:     columns.filter(c => c.search && c.search.value).map((c, i, arr) => `${c.name}|ilike|${c.search.value}${i < arr.length - 1 ? '|AND' : ''}`).join(',') || undefined,
        page:      (start === 0 || this.layer.state.filter.active) ? 1 : (start/length) + 1, // get current page
        page_size: length,
        search:    search.value && search.value.length > 0 ? search.value : null,
        in_bbox:   this.state.geolayer.in_bbox,
        ordering:  ('asc' === order[0].dir ? '' : '-') + this.state.headers[order[0].column].name,
        formatter: 1,
      };

      try {
        const data = await this.layer.getDataTable(this.search);

        this.state.allfeatures   = data.count;
        this.state.featurescount = (data.features || []).length;
        console.log(this.layer.state.filter.active)
        // add features
        this.state.features.push(
          ...(data.features || []).map(f => ({
            id:         f.id,
            selected:   this.layer.state.filter.active || this.layer.isSelected(f.id),
            attributes: f.attributes || f.properties,
            geometry:   f.geometry
          }))
        )
        
        return {
          data:            this.state.features.map(f => [null].concat(this.state.headers.filter(h => h).map(h => { h.value = (f.attributes || f.properties)[h.name]; return h.value; }))),
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
     * @since 3.10.0
     */
    filterChangeHandler() {
      $(this.$refs.attribute_table).DataTable().ajax.reload();
    },

  },

  /**
   * TableService Class
   * 
   * ORIGINAL SOURCE: src/app/gui/table/tableservice.js@v3.9.3
   */
  async created() {

    GUI.on('resize', this.resize);

    this.currentFilter = null

    this.unSelectAll  = this.unSelectAll.bind(this);
    this.onGUIContent = this.onGUIContent.bind(this)

    GUI.onbefore('setContent',         this.onGUIContent);
    this.layer.on('unselectionall',    this.unSelectAll);
    this.layer.on('filtertokenchange', this.filterChangeHandler);

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

    // resolve data from server
    let resolve;
    // store columns index value search
    const filterColumns = {};

    // set data table
    const table = $(this.$refs.attribute_table).DataTable({
      ajax: debounce(async (opts, cb) => {
        GUI.disableContent(true);
        try {
          const data = await this.getData(opts);
          cb(data);
          this.disableSelectAll = 0 === this.state.features.length;
          if (resolve) {
            resolve(data.filter);
          }
          await this.$nextTick();
          table.columns.adjust();
        } catch(e) {
          console.warn(e);
        }
        this.resize()
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
        filterColumns[i]      = value;
        this.disableSelectAll = 0 === this.state.features.length;
        this.filter           = Object.values(filterColumns).find(f => f)
          ? await (new Promise(res => resolve = res))
          : [];
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

  async beforeDestroy() {

    // restore any previous active map control
    if (this.last_map_control && !this.last_map_control.control.isToggled()) {
     this.last_map_control.control.toggle();
    }

    this.last_map_control = null;

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
        this.has_map         = true;
        this.async_highlight = () => {};
      });
    }

    GUI.off('resize', this.resize);

    document.querySelector('#g3w-view-content .dataTables_info').remove();
    document.querySelector('#g3w-view-content .dataTables_filter').remove();
    $(this.$refs.attribute_table).DataTable().destroy(true);
  },

};
</script>

<style>
#open_attribute_table {
  margin-top: 5px;
}

#g3w-table-toolbar {
  margin: 0.755em 1ch 0 0;
  position: relative;
  bottom: 3px;
  display: inline-flex;
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
    color: #FFFFFF !important;
    background-color: var(--skin-color);
  }
  #layer_attribute_table {
    width: 100%;
    user-select: none;
  }
  #layer_attribute_table > tbody > tr:not(.selected):hover {
    background-color: rgb(255, 255, 0, 0.15);
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
    padding-top: 5px;
  }
</style>