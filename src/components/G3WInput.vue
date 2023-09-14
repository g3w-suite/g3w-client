<!--
  @file    Base input component
  
  @example see: components/InputText.vue
  
  @since   3.9.0

  @version 2.0 ADD SOURCE FROM: src/components/FieldText.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/components/FieldVue.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/mixins/fields.js@3.8
  @version 2.0 ADD SOURCE FROM: src/mixins/media.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/Field.vue@3.8
  @version 2.0 ADD SOURCE FROM: src/app/core/utils/validators.js@3.8
  @version 2.0 ADD SOURCE FROM: src/gui/inputs/input.js@3.8
  @version 2.0 ADD SOURCE FROM: src/mixins/base-input.js@3.8
  @version 2.0 ADD SOURCE FROM: src/components/InputG3W.vue@3.8
  @version 1.0 ORIGINAL SOURCE: src/components/InputBase.vue@3.7
-->

<template>

  <!--
    @example <g3w-input mode="read" _legacy="g3w-field" _type=".." />
    @example <g3w-input mode="read" _legacy="g3w-vuefield" />
    @example <g3w-input mode="edit" _legacy="g3w-input" _type=".." />
  -->
  <component
    v-if = "['g3w-field', 'g3w-input', 'g3w-vuefield'].includes(_legacy) || isVue(field)"
    :is  = "('edit' == mode && state.visible && 'g3w-input' === _legacy && !$attrs._plain) ? 'div' : 'fragment'"
  >
    <component
      v-bind   = "{ $attrs, state }"
      :feature = "('g3w-vuefield' === this._legacy || isVue(field)) ? feature                                                                      : undefined"
      :value   = "('g3w-vuefield' === this._legacy || isVue(field)) ? (undefined === field.value      ? null         : field.value)                : undefined"
      :is      = "('g3w-vuefield' === this._legacy || isVue(field)) ? (undefined === field.vueoptions ? {}           : field.vueoptions.component) : type"
      v-html   = "('g3w-vuefield' === this._legacy || isVue(field)) ? ('g3w-vuefield' === this._legacy ? undefined   : field.value)                : undefined"
    />
    <span v-if="('edit' == mode && state.visible && 'g3w-input' === _legacy && !$attrs._plain) ? 'div' : 'fragment'" class="divider"></span>
  </component>

  <!--
    ORIGINAL SOURCE: src/components/Field.vue@3.8

    @example

      <g3w-input mode="read" :state>
        <template #field-label> ... </template>
        <template #field-body> ... </template>
        ...
      </g3w-input>

    @since 3.9.0
  -->
  <fragment v-else-if="'read' == mode">
    <slot name="default">

      <span
        v-if   = "_legacy && isSimple(field)"
        v-html = "field.value"
      ></span>

      <div
        v-else
        class  = "field"
        :style = "{ fontSize: isMobile() && '0.8em' }"
      >

        <div v-if="state.label" class="col-sm-6 field_label">
          <slot name="field-label">{{ state.label }}</slot>
        </div>

        <div :class="[state.label ? 'col-sm-6' : null ]" class="field_value">

          <slot
            name   = "field-value"
            :state = "state"
            :field = "field"
          >

            <!--
              ORIGINAL SOURCE: src/components/FieldText.vue@3.8

              @example <g3w-input mode="read" :state />

              @since 3.9.0
            -->
            <span
              style  = "word-wrap: break-word;"
              v-html = "state.value"
            ></span>

          </slot>
        </div>

      </div>

    </slot>
  </fragment>

  <!--
    Base G3WInput component

    @example

      <g3w-input :state>
        <template #input-label> ... </template>
        <template #input-body> ... </template>
        ...
      </g3w-input>

    ORIGINAL SOURCE: src/components/InputBase.vue@3.8

    @since 3.7.0
  -->

  <fragment v-else-if="'edit' == mode && state.visible">

    <slot name="default">

      <!--
        ORIGINAL SOURCE: src/components/InputG3W.vue@3.8

        @example <g3w-input _legacy="g3w-input" />

        @since 3.9.0
      -->
      <div v-if="'g3w-input' === _legacy && 'child' === state.type">

        <div
          style = "border-top: 2px solid"
          class = "skin-border-color field-child"
        >
          <h4 style="font-weight: bold">{{ state.label }}</h4>
          <div> {{ state.description }} </div>
          <g3w-input
            v-for   ="field in state.fields"
            v-bind  = "{ $attrs, state }"
            :state  = "field"
            :key    = "field.name"
            _legacy = "g3w-input"
          />
        </div>

      </div>

      <div v-else class="form-group">

        <!-- INPUT LABEL -->
        <slot name="input-label">
          <label
            :for       = "state.name"
            v-disabled = "!editable"
            class      = "col-sm-12 control-label"
          >{{ state.label }}
            <span v-if="state.validate && state.validate.required">*</span>
            <i
              v-if   = "showhelpicon"
              :class = "g3wtemplate.font['info']"
              class  = "skin-color"
              style  = "margin-left: 3px; cursor: pointer"
              @click = "showHideHelp"
            ></i>
            <slot name="input-label-action"></slot>
          </label>
        </slot>

        <div class="col-sm-12">

          <!-- LOADING BAR -->
          <slot name="loading">
            <div
              v-if  = "'loading' === loadingState"
              slot  = "loading"
              style = "position:relative; width: 100%"
            >
              <bar-loader loading="true" />
            </div>
          </slot>

          <!-- INPUT ELEMENT (eg. components/InputText.vue) -->
          <slot
            name          = "input-body"
            :editable     = "editable"
            :notvalid     = "notvalid"
            :tabIndex     = "tabIndex"
            :change       = "change"
            :mobileChange = "mobileChange"
          />

          <!-- ERROR MESSAGES -->
          <slot name="input-message">
            <p
              v-if      = "notvalid"
              class     = "g3w-long-text error-input-message"
              style     = "margin: 0"
              v-html    = "state.validate.message"
            ></p>
            <p
              v-else-if = "state.info"
              style     = "margin: 0"
              v-html    = "state.info"
            ></p>
          </slot>

          <!-- HELP MESSAGE -->
          <div
            v-if        = "state.help && state.help.visible"
            class       = "g3w_input_help skin-background-color extralighten"
            v-html      = "state.help.message"
          ></div>

        </div>

      </div>

    </slot>
  </fragment>

