import ApplicationState from 'store/application-state';
import { DOWNLOAD_FORMATS } from 'app/constant';
import DataRouterService from 'services/data';
import ProjectsRegistry from 'store/projects';
import ApplicationService from 'services/application';
import GUI from 'services/gui';

const { t } = require('core/i18n/i18n.service');
const {
  inherit,
  base,
  XHR,
  getUniqueDomId
} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const { geometryFields, parseAttributes } =  require('core/utils/geo');
const Relations = require('core/relations/relations');
const ProviderFactory = require('core/layers/providersfactory');

// Base Class of all Layer
function Layer(config={}, options={}) {

  this.config = config;

  // assign some attribute
  config.id        = config.id || 'Layer';
  config.title     = config.title || config.name;
  config.download  = !!config.download;
  config.geolayer  = false;
  config.baselayer = !!config.baselayer;
  config.fields    = config.fields || {};
  config.urls      = {
    query: (config.infourl && '' !== config.infourl ? config.infourl : config.wmsUrl),
    ...(config.urls || {})
  };

  const {
    project = ProjectsRegistry.getCurrentProject()
  } = options;

  this.config.search_endpoint = project.getSearchEndPoint();

  // create relations
  this._relations = this._createRelations(project.getRelations());

  // set URLs to get varios type of data
  if (!this.isBaseLayer()) {
    const suffixUrl = `${project.getType()}/${project.getId()}/${config.id}/`;
    const vectorUrl = project.getVectorUrl();
    const rasterUrl = project.getRasterUrl();

    this.config.urls.filtertoken = `${vectorUrl}filtertoken/${suffixUrl}`;
    this.config.urls.data = `${vectorUrl}data/${suffixUrl}`;
    this.config.urls.shp = `${vectorUrl}shp/${suffixUrl}`;
    this.config.urls.csv = `${vectorUrl}csv/${suffixUrl}`;
    this.config.urls.xls = `${vectorUrl}xls/${suffixUrl}`;
    this.config.urls.gpx = `${vectorUrl}gpx/${suffixUrl}`;
    this.config.urls.gpkg = `${vectorUrl}gpkg/${suffixUrl}`;
    this.config.urls.geotiff = `${rasterUrl}geotiff/${suffixUrl}`;
    this.config.urls.editing = `${vectorUrl}editing/${suffixUrl}`;
    this.config.urls.commit = `${vectorUrl}commit/${suffixUrl}`;
    this.config.urls.config = `${vectorUrl}config/${suffixUrl}`;
    this.config.urls.unlock = `${vectorUrl}unlock/${suffixUrl}`;
    this.config.urls.widget = {
      unique: `${vectorUrl}widget/unique/data/${suffixUrl}`
    };

    /**
     * @since 3.8.0
     */
    this.config.urls.featurecount = project.getUrl('featurecount');
    
    /**
     * Custom parameters based on project qgis version
     */
    this.config.searchParams = { I: 0, J: 0 };
  }

  // dinamic layer values useful for layerstree
  const defaultstyle = config.styles && config.styles.find(style => style.current).name;

  this.state = {

    id: config.id,

    title: config.title,

    selected: config.selected || false,

    disabled: config.disabled || false,

    metadata: config.metadata,

    metadata_querable: this.isBaseLayer() ? false: this.isQueryable({onMap:false}),

    openattributetable: this.isBaseLayer() ? false: this.canShowTable(),

    removable: config.removable || false,

    downloadable: this.isDownloadable(),

    source: config.source,

    styles: config.styles,

    defaultstyle,

    /**
     * state of if is in editing (setted by editing plugin)
     */
    inediting: false,

    infoformat: this.getInfoFormat(),

    infoformats: this.config.infoformats || [],

    projectLayer: true,

    geolayer: false,

    /**
     * Reactive selection attribute 
     */
    selection: {
      active: false
    },

    /**
     * Reactive filter attribute 
     */
    filter: {
      active: false,
      /**
       * @since v3.9 Specify if filter is set from saved filter or current
       */
      fid: null,
    },

    /**
     * @since v3.9 Store reactive saved filters
     * if undefined, set to []
     * Each filters item is an object {id.<Uninqueid>, name: <String>>}
     */
    filters: config.filters || [],

    attributetable: {
      pageLength: null
    },


    visible: config.visible || false,

    tochighlightable: false,

    /**
     * @type {number}
     * 
     * @since 3.8.0
     */
    featurecount: config.featurecount,

    /**
     * @FIXME add type tag
     * 
     * @since 3.8.0
     */
    stylesfeaturecount: config.featurecount && defaultstyle && {
      [defaultstyle]: config.featurecount
    }

  };

  // add selectionFids
  this.selectionFids = new Set();

  // referred to (layersstore);
  this._layersstore = config.layersstore || null;

  /*
    Providers that layer can use

    Three type of provider:
      1 - query
      2 - filter
      3 - data -- raw data del layer (editing)
   */
  const serverType = this.config.servertype;
  const sourceType = this.config.source ? this.config.source.type : null; // NB: sourceType = source of layer

  if (serverType && sourceType) {
    this.providers = {
      query:       ProviderFactory.build('query', serverType, sourceType, { layer: this }),
      filter:      ProviderFactory.build('filter', serverType, sourceType, { layer: this }),
      filtertoken: ProviderFactory.build('filtertoken', serverType, sourceType, { layer: this }),
      search:      ProviderFactory.build('search', serverType, sourceType, { layer: this }),
      data:        ProviderFactory.build('data', serverType, sourceType, { layer: this })
    };
  }

  /**
   * Store last proxy params (useful for repeat request info formats for wms external layer)
   */
  this.proxyData = {
    wms: null // at the moment only wms data from server
  };

  base(this);

}

