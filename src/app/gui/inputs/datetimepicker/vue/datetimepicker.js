const Input = require('gui/inputs/input');
const getUniqueDomId = require('core/utils/utils').getUniqueDomId;
const WidgetMixins = require('gui/inputs/widgetmixins');
const {resizeMixin} = require('gui/vue/vue.mixins');

const DateTimePickerInput = Vue.extend({
  mixins: [Input, WidgetMixins, resizeMixin],
  template: require('./datetimepicker.html'),
  data: function() {
    const uniqueValue = getUniqueDomId();
    return {
      iddatetimepicker: 'datetimepicker_'+ uniqueValue,
      idinputdatetimepiker: 'inputdatetimepicker_'+ uniqueValue,
      changed: false
    }
  },
  methods: {
    resize(){
      $(`#${this.iddatetimepicker}`) && $(`#${this.iddatetimepicker}`).data("DateTimePicker").hide();
    },
    timeOnly : function() {
      return !this.state.input.options.formats[0].date;
    },
    stateValueChanged(value) {
      const datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].displayformat);
      const date = moment(value).format(datetimedisplayformat);
      $(`#${this.iddatetimepicker}`).val(date);
    }
  },
  mounted: function() {
    this.$nextTick(() => {
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
    });
  }
});

module.exports = DateTimePickerInput;
