<!--
  @file
  @since v3.7
-->

<template>
  <div style = "position: relative">
    <!-- Activate map coordinate picking -->
    <div style = "display: flex;justify-content: flex-end;height: 35px;margin-right: 12px; margin-bottom: 5px">
      <button
        @click.prevent.stop = "toggleGetCoordinate"
        :style              = "{border: coordinatebutton.active ? '2px solid' : 0}"
        data-placement      = "left"
        v-t-tooltip         = "'sdk.form.inputs.tooltips.lonlat'"
        class               = "action skin-color skin-border-color"
        style               = "border-radius: 5px; font-weight: bold; font-size: 20px; cursor: pointer"
        :class              = "g3wtemplate.font['crosshairs']">
      </button>
    </div>

    <!-- Longitude field -->
    <div v-if="state.visible" class="form-group">
      <template v-if="undefined === state.showlabel || state.showlabel">
        <label
          :for="lonId"
          class="col-sm-4 control-label"
          style="text-align:left !important; padding-top:0 !important; margin-bottom:3px"
        >
          {{ state.labels.lon }}
          <span v-if="state.validate && state.validate.required">*</span>
        </label>
      </template>
      <div v-if="state.relationField" style="color: var(--skin-warning); padding: 3px 0 3px 15px">
        <i aria-hidden="true" class="fas fa-exclamation-circle"></i>
        <span v-t="'Relation key field'"></span>
      </div>
      <div>
        <!-- Longitude input -->
        <div v-if="loadingState === 'loading'" style="position:relative; width: 100%"><bar-loader :loading="true" /></div>
        <input
          :id         = "lonId"
          @change     = "changeLonLat"
          :class      = "{'input-error-validation' : notvalid}"
          class       = "form-control"
          style       = "width:100%; margin-bottom: 5px;"
          :tabIndex   = "tabIndex"
          v-disabled  = "!editable"
          v-model     = "state.values.lon"
          type        = "number"
          min         = "-180"
          max         = "180"
          placeholder = "Lon">
        <!-- Validation and help -->
        <p
          v-if   = "notvalid"
          class  = "g3w-long-text error-input-message"
          style  = "margin: 0"
          v-html = "state.validate.message"
        ></p>
        <p v-else-if="state.info" style="margin: 0" v-html="state.info"></p>
        <div
          v-if   = "state.help && state.help.visible"
          v-html = "state.help.message"
          class  = "g3w_input_help skin-background-color"
          style  = "background-color: hsl(from var(--skin-color) h s calc(l + 48)) !important;"
        ></div>
      </div>
    </div>

    <!-- Latitude field -->
    <div v-if="state.visible" class="form-group">
      <template v-if="undefined === state.showlabel || state.showlabel">
        <label
          :for  = "latId"
          class = "col-sm-4 control-label"
          style = "text-align:left !important; padding-top:0 !important; margin-bottom:3px"
        >
          {{ state.labels.lat }}
          <span v-if="state.validate && state.validate.required">*</span>
        </label>
      </template>
      <div v-if="state.relationField" style="color: var(--skin-warning); padding: 3px 0 3px 15px">
        <i aria-hidden="true" class="fas fa-exclamation-circle"></i>
        <span v-t="'Relation key field'"></span>
      </div>
      <div>
        <!-- Latitude input -->
        <div v-if="loadingState === 'loading'" style="position:relative; width: 100%"><bar-loader :loading="true" /></div>
        <input
          :id         = "latId"
          @change     = "changeLonLat"
          class       = "form-control"
          style       = "width:100%; margin-bottom: 5px;"
          :tabIndex   = "tabIndex"
          v-disabled  = "!editable"
          v-model     = "state.values.lat"
          type        = "number"
          :class      = "{'input-error-validation' : notvalid}"
          min         = "-90"
          max         = "90"
          placeholder = "Lon">
        <!-- Validation and help -->
        <p
          v-if="notvalid"
          class  = "g3w-long-text error-input-message"
          style  = "margin: 0"
          v-html = "state.validate.message"
        ></p>
        <p v-else-if="state.info" style="margin: 0" v-html="state.info"></p>
        <div
          v-if   = "state.help && state.help.visible"
          v-html = "state.help.message"
          class  = "g3w_input_help skin-background-color"
          style  = "background-color: hsl(from var(--skin-color) h s calc(l + 48)) !important;"
        ></div>
      </div>
    </div>

  </div>
</template>

<script>
import { getUniqueDomId } from 'utils/getUniqueDomId';
import GUI from 'g3w-app';
import ApplicationState from 'g3w-state';
import { gettext as _ } from 'g3w-i18n';
import { toRawType } from 'utils/toRawType';

