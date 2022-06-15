const {base, inherit, downloadFile} = require('core/utils/utils');
const ApplicationService = require('core/applicationservice');
const {t} = require('core/i18n/i18n.service');
const GUI = require('gui/gui');
const G3WObject = require('core/g3wobject');
const ProjectsRegistry = require('core/project/projectsregistry');
const PrintService = require('core/print/printservice');
const {getScaleFromResolution, getResolutionFromScale, getMetersFromDegrees} = require('g3w-ol/src/utils/utils');
const printConfig = require('./printconfig');
const PrintPage = require('./vue/printpage');
const scale = printConfig.scale;
const dpis = printConfig.dpis;
const formats = printConfig.formats;

function PrintComponentService() {
  base(this);
  this.printService = new PrintService();
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
  this.init = function(){
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
    this.state.visible && this.setInitState();
  };
}

inherit(PrintComponentService, G3WObject);

const proto = PrintComponentService.prototype;

proto.setInitState = function(){
  this.state.template = this.state.print[0].name;
  this.state.atlas = this.state.print[0].atlas;
  this.state.atlasValues = [];
  this.state.rotation = 0;
  this.state.inner = [0, 0, 0, 0];
  this.state.center = null;
  this.state.size = null;
  this.state.scale = scale;
  this.state.scala = null;
  this.state.dpis = dpis;
  this.state.dpi = dpis[0];
  this.state.formats = formats;
  this.state.output.format = formats[0].value;
  this.state.maps = this.state.print[0].maps;
  // label section
  this.state.labels = this.state.print[0].labels;
};

proto.changeTemplate = function() {
  if (!this.state.template) return;
  const isPreviousAtlas = this.state.atlas;
  const {atlas, maps, labels} = this.state.print.find(print => print.name === this.state.template);
  this.state.maps = maps;
  this.state.atlas = atlas;
  this.state.labels = labels;
  this.state.atlasValues = [];
  this.state.atlas ? this._clearPrint() : isPreviousAtlas ? this.showPrintArea(true) : this._setPrintArea();
};

proto.changeScale = function() {
  this.state.scala && this._setPrintArea();
};

proto.changeRotation = function() {
  this._mapService.setInnerGreyCoverBBox({
    rotation: this.state.rotation
  });
};

proto._getPrintExtent = function() {
  const [minx, miny, maxx, maxy] = [... this.state.printextent.lowerleft, ...this.state.printextent.upperright];
  const extent = this._mapService.isAxisOrientationInverted() ? [miny, minx, maxy, maxx ] : [minx, miny, maxx, maxy];
  return extent.join()
};

proto.getOverviewExtent = function(extent={}) {
  const {xmin, xmax, ymin, ymax} = extent;
  const overviewextent =  this._mapService.isAxisOrientationInverted() ? [ymin, xmin, ymax, xmax ] : [xmin, ymin, xmax, ymax];
  return overviewextent.join();
};

proto._getOptionsPrint = function() {
  let is_maps_preset_theme = false;
  const maps = this.state.maps.map(map => {
    is_maps_preset_theme = is_maps_preset_theme || map.preset_theme !== undefined;
    return {
      name: map.name,
      preset_theme: map.preset_theme,
      scale: map.overview ? map.scale : this.state.scala,
      extent: map.overview ? this.getOverviewExtent(map.extent) : this._getPrintExtent()
    }
  });
  const options = {
    rotation: this.state.rotation,
    dpi: this.state.dpi,
    template: this.state.template,
    maps,
    scale: this.state.scala,
    format: this.state.output.format,
    labels: this.state.labels,
    is_maps_preset_theme
  };

  return options;
};

proto.setPrintAreaAfterCloseContent = function() {
  this._map.once('postrender', this._setPrintArea.bind(this));
  this.stopLoading();
};