inherit(Layer, G3WObject);

const proto = Layer.prototype;

/**
 * Proxyparams
 */
proto.getProxyData = function(type) {
  return type ? this.proxyData[type] : this.proxyData;
};

proto.setProxyData= function(type, data={}) {
  this.proxyData[type] = data;
};

proto.clearProxyData = function(type) {
  this.proxyData[type] = null;
};

proto.getDataProxyFromServer = async function(type= 'wms', proxyParams={}) {
  try {
    const {response, data} = await DataRouterService.getData(`proxy:${type}`, {
      inputs: proxyParams,
      outputs: false
    });
    this.setProxyData(type, JSON.parse(data));
    return response;
  } catch(err) {
    return;
  }
};

proto.changeProxyDataAndReloadFromServer = function(type='wms', changes={}) {
  Object.keys(changes).forEach(changeParam => {
    Object.keys(changes[changeParam]).forEach(param => {
      this.proxyData[type][changeParam][param] = changes[changeParam][param];
    })
  });
  return this.getDataProxyFromServer(type, this.proxyData[type]);
};

/**
 * editing method used by plugin
 */

proto.isInEditing = function() {
  return this.state.inediting;
};

proto.setInEditing = function(bool=false) {
  this.state.inediting = bool;
};

/**
 * end proxy params
 */

proto.getSearchParams = function() {
  return this.config.searchParams;
};

/**
 *
 * @returns {*}
 */
proto.getSearchEndPoint = function() {
  return this.getType() !== Layer.LayerTypes.TABLE ? this.config.search_endpoint : "api";
};

//relations
proto._createRelations = function(projectRelations) {
  const layerId = this.getId();
  return new Relations({
    relations: projectRelations.filter(relation => -1 !== [relation.referencedLayer, relation.referencingLayer].indexOf(layerId))
  });
};

// return relations of layer
proto.getRelations = function() {
  return this._relations
};

proto.getRelationById = function(id) {
  return this._relations.getArray().find(relation => relation.getId() === id);
};

proto.getRelationAttributes = function(relationName) {
  const relation = this._relations.find(relation => relation.name === relationName);
  return relation ? relation.fields : [];
};

proto.getRelationsAttributes = function() {
  const fields = {};
  this.state.relations.forEach(relation => fields[relation.name] = relation.fields);
  return fields;
};

proto.isChild = function() {
  return this.getRelations() ? this._relations.isChild(this.getId()) : false;
};

proto.isFather = function() {
  return this.getRelations() ? this._relations.isFather(this.getId()) : false;
};

proto.getChildren = function() {
  return this.isFather() ? this._relations.getChildren(this.getId()) : [];
};

proto.getFathers = function() {
  return this.isChild() ? this._relations.getFathers(this.getId()) : [];
};

proto.hasChildren = function() {
  return this.hasRelations() ? this._relations.hasChildren(this.getId()) : false;
};

proto.hasFathers = function() {
  return this.hasRelations() ? this._relations.hasFathers(this.getId()) : false;
};

proto.hasRelations = function() {
  return !!this._relations;
};
//end relations


// global state
proto.setAttributeTablePageLength = function(pageLength) {
  this.state.attributetable.pageLength = pageLength
};

proto.getAttributeTablePageLength = function() {
  return this.state.attributetable.pageLength;
};

// end global state

//filter token
proto.setFilter = function(bool=false) {
  this.state.filter.active = bool;
};

/**
 * get current filter fid set on layer
 */
proto.getCurrentFilter = function() {
  return this.state.filter.fid;
};

proto.getFilterActive = function() {
  return this.state.filter.active;
};

/**
 * Return saved filters Array
 * @returns <Array> filters saved
 */
proto.getFilters = function() {
  return this.state.filters;
}

/**
 * Add new filter
 * @param filter Object filter
 */
proto.addFilter = function(filter={}) {
  this.state.filters.push(filter);
}

/**
 * Remove saved filter from filters Array
 * @param fid unique filter id
 */
