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
      widget_container: {
        top: 0,
        left: 0
      },
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
    const fielddatetimeformat =  this.state.input.options.formats[0].fieldformat.replace('yyyy','YYYY').replace('dd','DD');
    this.service.setValidatorOptions({
      fielddatetimeformat: fielddatetimeformat
    });
    const date = moment(this.state.value, fielddatetimeformat, true).isValid() ? moment(this.state.value, fielddatetimeformat).toDate() : null;
    const locale = this.service.getLocale();
    const datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].displayformat);
    const datetimefieldformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].fieldformat);
    $(`#${this.iddatetimepicker}`).datetimepicker({
      defaultDate: date,
      format: datetimedisplayformat,
      ignoreReadonly: true,
      allowInputToggle: true,
      toolbarPlacement: 'top',
      widgetParent: $(this.$refs.datimewidget_container),
      widgetPositioning: {
        vertical: 'top',
        horizontal: 'left'
      },
      showClose: true,
      locale
    });

    $(`#${this.iddatetimepicker}`).on("dp.change", evt => {
      const newDate = $('#'+this.idinputdatetimepiker).val();
      this.state.value = _.isEmpty(_.trim(newDate)) ? null : moment(newDate, datetimedisplayformat).format(datetimefieldformat);
      this.widgetChanged();
    });
    $(`#${this.iddatetimepicker}`).on("dp.show", async evt => {
      await this.$nextTick();
      const {top, left, width} = this.$refs.datetimepicker_body.getBoundingClientRect();
      this.widget_container.top = top;
      this.widget_container.left = left - width;
      this.$emit('datetimepickershow');
    });
    $(`#${this.iddatetimepicker}`).on("dp.hide", evt => {
      $(`#${this.iddatetimepicker}`).data("DateTimePicker").show()
      this.$emit('datetimepickershow');
    });
    ApplicationState.ismobile && setTimeout(()=>{
      $(`#${this.idinputdatetimepiker}`).blur();
    })
  }
});

module.exports = DateTimePickerInput;
