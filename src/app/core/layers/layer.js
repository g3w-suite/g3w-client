import ApplicationState     from 'store/application-state';
import { DOWNLOAD_FORMATS } from 'app/constant';
import DataRouterService    from 'services/data';
import ProjectsRegistry     from 'store/projects';
import ApplicationService   from 'services/application';
import GUI                  from 'services/gui';
import { prompt }           from 'utils/prompt';

const { t } = require('core/i18n/i18n.service');
const {
  inherit,
  base,
  XHR,
} = require('utils');
const G3WObject = require('core/g3wobject');
const { geometryFields, parseAttributes } =  require('utils/geo');
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

  //get current project object
  const {
    project = ProjectsRegistry.getCurrentProject()
  } = options;

  //get search_end point value (api, ows)
  this.config.search_endpoint = project.getSearchEndPoint();

  // create relations
  this._relations = this._createRelations(project.getRelations());

  // set URLs to get varios type of data
  if (!this.isBaseLayer()) {
    //suffix url
    const suffixUrl = `${project.getType()}/${project.getId()}/${config.id}/`;
    //get vector url
    const vectorUrl = project.getVectorUrl();
    //get raster url
    const rasterUrl = project.getRasterUrl();

    this.config.urls.filtertoken = `${vectorUrl}filtertoken/${suffixUrl}`;
    this.config.urls.data        = `${vectorUrl}data/${suffixUrl}`;
    this.config.urls.shp         = `${vectorUrl}shp/${suffixUrl}`;
    this.config.urls.csv         = `${vectorUrl}csv/${suffixUrl}`;
    this.config.urls.xls         = `${vectorUrl}xls/${suffixUrl}`;
    this.config.urls.gpx         = `${vectorUrl}gpx/${suffixUrl}`;
    this.config.urls.gpkg        = `${vectorUrl}gpkg/${suffixUrl}`;
    this.config.urls.geotiff     = `${rasterUrl}geotiff/${suffixUrl}`;
    this.config.urls.editing     = `${vectorUrl}editing/${suffixUrl}`;
    this.config.urls.commit      = `${vectorUrl}commit/${suffixUrl}`;
    this.config.urls.config      = `${vectorUrl}config/${suffixUrl}`;
    this.config.urls.unlock      = `${vectorUrl}unlock/${suffixUrl}`;
    this.config.urls.widget      = {
      unique: `${vectorUrl}widget/unique/data/${suffixUrl}`
    };

    /**
     * Store feature count url to get features count of a layer
     * 
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
       * @since 3.9.0 whether filter is set from a previously saved filter
       */
      current: null,
    },

    /**
     * @type { Array<{{ id: string, name: string }}> } array of saved filters
     * 
     * @since 3.9.0
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
     * @type { boolean | Object<number, number> }
     * 
     * @since 3.8.0
     */
    stylesfeaturecount: config.featurecount && defaultstyle && {
      [defaultstyle]: config.featurecount
    }

  };

  /**
   * Store all selection features `fids`
   */
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
    //set providers that will take in account to get data from server
    this.providers = {
      query:       ProviderFactory.build('query',       serverType, sourceType, { layer: this }),
      filter:      ProviderFactory.build('filter',      serverType, sourceType, { layer: this }),
      filtertoken: ProviderFactory.build('filtertoken', serverType, sourceType, { layer: this }),
      search:      ProviderFactory.build('search',      serverType, sourceType, { layer: this }),
      data:        ProviderFactory.build('data',        serverType, sourceType, { layer: this })
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
 * Proxy params data
 */
proto.getProxyData = function(type) {
  return type ? this.proxyData[type] : this.proxyData;
};

/**
 * Set proxy data
 * 
 * @param type
 * @param data
 */
proto.setProxyData= function(type, data = {}) {
  this.proxyData[type] = data;
};

/**
 * Clear proxy data
 * 
 * @param type
 */
proto.clearProxyData = function(type) {
  this.proxyData[type] = null;
};

/**
 * Get a proxy request
 * 
 * @param type
 * @param proxyParams
 * 
 * @returns {Promise<*>}
 */
proto.getDataProxyFromServer = async function(type = 'wms', proxyParams = {}) {
  try {
    const { response, data } = await DataRouterService.getData(`proxy:${type}`, {
      inputs: proxyParams,
      outputs: false,
    });
    this.setProxyData(type, JSON.parse(data));
    return response;
  } catch(err) {
    console.warn(err);
  }
};

/**
 * @TODO Add description
 * 
 * @param type
 * @param changes
 * 
 * @returns {Promise<*>}
 */
proto.changeProxyDataAndReloadFromServer = function(type = 'wms', changes = {}) {
  Object.keys(changes).forEach(changeParam => {
    Object.keys(changes[changeParam]).forEach(param => {
      this.proxyData[type][changeParam][param] = changes[changeParam][param];
    })
  });
  return this.getDataProxyFromServer(type, this.proxyData[type]);
};

/**
 * [EDITING PLUGIN] Check if layer is in editing
 * 
 * @returns { boolean }
 */
proto.isInEditing = function() {
  return this.state.inediting;
};

/**
 * [EDITING PLUGIN] Set editing state
 * 
 * @param {boolean} bool
 */
proto.setInEditing = function(bool=false) {
  this.state.inediting = bool;
};

/**
 * @TODO Add description here
 * 
 * @returns {*}
 */
proto.getSearchParams = function() {
  return this.config.searchParams;
};

/**
 * Return search_endpoint
 * 
 * @returns {*}
 */
proto.getSearchEndPoint = function() {
  return this.getType() !== Layer.LayerTypes.TABLE ? this.config.search_endpoint : 'api';
};

/**
 * [LAYER RELATIONS]
 * 
 * Create Relation
 * 
 * @param projectRelations
 * 
 * @returns {Relations}
 * 
 * @private
 */
proto._createRelations = function(projectRelations) {
  const layerId = this.getId();
  return new Relations({
    relations: projectRelations.filter(relation => -1 !== [relation.referencedLayer, relation.referencingLayer].indexOf(layerId))
  });
};

/**
 * [LAYER RELATIONS]
 * 
 * Get Relations
 * 
 * @returns {*}
 */
proto.getRelations = function() {
  return this._relations
};

/**
 * [LAYER RELATIONS]
 * 
 * Get Relation by id
 * 
 * @param id
 * 
 * @returns {*}
 */
proto.getRelationById = function(id) {
  return this._relations.getArray().find(relation => relation.getId() === id);
};

/**
 * [LAYER RELATIONS]
 * 
 * Get Relation fields
 * 
 * @param relationName
 * 
 * @returns { * | Array }
 */
proto.getRelationAttributes = function(relationName) {
  const relation = this._relations.find(relation => relation.name === relationName);
  return relation ? relation.fields : [];
};

/**
 * [LAYER RELATIONS]
 * 
 * @TODO Add description
 * 
 * @returns { Object }
 */
proto.getRelationsAttributes = function() {
  const fields = {};
  this.state.relations.forEach(relation => fields[relation.name] = relation.fields);
  return fields;
};

/**
 * [LAYER RELATIONS]
 * 
 * Check if layer is a Child of a relation
 * 
 * @returns { * | boolean }
 */
proto.isChild = function() {
  return this.getRelations() ? this._relations.isChild(this.getId()) : false;
};

/**
 * [LAYER RELATIONS]
 * 
 * Check if layer is a Father of a relation
 * 
 * @returns { * | boolean }
 */
proto.isFather = function() {
  return this.getRelations() ? this._relations.isFather(this.getId()) : false;
};

/**
 * [LAYER RELATIONS]
 * 
 * Get children relations
 * 
 * @returns { * |Array }
 */
proto.getChildren = function() {
  return this.isFather() ? this._relations.getChildren(this.getId()) : [];
};

/**
 * [LAYER RELATIONS]
 * 
 * Get parents relations
 * 
 * @returns { * | Array }
 */
proto.getFathers = function() {
  return this.isChild() ? this._relations.getFathers(this.getId()) : [];
};

/**
 * [LAYER RELATIONS]
 * 
 * Check if it has children
 * 
 * @returns { * | boolean }
 */
proto.hasChildren = function() {
  return this.hasRelations() ? this._relations.hasChildren(this.getId()) : false;
};

/**
 * [LAYER RELATIONS]
 * 
 * Check if it has fathers
 * 
 * @returns { * | boolean }
 */
proto.hasFathers = function() {
  return this.hasRelations() ? this._relations.hasFathers(this.getId()) : false;
};

/**
 * [LAYER RELATIONS]
 */
proto.hasRelations = function() {
  return !!this._relations;
};

/**
 * @TODO Add description
 * 
 * @param pageLength
 */
proto.setAttributeTablePageLength = function(pageLength) {
  this.state.attributetable.pageLength = pageLength
};

/**
 * @TODO add description
 * 
 * @returns {null}
 */
proto.getAttributeTablePageLength = function() {
  return this.state.attributetable.pageLength;
};

// end global state

/**
 * [LAYER SELECTION]
 * 
 * Check if is selected
 * 
 * @returns {boolean}
 */
proto.isSelected = function() {
  return this.state.selected;
};

/**
 * [LAYER SELECTION]
 * 
 * Set Selected
 * 
 * @param {boolean} bool
 */
proto.setSelected = function(bool) {
  this.state.selected = bool;
};

/**
 * [LAYER SELECTION]
 * 
 * Set Selection
 * 
 * @param bool
 * 
 * @returns {Promise<void>}
 */
proto.setSelection = async function(bool=false) {
  this.state.selection.active = bool;
  if (!bool) {
    //in case of not current selected filter is set active
    if (this.state.filter.active) {
      if (null === this.state.filter.current) {
        await this.deleteFilterToken();
      } else {
        await this._applyFilterToken(this.state.filter.current.fid)
      }
    }
    this.emit('unselectionall', this.getId());
  }
};

/**
 * [LAYER SELECTION]
 * 
 * @returns {boolean} whether selection si active
 */
proto.isSelectionActive = function() {
  return this.state.selection.active;
};

/**
 * [LAYER SELECTION]
 * 
 * Get selection
 * 
 * @returns {{ active: boolean }}
 */
proto.getSelection = function() {
  return this.state.selection;
};

/**
 * [LAYER SELECTION]
 * 
 * @returns filter
 */
proto.getFilter = function() {
  return this.state.filter;
};

/**
 * [LAYER SELECTION]
 * 
 * Set filter Ative to layer
 * 
 * @param {boolean} bool
 */
proto.setFilter = function(bool = false) {
  this.state.filter.active = bool;
};

/**
 * [LAYER SELECTION]
 * 
 * get current filter
 */
proto.getCurrentFilter = function() {
  return this.state.filter.current;
};

/**
 * [LAYER SELECTION]
 * 
 * @TODO Add description
 * 
 * @returns {boolean}
 */
proto.getFilterActive = function() {
  return this.state.filter.active;
};

/**
 * [LAYER SELECTION]
 * 
 * @returns { Array } saved filters
 */
proto.getFilters = function() {
  return this.state.filters;
}

/**
 * [LAYER SELECTION]
 * 
 * Add new filter
 * 
 * @param filter Object filter
 */
proto.addFilter = function(filter = {}) {
  this.state.filters.push(filter);
}

/**
 * [LAYER SELECTION]
 * 
 * Remove saved filter from filters Array
 * 
 * @param fid unique filter id
 */
proto.removefilter = function(fid) {
  this.state.filters = this.state.filters.filter(f => fid === f.fid);
}

/**
 * [LAYER SELECTION]
 * 
 * Set Current filter
 * 
 * @param {{ fid, name }} filter 
 */
proto.setCurrentFilter = function(filter) {
  this.state.filter.current = filter;
}

/**
 * [LAYER SELECTION]
 * 
 * Apply layer filter by fid
 * 
 * @param filter
 */
proto.applyFilter = async function(filter) {
  if (!this.providers['filtertoken']) {
    return;
  }
  //need to check if current filter is set and is different from current
  if (null === this.state.filter.current || filter.fid !== this.state.filter.current.fid ) {
    await this.clearSelectionFids();
    GUI.closeContent();
  }

  await this._applyFilterToken(filter)
}

/**
 * [LAYER SELECTION]
 * 
 * @returns {Promise<void>}
 * 
 * @private
 */
proto._applyFilterToken = async function(filter) {
  const {filtertoken} = await this.providers['filtertoken'].applyFilterToken(filter.fid);
  if (filtertoken) {
    this.setFilter(false);
    this.setCurrentFilter(filter);
    this.setFilterToken(filtertoken);
  }
}

/**
 * [LAYER SELECTION]
 * 
 * @since 3.9.0
 */
proto.saveFilter = function() {

  // skip when ..
  if (!this.providers['filtertoken'] || !this.selectionFids.size > 0) {
    return;
  }

  const layer = this;

  prompt({
    label: t('layer_selection_filter.tools.savefilter'),
    value: layer.getCurrentFilter() ? layer.getCurrentFilter().name : '' ,
    callback: async(name) => {
      const data = await layer.providers['filtertoken'].saveFilterToken(name);

      // skip when no data return from provider
      if (!data) {
        return;
      }
    
      let filter = layer.state.filters.find(f => f.fid === data.fid);
    
      // add saved filter to filters array
      if (undefined === filter) {
        filter = {
          fid: data.fid, //get fid
          name: data.name //get name
        }
        layer.state.filters.push(filter);
      }

      layer.setCurrentFilter(filter);      // set current filter
      layer.setFilter(false);              // set to false
      layer.getSelection().active = false; // reset selection to false
      layer.selectionFids.clear();         // clear current fids
    
      //in case of geolayer
      if (layer.isGeoLayer()) {
        //remove selection feature from map
        layer.setOlSelectionFeatures();
      }
    
      //emit unselectionall
      layer.emit('unselectionall', layer.getId());
    
    },
  });

};

/**
 * [LAYER SELECTION]
 * 
 * Method to set unset filter token on layer
 */
proto.toggleFilterToken = async function() {

  //toggle boolean value of filter active
  this.setFilter(!this.state.filter.active);

  //check id a current save filter is set
  if (this.state.filter.current) {
    if (this.state.filter.active) {
      //need to create a new filter base on selected features
      await this.activeFilterToken(true);
    } else {
      //apply current filter saved
      await this.applyFilter(this.state.filter.current);
    }
  } else {
    //no current filter is set need to create or delete token on layer
    //based on this.state.filter.active bool value
    await this.activeFilterToken(this.state.filter.active);
  }

  /**
   * hide/show selection feature (red one) on map
   */
  if (this.state.selection.active && this.isGeoLayer()) {
    //if filter is active
    if (this.state.filter.active) {
      // hide all section feature from map
      this.hideOlSelectionFeatures();
    } else {
      //only current map selected feature
      this.showAllOlSelectionFeatures();
    }
  }
  return this.state.filter.active;
};

/**
 * [LAYER SELECTION]
 * 
 * Base on boolean value create a filter token from server
 * based on selection or delete current filtertoken
 * 
 * @param bool
 * 
 * @returns {Promise<void>}
 */
proto.activeFilterToken = async function(bool) {
  await this[bool ? 'createFilterToken' : 'deleteFilterToken']();
};

/**
 * [LAYER SELECTION]
 * 
 * Delete filtertoken from server
 * 
 * @param fid  unique id of filter saved to delete
 */
proto.deleteFilterToken = async function(fid) {
  try {
    // skip when no filtertoken provider is set
    if (!this.providers['filtertoken']) {
      return;
    }
    //call deleteFilterToken rpovider method to delete filtertoken related to layer.
    // Return filter token if another layer is filtered otherwise filtertoken is undefined
    const filtertoken = await this.providers['filtertoken'].deleteFilterToken(fid);

    /**
     * @since v3.9.0
     * In case of delete a saved filter and current filter apply to layer is
     * filter deleted
     */
    if (undefined !== fid) {
      //remove filter from filters list
      this.state.filters = this.state.filters.filter(f => fid !== f.fid);
    }

    //in any case set current filter set to null
    this.setCurrentFilter(null);
    //set active filter to false
    this.setFilter(false);

    //set filtertoken to application
    this.setFilterToken(filtertoken);

  } catch(err) {
    console.log('Error deleteing filtertoken')
  }
};

/**
 * [LAYER SELECTION]
 * 
 * Common method to set filter token
 * 
 * @param filtertoken
 *
 * @fires filtertokenchange when filtertoken is changed
 * 
 * @since 3.9.0
 */
proto.setFilterToken = function(filtertoken = null) {
  //set applicaton filter token
  ApplicationService.setFilterToken(filtertoken);
  this.emit('filtertokenchange', { layerId: this.getId() });
}

/**
 * [LAYER SELECTION]
 *  
 * Create filter token
 * 
 * @fires filtertokenchange
 */
proto.createFilterToken = async function() {
  try {

    const provider  = this.providers['filtertoken'];
    const selection = this.selectionFids;

    // skip when no filter token provider is set or selectionFids is empty
    if (!provider || !selection.size > 0) {
      return;
    }

    // select all features
    if (selection.has(Layer.SELECTION_STATE.ALL)) {
      await provider.deleteFilterToken();
      this.setFilterToken(null);
      return;
    }

    const fids = Array.from(selection);

    // exclude some features from selection
    if (selection.has(Layer.SELECTION_STATE.EXCLUDE)) {
      this.setFilterToken( await provider.getFilterToken({ fidsout: fids.filter(id => id !== Layer.SELECTION_STATE.EXCLUDE).join(',') }) );
      return;
    }

    // include some features in selection
    this.setFilterToken( await provider.getFilterToken({ fidsin: fids.join(',') }) );

  } catch(err) {
    console.log('Error create update token', err);
  }
};

/**
 * [LAYER SELECTION]
 * 
 * Get Application filter token
 * 
 * @returns {*}
 */
proto.getFilterToken = function () {
  return ApplicationService.getFilterToken();
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

/**
 * [LAYER SELECTION]
 * 
 * @returns {Set<any>} stored selection `fids` 
 */
proto.getSelectionFids = function() {
  return this.selectionFids;
};

/**
 * [LAYER SELECTION]
 * 
 * Invert current selection fids
 */
proto.invertSelectionFids = function() {

  if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE))  { this.selectionFids.delete(Layer.SELECTION_STATE.EXCLUDE); }
  else if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) { this.selectionFids.delete(Layer.SELECTION_STATE.ALL); }
  else if (this.selectionFids.size > 0)                       { this.selectionFids.add(Layer.SELECTION_STATE.EXCLUDE); }

  if (this.isGeoLayer()) {
    this.setInversionOlSelectionFeatures();
  }

  if (this.state.filter.active) {
    this.createFilterToken();
  }

  this.setSelection(this.selectionFids.size > 0);
};