</template>

<script>
import { Fragment }             from 'vue-fragment';

import * as InputCheckbox       from 'components/InputCheckbox.vue';
import * as InputColor          from 'components/InputColor.vue';
import * as InputDateTimePicker from 'components/InputDateTimePicker.vue';
import * as InputDateTime       from 'components/InputDateTime.vue';
import * as InputFloat          from 'components/InputFloat.vue';
import * as InputGeo            from 'components/InputGeo.vue';
import * as InputInteger        from 'components/InputInteger.vue';
import * as InputLayerPositions from 'components/InputLayerPositions.vue';
import * as InputLonLat         from 'components/InputLonLat.vue';
import * as InputMedia          from 'components/InputMedia.vue';
import * as InputPickLayer      from 'components/InputPickLayer.vue';
import * as InputRadio          from 'components/InputRadio.vue';
import * as InputRange          from 'components/InputRange.vue';
import * as InputSelect         from 'components/InputSelect.vue';
import * as InputTable          from 'components/InputTable.vue';
import * as InputText           from 'components/InputText.vue';
import * as InputTextArea       from 'components/InputTextArea.vue';
import * as InputTextHtml       from 'components/InputTextHtml.vue';
import * as InputUnique         from 'components/InputUnique.vue';

import ApplicationState                       from 'store/application-state';
import CatalogLayersStoresRegistry            from 'store/catalog-layers';
import ProjectsRegistry                       from 'store/projects';
import MapLayersStoresRegistry                from 'store/map-layers';
import ApplicationService                     from 'services/application';
import GUI                                    from 'services/gui';

const {
  truefnc,
  toRawType,
  convertQGISDateTimeFormatToMoment,
  getFieldType,
  getMediaFieldType,
}                                             = require('core/utils/utils');
const { getQueryLayersPromisesByCoordinates } = require('core/utils/geo');
const PickFeatureInteraction                  = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction              = require('g3w-ol/interactions/pickcoordinatesinteraction');
const { t }                                   = require('core/i18n/i18n.service');

Object
  .entries({
    ApplicationState,
    CatalogLayersStoresRegistry,
    ProjectsRegistry,
    MapLayersStoresRegistry,
    ApplicationService,
    GUI,
    truefnc,
    toRawType,
    convertQGISDateTimeFormatToMoment,
    getFieldType,
    getMediaFieldType,
    getQueryLayersPromisesByCoordinates,
    PickFeatureInteraction,
    PickCoordinatesInteraction,
    t,
    InputCheckbox,
    InputColor,
    InputDateTimePicker,
    InputDateTime,
    InputFloat,
    InputGeo,
    InputInteger,
    InputLayerPositions,
    InputLonLat,
    InputMedia,
    InputPickLayer,
    InputRadio,
    InputRange,
    InputSelect,
    InputTable,
    InputText,
    InputTextArea,
    InputTextHtml,
    InputUnique,
  })
  .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));


/**
 * Limit a number between min / max values
 * 
 * @see _.clamp lodash implementation
 */
function _clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Check if a variable is not `null` or `undefined` (nullish coalescing values) 
 */
function _hasValue(value) {
  return null !== value && undefined !== value;
}

/**
 * ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
 */
