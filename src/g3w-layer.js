/**
 * @file
 * 
 * ORIGINAL SOURCE: src/map/layers/layer.js@v4.0.0
 * ORIGINAL SOURCE: src/map/layers/imagelayer.js@v4.0.0
 * ORIGINAL SOURCE: src/map/layers/vectorlayer.js@v4.0.0
 * ORIGINAL SOURCE: src/map/layers/tablelayer.js@v4.0.0
 * ORIGINAL SOURCE: src/utils/parsers/index.js@v4.0.0
 * 
 * @since 4.1.0
 */

import {
  GEOMETRY_FIELDS,
  DOTS_PER_INCH,
  QUERY_POINT_TOLERANCE,
  TIMEOUT,
  G3W_FID,
}                                 from 'g3w-constants';
import Emitter                    from 'g3w-emitter';
import { gettext as _ }           from 'g3w-i18n';
import ApplicationState           from 'g3w-state';
import GUI                        from 'g3w-app';

import Table                      from 'components/Table.vue';

import { saveBlob }               from 'utils/saveBlob';
import { XHR }                    from 'utils/XHR';
import { getCatalogLayerById }    from 'utils/getCatalogLayerById';
import { getScaleFromResolution } from 'utils/getScaleFromResolution';
import { groupBy }                from 'utils/groupBy';
import { is3DGeometry }           from 'utils/is3DGeometry';
import { removeZValue }           from 'utils/removeZValue';
import { sanitizeFidFeature }     from 'utils/sanitizeFidFeature'
import { getUniqueDomId }         from 'utils/getUniqueDomId';

/**
 * Stringify a query URL param (eg. `&WIDTH=700`)
 * 
 * @param name
 * @param value
 * 
 * @returns { string | null } a string if value is set or null
 */
function __(name, value) {
  return [null, undefined].includes(value) ? value : `${name}${value}`;
}

/**
 * Base class for all layers
 * 
 * @example ```js
 * new g3w.Layer(layer)       // create a layer group
 * new g3w.Layer(layer.state) // clone an existing layer
 * ```
 */
export class Layer extends Emitter {

  get config() {
    return this.state;
  }

  set config(value) {
    this.state = value;
  }

  #providers = {};

  /**
   * @TODO check if deprecated
   * 
   * ORIGINAL SOURCE: g3w-client/src/map/layers/featuresstore.js@v4.0.0
   */
  #features = [];

  #relations;

  customParams = {};

  #layersstore;

  #color;
  
  /**
   * @param { Object | Layer } config
   * @param config.id
   * @param config.title
   * @param config.name
   * @param config.origname
   * @param config.multilayer
   * @param config.servertype
   * @param config.source
   * @param config.crs
   * @param config.projection
   * @param config.bbox
   * @param config.capabilities
   * @param config.cache_url
   * @param { string } config.cache_provider since 3.10.0 (eg. "mapproxy")
   * @param config.baselayer
   * @param config.geometrytype
   * @param config.editops
   * @param config.expanded
   * @param config.fields
   * @param config.wmsUrl
   * @param config.infoformat
   * @param config.infourl
   * @param config.maxscale
   * @param config.minscale
   * @param config.visible
   * @param config.scalebasedvisibility
   * @param config.wfscapabilities
   * @param config.ows_method
   * @param config.wms_use_layer_ids
   * @param config.styles
   */
  constructor(config = {}, options = {}) {

    super();

    /**
     * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
     */
    this.setters = [
      'addFeature',
      'setFeatures',
      'change',
    ];

    // lazy init parent layer group (multilayer)
    if (config instanceof Layer) {
      const layer = config;
      config = {
        id:         `layer_${layer.getMultiLayerId()}`,
        projection: ApplicationState.project.getProjection(),
        format:     layer.getFormat(),
        ...(
          layer.isExternalWMS() && "arcgismapserver" === layer.state?.source?.type
          ? layer.state.source                                                                       // ARCGIS Layer (external)
          : {
            type:
              (layer.isCached() && 'tms' === (layer.state.cache_service_type || 'tms') && 'XYZ') ||  // TMS Layer   (cached)
              (layer.isCached() && 'wmts' === layer.state.cache_service_type && 'WMTS') ||           // WMTS Layer  (cached)
              (layer.isExternalWMS() && "wmst" === layer.state?.source?.type && 'WMTS') ||           // WMS-T Layer (external)
              layer.state.type || null,
            url:               layer.isCached()      ? layer.getCacheUrl() : layer.getWmsUrl(),
            http_method:       layer.isExternalWMS() ? 'GET'               : layer.getOwsMethod(),
            extent:            (layer.isCached() && 'tms' === (layer.state.cache_service_type || 'tms') && (layer.state.bbox ? [layer.state.bbox.minx, layer.state.bbox.miny, layer.state.bbox.maxx, layer.state.bbox.maxy] : null)) || layer.state.extent,
            cache_provider:    layer.state.cache_provider,
            cache_layer:       layer.state.cache_layer,
            cache_extent:      layer.state.cache_extent,
            cache_grid:        layer.state.cache_grid,
            cache_grid_extent: layer.state.cache_grid_extent,
          }
        ),
        /** @since 4.1.1 */
        servertype: layer.state.servertype,
        /** @since 4.1.1 */
        source:     layer.state.source,
      };
    }

    const layerType = `${config.servertype} ${config?.source?.type}`;

    // Check Layer Type
    if (!options.TYPE) {

      // TABLE LAYERS
      if ('NoGeometry' === config.geometrytype && [
        "QGIS virtual",
        "QGIS postgres",
        "QGIS mssql",
        "QGIS spatialite",
        "QGIS wfs",
        "QGIS delimitedtext",
        "QGIS oracle",
        "QGIS ogr",
        "QGIS mdal",
      ].includes(layerType)) {
        options.TYPE = 'table';
      }

      //@since 4.0.0 no crs exclude from layer list
      else if (config.geometrytype && 'NoGeometry' !== config.geometrytype && !config.crs) {
        throw 'invalid layer';
      }

      // VECTOR LAYERS
      else if (['OGC wfs', 'G3WSUITE geojson'].includes(layerType) || ["Local", "G3WSUITE"].includes(config.servertype))  {
        options.TYPE = 'vector';
      }

      // RASTER LAYERS
      else if ((
          config.geometrytype && 'NoGeometry' !== config.geometrytype && [
          'OGC wms',
          'QGIS postgresraster',
          "QGIS virtual",
          "QGIS postgres",
          "QGIS mssql",
          "QGIS spatialite",
          "QGIS wfs",
          "QGIS delimitedtext",
          "QGIS oracle",
          "QGIS ogr",
          "QGIS mdal",
          "QGIS arcgisfeatureserver",
        ].includes(layerType)
      ) || (
        !config.geometrytype && [
          'OGC wms',
          'QGIS postgresraster',
          "QGIS wmst",
          "QGIS wcs",
          "QGIS wms",
          "QGIS gdal",
          "QGIS vectortile",
          "QGIS vector-tile",
          "QGIS mdal",
          "QGIS arcgismapserver",
        ].includes(layerType)
      ) || 
      ['OSM', 'Bing', 'TMS', 'ARCGISMAPSERVER', 'WMTS', 'WMS'].includes(config.servertype)
      ) {
        options.TYPE = 'image';
      }

    }

    this.type = options.TYPE;

    // get current project
    const project = options.project || ApplicationState.project;

    // default layer style (layerstree)
    const defaultstyle = config?.styles?.find(s => s.current).name;

    /**
     * Global state
     * 
     * @TODO simplify further, some propertiy names seems to be duplicated
     */
    this.state = Object.assign(config, {
      id:        config.id || getUniqueDomId(),
      title:     config.title || config.name,
      download:  !!config.download,
      baselayer: !!config.baselayer,
      fields:    config.fields || {},

      // URLs to get various type of data
      urls:      {
        query: config.infourl || config.wmsUrl,
        ...(config.urls || {}),
        ...(config.baselayer ? {} : {
            filtertoken: `${window.initConfig.vectorurl}filtertoken/${project.getType()}/${project.getId()}/${config.id}/`,
            data:        `${window.initConfig.vectorurl}data/${project.getType()}/${project.getId()}/${config.id}/`,
            shp:         `${window.initConfig.vectorurl}shp/${project.getType()}/${project.getId()}/${config.id}/`,
            csv:         `${window.initConfig.vectorurl}csv/${project.getType()}/${project.getId()}/${config.id}/`,
            xls:         `${window.initConfig.vectorurl}xls/${project.getType()}/${project.getId()}/${config.id}/`,
            gpx:         `${window.initConfig.vectorurl}gpx/${project.getType()}/${project.getId()}/${config.id}/`,
            gpkg:        `${window.initConfig.vectorurl}gpkg/${project.getType()}/${project.getId()}/${config.id}/`,
            geotiff:     `${window.initConfig.rasterurl}geotiff/${project.getType()}/${project.getId()}/${config.id}/`,
            editing:     `${window.initConfig.vectorurl}editing/${project.getType()}/${project.getId()}/${config.id}/`,
            commit:      `${window.initConfig.vectorurl}commit/${project.getType()}/${project.getId()}/${config.id}/`,
            config:      `${window.initConfig.vectorurl}config/${project.getType()}/${project.getId()}/${config.id}/`,
            unlock:      `${window.initConfig.vectorurl}unlock/${project.getType()}/${project.getId()}/${config.id}/`,
            widget:      {
              unique: `${window.initConfig.vectorurl}widget/unique/data/${project.getType()}/${project.getId()}/${config.id}/`
            },
            /** @since 3.8.0 */
            featurecount:         `${window.initConfig.vectorurl}featurecount/${project.getType()}/${project.getId()}/`,
            editorformstructure : `${window.initConfig.vectorurl}editorformstructure/${project.getType()}/${project.getId()}/`,
            /** @since 3.10.0 */
            pdf:         `/html2pdf/`,
          })
      },

      /** Custom parameters based on a project qgis version */
      ...(config.baselayer ? {} : { searchParams: { I: 0, J: 0 } }),

      map_crs:            project.getProjection()?.getCode(),
      multilayerid:       config.multilayer, //it used to check if a layer can be grouped with other layers (get map tiles, get feature info)
      projection:         config.projection && config?.projection?.getCode() === config?.crs?.epsg ? config.projection : (config.crs ? ApplicationState.projections.get(config.crs) : undefined),
      attributions:       config.attributions,
      selected:           config?.selected ?? false,
      disabled:           config?.disabled ?? false,
      metadata:           config.metadata,
      removable:          config?.removable ?? false,
      source:             config.source,
      styles:             config.styles,
      defaultstyle,
      infoformats:        config?.infoformats ?? [],
      projectLayer:       true,
      geolayer:           "NoGeometry" !== config.geometrytype,
      attributetable:     { pageLength: null },
      visible:            !!config.visible,

      /** state of if is in editing (setted by editing plugin) */
      inediting:          false,

      /** Reactive selection attribute */
      selection:          {
        active:   false,
        fids:     new Set(),
        features: {},      // ol features
      },

      /** Reactive filter attribute */
      filter: {
        active:     false,
        /** @since 3.9.0 whether filter is set from a previously saved filter */
        current:    null,
        /** @since v3.11.0 **/
        pagination: false,
      },

      /** @type { Array<{{ id: string, name: string }}> } since 3.9.0 - array of saved filters */
      filters:            config?.filters ?? [],

      /** @type {number} since 3.8.0 */
      featurecount:       config.featurecount,

      /** @type { boolean | Object<number, number> } since 3.8.0 */
      stylesfeaturecount: config.featurecount && defaultstyle && { [defaultstyle]: config.featurecount },

      /** @type { string } since 3.10.0 */
      name:               config.name,

      /** @type { number } legend item state (expandend or collapsed) in catalog layers (TOC) (since 3.10.0) */
      expanded:           config.expanded,

      /** @type { boolean } since 3.10.0 - whether to show layer on TOC (default: true) */
      toc:                config?.toc ?? true,

      /** @since 4.0.0 */
      legend: config?.legend ?? {
        url:        null,
        loading:    false,
        error:      false,
        /** @deprecated since 3.8. Will be removed in 4.x. Use `expanded` attribute instead */
        show:       true,
        /** used when categories changed (checkbox on TOC) and legend is on TAB */
        change:     false,
        categories: {},
      },

      /** @type { boolean } whether has more than one category's legend (since 4.0.0) */
      categories: config?.categories ?? false,

      /** @type { boolean } since 4.0.0 */
      exclude_from_legend: config?.exclude_from_legend ?? true,

      /** @since 4.0.0 */
      external: config?.source?.external,

      /** @since 4.0.0 */
      bbox: config?.bbox,

      /** @since 4.0.0 checked config attribute is passed by vector layer on editing */
      checked: config.checked ?? !!config.visible,

      /** @since 4.0.0 */
      epsg: config?.crs?.epsg,

      /** @since 4.0.0 */
      hidden: !!config?.hidden,

      /** @since 4.0.0 */
      scalebasedvisibility: !!config?.scalebasedvisibility,

      /** @since 4.0.0 */
      minscale: config.minscale,

      /** @since 4.0.0 */
      maxscale:   config.maxscale,

      /** @since 4.0.0 */
      ows_method: config.ows_method,
   
      /** @type {number} opacity range = [0, 100] (since 3.8) */
      opacity: config.opacity || 100,

      /** cached proxy params (eg. external wms/arcgismapserver server) */
      proxyData: { wms: null, arcgismapserver: null }, 

      /** @since 4.0.0 @type {number } number of preview fields on result */
      max_preview_fields: config.max_preview_fields,

      /** @since 4.1.0 */
      http_method: config.http_method ?? 'GET',

      /** @since 4.1.0 */
      http_params: config.http_params ?? {},
    });
    
    this.layers          = this.state?.layers ?? []; // store enabled layers (wms)
    this.showSpinner     = !!this.state.visible;
    this.extent          = this.state.extent;
    this.projection      = this.state.projection;
    this.layer           = null;

    const relations = project.getRelations().filter(r => [r.referencedLayer, r.referencingLayer].includes(this.getId()));

    /**
     * Layer relations
     */
    this.#relations = {

      /**
       * ORIGINAL SOURCE: src/app/core/relations/relation.js@v3.10.1
       * 
       * Relations store
       * 
       * @type { Relation[] }
       */
      _relations: (relations || []).reduce((relations, config = {}) => {
        const suffix = Date.now();
        /** relation state */
        const state = {
          /** @type { boolean } loading state (for editing purpose) */
          loading:     false,
          /** @type { string } relation id */ 
          id:          config.id       || `id_${suffix}`,
          /** @type { string } relation name */ 
          name:        config.name     || `name_${suffix}`,
          origname:    config.origname || `origname_${suffix}`,
          /** @type { string[] } layerId of father relation */
          father:      config.referencedLayer,
          /** @type { string[] } layerId of child relation */
          child:       config.referencingLayer,
          /** @type { 'MANY' | ONE' | string } relation type */
          type:        config.type,
          /** @since 3.9.0 */
          editable:    config.editable || false,
          /** @type { string } since 3.9.0 - relation prefix (for Relation 1:1) */
          prefix:      config.prefix,
          /** BACKCOMP (g3w-admin < v.3.7.0) - father relation field name */
          fatherField: [].concat(config.fieldRef.referencedField),
          /** BACKCOMP (g3w-admin < v.3.7.0) - child relation layer field name */
          childField:  [].concat(config.fieldRef.referencingField),
        }
        relations[state.id] = Object.assign(new Emitter(config), {
          state,
          getId:          () => state.id,
          setId:          id => state.id = id,
          getName:        () => state.name,
          setName:        n   => state.name = n,
          getChild:       () => state.child,
          getFather:      () => state.father,
          getState:       () => state,
          getType:        () => state.type,
          getFatherField: () => state.fatherField,
          getChildField:  () => state.childField,
          setLoading:     b  => state.loading = !!b,
          isLoading:      () => state.loading,
          isEditable:     () => state.editable,
          getPrefix:      () => state.prefix,
          /** @returns {{ father, child }} relation fields */
          getFields:      () => ({ father: state.fatherField, child: state.childField, }),
          /** @FIXME `state.title` is not defined */
          getTitle:       () => state.title,
          /** @FIXME `state.title` is not defined */
          setTitle:       t => state.title = t,
        });
        return relations;
      }, {}),

      _info: {
        children:     {}, // hashmap: <child_layerId,  Array<father_relationId>>
        fathers:      {}, // hashmap: <father_layerId, Array<child_relationId[]>>
        father_child: {}, // hashmap: <relationKey, relationId>
      },

      /**
       * @returns { number } number of relations
       */
      getLength() { return relations.length; },

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

      getRelationById(id)                        { return this._relations[id]; },
      getArray()                                 { return Object.entries(this._relations).map(r => r[1]); },
      getRelationByFatherChildren(father, child) { return this.getRelationById(this._info.father_child[father + child]); },
      isChild(id)                                { return !!this._info.children[id]; },
      isFather(id)                               { return !!this._info.fathers[id]; },
      hasChildren(layer_id)                      { return (this.getChildren(layer_id) || []).length > 0; },
      hasFathers(layer_id)                       { return (this.getFathers(layer_id) || []).length > 0; },
      /** @returns { Array | null } child layers (IDs) within same relation */
      getChildren(layer_id)                      { return this.isFather(layer_id) ? this._info.fathers[layer_id] : null; },
      /** @returns { Array | null } father layers (IDs) within same relation */
      getFathers(layer_id)                       { return this.isChild(layer_id) ? this._info.children[layer_id] : null; },

    };

