const {inherit } = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');
const t = require('core/i18n/i18n.service').t;
const noop = require('core/utils/utils').noop;
const {coordinatesToGeometry} =  require('core/utils/geo');
const { SELECTION_STATE } = require('core/layers/layer');
const PAGELENGTHS = [10, 25, 50];

const TableService = function(options = {}) {
  this.currentPage = 0; // number of pages
  this.layer = options.layer;
  this.formatter = options.formatter;
  const headers = this.getHeaders();
  this.allfeaturesnumber;
  this.filteredfeatures = null;
  this.selectedfeaturesfid = this.layer.getSelectionFids();
  this.geolayer = this.layer.isGeoLayer();
  this.projection = this.geolayer  ? this.layer.getProjection() : null;
  this.mapService = GUI.getComponent('map').getService();
  this.getAll = this.selectedfeaturesfid.size > 0;
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
  this._async = {
    state: false,
    fnc: noop
  };
  GUI.onbefore('setContent', options => {
    this._async.state = options.perc === 100;
  });
  this.layer.on('unselectionall', this.clearAllSelection);
  this.filterChangeHandler = async ()=>{
    let data = [];
    const emitRedraw = !this.selectedfeaturesfid.has(SELECTION_STATE.ALL);
    if (!this.state.pagination) {
      data = emitRedraw ? await this.reloadData() : null;
    }
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
      header && values.push(attributes[header.name]);
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
    if (this.filteredfeatures && this.filteredfeatures.length) {
      this.state.selectAll = this.state.features.filter(feature => feature.selected).length === this.filteredfeatures.length;
    }
  }
};

proto.getAllFeatures = function(){
  GUI.setLoadingContent(true);
  return new Promise((resolve, reject) =>{
    this.layer.getDataTable({})
      .then(data =>{
        const {features} = data;
        if (this.geolayer && features) {
          const LoadedFeaturesId = this.state.features.map(feature => feature.id);
          features.forEach(feature => {
            if (LoadedFeaturesId.indexOf(feature.id) === -1) {
              feature.geometry && this.layer.addOlSelectionFeature({
                id: feature.id,
                geometry: this._returnGeometry(feature)
              });
            }
          });
          resolve();
        }
        this.getAll = true;
      })
      .fail(()=>{
        reject();
      })
      .always(()=>GUI.setLoadingContent(false))
  })

};

