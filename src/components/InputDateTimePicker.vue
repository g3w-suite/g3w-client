<!--
  @file
  @since v3.7
-->

<template>
  <baseinput :state="state">
    <div slot="body" ref="datetimepicker_body">

      <div
        ref    = "datimewidget_container"
        :style = "{
          top:      widget_container.top + 'px',
          left:     widget_container.left + 'px',
          position: 'fixed',
          zIndex:   10000,
        }"
      ></div>

      <div
        class      = 'input-group date'
        :id        = 'iddatetimepicker'
        v-disabled = "!editable"
      >
        <input
          type      = 'text'
          :id       = "idinputdatetimepiker"
          :tabIndex = "tabIndex"
          :readonly = "!editable || isMobile() ? 'readonly' : null"
          :class    = "{ 'input-error-validation' : notvalid }"
          class     = "form-control"
        />
        <span class="input-group-addon caret">
          <span :class="[ g3wtemplate.getFontClass(timeOnly() ? 'time' : 'calendar') ]"></span>
        </span>
      </div>

    </div>
  </baseinput>
</template>

<script>
import ApplicationState               from 'store/application-state';
import { g3wInputMixin, resizeMixin } from 'mixins';

const { getUniqueDomId } = require('utils');

export default {

  /** @since 3.8.6 */
  name: 'input-datetime-picker',

  mixins: [
    g3wInputMixin,
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

    /**
     * @since 3.8.0
     */
    onDatePickerChange() {
      const newDate = $(`#${this.idinputdatetimepiker}`).val();
      this.state.value =
        _.isEmpty(_.trim(newDate))
          ? null
          : moment(newDate, this.datetimedisplayformat).format(this.datetimefieldformat);
      this.change();
    },

    /**
     * @fires datetimepickershow
     * 
     * @since 3.8.0
     */
    onDatePickerShow(evt) {
      // reset positions
      this.widget_container.top  = 0;
      this.widget_container.left = 0;
      // wait until widget is present in DOM  
      setTimeout(() => {
        const container            = this.$refs.datetimepicker_body.getBoundingClientRect();
        const modal                = this.$refs.datimewidget_container.querySelector('.bootstrap-datetimepicker-widget').getBoundingClientRect();
        this.widget_container.top  = container.top  + (container.top < modal.height ? container.height + Math.abs(container.top - modal.height) + 20 : 0); // 20 = padding
        this.widget_container.left = container.left - Math.max(container.width, modal.width);
        this.$emit('datetimepickershow');
      });
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
      // skip when current `state.value` equals to current datetimepicker widget value,
      // it means it was changed by others (eg. default expression evaluation)
      if (value === $(`#${this.idinputdatetimepiker}`).val()) {
        return;
      }
      const date = null !== value
        ? moment(value, this.datetimefieldformat).format(this.datetimedisplayformat)
        : value;
      await this.$nextTick();
      $(`#${this.idinputdatetimepiker}`).val(date);
    },

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
    this.datetimefieldformat   = this.service.convertQGISDateTimeFormatToMoment(fieldformat);

    this.service.setValidatorOptions({ fielddatetimeformat: this.datetimefieldformat });

    $(`#${this.iddatetimepicker}`)
      .datetimepicker({
        defaultDate: (
          moment(this.state.value, this.datetimefieldformat, true).isValid()
            ? moment(this.state.value, this.datetimefieldformat).toDate()
            : null
        ),
        format:            this.datetimedisplayformat,
        ignoreReadonly:    true,
        allowInputToggle:  true,
        enabledDates,
        disabledDates,
        useCurrent,
        toolbarPlacement:  'top',
        minDate,
        maxDate,
        widgetParent:      $(this.$refs.datimewidget_container),
        widgetPositioning: {
          vertical:   layout.vertical   || 'top',
          horizontal: layout.horizontal || 'left'
        },
        showClose:         true,
        locale:            this.service.getLocale()
      });

    $(`#${this.iddatetimepicker}`).on("dp.change", this.onDatePickerChange);
    $(`#${this.iddatetimepicker}`).on("dp.show", this.onDatePickerShow);
    $(`#${this.iddatetimepicker}`).on("dp.hide", this.onDatePickerHide);

    if (ApplicationState.ismobile) {
      setTimeout(() => { $(`#${this.idinputdatetimepiker}`).blur(); });
    }

  }

};
</script>