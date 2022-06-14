import ApplicationState from 'core/applicationstate';
import ApplicationService  from 'core/applicationservice';
import DataRouterService  from 'core/data/routerservice';
import {DOWNLOAD_FORMATS} from '../../constant';
import {t}  from 'core/i18n/i18n.service';
import utils from 'core/utils/utils';
import G3WObject from 'core/g3wobject';
import geoutils from 'core/utils/geo';
import Relations  from 'core/relations/relations';
import ProviderFactory  from 'core/layers/providers/providersfactory';

// Base Class of all Layer
class Layer extends G3WObject {
  constructor(config={}, options={}) {
    const {project, setters} = options;
    super({
      setters
    });
    this.config = config;
    // assign some attribute
    config.id = config.id || 'Layer';
    config.title = config.title || config.name;
    config.download = !!config.download;
    config.geolayer = false;
    config.baselayer = !!config.baselayer;
    config.fields = config.fields || {};
    config.urls = {
      query: config.infourl && config.infourl !== '' ? config.infourl : config.wmsUrl,
      ...(config.urls || {})
    };
    this.config.search_endpoint = project.getSearchEndPoint();
    const projectRelations = project.getRelations();
    // create relations
    this._relations = this._createRelations(projectRelations);
    if (!this.isBaseLayer()) {
      //filtertoken
      //set url to get varios type of data
      const projectType = project.getType();
      const projectId = project.getId();
      const suffixUrl = `${projectType}/${projectId}/${config.id}/`;
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
      //set custom parameters based on project qgis version
      this.config.searchParams = {
        I: 0,
        J: 0
      };
    }

    // dynamic layer values useful for layerstree
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
      inediting: false, // state of if is in editing (setted by editing plugin )
      infoformat: this.getInfoFormat(),
      infoformats: this.config.infoformats || [],
      projectLayer: true,
      geolayer: false,
      selection: {
        active: false
      },
      filter: {
        active: false
      },
      attributetable: {
        pageLength: null
      },
      visible: config.visible || false,
      tochighlightable: false
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
    // server type
    const serverType = this.config.servertype;
    // source layer
    const sourceType = this.config.source ? this.config.source.type : null;

    if (serverType && sourceType) {
      this.providers = {
        query: ProviderFactory.build('query', serverType, sourceType, {
          layer: this
        }),
        filter: ProviderFactory.build('filter', serverType, sourceType, {
          layer: this
        }),
        filtertoken: ProviderFactory.build('filtertoken', serverType, sourceType, {
          layer: this
        }),
        search: ProviderFactory.build('search', serverType, sourceType, {
          layer: this
        }),
        data: ProviderFactory.build('data', serverType, sourceType, {
          layer: this
        })
      };
    }
    // used to store last proxy params (useful for repeat request info formats for wms external layer)
    this.proxyData = {
      wms: null // at the moment only wms data from server
    };

  }

  /**
   * Proxyparams
   */

  getProxyData(type) {
    return type ? this.proxyData[type] : this.proxyData;
  };

  setProxyData(type, data={}) {
    this.proxyData[type] = data;
  };

  clearProxyData(type) {
    this.proxyData[type] = null;
  };

