import ProjectsRegistry           from 'store/projects';
import ApplicationService         from 'services/application';
import ApplicationState           from 'store/application-state';
import {
  PRINT_SCALES as scale,
  PRINT_RESOLUTIONS as dpis,
  PRINT_FORMATS as formats
}                                 from 'app/constant';
import GUI                        from 'services/gui';
import { getScaleFromResolution } from 'utils/getScaleFromResolution';
import { getResolutionFromScale } from 'utils/getResolutionFromScale';
import { getMetersFromDegrees }   from 'utils/getMetersFromDegrees';


const {
  base,
  inherit,
  downloadFile,
  convertObjectToUrlParams,
}                           = require('utils');
const { t }                 = require('core/i18n/i18n.service');
const G3WObject             = require('core/g3wobject');
const PrintPage             = require('gui/print/vue/printpage');

/*
 http://localhost/fcgi-bin/qgis_mapserver/qgis_mapserv.fcgi
  ?MAP=/home/marco/geodaten/projekte/composertest.qgs
  &SERVICE=WMS&VERSION=1.3.0
  &REQUEST=GetPrint
  &TEMPLATE=Composer 1
  &map0:extent=693457.466131,227122.338236,700476.845177,230609.807051
  &BBOX=693457.466131,227122.338236,700476.845177,230609.807051
  &CRS=EPSG:21781
  &WIDTH=1467
  &HEIGHT=729
  &LAYERS=layer0,layer1
  &STYLES=,
  &FORMAT=pdf
  &DPI=300
  &TRANSPARENT=true

 In detail, the following parameters can be used to set properties for composer maps:

 <mapname>:EXTENT=<xmin,ymin,xmax, ymax> //mandatory
 <mapname>:ROTATION=<double> //optional, defaults to 0
 <mapname>:SCALE=<double> //optional. Forces scale denominator as server and client may have different scale calculations
 <mapname>:LAYERS=<comma separated list with layer names> //optional. Defaults to all layer in the WMS request
 <mapname>:STYLES=<comma separated list with style names> //optional
 <mapname>:GRID_INTERVAL_X=<double> //set the grid interval in x-direction for composer grids
 <mapname>:GRID_INTERVAL_Y=<double> //set the grid interval in x-direction for composer grids
 */

/**
 * @deprecated since 3.9.1 will be removed in 4.x
 * 
 * ORIGINAL SOURCE: src\app\core\print\printservice.js@3.9.0
 */
const PRINT_UTILS = {
  /**
   * @param { Object } opts
   * @param opts.rotation,
   * @param opts.dpi
   * @param opts.format
   * @param opts.template
   * @param { Array } opts.maps
   * @param { Array } opts.labels
   * @param opts.is_maps_preset_theme
   * @param { 'GET' | 'POST' } method
   */
  print(opts = {}, method = 'GET') {
    const store  = ProjectsRegistry.getCurrentProject().getLayersStore();
    const layers = store
      .getLayers({ PRINTABLE: { scale: opts.scale }, SERVERTYPE: 'QGIS' })
      .reverse(); // reverse order is important

    // skip when ..
    if (!layers.length) {
      return Promise.resolve({layers: false})
    }

    const LAYERS = layers.map(l => l.getPrintLayerName()).join();

    return PRINT_UTILS[method]({
      url: store.getWmsUrl(),
      mime_type: ({ pdf: 'application/pdf', jpg: 'image/jpeg' })[opts.format],
      params: {
        SERVICE:     'WMS',
        VERSION:     '1.3.0',
        REQUEST:     'GetPrint',
        TEMPLATE:    opts.template,
        DPI:         opts.dpi,
        STYLES:      layers.map(l => l.getStyle()).join(','),
        LAYERS:      opts.is_maps_preset_theme ? undefined : LAYERS,
        FORMAT:      opts.format,
        CRS:         store.getProjection().getCode(),
        filtertoken: ApplicationState.tokens.filtertoken,
        ...(opts.maps || []).reduce((params, map) => {
          params[map.name + ':SCALE']    = map.scale;
          params[map.name + ':EXTENT']   = map.extent;
          params[map.name + ':ROTATION'] = opts.rotation;
          params[map.name + ':LAYERS']   = opts.is_maps_preset_theme && undefined === map.preset_theme ? LAYERS : undefined;
          return params;
        }, {}),
        ...(opts.labels || []).reduce((params, label) => {
          params[label.id] = label.text;
          return params;
        }, {})
      },
    });
  },
  /**
   * @param { Object } opts
   * @param opts.field
   * @param opts.values
   * @param opts.template
   * @param opts.download
   * @param { 'GET' | 'POST' } method
   */
  printAtlas(opts = {}, method = 'GET') {
    const store = ProjectsRegistry.getCurrentProject().getLayersStore();
    const multi = opts.values.length > 1;
    return PRINT_UTILS[method]({
      url: store.getWmsUrl(),
      mime_type: 'application/pdf',
      params:    {
        SERVICE:     'WMS',
        VERSION:     '1.3.0',
        REQUEST:     'GetPrintAtlas',
        EXP_FILTER:  opts.field + (multi ? ' IN (' : '=') + (opts.values.map(v => `'${v}'`).join()) + (multi ? ')' : ''),
        TEMPLATE:    opts.template,
        filtertoken: ApplicationState.tokens.filtertoken,
        DOWNLOAD:    opts.download ? 1 : undefined,
      },
    })
  },

  /**
   * @param { Object } opts
   * @param opts.url
   * @param opts.params
   * @param opts.mime_type
   * @return {Promise<{mime_type, layers: boolean, url: string}>}
   * @constructor
   */
  async POST({ url, params, mime_type }) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: convertObjectToUrlParams(params),
    });
    if (!response.ok) {
      //@TODO Need to translate
      throw new Error(500 === response.status ? 'Internal Server Error' : 'Request Failed');
    }
    return {
      mime_type,
      layers: true,
      url: URL.createObjectURL(await response.blob()),
    };
  },
  /**
   * @param { Object } opts
   * @param opts.url
   * @param opts.params
   * @param opts.mime_type
   * @return {Promise<unknown>}
   * @constructor
   */
  GET({url, params, mime_type}) {
    return new Promise((resolve, reject) => {
      resolve({
        url: `${url}?${convertObjectToUrlParams(params)}`,
        layers: true,
        mime_type
      });
    })
  },

  /**
   * Get wms url for current project
   * @returns {*}
   */
  getUrl() {
    return ProjectsRegistry.getCurrentProject().getLayersStore().getWmsUrl();
  },

};

