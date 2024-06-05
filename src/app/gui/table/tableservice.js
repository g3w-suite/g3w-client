import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService           from 'services/data';
import GUI                         from 'services/gui';

const { inherit, noop }         = require('utils');
const G3WObject                 = require('core/g3wobject');
const { t }                     = require('core/i18n/i18n.service');
const { coordinatesToGeometry } = require('utils/geo');
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
  this.filter = [];

  /**
   * Get selection fids Set from layer
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
 **
 * @fires redraw when `opts.type` in_bbox filter (or not select all)
 */
proto.filterChangeHandler = async function () {
  this.emit('ajax-reload');
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
  //invert selected of feature
  feature.selected = !feature.selected;

  this.layer[feature.selected ? 'includeSelectionFid' : 'excludeSelectionFid'](feature.id);

  this.checkSelectAll();

  /** Show tools based on selected state */
  this.state.tools.show = this.state.features.some(f => f.selected);

};

proto.createFeatureForSelection = function(feature) {
  return {
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry: this._returnGeometry(feature),
  }
};

/**
 *
 * @param params
 * @return {Promise<unknown>}
 */
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
          //Set true. All Features of layer are get
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

/**
 * Switch selection
 * @return {Promise<void>}
 */
proto.switchSelection = async function() {
  //need to get all features
  if (!this.getAll) { await this.getAllFeatures() }
  this.state.features.forEach(f => f.selected = !f.selected);
  this.layer.invertSelectionFids();
  //set selectAll checkbox
  this.checkSelectAll();
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

  const filter         = this.filter.length > 0;

  if (!filter) {
    if (!this.getAll) await this.getAllFeatures();
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

  this.state.tools.show = this.state.features.some(f => f.selected);

};

/**
 * Set filtered features
 * 
 * @param filter features an index array
 */
proto.setFilteredFeature = function(filter = []) {
  this.filter = filter;
  if (filter.length) { this.getAll = false }
  this.checkSelectAll();
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
 *
 * @returns {Promise<{{ data: [], recordsTotal: number, recordsFiltered: number }}>}
 */
proto.getData = function({
  start     = 0,
  order     = [],
  length    = this.state.pageLength,
  columns   = [],
  search    = { value: null },
} = {}) {

  // reset features before a load
  GUI.setLoadingContent(true);

  this.setAttributeTablePageLength(length);

  return new Promise((resolve, reject) => {

    // No headers
    if (!this.state.headers.length) {
      resolve({
        data: [],
        recordsTotal: 0,
        recordsFiltered: 0
      });
      return;
    }

    let searchText = search.value && search.value.length > 0 ? search.value : null;

    //reset features
    this.state.features.splice(0);

    if (!order.length) {
      order.push({
        column: 1,
        dir: 'asc',
      });
    }

    const ordering = ('asc' === order[0].dir ? '' : '-') + this.state.headers[order[0].column].name;

    this.currentPage = (start === 0 || (this.state.tools.filter.active)) ? 1 : (start/length) + 1;

    const in_bbox = this.state.tools.geolayer.in_bbox;

    const field =  columns.filter(c => c.search && c.search.value).map(c => `${c.name}|ilike|${c.search.value}|and`).join(',')

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
      .getDataTable(this.paginationParams)
      .then(data => {
        const { features = [] }  = data;
        this.state.allfeatures   = data.count;
        //get
        //current feature length
        this.state.featurescount = features.length;
        //add features
        this.addFeatures(features);
        this.state.selectAll = this.state.tools.filter.active || this.state.features.every(f => f.selected);

        resolve({
          data:            this.setDataForDataTable(),
          recordsFiltered: data.count,
          recordsTotal:    data.count,
          filter:          this.state.features.map(f => f.id)
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

  //is active geo layer filter (load feature on map only)
  const is_active = geolayer.active;
  const listener  = this.mapBBoxEventHandlerKey;

  //in the case of active bbox filter
  if (is_active) {
    listener.cb = () => {
      this.setInBBoxParam();
      this.emit('ajax-reload');
    };
  }


  if (is_active) {
    listener.key = this.mapService.getMap().on('moveend', listener.cb);
  }


  if (listener.cb) { listener.cb() }

  if (!is_active) {
    this.resetMapBBoxEventHandlerKey();
  }
};

/**
 *
 * @param feature
 */
proto.addFeature = function(feature) {
  // in the case of feature already added, skip
  if (this.state.features.find(f => feature.id === f.id)) { return }
  const tableFeature = {
    id:         feature.id,
    selected:   this.layer.hasSelectionFid(feature.id),
    attributes: feature.attributes                || feature.properties,
    geometry:   this.geolayer && feature.geometry || undefined
  };

  const has_geom  = this.geolayer && feature.geometry;
  const selection = has_geom && this.layer.getOlSelectionFeature(feature.id);

  //if not already add to selection
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
    this.selectedfeaturesfid.has(SELECTION_STATE.ALL)
    || (features.length && features.reduce((selectAll, f) => selectAll && f.selected, true))
  );
};

proto.addFeatures = function(features=[]) {
  features.forEach(f => this.addFeature(f));
  this.state.tools.show = this.layer.getFilterActive() || this.selectedfeaturesfid.size > 0;
};

proto._setLayout = function() {
  //TODO
};

proto._returnGeometry = function(feature) {
  if (feature.attributes) { return feature.geometry }
  if (feature.geometry)   { return coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates) }
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
