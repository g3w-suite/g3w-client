<template>
  <!-- Field layout -->
  <div v-if="state.visible" class="form-group" v-disabled="!editable">
    <!-- Label -->
    <template v-if="undefined === state.showlabel || state.showlabel">
      <label
        :for       = "state.name"
        v-disabled = "!editable"
        class      = "control-label"
        style      = "text-align:left !important; padding-top:0 !important; margin-bottom:3px"
      >
        <span v-if="state.i18nLabel" v-t="state.label"></span><span v-else>{{ state.label }}</span>
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
    <!-- Rich-text editor and feedback -->
    <div>
      <div v-if="loadingState === 'loading'" style="position:relative; width: 100%"><bar-loader :loading="true" /></div>
    <div
      @keydown.stop = ""
      ref           = "quill_editor"
      class         = "form-control"
      :style        = " { border: state.validate.valid ? '1px solid #ccc' : '1px solid reed' }">
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
import ApplicationState from 'g3w-state';
import { gettext as _ } from 'g3w-i18n';
import { toRawType } from 'utils/toRawType';

/** Maintains the field's default, validation, and update state. */

import Quill from 'quill';

export default {
  /** @since 3.8.6 */
  name: 'input-html',

  props: ['state'],
  watch: {
    notvalid(notvalid) {
      if (notvalid) {
        this.service.setErrorMessage();
      }
    },
    'state.value'(value) {
      if (undefined !== this.state.input.options.default_expression) {
        setTimeout(() => this.change());
      }
      if (!this.edit_state.edit) {
        if (this.edit_state.show_html) {
          this.quill.container.firstChild.innerText = value;
        } else {
          this.quill.container.firstChild.innerHTML = value;
        }
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

    /**
     * edit_state is need if this input is repeated in different form tab
     */
    this.edit_state = {
      edit: false,
      show_html: false,
    };

    if (!this.state.edit_states) {
      this.state.edit_states = [];
    }
    this.state.edit_states.push(this.edit_state);
  },
  async mounted() {
    await this.$nextTick();
    this.quill = new Quill(this.$refs.quill_editor, {
      theme: 'snow',
      modules: {
        clipboard: {
          matchVisual: false,
        },
        table: true,
        toolbar: {
          container: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            [
              { align: '' },
              { align: 'center' },
              { align: 'right' },
              { align: 'justify' },
            ],
            [{ color: [] }, { background: [] }],
            [
              'bold',
              'italic',
              'underline',
              { list: 'ordered' },
              { list: 'bullet' },
              'link',
              'clean',
              'html',
            ],
            [
              'table',
              'column-left',
              'column-right',
              'column-remove',
              'row-above',
              'row-below',
              'row-remove',
            ],
          ],
          handlers: {
            html: () => {
              this.edit_state.show_html = !this.edit_state.show_html;
              if (this.edit_state.show_html) {
                this.quill.container.firstChild.innerText =
                  this.quill.container.firstChild.innerHTML;
              } else {
                this.quill.container.firstChild.innerHTML =
                  this.quill.container.firstChild.innerText;
              }
              this.$el.querySelectorAll('.ql-formats > *').forEach((child) => {
                child.classList.toggle(
                  child.classList.contains('ql-html')
                    ? 'skin-color'
                    : 'g3w-disabled'
                );
              });
            },
            'column-left': () => this.table.insertColumnLeft(),
            'column-right': () => this.table.insertColumnRight(),
            'column-remove': () => this.table.deleteColumn(),
            'row-above': () => this.table.insertRowAbove(),
            'row-below': () => this.table.insertRowBelow(),
            'row-remove': () => this.table.deleteRow(),
          },
        },
      },
    });

    // set value in quill editor
    this.quill.clipboard.dangerouslyPasteHTML(0, this.state.value);

    this.table = this.quill.getModule('table');

    // a11y: help text (button tooltip)
    this.$el.querySelector(
      '.ql-formats button[aria-label="align: "]'
    ).ariaLabel = 'align: left';
    this.$el.querySelector('.ql-formats .ql-color.ql-picker').title =
      'color: text';
    this.$el.querySelector(
      '.ql-formats .ql-color.ql-picker'
    ).dataset.placement = 'top';
    this.$el.querySelector('.ql-formats .ql-background.ql-picker').title =
      'color: background';
    this.$el.querySelector(
      '.ql-formats .ql-background.ql-picker'
    ).dataset.placement = 'top';
    this.$el.querySelectorAll('.ql-formats button').forEach((btn) => {
      btn.title = btn.ariaLabel;
      btn.dataset.placement = 'top';
    });

    // CUSTOM TOOL: html
    this.$el.querySelector('.ql-html').innerHTML = 'html';
    this.$el.querySelector('.ql-html').style.width = 'unset';

    // CUSTOM TOOL: column left
    Object.assign(this.$el.querySelector('.ql-column-left'), {
      innerHTML:
        '<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M10 12V4H9L5 8z"/></svg>',
      title: 'Add column left',
    });

    // CUSTOM TOOL: column right
    Object.assign(this.$el.querySelector('.ql-column-right'), {
      innerHTML:
        '<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M6 12V4l5 4z"/></svg>',
      title: 'Add column right',
    });

    // CUSTOM TOOL: column remove
    Object.assign(this.$el.querySelector('.ql-column-remove'), {
      innerHTML:
        '<svg fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d="M4.6 4.6a.5.5 0 0 1 .8 0L8 7.3l2.6-2.7a.5.5 0 0 1 .8.8L8.7 8l2.7 2.6a.5.5 0 0 1-.8.8L8 8.7l-2.6 2.7a.5.5 0 0 1-.8-.8L7.3 8 4.6 5.4a.5.5 0 0 1 0-.8"/></svg>',
      title: 'Remove column',
    });

    // CUSTOM TOOL: row above
    Object.assign(this.$el.querySelector('.ql-row-above'), {
      innerHTML:
        '<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M4 11h8v-1L8 6z"/></svg>',
      title: 'Add row above',
    });

    // CUSTOM TOOL: row below
    Object.assign(this.$el.querySelector('.ql-row-below'), {
      innerHTML:
        '<svg fill="currentColor" viewBox="0 0 16 16"><path d="M4 7V6h8v1l-4 4z"/><path d="m0 2 2-2h12l2 2v12l-2 2H2l-2-2zm15 0-1-1H2L1 2v12l1 1h12l1-1z"/></svg>',
      title: 'Add row below',
    });

    // CUSTOM TOOL: row remove
    Object.assign(this.$el.querySelector('.ql-row-remove'), {
      innerHTML:
        '<svg fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d="m4 8 .5-.5h7a.5.5 0 0 1 0 1h-7z"/></svg>',
      title: 'Remove row',
    });

    this.handler = () => {
      this.state.value = this.edit_state.show_html
        ? this.quill.container.firstChild.innerText
        : this.quill.container.firstChild.innerHTML;
      this.edit_state.edit = true;
      this.change();
      setTimeout(() => (this.edit_state.edit = false));
    };

    this.quill.on('text-change', this.handler);
  },
  beforeDestroy() {
    this.quill.off('text-change', this.handler);
    this.handler = null;
    this.quill = null;
    this.edit_state.edit = false;
    this.edit_state.show_html = false;
  },
  destroyed() {
    this.$emit('removeinput', this.state);
  },
};
</script>