    // build relations between layers
    Object
      .entries(this.#relations._relations)
      .forEach(([relationKey, relation]) => {

        let f = relation.getFather();
        let c = relation.getChild();

        this.#relations._info.father_child[f + c] = relationKey;       // relationKey = [father_layerId + child_layerId]
        this.#relations._info.fathers[f]          = this.#relations._info.fathers[f]  || [];
        this.#relations._info.children[c]         = this.#relations._info.children[c] || [];

        this.#relations._info.fathers[f].push(c);
        this.#relations._info.children[c].push(f);
    });

    Object.assign(this.state, {
      openattributetable: this.canShowTable(),
      downloadable:       this.isDownloadable(),
      infoformat:         this.getInfoFormat(),
    });

    this.#layersstore = config.layersstore || null;

    // sanitize source url (ie. discard any reserved WMS params)
    if (this.state?.source?.url && !this.isMulti()) {
      const url = new URL(this.state.source.url);
      ['VERSION', 'REQUEST', 'BBOX', 'LAYERS', 'WIDTH', 'HEIGHT', 'DPI', 'FORMAT', 'CRS' ].forEach(p => {
        this.state.source.url = this.state.source.url
          .replace(`${p.toUpperCase()}=${url.searchParams.get(p.toUpperCase())}`, '')
          .replace(`${p.toLowerCase()}=${url.searchParams.get(p.toLowerCase())}`, '');
      });
    }

    /**
     * @TODO check if unusued
     * 
     * @since 4.1.0
     */
    this.layerId = config.id;

    // BACKCOMP v3.x
    this.toggleFilterToken   = this.toggleToken.bind(this);
    this.getFilterToken      = this.getToken.bind(this);
    this.hasSelectionFid     = this.isSelected.bind(this);
    this.changeCurrentStyle  = this.changeStyle.bind(this);
    this.includeSelectionFid = this.fidsIn.bind();
    this.excludeSelectionFid = this.fidsOut.bind();
  }

  /******************************************************************************************
   * LAYER DOWNLOAD
   *****************************************************************************************/

  /** 
   * @since 4.1.0
   */
  async downloadAsFile(type, { data = {} }) {
    data.filtertoken = this.getToken();

    let url, response;
    switch(type) {
      case 'pdf':
        url       = this.getUrl('pdf');
        response  = url && await fetch(url, {
          body:    JSON.stringify(data),
          method:  'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Expose-Headers': 'Content-Disposition' },
          signal:  AbortSignal.timeout(TIMEOUT),
        });
        break;
      default:
        url       = this.getUrl('shapefile' === type ? 'shp' : type);
        response  = url && await fetch(url, {
          body:     Object.keys(data || {}).reduce((a, k) => { a.append(k, data[k]); return a; }, new FormData()),
          method:  'POST',
          headers: { 'Access-Control-Expose-Headers': 'Content-Disposition' }, // get filename from server
          signal:  AbortSignal.timeout(TIMEOUT),
        });
        break;
    }

    if (!response?.ok) {
      throw (await response.json()).message;
    }

