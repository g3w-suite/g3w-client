/**
 * @file ORIGINAL SOURCE: src/app/core/layers/layer.js@v3.10.2
 * @since 3.11.0
 */

import {
  GEOMETRY_FIELDS,
  SELECTION,
  DOTS_PER_INCH,
  QUERY_POINT_TOLERANCE,
  TIMEOUT,
}                                from 'g3w-constants';
import ApplicationState          from 'store/application';
import DataRouterService         from 'services/data';
import GUI                       from 'services/gui';
import G3WObject                 from 'g3w-object';
import { parseAttributes }       from 'utils/parseAttributes';
import { promisify, $promisify } from 'utils/promisify';
import { downloadFile }          from 'utils/downloadFile';
import { XHR }                   from 'utils/XHR';
import { prompt }                from 'utils/prompt';
import Table                     from 'components/Table.vue';

import { ResponseParser }        from 'utils/parsers';
import { get_legend_params }     from 'utils/get_legend_params';
import { createRelationsUrl }    from 'utils/createRelationsUrl';

import { Feature }               from 'map/layers/feature';

const { t }                      = require('g3w-i18n');


const is_defined = d => undefined !== d;
const çç         = (a, b) => undefined !== a ? a : b; // like a ?? (coalesce operator)

// BACKCOMP v3.x
function createProvider(name, layer) {
  const provider = new Providers[name];
  return Object.assign(provider, {
    _name:       name,
    _layer:      layer,
    getLayer:    () => provider._layer,
    setLayer:    l  => provider._layer = l,
    getFeatures: provider.getFeatures || (() => console.log('overwriteby single provider')),
    query:       provider.query       || (() => console.log('overwriteby single provider')),
    getName:     () => provider._name,
  });
}

/**
 * ORIGINAL SOURCE: src/app/core/layers/providersfactory.js@v3.10.2
 * ORIGINAL SOURCE: src/app/core/layers/providers/geojsonprovider.js@3.8.6
 * ORIGINAL SOURCE: src/app/core/layers/providers/qgisprovider.js@3.8.6
 * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
 * ORIGINAL SOURCE: src/app/core/layers/providers/wmsprovider.js@3.8.6
 */