/**
 * [LAYER SELECTION]
 * 
 * Check if feature id is present
 * 
 * @param fid feature id
 * 
 * @returns {boolean}
 */
proto.hasSelectionFid = function(fid) {
  if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) {
    return true;
  }
  if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) {
    return !this.selectionFids.has(fid);
  }
  return this.selectionFids.has(fid);
};


/**
 * [LAYER SELECTION]
 * 
 * Include fid feature id to selection
 * 
 * @param fid
 * @param createToken
 * 
 * @returns {Promise<void>}
 */
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

/**
 * [LAYER SELECTION]
 * 
 * Exclude fid to selection
 * 
 * @param fid
 * @param createToken
 * 
 * @returns {Promise<void>}
 */
proto.excludeSelectionFid = async function(fid, createToken=true) {

  if (this.selectionFids.has(Layer.SELECTION_STATE.ALL) || this.selectionFids.size === 0) {
    this.selectionFids.clear();
    this.selectionFids.add(Layer.SELECTION_STATE.EXCLUDE);
  }

  this.selectionFids[this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE) ? 'add' : 'delete'](fid);

  if (1 === this.selectionFids.size && this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) {
    this.setselectionFidsAll();
  }

  const isLastFeatureSelected  = this.isGeoLayer() && this.setOlSelectionFeatureByFid(fid, 'remove');

  if (createToken && this.state.filter.active) {
    await this.createFilterToken();
  }

  if (0 === this.selectionFids.size || isLastFeatureSelected) {
    this.selectionFids.clear();
    this.setSelection(false);
  }

};

