<!-- ORIGINAL SOURCE: -->
<!-- gui/inputs/datetimepicker/vue/datetimepicker.html@v3.4 -->
<!-- gui/inputs/datetimepicker/vue/datetimepicker.js@v3.4 -->

<template>
  <baseinput :state="state">
    <div slot="body" ref="datetimepicker_body">
      <div ref="datimewidget_container" :style="{top: `${widget_container.top}px`, left: `${widget_container.left}px`}" style="position: fixed; z-index:10000; "></div>
      <div class='input-group date'  :id='iddatetimepicker' v-disabled="!editable">
        <input
          :id="idinputdatetimepiker"
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
import ApplicationState from 'core/applicationstate';

const Input = require('gui/inputs/input');
const { getUniqueDomId } = require('core/utils/utils');
const { resizeMixin, widgetMixins } = require('gui/vue/vue.mixins');

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
      const datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(this.state.input.options.formats[0].displayformat);
      const date = moment(value).format(datetimedisplayformat);
      $(`#${this.iddatetimepicker}`).val(date);
    }
  },
  async mounted() {
    await this.$nextTick();
    const fielddatetimeformat =  this.state.input.options.formats[0].fieldformat.replace(/y/g,'Y').replace(/d/g, 'D');
    this.service.setValidatorOptions({
      fielddatetimeformat
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
};
</script>