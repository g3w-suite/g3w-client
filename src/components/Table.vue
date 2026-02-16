<!--
  @file
  @since v3.7
-->

<template>
  <div id = "open_attribute_table">

    <!-- TABLE METADATA -->
    <button
      ref            = "table_metadata"
      type           = "button"
      style          = "margin-right: 8px; font-size: 1.5rem;order:-1;"
      class          = "btn btn-default"
      @click         = "showMetadata"
      data-placement = "top"
      title          = "Metadata"
    >
      <i data-v-5685d65c = "" aria-hidden = "true" class = "fas fa-info-circle"></i>
    </button>

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
            :title         = "$t('sort by:') + ' ' + header.name"
            data-placement = "top"
            :style         = "{'width': `${100 / state.headers.length }%`}"
          >{{ header.label }}</th>
        </tr>
        <tr>
          <th v-disabled       = "disableSelectAll">
            <label @click.stop = "setSelection('all')">
              <input type = "checkbox" :checked = "all " />
            </label>
          </th>
          <th v-for = "(header, i) in state.headers">
            <input
              type           = "text"
              class          = "form-control column-search"
              @keyup         = "changeColumn($event, i)"
              :placeholder   = "header.name"
              :title         = "$t('search by:') + ' ' + header.name"
              data-placement = "bottom"
            />
          </th>
        </tr>
      </thead>
      <tbody @mouseleave = "highlight()">
        <tr
          v-for       = "(feature, i) in state.features" :key = "feature.id"
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
                v-if   = "!layer.state.filter.active"
                @click = "select(feature)"
              >
                <input type = "checkbox" :checked = "feature.selected" />
              </label>
              <i
                v-if            = "layer.isEditable() && (layer.config.editing || {}).visible"
                @click.stop     = "editFeature(feature)"
                title           = "Editing"
                data-placement  = "top"
                :class          = "'action-button skin-color ' + $fa('pencil')"
              ></i>
              <i
                @click.stop     = "openForm(feature)"
                title           = "Form View"
                data-placement  = "top"
                :class          = "'action-button skin-color ' + $fa('table')"
              ></i>
              <i
                v-if            = "layer.hasRelations()"
                @click.stop     = "showRelations(feature)"
                title           = "Show Relations"
                data-placement  = "top"
                :class          = "'action-button skin-color ' + $fa('relation')"
              ></i>
              <i
                v-if            = "layer.state.geolayer && !feature.geometry"
                title           = "This item has no geometry"
                data-placement  = "top"
                style           = "color: currentColor !important;"
                :class          = "'action-button ' + $fa('alert')"
              ></i>
            </div>
          </td>
          <td v-for = "header in state.headers">
            <field
              :feature = "feature"
              :state   = "({ 
                label: undefined,
                //@since 4.1.0 support array value in attribute table https://github.com/g3w-suite/g3w-client-plugin-editing/issues/186
                value: Array.isArray(feature.attributes[header.name]) ? feature.attributes[header.name].join(',') : feature.attributes[header.name],
                name: header.name 
              })"
            />
          </td>
        </tr>
      </tbody>

    </table>
    <div v-else id = "noheaders" v-t = "'No data'"></div>

    <!-- TABLE TOOLBAR -->
    <div class = "table-toolbar" style = "display: flex; gap: 1ch; margin-top: 1ch;">

      <!-- FETCH DATA FROM BBOX -->
      <button
        v-if            = "layer.isGeoLayer()"
        v-disabled      = "state.geolayer.active && current_layout.rightpanel.height_100"
        :class          = "['btn', state.geolayer.active ? 'toggled' : '' ]"
        title           = "Update results when map moves"
        data-placement  = "top"
        @click.stop     = "getDataFromBBOX"
      ><i class = "far fa-map"></i></button>

      <!-- CLEAR SELECTION -->
      <button
        v-show          = "layer.state.selection.active"
        class           = "btn"
        title           = "Clear Selection"
        data-placement  = "top"
        @click.stop     = "layer.clearSelectionFids()"
      ><i class = "fas fa-broom"></i></button>

      <!-- INVERSE SELECTION -->
      <button
        v-show          = "!layer.state.filter.active && layer.state.selection.active"
        :class          = "[ 'btn', layer.state.filter.active ? 'g3w-disabled': '' ]"
        title           = "Invert Selection"
        data-placement  = "top"
        @click.stop     = "setSelection('inverse')"
      ><i class = "fas fa-exchange-alt"></i></button>

      <!-- TOGGLE FILTER -->
      <button
        v-show          = "layer.state.selection.active && !layer.state.filter.pagination"
        :class          = "[ 'btn', layer.state.filter.active ? 'toggled' : '' ]"
        title           = "Enable/Disable filter"
        data-placement  = "top"
        @click.stop     = "layer.toggleToken()"
      ><i class = "fas fa-filter"></i></button>

      <!-- PAGE SIZE -->
      <label style = "margin-top: 5px;">
        <select style = "border: 1px solid #aaa;" v-model = "search.page_size">
          <option v-for = "l in PAGELENGTHS" :value = "l">{{ l }}</option>
        </select> {{ $t('values per page') }}
      </label>

      <!-- PAGINATION BUTTONS -->
      <div style="margin-left: auto;">
        <select
          v-model         = "search.page"
          style           = "padding: 5px 12px; appearance: none; border: 0; text-align: center; border-radius: 3px; cursor: pointer;"
          :title          = "search.page + $t(' of ') + pages"
          data-placement  = "top"
        >
          <option v-for = "p in pages" :selected = "p == search.page">{{ p }}</option>
        </select>
        {{ $t(' of ') + pages }}
        <button v-if="pages > 1" title="Backward" data-placement="top" @click.stop = "search.page = Number(search.page) - 1" class = "btn" v-disabled = "1 == search.page">🞀</button>
        <button v-if="pages > 1" title="Forward"  data-placement="top" @click.stop = "search.page = Number(search.page) + 1" class = "btn" v-disabled = "pages == search.page">🞂</button>
      </div>

    </div>

  </div>
