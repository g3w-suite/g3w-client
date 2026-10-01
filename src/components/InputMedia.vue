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

    <!-- Upload control and feedback -->
    <div>
      <div v-if="loadingState === 'loading'" style="position:relative; width: 100%">
        <bar-loader :loading="true" />
      </div>
      <div v-disabled="!editable">
      <div
        class           = "g3w_input_button skin-border-color"
        @click          = "onClick"
        style           = "border-style: solid; border-width: 2px; width:100%; cursor: pointer; text-align: center;"
        v-t-tooltip:top = "accept"
      >
        <i class = "fas fa-file-upload fa-2x skin-color" style = "padding: 5px;">
          <input
            :id       = "mediaid"
            style     = "display:none"
            :name     = "state.name"
            :tabIndex = "tabIndex"
            :data-url = "state.input.options.uploadurl"
            :class    = "{'input-error-validation' : notvalid}"
            type      = "file"
            :accept   = "accept"
            @change   = "onChangeFile"
          >
        </i>
      </div>
        <!-- File upload progress -->
        <bar-loader :loading="loading" />

        <!-- Uploaded media preview -->
        <g3w-field field-type = "media" :state = "data">
          <div class = "clearmedia" @click.stop = "clearMedia">
            <i :class = "g3wtemplate.font['trash-o']" class = "g3w-icon"></i>
          </div>
        </g3w-field>
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
import GUI from 'g3w-app';
import ApplicationState from 'g3w-state';
import { getUniqueDomId } from 'utils/getUniqueDomId';
import { gettext as _ } from 'g3w-i18n';
import { toRawType } from 'utils/toRawType';
import Field from 'components/Field.vue';

/** Maintains the field's default, validation, and update state. */

export default {
  /** @since 3.8.6 */
  name: 'input-media',

  props: ['state'],
  components: {
    'g3w-field': Field,
  },
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
      this.setMedia();
      this.change();
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
  data() {
    return {
      data: {
        value: null,
        mime_type: null,
      },
      //@since 4.0.5 take in account allowed types from g3w-admin settings.py G3WFILE_FORM_UPLOAD_FORMATS
      accept: (this.state.input?.options?.allowed_types || [])
        .map((a) => `${a.startsWith('.') ? a : `.${a}`}`)
        .join(','),
      mediaid: `media_${getUniqueDomId()}`,
      loading: false,
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
    onClick() {
      document.getElementById(this.mediaid).click();
    },
    clearMedia() {
      this.data.value = this.data.mime_type = this.state.value = null;
      this.change();
    },
    setMedia() {
      if (this.state.value) {
        this.data.value = this.state.value.value;
        this.data.mime_type = this.state.value.mime_type;
      }
    },
    async onChangeFile(event) {
      const body = new FormData();
      body.append('csrfmiddlewaretoken', this.$cookie.get('csrftoken'));
      body.append(this.state.name, event.target.files[0]);

      this.loading = true;

      try {
        let response = await (
          await fetch(this.state.input.options.uploadurl, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body,
          })
        ).json();
        //@since 4.0.5 in case
        if (response?.result) {
          this.state.value = response?.data;
        }

        //@since 4.0.5
        if (false === response?.result) {
          GUI.showUserMessage({
            type: 'alert',
            message: response.error || this.$t('server_error'),
          });
        }
      } catch (e) {
        console.warn(e);
        GUI.notify.error(this.$t('server_error'));
      }

      this.loading = false;
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
    }).initialize({ state: this.state });
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
    this.setMedia();
  },
  destroyed() {
    this.$emit('removeinput', this.state);
  },
};
</script>