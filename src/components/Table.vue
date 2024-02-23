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
          <th v-if="index > 0" v-for="(header, index) in state.headers">
            <input
              type         = "text"
              style        = "height: 25px; min-width: 40px; padding: 2px;"
              class        = "form-control column-search"
              @keyup       = "changeColumn($event, index)"
              :placeholder = "header.name"/>
          </th>
        </tr>
        <tr>
          <th v-for="(header, index) in state.headers">
            <span v-if="index === 0">
              <input
                type      = "checkbox"
                id        = "attribute_table_select_all_rows"
                :checked  = "state.selectAll"
                class     = "magic-checkbox"
                :disabled = "state.nofilteredrow || state.features.length === 0">
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

      <table-body
        :headers                  = "state.headers"
        :filter                   = state.tools.filter
        :features                 = "state.features"
        :addRemoveSelectedFeature = "addRemoveSelectedFeature"
        :zoomAndHighLightFeature  = "zoomAndHighLightFeature"
      />

    </table>
    <div v-else id="noheaders" v-t="'dataTable.no_data'" ></div>
  </div>
</template>

<script>
import TableBody                   from 'components/TableBody.vue';
import SelectRow                   from 'components/TableSelectRow.vue';
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

const { t }                        = require('core/i18n/i18n.service');
const { SELECTION_STATE }          = require('core/layers/layer');

const PAGELENGTHS = [10, 25, 50];

/**
 * Create a unique feature key
 */
function _createFeatureKey(values) {
  return values.join('__');
}

let dataTable;
let fieldsComponents = [];
let eventHandlers = {
  pagination: {},
  nopagination: {}
};

/**
 * TableService Class
 * 
 * ORIGINAL SOURCE: src/app/gui/table/tableservice.js@v3.9.3
 * 
 * @param options.layer
 * @param options.formatter
 * 
 * @constructor
 */
class TableService extends G3WObject {
  
  constructor(opts = {}) {

    super();

    /**
     * Number of pages
     */
    this.currentPage = 0;
  
    /**
     * @FIXME add description
     */
    this.layer = opts.layer;

    /**
     * @FIXME add description
     */
    this.formatter = 1;

    /**
     * @FIXME add description
     */
    this.allfeaturesnumber = undefined;

    /**
     * @FIXME add description
     */
    this.nopaginationsfilter = [];

    /**
     * @FIXME add description
     */
    this.selectedfeaturesfid = this.layer.getSelectionFids();

    /**
     * Whether layer has geometry
     */
    this.geolayer = this.layer.isGeoLayer();

    /**
     * @FIXME add description
     */
    this.relationsGeometry = this._relationsGeometry();
    
    /**
     * @FIXME add description
     */
    this.projection = this.geolayer ? this.layer.getProjection() : null;

    /**
     * @FIXME add description
     */
    this.mapService = GUI.getService('map');

    /**
     * @FIXME add description
     */
    this.getAll = false;

    /**
     * @FIXME add description
     */
    this.paginationfilter = false;

    /**
     * @FIXME add description
     */
    this.mapBBoxEventHandlerKey = {
      key: null,
      cb: null
    };

    // bind context on event listeners
    this.clearAllSelection   = this.clearAllSelection.bind(this);
    this.filterChangeHandler = this.filterChangeHandler.bind(this); 
    this.onGUIContent        = this.onGUIContent.bind(this);

    /**
     * @FIXME add description
     */
    this.state = {
      pageLengths:   PAGELENGTHS,
      pageLength:    this.layer.getAttributeTablePageLength() || PAGELENGTHS[0],
      features:      [],
      title:         this.layer.getTitle(),
      headers:       this.getHeaders(),
      geometry:      true,
      loading:       false,
      allfeatures:   0,
      pagination:    !this.getAll,
      selectAll:     false,
      nofilteredrow: false,
      tools: {
        geolayer: {
          show:      this.geolayer,
          active:    false,
          in_bbox:   undefined,
        },
        show:        false,
        filter:      this.layer.state.filter
      }
    };

    /**
     * Pagination filter features
     */
    this._async = {
      state: false,
      fnc:   noop
    };

    GUI.onbefore('setContent',         this.onGUIContent);
    this.layer.on('unselectionall',    this.clearAllSelection);
    this.layer.on('filtertokenchange', this.filterChangeHandler);

  }