/**
 * [LAYER SELECTION]
 * 
 * Called just one time when `createFilterToken` set include / exclude selection `fids` at the same time
 * 
 * @since 3.9.0
 */
proto.includeExcludeSelectionFids = async function({
  includeSelectionFids = [],
  excludeSelectionFids = [],
} = {}) {
  //pass false because eventually token filter creation need to be called after
  includeSelectionFids.forEach(fid => this.includeSelectionFid(fid, false));
  excludeSelectionFids.forEach(fid => this.excludeSelectionFid(fid, false));
  if (this.state.filter.active) {
    await this.createFilterToken();
  }
}

/**
 * [LAYER SELECTION]
 * 
 * @param fids Array of fids
 * 
 * @returns {Promise<void>}
 */
proto.includeSelectionFids = async function(fids = []) {
  //pass false because eventually token filter creation need to be called after
  fids.forEach(fid => this.includeSelectionFid(fid, false));
  if (this.state.filter.active) {
    await this.createFilterToken();
  }
};

/**
 * [LAYER SELECTION]
 * 
 * Exclude fids from selection
 * 
 * @param fids
 */
proto.excludeSelectionFids = async function(fids = []) {
  //pass false because eventually token filter creation need to be called after
  fids.forEach(fid => this.excludeSelectionFid(fid, false));
  if (this.state.filter.active) {
    await this.createFilterToken();
  }
};