proto.removefilter = function(fid) {
  this.state.filters = this.state.filters.filter(f => fid === f.fid);
}

/**
 * Set Current filter
 * @param fid Uniqeu filter id
 */
proto.setCurrentFilter = function(fid) {
  this.state.filter.fid = fid;
}

/**
 * Apply layer filter by fid
 * @param fid
 */
proto.applyFilter = async function(fid) {
  if (!this.providers['filtertoken']) {
    return;
  }
  await this.clearSelectionFids();
  GUI.closeContent();
  await this._applyFilterToken(fid)
}

/**
 *
 * @returns {Promise<void>}
 * @private
 */
proto._applyFilterToken = async function(fid) {
  const {filtertoken} = await this.providers['filtertoken'].applyFilterToken(fid);
  if (filtertoken) {
    this.state.filter.active = true;
    this.setFilterToken(filtertoken);
  }
}

/**
 * @since v3.9
 * @param name <String> Unique string name
 */
proto.saveFilter = async function(name) {
  if (!this.providers['filtertoken'] || !this.selectionFids.size > 0) {
    return;
  }

  //Need to be an object so can be reactive with vue input instance
  let reactName = {
    name: this.state.filter.fid
      ? this.state.filters.find(f => this.state.filter.fid === f.fid).name
      : '',
    id: getUniqueDomId()}
  let inputVueInstance = new Vue({
    template:`
      <div>
      <label :for="id">Filter Name</label>
      <input v-model="name" :id="id" class="bootbox-input bootbox-input-text form-control" autocomplete="off" type="text">
      </div>`,
    data() {
      return reactName
    },
  });

  let dialog; // store dialog modal window
  const promise = new Promise((resolve, reject) => {
    //build a modal window with input name
    dialog = GUI.showModalDialog({
      message: inputVueInstance.$mount().$el,
      closeButton: false,
      buttons: {
        cancel: {
          label: 'Cancel',
          className: 'btn-danger',
          callback() {
            reject()
          }
        },
        ok: {
          label: 'Ok',
          className: 'btn-success',
          callback() {
            resolve()
          }
        }
      }
    });
    //get ok button of modal dialog
    const OkButton = dialog.find('button.btn-success');
    //set initial value to disabled true
    OkButton.prop('disabled', reactName.name.trim().length === 0);
    //listen name value text input change
    inputVueInstance.$watch('name', name => {
      //set disabled property base of vale of name
      OkButton.prop('disabled', name.trim().length === 0)
    });
  })

  promise
    .then(async () => {
      const data = await this
        .providers['filtertoken']
        .saveFilterToken(reactName.name);
      //id data return from provider
      if (data) {
        //add filter saved to filters array
        this.state.filters.push({
          fid: data.fid, //get fid
          name: data.name //get name
        })
        //set current filter
        this.state.filter.fid = data.fid;
        //reset selection to false
        this.state.selection.active = false;
        //clear current fids
        this.selectionFids.clear();
        //in case of geolayer
        if (this.isGeoLayer()) {
          //remove selection feature from map
          this.setOlSelectionFeatures();
        }
        //emit unselectionall
        this.emit('unselectionall', this.getId());
      }
    })
    .finally(() => {
      //clean oll variable
      inputVueInstance.$destroy();
      inputVueInstance = null;
      reactName        = null;
      dialog           = null;
    })
}

/*
Method to set unset filter token on layer
 */
proto.toggleFilterToken = async function() {
  this.state.filter.active = !this.state.filter.active;
  await this.activeFilterToken(this.state.filter.active);
  //if untoggled need to set current filter to null
  if (false === this.state.filter.active) {
    this.state.filter.fid = null;
  }
  return this.state.filter.active;
};

proto.activeFilterToken = async function(bool) {
  await bool ? this.createFilterToken() : this.deleteFilterToken();
};

/**
 * Delete filtertoken
 * @param fid  unique id of filter saved to delete
 */
proto.deleteFilterToken = async function(fid) {
  try {
    // skip when ..
    if (!this.providers['filtertoken']) {
      return;
    }
    const filtertoken = await this.providers['filtertoken'].deleteFilterToken(fid);

    /**
     * @since v3.9.0
     * In case of delete a saved filter and current filter apply to layer is
     * filter deleted
     */
    if (undefined !== fid) {
      //remove filter from filters list
      this.state.filters = this.state.filters.filter(f => fid !== f.fid);
      if (fid === this.state.filter.fid) {
        this.state.filter.fid = null;
        this.state.filter.active = false;
      } else {
        return;
      }
    }

    /**
     * @since v3.9.0
     * In case of response of server no filtertoken is returned set application filtertoken to null
     */
    if (undefined === filtertoken) {
       this.setFilterToken(null);
    }
  } catch(err) {
    console.log('Error deleteing filtertoken')
  }
};

/**
 * Common method to set filter token
 * @since v3.9.0
 * @param filtertoken
 *
 * @fires filtertokenchange
 *
 */