const Providers = {

  geojson: class {

    query() {
      return $promisify(Promise.resolve([]));
    }

    getFeatures(opts = {}) {
      return $promisify(async() => (new ol.format.GeoJSON()).readFeatures(
          opts.data || (await XHR.get({ url: opts.url || this._layer.get('source').url })).results, {
          featureProjection: opts.mapProjection,
          dataProjection:    opts.projection || 'EPSG:4326',
        })
      );
    }

  },

  qgis: class {

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
    query(opts = {}) {
      this._projections      = this._projections || { map: null, layer: null };
      return $promisify(async () => {
        const is_table = 'table' === this._layer.getType();

        // in case not alphanumeric layer set projection
        if (!is_table) {
          this._projections.map = this._layer.getMapProjection() || this._projections.layer;
        }

        const layers = opts.layers ? opts.layers.map(l => l.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();

        // skip when ..
        if (!opts.filter) {
          return Promise.reject();
        }

        let filter = [].concat(opts.filter)
          // BACKOMP v3.x
          .map(f => ({
            type:  f._type || f.type,
            value: (f._filter || f.value)
          }));

        // check if geometry filter. If not i have to remove projection layer
        if ('geometry' !== filter[0].type) {
          this._projections.layer = null;
        }

        filter = filter.filter(f => f.value);

        const response = await XHR.get({
          url: opts.queryUrl || this._layer.getUrl('query'),
          params: {
            SERVICE:       'WMS',
            VERSION:       '1.3.0',
            REQUEST:       'GetFeatureInfo',
            filtertoken:   ApplicationState.tokens.filtertoken,
            LAYERS:        layers,
            QUERY_LAYERS:  layers,
            INFO_FORMAT:   this._layer.getInfoFormat() || 'application/vnd.ogc.gml',
            FEATURE_COUNT: opts.feature_count || 10,
            CRS:           (is_table ? ApplicationState.map.epsg : this._projections.map.getCode()),
            I:             opts.I,
            J:             opts.J,
            FILTER:        filter.length ? filter.map(f => f.value).join(';') : undefined,
            WITH_GEOMETRY: !is_table,
          },
        });

        const _layers = undefined === opts.layers ? [this._layer] : opts.layers;

        return opts.raw ? response : ResponseParser.get(_layers[0].getInfoFormat())({
          response,
          projections: this._projections,
          layers:      _layers,
          wms:         true,
        });

      });
    }

    /**
     * get layer config
     */
    getConfig() {
      return $promisify(XHR.get({ url: this._layer.getUrl('config') }));
    }

    /**
     * Load editing features (Read / Write)
     */
    getFeatures(options = {}, params = {}) {
      // filter null values
      Object
        .entries(params)
        .forEach(([key, value]) => {
          if ([null, undefined].includes(value)) {
            delete params[key];
          }
      });

      return $promisify(async () => {

        params = new URLSearchParams(params || {}).toString();
        params = (params ? '?' : '') + params;

        // read mode
        if (!options.editing) {
          const { vector } = await XHR.get({
            url: this._layer.getUrl('data') + params,
          });
          return {
            data: vector.data,
            count: vector.count
          };
        }

        // editing mode
        try {

          let response;

          if (!options.filter) {
            response = await XHR.post({
              url:         this._layer.getUrl('editing') + params,
              contentType: 'application/json',
            });
          } else if (is_defined(options.filter.bbox)) { // bbox filter
            response = await XHR.post({
              url:  this._layer.getUrl('editing') + params,
              data: JSON.stringify({
                in_bbox:     options.filter.bbox.join(','),
                filtertoken: ApplicationState.tokens.filtertoken
              }),
              contentType: 'application/json',
            })
          } else if (is_defined(options.filter.fid)) { // fid filter
            response = await XHR.get({ url: createRelationsUrl(options.filter.fid) });
          } else if (options.filter.field) {
            response = await XHR.post({
              url:         this._layer.getUrl('editing') + params,
              data:        JSON.stringify(options.filter),
              contentType: 'application/json',
            })
          } else if (is_defined(options.filter.fids)) {
            response = await XHR.get({
              url:    this._layer.getUrl('editing') + params,
              params: options.filter
            })
          } else if (is_defined(options.filter.nofeatures)) {
            response = await XHR.post({
              url:  this._layer.getUrl('editing') + params,
              data: JSON.stringify({
                field: `${options.filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__`
              }),
              contentType: 'application/json'
            })
          }

          // invalid response
          if (!response.result) {
            return;
          }

          const lockIds  = response.featurelocks.map(lk => lk.featureid);

          // resolves with features locked and requested
          return {
            count:        response.vector.count, // real number of features that request will return
            featurelocks: response.featurelocks,
            features:     ResponseParser.get(`g3w-${this._layer.getType()}/json`)(
              response.vector.data,
              'NoGeometry' === response.vector.geometrytype
                ? {}
                : { crs: this._layer.getCrs() }
            )
              .filter(f => lockIds.includes(`${f.getId()}`))
              .map(feature => new Feature({ feature })),
          };
        } catch (e) {
          console.warn(e);
        }
        return Promise.reject({ message: t("info.server_error")});
      });
    }

  },

  wms: class {

    query(opts = {}) {
      const {
        layers        = [this._layer],
        size          = [101, 101],
        coordinates   = [],
        resolution,
      } = opts;

      // get extent for view size
      const dx   = resolution * size[0] / 2;
      const dy   = resolution * size[1] / 2;
      const bbox = [coordinates[0] - dx, coordinates[1] - dy, coordinates[0] + dx, coordinates[1] + dy];

      const projection = this._layer.getMapProjection() || this._layer.getProjection();
      const tolerance  = çç(opts.query_point_tolerance, QUERY_POINT_TOLERANCE);

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
        LAYERS:               (layers || [this._layer.getWMSInfoLayerName()]).map(l => l.getWMSInfoLayerName()).join(','),
        QUERY_LAYERS:         (layers || [this._layer.getWMSInfoLayerName()]).map(l => l.getWMSInfoLayerName()).join(','),
        filtertoken:          ApplicationState.tokens.filtertoken,
        INFO_FORMAT:          this._layer.getInfoFormat() || 'application/vnd.ogc.gml',
        FEATURE_COUNT:        çç(opts.feature_count, 10),
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
        STYLES:               '',
        BBOX:                 ('ne' === projection.getAxisOrientation().substr(0, 2) ? [bbox[1], bbox[0], bbox[3], bbox[2]] : bbox).join(','),
        // HOTFIX for GetFeatureInfo requests and feature layer categories that are not visible (unchecked) at QGIS project setting
        LEGEND_ON:            layers.flatMap(l => get_legend_params(l).LEGEND_ON).filter(Boolean).join(';')  || undefined,
        LEGEND_OFF:           layers.flatMap(l => get_legend_params(l).LEGEND_OFF).filter(Boolean).join(';') || undefined,
        SOURCE:               (!proxy && 'GET' === method && source.length > 1) ? source[1] : undefined,
      };

      let timer;

      // promise with timeout
      return $promisify(Promise.race([
        new Promise(res => { timer = setTimeout(() => { res({
          data:  (layers || []).map(layer => ({ layer, rawdata: 'timeout' })),
          query: { coordinates, resolution },
        }); }, TIMEOUT) }),
        (async () => {
          try {
            let response;

            if (proxy) {
              response = await layers[0].getDataProxyFromServer('wms', { url, params, method, headers: { 'Content-Type': params.INFO_FORMAT } });
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
              data: ResponseParser.get(layers[0].getInfoFormat())({
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
      ]));

    }
  },

  wfs: class {
  
    // query method
    query(opts = {}, params = {}) {
      const filter = opts.filter || {};
      const layers = opts.layers || [this._layer];
      const url    = `${layers[0].getQueryUrl()}/`.replace(/\/+$/, '/');
      const method = layers[0].getOwsMethod();

      // BACKCOMP v3.x
      Object.assign(filter, {
        config: filter.config || {},
        type:   filter._type || filter.type,
        value:  filter._filter || filter.value,
      })

      params = Object.assign(params, {
        SERVICE:      'WFS',
        VERSION:      '1.1.0',
        REQUEST:      'GetFeature',
        MAXFEATURES:  çç(opts.feature_count, 10),
        TYPENAME:     layers.map(l => l.getWFSLayerName()).join(','),
        OUTPUTFORMAT: layers[0].getInfoFormat(),
        SRSNAME:      (opts.reproject ? layers[0].getProjection() : this._layer.getMapProjection()).getCode(),
        FILTER:       'all' !== filter.type ? `(${(
          new ol.format.WFS().writeGetFeature({
            featureTypes: [layers[0]],
            filter:       ({
              'bbox':       ol.format.filter.bbox('the_geom', filter.value),
              'geometry':   ol.format.filter[filter.config.spatialMethod || 'intersects']('the_geom', filter.value),
              'expression': null,
            })[filter.type],
          })
        ).children[0].innerHTML})`.repeat(layers.length || 1) : undefined
      });

      let timer;

      // promise with timeout
      return $promisify(Promise.race([
        new Promise(res => { timer = setTimeout(() => { res({
          data: (layers || []).map(layer => ({ layer, rawdata: 'timeout' })),
          query: {},
        }); }, TIMEOUT) }),
        (async () => {
          try {
            let response;

            if ('GET' === method && !['all', 'geometry'].includes(filter.type)) {
              response = await XHR.get({ url: url + '?' + new URLSearchParams(params || {}).toString() });
            }
  
            if ('POST' === method || ['all', 'geometry'].includes(filter.type)) {
              response = await XHR.post({ url, data: params })
            }

            const data = ResponseParser.get(layers[0].getInfoFormat())({
              response,
              projections: {
                map:   this._layer.getMapProjection(),
                layer: (opts.reproject ? this._layer.getProjection() : null)
              },
              layers,
              wms: false,
            });

            // sanitize in case of nil:true
            data
              .flatMap(l => l.features || [])
              .forEach(f => Object.entries(f.getProperties())
                .forEach(([ attribute, value ]) => value && value['xsi:nil'] && feature.set(attribute, 'NULL'))
              );
            return { data };
          } finally {
            clearTimeout(timer)
          }
        })(),
      ]));

    }

  },

};

const DOWNLOAD_FORMATS = {
  download:        { format: 'shapefile', url: 'shp' },
  download_gpkg:   { format: 'gpkg',      url: 'gpkg' },
  download_gpx:    { format: 'gpx',       url: 'gpx' },
  download_csv:    { format: 'csv',       url: 'csv' },
  download_xls:    { format: 'xls',       url: 'xls' },
  download_raster: { format: 'geotiff',   url: 'geotiff' },
  download_pdf:    { format: 'pdf',       url: 'pdf' },
};

/**
 * Base class for all layers
 */
class Layer extends G3WObject {
  
  constructor(config = {}, options = {}) {

    super();

    //get current project object
    const project   = options.project || ApplicationState.project;
    const suffixUrl = config.baselayer ? '' : `${project.getType()}/${project.getId()}/${config.id}/`;
    const vectorUrl = config.baselayer ? '' : project.state.vectorurl;
    const rasterUrl = config.baselayer ? '' : project.state.rasterurl;

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
    

    const relations = project.getRelations().filter(r => [r.referencedLayer, r.referencingLayer].includes(this.getId()));

    /**
     * Layer relations
     */
    this._relations = {

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
          /** @type { string } relation prefix (for Relation 1:1) @since 3.9.0 */
          prefix:      config.prefix,
          /** BACKCOMP (g3w-admin < v.3.7.0) - father relation field name */
          fatherField: [].concat(config.fieldRef.referencedField),
          /** BACKCOMP (g3w-admin < v.3.7.0) - child relation layer field name */
          childField:  [].concat(config.fieldRef.referencingField),
        }
        relations[state.id] = Object.assign(new G3WObject(config), {
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
          return createProvider('qgis', this);
        }
        if ('G3WSUITE geojson' === layerType) {
          return createProvider('geojson', this);
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
      ].includes(layerType) && createProvider('wfs', this),

      filtertoken: [
        'QGIS virtual',
        'QGIS postgres',
        'QGIS oracle',
        'QGIS mssql',
        'QGIS spatialite',
        'QGIS ogr',
        'QGIS delimitedtext',
      ].includes(layerType) && createProvider('qgis', this),

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
          return createProvider('wms', this);
        }
        if ('G3WSUITE geojson' === layerType) {
          return createProvider('geojson', this);
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
      ].includes(layerType) && createProvider('qgis', this),

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
        url:        this.getUrl('pdf'),
        headers:    { 'Content-Type': 'application/json; charset=utf-8' },
        data:       JSON.stringify(data),
        mime_type: 'application/pdf',
        method:    'POST'
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
    return (Object.values(DOWNLOAD_FORMATS).find(d => d.format === format) || {}).url;
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
    return this._relations;
  }

  /**
   * @param id
   * 
   * @returns {*} relation by id
   */
  getRelationById(id) {
    return this._relations.getArray().find(r => id === r.getId());
  }

  /**
   * @param relationName
   * 
   * @returns { * | Array } relation fields
   */
  getRelationAttributes(relationName) {
    const relation = this._relations.find(r => relationName === r.name);
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
    try {
      /** @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=apply&fid=<fid_filter_saved>|name=<name_filter_saved> */
      const response = await XHR.get({
        url:    this.providers['filtertoken']._layer.getUrl('filtertoken'),
        params: { mode: 'apply', fid: filter.fid }
      });
      if (!response || !response.result || !response.data) {
        return;
      }
      this.setFilter(false);
      this.state.filter.current = filter;
      this.setFilterToken(response.data);
    } catch(e) {
      console.warn(e);
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
      value: layer.state.filter.current ? layer.state.filter.current.name : '' ,
      callback: async(name) => {

        /** @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=save&name=<name_filter_saved> */
        const response = await XHR.get({
          url:    layer.providers['filtertoken']._layer.getUrl('filtertoken'),
          params: { mode: 'save', name } }
        );

        // skip when no data return from provider
        if (!response || !response.result || !response.data) {
          return;
        }

        let filter = layer.state.filters.find(f => response.data.fid === f.fid);
      
        // add saved filter to filters array
        if (undefined === filter) {
          filter = {
            fid:  response.data.fid, //get fid
            name: response.data.name //get name
          }
          layer.state.filters.push(filter);
        }

        layer.state.filter.current = filter; // set current filter
        layer.setFilter(false);              // set to false
        layer.getSelection().active = false; // reset selection to false
        layer.selectionFids.clear();         // clear current fids
      
        //in the case of geolayer
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

      let filtertoken;
      try {
        // Delete saved filter from server --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete_saved&fid=<fid_filter_saved>|name=<name_filter_saved>`
        // Delete current filter           --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete`
        const response = await XHR.get({
          url:    this.providers['filtertoken']._layer.getUrl('filtertoken'),
          params: { fid, mode: undefined === fid ? 'delete': 'delete_saved' }
        });
        // filter token if another layer is filtered otherwise filtertoken is undefined
        if (response && response.result && response.data) {
          filtertoken = response.data.filtertoken;
        }
      } catch(e) {
        console.warn(e)
      }

      // remove it from filters list when deleting a saved filter (since v3.9.0)
      if (undefined !== fid) {
        this.state.filters = this.state.filters.filter(f => fid !== f.fid);
      }

      this.state.filter.current = null  // set current filter set to null
      // set active filter to false
      if (this.state.filter.active) { this.setFilter(false) }
      this.setFilterToken(filtertoken); // pass `filtertoken` to application

    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * Set applicaton filter token
   * 
   * @param {string} filtertoken a string passed by server and used as parameter in XHR request
   *
   * @fires filtertokenchange when filtertoken is changed
   * 
   * @since 3.9.0
   */
  setFilterToken(filtertoken = null) {
    ApplicationState.tokens.filtertoken = filtertoken;
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
        try {
          // Delete current filter --> `/vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=delete`
          await XHR.get({
            url:    this.providers['filtertoken']._layer.getUrl('filtertoken'),
            params: { fid: undefined, mode: 'delete' }
          });
        } catch(e) {
          console.warn(e)
        }
        this.setFilterToken(null);

        return;
      }

      const fids = Array.from(selection);

      const { data = {} } = await XHR.get({
        url:    provider._layer.getUrl('filtertoken'),
        params: selection.has(SELECTION.EXCLUDE)
          ? { fidsout: fids.filter(id => id !== SELECTION.EXCLUDE).join(',') } // exclude features from selection
          : { fidsin: fids.join(',') }                                         // include features in selection
      });

      this.setFilterToken(data.filtertoken);

    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * Get Application filter token
   * 
   * @returns {*}
   */
  getFilterToken() {
    return ApplicationState.tokens.filtertoken;
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
    //pass false because eventually token filter creation needs to be called after
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
        inputs:  proxyParams,
        outputs: false,
      });
      this.setProxyData(type, JSON.parse(data));
      return response;
    } catch(e) {
      console.warn(e);
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
    Object.keys(changes).forEach(c => {
      Object.keys(changes[c]).forEach(p => {
        this.proxyData[type][c][p] = changes[c][p];
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
  setInEditing(bool = false) {
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
      if (response && response.result && response.vector && response.vector.data) {
        return response.vector.data.features;
      }
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * @TODO deprecate `search_endpoint = 'ows'`
   *
   * Search Features
   * 
   * @param { Object }        options
   * @param { 'ows' | 'api' } options.search_endpoint
   * @param { boolean }       options.raw
   * @param { 0 | 1 }         options.formatter
   * @param options.filter
   * @param options.suggest
   * @param options.unique
   * @param options.queryUrl
   * @param options.ordering
   * @param options.autofilter //@since 3.11.0
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
            .fail(e => { console.warn(e); reject(e) });
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
                autofilter: options.autofilter,
              })
            );
          } catch(e) {
            console.warn(e);
            reject(e);
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
   * @param opts.fformatter  since 3.9.0
   * @param opts.ffield      since 3.9.1
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
    autofilter, //@since 3.11.0
  } = {}) {
    const provider        = this.getProvider('data');
    provider._projections = provider._projections || { map: null, layer: null };
    const params   =  {
      field,
      suggest,
      ordering,
      formatter,
      unique,
      fformatter,
      ffield,
      filtertoken: ApplicationState.tokens.filtertoken,
      autofilter,
    };
    try {
      const url = queryUrl ? queryUrl : provider._layer.getUrl('data');
      const response = field                                                                    // check `field` parameter
        ? await XHR.post({ url, contentType: 'application/json', data: JSON.stringify(params)}) // since g3w-admin@v3.7
        : await XHR.get({ url, params });                                                       // BACKCOMP (`unique` and `ordering` were only GET parameters)

      // vector layer
      if ('table' !== provider._layer.getType()) {
        provider._projections.map = provider._layer.getMapProjection() || provider._projections.layer;
      }

      if (raw)                           { return response }
      if (unique && response.result)     { return response.data }
      if (fformatter && response.result) { return response }

      if (response.result) {
        return {
          data: ResponseParser.get('application/json')({
            layers:      [provider._layer],
            response:    response.vector.data,
            projections: provider._projections,
          })
        };
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
  search(options = {}, params = {}) {
    options = {
      ...options,
      feature_count: options.feature_count || 10,
      ...this.config.searchParams,
      ...params
    };
    const provider = this.getProvider('search');
    return $promisify(async () => {
      if (provider) {
        return await promisify(provider.query(options));
      }
      return Promise.reject(t('sdk.search.layer_not_searchable'));
    });
  }

  /**
   * Info from layer (only for querable layers) 
   */
  query(options = {}) {
    const provider = this.getProvider(options.filter ? 'filter' : 'query');
    return $promisify(async () => {
      if (provider) {
        return await promisify(provider.query(options));
      }
      return Promise.reject(t('sdk.search.layer_not_querable'));
    });
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
   * @returns { Array } editing fields
   */
  getEditingFields() {
    return this.config.editing.fields;
  }

  /**
   * @returns { Array } only show fields
   */
  getTableFields() {
    return (this.config.fields || []).filter(f => f.show);
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
    return this.config.project;
  }

  /**
   * @returns { Object } layer config
   */
  getConfig() {
    return this.config;
  }

  /**
   *
   * @returns { Array } form structure to show on form editing
   */
  getLayerEditingFormStructure() {
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
  setHidden(bool = true) {
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
    return type === this.getType();
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
          layer_config_value.includes(condition_attribute_values) :
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
    return this.state.infolayer && '' !== this.config.infolayer ? this.config.infolayer :  this.config.origname;
  }

  /**
   * @TODO Description
   *
   * @param ogcService
   *
   * @returns { default.watch.infoformat | * | string }
   */
  getInfoFormat(ogcService) {
    // In the case of NETCDF (qtime series)
    if (true === this.config.qtimeseries || 'gdal' === this.getSourceType()) {
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
        field.type    = type;
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
    return (this.getAttributes().find(a => name === a.name) || {}).label;
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

    if (
      Layer.ServerTypes.QGIS === this.getServerType()
      && ([
        Layer.SourceTypes.POSTGIS,
        Layer.SourceTypes.ORACLE,
        Layer.SourceTypes.WFS,
        Layer.SourceTypes.OGR,
        Layer.SourceTypes.MSSQL,
        Layer.SourceTypes.SPATIALITE
      ].includes(this.config.source.type))
      && this.isQueryable()
    ) {
      return this.getTableFields().length > 0;
    }
    
    if (Layer.ServerTypes.G3WSUITE === this.getServerType() && "geojson" === this.get('source').type) {
      return true
    }

    if (Layer.ServerTypes.G3WSUITE !== this.getServerType() && this.isFilterable()) {
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
   * Function called in case of change project to remove all stored information 
   */
  clear() {}

  /**
   * @returns {boolean} whether is a vector layer
   */
  isVector() {
    return Layer.LayerTypes.VECTOR === this.getType();
  }

  /**
   * @returns {boolean} whether is a table layer
   */
  isTable() {
    return Layer.LayerTypes.TABLE === this.getType();
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
          url:          `${this.config.urls.featurecount}${this.getId()}/`,
          data:         JSON.stringify({ style }),
          contentType: 'application/json'
        });
        this.state.stylesfeaturecount[style] = (true === result ? data : {});
      } catch(e) {
        cansole.warn(e);
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
    return this.config.format
      || ApplicationState.project.state.wms_getmap_format
      || 'image/png'
  }

  /**
   * @since 3.10.0
   */
  openAttributeTable(opts = {}) {
    new (Vue.extend(Table))({ ...opts, layerId: this.state.id });
  }

}

/******************************************************************************************
 * LAYER PROPERTIES
 *****************************************************************************************/

/**
 * Layer Types
 */
Layer.LayerTypes = {
  TABLE:  "table",
  IMAGE:  "image",
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
};

/**
 * Source Types
 */
Layer.SourceTypes = {
  VIRTUAL:         "virtual",
  POSTGIS:         "postgres",
  SPATIALITE:      "spatialite",
  ORACLE:          "oracle",
  MSSQL:           "mssql",
  CSV:             "delimitedtext",
  OGR:             "ogr",
  GDAL:            "gdal",
  WMS:             "wms",
  WMST:            "wmst",
  WFS:             "wfs",
  WCS:             "wcs",
  MDAL:            "mdal",
  'VECTOR-TILE':   "vector-tile",
  VECTORTILE:      "vectortile",
  ARCGISMAPSERVER: "arcgismapserver",
  GEOJSON:         "geojson",
  /** @since 3.9.0 */
  POSTGRESRASTER:  "postgresraster",
};

/**
 * Layer Capabilities
 */
Layer.CAPABILITIES = {
  QUERYABLE:  1,
  FILTERABLE: 2,
  EDITABLE:   4,
};

/**
 * BACKOMP v3.x
 */
Layer.SELECTION_STATE = SELECTION;

export { Layer };