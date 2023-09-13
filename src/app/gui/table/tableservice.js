import CatalogLayersStoresRegistry from 'store/catalog-layers';
import DataRouterService from 'services/data';
import GUI from 'services/gui';

const { inherit, noop } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const { t } = require('core/i18n/i18n.service');
const { coordinatesToGeometry } =  require('core/utils/geo');
const { SELECTION_STATE } = require('core/layers/layer');

const PAGELENGTHS = [10, 25, 50];

const TableService = function(options = {}) {
  this.currentPage = 0; // number of pages
  this.layer = options.layer;
  this.formatter = options.formatter;
  const headers = this.getHeaders();
  this.allfeaturesnumber;
  this.nopaginationsfilter = [];
  this.selectedfeaturesfid = this.layer.getSelectionFids();
  this.geolayer = this.layer.isGeoLayer();
  this.relationsGeometry = [];
  //In case if no geometry layer
  if (!this.geolayer) {
    //check layer Relation
    this.layer.getRelations()
      .getArray()
      .forEach(relation => {
        //get project layer
        const relationLayer = CatalogLayersStoresRegistry.getLayerById(relation.getFather());
        if (
          //need to check if current layer is not child layer of relation
          (this.layer.getId() !== relation.getFather()) &&
          //need to be geolayer (has geometry)
          relationLayer.isGeoLayer()
        ) {
          this.relationsGeometry.push({
            layer: relationLayer,
            //need to check if Array for backport compatibility
            //before v3.7.0 (or in case of not reload project)
            father_fields: Array.isArray(relation.getFatherField()) ?
              relation.getFatherField() :
              [relation.getFatherField()],  //is Array since v3.7.0
            //need to check if Array for backport compatibility
            //before v3.7.0 (or in case of not reload project)
            fields: Array.isArray(relation.getChildField()) ?
              relation.getChildField() :
              [relation.getChildField()], // is Array since v3.7.0
            features: {}
          })
        }
     });
  }

  this.projection = this.geolayer ? this.layer.getProjection() : null;

  this.mapService = GUI.getService('map');
  this.getAll = false;
  this.paginationfilter = false;
  this.mapBBoxEventHandlerKey = {
    key: null,
    cb: null
  };
  this.clearAllSelection = () => {
    this.state.features.forEach(feature => feature.selected = false);
    this.state.tools.show = false;
    this.state.selectAll = false;
  };
  this.state = {
    pageLengths: PAGELENGTHS,
    pageLength: this.layer.getAttributeTablePageLength() || PAGELENGTHS[0],
    features: [],
    title: this.layer.getTitle(),
    headers,
    geometry: true,
    loading: false,
    allfeatures: 0,
    pagination: !this.getAll,
    selectAll: false,
    nofilteredrow: false,
    tools: {
      geolayer: {
        show: this.geolayer,
        active: false,
        in_bbox: void 0
      },
      show: false,
      filter: this.layer.state.filter
    }
  };
  // pagination filter features
  this._async = {
    state: false,
    fnc: noop
  };
  GUI.onbefore('setContent', options => {
    this._async.state = options.perc === 100;
  });
  this.layer.on('unselectionall', this.clearAllSelection);
  this.filterChangeHandler = async ({type}={})=>{
    this.allfeaturesnumber = undefined;
    let data = [];
    // emit redraw if in_bbox filter or not select all
    const emitRedraw = type === 'in_bbox' || !this.selectedfeaturesfid.has(SELECTION_STATE.ALL);
    if (!this.state.pagination) data = emitRedraw ? await this.reloadData() : [];
    emitRedraw && this.emit('redraw', data);
  };
  this.layer.on('filtertokenchange', this.filterChangeHandler);
};

inherit(TableService, G3WObject);

const proto = TableService.prototype;

proto.toggleFilterToken = async function(){
  await this.layer.toggleFilterToken();
};

proto.getHeaders = function() {
  //add null as firs vale of header because need to add a custom input selector fro datatable purpose
  return [null, ...this.layer.getTableHeaders()];
};

// function need to work with pagination
proto.setDataForDataTable = function() {
  const data = [];
  this.state.features.forEach(feature => {
    const attributes = feature.attributes ? feature.attributes : feature.properties;
    const values = [null];
    this.state.headers.forEach(header => {
      if (header) {
        const value = attributes[header.name];
        header.value = value;
        //header.label = undefined; // removed label
        values.push(value);
      }
    });
    data.push(values)
  });
  return data;
};

