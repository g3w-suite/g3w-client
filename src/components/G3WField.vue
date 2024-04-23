<!--
  @file    Base input component
  
  @example see: src/fields/text.vue
  
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

<fragment>

  <!--
    Internal recursion.

    @example <g3w-field _type="text" />
  -->
  <component
    v-if    = "(type in $options.components) && _isRecursion"
    :is     = "type"
    v-bind = "{ ...$attrs, ...$props }"
  />

  <!--
    Field mode (READ)

    ORIGINAL SOURCE: src/components/Field.vue@3.8

    @example

      <g3w-field mode="read" :state>
        <template #field-label> ... </template>
        <template #field-body> ... </template>
        ...
      </g3w-field>

    @since 3.9.0
  -->
  <fragment v-else-if="'read' == mode">

    <slot
      name   = "default"
      v-bind = "{ mode, state }"
    >

      <div
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
          />
        </div>

      </div>

    </slot>
  </fragment>

  <!--
    Input mode (EDIT)

    ORIGINAL SOURCE: src/components/InputBase.vue@3.8

    @example

      <g3w-field mode="input" :state>
        <template #input-label> ... </template>
        <template #input-body> ... </template>
        ...
      </g3w-field>

    @since 3.7.0
  -->

  <fragment v-else-if="'input' == mode && state.visible">

    <slot
      name   = "default"
      v-bind = "{ mode, state }"
    >

      <div class="form-group">

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

</fragment>


</template>

<script>
import { Fragment }                            from 'vue-fragment';
import ApplicationState                        from 'store/application-state';
import CatalogLayersStoresRegistry             from 'store/catalog-layers';
import ProjectsRegistry                        from 'store/projects';
import MapLayersStoresRegistry                 from 'store/map-layers';
import ApplicationService                      from 'services/application';
import GUI                                     from 'services/gui';
import { getFieldType }                        from 'utils/getFieldType';
import { getMediaFieldType }                   from 'utils/getMediaFieldType';
import { truefnc }                             from 'utils';
import { toRawType }                           from 'utils/toRawType';
import { convertQGISDateTimeFormatToMoment }   from 'utils/convertQGISDateTimeFormatToMoment';
import { getQueryLayersPromisesByCoordinates } from 'utils/getQueryLayersPromisesByCoordinates';

const PickFeatureInteraction                  = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction              = require('g3w-ol/interactions/pickcoordinatesinteraction');
const { t }                                   = require('core/i18n/i18n.service');

const deprecate                               = require('util-deprecate');

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
    deprecate,
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
 * @since 3.10.0
 * @param value
 * @return {boolean}
 * @private
 */