function _isFloat(value) {
  return !Number.isNaN(Number(1 * value));
}

/**
 * ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
 */
function _isInteger(value) {
  return !_.isNaN(1 * value) && Number.isSafeInteger(1 * value) && (1 * value) <= 2147483647;
}

/**
 * ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
 */
function _isCheckBox(values, value) {
  return -1 !== (values || []).indexOf(value);
}

/**
 * ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
 */
function _isDateTime(value, options) {
  return moment(value, options.fielddatetimeformat, true).isValid();
}

/**
 * ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
 */
function _isValueInRange(min, max, value) {
  return (1 * value) >= min && (1 * value) <= max;
}

function _defaultState(state) {
  state               = state               || {}; 
  state.input         = state.input         || {};
  state.input.options = state.input.options || {}; 
  state.validate      = state.validate      || {}; 
  return state;
}

/******************************************************* */

/**
 * Base class
 *
 * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
 */
class Service {

  constructor(options = {}) {
    /** state of input */
    this.state = options.state || {};

    // // type of input
    // if (this.state.validate.required) {
    //   this.setValue(this.state.value);
    // }

    // initial value of input (based on value or default options value)
    this.setValue(this.state.value);
    this.setEmpty(this.state.value);

    /**
     * Input Validators
     * 
     * ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
     */
    const vOptions = (options.validatorOptions || this.state.input.options || {});
    this._validator = {
      options: vOptions,
      validate: ({
        'range':          _isValueInRange.bind(vOptions.min, vOptions.max),
        'datetimepicker': _isDateTime,
        'checkbox':       _isCheckBox.bind(vOptions.values),
        'integer':        _isInteger,
        'float':          _isFloat,
      })[this.state.type] || truefnc,
    };

    this.setErrorMessage(options.state);
  }

  getState() {
    return this.state;
  }
  
  getValue() {
    return this.state.value;
  }

  /**
   * Initial value of input (based on value or default options value)
   * 
   * @TODO potential ambiguous method name, rename into something more explicit (eg. `this.setDefaultValue(value)`)
   * 
   * @param value
   *
   * @returns {void}
   */
  setValue(value) {
    if (_hasValue(value)) {
      return;
    }

    const { options } = this.state.input;
    let default_value = options.default;

    /** @TODO (maybe need to removed in v3.9.0) double check G3W-ADMIN server configuration. */
    if (Array.isArray(options)) {
      if (options[0].default) {
        default_value = options[0].default;
      } else if (Array.isArray(options.values) && options.values.length > 0) {
        default_value = options.values[0] && (options.values[0].value || options.values[0]);
      }
    }

    // check if default value is set
    const get_default_value = (
      this.state.get_default_value && // ref: core/layers/tablelayer.js::getFieldsWithValues()
      _hasValue(default_value)
    );

    // check if we can state.check get_default_value from input.options.default is set
    if (get_default_value && undefined === options.default_expression) {
      this.state.value = default_value;
    }

    this.state.value_from_default_value = get_default_value;

  }

  addValueToValues(value) {
    this.state.input.options.values.unshift(value)
  }

  _getValidatorType() {
    return this.state.type;
  }

  setState(state={}) {
    this.state = _.isObject(state) ? state : {};
  }

  getValidator() {
    return this._validator;
  }

  setValidator(validator) {
    this._validator = validator;
  }

  setEmpty() {
    this.state.validate.empty = (
      !(Array.isArray(this.state.value) && this.state.value.length > 0) &&
      _.isEmpty(_.trim(this.state.value))
    );
  }

  /**
   * Check state's value validity
   */
  validate() {
    const is_empty       = this.state.validate.empty;
    const is_required    = this.state.validate.required;
    const is_numeric     = ['integer', 'float'].includes(this.state.input.type);
    const has_number     = is_numeric && +this.state.value >= 0;
    const exclude_values = this.state.validate.exclude_values && this.state.validate.exclude_values.size;
    const is_excluded    = exclude_values && this.state.validate.exclude_values.has(this.state.value);

    // check unique
    if (is_empty) {
      this.state.validate.unique = true;
    }

    // check empty
    if (is_empty || !has_number) {
      this.state.validate.empty  = true;
      this.state.value           = null;
    }

    // invalid
    if (is_required && (is_empty || (!has_number || is_excluded))) {
      this.state.validate.valid = false;
    }

    // valid
    if (!is_empty && (!is_excluded || (!is_required && !has_number))) {
      this.state.validate.valid = true;
    }

    // validate
    if ((!is_required && is_empty) || (!is_empty && (!exclude_values || has_number))) {
      this.state.validate.valid = this._validator.validate(this.state.value);
    }

    return this.state.validate.valid;
  }