proto.addRemoveSelectedFeature = function(feature){
  feature.selected = !feature.selected;
  if (this.state.selectAll) {
    this.state.selectAll = false;
    this.layer.excludeSelectionFid(feature.id, this.state.pagination);
  } else if (this.selectedfeaturesfid.has(SELECTION_STATE.EXCLUDE)) {
    this.layer[feature.selected ? 'includeSelectionFid' : 'excludeSelectionFid'](feature.id);
    const size = this.selectedfeaturesfid.size;
    if (size === 1) {
      !this.state.tools.filter.active && this.layer.setSelectionFidsAll();
      this.state.selectAll = true;
    } else if (size -1 === this.state.features.length) this.layer.clearSelectionFids();
  } else {
    this.layer[feature.selected ? 'includeSelectionFid' : 'excludeSelectionFid'](feature.id);
    const size = this.selectedfeaturesfid.size;
    if (size === this.allfeaturesnumber) {
      this.state.selectAll = true;
      !this.state.tools.filter.active && this.layer.setSelectionFidsAll();
    }
  }
  this.state.tools.show = this.selectedfeaturesfid.size > 0;
  if (!this.state.pagination){
    if (this.nopaginationsfilter.length) {
      this.state.selectAll = this.state.features.filter(feature => feature.selected).length === this.nopaginationsfilter.length;
    }
  }
};

proto.createFeatureForSelection = function(feature){
  return {
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry: this._returnGeometry(feature)
  }
};

proto.getAllFeatures = function(params){
  GUI.setLoadingContent(true);
  return new Promise((resolve, reject) =>{
    this.layer.getDataTable(params || {})
      .then(data =>{
        const {features} = data;
        if (this.geolayer && features) {
          if (!params){
            const LoadedFeaturesId = this.state.features.map(feature => feature.id);
            features.forEach(feature => {
              if (LoadedFeaturesId.indexOf(feature.id) === -1) {
                feature.geometry && this.layer.addOlSelectionFeature({
                  id: feature.id,
                  feature: this.createFeatureForSelection(feature)
                });
              }
            });
            this.getAll = true;
          }
          resolve(features);
        }
      })
      .fail(()=> reject())
      .always(()=>GUI.setLoadingContent(false))
  })
};

proto.switchSelection = async function(){
  if (!this.state.pagination) { // no pagination
    if (this.nopaginationsfilter.length) { //filtered
      let selected = false;
      const filterFeatures = [];
      this.state.features.forEach((feature, index) =>{
        if (this.nopaginationsfilter.indexOf(index) !== -1) filterFeatures.push(feature);
        feature.selected = !feature.selected;
        this.layer[feature.selected ? 'includeSelectionFid' : 'excludeSelectionFid' ](feature.id);
        selected = selected || feature.selected;
      });
      this.state.tools.show = selected;
      this.checkSelectAll(filterFeatures)
    } else { // no filter
      this.state.features.forEach(feature => {
        feature.selected = !feature.selected;
      });
      this.layer.invertSelectionFids();
      this.checkSelectAll();
      this.state.tools.show = this.selectedfeaturesfid.size > 0;
    }
  } else { // pagination
    let selected = false;
    this.state.features.forEach(feature => {
      feature.selected = !feature.selected;
      selected = feature.selected;
    });
    !this.getAll && await this.getAllFeatures();
    this.state.selectAll = this.paginationfilter ? selected: this.state.selectAll;
    this.layer.invertSelectionFids();
    this.state.tools.show = this.selectedfeaturesfid.size > 0;
  }
};

proto.clearLayerSelection = function(){
  this.layer.clearSelectionFids();
};

/**
 * Called when alla selected feature is checked
 * @returns {Promise<void>}
 */
proto.selectAllFeatures = async function(){
  // set inverse of selectAll
  this.state.selectAll = !this.state.selectAll;
  if (!this.state.pagination) { //no pagination no filter
    if (this.nopaginationsfilter.length) {  //check if filter is set (no pagination)
      let selected = false;
      this.state.features.forEach((feature, index) =>{
        if (this.nopaginationsfilter.indexOf(index) !== -1) {
          feature.selected = this.state.selectAll;
          this.layer[feature.selected ? 'includeSelectionFid': 'excludeSelectionFid'](feature.id);
          selected = selected || feature.selected;
        }
      });
      this.state.tools.show = selected;
    } else {
      this.state.tools.show = this.state.selectAll;
      this.layer[this.state.selectAll ? 'setSelectionFidsAll': 'clearSelectionFids']();
      this.state.features.forEach(feature => feature.selected = this.state.selectAll);
    }
  } else { //pagination
    if (this.paginationfilter) { // filtered
      if (this.state.featurescount >= this.state.allfeatures)
        this.state.features.forEach(feature => {
          feature.selected = this.state.selectAll;
          this.layer[feature.selected ? 'includeSelectionFid': 'excludeSelectionFid'](feature.id);
        });
      else {
        const {search, ordering, formatter, in_bbox } = this.paginationParams;
        const features = await this.getAllFeatures({
          search,
          ordering,
          formatter,
          in_bbox
        });
        features.forEach(feature =>{
          !this.getAll && this.geolayer && feature.geometry && this.layer.addOlSelectionFeature({
            id: feature.id,
            feature: this.createFeatureForSelection(feature)
          });
          this.layer[this.state.selectAll ? 'includeSelectionFid' : 'excludeSelectionFid'](feature.id);
        })
      }
      this.state.features.forEach(feature => feature.selected = this.state.selectAll);
    } else {
      this.state.features.forEach(feature => feature.selected = this.state.selectAll);
      !this.getAll && await this.getAllFeatures();
      this.layer[this.state.selectAll ? 'setSelectionFidsAll': 'clearSelectionFids']();
    }
    this.state.tools.show = this.state.selectAll || this.selectedfeaturesfid.size > 0;
  }
};