proto.setFilterToken = function(filtertoken) {
  ApplicationService.setFilterToken(filtertoken);
  this.emit('filtertokenchange', { layerId: this.getId() });
}

/**
 * @fires filtertokenchange
 */
proto.createFilterToken = async function() {
  let filtertoken = null;
  try {
    // skip when ..
    if (!this.providers['filtertoken'] || !this.selectionFids.size > 0) {
      return;
    }
    // create filter token
    if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) {
      await this.providers['filtertoken'].deleteFilterToken();
    } else {
      const params = {};
      if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) {
        params.fidsout = Array.from(this.selectionFids).filter(id => id !== Layer.SELECTION_STATE.EXCLUDE).join(',');
      } else {
        params.fidsin = Array.from(this.selectionFids).join(',');
      }
      filtertoken = await this.providers['filtertoken'].getFilterToken(params);
    }
    this.setFilterToken(filtertoken);
  } catch(err) {
    console.log('Error create update token');
  }
};
// end filter token


//selection Ids layer methods
proto.setSelectionFidsAll = function() {
  this.selectionFids.clear();
  this.selectionFids.add(Layer.SELECTION_STATE.ALL);
  if (this.isGeoLayer()) {
    this.showAllOlSelectionFeatures();
  }
  this.setSelection(true);

  if (this.state.filter.active) {
    this.createFilterToken();
  }
};

proto.getSelectionFids = function() {
  return this.selectionFids;
};

proto.invertSelectionFids = function() {

  if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) {

    this.selectionFids.delete(Layer.SELECTION_STATE.EXCLUDE);

  } else if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) {

    this.selectionFids.delete(Layer.SELECTION_STATE.ALL);

  } else if (this.selectionFids.size > 0) {

    this.selectionFids.add(Layer.SELECTION_STATE.EXCLUDE);

  }

  if (this.isGeoLayer()) {
    this.setInversionOlSelectionFeatures();
  }

  if (this.state.filter.active) {
    this.createFilterToken();
  }
  this.setSelection(this.selectionFids.size > 0);
};

proto.hasSelectionFid = function(fid) {
  if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) {
    return true;
  } else if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) {
    return !this.selectionFids.has(fid);
  } else {
    return this.selectionFids.has(fid);
  }
};

proto.includeSelectionFid = async function(fid, createToken=true) {
  //set create filter token
  //check if fid is excluded from selection
  const excludeFidFromSelection = (
    this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE) &&
    this.selectionFids.has(fid)
  )

  //remove fid
  if (excludeFidFromSelection) {
    this.selectionFids.delete(fid);
  }

  //if the only one exclude set all selected
  if (excludeFidFromSelection && 1 === this.selectionFids.size) {
    this.setSelectionFidsAll();
  }

  //add to selction fid
  if (!excludeFidFromSelection) {
    this.selectionFids.add(fid);
  }

  if (!excludeFidFromSelection && !this.isSelectionActive()) {
    this.setSelection(true);
  }
  
  if (this.isGeoLayer()) {
   this.setOlSelectionFeatureByFid(fid, 'add');
  }
  
  if (createToken && this.state.filter.active) {
    await this.createFilterToken();
  }

};

proto.includeSelectionFids = function(fids=[]) {
  fids.forEach(fid => this.includeSelectionFid(fid));
};

proto.excludeSelectionFid = async function(fid) {

  if (this.selectionFids.has(Layer.SELECTION_STATE.ALL) || this.selectionFids.size === 0) {
    this.selectionFids.clear();
    this.selectionFids.add(Layer.SELECTION_STATE.EXCLUDE);
  }

  this.selectionFids[this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE) ? 'add' : 'delete'](fid);

  if (1 === this.selectionFids.size && this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) {
    this.setselectionFidsAll();
  }

  const isLastFeatureSelected  = this.isGeoLayer() && this.setOlSelectionFeatureByFid(fid, 'remove');
  this.state.filter.active && await this.createFilterToken();

  if (0 === this.selectionFids.size || isLastFeatureSelected) {
    this.selectionFids.clear();
    this.setSelection(false);
  }

};

proto.excludeSelectionFids = function(fids=[]) {
  fids.forEach(fid => this.excludeSelectionFid(fid));
};

/**
 * Clear selection
 */
proto.clearSelectionFids = async function() {
  this.selectionFids.clear();
  if (this.isGeoLayer()) {
    this.setOlSelectionFeatures();
  }
  await this.setSelection(false);
};

// end selection ids methods

proto.getWMSLayerName = function() {
  return this.isWmsUseLayerIds() ? this.getId() : this.getName()
};

proto.isWmsUseLayerIds = function() {
  return this.config.wms_use_layer_ids;
};

proto.getFilterToken = function () {
  return ApplicationService.getFilterToken();
};

/**
 *
 * DOWNLOAD METHODS
 */

/** 
 * @returns promise
 */
