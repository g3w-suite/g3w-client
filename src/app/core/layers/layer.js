import {
  GEOMETRY_FIELDS,
  DOWNLOAD_FORMATS,
  SELECTION,
}                                from 'app/constant';
import ApplicationState          from 'store/application-state';
import DataRouterService         from 'services/data';
import ProjectsRegistry          from 'store/projects';
import ApplicationService        from 'services/application';
import GUI                       from 'services/gui';
import G3WObject                 from 'core/g3w-object';
import { parseAttributes }       from 'utils/parseAttributes';
import { promisify, $promisify } from 'utils/promisify';
import { downloadFile }          from 'utils/downloadFile';
import { XHR }                   from 'utils/XHR';
import { prompt }                from 'utils/prompt';
import Table                     from 'components/Table.vue';

const { t }                      = require('core/i18n/i18n.service');
const Relation                   = require('core/relations/relation');
const Providers                  = require('core/layers/providersfactory');
const deprecate                  = require('util-deprecate');

/**
 * Base class for all layers
 */
class Layer extends G3WObject {
  
  constructor(config={}, options={}) {

    super();

    //get current project object
    const project   = options.project || ProjectsRegistry.getCurrentProject();
    const suffixUrl = config.baselayer ? '' : `${project.getType()}/${project.getId()}/${config.id}/`;
    const vectorUrl = config.baselayer ? '' : project.getVectorUrl();
    const rasterUrl = config.baselayer ? '' : project.getRasterUrl();

    // assign some attributes

    this.config = Object.assign(config, {
      id:        config.id || 'Layer',
      title:     config.title || config.name,
      download:  !!config.download,
      geolayer:  false,
      baselayer: !!config.baselayer,
      fields:    config.fields || {},
      // URLs to get various type of data
      urls:      {
        query: config.infourl || config.wmsUrl,
        ...(config.urls || {}),
        ...(config.baselayer ? {} : {
            filtertoken: `${vectorUrl}filtertoken/${suffixUrl}`,
            data:        `${vectorUrl}data/${suffixUrl}`,
            shp:         `${vectorUrl}shp/${suffixUrl}`,
            csv:         `${vectorUrl}csv/${suffixUrl}`,
            xls:         `${vectorUrl}xls/${suffixUrl}`,
            gpx:         `${vectorUrl}gpx/${suffixUrl}`,
            gpkg:        `${vectorUrl}gpkg/${suffixUrl}`,
            geotiff:     `${rasterUrl}geotiff/${suffixUrl}`,
            editing:     `${vectorUrl}editing/${suffixUrl}`,
            commit:      `${vectorUrl}commit/${suffixUrl}`,
            config:      `${vectorUrl}config/${suffixUrl}`,
            unlock:      `${vectorUrl}unlock/${suffixUrl}`,
            widget:      {
              unique: `${vectorUrl}widget/unique/data/${suffixUrl}`
            },
            /** @since 3.8.0 */
            featurecount: project.getUrl('featurecount'),
            /** @since 3.10.0 */
            pdf:         `/html2pdf/`,
          })
      },
      /** Custom parameters based on a project qgis version */
      ...(config.baselayer ? {} : { searchParams: { I: 0, J: 0 } }),
      /** @deprecated since 3.10.0. Will be removed in v.4.x. */
      search_endpoint: 'api',
    });
    

    const relations = project.getRelations().filter(r => -1 !== [r.referencedLayer, r.referencingLayer].indexOf(this.getId()));

    /**
     * Layer relations
     */
    this._relations = {

      /**
       * Relations store
       * 
       * @type { Relation[] }
       */
      _relations: (relations || []).reduce((relations, conf) => {
        const r = new Relation(conf);
        relations[r.getId()] = r;
        return relations;
      }, {}),

      /**
       * Number of relations
       * 
       * @type { number }
       */
      _length: relations ? relations.length : 0,

      /**
       * Build relations between layers.
       *
       * @private
       */
      _reloadRelationsInfo() {

        this._relationsInfo = {
          children:     {},     // hashmap: <child_layerId,  Array<father_relationId>>
          fathers:      {},     // hashmap: <father_layerId, Array<child_relationId[]>>
          father_child: {},     // hashmap: <relationKey, relationId>
        };

        let f, c;
        const { father_child, fathers, children } = this._relationsInfo;

        Object
          .entries(this._relations)
          .forEach(([relationKey, relation]) => {

            f = relation.getFather();
            c = relation.getChild();

            father_child[f + c] = relationKey;       // relationKey = [father_layerId + child_layerId]
            fathers[f]          = fathers[f]  || [];
            children[c]         = children[c] || [];

            fathers[f].push(c);
            children[c].push(f);
        });
      },

      /**
       * @returns { number } number of relations
       */
      getLength() {
        return this._length;
      },

      /**
       * @param relation.type
       *
       * @returns { {} | Relation[] } relations filtered by type
       */
      getRelations({ type = null, } = {}) {

        // type = null
        if (!type) {
          return this._relations;
        }

        // type = { 'ONE' | 'MANY' }
        if (-1 !== ['ONE','MANY'].indexOf(type)) {
          const relations = {};
          for (const name in this._relations) {
            if (type === this._relations[name].getType()) {
              relations[name] = this._relations[name];
            }
          }
          return relations;
        }

        return {};
      },

      setRelations(relations=[])                 { this._relations = Array.isArray(relations) ? relations : []; },
      getRelationById(id)                        { return this._relations[id]; },
      getArray()                                 { return Object.entries(this._relations).map(r => r[1]); },
      getRelationByFatherChildren(father, child) { return this.getRelationById(this._relationsInfo.father_child[father + child]); },
      addRelation(r)                             { if (r instanceof Relation) { this._relations[r.getId()] = r;    this._reloadRelationsInfo(); } },
      removeRelation(r)                          { if (r instanceof Relation) { delete this._relations[r.getId()]; this._reloadRelationsInfo(); } },
      isChild(id)                                { return !!this._relationsInfo.children[id]; },
      isFather(id)                               { return !!this._relationsInfo.fathers[id]; },
      hasChildren(layer_id)                      { return (this.getChildren(layer_id) || []).length > 0; },
      hasFathers(layer_id)                       { return (this.getFathers(layer_id) || []).length > 0; },
      /** @returns { Array | null } child layers (IDs) within same relation */
      getChildren(layer_id)                      { return this.isFather(layer_id) ? this._relationsInfo.fathers[layer_id] : null; },
      /** @returns { Array | null } father layers (IDs) within same relation */
      getFathers(layer_id)                       { return this.isChild(layer_id) ? this._relationsInfo.children[layer_id] : null; },

    };

    this._relations._reloadRelationsInfo();

    // dinamic layer values useful for layerstree
    const defaultstyle = config.styles && config.styles.find(s => s.current).name;

    /**
     * @TODO make it simpler, `this.config` and `this.state` are essentially duplicated data
     */
    this.state = {
      id:                 config.id,
      title:              config.title,
      selected:           config.selected || false,
      disabled:           config.disabled || false,
      metadata:           config.metadata,
      openattributetable: this.canShowTable(),
      removable:          config.removable || false,
      downloadable:       this.isDownloadable(),
      source:             config.source,
      styles:             config.styles,
      defaultstyle,
      infoformat:         this.getInfoFormat(),
      infoformats:        this.config.infoformats || [],
      projectLayer:       true,
      geolayer:           false,
      attributetable:     { pageLength: null },
      visible:            config.visible || false,
      tochighlightable:   false,
      /** state of if is in editing (setted by editing plugin) */
      inediting:          false,
      /** Reactive selection attribute */
      selection:          { active: false },
      /** Reactive filter attribute */
      filter: {
        active:  false,
        /** @since 3.9.0 whether filter is set from a previously saved filter */
        current: null,
      },
      /** @type { Array<{{ id: string, name: string }}> } since 3.9.0 - array of saved filters */
      filters:            config.filters || [],
      /** @type {number} since 3.8.0 */
      featurecount:       config.featurecount,
      /** @type { boolean | Object<number, number> } since 3.8.0 */
      stylesfeaturecount: config.featurecount && defaultstyle && { [defaultstyle]: config.featurecount },
      /** @type { string } since 3.10.0 */
      name:               config.name,
      /** @type { boolean } since 3.10.0 */
      expanded:           config.expanded,
      /** @type { boolean } since 3.10.0 - whether to show layer on TOC (default: true) */
      toc:                'boolean' === typeof config.toc ? config.toc: true,
    };

    /**
     * Store all selections feature `fids`
     */
    this.selectionFids = new Set();

    // referred to (layersstore);
    this._layersstore = config.layersstore || null;

    const layerType = `${this.config.servertype} ${this.config.source && this.config.source.type}`;

    /**
     * Layer providers used to retrieve layer data from server
     * 
     * 1 - data: raw layer data (editing)
     * 2 - filter
     * 3 - filtertoken
     * 4 - query
     * 5 - search
     */
    this.providers = {

      data: (() => {
        if ([
          'QGIS virtual',
          'QGIS postgres',
          'QGIS oracle',
          'QGIS mssql',
          'QGIS spatialite',
          'QGIS ogr',
          'QGIS delimitedtext',
          'QGIS wfs',
        ].includes(layerType)) {
          return new Providers.qgis({ layer: this });
        }
        if ('G3WSUITE geojson' === layerType) {
          return new Providers.geojson({ layer: this });
        }
      })(),

      filter: [
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
        'QGIS wfs',
        'QGIS wmst',
        'QGIS wcs',
        'QGIS wms',
      ].includes(layerType) && new Providers.wfs({ layer: this }),

      filtertoken: [
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
      ].includes(layerType) && new Providers.qgis({ layer: this }),

      query: (() => {
        if ([
          'QGIS virtual',
          'QGIS postgres',
          'QGIS oracle',
          'QGIS mssql',
          'QGIS spatialite',
          'QGIS ogr',
          'QGIS delimitedtext',
          'QGIS wfs',
          'QGIS wmst',
          'QGIS wcs',
          'QGIS wms',
          'QGIS gdal',
          /** @since 3.9.0 */
          'QGIS postgresraster',
          'QGIS vector-tile',
          'QGIS vectortile',
          'QGIS arcgismapserver',
          'QGIS mdal',
          'OGC wms',
        ].includes(layerType)) {
          return new Providers.wms({ layer: this });
        }
        if ('G3WSUITE geojson' === layerType) {
          return new Providers.geojson({ layer: this });
        }
      })(),

      search: [
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
        'QGIS wfs',
      ].includes(layerType) && new Providers.qgis({ layer: this }),

    };

    /**
     * Store last proxy params (useful for repeat request info formats for wms external layer)
     */
    this.proxyData = {
      wms: null // at the moment only wms data from server
    };

  }