export default {
  /** @since 3.8.6 */
  name: 'input-lonlat',

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
  data() {
    return {
      lonId: getUniqueDomId(),
      latId: getUniqueDomId(),
      coordinatebutton: {
        active: false,
      },
    };
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
    getCoordinateActive() {
      return this.service.state.getCoordinateActive;
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
    toggleGetCoordinate() {
      this.service.toggleGetCoordinate();
    },
    changeLonLat() {
      this.change();
      this.setValue();
    },
    setValue() {
      this.state.value = [
        [1 * this.state.values.lon, 1 * this.state.values.lat],
      ];
    },
  },
  created() {
    this.state.input.options = this.state.input.options || {};
    this.service = Object.create(
      /** Maintains the field's default, validation, and update state. */ Object.assign(
        Object.create({
          initialize({ state = {}, validatorOptions } = {}) {
            this.state = state;
            this.validatorOptions =
              validatorOptions || state.input.options || {};
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
                      !Number.isNaN(1 * value) &&
                      Math.abs(1 * value) <= 2147483647,
                    checkbox: (value, options) =>
                      (options.values || []).includes(value),
                    datetimepicker: (value, options) =>
                      moment(
                        value,
                        options.fielddatetimeformat,
                        true
                      ).isValid(),
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
              } else if (
                Array.isArray(options.values) &&
                options.values.length
              ) {
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
              this.state.validate.valid =
                !this.state.validate.exclude_values.has(`${this.state.value}`);
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
                `${_(
                  'sdk.form.inputs.input_validation_error_type'
                )} ( ${type} )`;
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
        }),
        {
          initialize(opts = {}) {
            ({
              initialize({ state = {}, validatorOptions } = {}) {
                this.state = state;
                this.validatorOptions =
                  validatorOptions || state.input.options || {};
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
                          !Number.isNaN(1 * value) &&
                          Math.abs(1 * value) <= 2147483647,
                        checkbox: (value, options) =>
                          (options.values || []).includes(value),
                        datetimepicker: (value, options) =>
                          moment(
                            value,
                            options.fielddatetimeformat,
                            true
                          ).isValid(),
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
                  } else if (
                    Array.isArray(options.values) &&
                    options.values.length
                  ) {
                    defaultValue =
                      options.values[0] &&
                      (options.values[0].value || options.values[0]);
                  }
                }
                const getDefaultValue =
                  this.state.get_default_value &&
                  ![null, undefined].includes(defaultValue);
                if (
                  getDefaultValue &&
                  undefined === options.default_expression
                ) {
                  this.state.value = defaultValue;
                }
                this.state.value_from_default_value = getDefaultValue;
              },
              setEmpty() {
                this.state.validate.empty =
                  null === this.state.value ||
                  '' === `${this.state.value}`.trim();
              },
              validate() {
                if (this.state.validate.empty) {
                  this.state.value = null;
                  this.state.validate.valid = !this.state.validate.required;
                } else if (
                  this.state.validate.unique &&
                  this.state.validate.exclude_values?.size
                ) {
                  this.state.validate.valid =
                    !this.state.validate.exclude_values.has(
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
                    `${_(
                      'sdk.form.inputs.input_validation_error'
                    )} ( ${type} )`;
                } else {
                  validate.message =
                    this.state.info ||
                    `${_(
                      'sdk.form.inputs.input_validation_error_type'
                    )} ( ${type} )`;
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
            }).initialize.call(this, opts);
            this.coordinatebutton;
            this.mapEpsg = GUI.getCrs();
            this.mapControlToggleEventHandler = (evt) => {
              if (evt.target.isToggled() && evt.target.isClickMap()) {
                this.coordinatebutton.active && this.toggleGetCoordinate();
              }
            };
            this.map = GUI.getMap();
            this.outputEpsg = this.state.epsg || this.mapEpsg;
            this.eventMapKey;

            return this;
          },
          setCoordinateButtonReactiveObject(button) {
            this.coordinatebutton = button;
          },
          validate() {
            if (this.state.values.lon < -180) {
              this.state.values.lon = -180;
            } else if (this.state.values.lon > 180) {
              this.state.values.lon = 180;
            }
            if (this.state.values.lat < -90) {
              this.state.values.lat = -90;
            } else if (this.state.values.lat > 90) {
              this.state.values.lat = 90;
            }
            this.state.validate.valid = !Number.isNaN(
              1 * this.state.values.lon
            );
          },
          toggleGetCoordinate() {
            this.coordinatebutton.active = !this.coordinatebutton.active;
            this.coordinatebutton.active
              ? this.startToGetCoordinates()
              : this.stopToGetCoordinates();
          },
          startToGetCoordinates() {
            GUI.deactiveMapControls();
            GUI.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
            this.eventMapKey = this.map.on('click', (evt) => {
              evt.originalEvent.stopPropagation();
              evt.preventDefault();
              const coordinate =
                this.mapEpsg !== this.outputEpsg
                  ? ol.proj.transform(
                      evt.coordinate,
                      this.mapEpsg,
                      this.outputEpsg
                    )
                  : evt.coordinate;
              this.state.value = [coordinate];
              const [lon, lat] = coordinate;
              this.state.values.lon = lon;
              this.state.values.lat = lat;
            });
          },
          stopToGetCoordinates() {
            ol.Observable.unByKey(this.eventMapKey);
            GUI.off('mapcontrol:toggled', this.mapControlToggleEventHandler);
          },
          clear() {
            this.stopToGetCoordinates();
          },
        }
      )
    ).initialize({
      state: this.state,
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
    this.state.values = this.state.values || {
      lon: 0,
      lat: 0,
    };
    this.setValue();
    this.service.setCoordinateButtonReactiveObject(this.coordinatebutton);
  },
  destroyed() {
    this.service.clear();
    this.$emit('removeinput', this.state);
  },
};
</script>