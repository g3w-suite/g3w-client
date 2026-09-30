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
    <div
      v-if  = "state.relationField"
      style = "color: var(--skin-warning); padding: 3px 0 3px 15px"
    >
      <i aria-hidden="true" class="fas fa-exclamation-circle"></i>
      <span v-t="'Relation key field'"></span>
    </div>

    <!-- Checkbox control and feedback -->
    <div>
      <div v-if="loadingState === 'loading'" style="position:relative; width: 100%">
        <bar-loader :loading="true" />
      </div>
      <div v-disabled="!editable" style="height: 20px; margin-top: 8px">
        <input
          @change   = "changeCheckBox"
          :tabIndex = "tabIndex"
          :class    = "{'input-error-validation' : notvalid}"
          v-model   = "value"
          type      = "checkbox"
          :id       = "id"
        />
        <label :for="id">{{ label }}</label>
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
        style  = "background-color: hsl(from var(--skin-color) h s calc(l + 48)) !important;"
      ></div>
    </div>
  </div>
</template>

<script>
import { getUniqueDomId } from 'utils/getUniqueDomId';
import ApplicationState from 'g3w-state';
import { gettext as _ } from 'g3w-i18n';
import { toRawType } from 'utils/toRawType';

export default {
  /** @since 3.8.6 */
  name: 'input-checkbox',

  props: ['state'],
  watch: {
    notvalid(notvalid) {
      if (notvalid) {
        this.service.setErrorMessage();
      }
    },
    'state.value'() {
      if (undefined !== this.state.input.options.default_expression) {
        setTimeout(() => this.change());
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
    }).initialize({
      state: this.state,
      validatorOptions: {
        values: this.state.input.options.values.map((value) => value),
      },
    });
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

  destroyed() {
    this.$emit('removeinput', this.state);
  },

  data() {
    return {
      value: null,
      label: null,
      id: getUniqueDomId(), // new id
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

    /**
     * @see https://github.com/g3w-suite/g3w-admin/issues/958
     *
     * @since 3.11.0
     */
    getValuesItem(checked) {
      return (
        this.state.input.options.values.find((v) => checked === v.checked) || {}
      );
    },

    /**
     * ORIGINAL SOURCE: src/mixins/widget.js@3.10.4
     *
     * @since 3.11.0
     */
    convertValueToChecked() {
      if ([null, undefined].includes(this.service.state.value)) {
        return false;
      }
      let option = this.state.input.options.values.find(
        (v) => this.state.value == v.value
      );
      if (undefined === option) {
        option = this.state.input.options.values.find(
          (v) => false === v.checked
        );
        this.state.value = option.value;
      }
      return option.checked;
    },

    changeCheckBox() {
      const { value, label } = this.getValuesItem(this.value);
      this.label = label ?? value;
      this.state.value = value;
      this.change();
    },
  },

  mounted() {
    //@since 4.0.6 Check after created (set default value eventualy). Need to convert it to string
    const { checked, label, value } =
      this.state.input.options.values.find(
        (v) => `${this.state.value}` === `${v.value}`
      ) ?? {};
    this.value = checked ?? null;
    this.label = label ?? value ?? null;
  },
};
</script>