    saveBlob(await response.blob(), response.headers.get('content-disposition'));

  }

  getGeoTIFF({ data = {} } = {}) { return this.downloadAsFile('geotiff',   { data }); }
  getXls({ data = {} } = {})     { return this.downloadAsFile('xls',       { data }); }
  getShp({ data = {} } = {})     { return this.downloadAsFile('shapefile', { data }); }
  getGpx({ data = {} } = {})     { return this.downloadAsFile('gpx',       { data }); }
  getGpkg({ data = {} } = {})    { return this.downloadAsFile('gpkg',      { data }); }
  getCsv({ data = {} } = {})     { return this.downloadAsFile('csv',       { data }); }

  /**
   * @returns { string[] } download formats
   */
  getDownloadFormats()  {
    return Object.entries({
      download:        'shapefile',
      download_gpkg:   'gpkg',
      download_gpx:    'gpx',
      download_csv:    'csv',
      download_xls:    'xls',
      download_raster: 'geotiff',
      download_pdf:    'pdf',
    }).filter(([key]) => this.state[key]).map(([, value]) => value);
  }

  /**
   * @returns { boolean } whether at least one layer has a download format not equal to pdf
   * 
   * @since 3.11.7  
   */
  hasDowloadableRelations() { 
     return !!this.getRelations().getArray()
      .filter(r => 'MANY' === r.getType()) //@since 4.0.6 filter onlye MANY (1:N) relation type. Exclude Join (ONE) relation type
      .find(r => getCatalogLayerById(r.getChild()).getDownloadFormats().filter(f => 'pdf' !== f).length > 0); 
  }
  /**
   * @param download url
   * 
   * @returns { string }
   */
  getDownloadUrl(format) {
    return 'shapefile' === format ? 'shp' : format;
  }

  /**
   * @returns { boolean } whether it has a format to download
   */
  isDownloadable()        { return !!(this.getDownloadFormats().length); }
  isGeoTIFFDownloadable() { return !this.isBaseLayer() && this.state.download && 'gdal' === this.state.source.type ; }
  isShpDownloadable()     { return !this.isBaseLayer() && this.state.download && 'gdal' !== this.state.source.type; }
  isXlsDownloadable()     { return !this.isBaseLayer() && !!this.state.download_xls; }
  isGpxDownloadable()     { return !this.isBaseLayer() && !!this.state.download_gpx; }
  isGpkgDownloadable()    { return !this.isBaseLayer() && !!this.state.download_gpkg; }
  isCsvDownloadable()     { return !this.isBaseLayer() && !!this.state.download_csv; }

  /******************************************************************************************
   * LAYER RELATIONS
   *****************************************************************************************/

  /**
   * @returns {*} relations
   */
  getRelations() {
    return this.#relations;
  }

  /**
   * @param id
   * 
   * @returns {*} relation by id
   */
  getRelationById(id) {
    return this.#relations.getArray().find(r => id === r.getId());
  }

  /**
   * @param relationName
   * 
   * @returns { * | Array } relation fields
   */
  getRelationAttributes(relationName) {
    const relation = this.#relations.find(r => relationName === r.name);
    return relation?.fields ?? [];
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
    return this.getRelations() ? this.#relations.isChild(this.getId()) : false;
  }

  /**
   * @returns { * | boolean } whether layer is a Father of a relation
   */
  isFather() {
    return this.getRelations() ? this.#relations.isFather(this.getId()) : false;
  }

  /**
   * @returns { * |Array } children relations
   */
  getChildren() {
    return this.isFather() ? this.#relations.getChildren(this.getId()) : [];
  }

  /**
   * @returns { * | Array } parents relations
   */
  getFathers() {
    return this.isChild() ? this.#relations.getFathers(this.getId()) : [];
  }

  /**
   * @returns { * | boolean } whether it has children
   */
  hasChildren() {
    return this.hasRelations() ? this.#relations.hasChildren(this.getId()) : false;
  }

  /**
   * @returns { * | boolean } whether it has fathers
   */
  hasFathers() {
    return this.hasRelations() ? this.#relations.hasFathers(this.getId()) : false;
  }

  /**
   * @TODO add description
   */
  hasRelations() {
    return !!this.#relations.getLength();
  }

  /******************************************************************************************
   * LAYER SELECTION
   *****************************************************************************************/

  /**
   * @param fid feature id
   * 
   * @returns { boolean } whether current layer (or fid) is selected
   */
  isSelected(fid) {
    const selection = this.state.selection.fids;
    if (undefined !== fid) {
      if (selection.has('__ALL__'))     { return true }
      if (selection.has('__EXCLUDE__')) { return !selection.has(fid); }
      return selection.has(fid);
    }
    return this.state.selected;
  }

  /**
   * @param { boolean } selected
   */
  setSelected(selected) {
    this.state.selected = selected;
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
    // update selection features (open layers)
    if (this.isGeoLayer()) {
      Object
        .values(this.state.selection.features)
        .forEach(f => {
          try {
            if (!this.state.filter.active && f.selected) {
              GUI.defaultsLayers.selectionLayer.getSource().addFeature(f.feature);
            } else {
              GUI.defaultsLayers.selectionLayer.getSource().removeFeature(f.feature);
            }          
          } catch(e) {
            console.warn(e);
          }
        });
    }
  }

  /**
   * Apply layer filter by fid
   * 
   * @param filter
   */
  async applyToken(filter) {
    if (!this.getProvider('filtertoken')) {
      return;
    }

    // the current filter is set and is different from current
    if (null === this.state.filter.current || filter.fid !== this.state.filter.current.fid ) {
      await this.clearSelectionFids();
      GUI.closeContent();
    }

    try {
      /** @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=apply&fid=<fid_filter_saved>|name=<name_filter_saved> */
      const response = await XHR.get({
        url:    this.getUrl('filtertoken'),
        params: { mode: 'apply', fid: filter.fid }
      });
      if (response?.data) {
        this.setFilter(false);
        this.state.filter.current = filter;
        this.setToken(response.data.filtertoken);
      }
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * @since 3.9.0
   */
  async saveFilter() {

    // skip when ..
    if (!this.getProvider('filtertoken') || !this.state.filter.active) {
      return;
    }

    try {
      /** @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=save&name=<name_filter_saved> */
      const response = await XHR.get({
        url:    this.getUrl('filtertoken'),
        params: {
          mode: 'save',
          name: await GUI.prompt(_('Save Filter'), this.state.filter.current?.name || '')
        }
      });

      // skip when no data return from provider
      if (!response || !response.result || !response.data) {
        return;
      }

      let filter = this.state.filters.find(f => response.data.fid === f.fid);
    
      // add saved filter to filters array
      if (undefined === filter) {
        filter = {
          fid:  response.data.fid, //get fid
          name: response.data.name //get name
        }
        this.state.filters.push(filter);
      }

      this.state.filter.current = filter; // set current filter
      this.setFilter(false);              // set to false
      this.getSelection().active = false; // reset selection to false
      this.state.selection.fids.clear();   // clear current fids

      // remove selection feature from map
      if (this.isGeoLayer()) {
        Object
          .values(this.state.selection.features)
          .forEach(f => {
            f.selected = false;
            GUI.defaultsLayers.selectionLayer.getSource().removeFeature(f.feature);
          });
      }

      this.emit('unselectionall', this.getId());
    } catch (e) {
      console.warn(e);
    }


  }

  /**
   * Toggle filter token on layer
   */
  async toggleToken() {

    //set to handle select or hide ol
    this.setFilter(!this.state.filter.active);

    const has_current = this.state.filter.current;
    const is_active   = this.state.filter.active;

    // there is an active filter --> create a new filter
    if (is_active && !has_current) {
      await this.#createToken();
    }

    // there is an active filter --> create a new filter
    if (has_current && is_active) {
      await this.applyToken(this.state.filter.current);
    }

    // there is no current saved filter --> delete it
    if (!is_active) {
      await this.deleteToken();
      //reset current filter 
      this.state.filter.current = has_current;
    }

    return this.state.filter.active;
  }

  /**
   * Delete filtertoken from server
   * 
   * @param fid  unique id of filter saved to delete
   */
  async deleteToken(fid) {
    try {
      // skip when no filtertoken provider is set
      if (!this.getProvider('filtertoken')) {
        return;
      }

      let filtertoken;
      try {
        // Delete saved filter from server --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete_saved&fid=<fid_filter_saved>|name=<name_filter_saved>`
        // Delete current filter           --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete`
        const response = await XHR.get({
          url:    this.getUrl('filtertoken'),
          params: { fid, mode: undefined === fid ? 'delete': 'delete_saved' }
        });
        // filter token if another layer is filtered otherwise filtertoken is undefined
        if (response && response.result && response.data) {
          filtertoken = response.data.filtertoken;
        }
      } catch(e) {
        console.warn(e);
      }

      // remove it from filters list when deleting a saved filter (since v3.9.0)
      if (undefined !== fid) {
        this.state.filters = this.state.filters.filter(f => fid !== f.fid);
      }
      if (this.state.filter.active && this.state.filter.pagination) {
        this.state.selection.active  = false; //in case of pagination, set selected to false
      }
      this.state.filter.pagination = false; //set pagination to false
      this.state.filter.current    = null  // set current filter set to null
      this.setToken(filtertoken); //set filtertoken 
      // set active filter to false
      if (this.state.filter.active) { this.setFilter(false) }
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * Get Application filter token
   * 
   * @returns {*}
   */
  getToken() {
    return this.state.filter.active ? ApplicationState.tokens.filtertoken : undefined;
  }

  /**
   * Set applicaton filter token
   * 
   * @param {string} filtertoken a string passed by server and used as parameter in XHR request
   *
   * @fires filtertokenchange when filtertoken is changed
   * 
   * @since 4.1.0
   */
  setToken(filtertoken = undefined) {
    ApplicationState.tokens.filtertoken = filtertoken;
    this.setFilter(!!filtertoken);
    this.emit('filtertokenchange', { layerId: this.getId() });
  }

  /**
   * Retrieve filter token from server
   */
  async #createToken() {
    try {

      const selection = this.state.selection.fids;

      // skip when no filter token provider is set or "selection.fids" is empty
      if (!this.getProvider('filtertoken') || !selection.size > 0) {
        return;
      }

      // select all features
      if (selection.has('__ALL__')) {
        try {
          // Delete current filter --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete`
          await XHR.get({ url: this.getUrl('filtertoken'), params: { mode: 'delete' } });
        } catch(e) {
          console.warn(e)
        }
        this.setToken(null);
        return;
      }

      const fids = Array.from(selection);

      const { data = {} } = await XHR.post({
        url:    this.getUrl('filtertoken'),
        contentType: 'application/json',
        data: JSON.stringify(selection.has('__EXCLUDE__')
          ? { fidsout: fids.filter(id => id !== '__EXCLUDE__').join(',') } // exclude features from selection
          : { fidsin: fids.join(',') })                                    // include features in selection
      });

      this.setToken(data.filtertoken);

    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * @TODO add description
   */
  selectAll() {
    this.state.selection.fids.clear();
    this.state.selection.fids.add('__ALL__');

    // select all features (open layers)
    if (this.isGeoLayer()) {
      Object
        .values(this.state.selection.features)
        .forEach(f => {
          try {
            f.selected          = true
            f.feature.__layerId = this.getId(); //@since 4.0.1 need to add layerId. It used to reconize feature selected by layer id
            GUI.defaultsLayers.selectionLayer.getSource().addFeature(f.feature);
          } catch(e) {
            console.warn(e);
          }
        });
    }

    this.state.selection.active = true;

    if (this.state.filter.active) {
      this.#createToken();
    }
  }

  /**
   * Invert current selection fids
   */
  async inverseSelection() {
    const selection = this.state.selection.fids;
    /** @TODO add description */
    if (selection.has('__EXCLUDE__'))  { selection.delete('__EXCLUDE__'); }
    else if (selection.has('__ALL__')) { selection.delete('__ALL__'); }
    else if (selection.size > 0)       { selection.add('__EXCLUDE__'); }
    Object.entries(this.state.selection.features).forEach(([id, f]) => f.selected = (selection.has(id) && !selection.has('__EXCLUDE__') || (selection.has('__EXCLUDE__') && !selection.has(id))));
  }

  /**
   * Include fid feature id to selection
   * 
   * @param fid
   * @param createToken
   * 
   * @returns {Promise<void>}
   */
  async fidsIn(fid, createToken = true) {

    const selection = this.state.selection.fids;

    // whether fid is excluded from selection
    const is_excluded = selection.has('__EXCLUDE__') && selection.has(fid);

    if (is_excluded)                                  { selection.delete(fid) }
    if (!is_excluded)                                 { selection.add(fid) }
    if (is_excluded && 1 === selection.size)          { this.selectAll() }
    if (!is_excluded && !this.state.selection.active) { this.state.selection.active = true; }

    // update selection (state)
    if (this.isGeoLayer() && this.state.selection.features[fid]?.feature) {
      this.state.selection.features[fid].selected          = !(selection.has('__EXCLUDE__') && selection.has(fid));
      this.state.selection.features[fid].feature.__layerId = this.getId();
      if (!this.state.selection.features[fid].selected) {
        GUI.defaultsLayers.selectionLayer.getSource().removeFeature(this.state.selection.features[fid].feature);
      } else if (!this.state.filter.active) { //in case of no filter is active
        GUI.defaultsLayers.selectionLayer.getSource().addFeature(this.state.selection.features[fid].feature);
      }
    }

    /** @TODO add description */
    if (createToken && this.state.filter.active) {
      await this.#createToken();
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
  async fidsOut(fid, createToken = true) {
    const selection = this.state.selection.fids;

    if (selection.has('__ALL__') || 0 === selection.size) { selection.clear(); selection.add('__EXCLUDE__'); }
    if (selection.has('__EXCLUDE__'))                     { selection.add(fid); }
    if (!selection.has('__EXCLUDE__'))                    { selection.delete(fid); }
    if (0 === selection.size)                             { this.clearSelectionFids(); }

    // exclude all → select all ?
    if (1 === selection.size && selection.has('__EXCLUDE__')) {
      selection.clear();
      this.selectAll();
    }

    const is_excluded = selection.has('__EXCLUDE__') ? selection.has(fid) : !selection.has(fid);

    // update selection (state)
    if (this.isGeoLayer() && this.state.selection.features[fid]?.feature) {
      this.state.selection.features[fid].selected          = !is_excluded;
      this.state.selection.features[fid].feature.__layerId = this.getId();
      if (is_excluded) {
        GUI.defaultsLayers.selectionLayer.getSource().removeFeature(this.state.selection.features[fid].feature);
      } else {
        GUI.defaultsLayers.selectionLayer.getSource().addFeature(this.state.selection.features[fid].feature);
      }
    }

    // create filter token
    if (createToken && this.state.filter.active) {
      await this.#createToken();
    }
  }

  /**
   * Clear selection
   */
  async clearSelectionFids() {
    //clear all selection fids from set
    this.state.selection.fids.clear();
    // unselect all features (open layers)
    if (this.isGeoLayer()) {
      Object
        .values(this.state.selection.features)
        .forEach(f => {
          try {
            f.selected          = false
            f.feature.__layerId = this.getId(); //@since 4.0.1 need to add layerId. It used to reconize feature selected by layer id
            GUI.defaultsLayers.selectionLayer.getSource().removeFeature(f.feature);
          } catch(e) {
            console.warn(e);
          }
        });
    }

    this.state.selection.active = false;

    //check if filter is active
    const is_active   = this.state.filter.active;
    const has_current = null !== this.state.filter.current;

    /** @TODO add description */
    if (has_current && is_active) {
      const filter = this.state.filter.current;
      try {
        /** @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=apply&fid=<fid_filter_saved>|name=<name_filter_saved> */
        const response = await XHR.get({
          url:    this.getUrl('filtertoken'),
          params: { mode: 'apply', fid: filter.fid }
        });
        if (response?.data) {
          this.setFilter(false);
          this.state.filter.current = filter;
          this.setToken(response.data.filtertoken);
        }
      } catch(e) {
        console.warn(e);
      }
    }

    /** @TODO add description */
    if (!has_current && is_active) {
      await this.deleteToken();
    }

    this.emit('unselectionall', this.getId());
  }

  /******************************************************************************************
   * LAYER BASE
   *****************************************************************************************/

  /**
   * Clear proxy data
   *
   * @param type
   */
  clearProxyData(type) {
    this.state.proxyData[type] = null;
  }

  /**
   * Send proxy request
   *
   * @param type
   * @param params
   *
   * @returns {Promise<*>}
   */
  async fetchProxyData(type = 'wms', params = {}) {
    let response;
    try {
      // update proxy params
      if (params.changes) {
        Object.keys(params.changes).forEach(c => {
          Object.keys(params.changes[c]).forEach(p => { this.state.proxyData[type][c][p] = params.changes[c][p]; })
        });
        params = this.state.proxyData[type];
      }

      // set url params (GET)
      if ('POST' !== params.method) {
        const url = new URL(params.url);
        Object.entries(params.params).filter(([_,v]) => undefined !== v).forEach(([p,v]) => url.searchParams.set(p, v));
        params.url = url.toString();
      }

      const data = JSON.stringify({
        url:     params.url,
        params:  params.params  ?? {},
        headers: params.headers ?? {},
        method:  params.method  ?? 'GET'
      });

      response = await XHR.post({ data, contentType: 'application/json', url: `${window.initConfig.proxyurl}` });

      this.state.proxyData[type] = JSON.parse(data);
    } catch(e) {
      console.warn(e);
    }
    return response;
  }

  /**
   * [EDITING PLUGIN] Check if layer is in editing
   *
   * @returns { boolean }
   */
  isInEditing() {
    return this.state?.editing?.inediting;
  }

  /**
   * [EDITING PLUGIN] Set editing state
   *
   * @param {boolean} bool
   */
  setInEditing(bool = false) {
    this.state.editing.inediting = bool;
  }

  /**
   * @TODO Add description here
   *
   * @returns {*}
   */
  getSearchParams() {
    return this.state.searchParams;
  }

  /**
   * @TODO Add description
   *
   * @param pageLength
   */
  setAttributeTablePageLength(pageLength) {
    this.state.attributetable.pageLength = pageLength;
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
   * @returns {*|null} source type of layer
   */
  getSourceType() {
    return this.state?.source?.type ?? null;
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
  async getDataTable({
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
    // skip when..
    if (!this.getProvider('filter') && !this.getProvider('data')) {
      return Promise.reject();
    }

    const layerType = `${this.state.servertype} ${this.state?.source?.type}`;
    let response;

    // QGIS - raw layer data (editing)
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
      response = await this.#getFeaturesQGIS({ editing: false }, {
        ...custom_params,
        field,
        page,
        page_size,
        ordering,
        search,
        formatter,
        suggest,
        in_bbox,
        filtertoken: this.getToken(),
      });
    }

    if ('G3WSUITE geojson' === layerType) {
      response = await this.#getFeaturesJSON();
    }

    return {
      title:    this.getTitle(),
      count:    response.count,
      features: response?.data?.features || [],
      headers: this.getAttributes()?.length
        ? this.getAttributes().filter(attr => Object.keys(response?.data?.features?.at(0)?.properties || []).indexOf(attr.name) > -1)
        : Object.keys(response?.data?.features?.at(0)?.properties || []).filter(name => -1 === GEOMETRY_FIELDS.indexOf(name)).map(name => ({ name, label: name })),
    };
  }

  /**
   * Search layer feature by fids
   *
   * @param fids
   * @param formatter
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
      if (response?.result && response?.vector?.data) {
        return response.vector.data.features;
      }
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * Search features (fetch data from server)
   * 
   * @param { Object }    opts
   * @param { boolean }   opts.raw
   * @param { Object }    opts.suggest   - (mandatory): object with key is a field of layer and value is value of the field to filter
   * @param { 0 | 1 }     opts.formatter
   * @param { Array }     opts.field     - Array of object with type of suggest (see above)
   * @param opts.unique
   * @param opts.fformatter         since 3.9.0
   * @param opts.ffield             since 3.9.1
   * @param opts.queryUrl
   * @param opts.ordering
   * @param opts.autofilter         since 3.11.0
   * @param opts.page               since 3.11.0
   * @param opts.page_size          since 3.11.0
   * @param opts.otherquerylayerids since 3.11.0
   */
  async getFilterData({
    raw = false,
    suggest,
    field,
    unique,
    fformatter,
    ffield,
    formatter = 1,
    queryUrl,
    ordering,
    autofilter,
    page,
    page_size,
    otherquerylayerids,
  } = {}) {
    try {
      const response =  await XHR.post({
        url:         queryUrl ? queryUrl : this.getUrl('data'),
        contentType: 'application/json',
        data:        JSON.stringify({
          field,
          suggest,
          ordering,
          formatter,
          unique,
          fformatter,
          ffield,
          filtertoken: ApplicationState.tokens.filtertoken,
          autofilter,
          page,
          page_size,
          otherquerylayerids,
        })
      });

      if (raw)                           { return response }
      if (unique && response.result)     { return response.data }
      if (fformatter && response.result) { return response }

      if (response.result) {
        return {
          data: Layer._parse('application/json', {
            layers:      [this],
            response:    response.vector.data,
            filtertoken: response.filtertoken, // since 3.11.0 - in case of autofilter request
            projections: {
              map: 'table' !== this.getType() ? ApplicationState.project.getProjection() : null,
              layer: null
            },
          }),
          count: response.vector.count, // since 3.11.0 - feature count (pagination)
        }
      }

    } catch(e) {
      console.warn(e);
      return Promise.reject(e);
    }
    return Promise.reject();
  }

  /**
   * search method 
   */
  async search(options = {}, params = {}) {
    options = {
      ...options,
      feature_count: options.feature_count || 10,
      ...this.state.searchParams,
      ...params
    };
    const provider = this.getProvider('search');
  
    if (provider) {
      return await provider.query(options);
    }
    return Promise.reject(_('Layer is not searchable'));
    
  }

  /**
   * Info from layer (only for querable layers) 
   */
  async query(options = {}) {
    const provider = this.getProvider(options.filter ? 'filter' : 'query');
    if (provider) {
      return await provider.query(options);
    }
    return Promise.reject(_('Layer is not querable'));
  }

  /**
   * General way to get an attribute 
   */
  get(property) {
    return this.state[property];
  }

  /**
   * @returns { * | {} } layer fields
   */
  getFields() {
    return this.state.fields;
  }

  /**
   * @returns { Array } only show fields
   */
  getTableFields() {
    return (this.state.fields || []).filter(f => f.show);
  }

  /**
   * @returns { Array } table fields exclude geometry field
   */
  getTableHeaders() {
    return this.getTableFields().filter(f => !GEOMETRY_FIELDS.includes(f.name));
  }

  /**
   * @returns {*} current project
   */
  getProject() {
    return this.state.project;
  }

  /**
   * @returns { Object } layer config
   */
  getConfig() {
    return this.state;
  }

  /**
   *
   * @returns { Array } form structure to show on form editing
   */
  getLayerEditingFormStructure() {
    return this.state.editor_form_structure;
  }

  /**
   * @returns { boolean } whether it has form structure
   */
  hasFormStructure() {
    return !!this.state.editor_form_structure;
  }

  /**
   * @returns custom style (for future implementation)
   */
  getCustomStyle() {
    return this.state.customstyle;
  }

  /**
   * Get state layer
   *
   * @returns {*|{metadata, downloadable: *, attributetable: {pageLength: null}, defaultstyle: *, source, title: *, infoformats: ((function(): *)|*|*[]), featurecount: number, stylesfeaturecount: (number|string|*|{[p: number]: *}), projectLayer: boolean, infoformat: (string|default.watch.infoformat|*), geolayer: boolean, inediting: boolean, disabled: boolean, id: (*|string), selected: boolean, openattributetable: (boolean|boolean), visible: boolean, filters: *[], filter: {current: null, active: boolean}, selection: {active: boolean}, removable: (boolean|*), styles}}
   */
  getState() {
    return this.state;
  }

  /**
   * @returns {*} layer source (ex. ogr, spatialite, etc..)
   */
  getSource() {
    if (this.isMulti()) {
      console.trace('[G3W-LAYER] please use layer.getOLLayer().getSource() instead')
      return this.getOLLayer().getSource();
    }
    return this.state.source;
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
  setHidden(bool = true) {
    this.state.hidden = bool;
  }

  /**
   * @returns {*|string} id
   */
  getId() {
    return this.state.id;
  }

  /**
   * @returns {*} metadata
   */
  getMetadata() {
    return this.state.metadata;
  }

  /**
   * @returns {*} title
   */
  getTitle() {
    return this.state.title;
  }

  /**
   * @returns {*} name
   */
  getName() {
    return this.state.name;
  }

  /**
   * Used by the following plugins "geonotes"
   * 
   * @returns {*} origin name
   */
  getOrigName() {
    return this.state.origname;
  }

  /**
   * @returns { string } Server type
   */
  getServerType() {
    return this.state?.servertype ?? 'QGIS';
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
    return type === this.getType();
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
    return [this].concat(this.layers).some(l => l.state.visible);
  }

  /**
   * @returns { boolean } whether layer is queryable
   */
  isQueryable() {
    return !!(this.state?.capabilities & 1);
  }

  /**
   * @param conditions plain object with configuration layer attribute and value
   * 
   * @returns { boolean } whether layer is filterable
   */
  isFilterable(conditions = null) {
    let isFiltrable = !!(this.state?.capabilities & 2);
    if (isFiltrable && conditions) {
      isFiltrable = Object.keys(conditions).reduce((bool, attribute) => {
        const layer_config_value = this.get(attribute);
        const condition_attribute_values = conditions[attribute];
        return bool && Array.isArray(layer_config_value) ?
          layer_config_value.includes(condition_attribute_values) :
          condition_attribute_values === layer_config_value;
      }, true);
    }
    return isFiltrable;
  }

  /**
   * @returns { boolean } whether layer is set up as time series
   */
  isQtimeseries() {
    return this.state.qtimeseries;
  }

  /**
   * @returns { boolean } whether layer is editable
   */
  isEditable() {
    return !!(this.state?.capabilities & 4);
  }

  /**
   * @returns {*|boolean} whether is a base layer
   */
  isBaseLayer() {
    return this.state.baselayer;
  }

  /**
   * @param type get url by type (data, shp, csv, xls, editing, ...)
   */
  getUrl(type) {
    return this.state.urls[type];
  }

  /**
   * Set config url
   * 
   * @param { Object } url
   * @param url.type
   * @param url.url
   */
  setUrl({ type, url } = {}) {
    this.state.urls[type] = url;
  }

  /**
   * @returns { string }  query url based on type, external or same projection of map
   */
  getQueryUrl() {
    /** @FIXME add description */
    if (this.layers.at(0)?.infourl && '' !== this.layers.at(0).infourl && !this.isXYZ()) {
      return this.layers.at(0).infourl;
    }

    /** @FIXME add description */
    if (this.isMulti() && !this.isXYZ()) {
      return this.state.url;
    }

    /** @FIXME add description */
    if ('QGIS' === this.getServerType() && this.isExternalWMS() && this.state.crs.epsg === this.state.map_crs && this.getInfoFormats()) {
      return this.getSource().url;
    }

    /** @FIXME add description */
    if ('QGIS' === this.getServerType() && this.isExternalWMS() && this.state.crs.epsg === this.state.map_crs) {
      return `${this.state.urls.query}SOURCE=${this.state.source.type}`;
    }

    /** @FIXME add description */
    if (this.isRaster()) {
      return this.state.urls.query;
    }
  }

  /**
   * @TODO Description
   *
   * @param ogcService
   *
   * @returns { default.watch.infoformat | * | string }
   */
  getInfoFormat(ogcService) {
    if (this.isMulti() && !this.isXYZ()) {
      return 'application/vnd.ogc.gml';
    }
    // external arcgismapserver
    if (this.state.infoformat && '' !== this.state.infoformat && this.isArcgisMapserver()) {
      return 'esri/json';
    }
    if (this.state.infoformat && '' !== this.state.infoformat && 'wfs' !== ogcService) {
      return this.state.infoformat;
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
    return this.state.infourl;
  }

  /**
   * @TODO Description
   *
   * @param infoFormat
   */
  setInfoFormat(infoFormat) {
    this.state.infoformat = infoFormat;
  }

  /**
   * @TODO Description
   *
   * @returns {*|{}}
   */
  getAttributes() {
    return this.state.fields;
  }

  /**
   * @TODO Description
   *
   * @param name
   *
   * @returns {*}
   */
  getAttributeLabel(name) {
    return (this.getAttributes().find(a => name === a.name) || {})?.label;
  }

  /**
   * Query by filter
   * 
   * @param { boolean } opts.raw           whether to get raw response
   * @param { number }  opts.feature_count maximum feature for request
   * @param { string }  opts.queryUrl      url for request data
   * @param { Array }   opts.layers        Array or request layers
   * @param opts.I                         wms request parameter 
   * @param opts.J                         wms request parameter 
   */
  async #queryQGIS(opts = {}) {
    const projections = { map: null, layer: null };
  
    const is_table    = 'table' === this.getType();

    // in case not alphanumeric layer set projection
    if (!is_table) {
      projections.map = ApplicationState.project.getProjection() || projections.layer;
    }

    const layers = opts.layers ? opts.layers.map(l => l.getWMSLayerName()).join(',') : this.getWMSLayerName();

    // skip when ..
    if (!opts.filter) {
      return Promise.reject();
    }

    let filter = [].concat(opts.filter)
      // BACKCOMP v3.x
      .map(f => ({ type:  f._type || f.type, value: (f._filter || f.value) }));

    // check if geometry filter. If not i have to remove projection layer
    if ('geometry' !== filter[0].type) {
      projections.layer = null;
    }

    filter = filter.filter(f => f.value);

    const response = await XHR.get({
      url: opts.queryUrl || this.getUrl('query'),
      params: {
        SERVICE:       'WMS',
        VERSION:       '1.3.0',
        REQUEST:       'GetFeatureInfo',
        filtertoken:   ApplicationState.tokens.filtertoken,
        LAYERS:        layers,
        QUERY_LAYERS:  layers,
        INFO_FORMAT:   this.getInfoFormat() || 'application/vnd.ogc.gml',
        FEATURE_COUNT: opts.feature_count || 10,
        CRS:           (is_table ? ApplicationState.map_epsg : projections.map.getCode()),
        I:             opts.I,
        J:             opts.J,
        FILTER:        filter.length ? filter.map(f => f.value).join(';') : undefined,
        WITH_GEOMETRY: !is_table,
      },
    });

    const _layers = undefined === opts.layers ? [this] : opts.layers;

    return opts.raw ? response : Layer._parse(_layers[0].getInfoFormat(), {
      response,
      projections,
      layers:      _layers,
      wms:         true,
    });

  }

  /** Load editing features (Read / Write) */
  async #getFeaturesQGIS(options = {}, params = {}) {
    // filter null values
    Object.entries(params).forEach(([key, value]) => { if ([null, undefined].includes(value)) { delete params[key]; } });

    // editing mode
    if (options.editing) {
      return await GUI.getPlugin('editing').fetchVectorData(this, options, params);
    }

    // read mode
    const response = await XHR.post({
      url:         this.getUrl('data'),
      data:        JSON.stringify(params),
      contentType: 'application/json',
    });

    return {
      data:  response.vector.data,
      count: response.vector.count
    };
  }

  async #getFeaturesJSON(opts = {}) {
    return (new ol.format.GeoJSON()).readFeatures(
      opts.data || (await XHR.get({ url: opts.url || this.state.source.url })).results, {
      featureProjection: opts.mapProjection,
      dataProjection:    opts.projection || 'EPSG:4326',
    })
  }

  async #queryG3W(opts = {}, params = {}) {
    //@since 4.1.0 add pagination params
    params.autofilter = opts.autofilter;
    params.page       = opts.page;
    params.page_size  = opts.page_size;
    params.page       = opts.page;
    
    switch(opts?.filter?.type) {
      case 'bbox':
      case 'geometry':
        params.geo_filter_mode = 'within' === opts.filter.config.spatialMethod ? 'contains' : (opts.filter.config.spatialMethod || 'intersects');
        params.geo_filter_wkt  = (new ol.format.WKT({ dataProjection: ApplicationState.map_epsg, featureProjection: ApplicationState.map_epsg })).writeFeature(new ol.Feature({ geometry: opts.filter.value }));
        params.formatter       = 1;
        params.filtertoken     = ApplicationState.tokens.filtertoken; // add filtertoken
        break;
      case 'expression':
        break;    
    }

    const data  = [];
    let count   = 0;
    try {
      const response = await XHR.post({ 
        url:         this.getUrl('data'),
        contentType: 'application/json',
        data:        JSON.stringify(params),
      });
      if (response?.result) {
        count  = response?.vector?.count;
        data.push({ 
          layer:    this,
          features: Layer._parse('g3w-vector/json',
            response?.vector?.data || {},
            { projections: { map: ApplicationState.project.getProjection() || this.getProjection(), layer: null }}
          ).map(f => { f.set(G3W_FID, f.getId()); return f; }) // set g3w_fid to have G3W_FID property,
        })
      } else {
        throw response.error;
      }
    } catch(e) {
      console.warn(e);
    }

    return { count, data, params }
  }

  /**
   * Retrieve external features (remote ARCGIS Server)
   *
   * @since 4.1.1
   */
  async #queryArcGIS(opts = {}) {
     const {
      layers         = [this],
      size          = [101, 101],
      coordinates   = [],
      resolution,
    } = opts;

     // get extent for view size
     const dx         = resolution * size[0] / 2;
     const dy         = resolution * size[1] / 2;
     const bbox       = [coordinates[0] - dx, coordinates[1] - dy, coordinates[0] + dx, coordinates[1] + dy];
     const projection = ApplicationState.project.getProjection() || this.getProjection();
     const [x, y]     = ('ne' === projection.getAxisOrientation().substr(0, 2) ? [coordinates[1], coordinates[0]] : coordinates);
     const tolerance  = opts.query_point_tolerance ?? QUERY_POINT_TOLERANCE;

    let response;

    try {
      response = await layers[0].fetchProxyData('arcgismapserver', {
        // ref: https://developers.arcgis.com/rest/services-reference/enterprise/identify-map-service/
        url: `${layers[0].getQueryUrl()}/identify`,
        params: {
          f:            "json",
          geometryType: "esriGeometryPoint",
          geometry:     `{x: ${x}, y: ${y}}`,
          layers:       `all:${(layers.map(l => l.getWMSInfoLayerName()) ?? []).join(',')}`,
          imageDisplay: `${GUI.getMap().getSize().join(',')},${DOTS_PER_INCH}`,
          mapExtent:    ('ne' === projection.getAxisOrientation().substr(0, 2) ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox).join(','),
          tolerance:    'map' === tolerance.unit ? undefined : tolerance.value
        },
        method: layers[0].getOwsMethod(),
        headers: {
          'Content-Type': layers[0].getInfoFormat()
        }
      });
    } catch(e) {
      console.warn(e);
    }

    return {
      data: Layer._parse(layers[0].getInfoFormat(), {
        response,
        layers,
        wms:         true,
        projections: { map: ApplicationState.project.getProjection(), layer: this.getProjection() },
      }),
      query: { coordinates, resolution }
    };
  }


  #queryWMS(opts = {}) {
    const {
      layers        = [this],
      size          = [101, 101],
      coordinates   = [],
      resolution,
    } = opts;

    // get extent for view size
    const dx   = resolution * size[0] / 2;
    const dy   = resolution * size[1] / 2;
    const bbox = [coordinates[0] - dx, coordinates[1] - dy, coordinates[0] + dx, coordinates[1] + dy];

    const projection = ApplicationState.project.getProjection() || this.getProjection();
    const tolerance  = opts.query_point_tolerance ?? QUERY_POINT_TOLERANCE;

    const url    = layers[0].getQueryUrl();
    const method = layers[0].getOwsMethod();
    const proxy  = layers[0].useProxy();
    const source = (url || '').split('SOURCE');

    // base request
    const params = {
      SERVICE:              'WMS',
      VERSION:              '1.3.0',
      REQUEST:              'GetFeatureInfo',
      CRS:                  projection.getCode(),
      LAYERS:               (layers || [this.getWMSInfoLayerName()]).map(l => l.getWMSInfoLayerName()).join(','),
      QUERY_LAYERS:         (layers || [this.getWMSInfoLayerName()]).map(l => l.getWMSInfoLayerName()).join(','),
      filtertoken:          ApplicationState.tokens.filtertoken,
      INFO_FORMAT:          this.getInfoFormat() || 'application/vnd.ogc.gml',
      FEATURE_COUNT:        opts.feature_count ?? 10,
      WITH_GEOMETRY:        true,
      DPI:                  DOTS_PER_INCH,
      FILTER_GEOM:          'map' === tolerance.unit ? (new ol.format.WKT()).writeGeometry(ol.geom.Polygon.fromCircle(new ol.geom.Circle(coordinates, tolerance.value))) : undefined,
      FI_POINT_TOLERANCE:   'map' === tolerance.unit ? undefined : tolerance.value,
      FI_LINE_TOLERANCE:    'map' === tolerance.unit ? undefined : tolerance.value,
      FI_POLYGON_TOLERANCE: 'map' === tolerance.unit ? undefined : tolerance.value,
      G3W_TOLERANCE:        'map' === tolerance.unit ? undefined : tolerance.value * resolution,
      I:                    'map' === tolerance.unit ? undefined : Math.floor((coordinates[0] - bbox[0]) / resolution), // x
      J:                    'map' === tolerance.unit ? undefined : Math.floor((bbox[3] - coordinates[1]) / resolution), // y
      WIDTH:                size[0],
      HEIGHT:               size[1],
      STYLES:               (layers || []).map(l => l.getStyle()).join(','),
      BBOX:                 ('ne' === projection.getAxisOrientation().substr(0, 2) ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox).join(','),
      // HOTFIX for GetFeatureInfo requests and feature layer categories that are not visible (unchecked) at QGIS project setting
      LEGEND_ON:            layers.flatMap(l => this.#get_legend_params(l).LEGEND_ON).filter(Boolean).join(';')  || undefined,
      LEGEND_OFF:           layers.flatMap(l => this.#get_legend_params(l).LEGEND_OFF).filter(Boolean).join(';') || undefined,
      SOURCE:               (!proxy && 'GET' === method && source.length > 1) ? source[1] : undefined,
    };

    let timer;

    // promise with timeout
    return Promise.race([
      new Promise(res => { timer = setTimeout(() => { res({
        data:  (layers || []).map(layer => ({ layer, rawdata: 'timeout' })),
        query: { coordinates, resolution },
      }); }, TIMEOUT) }),
      (async () => {
        try {
          let response;

          if (proxy) {
            response = await layers[0].fetchProxyData('wms', { url, params, method, headers: { 'Content-Type': params.INFO_FORMAT } });
          } else if ('GET' === method) {
            let uri = (source.length ? source[0] : url).replace(/[?&]$/, ''); // remove any trailing ? or &
            response = await XHR.get({
              url: uri + (uri.indexOf('?') === -1 ? '?' : '&') + Object.keys(params)
              .filter(k => ![undefined, null].includes(params[k])) // skip null and undefined params
              .map(k =>k + '=' + encodeURIComponent(params[k]))
              .join('&')
            });
          } else if ('POST' === method) {
            response = await XHR.post({ url, data: params });
          } else {
            console.warn('unsupported method: ', method);
          }
          return {
            data: Layer._parse(layers[0].getInfoFormat(), {
              response,
              layers,
              wms:         true,
              projections: { map: projection, layer: null },
            }),
            query: { coordinates, resolution }
          };
        } finally {
          if (!proxy) {
            clearTimeout(timer)
          }
        }
      })(),
    ]);

  }

  /**
   * @param { 'data' | 'filter' | 'filtertoken' |'query' | 'search' } type data provider
   * 
   * @returns provider by type
   */
  getProvider(type) {
    if (this.#providers[type]) {
      return this.#providers[type]; 
    }
    const providerType = `${type} ${this.state.servertype} ${this.state?.source?.type}`;
    const provider = {
      getLayer:    () => this,
      query:       () => [],
      getFeatures: (() => console.log('overwriteby single provider')),
    };

    // QGIS - raw layer data (editing)
    if ([
      'data QGIS virtual',       'search QGIS virtual',            'filtertoken QGIS virtual',
      'data QGIS postgres',      'search QGIS postgres',           'filtertoken QGIS postgres',
      'data QGIS oracle',        'search QGIS oracle',             'filtertoken QGIS oracle',
      'data QGIS mssql',         'search QGIS mssql',              'filtertoken QGIS mssql',
      'data QGIS spatialite',    'search QGIS spatialite',         'filtertoken QGIS spatialite',
      'data QGIS ogr',           'search QGIS ogr',                'filtertoken QGIS ogr',
      'data QGIS delimitedtext', 'search QGIS delimitedtext',      'filtertoken QGIS delimitedtext',
      'data QGIS wfs',           'search QGIS wfs',
                                 'search QGIS arcgisfeatureserver'
    ].includes(providerType)) {
      provider.getFeatures = this.#getFeaturesQGIS.bind(this);
      provider.query       = this.#queryQGIS.bind(this);
      provider.getConfig   = () => XHR.get({ url: this.getUrl('config') });
    }

    // GEOJSON
    if (['data G3WSUITE geojson', 'query G3WSUITE geojson'].includes(providerType)) {
      provider.getFeatures = this.#getFeaturesJSON.bind(this);
    }

    // G3W - since 3.11.7 (see: https://github.com/g3w-suite/g3w-admin/issues/1070)
    if ([
      'filter QGIS virtual',
      'filter QGIS postgres',
      'filter QGIS oracle',
      'filter QGIS mssql',
      'filter QGIS spatialite',
      'filter QGIS ogr',
      'filter QGIS delimitedtext',
      'filter QGIS wfs',
      'filter QGIS wmst',
      'filter QGIS wcs',
      'filter QGIS wms',
      "filter QGIS arcgisfeatureserver",
    ].includes(providerType)) {
      provider.query = this.#queryG3W.bind(this);
    }

    // WMS
    if ([
      'query QGIS virtual',
      'query QGIS postgres',
      'query QGIS oracle',
      'query QGIS mssql',
      'query QGIS spatialite',
      'query QGIS ogr',
      'query QGIS delimitedtext',
      'query QGIS wfs',
      'query QGIS wmst',
      'query QGIS wcs',
      'query QGIS wms',
      'query QGIS gdal',
      /** @since 3.9.0 */
      'query QGIS postgresraster',
      'query QGIS vector-tile',
      'query QGIS vectortile',
      /** @since 4.0.0 */
      'query QGIS arcgisfeatureserver',
      'query QGIS mdal',
      'query OGC wms',
    ].includes(providerType)) {
      provider.query = this.#queryWMS.bind(this);
    }

    // external arcgis mapserver
    if ('query QGIS arcgismapserver' === providerType && this.state?.source?.external) {
      provider.query = this.#queryArcGIS.bind(this);
    }

    // internal arcgis mapserver
    if ('query QGIS arcgismapserver' === providerType && !this.state?.source?.external) {
      provider.query = this.#queryWMS.bind(this);
    }

    return (this.#providers[type] = provider);
  }

  /**
   * @TODO Description
   *
   * @returns {*}
   */
  getLayersStore() {
    return this.#layersstore;
  }

  /**
   * @returns { boolean } whether is possible to show attributes table 
   */
  canShowTable() {
    return (
      !this.state.not_show_attributes_table && !this.isBaseLayer() && 
      (
        (this.isQueryable() && this.getTableFields().length > 0 && ["QGIS postgres", "QGIS oracle", "QGIS wfs", "QGIS ogr", "QGIS mssql", "QGIS spatialite"].includes(`${this.getServerType()} ${this.state.source.type}`))
        || ('G3WSUITE geojson' === `${this.getServerType()} ${this.state.source?.type}`)
        || (this.isFilterable() && 'G3WSUITE' !== this.getServerType())
      )
    );
  }

  /**
   * Used by the following plugins: "law"
   */
  changeConfigFieldType({ name, type, options = {}, reset = false, }) {
    const field = this.getFields().find(f => name === f.name);
    if (field && reset) {
      field.type = field._type;
      delete field._type;
      delete field[`${type}options`];
      return field.type;
    }

    if (field && !reset) {
      field._type             = field.type;
      field.type              = type;
      field[`${type}options`] = options;
      return field._type;
    }
  }

  /**
   * Function called in case of change project to remove all stored information 
   */
  clear() {}

  /**
   * @since 4.1.0
   */
  isRaster() {
    return 'image' === this.getType();
  }

  /**
   * @returns {boolean} whether is a vector layer
   */
  isVector() {
    return 'vector' === this.getType();
  }

  /**
   * @returns {boolean} whether is a table layer
   */
  isTable() {
    return 'table' === this.getType();
  }

  /**
   * @since 3.8.0
   */
  getFeatureCount() {
    return this.state.featurecount;
  }

  /**
   * Change featurecount and editor form structure for a specific style
   * 
   * @param style
   * 
   * @returns { Promise<boolean> } true = style change; false = no style changed 
   * 
   * @since 4.1.0
   */
  async changeStyle(style) {
    try {
      const { current } = (this.config.styles.find(s => style === s.name) || {});
      // skip if style is currently set on layer
      if (current) {
        return;
      }

      // get feature count (skipped when layer hasn't feature count option set on QGIS project)
      if (undefined !== this.state.stylesfeaturecount && undefined === this.state.stylesfeaturecount[style]) {
          const { result, data } = await XHR.post({
            url:          `${this.state.urls.featurecount}${this.getId()}/`,
            data:         JSON.stringify({ style }),
            contentType: 'application/json'
          });
          this.state.stylesfeaturecount[style] = (true === result ? data : {});
      }

      // set current feature count
      if (undefined !== this.state.stylesfeaturecount) {
        this.state.featurecount = this.state.stylesfeaturecount[style];
      }

      // get editor form structure
      const { result, data = {} } = await XHR.post({
        url:          `${this.state.urls.editorformstructure}${this.getId()}/`,
        data:         JSON.stringify({ style }),
        contentType: 'application/json'
      });

      // set form structure
      if (result) {
        this.state.editor_form_structure  = data?.editor_form_structure;
        this.state.fields                 = data?.fields || this.state.fields; // @since 4.0.1 get fields from server (maybe are changed)
        this.state.scalebasedvisibility   = data?.scalebasedvisibility;
        this.state.minscale               = data?.minscale;
        this.state.maxscale               = data?.maxscale;
      }

      // set as current style
      this.state.styles.forEach(s => s.current = style === s.name);

      this.change();

      return true;
    } catch(e) {
      console.warn(e);
      this.state.stylesfeaturecount[style] = {};
    }

    /**@since 4.0.7 in case of categories need to set style true change */
    if (current && (this.getCategories() || []).length > 1) {
      return true;
    }

    return false;
  }

  /**
   * @returns { string } layer format (eg. 'image/png') 
   * 
   * @since 3.9.1
   */
  getFormat() {
    if (this.isRaster() && this.isExternalWMS() && this.getSource()) {
      return this.getSource().format;
    }
    return this.state.format || ApplicationState.project.state.wms_getmap_format || 'image/png';
  }

  /**
   * @since 3.10.0
   */
  openAttributeTable(opts = {}) {
    new (Vue.extend(Table))({ ...opts, layerId: this.state.id });
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * Set layer categories legend
   * 
   * @param { Array } categories
   * 
   * @since 4.0.0
   */
  setCategories(categories = []) {
    this.state.legend.categories[this.getCurrentStyle().name] = categories;
    //set categories state attribute to true only if exist at least a rule key
    this.state.categories = (categories || []).filter(category => category.ruleKey).length > 0;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * @returns legend categories of layer
   * 
   * @param { Array } categories
   * 
   * @since 4.0.0
   */
  getCategories() {
    return this.state.legend.categories[this.getCurrentStyle().name];
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * Clear all categories
   *
   * @since 4.0.0
   */
  clearCategories() {
    this.state.legend.categories = {};
    this.state.categories        = false;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * Set layer legend item `checked` state (TOC)
   *
   * @param { boolean } bool
   *
   * @since 4.0.0
   */
  setChecked(bool) {
    this.state.checked = bool;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @returns { boolean } whether layer legend item is checked (TOC)
   *
   * @since 4.0.0
   */
  isChecked() {
    return this.state.checked;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @param { Boolean } bool
   * 
   * @returns {*} whether visiblitity is disabled (based on scalevisibility) and checked on toc
   *
   * @since 4.0.0
   */
  setVisible(bool) {
    const visible  = this.state.visible;
    this.state.visible = bool && (this.isBaseLayer() || this.isChecked());
    // emit 'change' event
    if (visible !== this.state.visible) {
      this.change();
    }
    return this.state.visible;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  isPrintable({ scale } = {}) {
    // find out if layer and all parents are checked
    let checked = this.isChecked();
    if (checked) {
      let parentGroup = this.state.parentGroup;
      //loop from bottom to top
      while(checked && parentGroup) {
        checked     = checked && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
    }
    return checked
      && (
        !this.state.scalebasedvisibility
        || (scale >= this.state.maxscale && scale <= this.state.minscale)
      );
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * @returns style for layer
   *
   * @since 4.0.0
   */
  getStyles() {
    return this.state.source.external ? this.state.source.styles : this.state.styles;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getStyle() {
    return this.state.source.external ? this.state.source.styles : this.state.styles ? this.state.styles.find(s => s.current).name : '';
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * @returns { number } transparency property
   *
   * @since 4.0.0
   */
  getOpacity() {
    return this.state.opacity;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getCurrentStyle() {
    return this.state.styles.find(s => s.current);
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * Disable layer by check scalevisibility configuration value
   *
   * @param resolution
   * @param mapUnits
   *
   * @since 4.0.0
   */
  setDisabled(resolution, mapUnits = 'm') {
    if ('boolean' === typeof resolution) {
      return this.state.disabled = resolution;
    }
    if (this.state.scalebasedvisibility) {
      const mapScale      = getScaleFromResolution(resolution, mapUnits);
      this.state.disabled = !(mapScale >= this.state.maxscale && mapScale <= this.state.minscale);
      this.state.disabled = this.state.minscale === 0 ? !(mapScale >= this.state.maxscale) : this.state.disabled;
      // needed to check if call setVisible is change disable property
      // looping through parentfolter checked
      let setVisible  = true;
      let parentGroup = this.state.parentGroup;
      while (parentGroup) {
        setVisible  = setVisible && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
      if (setVisible) {
        this.setVisible(!this.state.disabled);
      }
    } else {
      this.state.disabled = false;
    }
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getMultiLayerId() {
    return this.state.multilayerid;
  }

  /**
   * @returns { boolean } whether current layer is a parent layer (ie. a special layer used to group `getMap` requests)
   * @since 4.1.0
   */
  isMulti() {
    return undefined !== this.config.type;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getGeometryType() {
    return this.state.geometrytype;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * ORIGINAL SOURCE: src/map/layers/imagelayer.js@v4.0.0
   *
   * @see https://github.com/g3w-suite/g3w-client/issues/616
   * 
   * forces to `GET` when wms layer is external or query url isn't a qgis server endpoint (ie. doesn't start with `/ows/`).
   * 
   * @since 4.0.0
   */
  getOwsMethod() {
    if (this.isRaster()) {
      return this.isExternalWMS() || !/^\/ows/.test((new URL(this.getQueryUrl(), window.initConfig.baseurl)).pathname)
        ? 'GET'
        : this.state.ows_method;
    }
    return this.state.ows_method;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  setProjection(crs = {}) {
    this.state.projection = ApplicationState.projections.get(crs);
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getProjection() {
    return this.state.projection;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getEpsg() {
    return this.state.crs.epsg;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getCrs() {
    if (this.isRaster()) {
      return this.state.crs.epsg;
    }
    return this.state.projection ? this.state.projection.getCode() : null;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  isCached() {
    return this.state.cache_url && '' !== this.state.cache_url;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getCacheUrl() {
    // mapproxy provider → cache_url already contains "{z}/{x}/{-y}.png"
    if (this.isCached() && this.state.cache_provider && 'mapproxy' === this.state.cache_provider) {
      return this.state.cache_url;
    }
    if (this.isCached()) {
      return `${this.state.cache_url}/{z}/{x}/{y}.png`;
    }
  }

  /**
   * @returns { string } wms layer name for wms request
   */
  getWMSLayerName({ type = 'map' } = {}) {
    if (this.isRaster()) {
      const source_layer = this.state?.source?.layers ?? this.state?.source?.layer;

      /** @FIXME add description */
      if (source_layer && this.#hasExternalWMSOrLegend(type)) {
        return source_layer;
      }

    }
    return this.state.wms_use_layer_ids ? this.getId() : this.getName();
  }

  /**
   * @since 4.1.0
   */
  getColor() {
    return this.#color;
  }

  /**
   * @since 4.1.0
   */
  setColor(color) {
    this.#color = color;
  }

  /**
   * @since 4.1.0 
   */
  addFeature(feature) {
    console.trace('[G3W-LAYER] addFeature is deprecated?');
    this.#features.push(feature);
  }

  /**
   * @TODO check if it unusued
   * 
   * @since 4.1.0
   */
  setFeatures(features = []) {
    console.trace('[G3W-LAYER] setFeatures is deprecated?');
    this.#features = features;
  }
  /**
   * @since 4.1.0
   */
  readFeatures() {
    console.trace('[G3W-LAYER] readFeatures is deprecated?');
    return this.#features;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * 
   * @since 4.1.0
   */
  getEditor() {
    return this._editor;
  }

  /**
   * @TODO Move it on  https://github.com/g3w-suite/g3w-client-plugin-editing
   * 
   * @since 4.1.0
   */
  isStarted() {
    return this._editor?.isStarted()
  }

  /**
   * @since 4.1.0
   */
  addFeatures(features = []) {
    features.forEach(f => this.addFeature(f));
  }

  /**
   * @since 4.1.0
   */
  change() {}

  /**
   * @since 4.1.0
   */
  isWMS() {
    return this.isRaster() && ['QGIS', 'Mapserver', 'Geoserver', 'OGC'].includes(this.state.servertype);
  }

  /**
   * @since 4.1.0
   */
  isXYZ() {
    return 'XYZ' === this.config.type;
  }

  /**
   * @since 4.1.0
   */
  isExternalWMS() {
    return this.isRaster() && !!(this.state.source && this.state.source.external && this.state.source.url);
  }

  /**
   * @since 4.1.0
   */
  isArcgisMapserver() {
    return this.isRaster() && this.isExternalWMS() && "arcgismapserver" === this.state.source.type;
  }

  /**
   * @since 4.1.0
   */
  #hasExternalWMSOrLegend(type = 'map') {
    return (
        this.isRaster() &&
        this.state.source && (
        ('map'    !== type || (this.isExternalWMS() && this.state.crs.epsg === this.state.map_crs)) &&
        ('legend' !== type || this.state.source.external)
      )
    );
  }

  /**
   * @param opts
   * @param { 'map' | 'legend' } opts.type 
   * 
   * @since 4.1.0
   */
  getWmsUrl({ type = 'map' } = {}) {
    if (!this.isRaster()) {
      return;
    }

    /** @FIXME add description */
    if (this.state?.source?.url && this.#hasExternalWMSOrLegend(type) && ['wms', 'wmst'].includes(this.state?.source?.type)) {
      return this.state.source.url;
    }

    return this.state.wmsUrl;
  }

  /**
   * @since 4.1.0
   */
  getWFSLayerName() {
    return this.isRaster() && (this.state.infolayer || this.getName()).replace(/\s/g, '_').replaceAll( ':', '-' );
  }

  /**
   * @since 4.1.0
   */
  useProxy() {
    return this.isExternalWMS() && this.state.crs.epsg === this.state.map_crs && this.getInfoFormats();
  }

  /**
   * @since 4.1.0
   */
  getWMSInfoLayerName() {
    if (!this.isRaster()) {
      return;
    }
    if (this.useProxy()) {
      return this.getSource().layers ?? [this.getSource().layer]; // FALLBACK: for external ArcGIS server (source)
    }
    if (this.state.wms_use_layer_ids) {
      return this.getId();
    }
    return this.getName();
  }

  /**
   * @since 4.1.0
   */
  isWfsActive() {
    return this.isRaster() && Array.isArray(this.state.ows) && this.state.ows.some(t => 'WFS' === t);
  }

  /**
   * @since 4.1.0
   */
  getWfsUrl() {
    return this.isRaster() && (ApplicationState.project.state.metadata.wms_url || this.state.wmsUrl);
  }

  /**
   * Retrieve legend url (ARCGISMAPSERVER or WMS)
   * 
   * ORIGINAL SOURCE: src/app/core/layers/legend/legendservice.js@3.8.5
   * 
   * @param { boolean }                                    opts.categories whether layer has categories
   * @param { boolean }                                    opts.all        whether to show all categories (disables filter by map's BBOX).
   * @param { 'application/json' | 'image/png' | string }  opts.format     MIME Type used to set format of legend:
   *                                                                          - `application/json`: if request from layers categories (icon and label),
   *                                                                          - `image/png`: if request from legend tab
   * 
   * @see https://docs.qgis.org/3.28/en/docs/server_manual/services/wms.html#getlegendgraphics
   * 
   * @since 4.1.0
   */
  getLegendUrl(params = {}, opts = { categories: false,  all: false, format: 'image/png', }) {
    if (!this.isRaster()) {
      return;
    }

    let base_url, url_params;

    let {
      width,
      height,
      color       = "white",
      fontsize    = 10,
      transparent = true,
      boxspace,
      layerspace,
      layertitle  = true,
      layertitlespace,
      symbolspace,
      iconlabelspace,
      symbolwidth,
      symbolheight,
      itemfontfamily,
      layerfontfamily,
      layerfontbold,
      itemfontbold,
      itemfontsize,     //@since 3.11.3
      layerfontitalic,
      layerfontsize,    //@since 3.11.3
      showfeaturecount, //@since 3.11.3
      itemfontitalic,
      rulelabel,
      crs,
      bbox,
      sld_version = '1.1.0',
    } = {
      ...params,
      ...this.customParams
    };

    /**
     * ARCGIS Server
     * 
     * ORIGINAL SOURCE: src/app/core/layers/legend/arcgismapserverlegend.js@3.8.5
     */
    if (this.isArcgisMapserver()) {
      base_url   = this.getConfig().source.url.replace('/rest/', '/') + '/WMSServer';
      url_params = [
        'request=GetLegendGraphic',
        'version=1.3.0',
        'format=image/png',
        `LAYER=${this.getConfig().source.layer}`,
      ];
    }

    /**
     * WMS Server
     * 
     * ORIGINAL SOURCE: src/app/core/layers/legend/wmslegend.js@3.8.5
     */
    else {
      const ctx_legend = (
        opts.categories && (['image/png', undefined].includes(opts.format) || ApplicationState.project.state.context_base_legend)
          ? this.#get_legend_params(this)
          : undefined // disabled when `FORMAT=application/json` (otherwise it creates some strange behaviour on WMS `getMap` when switching between layer styles)
      );
      base_url   = this.getWmsUrl({ type: 'legend' });
      url_params = [
        'SERVICE=WMS',
        'VERSION=1.3.0',
        'REQUEST=GetLegendGraphic',
        __('SLD_VERSION=',      sld_version),
        __('WIDTH=',            width),
        __('HEIGHT=',           height),
        __('FORMAT=',           (undefined === opts.format ? 'image/png' : opts.format)),
        __('TRANSPARENT=',      transparent),
        __('ITEMFONTCOLOR=',    color),
        __('LAYERFONTCOLOR=',   color),
        __('LAYERTITLE=',       layertitle),
        __('ITEMFONTSIZE=',     itemfontsize || fontsize), //@since 3.11.3 check itemfontsize or fontsize
        __('CRS=',              crs),
        __('BBOX=',             ((true === opts.all ? undefined : [false, undefined].includes(opts.all) && bbox && bbox.join(',')))),
        __('BOXSPACE=',         boxspace),
        __('LAYERSPACE=',       layerspace),
        __('LAYERTITLESPACE=',  layertitlespace),
        __('SYMBOLSPACE=',      symbolspace),
        __('ICONLABELSPACE=',   iconlabelspace),
        __('SYMBOLWIDTH=',      (opts.categories && 'application/json' === opts.format ? 16 : symbolwidth)),
        __('SYMBOLHEIGHT=',     (opts.categories && 'application/json' === opts.format ? 16 : symbolheight)),
        __('LAYERFONTFAMILY=',  layerfontfamily),
        __('ITEMFONTFAMILY=',   itemfontfamily),
        __('LAYERFONTBOLD=',    layerfontbold),
        __('ITEMFONTBOLD=',     itemfontbold),
        __('LAYERFONTITALIC=',  layerfontitalic),
        __('LAYERFONTSIZE=',    layerfontsize),    //@since 3.11.3
        __('SHOWFEATURECOUNT=', showfeaturecount), //@since 3.11.3
        __('ITEMFONTITALIC=',   itemfontitalic),
        __('RULELABEL=',        rulelabel ?? 'auto'),
        __('LEGEND_ON=',        ctx_legend && ctx_legend.LEGEND_ON),
        __('LEGEND_OFF=',       ctx_legend && ctx_legend.LEGEND_OFF),
        __('STYLES=',           (opts.categories && 'application/json' === opts.format ? encodeURIComponent(this.getCurrentStyle().name) : undefined)),
        __('LAYER=',            this.getWMSLayerName({ type: 'legend' }))
      ]; 
    }

    return `${base_url}${(base_url.indexOf('?') > -1 ? '&' : '?')}${url_params.filter(p => p).join('&')}`;
  }

  /**
   * Update Layers
   * 
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * ORIGINAL SOURCE: src/app/core/layers/imagelayer.js@v4.0.0
   * 
   * @since 4.1.0
   */
  update(mapState = {}, params = {}) {
    
    /** Hanlde BaseLayer */
    if (this.isBaseLayer()) {
      this.getOLLayer().setVisible(this.state.visible);
      return;
    }

    /** @FIXME add description */
    if (this.isXYZ()) {
      this.getOLLayer().setVisible(this.layer.isVisible());
      return;
    }

    // check which layers have to be disabled
    this.layers.forEach(l => l.setDisabled(mapState.resolution, mapState.mapUnits));
    // get visible layers
    const layers = this.layers.filter(l => l.isVisible());

    // skip when ..
    if (this.isMulti() && layers.length <= 0) {
      this.getOLLayer().setVisible(false);
      return;
    }

    /** @FIXME add description */
    if (this.isMulti() && this.getOLLayer()) {
      let { force, ..._params } = params;

      const STYLES     = [];
      const OPACITIES  = [];
      let LEGEND_ON    = undefined;
      let LEGEND_OFF   = undefined;

      layers.forEach(l => {
        const { LEGEND_ON: on, LEGEND_OFF: off } = this.#get_legend_params(l);
        STYLES.push(l.getStyle());
        OPACITIES.push(parseInt((l.getOpacity() / 100) * 255));
        if (on)  { LEGEND_ON  = undefined === LEGEND_ON  ? on  : `${LEGEND_ON};${on}` }
        if (off) { LEGEND_OFF = undefined === LEGEND_OFF ? off : `${LEGEND_OFF};${off}` }
      })

      this.getOLLayer().setVisible(true);
      this.getOLLayer().getSource()?.updateParams?.({
        ..._params,
        LEGEND_ON,
        LEGEND_OFF,
        filtertoken: ApplicationState.tokens.filtertoken,
        LAYERS:      `${layers[0].isArcgisMapserver() ? 'show:' : ''}${layers.map(l => l.getWMSLayerName()).join(',')}`,
        STYLES:      STYLES.join(','),
        /** @since 3.8 */
        OPACITIES:   OPACITIES.join(','),
      });
      return;
    }
    
    if (this.isRaster() && this.isWMS()) {
      this.update(mapState, params);
    }
  }

  /**
   * Used by the following plugins "iternet", "geonotes"
   * 
   * ORIGINAL SOURCE: src/map/layers/vectorlayer.js@v4.0.0
   * ORIGINAL SOURCE: src/map/layers/imagelayer.js@v4.0.0
   *
   * @since 4.1.0
   */
  getMapLayer() {
    console.warn('[G3W-LAYER] getMapLayer is depecrated');
    return this;
  }

  /**
   * ORIGINAL SOURCE: src/app/core/layers/baselayer.js@v3.10.0
   * 
   * @param {boolean} withLayers
   * 
   * @listens ol.source.ImageWMS~imageloadstart
   * @listens ol.source.ImageWMS~imageloadend
   * @listens ol.source.ImageWMS~imageloaderror
   * 
   * @since 4.1.0
   */
  getOLLayer(withLayers) {
    if (this._olLayer) {
      return this._olLayer;
    }

    let olLayer;

    // BASE LAYER: "OSM"
    if ('OSM' === this.config.servertype && 'image' === this.getType()) {
      olLayer = new ol.layer.Tile({
        source:  new ol.source.OSM({ url: this.state.url }),
        id:      this.state.name  || 'osm',
        title:   this.state.title || 'OSM',
        basemap: true
      });
    }

    // BASE LAYER: "Bing Road", "Bing Aerial", "Bing Aerial (with labels)"
    if ('Bing' === this.config.servertype && 'image' === this.getType()) {
      const name = ({
        streets:          'Road',
        aerial:           'Aerial',
        aerialwithlabels: 'AerialWithLabels'
      })[this.state?.source?.subtype] || 'Aerial';
      olLayer = new ol.layer.Tile({
        source: new ol.source.BingMaps({ imagerySet: name, key: ApplicationState.vendorkeys.bing }),
        name,
        visible: false,
        preload: Infinity,
        basemap: true,
      });
    }

    // ARCGIS LAYER
    if (('ARCGISMAPSERVER' === this.config.servertype || this.isArcgisMapserver()) && ('image' === this.getType() || this.isMulti())) {
      olLayer = new ol.layer.Tile({
        extent:  this.state.extent,
        visible: this.state.visible ?? true,
        source : new ol.source.TileArcGISRest({
          url:          this.state.url,
          projection:   this.state.projection,
          attributions: this.state.attributions,
          crossOrigin:  this.state.crossOrigin,
        })
      });
    }

    // TMS LAYER (XYZ)
    if (this.isXYZ() || ('TMS' === this.config.servertype && 'image' === this.getType())) {
      let projection;
      
      if (this.isXYZ()) {
        projection = this.state.url && this.projection ? this.projection : this.layer.getProjection();
      } else {
        this.state.crs.epsg = this.state.crs.epsg ? this.state.crs.epsg : 'EPSG:3857';
        projection = ApplicationState.projections.get(this.state.crs);
      }

      olLayer = new ol.layer.Tile({
        visible:    false,
        projection,
        source:     new ol.source.XYZ({
          url:              this.state.url ?? null,
          maxZoom:          'image' === this.getType() ? this.state.maxZoom : 20,
          minZoom:          'image' === this.getType() ? this.state.minZoom : undefined,
          projection,
          crossOrigin:      'image' === this.getType() ? 'anonymous'        : undefined,
          tileLoadFunction: this.isXYZ() && ApplicationState.iframe && !this.isExternalWMS() ? this.#fetchTile.bind(this) : undefined,
          tileGrid:         ('degrees' === projection.getUnits() || ('mapproxy' === this.state.cache_provider && this.isXYZ())) ? new ol.tilegrid.TileGrid({
            /** @TODO use `maxResolution` option instead of `.slice(1)` ? */
            resolutions: ol.tilegrid.createXYZ({ extent: projection.getExtent(), maxZoom: 'image' === this.getType() ? this.state.maxZoom : 20 }).getResolutions().slice(1),
            extent:      projection.getExtent(),
          }) : undefined,
        })
      });
    }

    // WMTS LAYER
    if ('WMTS' === this.config.servertype && 'image' === this.getType()) {
      let resolutions, projection = this.state.projection;

      if (!projection) {
        this.state.crs.epsg = this.state.crs.epsg ? this.state.crs.epsg : 'EPSG:3857';
        projection = ApplicationState.projections.get(this.state.crs.epsg);
      }

      // mapproxy
      if (this.state.matrixSet) {
        const size  = ol.extent.getWidth(projection.getExtent()) / 256;
        resolutions = Array.from({ length: 14 }, (_, z) => size / Math.pow(2, z));
      } else if (this.state.grid && this.state.grid_extent) {
        resolutions = ol.tilegrid.createXYZ({ extent: this.state.grid_extent }).getResolutions();
      }
      
      olLayer = new ol.layer.Tile({
        opacity: this.state.matrixSet ? .7 : 1,
        source: new ol.source.WMTS({
          url:             this.state.url,
          projection,
          layer:           this.state.layer,
          matrixSet:       this.state.matrixSet || this.state.grid,
          requestEncoding: this.state.matrixSet ? this.state.requestEncoding : undefined,
          attributions:    this.state.matrixSet ? this.state.attributions    : undefined,
          transparent:     this.state.matrixSet ? undefined                  : false,
          format:          this.state.format ?? 'image/png',
          style:           this.state.style ?? 'default',
          tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(this.state.matrixSet ? projection.getExtent() : this.state.grid_extent),
            resolutions,
            matrixIds: resolutions.map((_, z) => z),
          }),
        })
      });
    }

    // WMTS LAYER (with mapproxy)
    if ('WMTS' === this.state.type && 'mapproxy' === this.state.cache_provider) {
      const resolutions = ol.tilegrid.createXYZ({ extent: this.state.cache_grid_extent }).getResolutions();
      olLayer = new ol.layer.Tile({
        source: new ol.source.WMTS({
          url:         this.state.url,
          layer:       this.state.cache_layer,
          matrixSet:   this.state.cache_grid,
          format:      'png',
          projection:  (withLayers ? this.layers.map(l => l.getWMSLayerName()) : this.layers)[0].getProjection(),
          tileGrid:    new ol.tilegrid.WMTS({ resolutions, origin: ol.extent.getTopLeft(this.state.cache_grid_extent), matrixIds: resolutions.map((_, i) => i), }),
          style:       '',
          transparent: false,
        })
      });
    }

    // WMTS LAYER
    if ('WMTS' === this.config.type && 'mapproxy' !== this.state.cache_provider) {
      olLayer = new ol.layer.Tile({
        id:            this.state.id,
        name:          undefined,
        opacity:       this.state.opacity ?? 1.0,
        source:        new ol.source.TileWMS({
          ratio:      1,
          url:        this.layers[0]?.getWmsUrl ? this.layers[0].getWmsUrl() : this.state.url,
          projection: this.state?.projection?.getCode?.() ?? null,
          params:     {
            ...Object.fromEntries(
              Object.entries({
                DPI:         DOTS_PER_INCH,
                TRANSPARENT: true,
                FORMAT:      'mapproxy' === this.state.cache_provider ? this.state.format : undefined,
                LAYERS:       (withLayers ? this.layers.map(l => l.getWMSLayerName()) : this.layers) ?? '',
                VERSION:     '1.3.0',
                SLD_VERSION: '1.1.0',
              })
              // prevents sending "FORMAT" parameter when undefined
              .filter(([key, val]) => ('FORMAT' !== key ? true : undefined !== val))
          ),
          ...(this.state.http_params)
          },
          imageLoadFunction: ((ApplicationState.iframe && !this.isExternalWMS()) || 'POST' === this.state.http_method) ? this.#fetchTile.bind(this) : undefined,
        })
      });
    }

    // WMS LAYER
    if ('WMS' === this.config.servertype && 'image' === this.getType()) {
      this.state.crs.epsg = this.state.crs.epsg ? this.state.crs.epsg : 'EPSG:3857';
      let projection = ApplicationState.projections.get(this.state.crs);
      olLayer = new ol.layer.Image({
        id:            undefined, // ('WMS' === this.config.servertype && 'image' === this.getType()) ? undefined : this.state.id,
        name:          undefined,
        opacity:       this.state.opacity ?? 1.0,
        source:        new ol.source.ImageWMS({
          ratio:      1,
          url:        this.state.url,
          projection: projection ? projection.getCode() : null,
          params:     {
            ...Object.fromEntries(
              Object.entries({
                DPI:         DOTS_PER_INCH,
                TRANSPARENT: true,
                FORMAT:      undefined /*!(
                  ('WMS' === this.config.servertype && 'image' === this.getType())
                  ||
                  ('WMTS' === this.config.type && 'mapproxy' !== this.state.cache_provider)
                ) ? this.state.format : undefined*/,
                LAYERS:       this.state.layers ?? '',
                VERSION:     '1.3.0',
                SLD_VERSION: '1.1.0',
              })
              // prevents sending "FORMAT" parameter when undefined
              .filter(([key, val]) => ('FORMAT' !== key ? true : undefined !== val))
          ),
          ...(this.state.http_params)
          },
          imageLoadFunction: ((ApplicationState.iframe && !this.isExternalWMS()) || 'POST' === this.state.http_method) ? this.#fetchTile.bind(this) : undefined,
        })
      });
    }

    // WMS LAYER
    if (this.isMulti() && !olLayer) {
      olLayer = new ol.layer.Image({
        id:            this.state.id,
        name:          undefined,
        opacity:       this.state.opacity ?? 1.0,
        source:        new ol.source.ImageWMS({
          ratio:      1,
          url:        this.layers[0]?.getWmsUrl ? this.layers[0].getWmsUrl() : this.state.url,
          projection: this.state.projection ? this.state.projection.getCode() : null,
          params:     {
            ...Object.fromEntries(
              Object.entries({
                DPI:         DOTS_PER_INCH,
                TRANSPARENT: true,
                FORMAT:      !(('WMS' === this.config.servertype && 'image' === this.getType()) || ('WMTS' === this.config.type && 'mapproxy' !== this.state.cache_provider)) ? this.state.format : undefined,
                LAYERS:       (withLayers ? this.layers.map(l => l.getWMSLayerName()) : this.layers) ?? '',
                VERSION:     '1.3.0',
                SLD_VERSION: '1.1.0',
              })
              // prevents sending "FORMAT" parameter when undefined
              .filter(([key, val]) => ('FORMAT' !== key ? true : undefined !== val))
          ),
          ...(this.state.http_params)
          },
          imageLoadFunction: ((ApplicationState.iframe && !this.isExternalWMS()) || 'POST' === this.state.http_method) ? this.#fetchTile.bind(this) : undefined,
        })
      });
    }

    // VECTOR LAYER
    if ('vector' === this.getType()) {
      const style = 'G3WSUITE geojson' === `${this.state.servertype} ${this.state.source?.type}` ? this.state.style : (this.state?.editing?.style ?? this.getCustomStyle());

      olLayer = new ol.layer.Vector({
        id:             this.getId(),
        __g3w_editable: this.isEditable(), //@since 3.11.0 is a attribute to specify if layer OL is editable or not for G3W-SUITE
        source:         new ol.source.Vector({ features: (this?.getEditor?.()?.getEditingSource?.().getFeaturesCollection?.() || []) || new ol.Collection() }),
        opacity:        !style && /^(Polygon|MultiPolygon)/.test(this.getGeometryType()) ? 0.6 : 1,
        style:          new ol.style.Style(
          (style && Object.entries(style || {}).reduce((styles, [type, config]) => Object.assign(styles, {
            image:  'point'   === type && config.icon ? new ol.style.Icon({ src: config.icon.url, imageSize: config.icon.width }) : undefined,
            stroke: 'line'    === type                ? new ol.style.Stroke({ color: config.color, width: config.width })         : undefined,
            fill:   'polygon' === type                ? new ol.style.Fill({ color: config.color })                                : undefined,
          }), {}))
          || (/^(Point|MultiPoint)/.test(this.getGeometryType())     && { image: new ol.style.Circle({ fill: new ol.style.Fill({ color: this.getColor() }), radius: 5, })})
          || (/^(Line|MultiLine)/.test(this.getGeometryType())       && { stroke: new ol.style.Stroke({ color: this.getColor(), width: 3 }) })
          || (/^(Polygon|MultiPolygon)/.test(this.getGeometryType()) && { stroke: new ol.style.Stroke({ color: '#000', width: 1 }), fill: new ol.style.Fill({ color: this.getColor() }) })
        ),
      });
    }

    /** @TODO check if deprecated */
    if ('vector' === this.getType() && 'G3WSUITE geojson' === `${this.state.servertype} ${this.state.source?.type}`) {
      XHR.get({ url: this.get('source').url }).then(d => {
        olLayer.getSource().addFeatures((new ol.format.GeoJSON()).readFeatures(d.results, {
          featureProjection: this.getProjection().getCode(),
          dataProjection:    'EPSG:4326',
        }));
      });
    }

    if (!olLayer) {
      console.warn('[G3W-LAYER] invalid OL layer');
      return;
    }

    // store unique url tiles and emit unique start/stop events (loading spinner), ref: https://github.com/g3w-suite/g3w-client/pull/851
    const tiles = new Set();

    olLayer.getSource().on(['tileloadstart', 'imageloadstart'], e => {
      //In case of tile layer and not yet loaded
      if (!e.image && tiles.has(e?.tile?.src_)) {
        return;
      }
      //In case of tile and has a src tile
      if (!e.image && e?.tile?.src_) {
        tiles.add(e?.tile?.src_);
      }
      this.emit('loadstart');
    });

    olLayer.getSource().on(['tileloadend', 'imageloadend'] , e => {
      if (!e.image && tiles.has(e?.tile?.src_) ) {
        tiles.delete(e.tile.src_);
      }
      this.emit('loadend');
    });

    olLayer.getSource().on(['tileloaderror', 'imageloaderror'], () => {
      this.emit('loaderror');
    });

    // lazy set "attributions"
    if (!withLayers && this.config?.attributions) {
      olLayer.getSource().setAttributions(this.config.attributions);
    }

    // lazy set "visible"
    if (!withLayers && undefined !== this.state.visible) {
      olLayer.setVisible(this.state.visible);
    }

    return (this._olLayer = olLayer);
  }

  #fetchTile(tile, url) {
    fetch('POST' === this.state.http_method ? (url || '').split('?')[0] : url, {
      method:  this.state.http_method || 'GET',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body:    'POST' === this.state.http_method ? url.split('?')[1] : undefined,
    })
    .then(async response => tile.getImage().src = URL.createObjectURL(await response.blob()))
    .catch(e => { console.error('Invalid tile', ol.TileState.ERROR, e); tile.setState(ol.TileState.ERROR); });
  }

  /**
   * @since 4.1.0
   */
  addLayer(layer, position = 'end') {
    if (!this.layers.find(l => layer === l))    { this.layers.splice('end' === position ? this.layers.length : 0, 0, layer); }
    if (this.isXYZ())                           { this.layer = layer; }
  }

  /**
   * @since 4.1.0
   */
  removeLayer(layer) {
    const i = this.layers.indexOf(l => l === layer);
    if (i > -1) {
      this.layers.splice(i, 1);
    }
  }

  /**
   * @since 4.1.0 
   */
  setCustomParams(params = {}) {
    [].concat(this.layer || this.layers).forEach(l => Object.assign(l.customParams, params));
  }

  /**
   * @param layer
   * 
   * @returns {{ LEGEND_ON: undefined | string, LEGEND_OFF: undefined | string }} 
   * 
   * @since 4.1.0
   */
  #get_legend_params(layer) {
    let LEGEND_ON, LEGEND_OFF;
    (layer.getCategories() || [])
      .forEach(({
        checked,  // new Value
        _checked, // old Value
        ruleKey,
      }) => {
        // skip when there's no difference from original `checked` status (_checked) and current changed by toc categories (checked)
        if (checked === _checked) {
          return;
        }
        if (checked) {
          LEGEND_ON  = (undefined === LEGEND_ON ? `${layer.getWMSLayerName()}:` : `${LEGEND_ON},`) + ruleKey;
        } else {
          LEGEND_OFF = (undefined === LEGEND_OFF ? `${layer.getWMSLayerName()}:` : `${LEGEND_OFF},`) + ruleKey;
        }
      });
    return {
      LEGEND_ON,
      LEGEND_OFF,
    };
  }

}

/**
 * Response parser (content types)
 * 
 * ORIGINAL SOURCE: src/utils/parsers/index.js@v4.0.0
 * 
 * @example Layer._parse('application/vnd.ogc.gml', { layers, response });
 */
Layer._parse = function(type, params, opts) {

  const Parsers = this.parsers = (this.parsers || {

    'g3w-vector/gml'({ data, layer } = {}) {
      try {
        return (
          new ol.format.WMSGetFeatureInfo({ layers: layer.config?.infolayer || layer.config.origname })
          ).readFeatures(
            // extract gml from multiple (Tuscany region)
            '--' === data.substr(0, 2)
              ? data
                .split(/\r\n--/)
                .filter(part => /<([^ ]*)FeatureCollection/.test(part) || /<([^ ]*)msGMLOutput/.test(part))
                .map(part => part.substr(part.indexOf('<?xml')))
                .pop()
              : data
          );
      } catch(e) {
        console.warn(e);
        return [];
      }
    },

    'g3w-vector/json'(data, options) {
      try {
        return (new ol.format.GeoJSON({
          geometryName:      'geometry',
          dataProjection:    options.crs,
          featureProjection: options.mapCrs || options.crs,
        })).readFeatures('string' === typeof data ? JSON.parse(data) : data);
      } catch (e) {
        console.warn(e);
        return [];
      }
    },

    'application/json'({ response, projections, layers = [], wms = true, filtertoken } = {}) {
      const layersFeatures = layers.map(layer => ({ layer, features: [], filtertoken }));
      const layersId       = layers.map(l => wms ? l.getWMSLayerName() : l.getWFSLayerName());
      // features
      (
        response
          ? (new ol.format.GeoJSON({
              geometryName:          'geometry',
              defaultDataProjection: projections.layer || projections.map,
            })).readFeatures(response)
          : []
      ).filter(feature => {
        const featureId = feature.getId();
        const g3w_fid   = sanitizeFidFeature(featureId);
        // in the case of wms getfeature without a filter return string contain layerName or layerid
        const index = featureId == g3w_fid ? 0 : layersId.indexOf(featureId);
        // skip when ..
        if (-1 === index) {
          return false;
        }
        const props = feature.getProperties();
        feature.set(G3W_FID, g3w_fid);
        // fields
        layersFeatures[index]
          .layer
          .getFields()
          .filter(f => f.show && undefined === props[f.name] && undefined !== props[f.label])
          .forEach(f => feature.set(f.name, props[f.label]));
        // features
        layersFeatures[index].features.push(feature);
      });
      return layersFeatures;
    },

    'application/geojson'({ layers, response } = {}) {
      return response ? layers.map(layer => ({ layer, features: Layer._parse('g3w-vector/json', response) })) : [];
    },

    'text/plain'({ layers, response } = {}) {
      return layers.map(layer => ({ layer, rawdata: response }));
    },

    'text/gml'({ layers, response }) {
      return layers.map(layer => ({ layer, features: Layer._parse('g3w-vector/gml', { data: response, layer: layers[0] }) }));
    },

    'application/vnd.ogc.gml'({ response, projections, layers, wms = true } = {}) {
      const NUMERIC_FIELD = 'GIS3W_ESCAPE_NUMERIC_FIELD_';

      // convert XML response to string
      if (response && 'string' !== typeof response && !(response instanceof String)) {
        response = new XMLSerializer().serializeToString(response);
      }

      // sanitize layer name (removes: whitespaces, quotes, parenthesis, slashes)
      if (response) {
        response = layers.reduce((acc, layer, i) => {
          //@since 4.1.0 take in account — character in layer name 
          let id = (wms && layer.config.wms_use_layer_ids ? layer.getId() : layer.getName()).replace(/[\s—'()/]+/g, s => /\s/g.test(s) && !wms ? '_' : '');
          if (!wms) {
            id = id.replace(/[/\\]+/g, '').replaceAll(':', '-');
          }
          return acc.replace(new RegExp(`qgs:${id}`, 'g'), `qgs:layer${i}`);
        }, response);
      }

      // fields starting with an invalid key
      const invalids = response && Array.from(response.matchAll(/qgs:(\d+(?:\.\d+)?)(\w+)/g)).filter((_, i) => 0 === i % 2);

      // numeric value (integer or float)
      if (invalids) {
        response = invalids.reduce((acc, find) => acc.replace(new RegExp(find[0], 'g'), `qgs:${NUMERIC_FIELD}${find[1]}${find[2]}`), response);
      }

      // HOTFIX: null characther ("\u0000")
      if (response) {
        response = response.replace(new RegExp(String.fromCharCode(0), 'g'), '0');
      }

      const parsed = []; //Array contains item object ({layer, features})
      let xml;

      try {
        xml = (new DOMParser).parseFromString(response, "text/xml");

        // skip when response has no features
        if (!xml.querySelector('FeatureCollection > featureMember')) {
          throw 'no features in response';
        }

        layers.forEach((layer, i) => {

          const cloned = xml.cloneNode(true);
          let feats = [];

          // get layers by name (eg. "qgs:layer0")
          const qgs = [...cloned.querySelectorAll(`FeatureCollection > featureMember > layer${i}`)];

          // set "g3w_fid" attribute from `fid="<layer_name_or_id.fid>"`
          qgs.forEach(feat => {
            const fid = (feat.getAttribute('fid') || '.').split('.')[1];
            if (fid) {
              const g3w_fid = cloned.createElement('gml:' + G3W_FID);
              feat.setAttribute('fid', fid);
              g3w_fid.textContent = fid;
              feat.appendChild(g3w_fid);
            }
            feats.push(feat.parentNode);
          });

          // get multi layers wms (eg. "layer0" → "layer0_0" + "layer1_0")
          if (qgs.length > 1) {
            const grouped = groupBy(qgs, feat => Object.values(feat.children).map(d => d.nodeName));
            if (Object.keys(grouped).length > 1) {
              Object.keys(grouped).forEach((key, i) => grouped[key].forEach((node, j) => {
                // see: https://andreiglingeanu.me/rename-element-tag/
                const renamed = cloned.createElement(`qgs:layer${i}_${j}`);
                [...node.attributes].map(({ name, value }) => { renamed.setAttribute(name, value); });
                while (node.firstChild) { renamed.appendChild(node.firstChild); }
                const feat = cloned.createElement('gml:featureMember');
                feat.appendChild(renamed);
                node.parentNode.insertAdjacentElement('beforebegin', feat);
                if (1 === node.parentNode.children.length) {
                  node.parentNode.parentNode.removeChild(node.parentNode);
                } else {
                  node.parentNode.removeChild(node);
                }
                feats.push(feat);
              }));
            }
          }

          // keep only current layer features
          cloned.querySelectorAll('FeatureCollection > featureMember').forEach(node => {
            if (!feats.includes(node)) {
              node.parentNode.removeChild(node);
            }
          });

          feats = (new ol.format.WMSGetFeatureInfo()).readFeatures(cloned.documentElement.outerHTML);

          // whether need to re-project features
          const is_reprojected = projections.layer && projections.layer.getCode() !== projections.map.getCode() && feats.length && !!feats[0].getGeometry();

          /** @FIXME add description */
          if (feats.length && invalids) {
            const fields = Object.keys(feats[0].getProperties()).filter(p => -1 !== p.indexOf(NUMERIC_FIELD));
            feats.forEach(f => {
              fields.forEach(_field => {
                const invalid = invalids.find(find => `${find[1]}${find[2]}` === _field.replace(NUMERIC_FIELD, ''));
                f.set(invalid[0].replace('qgs:', ''), [].concat(f.get(_field))[0]);
                f.unset(_field);
              })
            });
          }

          // transform features
          if (is_reprojected) {
            //filter feature with geometry
            feats.filter(f => f.getGeometry()).forEach(f => f.setGeometry(f.getGeometry().transform(projections.layer.getCode(), projections.map.getCode())));
          }

          // inverted axis --> reverse features coordinates
          if ('ne' === (projections.layer || projections.map).getAxisOrientation().substr(0, 2)) {
            //filter feature with geometry
            feats.filter(f => f.getGeometry()).forEach(f => {
              const geom = f.getGeometry();
              geom.setCoordinates(_reverseCoords(geom.getCoordinates()))
              f.setGeometry(geom);
            });
          }

          // remove Z values added by "ol.format.WMSGetFeatureInfo" readFeatures
          if (layer.isGeoLayer() && !is3DGeometry(layer.getGeometryType())) {
            feats.forEach(f => removeZValue({ feature: f }));
          }

          parsed.unshift({ layer, features: feats });

        });
      } catch (e) {
        console.warn(e);
      }

      /** @since 3.9.1 handle server errors */
      if (xml.querySelector('ServiceException')) {
        GUI.showUserMessage({
          type:        'warning',
          textMessage: true,
          message:     `${layers[0].getName()} - ${xml.querySelector('ServiceException').innerText}`
        })
      }

      return parsed;
    },

    /**
     * Handle "esri/json" response for ArcGIS layers
     * 
     * @see https://developers.arcgis.com/rest/services-reference/enterprise/identify-map-service/#json-response-syntax
     * 
     * @since 4.1.1
     */
    'esri/json'({ response = { results: [], error: undefined }, projections, layers } = {}) {
      const layersFeatures = layers.map(layer => ({ layer, features: [] }));
      const layersId       = layers.map(l => l.getWMSLayerName());
      // handle server errors
      if (response.error) {
        GUI.showUserMessage({
          type:        'warning',
          textMessage: true,
          message:     `${layersId.join(',')}: ${response.error.message}`
        })
      }
      //handle features
      (
        response?.results
          ? response.results.map((r) => (new ol.format.EsriJSON({
              geometryName:          'geometry',
              defaultDataProjection: projections.layer || projections.map,
            })).readFeature(r)) 
          : []
      ).filter(feature => {
        const featureId = feature.getId();
        const g3w_fid   = sanitizeFidFeature(featureId);
        // in the case of wms getfeature without a filter return string contain layerName or layerid
        const index = featureId == g3w_fid ? 0 : layersId.indexOf(featureId);
        // skip when ..
        if (-1 === index) {
          return false;
        }
        const props = feature.getProperties();
        feature.set(G3W_FID, g3w_fid);
        // fields
        layersFeatures[index]
          .layer
          .getFields()
          .filter(f => f.show && undefined === props[f.name] && undefined !== props[f.label])
          .forEach(f => feature.set(f.name, props[f.label]));
        // features
        layersFeatures[index].features.push(feature);
      });
      return layersFeatures;

    }
  });

  Parsers['g3w-vector/geojson'] = Parsers['g3w-vector/json']; 
  Parsers['text/html']          = Parsers['text/plain']; 

  if (Parsers[type]) {
    return Parsers[type](params, opts);
  }

  return (params?.layers || []).map(layer => ({ layer, rawdata: _('Not supported format') }));
};

function _reverseCoords(coords) {
  coords.find(c => {
    if (!Array.isArray(c)) {
      const [y, x] = coords; coords[0] = x; coords[1] = y;
      return true;
    }
    _reverseCoords(c);
  });
  return coords;
}