  async getDataProxyFromServer(type= 'wms', proxyParams={}) {
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

  changeProxyDataAndReloadFromServer(type='wms', changes={}) {
    Object.keys(changes).forEach(changeParam =>{
      Object.keys(changes[changeParam]).forEach(param =>{
        const value = changes[changeParam][param];
        this.proxyData[type][changeParam][param] = value;
      })
    });
    return this.getDataProxyFromServer(type, this.proxyData[type]);
  };

  /**
   * editing method used by plugin
   */

  isInEditing() {
    return this.state.inediting;
  };

  setInEditing(bool=false) {
    this.state.inediting = bool;
  };

  /**
   * end proxy params
   */

  getSearchParams() {
    return this.config.searchParams;
  };

  /**
   *
   * @returns {*}
   */
  getSearchEndPoint() {
    return this.getType() !== Layer.LayerTypes.TABLE ? this.config.search_endpoint : "api";
  };

//relations
  _createRelations(projectRelations) {
    const layerId = this.getId();
    const relations = projectRelations.filter(relation => [relation.referencedLayer, relation.referencingLayer].indexOf(layerId) !== -1);
    return new Relations({
      relations
    });
  };

// return relations of layer
  getRelations() {
    return this._relations
  };

  getRelationById(id) {
    return this._relations.getArray().find(relation => relation.getId() === id);
  };

  getRelationAttributes(relationName) {
    const relation = this._relations.find(relation => relation.name === relationName);
    return relation ? relation.fields : [];
  };

  getRelationsAttributes() {
    const fields = {};
    this.state.relations.forEach(relation => fields[relation.name] = relation.fields);
    return fields;
  };

  isChild() {
    if (!this.getRelations()) return false;
    return this._relations.isChild(this.getId());
  };

  isFather() {
    if (!this.getRelations()) return false;
    return this._relations.isFather(this.getId());
  };

  getChildren() {
    if (!this.isFather()) return [];
    return this._relations.getChildren(this.getId());
  };

  getFathers() {
    if (!this.isChild()) return [];
    return this._relations.getFathers(this.getId());
  };

  hasChildren() {
    if (!this.hasRelations()) return false;
    return this._relations.hasChildren(this.getId());
  };

  hasFathers() {
    if (!this.hasRelations()) return false;
    return this._relations.hasFathers(this.getId());
  };

  hasRelations() {
    return !!this._relations;
  };
//end relations


// global state
  setAttributeTablePageLength(pageLength) {
    this.state.attributetable.pageLength = pageLength
  };

  getAttributeTablePageLength() {
    return this.state.attributetable.pageLength;
  };

// end global state

//filter token
  setFilter(bool=false) {
    this.state.filter.active = bool;
  };

  getFilterActive() {
    return this.state.filter.active;
  };

  async toggleFilterToken() {
    this.state.filter.active = !this.state.filter.active;
    await this.activeFilterToken(this.state.filter.active);
    return this.state.filter.active;
  };

  async activeFilterToken(bool) {
    await bool ? this.createFilterToken() : this.deleteFilterToken();
  };

  async deleteFilterToken() {
    if (this.providers['filtertoken']) {
      try {
        await this.providers['filtertoken'].deleteFilterToken();
        ApplicationService.setFilterToken(null);
        this.fire('filtertokenchange', {
          layerId: this.getId()
        });
      } catch(err) {
        console.log('Error deleteing filtertoken')
      }
    }
  };

  async createFilterToken() {
    if (this.providers['filtertoken']) {
      let filtertoken = null;
      try {
        if (this.selectionFids.size > 0) {
          // create filter token
          if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) {
            await this.providers['filtertoken'].deleteFilterToken();
          } else {
            const params = {};
            if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE))
              params.fidsout = Array.from(this.selectionFids).filter(id => id !== Layer.SELECTION_STATE.EXCLUDE).join(',');
            else params.fidsin = Array.from(this.selectionFids).join(',');
            filtertoken = await this.providers['filtertoken'].getFilterToken(params);
          }
          ApplicationService.setFilterToken(filtertoken);
          this.fire('filtertokenchange', {
            layerId: this.getId()
          });
        }
      } catch(err) {
        console.log('Error create update token');
      }
    }
  };
