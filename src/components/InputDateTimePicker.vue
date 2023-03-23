<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <div slot="body" ref="datetimepicker_body">
      <div ref="datimewidget_container" :style="{top: `${widget_container.top}px`, left: `${widget_container.left}px`}" style="position: fixed; z-index:10000; "></div>
      <div class='input-group date'  :id='iddatetimepicker' v-disabled="!editable">
        <input
          :id="idinputdatetimepiker"
          :tabIndex="tabIndex"
          :readonly="!editable || isMobile() ? 'readonly' : null"
          type='text'
          :class="{'input-error-validation' : notvalid}"
          class="form-control" />
        <span class="input-group-addon caret">
          <span :class="[timeOnly() ? g3wtemplate.getFontClass('time') :  g3wtemplate.getFontClass('calendar')]"></span>
        </span>
      </div>
    </div>
  </baseinput>
</template>

<script>
import ApplicationState from 'store/application-state';
import { resizeMixin, widgetMixins } from 'mixins';

const Input = require('gui/inputs/input');
const { getUniqueDomId } = require('core/utils/utils');

export default {
  mixins: [Input, widgetMixins, resizeMixin],
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
      $(`#${this.idinputdatetimepiker}`).val(value);
    }
  },
  async mounted() {
    const {formats=[], layout={vertical:"top", horizontal: "left"}} = this.state.input.options;
    const {minDate, maxDate, fieldformat, enabledDates, disabledDates, displayformat, useCurrent} = formats[0];
    await this.$nextTick();
    const fielddatetimeformat = fieldformat.replace(/y/g,'Y').replace(/d/g, 'D');
    this.service.setValidatorOptions({
      fielddatetimeformat
    });
    const date = moment(this.state.value, fielddatetimeformat, true).isValid() ? moment(this.state.value, fielddatetimeformat).toDate() : null;
    const locale = this.service.getLocale();
    const datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(displayformat);
    const datetimefieldformat = this.service.convertQGISDateTimeFormatToMoment(fieldformat);
    $(`#${this.iddatetimepicker}`).datetimepicker({
      defaultDate: date,
      format: datetimedisplayformat,
      ignoreReadonly: true,
      allowInputToggle: true,
      enabledDates,
      disabledDates,
      useCurrent,
      toolbarPlacement: 'top',
      minDate,
      maxDate,
      widgetParent: $(this.$refs.datimewidget_container),
      widgetPositioning: {
        vertical: layout.vertical || 'top',
        horizontal: layout.horizontal || 'left'
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
    });

  }
};
</script>