/**
 * [LAYER SELECTION]
 * 
 * Clear selection
 */
proto.clearSelectionFids = async function() {
  //cLear set selection fids
  this.selectionFids.clear();
  //if ia a layer with geometry
  if (this.isGeoLayer()) {
    //remove feature selected on map
    this.setOlSelectionFeatures();
  }
  //set selection false
  await this.setSelection(false);
};

/**
 * Return wms layer name for wms request
 * @returns {*}
 */
proto.getWMSLayerName = function() {
  return this.isWmsUseLayerIds() ? this.getId() : this.getName()
};

/**
 * Check if request need to use layer id or layer.name
 * @returns {boolean|*}
 */
proto.isWmsUseLayerIds = function() {
  return this.config.wms_use_layer_ids;
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

/**
 * Get Getotiff layer format
 * @param data
 * @returns {Promise | Promise<unknown>}
 */
proto.getGeoTIFF = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('geotiff'),
    data,
    httpMethod: "POST"
  })
};

/**
 * Get Xls layer format
 * @param data
 * @returns {Promise | Promise<unknown>}
 */
proto.getXls = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('xls'),
    data,
    httpMethod: "POST"
  })
};

/**
 * Get shapefile layer format
 * @param data
 * @returns {Promise | Promise<unknown>}
 */