  setErrorMessage(input) {
    const {
      mutually,
      mutually_valid,
      max_field,
      min_field,
      unique,
      exclude_values,
      required,
    } = input.validate;

    let message = this.state.info;

    if (required) {
      message = this.state.info || `${t("sdk.form.inputs.input_validation_error")} ( ${t("sdk.form.inputs." + input.type)} )` + (this.state.info ? ` <div><b>${this.state.info}</b></div>` : '');
    }

    if (unique && exclude_values && exclude_values.size) {
      message = `${t("sdk.form.inputs.input_validation_exclude_values")}`;
    }

    if (min_field) {
      message = `${t("sdk.form.inputs.input_validation_min_field")} (${min_field})`;
    }

    if (max_field) {
      message = `${t("sdk.form.inputs.input_validation_max_field")} (${max_field})`;
    }

    if (mutually && !mutually_valid) {
      message =  `${t("sdk.form.inputs.input_validation_mutually_exclusive")} ( ${mutually.join(',')} )`;
    }

    this.state.validate.message = message;
  }

  setUpdate() {
    const { value, _value } = this.state;

    const is_media  = 'media' === this.state.input.type && false === [toRawType(value), toRawType(_value)].includes('Object'); 
    const is_date   = 'datetimepicker' === this.state.input.type;

    // default
    let curr = value;
    let old  = _value; 

    // media
    if (is_media) {
      curr = value.value;
      old = _value.value;
    }

    // datetimepicker
    if (is_date && null !== value) {
      curr = value.toUpperCase();
    }
    if (is_date && _value) {
      old = _value.toUpperCase();
    }

    this.state.update = (curr != old);
  }

};

/******************************************************* */

/**
 * Factory object 
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/services.js@3.8
 */