proto.switchSelection = async function(){
  if (!this.state.pagination) { // no pagination
    if (this.filteredfeatures === null) { //no filter
      this.state.features.forEach(feature => {
        feature.selected = !feature.selected;
      });
      this.layer.invertSelectionFids();
      this.checkSelectAll();
      this.state.tools.show = this.selectedfeaturesfid.size > 0;
    } else { // filter
      this.checkFilteredFeaturesForNoPagination(true);
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

proto.checkFilteredFeaturesForNoPagination = function(inversion=false){
  const filtered = this.filteredfeatures !== null;
  if (filtered) {
    if (this.filteredfeatures.length === this.allfeaturesnumber) {
      this.state.selectAll && this.layer.setSelectionFidsAll();
      this.state.tools.show = this.state.selectAll;
    } else {
      let selected = false;
      this.state.features.forEach((feature, index) =>{
        if (this.filteredfeatures.indexOf(index) !== -1) {
          feature.selected = inversion ? !feature.selected: this.state.selectAll;
          this.layer[this.selectedfeaturesfid.has(feature.id) ? 'excludeSelectionFid' : 'includeSelectionFid'](feature.id);
        } else if (inversion) {
          feature.selected = !feature.selected;
          this.layer[this.selectedfeaturesfid.has(feature.id) ? 'excludeSelectionFid' : 'includeSelectionFid'](feature.id);
        }
        selected = selected || feature.selected;
      });
      this.state.tools.show = selected;
      this.setFilteredFeature(this.filteredfeatures);
    }
  }
  return filtered;
};

proto.selectAllFeatures = async function(){
  // set inverse of selectAll
  this.state.selectAll = !this.state.selectAll;
  if (!this.state.pagination) { //no pagination no filter
    if (this.filteredfeatures !== null) {  //check if filter is set (no pagination)
      this.checkFilteredFeaturesForNoPagination();
    } else {
      this.state.tools.show = this.state.selectAll;
      this.layer[this.state.selectAll ? 'setSelectionFidsAll': 'clearSelectionFids']();
      this.state.features.forEach(feature => feature.selected = this.state.selectAll);
    }
  } else { //pagination
    if (this.paginationfilter) { // filtered
      this.state.features.forEach(feature => {
        feature.selected = this.state.selectAll;
        this.layer[feature.selected ? 'includeSelectionFid': 'excludeSelectionFid'](feature.id);
      });
    } else {
      this.state.features.forEach(feature => feature.selected = this.state.selectAll);
      !this.getAll && await this.getAllFeatures();
      this.layer[this.state.selectAll ? 'setSelectionFidsAll': 'clearSelectionFids']();
    }
    this.state.tools.show = this.state.selectAll || this.selectedfeaturesfid.size > 0;
  }
};

proto.setFilteredFeature = function(featuresIndex){
  if (featuresIndex === undefined) this.checkSelectAll();
  else {
    const featuresIndexLength =  featuresIndex.length;
    this.state.nofilteredrow = featuresIndexLength === 0;
    this.filteredfeatures = featuresIndexLength === 0 || featuresIndexLength === this.allfeaturesnumber ? null : featuresIndex;
    if (this.state.nofilteredrow) this.state.selectAll = false;
    else this.state.selectAll = this.selectedfeaturesfid.has(SELECTION_STATE.ALL) || featuresIndex.reduce((accumulator, index) => this.state.features[index].selected && accumulator, true);
  }
};

proto.setAttributeTablePageLength = function(length){
  this.layer.setAttributeTablePageLength(length);
};

proto.getData = function({start = 0, order = [], length = this.state.pageLength, search={value:null}, firstCall=false} = {}) {
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
      this.currentPage = start === 0  ? 1 : (start/length) + 1;
      const in_bbox = this.state.tools.geolayer.in_bbox;
      const getDataPromise = this.state.pagination ? this.layer.getDataTable({
        page: this.currentPage,
        page_size: length,
        search: searchText,
        in_bbox,
        formatter: this.formatter,
        ordering
      }) : this.layer.getDataTable({
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
          this.state.pagination = firstCall ? features.length < this.allfeaturesnumber : this.state.pagination;
          this.addFeatures(features);
          resolve({
            data: this.setDataForDataTable(),
            recordsFiltered: data.count,
            recordsTotal: data.count
          });
        })
        .fail((err) => {
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

proto.getDataFromBBOX = async function(){
  this.state.tools.geolayer.active = !this.state.tools.geolayer.active;
  if (this.state.tools.geolayer.active) {
    this.mapBBoxEventHandlerKey.cb = this.state.pagination ? () => {
      this.setInBBoxParam();
      this.emit('ajax-reload');
    } : async ()=>{
      this.setInBBoxParam();
      await this.getData();
      this.filterChangeHandler();
    };
    this.mapBBoxEventHandlerKey.key = this.mapService.getMap().on('moveend', this.mapBBoxEventHandlerKey.cb);
    this.mapBBoxEventHandlerKey.cb();
  } else {
    ol.Observable.unByKey(this.mapBBoxEventHandlerKey.key);
    this.mapBBoxEventHandlerKey.cb();
    this.mapBBoxEventHandlerKey.key = null;
    this.mapBBoxEventHandlerKey.cb = null;
  }
};

proto.addFeature = function(feature) {
  const tableFeature = {
    id: feature.id,
    selected: this.state.tools.filter.active || this.layer.hasSelectionFid(feature.id),
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry: this.geolayer && this._returnGeometry(feature)
  };
  this.geolayer && tableFeature.geometry && this.layer.addOlSelectionFeature({
    id: tableFeature.id,
    geometry: tableFeature.geometry
  });
  this.state.features.push(tableFeature);
};

proto.checkSelectAll = function(){
  this.state.selectAll = this.selectedfeaturesfid.has(SELECTION_STATE.ALL) || this.state.features.reduce((accumulator, feature) => accumulator && feature.selected, true);
};

proto.addFeatures = function(features=[]) {
  features.forEach(feature => this.addFeature(feature));
  this.state.tools.show = this.layer.getFilterActive() ||  this.selectedfeaturesfid.size > 0;
  this.checkSelectAll();
};

proto.reloadData = async function(){
  this.state.features.splice(0);
  const tabledata = await this.getData();
  return tabledata.data || [];
};

proto._setLayout = function() {
  //TODO
};

proto._returnGeometry = function(feature) {
  let geometry;
  const layerCode = this.layer.getProjection().getCode();
  const mapCode = this.mapService.getProjection().getCode();
  if (feature.attributes) geometry = feature.geometry;
  else if (feature.geometry) geometry = coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates);
  (geometry && layerCode !== mapCode) && geometry.transform(layerCode, mapCode);
  return geometry;
};

proto.zoomAndHighLightFeature = function(feature, zoom=true) {
  const geometry = feature.geometry;
  if (geometry) {
    if (this._async.state) this._async.fnc = this.mapService.highlightGeometry.bind(mapService, geometry, {zoom});
    else this.mapService.highlightGeometry(geometry , { zoom });
  }
};

proto.clear = function(){
  this.layer.off('unselectionall', this.clearAllSelection);
  this.layer.off('filtertokenchange', this.filterChangeHandler);
  this.allfeaturesnumber = null;
  this.mapService = null;
  this._async.state && setTimeout(()=> {
    this._async.fnc();
    this._async.state = false;
    this._async.fnc = noop;
  });
};

module.exports = TableService;