proto.print = function() {
  return new Promise((resolve, reject) => {
    //disable sidebar
    GUI.disableSideBar(true);
    if (this.state.atlas) {
      const caller_download_id = ApplicationService.setDownload(true);
      this.state.loading = true;
      this.printService.printAtlas({
        template: this.state.template,
        field: this.state.atlas.field_name || '$id',
        values: this.state.atlasValues,
        download: true
      }).then(({url}) => {
        downloadFile({
          url,
          filename: this.state.template,
          mime_type: 'application/pdf'
        }).then(()=>{
          resolve();
        }).catch( error => {
          this.showError(error);
          reject();
        }).finally(()=> {
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
      const options = this._getOptionsPrint();
      this.printService.print(options, method=this.state.output.method)
        .then(data => {
          this.state.output.url = data.url;
          this.state.output.layers = data.layers;
          this.state.output.mime_type = data.mime_type;
          resolve();
        })
        .catch(err=> {
          this.showError();
          reject(err);
        })
        .finally(()=> {
          // in case of no layers
          !this.state.output.layers && GUI.disableSideBar(false)
        });
    }
  })

};

proto.startLoading = function() {
  this.state.output.loading = true;
};

proto.stopLoading = function() {
  this.state.output.loading = false;
};

proto.showError = function(error) {
  GUI.notify.error(error || t("info.server_error"));
  GUI.closeContent();
};

proto._calculateInternalPrintExtent = function() {
  const resolution = this._map.getView().getResolution();
  const scala = parseFloat(this.state.scala);
  const {h: height, w: width} = this.state.maps.find(map=> !map.overview);
  const resolutionInMeters = this._mapService.getMapUnits() === 'm' ? resolution : getMetersFromDegrees(resolution);
  const w = (((width / 1000.0) * scala) / resolutionInMeters) * ol.has.DEVICE_PIXEL_RATIO;
  const h = (((height  / 1000.0) * scala) / resolutionInMeters) * ol.has.DEVICE_PIXEL_RATIO;
  // get current map center ( in pixel)
  const center = [
    (this.state.size[0] * ol.has.DEVICE_PIXEL_RATIO) / 2, // X
    (this.state.size[1] * ol.has.DEVICE_PIXEL_RATIO) / 2  // Y
  ];
  // Calculate the inner bbox in pixel
  const xmin = center[0] - (w / 2);
  const ymin = center[1] - (h / 2);
  const xmax = center[0] + (w / 2);
  const ymax = center[1] + (h / 2);
  this.state.printextent.lowerleft = this._map.getCoordinateFromPixel([xmin, ymax]) ? this._map.getCoordinateFromPixel([xmin, ymax]) : this.state.printextent.lowerleft;
  this.state.printextent.upperright = this._map.getCoordinateFromPixel([xmax, ymin]) ? this._map.getCoordinateFromPixel([xmax, ymin]) : this.state.printextent.upperright;
  this.state.inner =  [xmin, ymax, xmax, ymin];
};

proto._setPrintArea = function() {
  this.state.size = this._map.getSize();
  const resolution = this._map.getView().getResolution();
  this.state.currentScala = getScaleFromResolution(resolution, this._mapUnits);
  this.state.center = this._map.getView().getCenter();
  this._calculateInternalPrintExtent();
  this._mapService.setInnerGreyCoverBBox({
    type: 'pixel',
    inner: this.state.inner,
    rotation: this.state.rotation
  });
};

proto._clearPrint = function(reset=false) {
  ol.Observable.unByKey(this._moveMapKeyEvent);
  this._moveMapKeyEvent = null;
  this._mapService.stopDrawGreyCover();
};

proto._setAllScalesBasedOnMaxResolution = function(maxResolution) {
  let resolution = maxResolution;
  const mapScala = getScaleFromResolution(resolution, this._mapUnits);
  const orderScales = _.orderBy(this.state.scale, ['value'], ['desc']);
  let scale = [];
  let addedFirstHighestScale = false;
  const handleScala = scala => {
    scale.push(scala);
    resolution = getResolutionFromScale(scala.value, this._mapUnits);
    this._scalesResolutions[scala.value] = resolution;
    resolution = resolution / 2;
  };
  orderScales.forEach((scala, index) => {
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

proto._setInitialScalaSelect = function() {
  this.state.scala = this.state.scale[0].value;
  $('#scala').val(this.state.scala);
};

proto._setCurrentScala = function(resolution) {
  Object.entries(this._scalesResolutions).find(([scala, res]) => {
    if (resolution <= res) {
      this.state.scala = scala;
      return true
    }
  });
};

proto._setMoveendMapEvent = function() {
  this._moveMapKeyEvent = this._map.on('moveend', this._setPrintArea.bind(this));
};

proto._showPrintArea = function() {
  if (this.state.atlas === undefined) {
    this._setPrintArea();
    this._mapService.startDrawGreyCover();
  }
};

proto._initPrintConfig = function() {
  if (!this._initialized) {
    const maxResolution = this._map.getView().getMaxResolution();
    this._setAllScalesBasedOnMaxResolution(maxResolution);
    this._initialized = true;
  }
  const resolution = this._map.getView().getResolution();
  this._setCurrentScala(resolution);
};

proto.showPrintArea = function(bool) {
  // close content if open
  this.state.isShow = bool;
  GUI.closeContent()
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
          } else this._clearPrint();
        });
        this._mapService.getMap().renderSync();
      })
    })
};

proto.reload = function() {
  this._project = ProjectsRegistry.getCurrentProject();
  this._mapService = GUI.getComponent('map').getService();
  this._map = this._mapService.viewer.map;
  this.state.print = this._project.state.print || [];
  this.state.visible = this.state.print.length > 0;
  if (this.state.visible) {
    this.state.template = this.state.print[0].name;
    !this._initialized && this.init();
    this._initPrintConfig();
    this._mapService.on('changeviewaftercurrentproject', () => {
      const maxResolution = this._map.getView().getMaxResolution();
      this.state.scale = scale;
      this._setAllScalesBasedOnMaxResolution(maxResolution);
    });
  } else this._clearPrint();
};

module.exports = PrintComponentService;
