<!--
  @file

  ORIGINAL SOURCE: src/components/InputDateTimePicker.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">
    
    <!-- 
      @example <g3w-field mode="input" _type="datetimepicker" />
     -->
    <template #input-body="{ tabIndex, editable, notvalid }">
      <div ref="datetimepicker_body">

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
    </template>

  </g3w-field>
</template>

<script>
import ApplicationState                      from 'store/application-state';
import G3WField                              from 'components/G3WField.vue';
import { resizeMixin }                       from 'mixins';
import { getUniqueDomId }                    from 'utils/getUniqueDomId';
import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';

Object
    .entries({
      ApplicationState,
      G3WField,
      resizeMixin,
      getUniqueDomId,
      convertQGISDateTimeFormatToMoment,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.8.6 */
  // name: 'input-datetime-picker',

  components: {
    'g3w-field': G3WField,
  },

  mixins: [
    resizeMixin,
  ],

  data() {
    const id = getUniqueDomId();
    return {
      widget_container:     { top: 0, left: 0 },
      iddatetimepicker:     `datetimepicker_${id}`,
      idinputdatetimepiker: `inputdatetimepicker_${id}`,
    }
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  methods: {

    resize() {
      const picker = $(`#${this.iddatetimepicker}`);
      if (picker && picker.data("DateTimePicker")) {
        picker.data("DateTimePicker").hide();
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
      this.$parent.change();
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
      const picker = $(`#${this.idinputdatetimepiker}`);

      // skip when current `state.value` equals to current datetimepicker widget value,
      // it means it was changed by others (eg. default expression evaluation)
      if (value === picker.val()) {
        return;
      }

      const date = null !== value
        ? moment(value, this.datetimefieldformat).format(this.datetimedisplayformat)
        : value;

      await this.$nextTick();

      picker.val(date);
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

    const service = this.$parent.getInputService();

    this.datetimedisplayformat = convertQGISDateTimeFormatToMoment(displayformat);
    this.datetimefieldformat   = convertQGISDateTimeFormatToMoment(fieldformat);

    service.setValidatorOptions({ fielddatetimeformat: this.datetimefieldformat });

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
        locale:            this.$parent.getLocale()
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