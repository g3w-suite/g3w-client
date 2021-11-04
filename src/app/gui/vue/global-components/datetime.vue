<template>
  <div class='input-group date' ref="iddatetimepicker">
    <input ref="idinputdatetimepiker" type='text' class="form-control" />
        <span class="input-group-addon caret">
        <span class="datetimeinput" :class="[type === 'time'? g3wtemplate.getFontClass('time') :  g3wtemplate.getFontClass('calendar')]">
        </span>
      </span>
  </div>
</template>

<script>
  import ApplicationState from '../../../core/applicationstate';
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
      }
    },
    data(){
      return {
        datetimevalue: null
      }
    },
    methods: {
      change(value) {
        const date = moment(value).format(this.format);
        $(this.$refs.iddatetimepicker).val(date);
        this.$emit('change', date)
      }
    },

    async mounted() {
      await this.$nextTick();
      $(this.$refs.iddatetimepicker).datetimepicker({
        minDate: this.minDate,
        maxDate: this.maxDate,
        allowInputToggle: true,
        defaultDate: null,
        ignoreReadonly: true,
        showClose: true,
        format: this.format,
        toolbarPlacement: "top",
        widgetPositioning:{
          horizontal: "right",
          vertical: "auto",
        },
        locale: ApplicationState.lng
      });
      $(this.$refs.iddatetimepicker).on("dp.change", () => {
        const date = $(this.$refs.idinputdatetimepiker).val();
        this.change(date)
      });
      $(this.$refs.iddatetimepicker).on("dp.hide", evt => {
        //$(this.$refs.iddatetimepicker).data("DateTimePicker").show();
      });

      ApplicationState.ismobile && setTimeout(()=>$(this.$refs.idinputdatetimepiker).blur());
    }
  }
</script>

<style scoped>

</style>