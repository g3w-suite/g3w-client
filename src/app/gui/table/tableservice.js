const GUI = require('gui/gui');
const t = require('core/i18n/i18n.service').t;
const noop = require('core/utils/utils').noop;
const Layer = require('core/layers/layer');
const {coordinatesToGeometry} =  require('core/utils/geo');
const SELECTION_STATE = {
  ALL: '__ALL__',
  EXCLUDE: '__EXCLUDE__'
};

const TableService = function(options = {}) {
  this.currentPage = 0; // number of pages
  this.layer = options.layer;
  this.formatter = options.formatter;
  const headers = this.getHeaders();
  this.selectedfeaturesid = new Set();
  this.projection = this.layer.state.geolayer  ? this.layer.getProjection() : null;
  this.state = {
    pageLengths: [10, 25, 50],
    features: [],
    title: this.layer.getTitle(),
    headers,
    geometry: true,
    loading: false,
    allfeatures: 0,
    featurescount: 0,
    pagination: true,
    selectAll: false,
    tools: {
      show: false,
      geolayer: this.layer.state.geolayer
    }
  };
  this._async = {
    state: false,
    fnc: noop
  };
  GUI.onbefore('setContent', options => {
    this._async.state = options.perc === 100;
  })
};

const proto = TableService.prototype;

proto.createFilter = function(){
  console.log('Creating filter ....')
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
    this.selectedfeaturesid.delete(SELECTION_STATE.ALL);
    this.selectedfeaturesid.add(SELECTION_STATE.EXCLUDE);
    this.selectedfeaturesid.add(feature.id);
  } else if (this.selectedfeaturesid.has(SELECTION_STATE.EXCLUDE)) {
    feature.selected ? this.selectedfeaturesid.delete(feature.id) : this.selectedfeaturesid.add(feature.id);
    const size = this.selectedfeaturesid.size;
    if ( size === 1) {
      this.selectedfeaturesid.clear();
      this.selectedfeaturesid.add(SELECTION_STATE.ALL);
      this.statate.selectAll = true;
    } else if (size -1 === this.state.allfeatures){
      this.selectedfeaturesid.clear();
    }
  } else this.selectedfeaturesid[feature.selected ? 'add' : 'delete'](feature.id);
  this.state.tools.show = this.selectedfeaturesid.size > 0;
};

proto.switchSelection = function(){
  if (this.state.selectAll) this.selectAllFeatures();
  else if (this.selectedfeaturesid.has(SELECTION_STATE.EXCLUDE)) {
    this.selectedfeaturesid.delete(SELECTION_STATE.EXCLUDE);
    const selectedId = Array.from(this.selectedfeaturesid);
    this.state.features.forEach(feature => feature.selected = selectedId.indexOf(feature.id) !== -1)
  } else {
    const selectedId = Array.from(this.selectedfeaturesid);
    this.state.features.forEach(feature => feature.selected = selectedId.indexOf(feature.id) === -1);
    this.selectedfeaturesid.add(SELECTION_STATE.EXCLUDE);
  }
};

proto.selectAllFeatures = function(){
  this.state.selectAll = !this.state.selectAll;
  this.state.features.forEach(feature => feature.selected = this.state.selectAll);
  this.selectedfeaturesid.clear();
  this.state.selectAll && this.selectedfeaturesid.add(SELECTION_STATE.ALL);
  this.state.tools.show = this.state.selectAll;
};

proto.getData = function({start = 0, order = [], length = this.state.pageLengths[0], search={value:null}} = {}) {
  // reset features before load
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
      this.layer.getDataTable({
        page: this.currentPage,
        page_size: length,
        search: searchText,
        formatter: this.formatter,
        ordering
      }).then(data => {
        const {features} = data;
        this.addFeatures(features);
        this.state.pagination = !!data.count;
        this.state.allfeatures = data.count || this.state.features.length;
        this.state.featurescount += features.length;
        resolve({
          data: this.setDataForDataTable(),
          recordsFiltered: this.state.allfeatures,
          recordsTotal: this.state.allfeatures
        });
      })
        .fail((err) => {
          GUI.notify.error(t("info.server_error"));
          reject(err);
        });
    }
  });
};

proto.addFeature = function(feature) {
  const tableFeature = {
    id: feature.id,
    selected: this.selectedfeaturesid.has(SELECTION_STATE.ALL) ||
              this.selectedfeaturesid.has(SELECTION_STATE.EXCLUDE) ? !this.selectedfeaturesid.has(feature.id) :this.selectedfeaturesid.has(feature.id),
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry: this.layer.getType() !== Layer.LayerTypes.TABLE && this._returnGeometry(feature)
  };
  this.state.features.push(tableFeature);
};

proto.addFeatures = function(features=[]) {
  features.forEach(feature => this.addFeature(feature));
};

proto._setLayout = function() {
  //TODO
};

proto._returnGeometry = function(feature) {
  let geometry;
  const mapService = GUI.getComponent('map').getService();
  const layerCode = this.layer.getProjection().getCode();
  const mapCode = mapService.getProjection().getCode();
  if (feature.attributes) geometry = feature.geometry;
  else if (feature.geometry) geometry = coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates);
  (geometry && layerCode !== mapCode) && geometry.transform(layerCode, mapCode);
  return geometry;
};

proto.zoomAndHighLightFeature = function(feature, zoom=true) {
  const geometry = feature.geometry;
  if (geometry) {
    const mapService = GUI.getComponent('map').getService();
    if (this._async.state) this._async.fnc = mapService.highlightGeometry.bind(mapService, geometry, {zoom});
    else mapService.highlightGeometry(geometry , { zoom });
  }
};

proto.clear = function(){
  this.selectedfeaturesid = null;
  this._async.state && setTimeout(()=> {
    this._async.fnc();
    this._async.state = false;
    this._async.fnc = noop;
  });
};

module.exports = TableService;