function PrintComponentService() {
  base(this);

  /** @deprecated since 3.9.1 will be removed in 4.x */
  this.printService = PRINT_UTILS;

  this._initialized = false;
  this.state = {
    loading: false
  };
  this._moveMapKeyEvent = null;
  this._page = null;
  this._mapService = null;
  this._map = null;
  this._mapUnits;
  this._scalesResolutions = {};

  this.init = function() {
    this._project = ProjectsRegistry.getCurrentProject();
    this.state.print = this._project.getPrint() || [];
    this.state.visible = this.state.print.length > 0;
    this.state.isShow = false;
    this.state.url = null;
    this.state.output = {
      url: null,
      method: this._project.getOwsMethod(),
      layers: true,
      format: null,
      loading: false,
      type: null
    };
    this.state.printextent = {
      minx: [0, 0],
      miny: [0, 0],
      maxx: [0, 0],
      maxy: [0, 0]
    };
    if (this.state.visible) {
      this.setInitState();
    }
  };
}

inherit(PrintComponentService, G3WObject);

const proto = PrintComponentService.prototype;

/**
 *
 */
proto.setInitState = function() {
  this.state.template      = this.state.print[0].name;
  this.state.atlas         = this.state.print[0].atlas;
  this.state.atlasValues   = [];
  this.state.rotation      = 0;
  this.state.inner         = [0, 0, 0, 0];
  this.state.center        = null;
  this.state.size          = null;
  this.state.scale         = scale;
  this.state.scala         = null;
  this.state.dpis          = dpis;
  this.state.dpi           = dpis[0];
  this.state.formats       = formats;
  this.state.output.format = formats[0].value;
  this.state.maps          = this.state.print[0].maps;
  // label section
  this.state.labels        = this.state.print[0].labels;
};

/**
 *
 */
proto.changeTemplate = function() {
  if (!this.state.template) {
    return;
  }
  const has_previous = this.state.atlas || 0 === this.state.maps.length;
  const print        = this.state.print.find(p => p.name === this.state.template)

  this.state.maps        = print.maps;
  this.state.atlas       = print.atlas;
  this.state.labels      = print.labels;
  this.state.atlasValues = [];

  if (this.state.atlas) {
    this._clearPrint();
  } else if (has_previous) {
    this.showPrintArea(true);
  } else {
    this._setPrintArea();
  }
};

/**
 * On change scala set print area
 */
proto.changeScale = function() {
  if (this.state.scala) {
    this._setPrintArea();
  }
};

/**
 * On change rotation, rotate print area
 */
proto.changeRotation = function() {
  this._mapService
    .setInnerGreyCoverBBox({
      rotation: this.state.rotation
    });
};

/**
 *
 * @returns {string}
 * @private
 */