proto.getShp = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('shp'),
    data,
    httpMethod: "POST"
  })
};

/**
 * Get gpx layer format
 * @param data
 * @returns {Promise | Promise<unknown>}
 */
proto.getGpx = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('gpx'),
    data,
    httpMethod: "POST"
  })
};

/**
 * get gpkg layer format
 * @param data
 * @returns {Promise | Promise<unknown>}
 */
proto.getGpkg = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('gpkg'),
    data,
    httpMethod: "POST"
  })
};

/**
 * Get csv layer format
 * @param data
 * @returns {Promise | Promise<unknown>}
 */
proto.getCsv = function({data={}}={}) {
  data.filtertoken = this.getFilterToken();
  return XHR.fileDownload({
    url: this.getUrl('csv'),
    data,
    httpMethod: "POST"
  })
};

/**
 * Get source type of layer
 * @returns {*|null}
 */
proto.getSourceType = function() {
  return this.config.source ? this.config.source.type : null;
};

/**
 * Check if it is a layer with geometry
 * @returns {boolean}
 */
proto.isGeoLayer = function() {
  return this.state.geolayer;
};

/**
 * @TODO Add description
 * @param page
 * @param page_size
 * @param ordering
 * @param search
 * @param field
 * @param suggest
 * @param formatter
 * @param in_bbox
 * @param custom_params
 * @returns {*}
 */
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
  try {
    const response = await XHR.get({
      url,
      params: {
        fids:fids.toString(),
        formatter
      }
    });
    if (response && response.result && response.vector && response.vector.data) {
      return response.vector.data.features;
    }
  } catch(err) {}
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

