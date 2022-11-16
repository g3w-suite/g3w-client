<template >
  <ul id="g3w_raster_timeseries_content" class="treeview-menu" style="position:relative; padding: 10px;color:#FFFFFF">
    <li>
      <div v-disabled="status !== 0" v-if="chartLayer" v-t-tooltip.create="'qtimeseries.tooltips.showcharts'" data-placement="top" data-toggle="tooltip" style="padding: 5px; border:1px solid" class="skin-border skin-tooltip-top">
        <button  class="sidebar-button skin-button btn btn-block" :class="{toggled: showCharts}" style="margin: 2px;" @click.stop="showRasterLayerCharts">
          <span :class="g3wtemplate.getFontClass('chart-line')"></span>
        </button>
      </div>
      <div v-disabled="showCharts">
        <form v-disabled="formDisabled">
          <label style="display: block">Layer</label>
          <select class="form-control" id="timeseriesrasterlayer" v-select2="'current_layer_index'" :search="false">
            <option v-for="(layer, index) in layers" :value="index" :key="layer.id">{{layer.name}}</option>
          </select>
          <div v-if="layer && !changed_layer">
            <datetime :label="'qtimeseries.startdate'" :format="format" :enabledDates="layer.options.dates" :minDate="min_date" :maxDate="layer.end_date" :type="'datetime'" :value="layer.start_date" @change="changeStartDateTime"></datetime>
            <datetime :label="'qtimeseries.enddate'" :format="format" :enabledDates="layer.options.dates" :minDate="layer.start_date" :maxDate="max_date" :type="'datetime'" :value="layer.end_date" @change="changeEndDateTime"></datetime>
            <label  v-if="!change_step_unit"  v-t:pre="'qtimeseries.step'">[<span v-t="`qtimeseries.stepsunit.${current_step_unit_label}`"></span> ]</label>
            <input class="form-control" type="number" :min="range.min" :max="range.max" :step="layer.options.stepunitmultiplier" v-model="step">
            <range v-disabled="range.max === range.min " label="qtimeseries.steps" :max="range.max" :value="range.value" :min="range.min" ref="rangecomponent" @change-range="changeRangeStep"></range>
            <label style="display: block"></label>
            <select class="form-control" id="g3w-timeseries-select-unit" v-select2="'current_step_unit'" :search="false">
              <option v-for="step_unit in step_units" :value="step_unit.moment" :selected="current_step_unit == step_unit.moment"
                      :key="step_unit.moment" v-t="`qtimeseries.stepsunit.${step_unit.label}`"></option>
            </select>
          </div>
        </form>
        <div style="display: flex; justify-content: space-between; margin-top: 10px" >
          <button class="sidebar-button skin-button btn btn-block" v-disabled="!validRangeDates || range.value === 0" style="margin: 2px;" @click.stop="fastBackwardForward(-1)">
            <span :class="g3wtemplate.getFontClass('fast-backward')"></span>
          </button>
          <button class="sidebar-button skin-button btn btn-block"  v-disabled="!validRangeDates || range.value <= 0" style="margin: 2px;" @click.stop="stepBackwardForward(-1)">
            <span :class="g3wtemplate.getFontClass('step-backward')"></span>
          </button>
          <button class="sidebar-button skin-button btn btn-block" :class="{toggled: status === -1}" v-disabled="!validRangeDates || range.value <= 0"  style="margin: 2px; transform: rotate(180deg)" @click.stop="run(-1)">
            <span :class="g3wtemplate.getFontClass('run')"></span>
          </button>
          <button class="sidebar-button skin-button btn btn-block" :class="{toggled: status === 0}" style="margin: 2px;" @click.stop="pause">
            <span :class="g3wtemplate.getFontClass('pause')"></span>
          </button>
          <button class="sidebar-button skin-button btn btn-block"  :class="{toggled: status === 1}" v-disabled="!validRangeDates || range.value >= range.max" style="margin: 2px;" @click.stop="run(1)">
            <span :class="g3wtemplate.getFontClass('run')"></span>
          </button>
          <button class="sidebar-button skin-button btn btn-block" v-disabled="!validRangeDates || range.value >= range.max" style="margin: 2px;" @click.stop="stepBackwardForward(1)">
            <span :class="g3wtemplate.getFontClass('step-forward')"></span>
          </button>
          <button class="sidebar-button skin-button btn btn-block" v-disabled="!validRangeDates || range.value === range.max" style="margin: 2px;" @click.stop="fastBackwardForward(1)">
            <span :class="g3wtemplate.getFontClass('fast-forward')"></span>
          </button>
        </div>
      </div>
    </li>
  </ul>