proto._getPrintExtent = function() {
  const [minx, miny, maxx, maxy] = [
    ... this.state.printextent.lowerleft,
    ...this.state.printextent.upperright
  ];
  return (
    this._mapService.isAxisOrientationInverted() ?
      [miny, minx, maxy, maxx ] :
      [minx, miny, maxx, maxy]
  ).join();
};

/**
 *
 * @param extent
 * @returns {string}
 */
proto.getOverviewExtent = function(extent={}) {
  const {xmin, xmax, ymin, ymax} = extent;
  return (
    this._mapService.isAxisOrientationInverted() ?
      [ymin, xmin, ymax, xmax ] :
      [xmin, ymin, xmax, ymax]
  ).join();
};

/**
 *
 * @returns {{template, maps: {extent: *, name: *, preset_theme: *, scale: *|null}[], rotation, format, scale: (null|*), is_maps_preset_theme: boolean, dpi: (number|*), labels}}
 * @private
 */
proto._getOptionsPrint = function() {
  let is_maps_preset_theme = false;
  const maps = this.state.maps.map(map => {
    is_maps_preset_theme = is_maps_preset_theme || undefined !== map.preset_theme;
    return {
      name: map.name,
      preset_theme: map.preset_theme,
      scale: map.overview ? map.scale : this.state.scala,
      extent: map.overview ? this.getOverviewExtent(map.extent) : this._getPrintExtent()
    }
  });

  return {
    rotation: this.state.rotation,
    dpi: this.state.dpi,
    template: this.state.template,
    maps,
    scale: this.state.scala,
    format: this.state.output.format,
    labels: this.state.labels,
    is_maps_preset_theme
  };
};

/**
 *
 */
proto.setPrintAreaAfterCloseContent = function() {
  this._map.once('postrender', this._setPrintArea.bind(this));
  this.stopLoading();
};

/**
 *
 * @returns {Promise<unknown>}
 */
proto.print = function() {
  return new Promise((resolve, reject) => {
    //disable sidebar
    GUI.disableSideBar(true);
    //atlas print
    if (this.state.atlas) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.state.loading = true;
      this.printService
        .printAtlas({
          template: this.state.template,
          field: this.state.atlas.field_name || '$id',
          values: this.state.atlasValues,
          download: true
        })
        .then(({url}) => {
          downloadFile({
            url,
            filename: this.state.template,
            mime_type: 'application/pdf'
          })
            .then(resolve)
            .catch(error => {
              this.showError(error);
              reject();
            })
            .finally(() => {
              this.state.loading = false;
              ApplicationService.setDownload(false, caller_download_id);
              GUI.disableSideBar(false);
            });
        })
    } else {
      this.state.output.url = null;
      this.state.output.layers = true;
      this._page = new PrintPage({
        service: this
      });

      GUI.setContent({
        content: this._page,
        title: 'print',
        perc: 100
      });

      this.printService
        .print(this._getOptionsPrint(), this.state.output.method)
        .then((data) => {
          this.state.output.url = data.url;
          this.state.output.layers = data.layers;
          this.state.output.mime_type = data.mime_type;
          resolve();
        })
        .catch(err => {
          this.showError();
          reject(err);
        })
        .finally(() => {
          // in case of no layers
          if (!this.state.output.layers) {
            GUI.disableSideBar(false);
          }
        });
    }
  })

};

/**
 * Set loading
 */
proto.startLoading = function() {
  this.state.output.loading = true;
};

/**
 *Stop Loading
 */
proto.stopLoading = function() {
  this.state.output.loading = false;
};

/**
 *
 * @param error
 */
proto.showError = function(error) {
  GUI.notify.error(error || t("info.server_error"));
  GUI.closeContent();
};

/**
 *
 * @private
 */
proto._calculateInternalPrintExtent = function() {
  const resolution            = this._map.getView().getResolution();
  const scala                 = parseFloat(this.state.scala);
  const {h: height, w: width} = this.state.maps.find(map=> !map.overview);
  const resolutionInMeters    = this._mapService.getMapUnits() === 'm' ? resolution : getMetersFromDegrees(resolution);
  const w                     = (((width / 1000.0) * scala) / resolutionInMeters);
  const h                     = (((height  / 1000.0) * scala) / resolutionInMeters);
  // get current map center ( in pixel)
  const center                = [
    (this.state.size[0]) / 2, // X
    (this.state.size[1]) / 2  // Y
  ];
  // Calculate the inner bbox in pixel
  const xmin                  = center[0] - (w / 2);
  const ymin                  = center[1] - (h / 2);
  const xmax                  = center[0] + (w / 2);
  const ymax                  = center[1] + (h / 2);

  this.state.printextent.lowerleft = this._map.getCoordinateFromPixel([xmin, ymax])
    ? this._map.getCoordinateFromPixel([xmin, ymax])
    : this.state.printextent.lowerleft;

  this.state.printextent.upperright = this._map.getCoordinateFromPixel([xmax, ymin])
    ? this._map.getCoordinateFromPixel([xmax, ymin])
    : this.state.printextent.upperright;

  this.state.inner = [xmin, ymax, xmax, ymin];
};