function _isBigint(value) {
  return !Number.isNaN(1 * value) && (1 * value) <=  Number.MAX_SAFE_INTEGER;
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

const vm = {

  /** @since 3.9.0 */
  name: 'g3w-field',

  props: {

    state: {
      /**
       * @see https://v3-migration.vuejs.org/breaking-changes/props-default-this.html
       */
      default() {
        this.state        = _defaultState(this.state);
        this.state.__mode = this.mode || 'read';
        return this.state;
      },
    },

    /**
     * @since 3.9.0
     * 
     * ref: `g3wsdk.gui.vue.Inputs.*`
     * ref: `g3wsdk.gui.vue.Fields`
     */
    mode: {
      default: 'read',
    },

    /**
     * @since 3.9.0
     */
    _type: {
      type: String,
      default: "",
    },

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
     * @NB please don't add anything else here,
     *     make use of `src/fields/index.js`
     *     for future fields and backcomps
     */

  },

  computed: {

    /**
     * Whether to stop recursion for inner fields (eg. src/fields/text.vue)
     * 
     * @since 3.9.0
     */
    _isRecursion() {
      return !!(
        this.$parent &&
        this.$parent.$parent &&
        this.$parent.$parent.$options &&
        'g3w-field' !== this.$parent.$parent.$options.name
      );
    },

    /**
     * ORIGINAL SOURCE: src/components/InputG3W.vue@3.8
     * 
     * @since 3.9.0
     */
    type() {

      // $props override
      if (this._type) {
        return this._type;
      }

      // read mode --> (field)
      if ('read' === this.mode ) {
        return this.getType(this.state);
      }

      // edit mode --> (input)
      if ('input' === this.mode && 'child' !== this.state.type) {
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
        this.getInputService().setErrorMessage();
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
      service.validate();

      this.$emit('changeinput', this.state);

      // emit to <child #slot="input-body"> from parent <g3w-field> 
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
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.9.1
     * 
     * @param bool
     */
     setLoading(bool) {
      this.state.input.options.loading.state = bool ? 'loading' : 'ready';
    },

    /**
     * Factory method
     * 
     * @since 3.9.0
     */
    createInputService(type, options = {}) {

      /**
       * BACKOMP (v3.x)
       */
      if ('select_autocomplete' === type) {
        type = 'select';
      }

      /**
       * BACKOMP (v3.x)
       * 
       * ORIGINAL SOURCE: src/app/gui/inputs/checkbox/service.js@3.8
       */
      if ('check' === type) {
        const value              = options.state.input.options.values.find(value => false === value.checked);
        options.validatorOptions = { values: options.state.input.options.values.map(value => value) };
        options.state.value      = (null === options.state.value && !options.state.forceNull) ? value.value : options.state.value;
      }

      /**
       * BACKOMP (v3.x)
       * 
       * ORIGINAL SOURCE: src/app/gui/inputs/range/service.js@3.8
       */
      if ('range' === type) {
        const { min, max }       = options.state.input.options.values[0];
        options.state.info       = `[MIN: ${min} - MAX: ${max}]`;
        options.validatorOptions = { min: 1 * min, max: 1 * max };
      }

      /**
       * BACKOMP (v3.x)
       * 
       * ORIGINAL SOURCE: src/app/gui/inputs/slider/service.js@3.8
       */
      if ('slider' === type) {
        const { min, max }       = options.state.input.option;
        options.state.info       = `[MIN: ${min} - MAX: ${max}]`;
        options.validatorOptions = { min: 1 * min, max: 1 * max };
      }

      /**
       * Base class
       *
       * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
       */
      // const service = new Service(options);

       /** state of input */
      //  this.state = options.state || {};

      // // type of input
      // if (this.state.validate.required) {
      //   this.setValue(this.state.value);
      // }

      // initial value of input (based on value or default options value)
      this.setDefault(this.state.value);
      this.setEmpty(this.state.value);

      // input validator (default = true)
      this.setValidator({
        options: (options.validatorOptions || this.state.input.options || {}),
        validate: truefnc,
      });

      this.setErrorMessage();

      /**
       * Input Validators
       * 
       * ORIGINAL SOURCE: src/app/core/utils/validators.js@3.8
       */
      const vOptions = (options.validatorOptions || (options.state && options.state.input && options.state.input.options) || {});
      this.setValidator({
        options: vOptions,
        validate: ({
          'range':          _isValueInRange.bind(vOptions.min, vOptions.max),
          'slider':         _isValueInRange.bind(vOptions.min, vOptions.max),
          'datetimepicker': _isDateTime,
          'checkbox':       _isCheckBox.bind(vOptions.values),
          'integer':        _isInteger,
          'bigint':         _isBigint,
          'float':          _isFloat,
        })[options.state && options.state.type] || truefnc,
      });

      /**
       * BACKOMP (v3.x)
       * 
       * ORIGINAL SOURCE: src/app/gui/inputs/slider/service.js@3.8
       */
       if ('slider' === type) {
        /** @override */
        this.validate = () => {
          this.state.value          = 1 * this.state.value;
          this.state.validate.valid = this.state.value >= this.state.input.options.min || this.state.value <= this.state.input.options.max;
        };
      }

      /**
       * BACKOMP (v3.x)
       * 
       * ORIGINAL SOURCE: src/app/gui/inputs/datetimepicker/service.js@3.8
       */
      if ('datetimepicker' === type) {
        this.setValidatorOptions({});
      }

      /**
       * BACKOMP (v3.x)
       * 
       * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
       */
       if ('picklayer' === type) {
        this.pick_type   = options.pick_type || 'wms';
        this.ispicked    = false;
        this.fields      = options.fields || [options.value];
        this.layerId     = options.layer_id;
        this.mapService  = GUI.getService('map');
        this.interaction = 'map' === this.pick_type
          ? new PickFeatureInteraction({ layers: [this.mapService.getLayerById(this.layerId)] })
          : new PickCoordinatesInteraction();
      }

      /**
       * BACKOMP (v3.x)
       * 
       * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
       */
      if ('lonlat' === type) {
        this.coordinatebutton             = undefined;
        this.mapService                   = GUI.getComponent('map').getService();
        this.mapEpsg                      = this.mapService.getCrs();
        this.mapControlToggleEventHandler = this.mapControlToggleEventHandler.bind(this);
        this.onMapClick                   = this.onMapClick.bind(this);
        this.map                          = this.mapService.getMap();
        this.outputEpsg                   = options.state.epsg || this.mapEpsg;
        /** @override */
        this.validate = () => {
          this.state.values.lon     = _clamp(this.state.values.lon, -180, 180);
          this.state.values.lat     = _clamp(this.state.values.lon, -90, 90);
          this.state.validate.valid = !Number.isNaN(1 * this.state.values.lon);
        };
      }

      return this;

    },

    /**
     * @since 3.9.0
     */
    getInputService() {
      if (!this.service) {
        this.service = this.createInputService(this.state.input.type, { state: this.state });

        this.$watch(() => ApplicationState.language, async () => {
          if (this.state.visible) {
            this.state.visible = false;
            this.service.setErrorMessage();
            await this.$nextTick();
            this.state.visible = true;
          }

        });
        if (this.state.editable && this.state.validate.required) {
          this.service.validate();
        }
      }
      return this.service;
    },

    /**
     * Add a new field type to Fields
     * 
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8
     * ORIGINAL SOURCE: src/gui/fields/fieldsservice.js@3.8
     * 
     * @param type
     * @param field
     * 
     * @since 3.9.0
     */
    _addFieldComponent({ type, field }) {
      vm.components[type] = field;
    },

    /**
     * Remove field from Fields list
     * 
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8
     * ORIGINAL SOURCE: src/gui/fields/fieldsservice.js@3.8
     * 
     * @param type
     * 
     * @since 3.9.0
     */
     _removeFieldComponent(type) {
      delete vm.components[type];
    },

    /**
     * Change type of field (example to set vue type)
     * 
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8
     * ORIGINAL SOURCE: src/gui/fields/fieldsservice.js@3.8
     * 
     * @param layerId
     * @param field
     * 
     * @since 3.9.0
     */
    _changeConfigFieldType({layerId, field={}}) {
      CatalogLayersStoresRegistry.getLayerById(layerId).changeConfigFieldType(field);
    },

    /**
     * Reset origin type
     * 
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8
     * ORIGINAL SOURCE: src/gui/fields/fieldsservice.js@3.8
     * 
     * @param layerId
     * @param field
     * 
     * @since 3.9.0
     */
    _resetConfigFieldType({layerId, field={}}) {
      CatalogLayersStoresRegistry.getLayerById(layerId).resetConfigField(field);
    },

    /**
     * ORIGINAL SOURCE: src/mixins/fields.js@3.8
     * ORIGINAL SOURCE: src/gui/fields/fieldsservice.js@3.8
     */
     getFieldService() {
      return {
        add:                   vm.methods._addFieldComponent,
        remove:                vm.methods._removeFieldComponent,
        changeConfigFieldType: vm.methods._changeConfigFieldType,
        resetConfigFieldType:  vm.methods._resetConfigFieldType,
        getType:               vm.methods.getType,
        isVue:                 vm.methods.isVue,
        isPhoto:               vm.methods.isPhoto,
        isLink:                vm.methods.isLink,
        isSimple:              vm.methods.isSimple,
        isImage:               vm.methods.isImage,
      };
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

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/datetimepicker/service.js@3.8
     * 
     * @since 3.9.0
     */
    getLocale() {
      const applicationConfig = ApplicationService.getConfig();
      return applicationConfig.user.i18n ? applicationConfig.user.i18n : 'en';
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    getState() {
      return this.state;
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    getValue() {
      return this.state.value;
    },

    /**
     * @since 3.9.0 
     */
    _setValue(val) {
      this.state.value = val;
    },

    /**
     * @since 3.9.0 
     */
    setInfo(message) {
      this.state.info = message;
    },

    /**
     * Initial value of input (based on value or default options value)
     * 
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @param value
     *
     * @returns {void}
     * 
     * @since 3.9.0
     */
    setDefault(value) {
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

    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    addValueToValues(value) {
      this.state.input.options.values.unshift(value)
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    _getValidatorType() {
      return this.state.type;
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    setState(state={}) {
      this.state = _.isObject(state) ? state : {};
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    getValidator() {
      return this._validator;
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    setValidator(validator) {
      this._validator = validator;
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    setEmpty() {
      this.state.validate.empty = (
        !(Array.isArray(this.state.value) && this.state.value.length > 0) &&
        _.isEmpty(_.trim(this.state.value))
      );
    },

    /**
     * Check state's value validity
     */
    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
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
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
    setErrorMessage() {
      const {
        mutually,
        mutually_valid,
        max_field,
        min_field,
        unique,
        exclude_values,
        required,
      } = this.state.validate || {};

      if (this.state.validate.error) {
        this.state.validate.message = t(this.state.validate.error);
        return;
      }

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
    },

    /**
     * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
     * 
     * @since 3.9.0
     */
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
    },

  },

  beforeCreate() {
    // "async" components defintion.
    this.$options.components = vm.components = Object.assign(this.$options.components, require('fields').default);

    // this.state = _defaultState(this.state);
  },

  /**
   * @fires addinput
   * @fires changeinput
   */
  created() {
    this.state = _defaultState(this.state);

    // TODO: avoid mutating prop
    this.mode         = this.state.__mode ? this.state.__mode : this.mode;
    this.state.__mode = this.mode || 'read';

    console.log(
      '[ ' + this.state.name + ' ]',
      this.mode,
      this.state.input.type,
      this.type,
      'legacy' === this._type,
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

    if (
      'legacy' === this._type ||
      'read' === this.mode ||
      ['layer_positions', 'datetime', 'range_slider'].includes(this.state.type)) {
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
     *  "type": "integer",
     *  "label": "id",
     *  "editable": false,
     *  "validate": {
     *     "required": true,
     *     "unique": true
     *  },
     *  "pk": true,
     *  "default": "nextval('g3wsuite.zone_id_seq'::regclass)",
     *  "input": {
     *     "type": "text",
     *     "options": {}
     *  }
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
 * BACKCOMP (v3.x)
 */

/** @deprecated since 3.9.0. Use "<g3w-field>" instead. **/
Vue.component('layerspositions',    _alias(vm, { mode: 'input', _type: "layer_positions_input" }));

/** @deprecated since 3.9.0. Use "<g3w-field>" instead. **/
Vue.component('datetime',           _alias(vm, { mode: 'input', _type: "datetime_input" } ));

/** @deprecated since 3.9.0. Use "<g3w-field>" instead. **/
Vue.component('range',              _alias(vm, { mode: 'input', _type: "range_slider_input" }));

/** @deprecated since 3.9.0. Use "<g3w-field>" instead. **/
Vue.component('g3w-image',          _alias(vm, { mode: 'read', _type: "image_field" }));

/** @deprecated since 3.9.0. Use "<g3w-field>" instead. **/
Vue.component('g3w-images-gallery', _alias(vm, { mode: 'read', _type: "gallery_field" }));

/** @deprecated since 3.9.0. Use "<g3w-field>" instead. **/
Vue.component('g3w-geospatial',     _alias(vm, { mode: 'read', _type: "geo_field" }));

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/checkbox/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use components/InputCheckbox.vue instead.
 */
vm.methods.convertCheckedToValue = deprecate('[G3W-FIELD] checkbox service is deprecated', function(checked) {
  checked          = _hasValue(checked) ? checked : false;
  this.state.value = this.state.input.options.values.find(value => checked === value.checked).value;
  return this.state.value;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/checkbox/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputCheckbox.vue` instead.
 */
vm.methods.convertValueToChecked = deprecate('[G3W-FIELD] checkbox service is deprecated', function() {
  if (!_hasValue(this.state.value)) {
    return false;
  }
  let option = this.state.input.options.values.find(value => this.state.value === value.value);
  if (undefined === option) {
    option           = this.state.input.options.values.find(value => false === value.checked);
    this.state.value = option.value;
  }
  return option.checked;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/range/service.js@3.8
 * 
 * @deprecated since 3.9.0
 */
vm.methods.isValueInRange = deprecate('[G3W-FIELD] range service is deprecated', function(value, min, max) {
  return value <= max && value >= min;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/datetimepicker/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use core/utils::convertQGISDateTimeFormatToMoment(datetimeformat) instead.
 */
vm.methods.convertQGISDateTimeFormatToMoment = deprecate('[G3W-FIELD] datetimepicker service is deprecated', convertQGISDateTimeFormatToMoment);

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/datetimepicker/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputDateTimePicker.vue` instead.
 */
vm.methods.setValidatorOptions = deprecate('[G3W-FIELD] datetimepicker service is deprecated', function(options) {
  this.validatorOptions = options;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputSelect.vue` instead.
 */
vm.methods._getLayerById = deprecate('[G3W-FIELD] select service is deprecated', function(layer_id) {
  return CatalogLayersStoresRegistry.getLayerById(layer_id);
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputSelect.vue` instead.
 */
vm.methods.addValue = deprecate('[G3W-FIELD] select service is deprecated', function(value) {
  this.state.input.options.values.push(value);
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputSelect.vue` instead.
 */
vm.methods.getKeyByValue = deprecate('[G3W-FIELD] select service is deprecated', function({search}={}) {
  const options = this.state.input.options;
  const { value, key } = options;
  this
    .getData({ key: value, value: key, search })
    .then(arrayValues => {
      const [_value] = arrayValues;
      this.addValue({ key: _value.$value, value: _value.text })
    })
    .catch(console.warn);
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputSelect.vue` instead.
 */
vm.methods.getData = deprecate('[G3W-FIELD] select service is deprecated', function({
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
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/sliderrange/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputRange.vue` instead.
 */
vm.methods.changeInfoMessage = deprecate('[G3W-FIELD] sliderrange service is deprecated', function() {
  this.state.info =  `[MIN: ${this.state.input.options.min} - MAX: ${this.state.input.options.max}]`;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputPickLayer.vue` instead.
 */
vm.methods.isPicked = deprecate('[G3W-FIELD] picklayer service is deprecated', function() {
  return this.ispicked;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputPickLayer.vue` instead.
 */
vm.methods.escKeyUpHandler = deprecate('[G3W-FIELD] picklayer service is deprecated', function({ keyCode, data: { owner } }) {
  if (27 === keyCode) {
    owner.unpick();
  }
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputPickLayer.vue` instead.
 */
vm.methods.unbindEscKeyUp = deprecate('[G3W-FIELD] picklayer service is deprecated', function() {
  $(document).unbind('keyup', this.escKeyUpHandler);
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputPickLayer.vue` instead.
 */
vm.methods.bindEscKeyUp = deprecate('[G3W-FIELD] picklayer service is deprecated', function() {
  $(document).on('keyup', { owner: this }, this.escKeyUpHandler); // bind interrupt event.
});

  /**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputPickLayer.vue` instead.
 */
vm.methods.pick = deprecate('[G3W-FIELD] picklayer service is deprecated', function() {
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
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputPickLayer.vue` instead.
 */
vm.methods.unpick = deprecate('[G3W-FIELD] picklayer service is deprecated', function() {
  this.mapService.removeInteraction(this.interaction);
  GUI.setModal(true);
  this.unbindEscKeyUp();
  this.ispicked = false;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
 * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputPickLayer.vue` and `src/components/InputLonLat.vue` instead.
 */
vm.methods.clear = deprecate('[G3W-FIELD] picklayer/lonlat services are deprecated', function() {
  // lonlat
  if (this.coordinatebutton) {
    this.stopToGetCoordinates();
    return;
  }
  // picklayer
  if (this.isPicked()) {
    this.unpick();
  }
  this.mapService = this.interaction = this.field = null;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputLonLat.vue` instead.
 */
vm.methods.setCoordinateButtonReactiveObject = deprecate('[G3W-FIELD] lonlat service is deprecated', function(button) {
  this.coordinatebutton = button;
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputLonLat.vue` instead.
 */
vm.methods.toggleGetCoordinate = deprecate('[G3W-FIELD] lonlat service is deprecated', function() {
  if (this.coordinatebutton.active) {
    this.stopToGetCoordinates();
  } else {
    this.startToGetCoordinates();
  }
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputLonLat.vue` instead.
 */
vm.methods.startToGetCoordinates = deprecate('[G3W-FIELD] lonlat service is deprecated', function() {
  this.coordinatebutton.active = true;

  this.mapService.deactiveMapControls();
  this.mapService.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
  this.eventMapKey = this.map.on('click', this.onMapClick)
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
 * 
 * @deprecated since 3.9.0. Use `src/components/InputLonLat.vue` instead.
 */
vm.methods.stopToGetCoordinates = deprecate('[G3W-FIELD] lonlat service is deprecated', function() {
  this.coordinatebutton.active = false;

  ol.Observable.unByKey(this.eventMapKey);
  this.mapService.off('mapcontrol:toggled', this.mapControlToggleEventHandler)
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
 * 
 * @since 3.9.0
 * 
 * @deprecated since 3.9.0. Use `src/components/InputLonLat.vue` instead.
 */
vm.methods.mapControlToggleEventHandler = deprecate('[G3W-FIELD] lonlat service is deprecated', function(e) {
  if (
    e.target.isToggled() &&
    e.target.isClickMap() &&
    this.coordinatebutton.active
  ) {
    this.toggleGetCoordinate();
  }
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
 * 
 * @since 3.9.0
 * 
 * @deprecated since 3.9.0. Use `src/components/InputLonLat.vue` instead.
 */
vm.methods.onMapClick = deprecate('[G3W-FIELD] lonlat service is deprecated', function(evt) {
  evt.originalEvent.stopPropagation();
  evt.preventDefault();
  const coord = this.mapEpsg !== this.outputEpsg
    ? ol.proj.transform(evt.coordinate, this.mapEpsg, this.outputEpsg)
    : evt.coordinate;
  this.state.value      = [coord];
  this.state.values.lon = coord[0];
  this.state.values.lat = coord[1];
});

/**
 * BACKCOMP (v3.x)
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
 * 
 * @since 3.9.0
 * 
 * @deprecated since 3.9.0. Use `setDefault(value)` instead.
 */
vm.methods.setValue = deprecate('[G3W-FIELD] setValue method is deprecated', vm.methods.setDefault);

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