/**
 * Return layer fields
 * @returns {*|{}}
 */
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

/**
 * Return editing fields
 * @returns {[]}
 */
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

/**
 * Return table fields exclude geometry field
 * @returns {T[]}
 */
proto.getTableHeaders = function() {
  return this.getTableFields().filter(field => -1 === geometryFields.indexOf(field.name));
};

/**
 * Get current project
 * @returns {*}
 */
proto.getProject = function() {
  return this.config.project;
};

/**
 * Get layer config
 * @returns {{}}
 */
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

/**
 * @TODO Add description
 * @returns {*|*[]}
 */
proto.getFieldsOutOfFormStructure = function() {
  return this.config.editor_form_structure ? this.config.editor_form_structure.filter(structure => structure.field_name) : []
};

/**
 * Check if it has form structure
 * @returns {boolean}
 */
proto.hasFormStructure = function() {
  return !!this.config.editor_form_structure;
};

/**
 * Get custom style (for future implementation) 
 */
proto.getCustomStyle = function() {
  return this.config.customstyle;
};

/**
 * Get state layer
 * @returns {*|{metadata, downloadable: *, attributetable: {pageLength: null}, defaultstyle: *, source, title: *, infoformats: ((function(): *)|*|*[]), tochighlightable: boolean, featurecount: number, stylesfeaturecount: (number|string|*|{[p: number]: *}), projectLayer: boolean, infoformat: (string|default.watch.infoformat|*), geolayer: boolean, inediting: boolean, disabled: boolean, id: (*|string), selected: boolean, openattributetable: (boolean|boolean), metadata_querable: (boolean|boolean), visible: boolean, filters: *[], filter: {current: null, active: boolean}, selection: {active: boolean}, removable: (boolean|*), styles}}
 */
proto.getState = function() {
  return this.state;
};

/**
 * Get layer source (ex. ogr, spatialite, etc..)
 * @returns {*}
 */
proto.getSource = function() {
  return this.state.source;
};

/**
 * Check if it has a format to download
 * @returns {*}
 */
proto.isDownloadable = function() {
  return (
    this.isShpDownlodable()  ||
    this.isXlsDownlodable()  ||
    this.isGpxDownlodable()  ||
    this.isGpkgDownlodable() ||
    this.isCsvDownlodable()
  );
};