// end filter token
//selection Ids layer methods

  setSelectionFidsAll() {
    this.selectionFids.clear();
    this.selectionFids.add(Layer.SELECTION_STATE.ALL);
    this.isGeoLayer() && this.showAllOlSelectionFeatures();
    this.setSelection(true);
    this.state.filter.active && this.createFilterToken();
  };

  getSelectionFids() {
    return this.selectionFids;
  };

  invertSelectionFids() {
    if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) this.selectionFids.delete(Layer.SELECTION_STATE.EXCLUDE);
    else if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) this.selectionFids.delete(Layer.SELECTION_STATE.ALL);
    else if (this.selectionFids.size > 0) this.selectionFids.add(Layer.SELECTION_STATE.EXCLUDE);
    this.isGeoLayer() && this.setInversionOlSelectionFeatures();
    this.state.filter.active && this.createFilterToken();
    this.setSelection(this.selectionFids.size > 0);
  };

  hasSelectionFid(fid) {
    if (this.selectionFids.has(Layer.SELECTION_STATE.ALL)) return true;
    else if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) return !this.selectionFids.has(fid);
    else return this.selectionFids.has(fid) ;
  };

  includeSelectionFid = async function(fid, createToken=true) {
    if (this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE) && this.selectionFids.has(fid)) {
      this.selectionFids.delete(fid);
      this.selectionFids.size === 1 && this.setSelectionFidsAll();
    } else {
      this.selectionFids.add(fid);
      !this.isSelectionActive() && this.setSelection(true);
    }
    this.isGeoLayer() && this.setOlSelectionFeatureByFid(fid, 'add');
    createToken && this.state.filter.active && await this.createFilterToken();
  };

  includeSelectionFids(fids=[]) {
    fids.forEach(fid => this.includeSelectionFid(fid));
  };

  async excludeSelectionFid(fid) {
    if (this.selectionFids.has(Layer.SELECTION_STATE.ALL) || this.selectionFids.size === 0) {
      this.selectionFids.clear();
      this.selectionFids.add(Layer.SELECTION_STATE.EXCLUDE);
    }
    this.selectionFids[this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE) ? 'add' : 'delete'](fid);
    if (this.selectionFids.size === 1 && this.selectionFids.has(Layer.SELECTION_STATE.EXCLUDE)) this.setselectionFidsAll();
    const isLastFeatureSelected  = this.isGeoLayer() && this.setOlSelectionFeatureByFid(fid, 'remove');
    this.state.filter.active && await this.createFilterToken();
    if (this.selectionFids.size === 0 || isLastFeatureSelected) {
      this.selectionFids.clear();
      this.setSelection(false);
    }
  };

  excludeSelectionFids(fids=[]) {
    fids.forEach(fid => this.excludeSelectionFid(fid));
  };

  clearSelectionFids() {
    this.selectionFids.clear();
    this.isGeoLayer() && this.setOlSelectionFeatures();
    this.setSelection(false);
  };
