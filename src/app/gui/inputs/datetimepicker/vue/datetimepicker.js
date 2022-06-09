import ApplicationState from 'core/applicationstate';
import Input  from 'gui/inputs/input';
import utils  from 'core/utils/utils';
import WidgetMixins  from 'gui/inputs/widgetmixins';
import {resizeMixin}  from 'gui/vue/vue.mixins';
import template from './datetimepicker.html';

const DateTimePickerInput = Vue.extend({
  mixins: [Input, WidgetMixins, resizeMixin],
  template,
  data() {
    const uniqueValue = utils.getUniqueDomId();
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
      this.$emit('datetimepickershow');
    });
    ApplicationState.ismobile && setTimeout(()=>{
      $(`#${this.idinputdatetimepiker}`).blur();
    })
  }
});

export default  DateTimePickerInput;