proto.getDownloadFilefromDownloadDataType = function(type, {data={}, options}) {
  data.filtertoken = this.getFilterToken();
  switch (type) {
    case 'shapefile': return this.getShp({data, options});
    case 'xls':       return this.getXls({data, options});
    case 'csv':       return this.getCsv({data, options});
    case 'gpx':       return this.getGpx({data, options});
    case 'gpkg':      return this.getGpkg({data, options});
    case 'geotiff':   return this.getGeoTIFF({ data, options });
  }
};

proto.getGeoTIFF = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('geotiff'),
    data,
    httpMethod: "POST"
  })
};

proto.getXls = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('xls'),
    data,
    httpMethod: "POST"
  })
};

proto.getShp = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('shp'),
    data,
    httpMethod: "POST"
  })
};

proto.getGpx = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('gpx'),
    data,
    httpMethod: "POST"
  })
};

proto.getGpkg = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('gpkg'),
    data,
    httpMethod: "POST"
  })
};

proto.getCsv = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('csv'),
    data,
    httpMethod: "POST"
  })
};

proto.getSourceType = function() {
  return this.config.source ? this.config.source.type : null;
};

proto.isGeoLayer = function() {
  return this.state.geolayer;
};

proto.getDataTable = function({
  page = null,
  page_size=null,
  ordering=null,
  search=null,
  field,
  suggest=null,
  formatter=0,
  in_bbox,
  custom_params={}
} = {}) {
  const d = $.Deferred();
  let provider;
  const params = {
    ...custom_params,
    field,
    page,
    page_size,
    ordering,
    search,
    formatter,
    suggest,
    in_bbox,
    filtertoken: ApplicationState.tokens.filtertoken
  };
  if (!(this.getProvider('filter') || this.getProvider('data'))) {
   d.reject();
  } else {
    provider = this.getProvider('data');
    provider.getFeatures({editing: false}, params)
      .done(response => {
        const features = response.data.features && response.data.features || [];
        d.resolve(({
          headers: parseAttributes(this.getAttributes(), (features.length ? features[0].properties : [])),
          features,
          title: this.getTitle(),
          count: response.count
        }));
      })
      .fail(err => d.reject(err))
  }
  return d.promise();
};

/**
 * Search layer feature by fids
 * @param fids formatter
 */
proto.getFeatureByFids = async function({fids=[], formatter=0}={}) {
  const url = this.getUrl('data');
  let features;
  try {
    const response = await XHR.get({
      url,
      params: {
        fids:fids.toString(),
        formatter
      }
    });
    features = response && response.result && response.vector && response.vector.data && response.vector.data.features;
  } catch(err) {}
  return features
};

/**
 * Search Features
 * 
 * @param { 'ows' | 'api' } options.search_endpoint
 * @param { boolean }       options.raw
 * @param { 0 | 1 }         options.formatter
 * @param options.filter
 * @param options.suggest
 * @param options.unique
 * @param options.queryUrl
 * @param options.ordering
 * @param params           - OWS search params
 * 
 * @returns { Promise }
 */
proto.searchFeatures = function(options = {}, params = {}) {
  const {
    search_endpoint = this.config.search_endpoint,
  } = options;

  return new Promise(async (resolve, reject) => {
    switch (search_endpoint) {

      case 'ows':
        this
          .search(options, params)
          .then(results => { resolve(({ data: results })); })
          .fail(reject);
        break;

      case 'api':
        try {
          resolve(
            await this.getFilterData({
              queryUrl:  options.queryUrl,
              field:     options.filter,
              ordering:  options.ordering,
              unique:    options.unique,
              raw:       undefined !== options.raw       ? options.raw       : false,
              suggest:   undefined !== options.suggest   ? options.suggest   : {},
              /** @since 3.9.0 */
              formatter: undefined !== options.formatter ? options.formatter : 1,
            })
          );
        } catch(err) {
          reject(err);
        }
        break;
    }
  })
};

/**
 * Get feature data based on `field` and `suggests`
 * 
 * @param opts.suggest (mandatory): object with key is a field of layer and value is value of the field to filter
 * @param opts.field   Array of object with type of suggest (see above)
 * @param opts.unique
 * @param opts.queryUrl
 * @param opts.ordering
 * @param { boolean } opts.raw
 * @param { 0 | 1 }   opts.formatter
 */
proto.getFilterData = async function({
  field,
  raw = false,
  suggest = {},
  unique,
  formatter = 1,
  queryUrl,
  ordering
} = {}) {
  return await this
    .getProvider('data')
    .getFilterData({
      queryUrl,
      field,
      raw,
      ordering,
      suggest,
      formatter,
      unique,
    });
};

/**
 * search method 
 */