// end selection ids methods

  getWMSLayerName() {
    return this.isWmsUseLayerIds() ? this.getId() : this.getName()
  };

  isWmsUseLayerIds() {
    return this.config.wms_use_layer_ids;
  };

  /**
   *
   * DOWNLOAD METHODS
   */

  getDownloadFilefromDownloadDataType(type, {data, options}) {
    let promise;
    switch (type) {
      case 'shapefile':
        promise = this.getShp({data, options});
        break;
      case 'xls':
        promise  = this.getXls({data, options});
        break;
      case 'csv':
        promise  = this.getCsv({data, options});
        break;
      case 'gpx':
        promise = this.getGpx({data, options});
        break;
      case 'gpkg':
        promise = this.getGpkg({data, options});
        break;
      case 'geotiff':
        promise: this.getGeoTIFF({
          data,
          options
        })
        break;
    }
    return promise;
  };

  getGeoTIFF({data}={}) {
    const url = this.getUrl('geotiff');
    return utils.XHR.fileDownload({
      url,
      data,
      httpMethod: "POST"
    })
  };

  getXls({data}={}) {
    const url = this.getUrl('xls');
    return utils.XHR.fileDownload({
      url,
      data,
      httpMethod: "POST"
    })
  };

  getShp({data}={}) {
    const url = this.getUrl('shp');
    return utils.XHR.fileDownload({
      url,
      data,
      httpMethod: "POST"
    })
  };

  getGpx({data}={}) {
    const url = this.getUrl('gpx');
    return utils.XHR.fileDownload({
      url,
      data,
      httpMethod: "POST"
    })
  };

  getGpkg({data}={}) {
    const url = this.getUrl('gpkg');
    return utils.XHR.fileDownload({
      url,
      data,
      httpMethod: "POST"
    })
  };

  getCsv({data}={}) {
    const url = this.getUrl('csv');
    return utils.XHR.fileDownload({
      url,
      data,
      httpMethod: "POST"
    })
  };

  getSourceType() {
    return this.config.source ? this.config.source.type : null;
  };

  isGeoLayer() {
    return this.state.geolayer;
  };

  getDataTable({page = null, page_size=null, ordering=null, search=null, field, suggest=null, formatter=0 , in_bbox, custom_params={}} = {}) {
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
          const data = response.data;
          const count = response.count;
          const title = this.getTitle();
          const features = data.features && data.features || [];
          let headers = features.length ? features[0].properties : [];
          headers = geoutils.parseAttributes(this.getAttributes(), headers);
          const dataTableObject = {
            headers,
            features,
            title,
            count
          };
          d.resolve(dataTableObject)
        })
        .fail(err => d.reject(err))
    }
    return d.promise();
  };

  /**
   * Search layer feature by fids
   * @param fids formatter
   */
  async getFeatureByFids({fids=[], formatter=0}={}) {
    const url = this.getUrl('data');
    let features;
    try {
      const response = await utils.XHR.get({
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

//search Features methods
  searchFeatures(options={}, params={}) {
    const {search_endpoint = this.config.search_endpoint} = options;
    return new Promise(async (resolve, reject) =>{
      switch (search_endpoint) {
        case 'ows':
          this.search(options, params)
            .then(results => {
              results = {
                data: results
              };
              resolve(results);
            }).fail(error => reject(error));
          break;
        case 'api':
          const {raw=false, filter:field, suggest={}, unique, queryUrl, ordering} = options;
          try {
            const response = await this.getFilterData({
              queryUrl,
              raw,
              field,
              ordering,
              suggest,
              unique
            });
            resolve(response);
          } catch(err) {
            reject(err);
          }
          break;
      }
    })
  };

  /*
  * getFilterData is a function to get data feature based on fields and suggets
  * params:
  * - suggest (mandatory): object with key is a field of layer and value is value of the field to filter
  * - fields: Array of object with type of suggest (see above)
  * */
  async getFilterData({field, raw=false, suggest={}, unique, formatter=1, queryUrl, ordering}={}) {
    const provider =  this.getProvider('data');
    const response = await provider.getFilterData({
      queryUrl,
      field,
      raw,
      ordering,
      suggest,
      formatter,
      unique
    });
    return response;
  };

// search method
  search(options={}, params={}) {
    // check option feature_count
    options.feature_count = options.feature_count || 10;
    options = {
      ...options,
      ...this.config.searchParams,
      ...params
    };
    const d = $.Deferred();
    const provider = this.getProvider('search');
    if (provider)
      provider.query(options)
        .done(response => d.resolve(response))
        .fail(err => d.reject(err));
    else d.reject(t('sdk.search.layer_not_searchable'));
    return d.promise();
  };

//Info from layer (only for querable layers)
  query(options={}) {
    const d = $.Deferred();
    const {filter} = options;
    const provider = this.getProvider(filter ? 'filter' : 'query');
    if (provider)
      provider.query(options)
        .done(response => d.resolve(response))
        .fail(err => d.reject(err));
    else d.reject(t('sdk.search.layer_not_querable'));
    return d.promise();
  };

// generel way to get an attribute
  get(property) {
    return this.config[property] ? this.config[property] : this.state[property];
  };

  getFields() {
    return this.config.fields
  };

  /**
   * Get field by name
   * @param fieldName
   * @returns {*}
   */
  getFieldByName(fieldName) {
    return this.getFields().find(field => field.name === fieldName)
  };

  getEditingFields() {
    return this.config.editing.fields;
  };

  getTableFields() {
    return this.config.fields.filter(field => field.show);
  };

  getTableHeaders() {
    return this.getTableFields().filter(field => geoutils.geometryFields.indexOf(field.name) === -1);
  };

  getProject() {
    return this.config.project;
  };

  getConfig() {
    return this.config;
  };

  /**
   * get form structur to show on form editing
   * @param fields
   * @returns {[]}
   */
  getLayerEditingFormStructure(fields) {
    return this.config.editor_form_structure;
  };

  /*
  Duplicate beacause we had to check if it used by some plugins to avoid to break back compatibility
   */
  getEditorFormStructure() {
    return this.getLayerEditingFormStructure();
  };

  getFieldsOutOfFormStructure() {
    return this.config.editor_form_structure ? this.config.editor_form_structure.filter(structure => {
      return structure.field_name;
    }) : []
  };

  hasFormStructure() {
    return !!this.config.editor_form_structure;
  };

//get custom style for future implementation
  getCustomStyle() {
    return this.config.customstyle;
  };

  getState() {
    return this.state;
  };

  getSource() {
    return this.state.source;
  };

  isDownloadable() {
    return this.isShpDownlodable() || this.isXlsDownlodable() ||
      this.isGpxDownlodable() || this.isGpkgDownlodable() || this.isCsvDownlodable();
  };

  getDownloadableFormats() {
    return Object.keys(DOWNLOAD_FORMATS).filter(download_format => this.config[download_format]).map(format => DOWNLOAD_FORMATS[format].format);
  };

  getDownloadUrl(format) {
    const find = Object.values(DOWNLOAD_FORMATS).find(download_format => download_format.format === format);
    return find && find.url;
  };

  isGeoTIFFDownlodable() {
    return !this.isBaseLayer() && this.config.download && this.config.source.type === 'gdal';
  };

  isShpDownlodable() {
    return !this.isBaseLayer() && this.config.download && this.config.source.type !== 'gdal';
  };

  isXlsDownlodable() {
    return !this.isBaseLayer() && this.config.download_xls;
  };

  isGpxDownlodable() {
    return !this.isBaseLayer() && this.config.download_gpx;
  };

  isGpkgDownlodable() {
    return !this.isBaseLayer() && this.config.download_gpkg;
  };

  isCsvDownlodable() {
    return !this.isBaseLayer() && this.config.download_csv;
  };

  getEditingLayer() {
    return this._editingLayer;
  };

  setEditingLayer(editingLayer) {
    this._editingLayer = editingLayer;
  };

  isHidden() {
    return this.state.hidden;
  };

  setHidden(bool=true) {
    this.state.hidden = bool;
  };

  isModified() {
    return this.state.modified;
  };

  getId() {
    return this.config.id;
  };

  getMetadata() {
    return this.state.metadata
  };

  getTitle() {
    return this.config.title;
  };

  getName() {
    return this.config.name;
  };

  getOrigName() {
    return this.config.origname;
  };

  getServerType() {
    return (this.config.servertype && this.config.servertype !== '') ? this.config.servertype : Layer.ServerTypes.QGIS;
  };

  getType() {
    return this.type;
  };

  isType(type) {
    return this.getType() === type;
  };

  setType(type) {
    this.type = type;
  };

  isSelected() {
    return this.state.selected;
  };

  setSelected(bool) {
    this.state.selected = bool;
  };

  async setSelection(bool=false) {
    this.state.selection.active = bool;
    if (!bool) {
      this.state.filter.active && await this.deleteFilterToken();
      this.state.filter.active = bool;
      this.fire('unselectionall', this.getId());
    }
  };

  isSelectionActive() {
    return this.state.selection.active;
  };

  getSelection() {
    return this.state.selection;
  };

  getFilter() {
    return this.state.filter;
  };

  setDisabled(bool) {
    this.state.disabled = bool;
  };

  isDisabled() {
    return this.state.disabled;
  };

  isVisible() {
    return this.state.visible;
  };

  setVisible(bool) {
    this.state.visible = bool;
  };

// set a parametre map to check if request from map point of view or just a capabilities info layer
  isQueryable({onMap} = {onMap:false}) {
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

  getOws() {
    return this.config.ows;
  };

  getTocHighlightable() {
    return this.state.tochighlightable
  };

  setTocHighlightable(bool=false) {
    this.state.tochighlightable = bool;
  };

  /*
   condition: plain object with configuration layer attribute and value
  * */
  isFilterable(conditions=null) {
    let isFiltrable = !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.FILTERABLE));
    if (isFiltrable && conditions) {
      const conditionalFiltrable = Object.keys(conditions).reduce((bool, attribute) =>{
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
  isQtimeseries() {
    return this.config.qtimeseries;
  };

  isEditable() {
    return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.EDITABLE));
  };

  isBaseLayer() {
    return this.config.baselayer;
  };

// get url by type ( data, shp, csv, xls,  editing..etc..)
  getUrl(type) {
    return this.config.urls[type];
  };

  /**
   * Method to set url
   * @param type
   * @param url
   */
  setUrl({type, url}={}) {
    this.config.urls[type] = url;
  };

// return urls
  getUrls() {
    return this.config.urls;
  };

  setEditingUrl(url) {
    this.config.urls.editing = url || this.config.urls.editing;
  };

  getQueryUrl() {
    return this.config.urls.query;
  };

  setQueryUrl(queryUrl) {
    this.config.urls.query = queryUrl;
  };

  getQueryLayerName() {
    return (this.config.infolayer && this.config.infolayer !== '') ? this.config.infolayer : this.getName();
  };

  getQueryLayerOrigName() {
    return this.state.infolayer && this.config.infolayer !== '' ? this.config.infolayer :  this.config.origname;
  };

  getInfoFormat(ogcService) {
    /**
     * In case of qtime series (NETCDF)
     */
    if (this.config.qtimeseries === true || this.getSourceType() === 'gdal') return 'application/json';
    else return (this.config.infoformat && this.config.infoformat !== '' && ogcService !== 'wfs') ?  this.config.infoformat : 'application/vnd.ogc.gml';
  };

  getInfoFormats() {
    return this.state.infoformats;
  };

  getInfoUrl() {
    return this.config.infourl;
  };

  setInfoFormat(infoFormat) {
    this.config.infoformat = infoFormat;
  };

  getAttributes() {
    return this.config.fields;
  };

  changeAttribute(attribute, type, options) {
    for (const field of this.config.fields) {
      if (field.name === attribute) {
        field.type = type;
        field.options = options;
        break;
      }
    }
  };

  getAttributeLabel(name) {
    const field = this.getAttributes().find(field=> field.name === name);
    return field && field.label;
  };

  getProvider(type) {
    return this.providers[type];
  };

  getProviders() {
    return this.providers;
  };

  getLayersStore() {
    return this._layersstore;
  };

  setLayersStore(layerstore) {
    this._layersstore = layerstore;
  };

  canShowTable() {
    if (!this.config.not_show_attributes_table) {
      if (this.getServerType() === Layer.ServerTypes.QGIS) {
        if( ([
          Layer.SourceTypes.POSTGIS,
          Layer.SourceTypes.ORACLE,
          Layer.SourceTypes.WFS,
          Layer.SourceTypes.OGR,
          Layer.SourceTypes.MSSQL,
          Layer.SourceTypes.SPATIALITE
        ].indexOf(this.config.source.type) > -1) && this.isQueryable()) {
          return true
        }
      } else if (this.getServerType() === Layer.ServerTypes.G3WSUITE) {
        if (this.get('source').type === "geojson")
          return true
      } else if (this.isFilterable())
        return true;
      return false;
    } else return false
  };

  changeFieldType({name, type, options={}, reset=false}={}) {
    const field = this.getFields().find(field => field.name === name);
    if (field) {
      if (reset) {
        field.type = field._type;
        delete field._type;
        delete field[`${type}options`];
        return field.type;
      } else {
        field._type = field.type;
        field.type = type;
        field[`${type}options`] = options;
        return field._type;
      }
    }
  };

  changeConfigFieldType({name, type, options={},reset=false}) {
    return this.changeFieldType({name, type, options, reset});
  };

  resetConfigField({name}) {
    this.changeConfigFieldType({
      name,
      reset: true
    })
  };

//function called in case of change project to remove all sored information
  clear() {};

  isVector() {
    return this.getType() === Layer.LayerTypes.VECTOR;
  };

  isTable() {
    return this.getType() === Layer.LayerTypes.TABLE;
  };

  /// LAYER PROPERTIES
  // Layer Types
  static LayerTypes = {
    TABLE: "table",
    IMAGE: "image",
    VECTOR: "vector"
  };

  // Server Types
  static ServerTypes = {
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
    /*

   ADD ALSO TO PROVIDER FACTORY

   */
  };

  // Source Types
  static SourceTypes = {
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
    VECTORTILE: "vector-tile",
    ARCGISMAPSERVER: 'arcgismapserver',
    GEOJSON: "geojson"
    /*

   ADD TO PROVIDER FACTORY

   */
  };

  // Layer Capabilities
  static CAPABILITIES = {
    QUERYABLE: 1,
    FILTERABLE: 2,
    EDITABLE: 4
  };

  //Editing types
  static EDITOPS = {
    INSERT: 1,
    UPDATE: 2,
    DELETE: 4
  };

  //selection state
  static SELECTION_STATE = {
    ALL: '__ALL__',
    EXCLUDE: '__EXCLUDE__'
  };
}

export default  Layer;
