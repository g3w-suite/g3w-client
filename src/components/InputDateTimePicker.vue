<!--
  @file
  @since v3.7
-->

<template>
  <!-- Field layout -->
  <div v-if="state.visible" class="form-group">
    <!-- Label -->
    <template v-if="undefined === state.showlabel || state.showlabel">
      <label
        :for       = "state.name"
        v-disabled = "!editable"
        class      = "control-label"
        style      = "text-align:left !important; padding-top:0 !important; margin-bottom:3px"
      >
        <span v-if="state.i18nLabel" v-t="state.label"></span>
        <span v-else>{{ state.label }}</span>
        <span v-if="state.validate && state.validate.required">*</span>
        <i
          v-if        = "showhelpicon"
          :class      = "g3wtemplate.font['info']"
          class       = "skin-color"
          style       = "margin-left: 3px; cursor: pointer"
          @click.stop = "showHideHelp"
        ></i>
      </label>
    </template>
    <!-- Relation status -->
    <div v-if="state.relationField" style="color: var(--skin-warning); padding: 3px 0 3px 15px">
      <i aria-hidden="true" class="fas fa-exclamation-circle"></i>
      <span v-t="'Relation key field'"></span>
    </div>

    <!-- Date/time control and feedback -->
    <div>
      <div v-if="loadingState === 'loading'" style="position:relative; width: 100%">
        <bar-loader :loading="true" />
      </div>
      <div ref="datetimepicker_body">
        <div class="input-group date" :id="iddatetimepicker" v-disabled="!editable">
          <input
            type      = "text"
            :id       = "idinputdatetimepiker"
            :tabIndex = "tabIndex"
            :readonly = "!editable || isMobile() ? 'readonly' : null"
            :class    = "{'input-error-validation' : notvalid}"
            class     = "form-control"
          />
          <span class="input-group-addon" style="cursor:pointer">
            <span :class="[timeOnly() ? 'far fa-clock' : 'fas fa-calendar-alt']"></span>
          </span>
        </div>
      </div>
      <p
        v-if   = "notvalid"
        class  = "g3w-long-text error-input-message"
        style  = "margin: 0"
        v-html = "state.validate.message"
      ></p>
      <p v-else-if="state.info" style="margin: 0" v-html="state.info"></p>
      <!-- Help text -->
      <div
        v-if   = "state.help && state.help.visible"
        v-html = "state.help.message"
        class  = "g3w_input_help skin-background-color"
        style = "background-color: hsl(from var(--skin-color) h s calc(l + 48)) !important;"
      ></div>
    </div>
  </div>
</template>

<script>
import ApplicationState from 'g3w-state';
import GUI from 'g3w-app';
import { getUniqueDomId } from 'utils/getUniqueDomId';
import { throttle } from 'utils/throttle';
import { debounce } from 'utils/debounce';
import { gettext as _ } from 'g3w-i18n';
import { toRawType } from 'utils/toRawType';
import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';

/** Maintains the field's default, validation, and update state. */

