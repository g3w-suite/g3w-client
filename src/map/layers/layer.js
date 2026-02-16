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
  G3W_FID,
}                                 from 'g3w-constants';
import G3WObject                  from 'g3w-object';
import { gettext as _ }           from 'g3w-i18n';
import ApplicationState           from 'store/application';
import Projections                from 'store/projections';
import DataRouterService          from 'services/data';
import GUI                        from 'services/gui';

import Table                      from 'components/Table.vue';

import { promisify, $promisify }  from 'utils/promisify';
import { saveBlob }               from 'utils/saveBlob';
import { XHR }                    from 'utils/XHR';
import { prompt }                 from 'utils/prompt';
import { ResponseParser }         from 'utils/parsers';
import { get_legend_params }      from 'utils/get_legend_params';
import { createRelationsUrl }     from 'utils/createRelationsUrl';
import { getCatalogLayerById }    from 'utils/getCatalogLayerById';
import { getScaleFromResolution } from 'utils/getScaleFromResolution';

import { Feature }                from 'map/layers/feature';

const is_defined = d => undefined !== d;

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
          this._projections.map = ApplicationState.project.getProjection() || this._projections.layer;
        }

        const layers = opts.layers ? opts.layers.map(l => l.getWMSLayerName()).join(',') : this._layer.getWMSLayerName();

        // skip when ..
        if (!opts.filter) {
          return Promise.reject();
        }

        let filter = [].concat(opts.filter)
          // BACKCOMP v3.x
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
        // read mode
        if (!options.editing) {
          const { vector } = await XHR.post({
            url:         this._layer.getUrl('data'),
            data:        JSON.stringify(params),
            contentType: 'application/json',
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
              url:         this._layer.getUrl('editing'),
              data:        JSON.stringify(params),
              contentType: 'application/json',
            });
          } else if (is_defined(options.filter.bbox)) { // bbox filter
            response = await XHR.post({
              url:  this._layer.getUrl('editing'),
              data: JSON.stringify({
                ...params,
                in_bbox:     options.filter.bbox.join(','),
                filtertoken: this._layer.getFilterToken(),
              }),
              contentType: 'application/json',
            })
          } else if (is_defined(options.filter.fid)) { // fid filter
            response = await XHR.post({
              url:         createRelationsUrl(options.filter.fid),
              contentType: 'application/json',
              data:        JSON.stringify({ formatter: 1 }),
            });
          } else if (options.filter.field) {
            response = await XHR.post({
              url:         this._layer.getUrl('editing'),
              data:        JSON.stringify({ 
                ...params,
                ...options.filter,
              }),
              contentType: 'application/json',
            })
          } else if (is_defined(options.filter.fids)) {
            response = await XHR.post({
              url:    this._layer.getUrl('editing'),
              data:   JSON.stringify({
                ...params,
                ...options.filter,
              }),
              contentType: 'application/json',
            })
          } else if (is_defined(options.filter.nofeatures)) {
            response = await XHR.post({
              url:  this._layer.getUrl('editing'),
              data: JSON.stringify({
                ...params,
                field: `${options.filter.nofeatures_field || 'id'}|eq|__G3W__NO_FEATURES__`
              }),
              contentType: 'application/json',
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
        return Promise.reject({ message: _("info.server_error")});
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

      const projection = ApplicationState.project.getProjection() || this._layer.getProjection();
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
        LAYERS:               (layers || [this._layer.getWMSInfoLayerName()]).map(l => l.getWMSInfoLayerName()).join(','),
        QUERY_LAYERS:         (layers || [this._layer.getWMSInfoLayerName()]).map(l => l.getWMSInfoLayerName()).join(','),
        filtertoken:          ApplicationState.tokens.filtertoken,
        INFO_FORMAT:          this._layer.getInfoFormat() || 'application/vnd.ogc.gml',
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
  //backward compatibilities v3.11.6
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
        MAXFEATURES:  opts.feature_count ?? 10,
        TYPENAME:     layers.map(l => l.getWFSLayerName()).join(','),
        OUTPUTFORMAT: layers[0].getInfoFormat(),
        SRSNAME:      (opts.reproject ? layers[0].getProjection() : ApplicationState.project.getProjection()).getCode(),
        FILTER:       'all' !== filter.type ? `(${(
          new ol.format.WFS().writeGetFeature({
            featureTypes: [''], //v3.11.0 @TODO need to check https://openlayers.org/en/v5.3.0/apidoc/module-ol_format_WFS-WFS.html#writeGetFeature
            filter:       ({
              'bbox':       () => ol.format.filter.bbox('the_geom', filter.value),
              'geometry':   () => ol.format.filter[filter.config.spatialMethod || 'intersects']('the_geom', filter.value),
              'expression': () => null,
            })[filter.type](),
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
                map:   ApplicationState.project.getProjection(),
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
  //Changed based on https://github.com/g3w-suite/g3w-admin/issues/1070
  //@since 3.11.7
  g3w: class {
    async query(opts = {}, params = {}) {
      const filter = opts.filter || {};
      const spatialMethod = filter.config.spatialMethod || 'intersects';
      switch(filter.type) {
        case 'bbox':
        case 'geometry':
          params.geo_filter_mode = 'within' === spatialMethod ? 'contains' : spatialMethod;
          params.geo_filter_wkt  = (new ol.format.WKT({ dataProjection: ApplicationState.map.epsg, featureProjection: ApplicationState.map.epsg })).writeFeature(new ol.Feature({ geometry: filter.value }));
          params.formatter       = 1;
          params.filtertoken     = ApplicationState.tokens.filtertoken; // add filtertoken
          break;
        case 'expression':
          break;    
      }

      const data = [];

      try {
        const response = await XHR.post({ 
          url :  this._layer.getUrl('data'),
          contentType: 'application/json',
          data:        JSON.stringify(params),
         });
         if (response && response.result) {
          data.push({ 
            layer:    this._layer,
            features: ResponseParser.get('g3w-vector/json')(
              response.vector && response.vector.data || {},
              { projections: { map: ApplicationState.project.getProjection() || this._layer.getProjection(), layer: null }})
              .map(f => { f.set(G3W_FID, f.getId()); return f; }) //set g3w_fid to have G3W_FID property,
          })
         } else {
          throw response.error;
         }
      } catch(e) {
        console.warn(e);
      }

      return { data }
      
    }  
  }
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

    // get current project
    const project   = options.project || ApplicationState.project;
    const suffixUrl = config.baselayer ? '' : `${project.getType()}/${project.getId()}/${config.id}/`;
    const vectorUrl = config.baselayer ? '' : project.state.vectorurl;
    const rasterUrl = config.baselayer ? '' : project.state.rasterurl;

    // default layer style (layerstree)
    const defaultstyle = config.styles && config.styles.find(s => s.current).name;

    /**
     * Global state
     * 
     * @TODO simplify further, some propertiy names seems to be duplicated
     * 
     */
    this.config = this.state = Object.assign(config, {
      id:        config.id || 'Layer',
      title:     config.title || config.name,
      download:  !!config.download,
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
            featurecount:         project.getUrl('featurecount'),
            editorformstructure : project.getUrl('editorformstructure'),
            /** @since 3.10.0 */
            pdf:         `/html2pdf/`,
          })
      },

      /** Custom parameters based on a project qgis version */
      ...(config.baselayer ? {} : { searchParams: { I: 0, J: 0 } }),

      /** @deprecated since 3.10.0. Will be removed in v.4.x. */
      search_endpoint: 'api',

      map_crs:            options.project?.getProjection()?.getCode(),
      multilayerid:       config.multilayer,
      projection:         config.projection ? (config.projection.getCode() === config.crs.epsg ? config.projection : Projections.get(config.crs)) : undefined,
      attributions:       config.attributions,
      selected:           config.selected || false,
      disabled:           config.disabled || false,
      metadata:           config.metadata,
      removable:          config.removable || false,
      source:             config.source,
      styles:             config.styles,
      defaultstyle,
      infoformats:        config.infoformats || [],
      projectLayer:       true,
      geolayer:           "NoGeometry" !== config.geometrytype,
      attributetable:     { pageLength: null },
      visible:            !!config.visible,
      tochighlightable:   false,

      /** state of if is in editing (setted by editing plugin) */
      inediting:          false,

      /** Reactive selection attribute */
      selection:          { active: false },

      /** Open layer features (key = fid, value = feature object) */
      ol_selection: {},

      /** selections feature `fids` */
      selectionFids: new Set(),

      /** Reactive filter attribute */
      filter: {
        active:     false,
        /** @since 3.9.0 whether filter is set from a previously saved filter */
        current:    null,
        /** @since v3.11.0 **/
        pagination: false,
      },

      /** @type { Array<{{ id: string, name: string }}> } since 3.9.0 - array of saved filters */
      filters:            config.filters || [],

      /** @type {number} since 3.8.0 */
      featurecount:       config.featurecount,

      /** @type { boolean | Object<number, number> } since 3.8.0 */
      stylesfeaturecount: config.featurecount && defaultstyle && { [defaultstyle]: config.featurecount },

      /** @type { string } since 3.10.0 */
      name:               config.name,

      /** @type { number } legend item state (expandend or collapsed) in catalog layers (TOC) (since 3.10.0) */
      expanded:           config.expanded,

      /** @type { boolean } since 3.10.0 - whether to show layer on TOC (default: true) */
      toc:                config.toc ?? true,

      /** @since 4.0.0 */
      legend: {
        url:     null,
        loading: false,
        error:   false,
        /** @deprecated since 3.8. Will be removed in 4.x. Use `expanded` attribute instead */
        show:    true,
        /** used when categories changed (checkbox on TOC) and legend is on TAB */
        change:  false,
        categories: {},
      },

      /** @type { boolean } since 4.0.0 */
      exclude_from_legend: config.exclude_from_legend ?? true,

      /** @type { boolean } whether has more than one category's legend (since 4.0.0) */
      categories: false,

      /** @since 4.0.0 */
      external:             config.source && config.source.external,

      /** @since 4.0.0 */
      bbox:                 config.bbox,

      /** @since 4.0.0 checked config attribute is passed by vector layer on editing */
      checked:              config.checked ?? !!config.visible,

      /** @since 4.0.0 */
      epsg:                 config.crs.epsg,

      /** @since 4.0.0 */
      hidden:               !!config.hidden,

      /** @since 4.0.0 */
      scalebasedvisibility: !!config.scalebasedvisibility,

      /** @since 4.0.0 */
      minscale:             config.minscale,

      /** @since 4.0.0 */
      maxscale:             config.maxscale,

      /** @since 4.0.0 */
      ows_method:           config.ows_method,
   
      /** @type {number} opacity range = [0, 100] (since 3.8) */
      opacity: config.opacity || 100,

      /** cached proxy params (eg. external wms server) */
      proxyData: { wms: null },

      /** @since 4.0.0 @type {number } number of preview fields on result */
      max_preview_fields: config.max_preview_fields, 
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

    Object.assign(this.config, {
      openattributetable: this.canShowTable(),
      downloadable:       this.isDownloadable(),
      infoformat:         this.getInfoFormat(),
    });

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
        "QGIS arcgisfeatureserver",
      ].includes(layerType) && createProvider('g3w', this),

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
          'QGIS arcgisfeatureserver', //@since 4.0.0
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
        "QGIS arcgisfeatureserver",
      ].includes(layerType) && createProvider('qgis', this),

    };

    // sanitize source url (ie. discard any reserved WMS params)
    if (config?.source?.url) {
      const url = new URL(this.config.source.url);
      ['VERSION', 'REQUEST', 'BBOX', 'LAYERS', 'WIDTH', 'HEIGHT', 'DPI', 'FORMAT', 'CRS' ].forEach(p => {
        this.config.source.url = this.config.source.url
          .replace(`${p.toUpperCase()}=${url.searchParams.get(p.toUpperCase())}`, '')
          .replace(`${p.toLowerCase()}=${url.searchParams.get(p.toLowerCase())}`, '');
      });
    }
  }

  /******************************************************************************************
   * LAYER DOWNLOAD
   *****************************************************************************************/

  /** 
   * @returns { Promise }
   */
  async getDownloadFilefromDownloadDataType(type, { data = {} }) {
    data.filtertoken = this.getFilterToken();

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

  getGeoTIFF({ data = {} } = {}) { return this.getDownloadFilefromDownloadDataType('geotiff',   { data }); }
  getXls({ data = {} } = {})     { return this.getDownloadFilefromDownloadDataType('xls',       { data }); }
  getShp({ data = {} } = {})     { return this.getDownloadFilefromDownloadDataType('shapefile', { data }); }
  getGpx({ data = {} } = {})     { return this.getDownloadFilefromDownloadDataType('gpx',       { data }); }
  getGpkg({ data = {} } = {})    { return this.getDownloadFilefromDownloadDataType('gpkg',      { data }); }
  getCsv({ data = {} } = {})     { return this.getDownloadFilefromDownloadDataType('csv',       { data }); }

  /**
   * @returns { string[] } download formats
   */
  getDownloadableFormats()  { return Object.keys(DOWNLOAD_FORMATS).filter(d => this.config[d]).map(d => DOWNLOAD_FORMATS[d].format); }

  /**
   * @returns { boolean } whether at least one layer has a download format not equal to pdf
   * 
   * @since 3.11.7  
   */
  hasDowloadableRelations() { 
    return !!this.getRelations().getArray()
      .filter(r => 'MANY' === r.getType()) //@since 4.0.6 filter onlye MANY (1:N) relation type. Exclude Join (ONE) relation type
      .find(r => getCatalogLayerById(r.getChild()).getDownloadableFormats().filter(f => 'pdf' !== f).length > 0); 
  }

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
  isDownloadable()        { return !!(this.getDownloadableFormats().length); }
  isGeoTIFFDownloadable() { return !this.isBaseLayer() && this.config.download && 'gdal' === this.config.source.type ; }
  isShpDownloadable()     { return !this.isBaseLayer() && this.config.download && 'gdal' !== this.config.source.type; }
  isXlsDownloadable()     { return !this.isBaseLayer() && !!this.config.download_xls; }
  isGpxDownloadable()     { return !this.isBaseLayer() && !!this.config.download_gpx; }
  isGpkgDownloadable()    { return !this.isBaseLayer() && !!this.config.download_gpkg; }
  isCsvDownloadable()     { return !this.isBaseLayer() && !!this.config.download_csv; }

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
  async setSelection(bool = false) {
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
      GUI.getService('map').toggleSelection(false, this.state.id); // hide selection features (open layers)
    }
    if (this.isGeoLayer() && !this.state.filter.active) {
      this.#updateOlSelection(); // update selection features (open layers)
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
      this.setFilterToken(response.data.filtertoken);
    } catch(e) {
      console.warn(e);
    }
  }

  /**
   * @since 3.9.0
   */
  saveFilter() {

    // skip when ..
    if (!this.providers['filtertoken'] || !this.state.filter.active) {
      return;
    }

    prompt({
      label: _('Save Filter'),
      value: this.state.filter.current?.name || '',
      callback: async(name) => {

        /** @example /vector/api/filtertoken/<qdjango>/<project_id>/<qgs_layer_id>/mode=save&name=<name_filter_saved> */
        const response = await XHR.get({
          url:    this.providers['filtertoken']._layer.getUrl('filtertoken'),
          params: { mode: 'save', name } }
        );

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
        this.state.selectionFids.clear();   // clear current fids

        // remove selection feature from map
        if (this.isGeoLayer()) {
          Object
            .values(this.state.ol_selection)
            .forEach(feat => {
              //remove selection feature
              if (feat.added) {
                GUI.getService('map').setSelectionFeatures('remove', { feature: feat.feature });
              }
              feat.added    = false;
              feat.selected = false;
            });
        }

        this.emit('unselectionall', this.getId());
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
      this.setFilterToken(filtertoken); //set filtertoken 
      // set active filter to false
      if (this.state.filter.active) { this.setFilter(false) }
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
  setFilterToken(filtertoken = undefined) {
    ApplicationState.tokens.filtertoken = filtertoken;
    this.setFilter(!!filtertoken);
    this.emit('filtertokenchange', { layerId: this.getId() });
  }

  /**
   * Create filter token
   */
  async createFilterToken() {
    try {

      const provider  = this.providers['filtertoken'];
      const selection = this.state.selectionFids;

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

      const { data = {} } = await XHR.post({
        url:    provider._layer.getUrl('filtertoken'),
        contentType: 'application/json',
        data: JSON.stringify(selection.has(SELECTION.EXCLUDE)
          ? { fidsout: fids.filter(id => id !== SELECTION.EXCLUDE).join(',') } // exclude features from selection
          : { fidsin: fids.join(',') })                                   // include features in selection
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
    return this.state.filter.active ? ApplicationState.tokens.filtertoken : undefined;
  }

  /**
   * @TODO add description
   */
  setSelectionFidsAll() {
    this.state.selectionFids.clear();
    this.state.selectionFids.add(SELECTION.ALL);

    // select all features (open layers)
    if (this.isGeoLayer()) {
      Object.values(this.state.ol_selection).forEach(feat => feat.selected = true);
      this.#updateOlSelection();
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
    return this.state.selectionFids;
  }

  /**
   * Invert current selection fids
   */
  invertSelectionFids() {
    const selection = this.state.selectionFids;

    /** In case selection set has EXCLUDE string, just remove it and ids are already selection */
    if (selection.has(SELECTION.EXCLUDE))  { selection.delete(SELECTION.EXCLUDE); }
    // In case of all features selected, need to remove ALL, and size of selection is 0 (no selection features)
    else if (selection.has(SELECTION.ALL)) { selection.delete(SELECTION.ALL); }
    //In case there are some feature id selected, just add EXCLUDE to exclude current selection fids
    else if (selection.size > 0)           { selection.add(SELECTION.EXCLUDE); }
    // invert selection (state)
    if (this.isGeoLayer()) {
      const map = GUI.getService('map');
      Object
        .values(this.state.ol_selection)
        .forEach(f => {
          f.selected          = !f.selected;
          f.feature.__layerId = this.getId(); //need to add __layerId
          if (f.selected !== f.added) {
            map.setSelectionFeatures(f.selected ? 'add' : 'remove', { feature: f.feature });
            f.added = f.selected;
          }
        });
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
    const selection = this.state.selectionFids;

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

    const selection = this.state.selectionFids;

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

    // update selection (state)
    if (this.isGeoLayer() && this.state.ol_selection[fid]?.feature) {
      this.state.ol_selection[fid].selected          = !is_excluded;
      this.state.ol_selection[fid].feature.__layerId = (!is_excluded && !this.state.ol_selection[fid].added) ? this.getId() : undefined; // <-- used when working with selected Layer features
      this.#updateOlSelection();
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

    const selection = this.state.selectionFids;

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

    const is_excluded = selection.has(SELECTION.EXCLUDE) ? selection.has(fid) : !selection.has(fid);

    // update selection (state)
    if (this.isGeoLayer() && this.state.ol_selection[fid]?.feature) {
      this.state.ol_selection[fid].selected          = !is_excluded;
      this.state.ol_selection[fid].feature.__layerId = (!is_excluded && !this.state.ol_selection[fid].added) ? this.getId() : undefined; // <-- used when working with selected Layer features
      this.#updateOlSelection();
    }

    /** If there is a filterActive */
    if (createToken && this.state.filter.active) {
      await this.createFilterToken();
    }

  }

  /**
   * Clear selection
   */
  async clearSelectionFids() {
    //clear all selection fids from set
    this.state.selectionFids.clear();
    // unselect all features (open layers)
    if (this.isGeoLayer()) {
      //set false selection
      Object.values(this.state.ol_selection).forEach(feat => feat.selected = false);
      //update selection
      this.#updateOlSelection();
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
    return type ? this.state.proxyData[type] : this.state.proxyData;
  }

  /**
   * Set proxy data
   *
   * @param type
   * @param data
   */
  setProxyData(type, data = {}) {
    this.state.proxyData[type] = data;
  }

  /**
   * Clear proxy data
   *
   * @param type
   */
  clearProxyData(type) {
    this.state.proxyData[type] = null;
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
        this.state.proxyData[type][c][p] = changes[c][p];
      })
    });
    return this.getDataProxyFromServer(type, this.state.proxyData[type]);
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
            filtertoken: this.getFilterToken()
          })
      );

      const features          = response.data.features && response.data.features || [];
      const layerAttributes   = this.getAttributes() || [];
      const featureAttributes = (features.length ? features[0].properties : []);

      return {
        features,
        headers: (layerAttributes && layerAttributes.length > 0)
        ? layerAttributes.filter(attr => Object.keys(featureAttributes).indexOf(attr.name) > -1)
        : Object
            .keys(featureAttributes)
            .filter(name => -1 === GEOMETRY_FIELDS.indexOf(name))
            .map(name => ({ name, label: name })),
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
                /** @since 3.11.0 */
                autofilter: options.autofilter,
                page:       options.page,
                page_size:  options.page_size,
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
    page,  //@since 3.11.0
    page_size, //@since 3.11.0
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
      page,
      page_size,
    };
    try {
      const url = queryUrl ? queryUrl : provider._layer.getUrl('data');
      const response =  await XHR.post({ url, contentType: 'application/json', data: JSON.stringify(params)}); // since g3w-admin@v3.7
      // vector layer
      if ('table' !== provider._layer.getType()) {
        provider._projections.map = ApplicationState.project.getProjection() || provider._projections.layer;
      }

      if (raw)                           { return response }
      if (unique && response.result)     { return response.data }
      if (fformatter && response.result) { return response }

      if (response.result) {
        return {
          data: ResponseParser.get('application/json')({
            layers:      [provider._layer],
            response:    response.vector.data,
            filtertoken: response.filtertoken, //@since v3.11.0 returned filtertoken in case of autofilter request
            projections: provider._projections,
          }),
          count: response.vector.count, //@since v3.11.0 take in account feature count (all). It use for pagination purpose
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
      return Promise.reject(_('Layer is not searchable'));
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
      return Promise.reject(_('Layer is not querable'));
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
    return this.config.servertype || "QGIS";
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
    return this.state.visible;
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
  setTocHighlightable(bool = false) {
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
    return this.config?.infolayer || this.config.origname;
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
   * @returns { boolean } whether is possible to show attributes table 
   */
  canShowTable() {
    return (
      !this.config.not_show_attributes_table && !this.isBaseLayer() && 
      (
        (this.isQueryable() && this.getTableFields().length > 0 && ["QGIS postgres", "QGIS oracle", "QGIS wfs", "QGIS ogr", "QGIS mssql", "QGIS spatialite"].includes(`${this.getServerType()} ${this.config.source.type}`))
        || ("G3WSUITE geojson" === `${this.getServerType()} ${this.get('source').type}`)
        || (this.isFilterable() && "G3WSUITE" !== this.getServerType())
      )
    );
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
   * Change featurecount and editor form structure for a specific style
   * 
   * @since 4.0.0
   */
  async changeCurrentStyle(style) {
    //check if style is current set on layer. If not change
    if (!(this.config.styles.find(s => style === s.name) || {}).current) {
      try {
        //get feature count for a specific style
        await this.getStyleFeatureCount(style);
        //get editor form structure for a specific style
        await this.getStyleEditorFormStructure(style);
        //set as current the style passed
        this.config.styles.forEach(s => s.current = style === s.name);
        //In case of change need to call change function
        this.change();
        //return true. Style change
        return true;
      } catch(e) {
        console.warn(e);    
      }
    }
    //return false because style is current or in case of error
    return false;
  }

  /**
   * Get editor from structure for a specific style
   * @param {String} style 
   */
  async getStyleEditorFormStructure(style) {
    try {
      const { result, data = {} } = await XHR.post({
        url:          `${this.config.urls.editorformstructure}${this.getId()}/`,
        data:         JSON.stringify({ style }),
        contentType: 'application/json'
      });
      if (result) {
        //set form structure
        this.config.editor_form_structure = data?.editor_form_structure;
        //@since 4.0.1 get fields from server (maybe are changed)
        this.config.fields = data?.fields || this.config.fields;
        
        //@since 4.0.0 set scale visibility on change style
        this.state.scalebasedvisibility   = data?.scalebasedvisibility;
        this.state.minscale               = data?.minscale;
        this.state.maxscale               = data?.maxscale;
        return data ?? {};
      }
    } catch(e) {
      console.warn(e);
      throw e;
    }
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
        console.warn(e);
        this.state.stylesfeaturecount[style] = {};
        throw e;
      }
    };
    //set current feature count to change
    this.state.featurecount = this.state.stylesfeaturecount[style];
    return this.state.stylesfeaturecount[style]
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
    this.state.categories = false;
  }

  /**
   * [LAYER SELECTION] ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   * 
   * Get OpenLayer selection feature by feature id
   * 
   * @param id
   * 
   * @since 4.0.0
   */
  getOlSelectionFeature(id) {
    return this.state.ol_selection[id];
  }

  /**
   * [LAYER SELECTION] ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  addOlSelectionFeature({ id, feature: feat } = {}) {
    //create a new ol feature
    const feature = new ol.Feature(feat.geometry);
    //@since 4.0.2 In case of no G3W_FID attribute, need to add it to selection features to sync with content result
    if (undefined === feat.attributes[G3W_FID]) {
      feat.attributes[G3W_FID] = id; //add id as G3W_FID attribute
    }
    feature.setId(`${this.getId()}_${id}`); // see: #777, prevent ID collision when selecting features from multiple layers
    Object.entries(feat.attributes).forEach(([a, v]) => feature.set(a, v));
    this.state.ol_selection[id] = this.state.ol_selection[id] || {
      feature,
      added:    false,
      selected: false, /** @since 3.9.9 */
    };
    return this.state.ol_selection[id];
  }

  /**
   * [LAYER SELECTION] ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * Show all selection features
   *
   * @since 4.0.0
   */
  #updateOlSelection() {
    const map = GUI.getService('map');
    // Loop `added` features (selected)
    Object
      .values(this.state.ol_selection)
      .forEach(f => {
        if (f.selected !== f.added) {
          f.feature.__layerId = this.getId(); //@since 4.0.1 need to add layerId. It used to reconize feature selected by layer id
          map.setSelectionFeatures(f.selected ? 'add' : 'remove', { feature: f.feature });
          f.added = f.selected;
        }
      });
    // Ensures selection layer is always visible on map
    map.toggleSelection(
      !this.state.filter.active && Object.values(this.state.ol_selection).some(f => f.selected),
      this.state.id
    );
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
    this.state.visible = bool && this.isChecked();
    // emit 'change' event
    if (visible !== this.state.visible) {
      this.change?.();
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
    return this.config.source.external ? this.config.source.styles : this.config.styles;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getStyle() {
    return this.config.source.external ? this.config.source.styles : this.config.styles ? this.config.styles.find(s => s.current).name : '';
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
    return this.config.styles.find(s => s.current);
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
      let setVisible = true;
      let parentGroup = this.state.parentGroup;
      while (parentGroup) {
        setVisible  = setVisible && parentGroup.checked;
        parentGroup = parentGroup.parentGroup;
      }
      if (setVisible) {
        this.setVisible(!this.state.disabled);
      }
      // change toc highlight property based on disabled otr not
      if (this.isFilterable()) {
        this.setTocHighlightable(!this.state.disabled);
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
    return this.config.multilayerid;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getGeometryType() {
    return this.config.geometrytype;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getOwsMethod() {
    return this.config.ows_method;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  setProjection(crs = {}) {
    this.config.projection = Projections.get(crs);
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getProjection() {
    return this.config.projection;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getEpsg() {
    return this.config.crs.epsg;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getCrs() {
    return this.config.projection ? this.config.projection.getCode() : null;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  isCached() {
    return this.config.cache_url && '' !== this.config.cache_url;
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @since 4.0.0
   */
  getCacheUrl() {
    // mapproxy provider → cache_url already contains "{z}/{x}/{-y}.png"
    if (this.isCached() && this.config.cache_provider && 'mapproxy' === this.config.cache_provider) {
      return this.config.cache_url;
    }
    if (this.isCached()) {
      return `${this.config.cache_url}/{z}/{x}/{y}.png`;
    }
  }

  /**
   * ORIGINAL SOURCE: src/map/layers/geo-mixin.js@v3.11.8
   *
   * @virtual method need to be implemented by subclasses
   * 
   * @since 4.0.0
   */
  getMapLayer() {
    console.log('overwrite by single layer')
  }

  /**
   * @returns { string } wms layer name for wms request
   */
  getWMSLayerName() {
    return this.config.wms_use_layer_ids ? this.getId() : this.getName()
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
 * Layer Capabilities
 */
Layer.CAPABILITIES = {
  QUERYABLE:  1,
  FILTERABLE: 2,
  EDITABLE:   4,
};

export { Layer };