  /******************************************************************************************
   * LAYER DOWNLOAD
   *****************************************************************************************/

  /** 
   * @returns { Promise }
   */
  getDownloadFilefromDownloadDataType(type, { data = {} }) {
    data.filtertoken = this.getFilterToken();

    if ('pdf' === type) {
      return downloadFile({
        url: this.getUrl('pdf'),
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        data: JSON.stringify(data),
        mime_type: 'application/pdf',
        method: 'POST'
      });
    }

    return XHR.fileDownload({
      url: this.getUrl('shapefile' === type ? 'shp' : type),
      data,
      httpMethod: "POST"
    });
  }

  getGeoTIFF({ data = {} } = {}) { return this.getDownloadFilefromDownloadDataType('geotiff',   { data }); }
  getXls({ data = {} } = {})     { return this.getDownloadFilefromDownloadDataType('xls',       { data }); }
  getShp({ data = {} } = {})     { return this.getDownloadFilefromDownloadDataType('shapefile', { data }); }
  getGpx({ data = {} } = {})     { return this.getDownloadFilefromDownloadDataType('gpx',       { data }); }
  getGpkg({ data = {} } = {})    { return this.getDownloadFilefromDownloadDataType('gpkg',      { data }); }
  getCsv({ data = {} } = {})     { return this.getDownloadFilefromDownloadDataType('csv',       { data }); }