export default {
  /** @since 3.8.6 */
  name: 'input-datetime-picker',

  props: ['state'],

  data() {
    const uniqueValue = getUniqueDomId();
    return {
      iddatetimepicker: `datetimepicker_${uniqueValue}`,
      idinputdatetimepiker: `inputdatetimepicker_${uniqueValue}`,
    };
  },

  methods: {
    setLoading(bool) {
      this.state.input.options.loading.state = bool ? 'loading' : 'ready';
    },
    showHideHelp() {
      this.state.help.visible = !this.state.help.visible;
    },
    mobileChange(event) {
      this.state.value = event.target.value;
      this.change();
    },
    change() {
      this.service.setEmpty();
      this.service.validate();
      this.service.setUpdate();
      this.$emit('changeinput', this.state);
    },
    isVisible() {},

    resize() {
      const domeDataPicker = $(`#${this.iddatetimepicker}`);
      if (domeDataPicker && domeDataPicker.data('DateTimePicker')) {
        domeDataPicker.data('DateTimePicker').hide();
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
      this.state.value =
        '' === newDate.trim()
          ? null
          : moment(newDate, this.datetimedisplayformat).format(
              this.datetimefieldformat
            );
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
    notvalid(notvalid) {
      if (notvalid) {
        this.service.setErrorMessage();
      }
    },
    async 'state.value'(value) {
      if (undefined !== this.state.input.options.default_expression) {
        setTimeout(() => this.change());
      }
      // check if current value (state.value) is not equal to current wiget datetimepicker
      //means is changed by others (default expression evaluation for example)
      if (value !== $(`#${this.idinputdatetimepiker}`).val()) {
        const date =
          null !== value
            ? moment(value, this.datetimefieldformat).format(
                this.datetimedisplayformat
              )
            : value;
        await this.$nextTick();
        $(`#${this.idinputdatetimepiker}`).val(date);
      }
    },
  },

  computed: {
    tabIndex() {
      return this.editable ? 0 : -1;
    },
    notvalid() {
      return false === this.state.validate.valid;
    },
    editable() {
      return this.state.editable;
    },
    showhelpicon() {
      return this.state.help && this.state.help.message.trim();
    },
    disabled() {
      return !this.editable || ['loading', 'error'].includes(this.loadingState);
    },
    loadingState() {
      return this.state.input.options.loading
        ? this.state.input.options.loading.state
        : null;
    },
  },

  created() {
    const resizeWrapper = this.delayType && {
      throttle,
      debounce,
    }[this.delayType] || throttle;
    this.delayResize = this.resize
      ? resizeWrapper(this.resize.bind(this), this.delayTime)
      : null;
    GUI.on('resize', this.delayResize);

    this.state.input.options = this.state.input.options || {};
    this.service = Object.create({
      initialize({ state = {}, validatorOptions } = {}) {
        this.state = state;
        this.validatorOptions = validatorOptions || state.input.options || {};
        this.setValue(state.value);
        this.setEmpty();
        this._validator = {
          validate: (value) =>
            ((
              {
                float: (value) => !Number.isNaN(parseFloat(1 * value)),
                bigint: (value) =>
                  Number.isSafeInteger(1 * value) &&
                  Math.abs(1 * value) <= Number.MAX_SAFE_INTEGER,
                integer: (value) =>
                  !Number.isNaN(1 * value) && Math.abs(1 * value) <= 2147483647,
                checkbox: (value, options) =>
                  (options.values || []).includes(value),
                datetimepicker: (value, options) =>
                  moment(value, options.fielddatetimeformat, true).isValid(),
                char: (value) => value && 1 === `${value}`.length,
                range: (value, options) =>
                  1 * value >= options.min && 1 * value <= options.max,
              }[state.type] || (() => true)
            )(value, this.validatorOptions)),
        };
        this.setErrorMessage();

        return this;
      },
      setValue(value) {
        if (![null, undefined].includes(value)) {
          return;
        }
        const { options } = this.state.input;
        let defaultValue = options.default;
        if (Array.isArray(options)) {
          if (options[0].default) {
            defaultValue = options[0].default;
          } else if (Array.isArray(options.values) && options.values.length) {
            defaultValue =
              options.values[0] &&
              (options.values[0].value || options.values[0]);
          }
        }
        const getDefaultValue =
          this.state.get_default_value &&
          ![null, undefined].includes(defaultValue);
        if (getDefaultValue && undefined === options.default_expression) {
          this.state.value = defaultValue;
        }
        this.state.value_from_default_value = getDefaultValue;
      },
      setEmpty() {
        this.state.validate.empty =
          null === this.state.value || '' === `${this.state.value}`.trim();
      },
      validate() {
        if (this.state.validate.empty) {
          this.state.value = null;
          this.state.validate.valid = !this.state.validate.required;
        } else if (
          this.state.validate.unique &&
          this.state.validate.exclude_values?.size
        ) {
          this.state.validate.valid = !this.state.validate.exclude_values.has(
            `${this.state.value}`
          );
        } else {
          this.state.validate.valid = this._validator.validate(
            this.state.value
          );
        }
        return this.state.validate.valid;
      },
      getValidator() {
        return this._validator;
      },
      setValidator(validator) {
        this._validator = validator;
      },
      setErrorMessage() {
        // Keep the validation-message precedence explicit.
        const validate = this.state.validate;
        if (validate.error) {
          validate.message = _(validate.error);
          return;
        }
        const type = _(`sdk.form.inputs.${this.state.type}`);
        if (validate.mutually && !validate.mutually_valid) {
          validate.message = `${_(
            'sdk.form.inputs.input_validation_mutually_exclusive'
          )} ( ${validate.mutually.join(',')} )`;
        } else if (validate.max_field) {
          validate.message = `${_(
            'sdk.form.inputs.input_validation_max_field'
          )} (${validate.max_field})`;
        } else if (validate.min_field) {
          validate.message = `${_(
            'sdk.form.inputs.input_validation_min_field'
          )} (${validate.min_field})`;
        } else if (
          ('unique' === this.state.input.type || validate.unique) &&
          validate.exclude_values?.size
        ) {
          validate.message = _(
            'sdk.form.inputs.input_validation_exclude_values'
          );
        } else if (validate.required) {
          validate.message =
            this.state.info ||
            `${_('sdk.form.inputs.input_validation_error')} ( ${type} )`;
        } else {
          validate.message =
            this.state.info ||
            `${_('sdk.form.inputs.input_validation_error_type')} ( ${type} )`;
        }
      },
      setUpdate() {
        // Match persisted media and datetime values before comparing other fields.
        const { value, _value } = this.state;
        if (
          'media' === this.state.input.type &&
          'Object' !== toRawType(value) &&
          'Object' !== toRawType(_value)
        ) {
          this.state.update = value.value != _value.value;
        } else if ('datetimepicker' === this.state.input.type) {
          this.state.update =
            (null !== value ? value.toUpperCase() : value) !=
            (_value ? _value.toUpperCase() : _value);
        } else {
          this.state.update = value != _value;
        }
      },
    }).initialize({ state: this.state });
    this.service.validatorOptions = {};
    this.$watch(
      () => ApplicationState.language,
      async () => {
        if (this.state.visible) {
          this.state.visible = false;
          this.service.setErrorMessage();
          await this.$nextTick();
          this.state.visible = true;
        }
      }
    );
    if (this.state.editable && this.state.validate.required) {
      this.service.validate();
    }
    this.$emit('addinput', this.state);
    if (this.state.value_from_default_value) {
      this.$emit('changeinput', this.state);
    }
  },
  beforeDestroy() {
    GUI.off('resize', this.delayResize);
    this.delayResize = null;
    this.delayTime = null;
  },
  destroyed() {
    this.$emit('removeinput', this.state);
  },

  async mounted() {
    const {
      minDate,
      maxDate,
      fieldformat,
      enabledDates,
      disabledDates,
      displayformat,
      useCurrent,
    } = (this.state.input.options.formats || [])[0];

    await this.$nextTick();
    this.resize?.();

    // set has widget input property instance

    this.datetimedisplayformat =
      convertQGISDateTimeFormatToMoment(displayformat);
    this.datetimefieldformat = convertQGISDateTimeFormatToMoment(fieldformat);

    this.service.validatorOptions = {
      fielddatetimeformat: this.datetimefieldformat,
    };

    $(`#${this.iddatetimepicker}`).datetimepicker({
      defaultDate: moment(
        this.state.value,
        this.datetimefieldformat,
        true
      ).isValid()
        ? moment(this.state.value, this.datetimefieldformat).toDate()
        : null,
      format: this.datetimedisplayformat,
      ignoreReadonly: true,
      locale: window.initConfig.user.i18n || 'en',
      enabledDates,
      disabledDates,
      useCurrent,
      minDate,
      maxDate,
    });

    $(`#${this.iddatetimepicker}`).on('dp.change', this.onDatePickerChange);
    $(`#${this.iddatetimepicker}`).on('dp.show', this.onDatePickerShow);
    $(`#${this.iddatetimepicker}`).on('dp.hide', this.onDatePickerHide);

    if (ApplicationState.ismobile) {
      setTimeout(() => {
        document.getElementById(this.idinputdatetimepiker)?.blur();
      });
    }
  },
};
</script>