proto.search = function(options={}, params={}) {
  // check option feature_count
  options.feature_count = options.feature_count || 10;
  options = {
    ...options,
    ...this.config.searchParams,
    ...params
  };
  const d = $.Deferred();
  const provider = this.getProvider('search');
  if (provider) {
    provider.query(options)
      .done(response => d.resolve(response))
      .fail(err => d.reject(err));
  } else {
    d.reject(t('sdk.search.layer_not_searchable'));
  }
  return d.promise();
};

/**
 * Info from layer (only for querable layers) 
 */
proto.query = function(options={}) {
  const d = $.Deferred();
  const provider = this.getProvider(options.filter ? 'filter' : 'query');
  if (provider) {
    provider.query(options)
      .done(response => d.resolve(response))
      .fail(err => d.reject(err));
  } else {
    d.reject(t('sdk.search.layer_not_querable'));
  }
  return d.promise();
};

/**
 * General way to get an attribute 
 */
proto.get = function(property) {
  return this.config[property] ? this.config[property] : this.state[property];
};

proto.getFields = function() {
  return this.config.fields
};

/**
 * Get field by name
 * 
 * @param fieldName
 * @returns {*}
 */
proto.getFieldByName = function(fieldName) {
  return this.getFields().find(field => field.name === fieldName)
};

proto.getEditingFields = function() {
  return this.config.editing.fields;
};

/**
 * Return only show fields
 * 
 * @returns {T[]}
 */
proto.getTableFields = function() {
  return (this.config.fields || []).filter(field => field.show);
};

proto.getTableHeaders = function() {
  return this.getTableFields().filter(field => -1 === geometryFields.indexOf(field.name));
};

proto.getProject = function() {
  return this.config.project;
};

proto.getConfig = function() {
  return this.config;
};

/**
 * Get form structure to show on form editing
 * 
 * @param fields
 * @returns {[]}
 */
proto.getLayerEditingFormStructure = function(fields) {
  return this.config.editor_form_structure;
};

/**
 * Duplicated because we had to check if it
 * is used by some plugins to avoid to break
 * backward compatibility
 */
proto.getEditorFormStructure = function() {
  return this.getLayerEditingFormStructure();
};

proto.getFieldsOutOfFormStructure = function() {
  return this.config.editor_form_structure ? this.config.editor_form_structure.filter(structure => structure.field_name) : []
};

proto.hasFormStructure = function() {
  return !!this.config.editor_form_structure;
};

/**
 * Get custom style (for future implementation) 
 */
proto.getCustomStyle = function() {
  return this.config.customstyle;
};

proto.getState = function() {
  return this.state;
};

proto.getSource = function() {
  return this.state.source;
};

proto.isDownloadable = function() {
  return (
    this.isShpDownlodable()  ||
    this.isXlsDownlodable()  ||
    this.isGpxDownlodable()  ||
    this.isGpkgDownlodable() ||
    this.isCsvDownlodable()
  );
};

proto.getDownloadableFormats = function() {
  return Object.keys(DOWNLOAD_FORMATS).filter(download_format => this.config[download_format]).map(format => DOWNLOAD_FORMATS[format].format);
};

proto.getDownloadUrl = function(format) {
  const find = Object.values(DOWNLOAD_FORMATS).find(download_format => download_format.format === format);
  return find && find.url;
};

proto.isGeoTIFFDownlodable = function() {
  return !this.isBaseLayer() && this.config.download && 'gdal' === this.config.source.type ;
};

proto.isShpDownlodable = function() {
  return !this.isBaseLayer() && this.config.download && 'gdal' !== this.config.source.type;
};

proto.isXlsDownlodable = function() {
  return !this.isBaseLayer() && this.config.download_xls;
};

proto.isGpxDownlodable = function() {
  return !this.isBaseLayer() && this.config.download_gpx;
};

proto.isGpkgDownlodable = function() {
  return !this.isBaseLayer() && this.config.download_gpkg;
};

proto.isCsvDownlodable = function() {
  return !this.isBaseLayer() && this.config.download_csv;
};

proto.getEditingLayer = function() {
  return this._editingLayer;
};

proto.setEditingLayer = function(editingLayer) {
  this._editingLayer = editingLayer;
};

proto.isHidden = function() {
  return this.state.hidden;
};

proto.setHidden = function(bool=true) {
  this.state.hidden = bool;
};

proto.isModified = function() {
  return this.state.modified;
};

proto.getId = function() {
  return this.config.id;
};

proto.getMetadata = function() {
  return this.state.metadata
};

proto.getTitle = function() {
  return this.config.title;
};

proto.getName = function() {
  return this.config.name;
};

proto.getOrigName = function() {
  return this.config.origname;
};

proto.getServerType = function() {
  return (this.config.servertype && this.config.servertype !== '') ? this.config.servertype : ServerTypes.QGIS;
};

proto.getType = function() {
  return this.type;
};

proto.isType = function(type) {
  return this.getType() === type;
};

proto.setType = function(type) {
  this.type = type;
};

proto.isSelected = function() {
  return this.state.selected;
};