  /**
   * @returns { string[] } download formats
   */
  getDownloadableFormats() { return Object.keys(DOWNLOAD_FORMATS).filter(d => this.config[d]).map(d => DOWNLOAD_FORMATS[d].format); }

  /**
   * @param download url
   * 
   * @returns { string }
   */
  getDownloadUrl(format) {
    const find = Object.values(DOWNLOAD_FORMATS).find(d => d.format === format);
    return find && find.url;
  }

  /**
   * @returns { boolean } whether it has a format to download
   */
  isDownloadable()       { return !!(this.getDownloadableFormats().length); }
  isGeoTIFFDownlodable() { return !this.isBaseLayer() && this.config.download && 'gdal' === this.config.source.type ; }
  isShpDownlodable()     { return !this.isBaseLayer() && this.config.download && 'gdal' !== this.config.source.type; }
  isXlsDownlodable()     { return !this.isBaseLayer() && !!this.config.download_xls; }
  isGpxDownlodable()     { return !this.isBaseLayer() && !!this.config.download_gpx; }
  isGpkgDownlodable()    { return !this.isBaseLayer() && !!this.config.download_gpkg; }
  isCsvDownlodable()     { return !this.isBaseLayer() && !!this.config.download_csv; }

  /******************************************************************************************
   * LAYER RELATIONS
   *****************************************************************************************/

  /**
   * @returns {*} relations
   */
  getRelations() {
    return this._relations
  }

  /**
   * @param id
   * 
   * @returns {*} relation by id
   */
  getRelationById(id) {
    return this._relations.getArray().find(r => r.getId() === id);
  }

  /**
   * @param relationName
   * 
   * @returns { * | Array } relation fields
   */
  getRelationAttributes(relationName) {
    const relation = this._relations.find(r => r.name === relationName);
    return relation ? relation.fields : [];
  }

  /**
   * [LAYER RELATIONS]
   * 
   * @TODO Add description
   * 
   * @returns { Object } fields
   */
  getRelationsAttributes() {
    return (this.state.relations || []).reduce((fields, r) => {
      fields[r.name] = r.fields;
      return fields; },
    {});
  }

  /**
   * @returns { * | boolean } whether layer is a Child of a relation
   */
  isChild() {
    return this.getRelations() ? this._relations.isChild(this.getId()) : false;
  }

  /**
   * @returns { * | boolean } whether layer is a Father of a relation
   */
  isFather() {
    return this.getRelations() ? this._relations.isFather(this.getId()) : false;
  }

  /**
   * @returns { * |Array } children relations
   */
  getChildren() {
    return this.isFather() ? this._relations.getChildren(this.getId()) : [];
  }

  /**
   * @returns { * | Array } parents relations
   */
  getFathers() {
    return this.isChild() ? this._relations.getFathers(this.getId()) : [];
  }

  /**
   * @returns { * | boolean } whether it has children
   */
  hasChildren() {
    return this.hasRelations() ? this._relations.hasChildren(this.getId()) : false;
  }

  /**
   * @returns { * | boolean } whether it has fathers
   */
  hasFathers() {
    return this.hasRelations() ? this._relations.hasFathers(this.getId()) : false;
  }

  /**
   * @TODO add description
   */
  hasRelations() {
    return !!this._relations;
  }

  /******************************************************************************************
   * LAYER SELECTION
   *****************************************************************************************/

  /**
   * @returns { boolean } whether is selected
   */
  isSelected() {
    return this.state.selected;
  }

  /**
   * @param { boolean } selected
   */
  setSelected(selected) {
    this.state.selected = selected;
  }

  /**
   * Set Selection
   * 
   * @param bool
   * 
   * @returns {Promise<void>}
   * 
   * @fires unselectionall
   */
  async setSelection(bool=false) {
    this.state.selection.active = bool;

    // skip when selection is active
    if (bool) { return }

    //check if filter is active
    const is_active   = this.state.filter.active;
    const has_current = null !== this.state.filter.current;

    /** @TODO add description */
    if (has_current && is_active) {
      await this._applyFilterToken(this.state.filter.current)
    }

    /** @TODO add description */
    if (!has_current && is_active) {
      await this.deleteFilterToken();
    }

    this.emit('unselectionall', this.getId());
  }

  /**
   * @returns { boolean } whether selection si active
   */
  isSelectionActive() {
    return this.state.selection.active;
  }

  /**
   * @returns {{ active: boolean }} selection
   */
  getSelection() {
    return this.state.selection;
  }

  /**
   * @returns filter
   */
  getFilter() {
    return this.state.filter;
  }

  /**
   * Set filter Active to layer
   * 
   * @param {boolean} bool
   */
  setFilter(bool = false) {
    this.state.filter.active = bool;
    if (this.isGeoLayer() && this.state.filter.active) {
      this.hideOlSelectionFeatures();
    }
    if (this.isGeoLayer() && !this.state.filter.active) {
      this.updateMapOlSelectionFeatures();
    }
  }