/**
 * Get downlaod formats
 * @returns {string[]}
 */
proto.getDownloadableFormats = function() {
  return Object
    .keys(DOWNLOAD_FORMATS)
    .filter(download_format => this.config[download_format])
    .map(format => DOWNLOAD_FORMATS[format].format);
};

/**
 *
 * @param download url
 * @returns {string}
 */
proto.getDownloadUrl = function(format) {
  const find = Object
    .values(DOWNLOAD_FORMATS)
    .find(download_format => download_format.format === format);
  return find && find.url;
};

/**
 *
 * @returns {false|*|boolean}
 */
proto.isGeoTIFFDownlodable = function() {
  return !this.isBaseLayer() && this.config.download && 'gdal' === this.config.source.type ;
};

/**
 *
 * @returns {false|*|boolean}
 */
proto.isShpDownlodable = function() {
  return !this.isBaseLayer() && this.config.download && 'gdal' !== this.config.source.type;
};
/**
 *
 * @returns {false|string|*}
 */
proto.isXlsDownlodable = function() {
  return !this.isBaseLayer() && this.config.download_xls;
};
/**
 *
 * @returns {false|string|*}
 */
proto.isGpxDownlodable = function() {
  return !this.isBaseLayer() && this.config.download_gpx;
};

/**
 *
 * @returns {false|string|*}
 */
proto.isGpkgDownlodable = function() {
  return !this.isBaseLayer() && this.config.download_gpkg;
};

/**
 *
 * @returns {false|string|*}
 */
proto.isCsvDownlodable = function() {
  return !this.isBaseLayer() && this.config.download_csv;
};

/**
 * return editing version of layer
 * @returns {*}
 */
proto.getEditingLayer = function() {
  return this._editingLayer;
};

/**
 * Set editing layer
 * @param editingLayer
 */
proto.setEditingLayer = function(editingLayer) {
  this._editingLayer = editingLayer;
};

/**
 * Check if is hidden
 * @returns {string|string[]|boolean|string|*}
 */
proto.isHidden = function() {
  return this.state.hidden;
};

/**
 * Set hidden
 * @param bool
 */
proto.setHidden = function(bool=true) {
  this.state.hidden = bool;
};

/**
 * Check if it was modified (by editing9
 * @returns {boolean}
 */
proto.isModified = function() {
  return this.state.modified;
};

/**
 * Get id
 * @returns {*|string}
 */
proto.getId = function() {
  return this.config.id;
};

/**
 * Get Metadata
 * @returns {*}
 */
proto.getMetadata = function() {
  return this.state.metadata
};

/**
 * Get Title
 * @returns {*}
 */
proto.getTitle = function() {
  return this.config.title;
};

/**
 * Get Name
 * @returns {*}
 */
proto.getName = function() {
  return this.config.name;
};

/**
 * Get origin name
 * @returns {*}
 */
proto.getOrigName = function() {
  return this.config.origname;
};

/**
 * Get Server type
 * @returns {*|string|{wmst: {filter: Providers.WFSDataProvider, search: null, data: null, query: Providers.WMSDataProvider}, virtual: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, oracle: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, delimitedtext: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, wfs: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider}, wcs: {filter: Providers.WFSDataProvider, search: null, data: null, query: Providers.WMSDataProvider}, arcgismapserver: {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, mdal: {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, vectortile: {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, "vector-tile": {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, gdal: {filter: null, search: null, data: null, query: Providers.WMSDataProvider}, ogr: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, wms: {filter: Providers.WFSDataProvider, search: null, data: null, query: Providers.WMSDataProvider}, postgres: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, mssql: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}, spatialite: {filter: Providers.WFSDataProvider, search: Providers.QGISProvider, data: Providers.QGISProvider, query: Providers.WMSDataProvider, filtertoken: Providers.QGISProvider}}}
 */
proto.getServerType = function() {
  return (this.config.servertype && this.config.servertype !== '') ?
    this.config.servertype :
    ServerTypes.QGIS;
};

/**
 * Get type
 * @returns {*}
 */
proto.getType = function() {
  return this.type;
};

/**
 * Set Type
 * @param type
 */
proto.setType = function(type) {
  this.type = type;
};

/**
 * Check if layer is a type passed
 * @param type
 * @returns {boolean}
 */
proto.isType = function(type) {
  return this.getType() === type;
};

/**
 * Set disabled
 * @param bool
 */
proto.setDisabled = function(bool) {
  this.state.disabled = bool;
};

/**
 * Check if it is disabled
 * @returns {boolean}
 */
