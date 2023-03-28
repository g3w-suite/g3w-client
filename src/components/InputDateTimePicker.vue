<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <div slot="body" ref="datetimepicker_body">

      <div
        ref="datimewidget_container"
        :style="{
          top: widget_container.top + 'px',
          left: widget_container.left + 'px',
          position: 'fixed',
          zIndex: 10000
        }"
      ></div>

      <div class='input-group date' :id='iddatetimepicker' v-disabled="!editable">
        <input
          type='text'
          :id="idinputdatetimepiker"
          :tabIndex="tabIndex"
          :readonly="!editable || isMobile() ? 'readonly' : null"
          :class="{'input-error-validation' : notvalid}"
          class="form-control"
        />
        <span class="input-group-addon caret">
          <span :class="[ g3wtemplate.getFontClass(timeOnly() ? 'time' : 'calendar') ]"></span>
        </span>
      </div>

    </div>
  </baseinput>
</template>

<script>
import ApplicationState from 'store/application-state';
import { resizeMixin } from 'mixins';

const Input = require('gui/inputs/input');
const { getUniqueDomId } = require('core/utils/utils');

export default {

  mixins: [
    Input,
    resizeMixin
  ],

  data() {
    const uniqueValue = getUniqueDomId();
    return {
      widget_container: {
        top: 0,
        left: 0
      },
      iddatetimepicker: 'datetimepicker_' + uniqueValue,
      idinputdatetimepiker: 'inputdatetimepicker_' + uniqueValue,
    }
  },

  methods: {

    resize() {
      const domeDataPicker = $(`#${this.iddatetimepicker}`);
      if (domeDataPicker && domeDataPicker.data("DateTimePicker")) {
        domeDataPicker.data("DateTimePicker").hide();
      }
    },

    timeOnly () {
      return !this.state.input.options.formats[0].date;
    },
  },
  watch: {
    async 'state.value'(value){
      // check if current value (state.value) is not equal to current wiget datetimepicker
      //means is changed by others (default expression evaluation for example)
      if (value !== $(`#${this.idinputdatetimepiker}`).val()){
        const date = null !== value ? moment(value, this.datetimefieldformat).format(this.datetimedisplayformat) : value;
        await this.$nextTick();
        $(`#${this.idinputdatetimepiker}`).val(date);
      }
    }
  },

  async mounted() {
    const {
      formats = [],
      layout = {
        vertical: "top",
        horizontal: "left"
      }
    } = this.state.input.options;

    const {
      minDate,
      maxDate,
      fieldformat,
      enabledDates,
      disabledDates,
      displayformat,
      useCurrent
    } = formats[0];

    await this.$nextTick();
    // set has widget input property instance

    this.datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(displayformat);
    this.datetimefieldformat = this.service.convertQGISDateTimeFormatToMoment(fieldformat);


    this.service.setValidatorOptions({ fielddatetimeformat: this.datetimefieldformat });

    const date =
      moment(this.state.value, this.datetimefieldformat, true).isValid()
        ? moment(this.state.value, this.datetimefieldformat).toDate()
        : null;


    $(`#${this.iddatetimepicker}`).datetimepicker({
      defaultDate: date,
      format: this.datetimedisplayformat,
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
      locale: this.service.getLocale()
    });

    $(`#${this.iddatetimepicker}`)
      .on("dp.change", () => {
        const newDate = $(`#${this.idinputdatetimepiker}`).val();
        const value = _.isEmpty(_.trim(newDate)) ? null : moment(newDate, this.datetimedisplayformat).format(this.datetimefieldformat);
        this.state.value = value;
      });

    $(`#${this.iddatetimepicker}`)
      .on("dp.show", async evt => {
        await this.$nextTick();
        const { top, left, width } = this.$refs.datetimepicker_body.getBoundingClientRect();
        this.widget_container.top = top;
        this.widget_container.left = left - width;
        this.$emit('datetimepickershow');
      });

    $(`#${this.iddatetimepicker}`)
      .on("dp.hide", evt => {
        this.$emit('datetimepickershow');
      });

    if (ApplicationState.ismobile) {
      setTimeout(() => { $(`#${this.idinputdatetimepiker}`).blur(); });
    }

  }

};
</script>