  /**
   * get current filter
   */
  getCurrentFilter() {
    return this.state.filter.current;
  }

  /**
   * @TODO Add description
   * 
   * @returns {boolean}
   */
  getFilterActive() {
    return this.state.filter.active;
  }

  /**
   * @returns { Array } saved filters
   */
  getFilters() {
    return this.state.filters;
  }

  /**
   * Add new filter
   * 
   * @param filter Object filter
   */
  addFilter(filter = {}) {
    this.state.filters.push(filter);
  }

  /**
   * Remove saved filter from filters Array
   * 
   * @param fid unique filter id
   */
  removefilter(fid) {
    this.state.filters = this.state.filters.filter(f => fid === f.fid);
  }

  /**
   * Set Current filter
   * 
   * @param {{ fid, name }} filter 
   */
  setCurrentFilter(filter) {
    this.state.filter.current = filter;
  }

  /**
   * Apply layer filter by fid
   * 
   * @param filter
   */
  async applyFilter(filter) {
    if (!this.providers['filtertoken']) {
      return;
    }

    // the current filter is set and is different from current
    if (null === this.state.filter.current || filter.fid !== this.state.filter.current.fid ) {
      await this.clearSelectionFids();
      GUI.closeContent();
    }

    await this._applyFilterToken(filter);
  }

  /**
   * @returns {Promise<void>}
   * 
   * @private
   */
  async _applyFilterToken(filter) {
    const { filtertoken } = await this.providers['filtertoken'].applyFilterToken(filter.fid);
    if (filtertoken) {
      this.setFilter(false);
      this.setCurrentFilter(filter);
      this.setFilterToken(filtertoken);
    }
  }

  /**
   * @since 3.9.0
   */
  saveFilter() {

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

  }

  /**
   * Toggle filter token on layer
   */
  async toggleFilterToken() {

    //set to handle select or hide ol
    this.setFilter(!this.state.filter.active);

    const has_current = this.state.filter.current;
    const is_active   = this.state.filter.active;

    // there is an active filter --> create a new filter
    if (is_active) {
      await this.createFilterToken();
    }

    // there is a current saved filter --> apply filter
    if (has_current && !is_active) {
      await this.applyFilter(this.state.filter.current);
    }

    // there is no current saved filter --> delete it
    if (!has_current && !is_active) {
      await this.deleteFilterToken();
    }

    return this.state.filter.active;
  }

  /**
   * Delete filtertoken from server
   * 
   * @param fid  unique id of filter saved to delete
   */
  async deleteFilterToken(fid) {
    try {
      // skip when no filtertoken provider is set
      if (!this.providers['filtertoken']) {
        return;
      }

      // delete filtertoken related to layer provider
      const filtertoken = await this.providers['filtertoken'].deleteFilterToken(fid);

      // remove it from filters list when deleting a saved filter (since v3.9.0)
      if (undefined !== fid) {
        this.state.filters = this.state.filters.filter(f => fid !== f.fid);
      }

      this.setCurrentFilter(null);      // set current filter set to null
      // set active filter to false
      if (this.state.filter.active) { this.setFilter(false) }
      this.setFilterToken(filtertoken); // pass `filtertoken` to application

    } catch(err) {
      console.log('Error deleteing filtertoken', err);
    }
  }

  /**
   * Set applicaton filter token
   * 
   * @param filtertoken
   *
   * @fires filtertokenchange when filtertoken is changed
   * 
   * @since 3.9.0
   */
  setFilterToken(filtertoken = null) {
    ApplicationService.setFilterToken(filtertoken);
    this.emit('filtertokenchange', { layerId: this.getId() });
  }

  /**
   * Create filter token
   */
  async createFilterToken() {
    try {

      const provider  = this.providers['filtertoken'];
      const selection = this.selectionFids;

      // skip when no filter token provider is set or selectionFids is empty
      if (!provider || !selection.size > 0) {
        return;
      }

      // select all features
      if (selection.has(SELECTION.ALL)) {
        await provider.deleteFilterToken();
        this.setFilterToken(null);

        return;
      }

      const fids = Array.from(selection);

      // exclude some features from selection
      if (selection.has(SELECTION.EXCLUDE)) {
        this.setFilterToken( await provider.getFilterToken({ fidsout: fids.filter(id => id !== SELECTION.EXCLUDE).join(',') }) );
        return;
      }
      // include some features in selection
      this.setFilterToken( await provider.getFilterToken({ fidsin: fids.join(',') }) );

    } catch(err) {
      console.log('Error create update token', err);
    }
  }

  /**
   * Get Application filter token
   * 
   * @returns {*}
   */
  getFilterToken() {
    return ApplicationService.getFilterToken();
  }

  /**
   * @TODO add description
   */
  setSelectionFidsAll() {
    this.selectionFids.clear();
    this.selectionFids.add(SELECTION.ALL);

    /** @TODO add description */
    if (this.isGeoLayer()) {
      //set all features selected
      Object.values(this.olSelectionFeatures).forEach(feat => feat.selected = true);
      this.updateMapOlSelectionFeatures();
    }

    /** @TODO add description */
    this.setSelection(true);
    if (this.state.filter.active) {
      this.createFilterToken();
    }
  }

  /**
   * @returns {Set<any>} stored selection `fids` 
   */
  getSelectionFids() {
    return this.selectionFids;
  }