/**
 *
 * @private
 */
proto._setPrintArea = function() {
  //No maps set. Only attributes label
  if (0 === this.state.maps.length) {
    this._clearPrint();
    return;
  }
  this.state.size         = this._map.getSize();
  const resolution        = this._map.getView().getResolution();
  this.state.currentScala = getScaleFromResolution(resolution, this._mapUnits);
  this.state.center       = this._map.getView().getCenter();

  this._calculateInternalPrintExtent();
  this._mapService.setInnerGreyCoverBBox({
    type: 'pixel',
    inner: this.state.inner,
    rotation: this.state.rotation
  });
};

/**
 *
 * @param reset
 * @private
 */
proto._clearPrint = function(reset=false) {
  ol.Observable.unByKey(this._moveMapKeyEvent);
  this._moveMapKeyEvent = null;
  this._mapService.stopDrawGreyCover();
};

/**
 *
 * @param maxResolution
 * @private
 */
proto._setAllScalesBasedOnMaxResolution = function(maxResolution) {
  let resolution             = maxResolution;
  const mapScala             = getScaleFromResolution(resolution, this._mapUnits);
  const orderScales          = _.orderBy(this.state.scale, ['value'], ['desc']);
  let scale                  = [];
  let addedFirstHighestScale = false;
  const handleScala = (scala) => {
    scale.push(scala);
    resolution = getResolutionFromScale(scala.value, this._mapUnits);
    this._scalesResolutions[scala.value] = resolution;
    resolution = resolution / 2;
  };
  orderScales
    .forEach((scala, index) => {
      if (mapScala > scala.value) {
        if (!addedFirstHighestScale) {
          const higherScale = orderScales[index-1];
          handleScala(higherScale);
          addedFirstHighestScale = true;
        }
        handleScala(scala);
      }
    });

  this.state.scale = scale;
};

/**
 *
 * @private
 */
proto._setInitialScalaSelect = function() {
  this.state.scala = this.state.scale[0].value;
  $('#scala').val(this.state.scala);
};

/**
 *
 * @param resolution
 * @private
 */
proto._setCurrentScala = function(resolution) {
  Object
    .entries(this._scalesResolutions)
    .find(([scala, res]) => {
      if (resolution <= res) {
        this.state.scala = scala;
        return true
      }
    });
};

/**
 *
 * @private
 */
proto._setMoveendMapEvent = function() {
  this._moveMapKeyEvent = this._map.on('moveend', this._setPrintArea.bind(this));
};

/**
 *
 * @private
 */
proto._showPrintArea = function() {
  if (this.state.atlas === undefined) {
    this._setPrintArea();
    this._mapService.startDrawGreyCover();
  }
};

/**
 *
 * @private
 */
proto._initPrintConfig = function() {
  if (!this._initialized) {
    const maxResolution = this._map.getView().getMaxResolution();
    this._setAllScalesBasedOnMaxResolution(maxResolution);
    this._initialized = true;
  }
  const resolution = this._map.getView().getResolution();
  this._setCurrentScala(resolution);
};

/**
 *
 * @param bool
 */
proto.showPrintArea = function(bool) {
  // close content if open
  this.state.isShow = bool;
  GUI
    .closeContent()
    .then(mapComponent => {
      setTimeout(() => {
        this._mapService = mapComponent.getService();
        this._mapUnits = this._mapService.getMapUnits();
        this._mapService.getMap().once('postrender', evt => {
          this._map = evt.map;
          if (bool) {
            this._setMoveendMapEvent();
            this._initPrintConfig();
            this._showPrintArea();
          } else {
            this._clearPrint();
          }
        });
        this._mapService.getMap().renderSync();
      })
    })
};

/**
 *
 */
proto.reload = function() {
  this._project      = ProjectsRegistry.getCurrentProject();
  this._mapService   = GUI.getService('map');
  this._map          = this._mapService.viewer.map;
  this.state.print   = this._project.state.print || [];
  this.state.visible = this.state.print.length > 0;

  if (this.state.visible) {
    this.state.template = this.state.print[0].name;
    if (!this._initialized) {
      this.init();
    }
    this._initPrintConfig();
    this._mapService.on('changeviewaftercurrentproject', () => {
      const maxResolution = this._map.getView().getMaxResolution();
      this.state.scale = scale;
      this._setAllScalesBasedOnMaxResolution(maxResolution);
    });
  } else {
    this._clearPrint();
  }
};

module.exports = {
  PrintComponentService,
  PRINT_UTILS,
};