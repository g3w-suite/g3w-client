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
  this.geolayer = this.layer.isGeoLayer();
  this.projection = this.geolayer  ? this.layer.getProjection() : null;
  this.mapService = GUI.getComponent('map').getService();
  this.getAll = this.selectedfeaturesid.size > 0;
  this.clearAllSelection = () => {
    this.state.features.forEach(feature => feature.selected = false);
    this.state.tools.show = false;
    this.state.selectAll = false;
  };
  this.layer.on('unselectionall', this.clearAllSelection);
  this.state = {
    pageLengths: [10, 25, 50],
    features: [],
    title: this.layer.getTitle(),
    headers,
    geometry: true,
    loading: false,
    allfeatures: 0,
    featurescount: 0,
    pagination: false,
    selectAll: false,
    tools: {
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
  })
};

const proto = TableService.prototype;

proto.activeDeactiveLayerFilter = function(){
  this.layer.toggleFilter();
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
  const action = feature && feature.selected ? 'add' : 'remove';
  this.geolayer && this.layer.setOlSelectionFeatures(feature, action);
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
      this.layer.clearSelectionIds();
    }
  } else {
    this.layer[feature.selected ? 'addSelectionId' : 'deleteSelectionId'](feature.id);
    const size = this.selectedfeaturesid.size;
    if (size === this.allfeaturesnumber) {
      this.state.selectAll = true;
      this.layer.setSelectionIdsAll();
    }
  }
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

proto.clearLayerSelection = function(){
  this.layer.clearSelectionIds();
};

proto.selectAllFeatures = function(){
  this.state.selectAll = !this.state.selectAll;
  this.state.features.forEach(feature => feature.selected = this.state.selectAll);
  if (this.state.allfeatures === this.allfeaturesnumber) {
    this.state.selectAll && this.layer.setSelectionIdsAll();
    this.state.tools.show = this.state.selectAll;
    if (this.state.selectAll && !this.getAll ) {
      this.layer.getDataTable({}).then(data =>{
        const {features} = data;
        this.geolayer && features && features.forEach(feature => {
          feature.geometry && this.layer.addOlSelectionFeature({
            id: feature.id,
            geometry: this._returnGeometry(feature)
          });
          this.layer.setOlSelectionFeatures(feature, 'add');
        });
        this.getAll = true;
      })
    } else if (this.state.selectAll && this.getAll) {
      this.layer.showAllOlSelectionFeatures();
    }
    !this.state.selectAll && this.layer.clearSelectionIds();
  } else {
    if (!this.state.selectAll) {
      this.layer.setExcludeSelection();
      this.state.features.forEach(feature => {
        this.setSelectionFeatures(feature);
        this.layer.addSelectionId(feature.id);
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
      const getDataPromise = this.selectedfeaturesid.size === 0 || this.state.pagination ? this.layer.getDataTable({
        page: this.currentPage,
        page_size: length,
        search: searchText,
        formatter: this.formatter,
        ordering
      }) : this.layer.getDataTable({
        ordering,
        formatter: this.formatter
      });
      getDataPromise.then(data => {
        const {features} = data;
        this.state.allfeatures = data.count || this.state.features.length;
        this.state.featurescount += features.length;
        this.allfeaturesnumber = this.allfeaturesnumber === undefined ? this.state.allfeatures : this.allfeaturesnumber;
        this.state.pagination = data.count > 0 && (this.state.featurescount < this.allfeaturesnumber);
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
    selected: this.layer.hasSelectionId(feature.id),
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry: this.geolayer && this._returnGeometry(feature),
  };
  this.geolayer && tableFeature.geometry && this.layer.addOlSelectionFeature({
    id: tableFeature.id,
    geometry: tableFeature.geometry
  });
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
  this.layer.off('unselectionall', this.clearAllSelection);
  this.allfeaturesnumber = null;
  this.mapService = null;
  this._async.state && setTimeout(()=> {
    this._async.fnc();
    this._async.state = false;
    this._async.fnc = noop;
  });
};

module.exports = TableService;
