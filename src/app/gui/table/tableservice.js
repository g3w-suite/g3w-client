import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService           from 'services/data';
import GUI                         from 'services/gui';
import { coordinatesToGeometry }   from 'utils/coordinatesToGeometry';

const { inherit, noop }         = require('utils');
const G3WObject                 = require('core/g3wobject');
const { t }                     = require('core/i18n/i18n.service');
const { SELECTION_STATE }       = require('core/layers/layer');

const PAGELENGTHS = [10, 25, 50];

/**
 * Create a unique feature key
 */
function _createFeatureKey(values) {
  return values.join('__');
}

/**
 * TableService Class
 * 
 * @param options.layer
 * @param options.formatter
 * 
 * @constructor
 */
const TableService = function(options = {}) {

  /**
   * Number of pages
   */
  this.currentPage = 0;
 
  /**
   * @FIXME add description
   */
  this.layer = options.layer;

  /**
   * @FIXME add description
   */
  this.formatter = options.formatter;

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
    },
    edit:          this.layer.isEditable(),     /*@since 3.10.0 */
    layer_id:      this.layer.getId(),          /*@since 3.10.0*/
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
};

inherit(TableService, G3WObject);

const proto = TableService.prototype;

/**
 * @since 3.9.0
 */
proto._relationsGeometry = function() {

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
};

/**
 * @since 3.9.0
 */
proto.clearAllSelection = function() {
  this.state.features.forEach(feature => feature.selected = false);
  this.state.tools.show = false;
  this.state.selectAll = false;
};

/**
 * @since 3.9.0
 * 
 * @param { Object } opts
 * @param { string } opts.type
 * 
 * @fires redraw when `opts.type` in_bbox filter (or not select all)
 */
proto.filterChangeHandler = async function ({ type } = {}) {
  this.allfeaturesnumber = undefined;
  if (type === 'in_bbox' || !this.selectedfeaturesfid.has(SELECTION_STATE.ALL)) {
    this.emit('redraw', this.state.pagination ? [] : await this.reloadData());
  }
};

/**
 * @since 3.9.0
 */
proto.onGUIContent = function(options) {
  this._async.state = (100 === options.perc);
};

proto.toggleFilterToken = async function() {
  await this.layer.toggleFilterToken();
};

/**
 * first value = `null` for DataTable purpose (used to add a custom input selector) 
 */
proto.getHeaders = function() {
  return [null, ...this.layer.getTableHeaders()];
};

/**
 * DataTable pagination
 */
proto.setDataForDataTable = function() {
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

proto.addRemoveSelectedFeature = function(feature) {
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

};

proto.createFeatureForSelection = function(feature) {
  return {
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry: this._returnGeometry(feature),
  }
};

proto.getAllFeatures = function(params) {
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
};

proto.switchSelection = async function() {
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

};

proto.clearLayerSelection = function() {
  this.layer.clearSelectionFids();
};

/**
 * Called when a selected feature is checked
 * 
 * @returns {Promise<void>}
 */
proto.selectAllFeatures = async function() {

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

};

/**
 * Set filtered features
 * 
 * @param index features index
 */
proto.setFilteredFeature = function(index) {
  const filter = this.nopaginationsfilter = index;
  if (0 === index.length || index.length === this.allfeaturesnumber) {
    this.checkSelectAll();
  } else {
    this.checkSelectAll(filter.map(i => this.state.features[i]));
  }
};

proto.setAttributeTablePageLength = function(length) {
  this.layer.setAttributeTablePageLength(length);
};

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
proto.getData = function({
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
};

proto.setInBBoxParam = function() {
  const { geolayer } = this.state.tools;
  geolayer.in_bbox = geolayer.active ? this.mapService.getMapBBOX().join(',') : undefined;
};

proto.resetMapBBoxEventHandlerKey = function() {
  const listener = this.mapBBoxEventHandlerKey;
  ol.Observable.unByKey(listener.key);
  listener.key = null;
  listener.cb  = null;
};

proto.getDataFromBBOX = async function() {
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
};

proto.addFeature = function(feature) {
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
};

proto.checkSelectAll = function(features = this.state.features) {
  this.state.selectAll = (
    this.selectedfeaturesfid.has(SELECTION_STATE.ALL) ||
    (features.length && features.reduce((selectAll, f) => selectAll && f.selected, true))
  );
};

proto.addFeatures = function(features=[]) {
  features.forEach(f => this.addFeature(f));
  this.state.tools.show = this.layer.getFilterActive() || this.selectedfeaturesfid.size > 0;
  this.checkSelectAll();
};

proto.reloadData = async function(pagination=false) {
  this.state.features.splice(0);
  this.state.pagination = pagination;
  const { data = [] }   = await this.getData();
  return data;
};

proto._setLayout = function() {
  //TODO
};

proto._returnGeometry = function(feature) {
  if (feature.attributes) return feature.geometry;
  if (feature.geometry)   return coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates);
};

proto.zoomAndHighLightFeature = function(feature, zoom = true) {
  // async highlight
  if (feature.geometry && this._async.state) {
    this._async.fnc = this.mapService.highlightGeometry.bind(mapService, feature.geometry, { zoom });
  }
  // sync highlight
  if (feature.geometry && !this._async.state) {
    this.mapService.highlightGeometry(feature.geometry , { zoom });
  }
};

/**
 * Zoom to eventually features relation
 */
proto.zoomAndHighLightGeometryRelationFeatures = async function(feature, zoom = true) {

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

};

proto.clear = function() {
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
};

module.exports = TableService;
