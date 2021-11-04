import ApplicationState from 'core/applicationstate';
const Input = require('gui/inputs/input');
const WidgetMixins = require('gui/inputs/widgetmixins');
const {resizeMixin} = require('gui/vue/vue.mixins');

const DateTimePickerInput = Vue.extend({
  mixins: [Input, WidgetMixins, resizeMixin],
  template: require('./datetimepicker.html'),
  data() {
    return {
      changed: false
    }
  },
  methods: {
    resize(){
      const domeDataPicker = $(this.$refs.iddatetimepicker);
      domeDataPicker && domeDataPicker.data("DateTimePicker") && domeDataPicker.data("DateTimePicker").hide();
    },
    timeOnly () {
      return !this.state.input.options.formats[0].date;
    },
    stateValueChanged(value) {
      const datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].displayformat);
      const date = moment(value).format(datetimedisplayformat);
      $(this.$refs.iddatetimepicker).val(date);
    }
  },
  async mounted() {
    await this.$nextTick();
    const fielddatetimeformat =  this.state.input.options.formats[0].fieldformat.replace('yyyy','YYYY').replace('dd','DD');
    this.service.setValidatorOptions({
      fielddatetimeformat
    });
    const date = moment(this.state.value, fielddatetimeformat, true).isValid() ? moment(this.state.value, fielddatetimeformat).toDate() : null;
    const locale = this.service.getLocale();
    const datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].displayformat);
    const datetimefieldformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].fieldformat);
    const dataPickerOptions = {
      defaultDate: date,
      format: datetimedisplayformat,
      ignoreReadonly: true,
      allowInputToggle: true,
      toolbarPlacement: 'top',
      widgetPositioning: {
        vertical: 'auto',
        horizontal: 'right'
      },
      showClose: true,
      locale
    };
    console.log(dataPickerOptions)
    $(this.$refs.iddatetimepicker).datetimepicker(dataPickerOptions);
    $(this.$refs.iddatetimepicker).on("dp.change", evt => {
      const newDate = $(this.$refs.idinputdatetimepiker).val();
      this.state.value = !newDate.trim() ? null : moment(newDate, datetimedisplayformat).format(datetimefieldformat);
      this.widgetChanged();
    });
    $(this.$refs.iddatetimepicker).on("dp.show", evt => this.$emit('datetimepickershow'));
    $(this.$refs.iddatetimepicker).on("dp.hide", evt => this.$emit('datetimepickershow'));
    ApplicationState.ismobile && setTimeout(()=>$(this.$refs.idinputdatetimepiker).blur());
  }
});

module.exports = DateTimePickerInput;