proto.isDisabled = function() {
  return this.state.disabled;
};

/**
 * Check if is visible
 * @returns {boolean}
 */
proto.isVisible = function() {
  return this.state.visible;
};

/**
 * Set visibility
 * @param bool
 */
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

/**
 * @TODO Add description
 * @returns {string|string|*}
 */
proto.getOws = function() {
  return this.config.ows;
};

/**
 * @TODO Description
 * @returns {boolean}
 */
proto.getTocHighlightable = function() {
  return this.state.tochighlightable;
};

/**
 * @TODO Description
 * @param bool
 */
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
 * Check if layer is set up as time series
 */
proto.isQtimeseries = function() {
  return this.config.qtimeseries;
};

/**
 * Check if is editbale
 * @returns {boolean}
 */
proto.isEditable = function() {
  return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.EDITABLE));
};

/**
 * Is a base layer
 * @returns {*|boolean}
 */
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

/**
 * Set editing url
 */
proto.setEditingUrl = function(url) {
  this.config.urls.editing = url || this.config.urls.editing;
};

/**
 * Get query url
 * @returns {*}
 */
proto.getQueryUrl = function() {
  return this.config.urls.query;
};

/**
 * Set query url
 * @param queryUrl
 */
proto.setQueryUrl = function(queryUrl) {
  this.config.urls.query = queryUrl;
};

/**
 *
 * @returns {*}
 */
proto.getQueryLayerName = function() {
  return (this.config.infolayer && this.config.infolayer !== '') ? this.config.infolayer : this.getName();
};

/**
 * @TODO Description
 * @returns {*}
 */
proto.getQueryLayerOrigName = function() {
  return this.state.infolayer && this.config.infolayer !== '' ? this.config.infolayer :  this.config.origname;
};

/**
 * @TODO Description
 * @param ogcService
 * @returns {default.watch.infoformat|*|string}
 */
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

/**
 * @TODO Description
 * @returns {(function(): *)|*|*[]}
 */
proto.getInfoFormats = function() {
  return this.state.infoformats;
};

/**
 * @TODO Description
 * @returns {*}
 */
proto.getInfoUrl = function() {
  return this.config.infourl;
};

/**
 * @TODO Description
 * @param infoFormat
 */
proto.setInfoFormat = function(infoFormat) {
  this.config.infoformat = infoFormat;
};

/**
 * @TODO Description
 * @returns {*|{}}
 */
proto.getAttributes = function() {
  return this.config.fields;
};

/**
 * @TODO Description
 * @param attribute
 * @param type
 * @param options
 */
proto.changeAttribute = function(attribute, type, options) {
  for (const field of this.config.fields) {
    if (field.name === attribute) {
      field.type = type;
      field.options = options;
      break;
    }
  }
};

/**
 * @TODO Description
 * @param name
 * @returns {*}
 */
proto.getAttributeLabel = function(name) {
  const field = this.getAttributes().find(field=> field.name === name);
  return field && field.label;
};

/**
 * Return provider by type
 * @param type
 * @returns {*}
 */
proto.getProvider = function(type) {
  return this.providers[type];
};

/**
 * Return all providers
 * @returns {*|{filter: null, search: null, data: null, query: null, filtertoken: null}}
 */
proto.getProviders = function() {
  return this.providers;
};

/**
 * @TODO Description
 * @returns {*}
 */
proto.getLayersStore = function() {
  return this._layersstore;
};

/**
 * @TODO Description
 * @param layerstore
 */
proto.setLayersStore = function(layerstore) {
  this._layersstore = layerstore;
};

/**
 * Return if it is possible to show table of attribute
 * @returns {boolean}
 */
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

/**
 * @TODO Description
 * @param name
 * @param type
 * @param options
 * @param reset
 * @returns {*}
 */
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

/**
 * @TODO Description
 * @param name
 * @param type
 * @param options
 * @param reset
 * @returns {*}
 */
proto.changeConfigFieldType = function({name, type, options={},reset=false}) {
  return this.changeFieldType({name, type, options, reset});
};

/**
 * @TODO Description
 * @param name
 */
proto.resetConfigField = function({name}) {
  this.changeConfigFieldType({ name, reset: true });
};

/**
 * Function called in case of change project to remove all stored information 
 */
proto.clear = function() {};

/**
 * Check if is a vector layer
 * @returns {boolean}
 */
proto.isVector = function() {
  return this.getType() === Layer.LayerTypes.VECTOR;
};

/**
 * Check if is a tabel layer
 * @returns {boolean}
 */
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
