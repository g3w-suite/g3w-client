import {QTIMESERIES} from 'constant';
const {toRawType, getRandomColor} = require('core/utils/utils');
const GUI = require('gui/gui');
const ProjectsRegistry = require('core/project/projectsregistry');
const ComponentsFactory = require('gui/component/componentsfactory');
const DataRouterService = require('core/data/routerservice');
const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');
const ChartsFactory = require('gui/charts/chartsfactory');
const {WMS_PARAMETER, STEP_UNITS} = QTIMESERIES;

const UPDATE_MAPLAYER_OPTIONS = {
  showSpinner: false
};

/**
 * Plugin service inherit from base plugin service
 * @constructor
 */
function Service(){
  const mapService = GUI.getService('map');
  const project = ProjectsRegistry.getCurrentProject();
  const layers = [];

  project.getConfigLayers().forEach(layerConfig => {
    if (toRawType(layerConfig.qtimeseries) === 'Object') {
      const {duration=1, units='d', start_date=null, end_date=null} = layerConfig.qtimeseries;
      const stepunit_and_multiplier = STEP_UNITS.find(step_unit => step_unit.qgis === units).moment.split(':');
      let stepunit = stepunit_and_multiplier.length > 1 ? stepunit_and_multiplier[1]: stepunit_and_multiplier[0];
      const stepunitmultiplier = stepunit_and_multiplier.length > 1 ? 1*stepunit_and_multiplier[0] : 1;
      const id = layerConfig.id;
      const projectLayer = project.getLayerById(id);
      const name = projectLayer.getName();
      const wmsname = projectLayer.getWMSLayerName();
      layers.push({
        id,
        name,
        wmsname,
        start_date,
        end_date,
        options: {
          range_max: moment(end_date).diff(moment(start_date), stepunit) - 1,
          stepunit,
          stepunitmultiplier,
        }
      })
    }
  });

  this.getLayers = function(){
    return layers;
  };

  this.getChartConfig = {
    interaction: null,
    keyListener: null,
    indexcolor: 0,
    chart: null,
    layer: new ol.layer.Vector({
      source: new ol.source.Vector()
    })
  };
  
  this.activeChartInteraction = function(layer){
    const self = this;
    mapService.disableClickMapControls(true);
    const interaction = new PickCoordinatesInteraction();
    this.getChartConfig.interaction = interaction;
    mapService.addInteraction(interaction);
    mapService.getMap().addLayer(this.getChartConfig.layer);
    interaction.setActive(true);
    this.getChartConfig.keyListener = interaction.on('picked', async evt =>{
      const {coordinate} = evt;
      const color = getRandomColor();
      const style = new ol.style.Style({
        image: new ol.style.RegularShape({
          fill: new ol.style.Fill({
            color
          }),
          stroke: new ol.style.Stroke({
            color,
            width: 3
          }),
          points: 4,
          radius: 10,
          radius2: 0,
          angle: Math.PI / 4,
        })
      });
      const feature = new ol.Feature(new ol.geom.Point(coordinate));
      feature.setStyle(style);
      this.getChartConfig.layer.getSource().addFeature(feature);
      const {data=[]} = await DataRouterService.getData('query:coordinates', {
        inputs: {
          layerIds: [layer.id],
          coordinates: coordinate,
          feature_count: 1
        },
        outputs: false
      });
      const values = [];
      Object.entries(data[0].features[0].getProperties()).forEach(([attribute, value])=>{
        if (attribute !== 'geometry' ||  attribute !== 'g3w_fid'){
          values.push(value);
        }
      });
      if (this.getChartConfig.chart){
        this.getChartConfig.chart.load({
          columns: [
            [coordinate.toString(), ...values]
          ],
          colors: {
            [coordinate.toString()]: color
          }
        })
      } else {
        const content = ComponentsFactory.build({
          vueComponentObject: ChartsFactory.build({
            type: 'c3:lineXY',
            hooks: {
              created(){
                this.setConfig({
                  data: {
                    x: 'x',
                    columns: [
                      ['x', ...layer.options.dates],
                      [coordinate.toString(), ...values]
                    ],
                    colors: {
                      [coordinate.toString()]: color
                    }
                  },
                  axis: {
                    x: {
                      type: 'timeseries',
                      tick: {
                        format: '%Y-%m-%d'
                      }
                    }
                  }
                });
                this.$once('chart-ready', c3chart =>{
                  self.getChartConfig.chart = c3chart;
                  setTimeout(()=>{
                    this.resize();
                  })
                })
              }
            }
          })
        });
        GUI.showContent({
          title: layer.name,
          perc: 50,
          split: 'v',
          closable: false,
          content
        });
      }
    })
  };

  this.deactiveChartInteraction = function(){
    if (this.getChartConfig.interaction) {
      mapService.disableClickMapControls(false);
      this.getChartConfig.layer.getSource().clear();
      mapService.getMap().removeLayer(this.getChartConfig.layer);
      this.getChartConfig.interaction.setActive(false);
      ol.Observable.unByKey(this.getChartConfig.keyListener);
      mapService.removeInteraction(this.getChartConfig.interaction);
      this.getChartConfig.interaction = null;
      this.getChartConfig.keyListener = null;
      this.getChartConfig.chart = null;
      GUI.closeContent();
    }
  };

  this.chartsInteraction = function({active=false, layer}={}){
    active ? this.activeChartInteraction(layer) : this.deactiveChartInteraction()
  };

  /**
   * Get single 
   * @param layerId
   * @param date
   * @returns {Promise<unknown>}
   */
  this.getTimeLayer = function({layer, date, step}={}){
    let findDate;
    let endDate;
    return new Promise((resolve, reject) =>{
      const {id} = layer;
      const projectLayer = project.getLayerById(id);
      projectLayer.setChecked(true);
      const mapLayerToUpdate = mapService.getMapLayerByLayerId(id);
      mapLayerToUpdate.once('loadend', ()=> {
        const info =  endDate ? `${findDate} - ${endDate}` : findDate;
        mapService.showMapInfo({
          info,
          style: {
            fontSize: '1.2em',
            color: 'grey',
            border: '1px solid grey',
            padding: '10px'
          }
        });
        resolve();
      });
      mapLayerToUpdate.once('loaderror', () => {
        const info =  endDate ? `${findDate} - ${endDate}` : findDate;
        mapService.showMapInfo({
          info,
          style: {
            fontSize: '1.2em',
            color: 'red',
            border: '1px solid red',
            padding: '10px'
          }
        });
        reject();
      });
      const {multiplier, step_unit} = this.getMultiplierAndStepUnit(layer);
      findDate = moment(date).format();
      endDate = moment(findDate).add(step * multiplier, step_unit).format();
      const isAfter = moment(endDate).isAfter(layer.end_date);
      if (isAfter) endDate = moment(layer.end_date).format();
      const wmsParam = `${findDate}/${endDate}`;
      mapService.updateMapLayer(mapLayerToUpdate, {
        force: true,
        [WMS_PARAMETER]: wmsParam  
      }, UPDATE_MAPLAYER_OPTIONS);
    })
  };

  this.getMultiplierAndStepUnit = function(layer){
    const multiplier_step_unit = layer.options.stepunit.split(':');
    return {
      multiplier: multiplier_step_unit.length > 1 ? 1* multiplier_step_unit[0] : 1,
      step_unit: multiplier_step_unit.length > 1 ? multiplier_step_unit[1] : layer.options.stepunit
    }
  };

  this.resetTimeLayer = function(layer){
    return new Promise((resolve, reject) => {
      if (layer.timed){
        const mapLayerToUpdate = mapService.getMapLayerByLayerId(layer.id);
        mapLayerToUpdate.once('loadend',  () => {
          mapService.showMapInfo();
          resolve();
        });
        mapService.updateMapLayer(mapLayerToUpdate, {
          force: true,
          [WMS_PARAMETER]: undefined
        });
      } else resolve();
    })
  };

  /**
   * Method on close time series Panel
   */
  this.close = function(){
    const layer = layers.find(layer => layer.timed);
    layer && this.resetTimeLayer(layer);
    this.state.panel.open = false;
    this.deactiveChartInteraction();
  };
}

export default new Service;