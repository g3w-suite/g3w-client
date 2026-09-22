<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state = "state">
    <div slot = "body" ref = "datetimepicker_body">

      <div class = 'input-group date' :id = 'iddatetimepicker' v-disabled = "!editable">
        <input
          type      = 'text'
          :id       = "idinputdatetimepiker"
          :tabIndex = "tabIndex"
          :readonly = "!editable || isMobile() ? 'readonly' : null"
          :class    = "{'input-error-validation' : notvalid}"
          class     = "form-control"
        />
        <span class = "input-group-addon caret" style="cursor:pointer;">
          <span :class = "[ timeOnly() ? 'far fa-clock' : 'fas fa-calendar-alt' ]"></span>
        </span>
      </div>

    </div>
  </baseinput>
</template>

<script>
import ApplicationState   from 'g3w-state';
import { resizeMixin }    from 'mixins';
import { getUniqueDomId } from 'utils/getUniqueDomId';
import Input              from 'components/g3w-input';

export default {

  /** @since 3.8.6 */
  name: 'input-datetime-picker',

  mixins: [
    Input,
    resizeMixin
  ],

  data() {
    const uniqueValue = getUniqueDomId();
    return {
      iddatetimepicker:     `datetimepicker_${uniqueValue}`,
      idinputdatetimepiker: `inputdatetimepicker_${uniqueValue}`,
    }
  },

  methods: {

    resize() {
      const domeDataPicker = $(`#${this.iddatetimepicker}`);
      if (domeDataPicker && domeDataPicker.data("DateTimePicker")) {
        domeDataPicker.data("DateTimePicker").hide();
      }
    },

    timeOnly() {
      return !this.state.input.options.formats[0].date;
    },

    /**
     * @since 3.8.0
     */
    onDatePickerChange() {
      const newDate = $(`#${this.idinputdatetimepiker}`).val();
      this.state.value = '' === newDate.trim() ? null : moment(newDate, this.datetimedisplayformat).format(this.datetimefieldformat);
      this.change();
    },

    /**
     * @fires datetimepickershow
     * 
     * @since 3.8.0
     */
    onDatePickerShow(evt) {
      this.$emit('datetimepickershow');
    },

    /**
     * @fires datetimepickershow
     * 
     * @since 3.8.0
     */
    onDatePickerHide(evt) {
      this.$emit('datetimepickershow');
    },

  },
  watch: {
    async 'state.value'(value) {
      // check if current value (state.value) is not equal to current wiget datetimepicker
      //means is changed by others (default expression evaluation for example)
      if (value !== $(`#${this.idinputdatetimepiker}`).val()) {
        const date = null !== value ? moment(value, this.datetimefieldformat).format(this.datetimedisplayformat) : value;
        await this.$nextTick();
        $(`#${this.idinputdatetimepiker}`).val(date);
      }
    }
  },

  async mounted() {
    const {
      minDate,
      maxDate,
      fieldformat,
      enabledDates,
      disabledDates,
      displayformat,
      useCurrent
    } = (this.state.input.options.formats || [])[0];

    await this.$nextTick();

      // set has widget input property instance

    this.datetimedisplayformat = this.service.convertQGISDateTimeFormatToMoment(displayformat);
    this.datetimefieldformat   = this.service.convertQGISDateTimeFormatToMoment(fieldformat);

    this.service.setValidatorOptions({ fielddatetimeformat: this.datetimefieldformat });

    const date =
      moment(this.state.value, this.datetimefieldformat, true).isValid()
        ? moment(this.state.value, this.datetimefieldformat).toDate()
        : null;


    $(`#${this.iddatetimepicker}`).datetimepicker({
      defaultDate:       date,
      format:            this.datetimedisplayformat,
      ignoreReadonly:    true,
      locale:            this.service.getLocale(),
      enabledDates,
      disabledDates,
      useCurrent,
      minDate,
      maxDate,
    });

    $(`#${this.iddatetimepicker}`).on("dp.change", this.onDatePickerChange);
    $(`#${this.iddatetimepicker}`).on("dp.show",   this.onDatePickerShow);
    $(`#${this.iddatetimepicker}`).on("dp.hide",   this.onDatePickerHide);

    if (ApplicationState.ismobile) {
      setTimeout(() => { document.getElementById(this.idinputdatetimepiker)?.blur(); });
    }

  }

};
</script>