proto.setSelected = function(bool) {
  this.state.selected = bool;
};

proto.setSelection = async function(bool=false) {
  this.state.selection.active = bool;
  if (!bool) {
    //in case of not current selected filter is set active
    if (this.state.filter.active) {
      if (null === this.state.filter.fid) {
        await this.deleteFilterToken();
      } else {
        await this._applyFilterToken(this.state.filter.fid)
      }
    }
    this.state.filter.active = null !== this.state.filter.fid;
    this.emit('unselectionall', this.getId());
  }
};

proto.isSelectionActive = function() {
  return this.state.selection.active;
};

proto.getSelection = function() {
  return this.state.selection;
};

proto.getFilter = function() {
  return this.state.filter;
};

proto.setDisabled = function(bool) {
  this.state.disabled = bool;
};

proto.isDisabled = function() {
  return this.state.disabled;
};

proto.isVisible = function() {
  return this.state.visible;
};

proto.setVisible = function(bool) {
  this.state.visible = bool;
};

/**
 * Set a parameter map to check if request from map point of
 * view or just a capabilities info layer
 */
proto.isQueryable = function({onMap} = {onMap:false}) {
  let queryEnabled = false;
  const queryableForCababilities = !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.QUERYABLE));
  if (!onMap) return queryableForCababilities;
  // if querable check if is visible or disabled
  if (queryableForCababilities) {
    queryEnabled = this.isVisible() && !this.isDisabled();
    if (this.config.infowhennotvisible !== undefined && this.config.infowhennotvisible === true) queryEnabled = true;
  }
  return queryEnabled;
};

proto.getOws = function() {
  return this.config.ows;
};

proto.getTocHighlightable = function() {
  return this.state.tochighlightable
};

proto.setTocHighlightable = function(bool=false) {
  this.state.tochighlightable = bool;
};

/**
 * @param conditions plain object with configuration layer attribute and value
 */
proto.isFilterable = function(conditions=null) {
  let isFiltrable = !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.FILTERABLE));
  if (isFiltrable && conditions) {
    const conditionalFiltrable = Object.keys(conditions).reduce((bool, attribute) => {
      const layer_config_value = this.get(attribute);
      const condition_attribute_values = conditions[attribute];
      return bool && Array.isArray(layer_config_value) ?
        layer_config_value.indexOf(condition_attribute_values) !== -1 :
        condition_attribute_values === layer_config_value;
    }, true);
    isFiltrable = isFiltrable && conditionalFiltrable;
  }
  return isFiltrable;
};

/**
 * Check if layer is setup as time series
 */
proto.isQtimeseries = function() {
  return this.config.qtimeseries;
};

proto.isEditable = function() {
  return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.EDITABLE));
};

proto.isBaseLayer = function() {
  return this.config.baselayer;
};

/**
 * @param type get url by type (data, shp, csv, xls,  editing, ...) 
 */
proto.getUrl = function(type) {
  return this.config.urls[type];
};

/**
 * Set config url
 * 
 * @param url.type
 * @param url.url
 */
proto.setUrl = function({type, url}={}) {
  this.config.urls[type] = url;
};

/**
 * @returns config.urls
 */
proto.getUrls = function() {
  return this.config.urls;
};

proto.setEditingUrl = function(url) {
  this.config.urls.editing = url || this.config.urls.editing;
};

proto.getQueryUrl = function() {
  return this.config.urls.query;
};

proto.setQueryUrl = function(queryUrl) {
  this.config.urls.query = queryUrl;
};

proto.getQueryLayerName = function() {
  return (this.config.infolayer && this.config.infolayer !== '') ? this.config.infolayer : this.getName();
};

proto.getQueryLayerOrigName = function() {
  return this.state.infolayer && this.config.infolayer !== '' ? this.config.infolayer :  this.config.origname;
};

proto.getInfoFormat = function(ogcService) {
  // In case of NETCDF (qtime series)
  if (this.config.qtimeseries === true || this.getSourceType() === 'gdal') {
    return 'application/json';
  }
  if (this.config.infoformat && '' !== this.config.infoformat  && 'wfs' !== ogcService) {
    return this.config.infoformat;
  }
  return 'application/vnd.ogc.gml';
};

proto.getInfoFormats = function() {
  return this.state.infoformats;
};

proto.getInfoUrl = function() {
  return this.config.infourl;
};

proto.setInfoFormat = function(infoFormat) {
  this.config.infoformat = infoFormat;
};

proto.getAttributes = function() {
  return this.config.fields;
};

proto.changeAttribute = function(attribute, type, options) {
  for (const field of this.config.fields) {
    if (field.name === attribute) {
      field.type = type;
      field.options = options;
      break;
    }
  }
};

proto.getAttributeLabel = function(name) {
  const field = this.getAttributes().find(field=> field.name === name);
  return field && field.label;
};

proto.getProvider = function(type) {
  return this.providers[type];
};