</template>

<script>
import { PAGELENGTHS }         from 'g3w-constants';
import Component               from 'g3w-component';
import ApplicationState        from 'g3w-state';
import Field                   from 'components/FieldG3W.vue';
import GUI                     from 'g3w-app';
import { debounce }            from 'utils/debounce';
import { getCatalogLayerById } from 'utils/getCatalogLayerById';
import { gettext as _ }        from 'g3w-i18n';

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
        id:            layer.getId(),         // @since 4.1.0 aligned with query state layer
        selection:     layer.state.selection, // @since 4.1.0 aligned with query state layer
        filter:        layer.state.filter,    // @since 4.1.0 aligned with query state layer
        features:      [],
        headers,      
        geometry:      true,
        allfeatures:   0,
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
      disableSelectAll:    false,
      all:                 false,  // whehter all loaded features are selected
      PAGELENGTHS,
      ordering:            [0, 'asc'],
      search: {
        field:     undefined,
        page:      1,              // current page
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
     * @since 4.1.0
     */
    pages() {
      return Math.ceil(this.state.allfeatures / this.search.page_size);
    },
    current_layout() {
      return ApplicationState.layout[ApplicationState.layout.__current];
    }

  },

  watch: {
    async 'search.page_size'(length) {
      this.reload({ length });
    },
    async 'search.page'(page) {
      this.reload({ page });
    },
  },

  methods: {

    /**
     * @param feature
     * 
     * @since 3.10.0
     */
    editFeature(feature) {
      GUI.editFeature({ layer: { id: this.layer.getId() }, feature });
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
          GUI.zoomToExtent((new (Object.entries({
            'MultiPolygon': ol.geom.MultiPolygon,
            'MultiLine':    ol.geom.MultiLineString,
            'MultiPoint':   ol.geom.MultiPoint,
            'Polygon':      ol.geom.Polygon,
            'Line':         ol.geom.LineString,
            'Point':        ol.geom.Point,
            '':             ol.geom.Point, // fallback
          }).find(o => feature.geometry.type.startsWith(o[0])))[1](feature.geometry.coordinates))?.getExtent());
        }
      } catch(e) {
       console.warn(e); 
      }
    },

    /**
     * @param feature
     * 
     * @since 4.1.0
     */
    showRelations(feature) {
      GUI.showRelations({ feature, layerId: this.layer.getId(), push: false });
    },

    /**
     * @since 4.1.0
     */
    showMetadata() {
      $('#modal-metadata').modal('show');
      setTimeout(() => document.querySelector('#modal-metadata [href="#metadata_layers"]').click());
    },

    async getDataFromBBOX() {
      this.state.geolayer.active = !this.state.geolayer.active;

      const is_active = this.state.geolayer.active;

      if (is_active) {
        this.onMoveEnd = () => {
          this.state.geolayer.in_bbox = this.state.geolayer.active ? GUI.getMapBBOX().join(',') : undefined;
          this.reload();
        };
      }

      if (is_active) {
        GUI.getMap().on('moveend', this.onMoveEnd);
      }

      this?.onMoveEnd?.();

      // reset bbox event handler
      if (!is_active) {
        GUI.getMap().un('moveend', this.onMoveEnd);
        this.onMoveEnd = null;
      }
    },

    /**
     * Highlight or zoom to feature
     * 
     * @param {*} feature
     * @param { boolean } zoom    - whether zoom to feature
     */
    async highlight(feature, zoom = true) {
      // no feature or no feature geometry → clear highlight
      if (!feature || !feature.geometry) {
        return GUI.highlight(false);
      }

      this.async_highlight = () => {
        GUI.highlight(false);
        GUI.highlight(feature.geometry, { zoom, duration: Infinity });
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
      }
      GUI.setLoadingContent(false);
      GUI.disableContent(false);
    },

    /**
     * Fetch data from server
     * 
     * @param { Object } opts
     * @param { number } opts.ordering
     * @param { number } opts.length
     * @param opts.columns
     * @param { string } opts.search
     * @param { number } opts.page current page
     */
    async getData({
      ordering  = 0,
      length    = this.layer.getAttributeTablePageLength() || PAGELENGTHS[1],
      columns   = {},
      search    = null,
      page      = 1,
    } = {}) {
      // no headers are set
      if (0 === this.state.headers.length) {
        return;
      }

      GUI.setLoadingContent(true);
      GUI.disableContent(true);

      this.layer.setAttributeTablePageLength(length);

      this.search = {
        field:     Object.entries(columns).filter(([_, v]) => v).map(([i, v], index, arr) => `${this.state.headers[i].name}|ilike|${v}${index < arr.length - 1 ? '|AND' : ''}`).join(',') || undefined,
        page,
        page_size: length,
        search:    search || null,
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
          geometry:   f.geometry || undefined,
        }));

        this.state.allfeatures   = data.count;
        this.state.featurescount = (features || []).length;

        // reset features
        this.state.features.splice(0);
        this.state.features.push(...features);
        
        this.all = this.layer.state.filter.active || this.layer.state.selection.fids.has('__ALL__') || (this.state.selectAll && this.state.features.every(f => f.selected));
        
      } catch(e) {
        console.warn(e);
        GUI.showUserMessage({ type: 'alert', message: _("info.server_error") });
      }

      GUI.setLoadingContent(false);
      GUI.disableContent(false);
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
      this.getData(opts).then(() => this.disableSelectAll = 0 === this.state.features.length);
    },

  },

  async created() {

    this.unSelectAll  = this.unSelectAll.bind(this);
    this.onGUIContent = this.onGUIContent.bind(this)

    GUI.onbefore('setContent',         this.onGUIContent);
    this.layer.on('unselectionall',    this.unSelectAll);
    this.layer.on('filtertokenchange', this.reload);

    this.globalSearch = debounce(e => this.getData({ search: e.target.value }));

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
  
    console.log(this.state.features)
    // un-toggle map controls
    this.last_map_control = GUI.getMapControls().find(c => c?.control?.isToggled?.());
    if (this.last_map_control) {
      this.last_map_control.control.toggle();
    }

    this.reload();

    const columns = {}; // store columns index value search

    this.changeColumn = debounce(async (e, i) => {
      columns[i] = e.target.value.trim();
      this.getData({ columns });
    });

    // move "table_metadata", "table_info" and "table_search" before header action tools
    document.querySelector('#g3w-view-content .g3-content-header-action-tools').insertAdjacentElement('beforebegin', this.$refs['table_metadata']);
    document.querySelector('#g3w-view-content .g3-content-header-action-tools').insertAdjacentElement('beforebegin', this.$refs['table_info']);
    document.querySelector('#g3w-view-content .g3-content-header-action-tools').insertAdjacentElement('beforebegin', this.$refs['table_search']);
  },

  async beforeDestroy() {

    // restore any previous active map control
    if (false === this?.last_map_control?.control?.isToggled()) {
     this.last_map_control.control.toggle();
    }

    this.last_map_control = null;

    this.layer.off('unselectionall',    this.unSelectAll);
    this.layer.off('filtertokenchange', this.reload);

    // reset bbox event handler
    if (this.onMoveEnd) {
      GUI.getMap().un('moveend', this.onMoveEnd);
      this.onMoveEnd = null;
    }

    this.highlight();

    if (!this.has_map) {
      setTimeout(() => {
        this.async_highlight();
        this.has_map         = true;
        this.async_highlight = () => {};
      });
    }

    this.$refs['table_metadata'].remove();
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
</style>