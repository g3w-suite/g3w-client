const GUI = require('gui/gui');
const t = require('core/i18n/i18n.service').t;
const noop = require('core/utils/utils').noop;
const {coordinatesToGeometry} =  require('core/utils/geo');

const TableService = function(options = {}) {
  this.currentPage = 0; // number of pages
  this.layer = options.layer;
  this.formatter = options.formatter;
  const headers = this.getHeaders();
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
    pagination: true
  };
  this._async = {
    state: false,
    fnc: noop
  };
  GUI.onbefore('setContent', (options)=>{
    const {perc} = options;
    this._async.state = perc === 100;
  })
};

const proto = TableService.prototype;

proto.getHeaders = function() {
  return this.layer.getTableHeaders();
};

// function need to work with pagination
proto.setDataForDataTable = function() {
  const data = [];
  this.state.features.forEach((feature) => {
    const attributes = feature.attributes ? feature.attributes : feature.properties;
    const values = [];
    this.state.headers.forEach((header) => {
      values.push(attributes[header.name]);
    });
    data.push(values)
  });
  return data;
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
          column: 0,
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
      }).then((data) => {
        let features = data.features;
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
    attributes: feature.attributes ? feature.attributes : feature.properties,
    geometry: this._returnGeometry(feature)
  };
  this.state.features.push(tableFeature);
};

proto.addFeatures = function(features) {
  features.forEach((feature) => {
    this.addFeature(feature);
  });
};

proto._setLayout = function() {
  //TODO
};

proto._returnGeometry = function(feature) {
  let geometry;
  if (feature.attributes) {
    geometry = feature.geometry;
  } else if (feature.geometry) {
    geometry = coordinatesToGeometry(feature.geometry.type, feature.geometry.coordinates);
  }
  return geometry;
};

proto.zoomAndHighLightSelectedFeature = function(feature, zoom=true) {
  let geometry = feature.geometry;
  if (geometry) {
    const mapService = GUI.getComponent('map').getService();
    if (this._async.state) {
      this._async.fnc = mapService.highlightGeometry.bind(mapService, geometry, {zoom});
    } else {
      mapService.highlightGeometry(geometry , {
        zoom
      });
    }
  }
};

proto.clear = function(){
  this._async.state && setTimeout(()=> {
    this._async.fnc();
    this._async.state = false;
    this._async.fnc = noop;
  });
};

module.exports = TableService;
