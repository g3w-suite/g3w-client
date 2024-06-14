<!--
  @file
  @since v3.7
-->

<template>
  <div ref = "datimecontainer">
    <label
      :for  = "id"
      style = "display: block"
      v-t   = "label">
    </label>
    <div class = "form-group">
      <div
        class = 'input-group date'
        ref   = "iddatetimepicker">
        <input
          :id     = "id"
          ref     = "idinputdatetimepiker"
          type    = 'text'
          @change = "changeInput"
          class   = "form-control" />
        <span class = "input-group-addon caret">
          <span
            class  = "datetimeinput"
            :class = "g3wtemplate.getFontClass('time' === type ? 'time': 'calendar')">
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
  import ApplicationState from 'store/application-state';

  const { getUniqueDomId } = require('utils');

  export default {
    name: "datetime",
    props: {
      type:{
        type:     String,
        default: 'date' // time
      },
      format: {
        type:    String,
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
    data() {
      return {
        datetimevalue: this.value
      }
    },
    methods: {
      changeInput(e) {},
      change(value) {
        const date = moment(value).format(this.format);
        this.$emit('change', date)
      }
    },
    async mounted() {
      await this.$nextTick();
      this.datetimeinputelement = $(this.$refs.iddatetimepicker);
      this.datetimeinputelement.datetimepicker({
        minDate:           this.minDate,
        maxDate:           this.maxDate,
        defaultDate:       this.datetimevalue,
        useCurrent:        false,
        allowInputToggle:  true,
        enabledDates:      this.enabledDates,
        showClose:         true,
        format:            this.format,
        locale:            ApplicationState.language,
        toolbarPlacement:  'top',
        widgetPositioning: { horizontal: 'right' },
      });
      this.datetimeinputelement.on("dp.change", ({date}) => {
        this.change(date);
      });
      this.datetimeinputelement.on("dp.hide", evt => {
        /**
         * for developement purpose. It used to leave open datimepicker open
         */
        //$(this.$refs.iddatetimepicker).data("DateTimePicker").show();
      });
      if (ApplicationState.ismobile) { setTimeout(() => datetimeinputelement.blur()) }
    },
    watch: {
      value(datetime) {
        this.datetimevalue = datetime;
        this.datetimeinputelement.data("DateTimePicker").date(datetime)
      },
      async minDate(mindatetime) {
        this.datetimeinputelement.data("DateTimePicker").minDate(mindatetime);
      },
      async maxDate(maxdatetime) {
        this.datetimeinputelement.data("DateTimePicker").maxDate(maxdatetime);
      },
      enabledDates(dates) {
        this.datetimeinputelement.data("DateTimePicker").enabledDates(dates);
      }
    },
    created() {
      this.id = getUniqueDomId();
    }
  }
</script>

<style scoped>

</style>