/**
 * Method to set filtered features
 * @param featuresIndex
 */
proto.setFilteredFeature = function(featuresIndex){
  this.nopaginationsfilter = featuresIndex;
  this.checkSelectAll((featuresIndex.length === this.allfeaturesnumber || featuresIndex.length === 0) ? undefined
    : this.nopaginationsfilter.map(index=> this.state.features[index]));
};

proto.setAttributeTablePageLength = function(length){
  this.layer.setAttributeTablePageLength(length);
};

/**
 * Main method to get data table layer
 * @param start
 * @param order
 * @param length
 * @param columns
 * @param search
 * @param firstCall
 * @returns {Promise<unknown>}
 */
proto.getData = function({start = 0, order = [], length = this.state.pageLength, columns=[], search={value:null}, firstCall=false} = {}) {
  // reset features before load
  GUI.setLoadingContent(true);
  this.setAttributeTablePageLength(length);
  return new Promise((resolve, reject) => {
    if (!this.state.headers.length)
      resolve({
        data: [],
        recordsTotal: 0,
        recordsFiltered: 0
      });
    else {
      let searchText = search.value && search.value.length > 0 ? search.value : null;
      this.state.features.splice(0);
      if (!order.length) {
        order.push({
          column: 1,
          dir: 'asc'
        })
      }
      const ordering = order[0].dir === 'asc' ? this.state.headers[order[0].column].name : '-'+this.state.headers[order[0].column].name;
      this.currentPage = start === 0 || (this.state.pagination && this.state.tools.filter.active) ? 1 : (start/length) + 1;
      const in_bbox = this.state.tools.geolayer.in_bbox;
      const field =  this.state.pagination ? columns.filter(column => column.search && column.search.value).map(column => `${column.name}|ilike|${column.search.value}|and`).join(',') : undefined;
      this.paginationParams = {
        field: field || undefined,
        page: this.currentPage,
        page_size: length,
        search: searchText,
        in_bbox,
        formatter: this.formatter,
        ordering
      };
      const getDataPromise = this.state.pagination ?
        this.layer.getDataTable(this.paginationParams) :
        this.layer.getDataTable({
          ordering,
          in_bbox,
          formatter: this.formatter
      });
      getDataPromise
        .then(data => {
          const {features=[]} = data;
          this.state.allfeatures = data.count || this.state.features.length;
          this.state.featurescount = features.length;
          this.allfeaturesnumber = this.allfeaturesnumber === undefined ? data.count : this.allfeaturesnumber;
          this.paginationfilter = data.count !== this.allfeaturesnumber;
          this.state.pagination = firstCall ? this.state.tools.filter.active || features.length < this.allfeaturesnumber : this.state.pagination;
          this.addFeatures(features);
          resolve({
            data: this.setDataForDataTable(),
            recordsFiltered: data.count,
            recordsTotal: data.count
          });
        })
        .fail(err => {
          GUI.notify.error(t("info.server_error"));
          reject(err);
        }).always(()=>{
          GUI.setLoadingContent(false);
        })
    }
  });
};

proto.setInBBoxParam = function(){
  this.state.tools.geolayer.in_bbox = this.state.tools.geolayer.active ? this.mapService.getMapBBOX().join(',') : void 0;
};

proto.resetMapBBoxEventHandlerKey = function(){
  ol.Observable.unByKey(this.mapBBoxEventHandlerKey.key);
  this.mapBBoxEventHandlerKey.key = null;
  this.mapBBoxEventHandlerKey.cb = null;
};

