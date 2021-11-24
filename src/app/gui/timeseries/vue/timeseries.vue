<template>
  <ul id="g3w_raster_timeseries_content" class="treeview-menu" style="position:relative; padding: 10px;color:#FFFFFF">
    <li>
      <form v-disabled="status === 1">
        <label style="display: block">Layer</label>
        <select class="form-control" id="timeseriesrasterlayer" v-select2="'layer'" :search="false">
          <option v-for="layer in layers" :value="layer.id" :key="layer.id">{{layer.name}}</option>
        </select>
        <datetime :label="'sdk.timeseries.startdate'" :minDate="layer.range[0]" :maxDate="layer.range[1]" :type="'datetime'" :value="layer.startdate" @change="changeStartDateTime"></datetime>
        <datetime :label="'sdk.timeseries.enddate'" :minDate="layer.range[0]" :maxDate="layer.range[1]" :type="'datetime'" :value="layer.enddate" @change="changeEndDateTime"></datetime>
        <label v-t="'sdk.timeseries.step'"></label>
        <input class="form-control" type="number" :min="steps.min" :max="steps.max" v-model="steps.step">
        <label style="display: block" v-t="'sdk.timeseries.stepsunit.label'"></label>
        <select class="form-control" v-select2="'stepunit'" :search="false">
          <option v-for="unit in stepunits" :key="unit" :value="unit" v-t="`sdk.timeseries.stepsunit.${unit}`"></option>
        </select>
        <range label="sdk.timeseries.steps" :max="steps.max" :value="steps.step" :min="steps.min" ref="rangecomponent"></range>
      </form>
      <button v-disabled="disablerun" id="g3w-run-raster-timeseries" style="margin-top: 10px" class="sidebar-button skin-button btn btn-block" @click.stop="click">
        <span :class="g3wtemplate.getFontClass(icon)" style="color: #FFFFFF"></span>
      </button>
    </li>
  </ul>
</template>

<script>
  const {getUniqueDomId} = require('core/utils/utils');
  const GUI = require('gui/gui');
  const STEPUNITS = ['years', 'months', 'weeks', 'days', 'hours', 'minutes'];
  export default {
    name: "timeseries",
    data(){
      const {layers} = this.$options.service.state;
      const layer = layers[0];
      return {
        layers,
        steps: {
          step: 1,
          min:0,
          max:10
        },
        stepunit: null, // get step unit
        currentdate: null, //current date used for running
        layer, // get firs layer
        status: 0, // status  [ 0: run, 1: pause, 2:stopped]
      };
    },
    computed: {
      disablerun(){
        return this.status === 0 && (!this.layer.startdate || !this.layer.enddate) ;
      },
      icon(){
        let icon;
        switch(this.status){
          case 0:
            icon = 'run';
            /**
             * Throttle function to call new imahge
             *
             */
            break;
          case 1:
            icon = 'pause';
            break;
        }
        return icon;
      }
    },
    methods:{
      async getTimeLayer() {
        await this.$options.service.getTimeLayer({
          layerId: this.layer.id,
          date: this.currentdate,
        });
      },
      changeRangeStep(value){
        this.$refs.rangecomponent.step = 1*value
      },

      changeStartDateTime(datetime){
        this.layer.startdate = datetime;
        this.currentdate = datetime;
        this.changeEndDateTime(datetime);
        this.getTimeLayer();
      },
      changeEndDateTime(datetime){
        console.log(datetime)
        this.layer.enddate = datetime;
      },
      async click(){
        switch (this.status) {
          case 0:
            this.status = 1;
            await this.$nextTick();
            break;
          case 1:
            this.status = 0;
            await this.$nextTick();
            break;
        }
      }
    },
    watch: {
      async 'status'(status){
        if (status) {
          this.intervalEventHandler = setInterval(async ()=> {
            await this.getTimeLayer();
            this.currentdate = moment(this.currentdate, this.layer.format).add(1, this.stepunit).format(this.layer.format);
          }, this.interval)
        } else {
          clearInterval(this.intervalEventHandler);
          this.intervalEventHandler = null;
        }
      }
    },
    created() {
      this.intervalEventHandler = null;
      this.stepunits = STEPUNITS;
    },
    async mounted(){
      console.log(this.layer)
    },
    beforeDestroy(){
      this.$options.service.clear();
    }
  }
</script>

<style scoped>

</style>