</template>

<script>
  import {QTIMESERIES} from "constant";
  const {toRawType, getRandomColor} = require('core/utils/utils');
  const GUI = require('gui/gui');
  const ProjectsRegistry = require('core/project/projectsregistry');
  const ComponentsFactory = require('gui/component/componentsfactory');
  const DataRouterService = require('core/data/routerservice');
  const PickCoordinatesInteraction = require('g3w-ol/interactions/pickcoordinatesinteraction');
  const ChartsFactory = require('gui/charts/chartsfactory');
  const {WMS_PARAMETER, STEP_UNITS} = QTIMESERIES;
  const project =ProjectsRegistry.getCurrentProject();

  const UPDATE_MAPLAYER_OPTIONS = {
    showSpinner: false
  };

  export default {
    name: 'Qtimeseries',
    data(){
      const layers = this.$options.layers;
      return {
        layers,
        range: {
          value:0,
          min:0,
          max:0
        },
        step: 1,
        format: 'YYYY-MM-DD HH:mm:ss',
        step_units: QTIMESERIES.STEP_UNITS,
        change_step_unit: false,
        changed_layer: false,
        currentLayerDateTimeIndex: null,
        showCharts: false,
        current_layer_index: 0,
        status: 0, // status  [1: play, -1: back, 0: pause]
      }
    },
    computed: {
      layer(){
        if (this.layers.length) {
          this.changed_layer = true;
          setTimeout(()=> this.changed_layer = false);
          return this.layers[this.current_layer_index];
        }
      },
      chartLayer(){
        return this.layer && this.layer.type === 'raster';
      },
      min_date() {
        return this.layer && this.layer.start_date;
      },
      max_date() {
        return this.layer && this.layer.end_date;
      },
      current_step_unit() {
        return this.layer && this.layer.options.stepunit
      },
      current_step_unit_label() {
        return this.layer && QTIMESERIES.STEP_UNITS.find(step_unit => step_unit.moment === this.layer.options.stepunit).label
      },
      formDisabled(){
        return this.status !== 0 || this.showCharts;
      },
      disablerun(){
        return this.status === 0 && (!this.layer.start_date || !this.layer.end_date) ;
      },
      validRangeDates(){
        if (this.layer) {
          const {multiplier, step_unit} = this.getMultiplierAndStepUnit();
          return this.validateStartDateEndDate() && moment(this.layer.end_date).diff(moment(this.layer.start_date), step_unit) / multiplier >= this.getStepValue();
        } else return false;
      },
    },
    methods:{
      /**
       * Method to initialize the form time series on open and close
       */
      initLayerTimeseries(){
        this.status = 0;
        this.currentLayerDateTimeIndex = this.layer.start_date;
        this.range.value = 0;
        this.range.min = 0;
        this.resetRangeInputData();
        this.currentLayerDateTimeIndex && this.getTimeLayer();
        this.showCharts = false;
      },
      /**
       * Method to reset range on change start date or end date time
       */
      resetRangeInputData(){
        // reset range value to 0
        this.range.value = 0;
        // set max range
        const {multiplier, step_unit} = this.getMultiplierAndStepUnit();
        this.range.max = this.validateStartDateEndDate() ?
          Number.parseInt(moment(this.layer.end_date).diff(moment(this.layer.start_date), step_unit) / multiplier * this.layer.options.stepunitmultiplier) : 0;
      },
      changeRangeInputOnChangeStepUnit(){
        // reset range value to 0
        this.range.value = 0;
        // set max range
        const {multiplier, step_unit} = this.getMultiplierAndStepUnit();
        this.range.max = this.validateStartDateEndDate() ?
          Number.parseInt(moment(this.layer.end_date).diff(moment(this.layer.start_date), step_unit) / multiplier * this.layer.options.stepunitmultiplier) : 0;
      },
      /*
         Method to extract step unit and eventuallY multiply factor (10, 100) in case es: decade e centrury for moment purpose
       */
      getMultiplierAndStepUnit(){
        return this.getMultiplierAndStepUnit();
      },
      /**
       * Reset time layer to original map layer no filter by time or band
       * @param layer
       * @returns {Promise<void>}
       */
      async resetTimeLayer(){
        this.pause();
        const mapService = GUI.getService('map');
        const promise = new Promise((resolve, reject) => {
          if (this.layer.timed) {
            const mapLayerToUpdate = mapService.getMapLayerByLayerId(this.layer.id);
            mapLayerToUpdate.once('loadend',  () => {
              mapService.showMapInfo();
              resolve();
            });
            mapService.updateMapLayer(mapLayerToUpdate, {
              force: true,
              [WMS_PARAMETER]: undefined
            });
          } else resolve();
        });
        await promise;
        this.layer.timed = false;
      },
      /**
       * Method to call server request image
       * @returns {Promise<void>}
       */
      async getTimeLayer() {
        console.log('qui')
        let findDate;
        let endDate;
        const mapService = GUI.getService('map');
        const projectLayer = project.getLayerById(this.layer.id);
        const promise = new Promise((resolve, reject) =>{
          projectLayer.setChecked(true);
          const mapLayerToUpdate = mapService.getMapLayerByLayerId(this.layer.id);
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
          const {multiplier, step_unit} = this.getMultiplierAndStepUnit();
          findDate = moment(this.currentLayerDateTimeIndex).format();
          endDate = moment(findDate).add(this.step * multiplier, step_unit).format();
          const isAfter = moment(endDate).isAfter(this.layer.end_date);
          if (isAfter) endDate = moment(this.layer.end_date).format();
          const wmsParam = `${findDate}/${endDate}`;
          mapService.updateMapLayer(mapLayerToUpdate, {
            force: true,
            [WMS_PARAMETER]: wmsParam
          }, UPDATE_MAPLAYER_OPTIONS);
        });

        await promise;
        this.layer.timed = true;
      },
      /**
       * In case of change step
       * @param value
       * @returns {Promise<void>}
       */
      async changeRangeStep({value}){
        this.range.value = 1*value;
        const {mutltiplier, step_unit} = this.getMultiplierAndStepUnit();
        this.currentLayerDateTimeIndex = moment(this.layer.start_date).add(this.range.value * mutltiplier, step_unit);
        await this.getTimeLayer()
      },
      /**
       * Listener method called when start date is changed
       * @param datetime
       */
      changeStartDateTime(datetime=null){
        datetime = moment(datetime).isValid() ? datetime : null;
        this.layer.start_date = datetime;
        this.currentLayerDateTimeIndex = datetime;
        this.resetRangeInputData();
        if (moment(datetime).isValid()) this.getTimeLayer();
        else this.resetTimeLayer();
      },
      /**
       * Listener Method called when end date is chanhed
       * @param datetime
       * @returns {Promise<void>}
       */
      async changeEndDateTime(datetime){
        // set end_date
        this.layer.end_date = datetime;
        // reset range input
        this.resetRangeInputData();
      },
      /**
       *
       * @returns {boolean}
       */
      validateStartDateEndDate(){
        let arevalidstartenddate = false;
        if (this.layer && this.layer.start_date && this.layer.end_date){
          arevalidstartenddate = moment(this.layer.start_date).isValid() &&
            moment(this.layer.end_date).isValid();
        }
        return arevalidstartenddate;
      },
      /**
       * Set current status (play, pause)
       * @param status
       */
      setStatus(status=0){
        this.status = status;
      },
      /**
       *
       * @param status 1 play, -1 back
       */
      setCurrentDateTime(status){
        const step = 1*this.getStepValue();
        const {multiplier, step_unit} = this.getMultiplierAndStepUnit();
        this.currentLayerDateTimeIndex = moment(this.currentLayerDateTimeIndex)[status === 1 ? 'add' : 'subtract'](step * multiplier, step_unit);
      },
      /**
       * Method to calculate step valued based on current input step value and possible multipliere sted (es. decde, centuries)
       * @returns {number}
       */
      getStepValue(){
        return 1*this.step*this.layer.options.stepunitmultiplier;
      },
      /**
       * Play method (forward or backward)
       * status: 1 (forward) -1 (backward)
       */
      run(status){
        if (this.status !== status) {
          // used to wait util the image request to layer is loaded
          let waiting= false;
          clearInterval(this.intervalEventHandler);
          this.intervalEventHandler = setInterval(async ()=> {
            if (!waiting) {
              try {
                const step = 1*this.step;
                this.range.value = status === 1 ? this.range.value + step: this.range.value - step;
                if (this.range.value > this.range.max || this.range.value < 0) {
                  this.resetRangeInputData();
                  this.pause();
                  this.fastBackwardForward(-1);
                } else {
                  this.setCurrentDateTime(status);
                  waiting = true;
                  try {
                    await this.getTimeLayer();
                  } catch(err){console.log(err)}
                  waiting = false;
                }
              } catch(err){
                this.pause();
              }
            }
          }, 1000);
          this.setStatus(status);
        } else this.pause()
      },
      /**
       * Pause methos stop to run
       */
      pause(){
        clearInterval(this.intervalEventHandler);
        this.intervalEventHandler = null;
        this.setStatus();
      },
      /**
       * Method to go step value unit forward or backward
       * @param direction
       */
      stepBackwardForward(direction){
        const step = this.getStepValue();
        this.range.value = direction === 1 ? this.range.value + step : this.range.value - step;
        this.setCurrentDateTime(direction);
        this.getTimeLayer()
      },
      /**
       * Method to go to end (forward) or begin (backward) of date range
       * @param direction
       */
      fastBackwardForward(direction){
        if (direction === 1) {
          this.range.value = this.range.max;
          this.currentLayerDateTimeIndex = this.layer.end_date;
          this.getTimeLayer();
        } else {
          this.range.value = this.range.min;
          this.currentLayerDateTimeIndex = this.layer.start_date;
          this.getTimeLayer();
        }
      },
      /**
       * Method to show raster chart
       */
      showRasterLayerCharts(){
        this.showCharts = !this.showCharts;
        this.showCharts ? this.resetTimeLayer() : this.initLayerTimeseries();
        this.chartsInteraction({
          active: this.showCharts,
          layer: this.layer
        })
      },
      chartsInteraction({active=false}={}){
        active ? this.activeChartInteraction(this.layer) : this.deactiveChartInteraction()
      },
      getMultiplierAndStepUnit(){
        const multiplier_step_unit = this.layer.options.stepunit.split(':');
        return {
          multiplier: multiplier_step_unit.length > 1 ? 1* multiplier_step_unit[0] : 1,
          step_unit: multiplier_step_unit.length > 1 ? multiplier_step_unit[1] : this.layer.options.stepunit
        }
      },
      deactiveChartInteraction(){
        const mapService = GUI.getService('map');
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
      },
      activeChartInteraction(){
        const mapService = GUI.getService('map');
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
      },
      close(){
        this.resetTimeLayer(this.layer);
        this.deactiveChartInteraction();
      }
    },
    watch: {
      async current_step_unit(step_unit, old_step_unit){
        if (typeof old_step_unit !== "undefined") {
          // set true to change
          this.change_step_unit = true;
          this.layer.options.stepunit = step_unit;
          this.current_step_unit_label = STEP_UNITS.find(step_unit => step_unit.moment === this.layer.options.stepunit).label;
          this.initLayerTimeseries();
          await this.$nextTick();
          // set false to see changed translation of label
          this.change_step_unit = false;
        }
      },
       /**
       * Listen change layer on selection
       * @param new_index_layer
       * @param old_index_layer
       */
      current_layer_index(new_index_layer, old_index_layer){
        const previousLayer = this.layers[old_index_layer];
        if (previousLayer.timed) {
          this.resetTimeLayer(previousLayer);
          previousLayer.timed = false;
        }
        this.initLayerTimeseries();
      },
      /**
       * Check is range between start date and end date is valid range
       * @param bool
       */
      validRangeDates(bool){
        !bool && this.changeStartDateTime(this.layer.start_date);
      }
    },
    created() {
      this.getChartConfig = {
        interaction: null,
        keyListener: null,
        indexcolor: 0,
        chart: null,
        layer: new ol.layer.Vector({
          source: new ol.source.Vector()
        })
      };
      this.intervalEventHandler = null;

      this.$on('show', bool => {
        if (bool) this.initLayerTimeseries();
        else this.resetTimeLayer()
      });
    }
  };
</script>
