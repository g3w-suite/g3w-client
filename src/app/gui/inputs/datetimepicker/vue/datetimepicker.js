import ApplicationState from 'core/applicationstate';
const Input = require('gui/inputs/input');
const {getUniqueDomId} = require('core/utils/utils');
const WidgetMixins = require('gui/inputs/widgetmixins');
const {resizeMixin} = require('gui/vue/vue.mixins');

const DateTimePickerInput = Vue.extend({
  mixins: [Input, WidgetMixins, resizeMixin],
  template: require('./datetimepicker.html'),
  data() {
    const uniqueValue = getUniqueDomId();
    return {
      iddatetimepicker: 'datetimepicker_'+ uniqueValue,
      idinputdatetimepiker: 'inputdatetimepicker_'+ uniqueValue,
      changed: false
    }
  },
  methods: {
    resize(){
      const domeDataPicker = $(`#${this.iddatetimepicker}`);
      domeDataPicker && domeDataPicker.data("DateTimePicker") && domeDataPicker.data("DateTimePicker").hide();
    },
    timeOnly () {
      return !this.state.input.options.formats[0].date;
    },
    stateValueChanged(value) {
      const datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].displayformat);
      const date = moment(value).format(datetimedisplayformat);
      $(`#${this.iddatetimepicker}`).val(date);
    }
  },
  async mounted() {
    await this.$nextTick();
    //add min date, max date
    const {minDate, maxDate,  enabledDates, disabledDates, useCurrent} = this.state.input.options.formats[0];

    const fielddatetimeformat =  this.state.input.options.formats[0].fieldformat.replace('yyyy','YYYY').replace('dd','DD');
    this.service.setValidatorOptions({
      fielddatetimeformat: fielddatetimeformat
    });
    const date = moment(this.state.value, fielddatetimeformat, true).isValid() ? moment(this.state.value, fielddatetimeformat).toDate() : null;
    const locale = this.service.getLocale();
    const datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].displayformat);
    const datetimefieldformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].fieldformat);
    $(() => {
      $(`#${this.iddatetimepicker}`).datetimepicker({
        defaultDate: date,
        format: datetimedisplayformat,
        ignoreReadonly: true,
        allowInputToggle: true,
        minDate,
        maxDate,
        enabledDates,
        disabledDates,
        useCurrent,
        toolbarPlacement: 'top',
        widgetPositioning: {
          vertical: 'auto',
          horizontal: 'right'
        },
        showClose: true,
        locale: locale
      });
    });
    $(`#${this.iddatetimepicker}`).on("dp.change", (e) => {
      const newDate = $('#'+this.idinputdatetimepiker).val();
      this.state.value = _.isEmpty(_.trim(newDate)) ? null : moment(newDate, datetimedisplayformat).format(datetimefieldformat);
      this.widgetChanged();
    });
    $(`#${this.iddatetimepicker}`).on("dp.show", (e) => {
      this.$emit('datetimepickershow');
    });
    $(`#${this.iddatetimepicker}`).on("dp.hide", (e) => {
      this.$emit('datetimepickershow');
    });
    ApplicationState.ismobile && setTimeout(()=>{
      $(`#${this.idinputdatetimepiker}`).blur();
    })
  }
});

module.exports = DateTimePickerInput;