proto.getProviders = function() {
  return this.providers;
};

proto.getLayersStore = function() {
  return this._layersstore;
};

proto.setLayersStore = function(layerstore) {
  this._layersstore = layerstore;
};

proto.canShowTable = function() {
  if (this.config.not_show_attributes_table) {
    return false;
  }

  if (this.getServerType() === Layer.ServerTypes.QGIS && ([
      Layer.SourceTypes.POSTGIS,
      Layer.SourceTypes.ORACLE,
      Layer.SourceTypes.WFS,
      Layer.SourceTypes.OGR,
      Layer.SourceTypes.MSSQL,
      Layer.SourceTypes.SPATIALITE
    ].indexOf(this.config.source.type) > -1) && this.isQueryable()) {
    return this.getTableFields().length > 0;
  }
  
  if (this.getServerType() === Layer.ServerTypes.G3WSUITE && "geojson" === this.get('source').type) {
    return true
  }

  if (this.getServerType() !== Layer.ServerTypes.G3WSUITE && this.isFilterable()) {
    return true;
  }

  return false;
};

proto.changeFieldType = function({name, type, options={}, reset=false}={}) {
  const field = this.getFields().find(field => field.name === name);
  
  if (field && reset) {
    field.type = field._type;
    delete field._type;
    delete field[`${type}options`];
    return field.type;
  }

  if (field && !reset) {
    field._type = field.type;
    field.type = type;
    field[`${type}options`] = options;
    return field._type;
  }

};

proto.changeConfigFieldType = function({name, type, options={},reset=false}) {
  return this.changeFieldType({name, type, options, reset});
};

proto.resetConfigField = function({name}) {
  this.changeConfigFieldType({ name, reset: true });
};

/**
 * Function called in case of change project to remove all stored information 
 */
proto.clear = function() {};

proto.isVector = function() {
  return this.getType() === Layer.LayerTypes.VECTOR;
};

proto.isTable = function() {
  return this.getType() === Layer.LayerTypes.TABLE;
};

/**
 * @since 3.8.0
 */
proto.getFeatureCount = function() {
  return this.state.featurecount;
};

/**
 * @param style
 * 
 * @returns {Promise<Object>}
 * 
 * @since 3.8.0
 */
proto.getStyleFeatureCount = async function(style) {
  if ("undefined" === typeof this.state.stylesfeaturecount[style]) {
    try {
      const { result, data } = await XHR.post({
        url: `${this.config.urls.featurecount}${this.getId()}/`,
        data: JSON.stringify({ style }),
        contentType: 'application/json'
      });
      this.state.stylesfeaturecount[style] = (true === result ? data : {});
    } catch(err) {
      this.state.stylesfeaturecount[style] = {};
    }
  }
  return this.state.stylesfeaturecount[style];
};

/// LAYER PROPERTIES

/**
 * Layer Types
 */
Layer.LayerTypes = {
  TABLE: "table",
  IMAGE: "image",
  VECTOR: "vector"
};

/**
 * Server Types
 */
Layer.ServerTypes = {
  OGC: "OGC",
  QGIS: "QGIS",
  Mapserver: "Mapserver",
  Geoserver: "Geoserver",
  ARCGISMAPSERVER: "ARCGISMAPSERVER",
  OSM: "OSM",
  BING: "Bing",
  LOCAL: "Local",
  TMS: "TMS",
  WMS: "WMS",
  WMTS: "WMTS",
  G3WSUITE: "G3WSUITE"
  /** 
   * ADD ALSO TO PROVIDER FACTORY (@TODO or already done?) 
   */
};

/**
 * Source Types
 */
Layer.SourceTypes = {
  VIRTUAL:'virtual',
  POSTGIS: 'postgres',
  SPATIALITE: 'spatialite',
  ORACLE: 'oracle',
  MSSQL: 'mssql',
  CSV: 'delimitedtext',
  OGR: 'ogr',
  GDAL: 'gdal',
  WMS: 'wms',
  WMST: "wmst",
  WFS: 'wfs',
  WCS: "wcs",
  MDAL: "mdal",
  "VECTOR-TILE": "vector-tile",
  VECTORTILE: "vectortile",
  ARCGISMAPSERVER: 'arcgismapserver',
  GEOJSON: "geojson"
  /**
   * ADD TO PROVIDER FACTORY (@TODO or already done?)
   */
};

/**
 * Layer Capabilities
 */
Layer.CAPABILITIES = {
  QUERYABLE: 1,
  FILTERABLE: 2,
  EDITABLE: 4
};

/**
 * Editing types 
 */
Layer.EDITOPS = {
  INSERT: 1,
  UPDATE: 2,
  DELETE: 4
};

/**
 * Selection state 
 */
Layer.SELECTION_STATE = {
  ALL: '__ALL__',
  EXCLUDE: '__EXCLUDE__'
};

module.exports = Layer;
