<!-- ORIGINAL SOURCE: -->
<!-- gui/vue/global-components/datetime.vue@v3.4 -->

<template>
  <div ref="datimecontainer">
    <label :for="id" style="display: block" v-t="label"></label>
    <div class="form-group">
      <div class='input-group date' ref="iddatetimepicker">
        <input :id="id" ref="idinputdatetimepiker" type='text' @change="changeInput" class="form-control" />
        <span class="input-group-addon caret">
          <span class="datetimeinput" :class="[type === 'time'? g3wtemplate.getFontClass('time') :  g3wtemplate.getFontClass('calendar')]"></span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
  import ApplicationState from 'core/applicationstate';

  const { getUniqueDomId } = require('core/utils/utils');

  export default {
    name: "datetime",
    props: {
      type:{
        type: String,
        default: 'date' // time
      },
      format: {
        type: String,
        default: 'YYYY-MM-DD'
      },
      minDate:{
        default: false
      },
      maxDate: {
        default: false
      },
      enabledDates: {
        default: false
      },
      value: {},
      label: {
        default:'Date'
      }
    },
    data(){
      return {
        datetimevalue: this.value
      }
    },
    methods: {
      play(){

      },
      pause(){

      },
      stop(){

      },
      back(step=1){

      },
      forward(step=1){

      },
      changeInput(evt){},
      change(value) {
        const date = moment(value).format(this.format);
        this.$emit('change', date)
      }
    },
    async mounted() {
      await this.$nextTick();
      this.datetimeinputelement = $(this.$refs.iddatetimepicker);
      this.datetimeinputelement.datetimepicker({
        minDate: this.minDate,
        maxDate: this.maxDate,
        defaultDate: this.datetimevalue,
        useCurrent: false,
        allowInputToggle: true,
        enabledDates: this.enabledDates,
        showClose: true,
        format: this.format,
        locale: ApplicationState.lng,
        toolbarPlacement: 'top',
        widgetPositioning: {
          horizontal: 'right'
        },
      });
      this.datetimeinputelement.on("dp.change", ({date}) => {
        this.change(date);
      });
      this.datetimeinputelement.on("dp.hide", evt => {
        //$(this.$refs.iddatetimepicker).data("DateTimePicker").show();
      });
      ApplicationState.ismobile && setTimeout(()=>datetimeinputelement.blur());
    },
    watch: {
      value(datetime){
        this.datetimevalue = datetime;
        this.datetimeinputelement.data("DateTimePicker").date(datetime)
      },
      async minDate(datetime){
        this.datetimeinputelement.data("DateTimePicker").minDate(datetime);
      },
      async maxDate(datetime){
        this.datetimeinputelement.data("DateTimePicker").maxDate(datetime);
      },
      enabledDates(dates){
        this.datetimeinputelement.data("DateTimePicker").enabledDates(dates);
      }
    },
    created(){
      this.id = getUniqueDomId();
    }
  }
</script>

<style scoped>

</style>