  /**
   * Invert current selection fids
   */
  invertSelectionFids() {
    const selection = this.selectionFids;

    /** @TODO add description */
    if (selection.has(SELECTION.EXCLUDE))  { selection.delete(SELECTION.EXCLUDE); }
    else if (selection.has(SELECTION.ALL)) { selection.delete(SELECTION.ALL); }
    else if (selection.size > 0)           { selection.add(SELECTION.EXCLUDE); }

    /** @TODO add description */
    if (this.isGeoLayer()) {
      this.setInversionOlSelectionFeatures();
    }

    /** In the case of tocken filter active create */
    if (this.state.filter.active) { this.createFilterToken() }

    this.setSelection(selection.size > 0);
  }

  /**
   * Check if feature id is present
   * 
   * @param fid feature id
   * 
   * @returns {boolean}
   */
  hasSelectionFid(fid) {
    const selection = this.selectionFids;

    /** In case contain selection ALL, mean all features selected */
    if (selection.has(SELECTION.ALL)) { return true }

    /**In case selection contains exclude value, check if id is not in excluded feature id */
    if (selection.has(SELECTION.EXCLUDE)) { return !selection.has(fid) }

    /** Check if id is on selection set */
    return selection.has(fid);
  }


  /**
   * Include fid feature id to selection
   * 
   * @param fid
   * @param createToken
   * 
   * @returns {Promise<void>}
   */
  async includeSelectionFid(fid, createToken = true) {

    const selection = this.selectionFids;

    // whether fid is excluded from selection
    const is_excluded = selection.has(SELECTION.EXCLUDE) && selection.has(fid);

    // remove fid from exclude
    if (is_excluded) { selection.delete(fid) }

    // add to selection fid
    if (!is_excluded) { selection.add(fid) }

    // if the only one exclude Set all selected
    if (is_excluded && 1 === selection.size) { this.setSelectionFidsAll() }

    /** @TODO add description */
    if (!is_excluded && !this.isSelectionActive()) { this.setSelection(true) }

    /** @TODO add description */
    if (this.isGeoLayer()) {
      this.setOlSelectionFeatureByFid(fid, is_excluded ? 'remove' : 'add');
    }

    /** @TODO add description */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }

  }

  /**
   * Exclude fid to selection
   * 
   * @param fid
   * @param createToken
   * 
   * @returns {Promise<void>}
   */
  async excludeSelectionFid(fid, createToken = true) {

    const selection = this.selectionFids;

    /**In case all features are selected or no features are selected */
    if (selection.has(SELECTION.ALL) || 0 === selection.size) {
      //set an empty selection set
      selection.clear();
      //add exclude item
      selection.add(SELECTION.EXCLUDE);
    }


    /** If has exclude item, mean add fid to exclude */
    if (selection.has(SELECTION.EXCLUDE)) {
      //add to exclude
      selection.add(fid);
    } else {
      //remote to exclude
      selection.delete(fid);
    }

    /** If no selection */
    if (0 === selection.size) { this.clearSelectionFids() }

    /** If contain only exclude fid */
    if (1 === selection.size && selection.has(SELECTION.EXCLUDE)) {
      //celar selection set
      selection.clear();
      this.setselectionFidsAll();
    }


    if (this.isGeoLayer()) {
      // whether fid is excluded from selection
      const is_excluded = selection.has(SELECTION.EXCLUDE) ? selection.has(fid) : !selection.has(fid);
      this.setOlSelectionFeatureByFid(fid, is_excluded  ? 'remove' : 'add');
    }

    /** If there is a filterActive */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }

  }

  /**
   * @param { Array }   fids
   * @param { boolean } createToken since 3.9.0
   * 
   * @returns { Promise<void> }
   */
  async includeSelectionFids(fids = [], createToken = true) {
    // pass false because eventually token filter creation needs to be called after
    fids.forEach(fid => this.includeSelectionFid(fid, false));

    /** @TODO add description */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }
  }

  /**
   * Exclude fids from selection
   * 
   * @param { Array }   fids
   * @param { boolean } createToken since 3.9.0
   * 
   * @returns { Promise<void> }
   */
  async excludeSelectionFids(fids = [], createToken = true) {
    //pass false because eventually token filter creation need to be called after
    fids.forEach(fid => this.excludeSelectionFid(fid, false));

    /** @TODO add description */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }
  }

  /**
   * Clear selection
   */
  async clearSelectionFids() {
    this.selectionFids.clear();
    // remove selected feature on a map
    if (this.isGeoLayer()) {
      //set all features unselected
      Object.values(this.olSelectionFeatures).forEach(feat => feat.selected = false);
      this.updateMapOlSelectionFeatures();
    }
    // set selection false
    await this.setSelection(false);
  }

  /******************************************************************************************
   * LAYER BASE
   *****************************************************************************************/

  /**
   * Proxy params data
   */
  getProxyData(type) {
    return type ? this.proxyData[type] : this.proxyData;
  }

  /**
   * Set proxy data
   *
   * @param type
   * @param data
   */
  setProxyData(type, data = {}) {
    this.proxyData[type] = data;
  }

  /**
   * Clear proxy data
   *
   * @param type
   */
  clearProxyData(type) {
    this.proxyData[type] = null;
  }

  /**
   * Get a proxy request
   *
   * @param type
   * @param proxyParams
   *
   * @returns {Promise<*>}
   */
  async getDataProxyFromServer(type = 'wms', proxyParams = {}) {
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
  }

  /**
   * @TODO Add description
   *
   * @param type
   * @param changes
   *
   * @returns {Promise<*>}
   */
  changeProxyDataAndReloadFromServer(type = 'wms', changes = {}) {
    Object.keys(changes).forEach(changeParam => {
      Object.keys(changes[changeParam]).forEach(param => {
        this.proxyData[type][changeParam][param] = changes[changeParam][param];
      })
    });
    return this.getDataProxyFromServer(type, this.proxyData[type]);
  }

  /**
   * [EDITING PLUGIN] Check if layer is in editing
   *
   * @returns { boolean }
   */
  isInEditing() {
    return this.state.inediting;
  }

  /**
   * [EDITING PLUGIN] Set editing state
   *
   * @param {boolean} bool
   */
  setInEditing(bool=false) {
    this.state.inediting = bool;
  }

  /**
   * @TODO Add description here
   *
   * @returns {*}
   */
  getSearchParams() {
    return this.config.searchParams;
  }

  /**
   * @deprecated since 3.10.0. Will be removed in v.4.x.
   */
  getSearchEndPoint() {
    console.warn('getSearchEndPoint is deprecated')
    return 'api';
  }

  /**
   * @TODO Add description
   *
   * @param pageLength
   */
  setAttributeTablePageLength(pageLength) {
    this.state.attributetable.pageLength = pageLength
  }

  /**
   * @TODO add description
   *
   * @returns {null}
   */
  getAttributeTablePageLength() {
    return this.state.attributetable.pageLength;
  }

  /**
   * @returns { string } wms layer name for wms request
   */
  getWMSLayerName() {
    return this.isWmsUseLayerIds() ? this.getId() : this.getName()
  }

  /**
   * @returns { boolean | *} whether request need to use `layer.id` or `layer.name`
   */
  isWmsUseLayerIds() {
    return this.config.wms_use_layer_ids;
  }

  /**
   * @returns {*|null} source type of layer
   */
  getSourceType() {
    return this.config.source ? this.config.source.type : null;
  }

  /**
   * @returns {boolean} whether it is a layer with geometry
   */
  isGeoLayer() {
    return this.state.geolayer;
  }

  /**
   * @TODO Add description
   *
   * @param { Object } opts
   * @param opts.page
   * @param opts.page_size
   * @param opts.ordering
   * @param opts.search
   * @param opts.suggest
   * @param opts.formatter
   * @param opts.custom_params
   * @param opts.field
   * @param opts.in_bbox
   *
   * @returns {*}
   */
  getDataTable({
    page          = null,
    page_size     = null,
    ordering      = null,
    search        = null,
    suggest       = null,
    formatter     = 0,
    custom_params = {},
    field,
    in_bbox,
  } = {}) {
    return $promisify(async () => {

      // skip when..
      if (!this.getProvider('filter') && !this.getProvider('data')) {
        return Promise.reject();
      }

      const response = await promisify(
        this
          .getProvider('data')
          .getFeatures(
            { editing: false }, {
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
          })
      );
      const features = response.data.features && response.data.features || [];
      return {
        headers: parseAttributes(this.getAttributes(), (features.length ? features[0].properties : [])),
        features,
        title: this.getTitle(),
        count: response.count
      };
    });
  }

  /**
   * Search layer feature by fids
   *
   * @param fids formatter
   */
  async getFeatureByFids({
    fids      = [],
    formatter = 0,
  } = {}) {
    const url = this.getUrl('data');
    try {
      const response = await XHR.get({
        url,
        params: {
          fids: fids.toString(),
          formatter
        }
      });
      if (response && response.result && response.vector && response.vector.data) {
        return response.vector.data.features;
      }
    } catch(err) {}
  }

  /**
   * @TODO deprecate `search_endpoint = 'ows'`
   *
   * Search Features
   * 
   * @param { Object }        opts
   * @param { 'ows' | 'api' } options.search_endpoint
   * @param { boolean }       options.raw
   * @param { 0 | 1 }         options.formatter
   * @param options.filter
   * @param options.suggest
   * @param options.unique
   * @param options.queryUrl
   * @param options.ordering
   * @param { Object }        params - OWS search params
   * 
   * @returns { Promise }
   */
  searchFeatures(options = {}, params = {}) {
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
                suggest:   options.suggest,
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
  }

  /**
   * Get feature data based on `field` and `suggests`
   * 
   * @param { Object }    opts
   * @param { boolean }   opts.raw
   * @param { Object }    opts.suggest   - (mandatory): object with key is a field of layer and value is value of the field to filter
   * @param { 0 | 1 }     opts.formatter
   * @param { Array }     opts.field     - Array of object with type of suggest (see above)
   * @param opts.unique
   * @param opts.fformatter
   * @param opts.ffield
   * @param opts.queryUrl
   * @param opts.ordering

  */
  async getFilterData({
    raw       = false,
    suggest,
    field,
    unique,
    fformatter, //@since v3.9
    ffield,     //@since 3.9.1
    formatter = 1,
    queryUrl,
    ordering,
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
        fformatter,
        ffield,
      });
  }

  /**
   * search method 
   */
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
    if (provider) {
      provider.query(options)
        .done(response => d.resolve(response))
        .fail(err => d.reject(err));
    } else {
      d.reject(t('sdk.search.layer_not_searchable'));
    }
    return d.promise();
  }

  /**
   * Info from layer (only for querable layers) 
   */
  query(options={}) {
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
  }

  /**
   * General way to get an attribute 
   */
  get(property) {
    return this.config[property] ? this.config[property] : this.state[property];
  }

  /**
   * @returns { * | {} } layer fields
   */
  getFields() {
    return this.config.fields
  }

  /**
   * Get field by name
   * 
   * @param fieldName
   *
   * @returns {*}
   */
  getFieldByName(fieldName) {
    return this.getFields().find(field => field.name === fieldName)
  }

  /**
   * @returns { Array } editing fields
   */
  getEditingFields() {
    return this.config.editing.fields;
  }

  /**
   * @returns { Array } only show fields
   */
  getTableFields() {
    return (this.config.fields || []).filter(field => field.show);
  }

  /**
   * @returns { Array } table fields exclude geometry field
   */
  getTableHeaders() {
    return this.getTableFields().filter(field => -1 === GEOMETRY_FIELDS.indexOf(field.name));
  }

  /**
   * @returns {*} current project
   */
  getProject() {
    return this.config.project;
  }

  /**
   * @returns { Object } layer config
   */
  getConfig() {
    return this.config;
  }

  /**
   * @param fields
   *
   * @returns { Array } form structure to show on form editing
   */
  getLayerEditingFormStructure(fields) {
    return this.config.editor_form_structure;
  }

  /**
   * @returns { boolean } whether it has form structure
   */
  hasFormStructure() {
    return !!this.config.editor_form_structure;
  }

  /**
   * @returns custom style (for future implementation)
   */
  getCustomStyle() {
    return this.config.customstyle;
  }

  /**
   * Get state layer
   *
   * @returns {*|{metadata, downloadable: *, attributetable: {pageLength: null}, defaultstyle: *, source, title: *, infoformats: ((function(): *)|*|*[]), tochighlightable: boolean, featurecount: number, stylesfeaturecount: (number|string|*|{[p: number]: *}), projectLayer: boolean, infoformat: (string|default.watch.infoformat|*), geolayer: boolean, inediting: boolean, disabled: boolean, id: (*|string), selected: boolean, openattributetable: (boolean|boolean), visible: boolean, filters: *[], filter: {current: null, active: boolean}, selection: {active: boolean}, removable: (boolean|*), styles}}
   */
  getState() {
    return this.state;
  }

  /**
   * @returns {*} layer source (ex. ogr, spatialite, etc..)
   */
  getSource() {
    return this.state.source;
  }

  /**
   * @returns {*} editing version of layer
   */
  getEditingLayer() {
    return this._editingLayer;
  }

  /**
   * Set editing layer
   *
   * @param editingLayer
   */
  setEditingLayer(editingLayer) {
    this._editingLayer = editingLayer;
  }

  /**
   * @returns {string|string[]|boolean|string|*} whether is hidden
   */
  isHidden() {
    return this.state.hidden;
  }

  /**
   * Set hidden
   *
   * @param bool
   */
  setHidden(bool=true) {
    this.state.hidden = bool;
  }

  /**
   * @returns {*|string} id
   */
  getId() {
    return this.config.id;
  }

  /**
   * @returns {*} metadata
   */
  getMetadata() {
    return this.state.metadata
  }

  /**
   * @returns {*} title
   */
  getTitle() {
    return this.config.title;
  }

  /**
   * @returns {*} name
   */
  getName() {
    return this.config.name;
  }

  /**
   * @returns {*} origin name
   */
  getOrigName() {
    return this.config.origname;
  }

  /**
   * @returns { string } Server type
   */
  getServerType() {
    return this.config.servertype || Layer.ServerTypes.QGIS;
  }

  /**
   * @returns {*} type
   */
  getType() {
    return this.type;
  }


  /**
   * Check if layer is a type passed
   *
   * @param type
   *
   * @returns {boolean}
   */
  isType(type) {
    return this.getType() === type;
  }

  /**
   * Set disabled
   *
   * @param bool
   */
  setDisabled(bool) {
    this.state.disabled = bool;
  }

  /**
   * @returns {boolean} whether it is disabled
   */
  isDisabled() {
    return this.state.disabled;
  }

  /**
   * @returns {boolean} whether is visible
   */
  isVisible() {
    return this.state.visible;
  }

  /**
   * Set visibility
   *
   * @param bool
   */
  setVisible(bool) {
    this.state.visible = bool;
  }

  /**
   * @param { Object } param
   * @param param.map check if request from map point of view or just a capabilities info layer
   */
  isQueryable() {
    return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.QUERYABLE));
  }

  /**
   * @TODO Description
   *
   * @returns {boolean}
   */
  getTocHighlightable() {
    return this.state.tochighlightable;
  }

  /**
   * @TODO Description
   *
   * @param bool
   */
  setTocHighlightable(bool=false) {
    this.state.tochighlightable = bool;
  }

  /**
   * @param conditions plain object with configuration layer attribute and value
   */
  isFilterable(conditions=null) {
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
  }

  /**
   * @returns { boolean } whether layer is set up as time series
   */
  isQtimeseries() {
    return this.config.qtimeseries;
  }

  /**
   * @returns { boolean } whether is editable
   */
  isEditable() {
    return !!(this.config.capabilities && (this.config.capabilities & Layer.CAPABILITIES.EDITABLE));
  }

  /**
   * @returns {*|boolean} whether is a base layer
   */
  isBaseLayer() {
    return this.config.baselayer;
  }

  /**
   * @param type get url by type (data, shp, csv, xls, editing, ...)
   */
  getUrl(type) {
    return this.config.urls[type];
  }

  /**
   * Set config url
   * 
   * @param { Object } url
   * @param url.type
   * @param url.url
   */
  setUrl({ type, url } = {}) {
    this.config.urls[type] = url;
  }

  /**
   * @returns {*} query url
   */
  getQueryUrl() {
    return this.config.urls.query;
  }

  /**
   * @TODO Description
   *
   * @returns {*}
   */
  getQueryLayerOrigName() {
    return this.state.infolayer && this.config.infolayer !== '' ? this.config.infolayer :  this.config.origname;
  }

  /**
   * @TODO Description
   *
   * @param ogcService
   *
   * @returns { default.watch.infoformat | * | string }
   */
  getInfoFormat(ogcService) {
    // In case of NETCDF (qtime series)
    if (this.config.qtimeseries === true || this.getSourceType() === 'gdal') {
      return 'application/json';
    }
    if (this.config.infoformat && '' !== this.config.infoformat  && 'wfs' !== ogcService) {
      return this.config.infoformat;
    }
    return 'application/vnd.ogc.gml';
  }

  /**
   * @TODO Description
   *
   * @returns {(function(): *)|*|*[]}
   */
  getInfoFormats() {
    return this.state.infoformats;
  }

  /**
   * @TODO Description
   *
   * @returns {*}
   */
  getInfoUrl() {
    return this.config.infourl;
  }

  /**
   * @TODO Description
   *
   * @param infoFormat
   */
  setInfoFormat(infoFormat) {
    this.config.infoformat = infoFormat;
  }

  /**
   * @TODO Description
   *
   * @returns {*|{}}
   */
  getAttributes() {
    return this.config.fields;
  }

  /**
   * @TODO Description
   *
   * @param attribute
   * @param type
   * @param options
   */
  changeAttribute(attribute, type, options) {
    for (const field of this.config.fields) {
      if (field.name === attribute) {
        field.type = type;
        field.options = options;
        break;
      }
    }
  }

  /**
   * @TODO Description
   *
   * @param name
   *
   * @returns {*}
   */
  getAttributeLabel(name) {
    const field = this.getAttributes().find(a => a.name === name);
    return field && field.label;
  }

  /**
   * Return provider by type
   *
   * @param type
   *
   * @returns {*}
   */
  getProvider(type) {
    return this.providers[type];
  }

  /**
   * Return all providers
   *
   * @returns {*|{filter: null, search: null, data: null, query: null, filtertoken: null}}
   */
  getProviders() {
    return this.providers;
  }

  /**
   * @TODO Description
   *
   * @returns {*}
   */
  getLayersStore() {
    return this._layersstore;
  }

  /**
   * @TODO Description
   *
   * @param layerstore
   */
  setLayersStore(layerstore) {
    this._layersstore = layerstore;
  }

  /**
   * Return if it is possible to show table of attribute
   *
   * @returns {boolean}
   */
  canShowTable() {
    if (this.config.not_show_attributes_table || this.isBaseLayer()) {
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
  }

  /**
   * @TODO Description
   *
   * @param { Object } field
   * @param field.name
   * @param field.type
   * @param field.options
   * @param field.reset
   *
   * @returns {*}
   */
  changeFieldType({
    name,
    type,
    options = {},
    reset   = false,
  } = {}) {
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

  }

  /**
   * @TODO Description
   *
   * @param { Object } config
   * @param config.name
   * @param config.type
   * @param config.options
   * @param config.reset
   *
   * @returns {*}
   */
  changeConfigFieldType({
    name,
    type,
    options = {},
    reset   = false,
  }) {
    return this.changeFieldType({ name, type, options, reset });
  }

  /**
   * @TODO Description
   *
   * @param name
   */
  resetConfigField({name}) {
    this.changeConfigFieldType({ name, reset: true });
  }

  /**
   * Function called in case of change project to remove all stored information 
   */
  clear() {}

  /**
   * @returns {boolean} whether is a vector layer
   */
  isVector() {
    return this.getType() === Layer.LayerTypes.VECTOR;
  }

  /**
   * @returns {boolean} whether is a table layer
   */
  isTable() {
    return this.getType() === Layer.LayerTypes.TABLE;
  }

  /**
   * @since 3.8.0
   */
  getFeatureCount() {
    return this.state.featurecount;
  }

  /**
   * @param style
   * 
   * @returns { Promise<Object | void>}
   * 
   * @since 3.8.0
   */
  async getStyleFeatureCount(style) {
    // skip when layer hasn't feature count option set on QGIS project
    if (undefined === this.state.stylesfeaturecount) {
      return;
    }
    if (undefined === this.state.stylesfeaturecount[style]) {
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
  }

  /**
   * @returns { string } layer format (eg. 'image/png') 
   * 
   * @since 3.9.1
   */
  getFormat() {
    return this.config.format ||
      ProjectsRegistry.getCurrentProject().getWmsGetmapFormat() ||
      'image/png'
  }

  /**
   * @since 3.10.0
   */
  openAttributeTable(opts = {}) {
    new (Vue.extend(Table))({ ...opts, layerId: this.state.id });
  }

}

/**
 * [LAYER SELECTION]
 *
 * Base on boolean value create a filter token from server
 * based on selection or delete current filtertoken
 *
 * @param bool
 *
 * @returns {Promise<void>}
 *
 * @deprecated since 3.9.0. Will be removed in 4.x. Use Layer::createFilterToken() and deleteFilterToken(fid) instead
 */
Layer.prototype.activeFilterToken = deprecate(async function(bool) { await this[bool ? 'createFilterToken' : 'deleteFilterToken'](); }, '[G3W-CLIENT] Layer::activeFilterToken(bool) is deprecated');

/**
 * @deprecated since 3.9.0. Will be removed in 4.x. Use Layer::getLayerEditingFormStructure() instead
 */
Layer.prototype.getEditorFormStructure = deprecate(Layer.prototype.getLayerEditingFormStructure, '[G3W-CLIENT] Layer::getEditorFormStructure() is deprecated');

/******************************************************************************************
 * LAYER PROPERTIES
 *****************************************************************************************/

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
  OGC:             "OGC",
  QGIS:            "QGIS",
  Mapserver:       "Mapserver",
  Geoserver:       "Geoserver",
  ARCGISMAPSERVER: "ARCGISMAPSERVER",
  OSM:             "OSM",
  BING:            "Bing",
  LOCAL:           "Local",
  TMS:             "TMS",
  WMS:             "WMS",
  WMTS:            "WMTS",
  G3WSUITE:        "G3WSUITE"
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
  GEOJSON: "geojson",
  /** @since 3.9.0 */
  POSTGRESRASTER: 'postgresraster',
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
 * BACKOMP v3.x
 */
Layer.SELECTION_STATE = SELECTION;

module.exports = Layer;