const InputsServices = {
  'text':           class extends Service {},
  'textarea':       class extends Service {},
  'texthtml':       class extends Service {},
  'string':         class extends Service {},
  'color':          class extends Service {},
  'integer':        class extends Service {},
  'float':          class extends Service {},
  'radio':          class extends Service {},
  'unique':         class extends Service {},
  'media':          class extends Service {},
  
  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/checkbox/service.js@3.8
   */
  'check': class extends Service {
 
    constructor(options = {}) {
      const value              = options.state.input.options.values.find(value => false === value.checked);
      options.validatorOptions = { values: options.state.input.options.values.map(value => value) };
      options.state.value      = (null === options.state.value && !options.state.forceNull) ? value.value : options.state.value;
      super(options);
    }

    convertCheckedToValue(checked) {
      checked          = _hasValue(checked) ? checked : false;
      this.state.value = this.state.input.options.values.find(value => checked === value.checked).value;
      return this.state.value;
    }

    convertValueToChecked() {
      if (!_hasValue(this.state.value)) {
        return false;
      }
      let option = this.state.input.options.values.find(value => this.state.value === value.value);
      if (undefined === option) {
        option           = this.state.input.options.values.find(value => false === value.checked);
        this.state.value = option.value;
      }
      return option.checked;
    }

  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/range/service.js@3.8
   */
  'range': class extends Service {

    constructor(options = {}) {
      const { min, max } = options.state.input.options.values[0];
      options.state.info = `[MIN: ${min} - MAX: ${max}]`;
      super(options);
      
      // range validator
      const vOptions = { min: 1 * min, max: 1 * max };
      this.setValidator({ options: vOptions, validate: _isValueInRange.bind(vOptions.min, vOptions.max) });
    }

    isValueInRange(value, min, max) {
      return value <= max && value >= min;
    }

  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/datetimepicker/service.js@3.8
   */
  'datetimepicker': class extends Service {

    constructor(options = {}) {
      super(options);

      /** @TODO double check (in v3.8 this assignment was before `super(options)` call) */
      this.validatorOptions = {};
    }

    getLocale() {
      const applicationConfig = ApplicationService.getConfig();
      return applicationConfig.user.i18n ? applicationConfig.user.i18n : 'en';
    };
  
    convertQGISDateTimeFormatToMoment(datetimeformat) {
      return convertQGISDateTimeFormatToMoment(datetimeformat);
    }
  
    setValidatorOptions(options) {
      this.validatorOptions = options;
    }
  
  },
 
  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@3.8
   */
  'select': class extends Service {

    constructor(options = {}) {
      super(options);
      this.layer = null;
    }

    _getLayerById(layer_id) {
      return CatalogLayersStoresRegistry.getLayerById(layer_id);
    }

    addValue(value) {
      this.state.input.options.values.push(value);
    };

    getKeyByValue({search}={}) {
      const options = this.state.input.options;
      const { value, key } = options;
      this
        .getData({ key: value, value: key, search })
        .then(arrayValues => {
          const [_value] = arrayValues;
          this.addValue({ key: _value.$value, value: _value.text })
        })
        .catch(err => console.log(err));
    }

    getData({
      layer_id = this.state.input.options.layer_id,
      key      = this.state.input.options.key,
      value    = this.state.input.options.value,
      search
    } = {}) {
      return new Promise((resolve, reject) => {
        if (!this._layer) this._layer = this._getLayerById(layer_id);
        this._layer
          .getDataTable({
            suggest: `${key}|${search}`.trim(),
            ordering: key
          })
          .then(response => {
            const values = [];
            const features = response.features;
            for (let i = 0; i < features.length; i++) {
              values.push({
                text:features[i].properties[key],
                id: i,
                $value: features[i].properties[value]
              })
            }
            resolve(values);
          })
          .fail(err => reject(err));
      });
    }

  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
   */
  'picklayer': class {
  
    constructor(options = {}) {
      this.pick_type   = options.pick_type || 'wms';
      this.ispicked    = false;
      this.fields      = options.fields || [options.value];
      this.layerId     = options.layer_id;
      this.mapService  = GUI.getService('map');
      this.interaction = 'map' === this.pick_type
        ? new PickFeatureInteraction({ layers: [this.mapService.getLayerById(this.layerId)] })
        : new PickCoordinatesInteraction();
    }

    isPicked() {
      return this.ispicked;
    }

    //bind interrupt event
    escKeyUpHandler({ keyCode, data: { owner } }) {
      if (27 === keyCode) {
       owner.unpick();
      }
    }

    unbindEscKeyUp() {
      $(document).unbind('keyup', this.escKeyUpHandler);
    }

    bindEscKeyUp() {
      $(document).on('keyup', { owner: this }, this.escKeyUpHandler);
    };

    pick() {
      return new Promise((resolve, reject) => {
        this.bindEscKeyUp();
  
        const values = {};
  
        this.ispicked = true;
  
        const afterPick = feature => {
          if (feature) {
            const attributes = feature.getProperties();
            this.fields.forEach(field => { values[field] = attributes[field]; });
            resolve(values);
          } else {
            reject();
          }
          this.ispicked = false;
          this.unpick();
        };
  
        GUI.setModal(false);
  
        this.mapService.addInteraction(this.interaction);
  
        this.interaction.once('picked', event => {
          switch(this.pick_type) {
            case 'map':
              afterPick(event.feature);
              break;
            case 'wms':
              const layer = MapLayersStoresRegistry.getLayerById(this.layerId);
              if (layer) {
                getQueryLayersPromisesByCoordinates(
                  [layer],
                  {
                    map: this.mapService.getMap(),
                    feature_count: 1,
                    coordinates: event.coordinate
                  }
                )
                .then(response => {
                  const { data = [] } = response[0];
                  const feature = data.length && data[0].features[0] || null;
                  afterPick(feature);
                })
              }
              break;
          }
        })
      })
    }

    unpick() {
      this.mapService.removeInteraction(this.interaction);
      GUI.setModal(true);
      this.unbindEscKeyUp();
      this.ispicked = false;
    }

    clear() {
      if (this.isPicked()) {
       this.unpick();
      }
      this.mapService = this.interaction = this.field = null;
    }
  
  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/sliderrange/service.js@3.8
   */
  'slider': class extends Service {

    constructor(options = {}) {
      const { min, max } = options.state.input.option;
      options.state.info = `[MIN: ${min} - MAX: ${max}]`;

      super(options);

      // range validator
      const vOptions = { min: 1 * min, max: 1 * max };
      this.setValidator({ options: vOptions, validate: _isValueInRange.bind(vOptions.min, vOptions.max) });
    }

    changeInfoMessage() {
      this.state.info =  `[MIN: ${this.state.input.options.min} - MAX: ${this.state.input.options.max}]`;
    }

    /** @override */
    validate() {
      this.state.value          = 1 * this.state.value;
      this.state.validate.valid = this.state.value >= this.state.input.options.min || this.state.value <= this.state.input.options.max;
    }

  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
   */
  'lonlat': class extends Service {
  
    constructor(options = {}) {
      super(options);

      this.coordinatebutton             = undefined;
      this.mapService                   = GUI.getComponent('map').getService();
      this.mapEpsg                      = this.mapService.getCrs();
      this.mapControlToggleEventHandler = this.mapControlToggleEventHandler.bind(this);
      this.onMapClick                   = this.onMapClick.bind(this);
      this.map                          = this.mapService.getMap();
      this.outputEpsg                   = this.state.epsg || this.mapEpsg;
    }

    setCoordinateButtonReactiveObject(button) {
      this.coordinatebutton = button;
    }

    validate() {
      this.state.values.lon     = _clamp(this.state.values.lon, -180, 180);
      this.state.values.lat     = _clamp(this.state.values.lon, -90, 90);
      this.state.validate.valid = !Number.isNaN(1 * this.state.values.lon);
    }
  
    toggleGetCoordinate() {
      if (this.coordinatebutton.active) {
        this.stopToGetCoordinates();
      } else {
        this.startToGetCoordinates();
      }
    }
  
    startToGetCoordinates() {
      this.coordinatebutton.active = true;

      this.mapService.deactiveMapControls();
      this.mapService.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
      this.eventMapKey = this.map.on('click', this.onMapClick)
    }

    stopToGetCoordinates() {
      this.coordinatebutton.active = false;

      ol.Observable.unByKey(this.eventMapKey);
      this.mapService.off('mapcontrol:toggled', this.mapControlToggleEventHandler)
    }

    clear() {
      this.stopToGetCoordinates();
    }

    /**
     * @since 3.9.0
     */
    mapControlToggleEventHandler(e) {
      if (
        e.target.isToggled() &&
        e.target.isClickMap() &&
        this.coordinatebutton.active
      ) {
        this.toggleGetCoordinate();
      }
    }

    /**
     * @since 3.9.0
     */
    onMapClick(evt) {
      evt.originalEvent.stopPropagation();
      evt.preventDefault();
      const coord = this.mapEpsg !== this.outputEpsg
        ? ol.proj.transform(evt.coordinate, this.mapEpsg, this.outputEpsg)
        : evt.coordinate;
      this.state.value      = [coord];
      this.state.values.lon = coord[0];
      this.state.values.lat = coord[1];
    }
  
  },

};


/******************************************************* */

/**
 * ORIGINAL SOURCE: src/gui/fields/fieldsservice.js@3.8
 */
const fieldsservice = {

  /**
   * Add a new field type to Fields
   * 
   * @param type
   * @param field
   */
  add({ type, field }) {
    vm.components[type] = field;
  },

  /**
   * Remove field from Fields list
   * 
   * @param type
   */
  remove(type) {
    delete vm.components[type];
  },

  /**
   * Change type of field (example to set vue type)
   * 
   * @param layerId
   * @param field
   */
  changeConfigFieldType({layerId, field={}}) {
    CatalogLayersStoresRegistry.getLayerById(layerId).changeConfigFieldType(field);
  },

  /**
   * Reset origin type
   * 
   * @param layerId
   * @param field
   */
  resetConfigFieldType({layerId, field={}}) {
    CatalogLayersStoresRegistry.getLayerById(layerId).resetConfigField(field);
  },

};

/**
 * BACKCOMP
 */
InputsServices['select_autocomplete'] = InputsServices['select'];

const vm = {

  /** @since 3.9.0 */
  name: 'g3w-input',

  props: {

    state: {
      /**
       * @see https://v3-migration.vuejs.org/breaking-changes/props-default-this.html
       */
      default() {
        this.state = _defaultState(this.state);
        return this.state;
      },
    },

    /**
     * @since 3.9.0
     */
    mode: {
      default: 'edit',
    },

    /**
     * Legacy input type.
     * 
     * BACKCOMP ONLY (v3.x)
     * 
     * ref: `g3wsdk.gui.vue.Inputs.*`
     * ref: `g3wsdk.gui.vue.Fields`
     * 
     * @since 3.9.0
     */
     _legacy: {
      type: String,
      default: "",
    },

    /**
     * @since 3.9.0
     */
    _plain: {
      default: false
    }

  },

  data() {
    return {
      /** @since 3.9.0 */
      window: window,
    }
  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/inputs.js@3.8
   */
  components: {

    /**
     * @since 3.9.0
     */
    Fragment,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/text/vue/text.js@3.8
     * 
     * @since 3.9.0
     */
    'text_input': InputText,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/texthtml/vue/texthtml.js@3.8
     * 
     * @since 3.9.0
     */
    'texthtml_input': InputTextHtml,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/textarea/vue/textarea.js@3.8
     * 
     * @since 3.9.0
     */
    'textarea_input': InputTextArea,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/integer/vue/integer.js@3.8
     * 
     * @since 3.9.0
     */
    'integer_input': InputInteger,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/float/vue/float.js@3.8
     * 
     * @since 3.9.0
     */
    'float_input': InputFloat,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/radio/vue/radio.js@3.8
     * 
     * @since 3.9.0
     */
    'radio_input': InputRadio,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/checkbox/vue/checkbox.js@3.8
     * 
     * @since 3.9.0
     */
    'check_input': InputCheckbox,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/range/vue/range.js@3.8
     * 
     * @since 3.9.0
     */
    'range_input': InputRange,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/datetimepicker/vue/datetimepicker.js@3.8
     * 
     * @since 3.9.0
     */
    'datetimepicker_input': InputDateTimePicker,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/unique/vue/unique.js@3.8
     * 
     * @since 3.9.0
     */
    'unique_input': InputUnique,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/select/vue/select.js@3.8
     * 
     * @since 3.9.0
     */
    'select_input': InputSelect,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/media/vue/media.js@3.8
     * 
     * @since 3.9.0
     */
    'media_input': InputMedia,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/picklayer/vue/picklayer.js@3.8
     * 
     * @since 3.9.0
     */
    'picklayer_input': InputPickLayer,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/color/vue/color.js@3.8
     * 
     * @since 3.9.0
     */
    'color_input': InputColor,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/lonlat/vue/lonlat.js@3.8
     * 
     * @since 3.9.0
     */
    'lonlat_input': InputLonLat,

    /**
     * ORIGINAL SOURCE: src/gui/inputs/table/vue/table.js@3.8
     * 
     * @since 3.9.0
     */
    'table_input': InputTable,

    /**
     * @since 3.9.0
     */
    'datetime_input': InputDateTime,

    /**
     * @since 3.9.0
     */
    'layer_positions_input': InputLayerPositions,

    /**
     * @since 3.9.0
     */
    'geo_input': InputGeo,

  },

  computed: {

    /**
     * ORIGINAL SOURCE: src/components/InputG3W.vue@3.8
     * 
     * @since 3.9.0
     */
    type() {
      /** @TODO make it a required `$props` instead? */
      if (this._type) {                          // TODO: replace static `_type` calls with `getFieldType(field)` ?
        return this._type;
      } else if ('g3w-field' === this._legacy /*&& !this.type*/) {
        return this.getType(this.state);
      }
      if ('edit' === this.mode && 'child' !== this.state.type) {
        return `${this.state.input && this.state.input.type ? this.state.input.type : this.state.type}_input`;
      }
    },

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    tabIndex() {
      return this.editable ? 0 : -1;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    notvalid() {
      return this.state.validate && (false === this.state.validate.valid);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    editable() {
      return this.state.editable;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    showhelpicon() {
      return this.state.help && this.state.help.message.trim();
    },

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    disabled() {
      return !this.editable || ['loading', 'error'].includes(this.loadingState);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    loadingState() {
      return this.state.input && this.state.input.options.loading ? this.state.input.options.loading.state : null;
    },

  },

  watch: {

    'notvalid'(notvalid) {
      if (notvalid) {
        this.getInputService().setErrorMessage(this.state);
      }
    },

    'state.value'() {
      if (undefined !== this.state.input.options.default_expression) {
        // postpone `state.value` watch parent that use mixin
        setTimeout(() => this.change());
      }
    },

  },

  methods: {

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    showHideHelp() {
      this.state.help.visible = !this.state.help.visible
    },

    /**
     * Used by textual inputs for listening to mobile changes
     *
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    mobileChange(event) {
      this.state.value = event.target.value;
      this.change();
    },

    /**
     * Called when input value change.
     *
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     *
     * @fires changeinput
     */
    change() {
      console.log('input changed', this);

      const service = this.getInputService();

      service.setEmpty();
      service.setUpdate();

      // validate input if is required or need to be unique
      if (this.state.validate.required || this.state.validate.unique) {
        service.validate();
      }

      this.$emit('changeinput', this.state);

      // emit to <child #slot="input-body"> from parent <g3w-input> 
      if (this.$slots && this.$slots.body && this.$slots.body[0].context && this.$slots.body[0].context.$emit) {
        this.$slots.body[0].context.$emit('changeinput', this.state);
      }
    },

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     * 
     * @TODO check if deperecated
     */
    isVisible() {},

    /**
     * Factory method
     * 
     * @since 3.9.0
     */
    createInputService(type, options) {
      console.assert(undefined !== InputsServices[type], 'Uknwon InputsService type: %s', type);
      return new InputsServices[type](options);
    },

    /**
     * @since 3.9.0
     */
    getInputService() {
      if (!this.service) {
        this.service = this.createInputService(this.state.input.type, { state: this.state });

        this.$watch(() => ApplicationState.language, () => this.service.setErrorMessage(this.state));
    
        if (this.state.editable && this.state.validate.required) {
          this.service.validate();
        }
      }
      return this.service;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
     getFieldService() {
      // if (undefined === this._fieldsService) {
      //   this._fieldsService = fieldsservice;
      // }
      // return this._fieldsService;
      return fieldsservice;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    getType: getFieldType,

    /**
     * @since 3.9.0
     */
    getMediaType(mime_type) {
      return getMediaFieldType(mime_type).type;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    getFieldType: getFieldType,

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isSimple(field) {
      return 'simple_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isLink(field) {
      return 'link_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isImage(field) {
      return 'image_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isPhoto(field) {
      return 'photo_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/media.js@3.8 
     */
    isMedia(value) {
      if (value && typeof  value === 'object' && value.constructor === Object) return !!value.mime_type;
      return false;
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    isVue(field) {
      return 'vue_field' === getFieldType(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8 
     */
    sanitizeFieldValue(value) {
      return (Array.isArray(value) && !value.length) ? '' : value;
    },

  },

  breforeCreate() {
    this.state = _defaultState(this.state);
  },

  /**
   * @fires addinput
   * @fires changeinput
   */
  created() {
    this.state = _defaultState(this.state);

    console.log(
      '[ ' + this.state.name + ' ]',
      this.state.input.type,
      this.type,
      'g3w-input' === this._legacy,
      this,
    );

    /** @TODO make it a required `$props` instead? */
    if (!this.feature) {
      this.feature = {};
    }

    /** @TODO make it a required `$props` instead? */
    if(!this.field) {
      this.field = this.state;
    }

    if ('g3w-input' === this._legacy || 'read' === this.mode || ['layer_positions', 'datetime', 'range_slider'].includes(this.state.type)) {
      return;
    }

    this.service = this.getInputService();

    this.$emit('addinput', this.state);

    /**
     * When input value has a default value option emit
     * `changeinput` event without check validation.
     * 
     * @example in this case if we start a validation, it
     *          will fail because default value is a string
     *          while input is interger:
     * 
     * ```
     * {
     *  "name": "id",
     *   "type": "integer",
     *   "label": "id",
     *   "editable": false,
     *   "validate": {
     *       "required": true,
     *       "unique": true
     *   },
     *   "pk": true,
     *   "default": "nextval('g3wsuite.zone_id_seq'::regclass)",
     *   "input": {
     *       "type": "text",
     *       "options": {}
     *   }
     * }
     * 
     * ```
     */
    if (this.state.value_from_default_value) {
      this.$emit('changeinput', this.state);
    }

  },

  beforeDestroy() {
    if (this.layer) {
      GUI.getComponent('map').getService().getMap().removeLayer(this.layer);
    }
  },

  /**
   * @fires removeinput remove input to form (in case for example tab visibility condition)
   * 
   * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
   */
   destroyed() {
    this.$emit('removeinput', this.state);
  }

};

/**
 * BACKCOMP
 */
function _alias(vm, props) {
  return {
    functional: true,
    render(h, { data, children }) {
      return h( vm, { ...data, props: { ...data.props, ...props } }, children);
    },
  };
}

vm.components['text_field']                = vm;
vm.components['vue_field']                 = _alias(vm, { _legacy: "g3w-vuefield" });

vm.components['link_field']                = _alias(InputMedia, { _type: 'media',   _legacy: "g3w-field", mode: 'read' });
vm.components['media_field']               = _alias(InputMedia, { _type: 'media',   _legacy: "g3w-field", mode: 'read' });
vm.components['image_field']               = _alias(InputMedia, { _type: 'image',   _legacy: "g3w-field", mode: 'read' });
vm.components['gallery_field']             = _alias(InputMedia, { _type: 'gallery', _legacy: "g3w-field", mode: 'read' });
vm.components['geo_field']                 = _alias(InputGeo,   { _type: 'geo',     _legacy: "g3w-field", mode: 'read' });

vm.components['simple_field']              = vm.components['text_field'];
vm.components['photo_field']               = vm.components['image_field'];
vm.components['g3w_link']                  = vm.components['link_field']; // see: components/QueryResultsTableAttributeFieldValue.vue@3.8
vm.components['g3w_vue']                   = vm.components['vue_field'];  // see: components/QueryResultsTableAttributeFieldValue.vue@3.8

vm.components['select_autocomplete_input'] = vm.components['select_input'];
vm.components['string_input']              = vm.components['text_input'];
vm.components['slider_input']              = vm.components['range_input'];
vm.components['range_slider_input']        = vm.components['range_input']; 

fieldsservice.getType                      = vm.methods.getType;
fieldsservice.isVue                        = vm.methods.isVue;
fieldsservice.isPhoto                      = vm.methods.isPhoto;
fieldsservice.isLink                       = vm.methods.isLink;
fieldsservice.isSimple                     = vm.methods.isSimple;
fieldsservice.isImage                      = vm.methods.isImage;

export default vm;
</script>

<style scoped>
  .control-label {
    text-align: left !important;
    padding-top: 0 !important;
    margin-bottom: 3px;
  }
  .field {
    background-color: transparent !important;
    padding-top: 3px;
    padding-bottom: 3px;
    display: flex;
    align-items: center;
  }
  .value {
    position: relative;
  }
  .field div {
    padding-left: 3px;
    padding-right: 3px;
  }
  .field_value {
    padding-left: 0 !important;
  }
  .field_text_table {
    background-color: transparent !important;
  }
  .field_text_table .field_label {
    font-weight: bold;
  }
  .field_link {
    max-width: 100%;
  }
  .show-hide-geo {
    color: #3C8DBC;
    cursor: pointer;
    font-size: 1.2em;
  }
</style>