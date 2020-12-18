const GUI = require('gui/gui');
const t = require('core/i18n/i18n.service').t;
const noop = require('core/utils/utils').noop;
const {coordinatesToGeometry} =  require('core/utils/geo');
const { SELECTION_STATE } = require('core/layers/layer');

const TableService = function(options = {}) {
  this.currentPage = 0; // number of pages
  this.layer = options.layer;
  this.formatter = options.formatter;
  const headers = this.getHeaders();
  this.allfeaturesnumber;
  this.selectedfeaturesid = this.layer.getSelectionIds();
  this.geolayer = this.layer.state.geolayer;
  this.projection = this.geolayer  ? this.layer.getProjection() : null;
  this.mapService = GUI.getComponent('map').getService();
  this.olFeatures = {};
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
      geolayer: this.geolayer
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

proto.setSelectionFeatures = function(feature){
  if (this.geolayer) {
    if (!feature) {
      Object.values(this.olFeatures).forEach(featureObject => {
        featureObject.added && this.mapService.setSelectionFeatures('remove', {
          feature: featureObject.feature
        });
        featureObject.added = false
      });
    } else if (feature.geometry){
      const featureObject = this.olFeatures[feature.id];
      if (feature.selected) {
        !featureObject.added && this.mapService.setSelectionFeatures('add', {
          feature: featureObject.feature
        });
      } else {
        this.mapService.setSelectionFeatures('remove', {
          feature: featureObject.feature
        });
      }
      featureObject.added = feature.selected;
    }
  }
};

proto.addRemoveSelectedFeature = function(feature){
  feature.selected = !feature.selected;
  this.setSelectionFeatures(feature);
  if (this.state.selectAll) {
    this.state.selectAll = false;
    this.layer.setExcludeSelection();
    this.layer.addSelectionId(feature.id);
  } else if (this.selectedfeaturesid.has(SELECTION_STATE.EXCLUDE)) {
    feature.selected ? this.layer.deleteSelectionId(feature.id) : this.layer.addSelectionId(feature.id);
    const size = this.selectedfeaturesid.size;
    if (size === 1) {
      this.selectedfeaturesid.clear();
      this.layer.setSelectionIdsAll();
      this.state.selectAll = true;
    } else if (size -1 === this.state.allfeatures){
      this.selectedfeaturesid.clear();
    }
  } else this.selectedfeaturesid[feature.selected ? 'add' : 'delete'](feature.id);
  this.state.tools.show = this.selectedfeaturesid.size > 0;
  !this.state.tools.show && this.setSelectionFeatures();
};

proto.switchSelection = function(){
  if (this.state.selectAll) this.selectAllFeatures();
  else if (this.selectedfeaturesid.has(SELECTION_STATE.EXCLUDE)) {
    this.layer.removeExludeSelection();
    const selectedId = Array.from(this.selectedfeaturesid);
    this.state.features.forEach(feature => {
      feature.selected = selectedId.indexOf(feature.id) !== -1;
      this.setSelectionFeatures(feature);
    });
    this.checkSelectAll();
  } else {
    const selectedId = Array.from(this.selectedfeaturesid);
    this.state.features.forEach(feature => {
      feature.selected = selectedId.indexOf(feature.id) === -1;
      this.setSelectionFeatures(feature);
    });
    this.layer.setExcludeSelection();
  }
};

proto.clearAllSelection = function(){
  this.state.selectAll = false;
  this.selectedfeaturesid.clear();
  this.state.features.forEach(feature => feature.selected = false);
  this.state.tools.show = false;
  Object.values(this.olFeatures).forEach(featureObject => {
    featureObject.added && this.mapService.setSelectionFeatures('remove', {
      feature: featureObject.feature
    });
    featureObject.added = false
  });
};

proto.selectAllFeatures = function(){
  this.state.selectAll = !this.state.selectAll;
  this.state.features.forEach(feature => feature.selected = this.state.selectAll);
  if (this.state.allfeatures === this.allfeaturesnumber) {
    this.layer.clearSelectionIds();
    this.state.selectAll && this.layer.setSelectionIdsAll();
    this.state.tools.show = this.state.selectAll;
    this.state.selectAll ? this.state.features.forEach(feature => this.setSelectionFeatures(feature)) : this.setSelectionFeatures();
  } else {
    if (!this.state.selectAll) {
      this.layer.setExcludeSelection();
      this.state.features.forEach(feature => {
        this.setSelectionFeatures(feature);
        this.layer.addSelectionId.add(feature.id);
      });
    } else {
      this.state.features.forEach(feature => {
        this.setSelectionFeatures(feature);
        this.layer[this.selectedfeaturesid.has(feature.id) ? 'deleteSelectionId' : 'addSelectionId'](feature.id);
      });
      if (this.selectedfeaturesid.has(SELECTION_STATE.EXCLUDE) && this.selectedfeaturesid.size === 1){
        this.layer.setSelectionIdsAll();
      }
    }
    this.state.tools.show = true;
  }
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
        this.state.pagination = !!data.count;
        this.state.allfeatures = data.count || this.state.features.length;
        this.state.featurescount += features.length;
        this.allfeaturesnumber = this.allfeaturesnumber === undefined ? this.state.allfeatures : this.allfeaturesnumber;
        this.addFeatures(features);
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
    geometry: this.geolayer && this._returnGeometry(feature),
  };
  if (this.geolayer && tableFeature.geometry) this.olFeatures[feature.id] = this.olFeatures[feature.id] || {
    feature: new ol.Feature(tableFeature.geometry),
    added: false
  };
  tableFeature.selected && this.setSelectionFeatures(tableFeature);
  this.state.features.push(tableFeature);
};

proto.checkSelectAll = function(){
  if (this.selectedfeaturesid.has(SELECTION_STATE.ALL)) this.state.selectAll = true;
  else this.state.selectAll = this.state.features.length > 0 && (this.state.features.length === this.state.features.filter(feature => feature.selected).length);
};

proto.addFeatures = function(features=[]) {
  features.forEach(feature => this.addFeature(feature));
  this.state.tools.show = this.selectedfeaturesid.size > 0;
  this.checkSelectAll();
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
  this.selectedfeaturesid.clear();
  this.allfeaturesnumber = null;
  this.setSelectionFeatures();
  this.mapService = null;
  this.olFeatures = null;
  this._async.state && setTimeout(()=> {
    this._async.fnc();
    this._async.state = false;
    this._async.fnc = noop;
  });
};

module.exports = TableService;