  /**
   * @since 3.9.0
   */
  _relationsGeometry() {

    // layer has geometry  
    if (this.geolayer) {
      return [];
    }

    const relations = [];

    this.layer
      .getRelations()
      .getArray()
      .forEach(relation => {
        const layer = CatalogLayersStoresRegistry.getLayerById(relation.getFather()); // get project layer
        if (
          this.layer.getId() !== relation.getFather() && // current layer is not child layer of relation
          layer.isGeoLayer()                             // relation layer has geometry
        ) {
          relations.push({
            layer,
            father_fields: relation.getFatherField(),    // NB: since g3w-admin@v3.7.0 this is an Array value.
            fields:        relation.getChildField(),     // NB: since g3w-admin@v3.7.0 this is an Array value.
            features:      {},
          })
        }
      });

    return relations;
  }

  /**
   * @since 3.9.0
   */
  clearAllSelection() {
    this.state.features.forEach(feature => feature.selected = false);
    this.state.tools.show = false;
    this.state.selectAll = false;
  }

  /**
   * @since 3.9.0
   * 
   * @param { Object } opts
   * @param { string } opts.type
   * 
   * @fires redraw when `opts.type` in_bbox filter (or not select all)
   */
  async filterChangeHandler({ type } = {}) {
    this.allfeaturesnumber = undefined;
    if (type === 'in_bbox' || !this.selectedfeaturesfid.has(SELECTION_STATE.ALL)) {
      this.emit('redraw', this.state.pagination ? [] : await this.reloadData());
    }
  }

  /**
   * @since 3.9.0
   */
  onGUIContent(options) {
    this._async.state = (100 === options.perc);
  }

  async toggleFilterToken() {
    await this.layer.toggleFilterToken();
  }

  /**
   * first value = `null` for DataTable purpose (used to add a custom input selector) 
   */
  getHeaders() {
    return [null, ...this.layer.getTableHeaders()];
  }

  /**
   * DataTable pagination
   */
  setDataForDataTable() {
    const data = [];
    this.state.features.forEach(feature => {
      const attributes = feature.attributes ? feature.attributes : feature.properties;
      const values = [null];
      this.state.headers.forEach(header => {
        if (header) {
          header.value = attributes[header.name];
          values.push(header.value);
          // header.label = undefined;            // removes label.
        }
      });
      data.push(values)
    });
    return data;
  };

  addRemoveSelectedFeature(feature) {
    feature.selected = !feature.selected;

    const selected       = this.selectedfeaturesfid;
    const filter         = this.nopaginationsfilter;
    const count          = this.allfeaturesnumber;

    const select_all     = this.state.selectAll;
    const has_pagination = this.state.pagination;
    const features       = this.state.features;
    const is_active      = this.state.tools && this.state.tools.filter && this.state.tools.filter.active

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
    this.state.tools.show = selected.size > 0;

    /** @FIXME add description */
    if (
      (is_exclude && 1 === selected.size) ||
      (is_default && selected.size === count) ||
      (!has_pagination && filter.length && filter.length === features.filter(f => f.selected).length)
    ) {
      this.state.selectAll = true;
    }

  }

  createFeatureForSelection(feature) {
    return {
      attributes: feature.attributes ? feature.attributes : feature.properties,
      geometry: this._returnGeometry(feature),
    }
  }