proto.getDataFromBBOX = async function(){
  this.state.tools.geolayer.active = !this.state.tools.geolayer.active;
  if (this.state.tools.geolayer.active) {
    this.mapBBoxEventHandlerKey.cb = this.state.pagination ? () => {
      this.setInBBoxParam();
      this.emit('ajax-reload');
    } : async () => {
        this.setInBBoxParam();
        this.filterChangeHandler({
          type: 'in_bbox'
        });
    };
    this.mapBBoxEventHandlerKey.key = this.mapService.getMap().on('moveend', this.mapBBoxEventHandlerKey.cb);
    this.mapBBoxEventHandlerKey.cb();
  } else {
    this.mapBBoxEventHandlerKey.cb && this.mapBBoxEventHandlerKey.cb();
    this.resetMapBBoxEventHandlerKey();
  }
};

proto.addFeature = function(feature) {
  const tableFeature = {
    id: feature.id,
    selected: this.state.tools.filter.active || this.layer.hasSelectionFid(feature.id),
    attributes: feature.attributes ? feature.attributes : feature.properties
  };
  if (this.geolayer && feature.geometry) {
    this.layer.getOlSelectionFeature(tableFeature.id) || this.layer.addOlSelectionFeature({
      id: tableFeature.id,
      feature: this.createFeatureForSelection(feature)
    });
    tableFeature.geometry = feature.geometry;
  }
  this.state.features.push(tableFeature);
};

proto.checkSelectAll = function(features=this.state.features){
  this.state.selectAll = this.selectedfeaturesfid.has(SELECTION_STATE.ALL) || (features.length && features.reduce((accumulator, feature) => accumulator && feature.selected, true));
};

proto.addFeatures = function(features=[]) {
  features.forEach(feature => this.addFeature(feature));
  this.state.tools.show = this.layer.getFilterActive() ||  this.selectedfeaturesfid.size > 0;
  this.checkSelectAll();
};

proto.reloadData = async function(pagination=false){
  this.state.features.splice(0);
  this.state.pagination = pagination;
  const tabledata = await this.getData();
  const {data=[], reloadData} = tabledata;
  return data;
};

proto._setLayout = function() {
  //TODO
};

proto._returnGeometry = function(feature) {
  let geometry;
  if (feature.attributes) geometry = feature.geometry;
  else if (feature.geometry) geometry = coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates);
  return geometry;
};

proto.zoomAndHighLightFeature = function(feature, zoom=true) {
  const geometry = feature.geometry;
  if (geometry) {
    if (this._async.state) this._async.fnc = this.mapService.highlightGeometry.bind(mapService, geometry, {zoom});
    else this.mapService.highlightGeometry(geometry , { zoom });
  }
};

/**
 * Zoom to eventually features relation
 */
proto.zoomAndHighLightGeometryRelationFeatures = async function(feature, zoom=true){
  //check if there are relation features geometry
  if (this.relationsGeometry.length > 0) {
    //Utility function to create uniqueKey
    const createFeatureKey = values => values.join('__')
    const features = [];
    const promises = [];
    const field_values = []; // useful to check if add or not
    this.relationsGeometry
      .forEach(({layer, father_fields, fields, features}) => {
        const values = fields.map(field => feature.attributes[field]);
        const featureKey = createFeatureKey(values);
        field_values.push(values);
        if (features[featureKey] === undefined) {
          let promise;
          if (zoom) {
            const filter = father_fields.reduce((filter, field, index) => {
              filter = `${filter}${index > 0 ? '|AND,' : ''}${field}|eq|${encodeURIComponent(values[index])}`
              return filter;
            }, '');
            promise = DataRouterService.getData('search:features', {
              inputs: {
                layer,
                filter,
                formatter: 1, // set formatter to 1
                search_endpoint: 'api'
              },
              outputs: false //just a request not show on result
            });
          } else {
            promise = Promise.reject();
          }
          promises.push(promise);
        } else {
          promises.push(Promise.resolve(
            {
              data:[
                {
                  features: features[featureKey]
                }
              ]
            }))
        }
      });
    const promisesData = await Promise.allSettled(promises);

    promisesData.forEach(({status, value}, index) => {
      //Only in case of result
      if (status === 'fulfilled') {

        const _features = value.data[0] ? value.data[0].features : [];

        _features.forEach(feature => features.push(feature));

        const featureKey = createFeatureKey(field_values[index]);

        if (this.relationsGeometry[index].features[featureKey] === undefined) {

          this.relationsGeometry[index].features[featureKey] = _features;

        }
      }
    });

    if (zoom) {
      this.mapService.zoomToFeatures(features, {
        highlight: true
      })
    } else {
      this.mapService.highlightFeatures(features);
    }
  }
};

proto.clear = function(){
  this.layer.off('unselectionall', this.clearAllSelection);
  this.layer.off('filtertokenchange', this.filterChangeHandler);
  this.resetMapBBoxEventHandlerKey();
  this.allfeaturesnumber = null;
  this.mapService = null;
  this._async.state && setTimeout(()=> {
    this._async.fnc();
    this._async.state = false;
    this._async.fnc = noop;
  });
};

module.exports = TableService;