  getAllFeatures(params) {
    GUI.setLoadingContent(true);
    return new Promise((resolve, reject) => {
      this.layer
        .getDataTable(params || {})
        .then(data => {
          const is_valid = this.geolayer && data.features;

          if (is_valid && !params) {
            const loaded_features = this.state.features.map(f => f.id);
            data.features.forEach(f => {
              if (-1 === loaded_features.indexOf(f.id) && f.geometry) {
                this.layer.addOlSelectionFeature({
                  id: f.id,
                  feature: this.createFeatureForSelection(f),
                });
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
  }

  async switchSelection() {
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
      this.state.tools.show = selected;
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
      this.state.tools.show = this.selectedfeaturesfid.size > 0;
    }

  }

  clearLayerSelection() {
    this.layer.clearSelectionFids();
  }

  /**
   * Called when a selected feature is checked
   * 
   * @returns {Promise<void>}
   */
  async selectAllFeatures() {

    // set inverse of selectAll
    this.state.selectAll = !this.state.selectAll;

    const has_pagination = this.state.pagination;
    const filter         = this.nopaginationsfilter;
    let selected         = false;

    // filtered
    if (!has_pagination && filter.length) {
      this.state.features.forEach((f, i) =>{
        if (-1 !== filter.indexOf(i)) {
          f.selected = this.state.selectAll;
          this.layer[f.selected ? 'includeSelectionFid': 'excludeSelectionFid'](f.id);
          selected = selected || f.selected;
        }
      });
      this.state.tools.show = selected;
    }

    // no filter
    if (!has_pagination && !filter.length) {
      this.state.tools.show = this.state.selectAll;
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
        search:    this.paginationParams.search,
        ordering:  this.paginationParams.ordering,
        formatter: this.paginationParams.formatter,
        in_bbox:   this.paginationParams.in_bbox,
      });
      features.forEach(f => {
        if (!this.getAll && this.geolayer && f.geometry) {
          this.layer.addOlSelectionFeature({
            id: f.id,
            feature: this.createFeatureForSelection(f)
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
      this.state.tools.show = this.state.selectAll || this.selectedfeaturesfid.size > 0;
    }

  }

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
  }

  setAttributeTablePageLength(length) {
    this.layer.setAttributeTablePageLength(length);
  }

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
    length    = this.state.pageLength,
    columns   = [],
    search    = { value: null },
    firstCall = false
  } = {}) {

    // reset features before load
    GUI.setLoadingContent(true);

    this.setAttributeTablePageLength(length);

    return new Promise((resolve, reject) => {

      // skip when ..
      if (!this.state.headers.length) {
        resolve({
          data: [],
          recordsTotal: 0,
          recordsFiltered: 0
        });
        return;
      }

      let searchText = search.value && search.value.length > 0 ? search.value : null;

      this.state.features.splice(0);

      if (!order.length) {
        order.push({
          column: 1,
          dir: 'asc',
        });
      }

      const ordering = ('asc' === order[0].dir ? '' : '-') + this.state.headers[order[0].column].name;

      this.currentPage = (start === 0 || (this.state.pagination && this.state.tools.filter.active)) ? 1 : (start/length) + 1;

      const in_bbox = this.state.tools.geolayer.in_bbox;

      const field =  this.state.pagination
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
          this.state.pagination
            ? this.paginationParams
            : ({ ordering, in_bbox, formatter: this.formatter })
        )
        .then(data => {
          const { features = [] }  = data;

          this.state.allfeatures   = data.count || this.state.features.length;
          this.state.featurescount = features.length;
          this.allfeaturesnumber   = (undefined === this.allfeaturesnumber ? data.count : this.allfeaturesnumber);
          this.paginationfilter    = (data.count !== this.allfeaturesnumber);
          this.state.pagination    = firstCall
            ? this.state.tools.filter.active || features.length < this.allfeaturesnumber
            : this.state.pagination;

          this.addFeatures(features);

          resolve({
            data:            this.setDataForDataTable(),
            recordsFiltered: data.count,
            recordsTotal:    data.count
          });
        })
        .fail(err  => { GUI.notify.error(t("info.server_error")); reject(err); })
        .always(() => { GUI.setLoadingContent(false); })
    });
  }

  setInBBoxParam() {
    const { geolayer } = this.state.tools;
    geolayer.in_bbox = geolayer.active ? this.mapService.getMapBBOX().join(',') : undefined;
  }

  resetMapBBoxEventHandlerKey() {
    const listener = this.mapBBoxEventHandlerKey;
    ol.Observable.unByKey(listener.key);
    listener.key = null;
    listener.cb  = null;
  }

  async getDataFromBBOX() {
    const { geolayer } = this.state.tools;

    geolayer.active = !geolayer.active;

    const is_active = geolayer.active;
    const listener  = this.mapBBoxEventHandlerKey;

    if (is_active && this.state.pagination) {
      listener.cb = () => {
        this.setInBBoxParam();
        this.emit('ajax-reload');
      };
    }

    if (is_active && !this.state.pagination) {
      listener.cb = async () => {
        this.setInBBoxParam();
        this.filterChangeHandler({ type: 'in_bbox' });
      };
    }

    if (is_active) {
      listener.key = this.mapService.getMap().on('moveend', listener.cb);
    }

    if (listener.cb) {
      listener.cb();
    }

    if (!is_active) {
      this.resetMapBBoxEventHandlerKey();
    }
  }

  addFeature(feature) {
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
        feature: this.createFeatureForSelection(feature)
      });
    }

    this.state.features.push(tableFeature);
  }

  checkSelectAll(features = this.state.features) {
    this.state.selectAll = (
      this.selectedfeaturesfid.has(SELECTION_STATE.ALL) ||
      (features.length && features.reduce((selectAll, f) => selectAll && f.selected, true))
    );
  }

  addFeatures(features=[]) {
    features.forEach(f => this.addFeature(f));
    this.state.tools.show = this.layer.getFilterActive() || this.selectedfeaturesfid.size > 0;
    this.checkSelectAll();
  }

  async reloadData(pagination=false) {
    this.state.features.splice(0);
    this.state.pagination = pagination;
    const { data = [] }   = await this.getData();
    return data;
  };

  _setLayout() {
    //TODO
  }

  _returnGeometry(feature) {
    if (feature.attributes) return feature.geometry;
    if (feature.geometry)   return coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates);
  };

  zoomAndHighLightFeature(feature, zoom = true) {
    // async highlight
    if (feature.geometry && this._async.state) {
      this._async.fnc = this.mapService.highlightGeometry.bind(mapService, feature.geometry, { zoom });
    }
    // sync highlight
    if (feature.geometry && !this._async.state) {
      this.mapService.highlightGeometry(feature.geometry , { zoom });
    }
  }

  /**
   * Zoom to eventually features relation
   */
  async zoomAndHighLightGeometryRelationFeatures(feature, zoom = true) {

    // skip when there are no relation features geometry
    if (!this.relationsGeometry.length > 0) {
      return;
    }

    const features     = [];
    const promises     = [];
    const field_values = []; // check if add or not

    this.relationsGeometry
      .forEach(({
        layer,
        father_fields,
        fields,
        features
      }) => {
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
      this.mapService.zoomToFeatures(features, { highlight: true });
    } else {
      this.mapService.highlightFeatures(features);
    }

  }

  clear() {
    this.layer.off('unselectionall',    this.clearAllSelection);
    this.layer.off('filtertokenchange', this.filterChangeHandler);

    this.resetMapBBoxEventHandlerKey();

    this.allfeaturesnumber = null;
    this.mapService        = null;

    if (this._async.state) {
      setTimeout(() => {
        this._async.fnc();
        this._async.state = false;
        this._async.fnc   = noop;
      });
    }
  }

};

export default {
  name: "G3WTable",
  mixins: [resizeMixin],
  data() {
    return {
      tableBodyComponent:null,
      state: this.service.state,
      table: null,
      selectedRow: null,
    }
  },
  components: {
    TableBody
  },
  methods: {
    getDataFromBBOX() {
      this.service.getDataFromBBOX();
    },
    toggleFilterToken() {
      this.service.toggleFilterToken();
    },
    clearAllSelection() {
      this.service.clearLayerSelection();
    },
    switchSelection() {
      this.service.switchSelection();
    },
    selectAllRow() {
      this.state.features.length && this.service.selectAllFeatures();
    },
    _setLayout() {
      this.service._setLayout();
    },
    async zoomAndHighLightFeature(feature, zoom=true) {
      if (feature.geometry) {
        this.service.zoomAndHighLightFeature(feature, zoom);
      } else {
        await this.service.zoomAndHighLightGeometryRelationFeatures(feature, zoom);
      }
    },
    addRemoveSelectedFeature(feature) {
      this.service.addRemoveSelectedFeature(feature);
    },
    async reloadLayout() {
      await this.$nextTick();
      if (dataTable) {
        dataTable.columns.adjust();
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
      const trDomeElements = dataTable.rows().nodes();
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
                SelectRowInstance.$on('selected', feature => this.service.addRemoveSelectedFeature(feature));
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
      setTimeout(()=> this.reloadLayout(), 0)
    },
    async resize() {
      await this.$nextTick();
      const tableHeight = $(".content").height();
      const tableHeaderHeight = $('#open_attribute_table  div.dataTables_scrollHeadInner').height();
      $('#open_attribute_table  div.dataTables_scrollBody').height(tableHeight - tableHeaderHeight - 130);
    }
  },
  beforeCreate() {
    this.delayType = 'debounce';

    this.service = new TableService({ layer: CatalogLayersStoresRegistry.getLayerById(this.$options.layerId) });

    // table content
    const comp = new Component({
      id: 'openattributetable',
      service: this.service,
      internalComponent: this,
    }); 

    comp.layout = () => { comp.internalComponent.reloadLayout(); };
    this.service.on('redraw', ()=> { comp.layout(); });
    comp.on('unmount', () => { this.service.clear(); })

    // overwrite show method
    comp.show = (opts = {}) => {
      // close all sidebar open component
      GUI.closeOpenSideBarComponent();
      this.service
        .getData({ firstCall: true })
        .then(() => {
          GUI.showContent({
            content: comp,
            perc: 50,
            split: GUI.isMobile() ? 'h': 'v',
            push: false,
            title: opts.title
          });
        })
        .catch(e => GUI.notify.error(t("info.server_error")))
        .finally(() => comp.emit('show'));
    };

    comp.on('show', () => {
      if (this.isMobile()) {
        GUI.hideSidebar();
      }
      this.$options.onShow()
    });
    comp.show({ title: this.service.layer.getName() });
  },
  async mounted() {
    this.setContentKey = GUI.onafter('setContent', this.resize);
    const hideElements = () => {
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
    await this.$nextTick();
    this.first = false;
    const commonDataTableOptions = {
      "lengthMenu": this.state.pageLengths,
      "pageLength": this.state.pageLength,
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
      } ]
    };
    if (this.state.pagination) {
      //pagination
      dataTable = $(this.$refs.attribute_table).DataTable({
          ...commonDataTableOptions,
          "columns": this.state.headers,
          "ajax": debounce((data, callback) => {
            //remove listeners
            const trDomeElements = $('#open_attribute_table table tr');
            trDomeElements.each(element => {
              $(element).off('click');
              $(element).off('mouseover');
            });
            this.service.getData(data)
              .then(async serverData => {
                callback(serverData);
                await this.$nextTick();
                this.createdContentBody();
                this.isMobile() && hideElements();
              })
              .catch(error => {
                console.log(error)
              })
          }, 800),
          "serverSide": true,
          "deferLoading": this.state.allfeatures
        });
      this.service.on('ajax-reload', dataTable.ajax.reload);
      this.changeColumn = debounce(async (event, index) => {
        dataTable
          .columns(index)
          .search(event.target.value.trim())
          .draw();
      });
    } else { // no pagination all data
      dataTable = $(this.$refs.attribute_table).DataTable({
        ...commonDataTableOptions,
        searchDelay: 600
      });
      const debounceSearch = debounce(() => {
        this.service.setFilteredFeature(dataTable.rows( {search:'applied'} )[0])
      }, 600);
      eventHandlers.nopagination['search.dt'] = debounceSearch;
      dataTable.on('search.dt', debounceSearch);
      dataTable.on('length.dt', (evt, settings, length) => {
        this.service.setAttributeTablePageLength(length)
      });
      this.changeColumn = debounce(async (event, index) => {
        dataTable.columns(index).search(event.target.value.trim()).draw();
        this.service.setFilteredFeature(dataTable.rows( {search:'applied'})[0]);
      });
    }

    if (this.isMobile()) {
      hideElements();
    }

    const G3WTableToolbarClass = Vue.extend(G3wTableToolbar);
    const G3WTableToolbarInstance = new G3WTableToolbarClass({
      propsData: {
        tools: this.state.tools,
        geolayer: this.state.geolayer,
        switchSelection: this.switchSelection,
        clearAllSelection: this.clearAllSelection,
        toggleFilterToken: this.toggleFilterToken,
        getDataFromBBOX: this.getDataFromBBOX
      }
    });

    $('#g3w-table-toolbar').html(G3WTableToolbarInstance.$mount().$el);

    this.service.on('redraw', data => {
      dataTable.clear();
      dataTable.draw(false);
      setTimeout(() => {
        dataTable.rows.add(data);
        dataTable.draw(false);
        this.createdContentBody();
        this.isMobile() && hideElements();
      })
    })
  },
  beforeDestroy() {
    this.service.clear();
    this.service.off('ajax-reload');
    this.service.off('redraw');
    GUI.un('setContent', this.setContentKey);
    dataTable.destroy(true);
    dataTable = null;
  }
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
