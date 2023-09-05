/**
 * @file
 * 
 * @version 2.0 ADD SOURCE FROM: src/gui/inputs/input.js@3.8
 * @version 1.0 ORIGINAL SOURCE: src/mixins/base-input.js@3.8
 */

import ApplicationState                       from 'store/application-state';
import CatalogLayersStoresRegistry            from 'store/catalog-layers';
import MapLayersStoresRegistry                from 'store/map-layers';

import ApplicationService                     from 'services/application';
import GUI                                    from 'services/gui';

const { convertQGISDateTimeFormatToMoment }   = require('core/utils/utils');
const { getQueryLayersPromisesByCoordinates } = require('core/utils/geo');

const Validators                              = require('core/utils/validators');

const PickFeatureInteraction                  = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction              = require('g3w-ol/interactions/pickcoordinatesinteraction');

const { toRawType }                           = require('core/utils/utils');
const { t }                                   = require('core/i18n/i18n.service');


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

    // input validator
    this._validator = Validators.get(this.state.type, (options.validatorOptions || this.state.input.options) || {});

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

    const { options }   = this.state.input;
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
    this.state.validate.empty = !(
      (Array.isArray(this.state.value) &&
      this.state.value.length
      ) ||
      !_.isEmpty(_.trim(this.state.value))
    );
  }

  /**
   * Check state's value validity
   */
  validate() {
    /**
     * @TODO uncomment and double check code below (conditionals refactor)
     */

    // const is_empty       = this.state.validate.empty;
    // const is_required    = this.state.validate.required;
    // const is_numeric     = ['integer', 'float'].includes(this.state.input.type);
    // const has_number     = is_numeric && +this.state.value >= 0;
    // const exclude_values = this.state.validate.exclude_values && this.state.validate.exclude_values.size;
    // const is_excluded    = exclude_values && this.state.validate.exclude_values.has(this.state.value);

    // // check unique
    // if (is_empty) {
    //   this.state.validate.unique = true;
    // }

    // // check empty
    // if (is_empty || !has_number) {
    //   this.state.validate.empty  = true;
    //   this.state.value           = null;
    // }

    // // invalid
    // if (is_required && (is_empty || (!has_number || is_excluded))) {
    //   this.state.validate.valid = false;
    // }

    // // valid
    // if (!is_empty && (!is_excluded || (!is_required && !has_number))) {
    //   this.state.validate.valid = true;
    // }

    // // validate
    // if ((!is_required && is_empty) || (!is_empty && (!exclude_values || has_number))) {
    //   this.state.validate.valid = this._validator.validate(this.state.value);
    // }

    // return this.state.validate.valid;

    if (this.state.validate.empty) {
      this.state.validate.empty  = true;
      this.state.value           = null;
      this.state.validate.unique = true;
      // check if require or check validation
      this.state.validate.valid = this.state.validate.required ? false : this._validator.validate(this.state.value);
    } else {
      if ('integer' === this.state.input.type || 'float' === this.state.input.type) {
        if (+this.state.value < 0) {
          this.state.value          = null;
          this.state.validate.empty = true;
          this.state.validate.valid = !this.state.validate.required;
        } else {
          this.state.validate.valid = this._validator.validate(this.state.value);
        }
      }
      if (this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
        this.state.validate.valid = !this.state.validate.exclude_values.has(this.state.value);
      } else {
        this.state.validate.valid = this._validator.validate(this.state.value);
      }
    }
    return this.state.validate.valid;
  }

  setErrorMessage(input) {
    if (input.validate.mutually && !input.validate.mutually_valid) {
      this.state.validate.message =  `${t("sdk.form.inputs.input_validation_mutually_exclusive")} ( ${input.validate.mutually.join(',')} )`;
    } else if (input.validate.max_field) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_max_field")} (${input.validate.max_field})`;
    } else if (input.validate.min_field) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_min_field")} (${input.validate.min_field})`;
    } else if (input.validate.unique && input.validate.exclude_values && input.validate.exclude_values.size) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_exclude_values")}`;
    } else if (input.validate.required) {
      this.state.validate.message = this.state.info || `${t("sdk.form.inputs.input_validation_error")} ( ${t("sdk.form.inputs." + input.type)} )` + (this.state.info ? ` <div><b>${this.state.info}</b></div>` : '');
    } else {
      this.state.validate.message = this.state.info;
    }
  }

  setUpdate() {
    const { value, _value } = this.state;

    const is_media = 'media' === this.state.input.type && 'Object' !== toRawType(value) && 'Object' !== toRawType(_value); 
    const is_date  = 'datetimepicker' === this.state.input.type

    if (is_media) {
      this.state.update = value.value != _value.value;
    } else if (is_date) {
      //check
      this.state.update = (null !== value ? value.toUpperCase() : value) != (_value ? _value.toUpperCase(): _value);
    } else {
      this.state.update = value != _value;
    }
  }

};

/******************************************************* */

/**
 * Factory object 
 * 
 * ORIGINAL SOURCE: src/app/gui/inputs/services.js@3.8
 */
const InputsServices = {
  'text':           Service,
  'textarea':       Service,
  'texthtml':       Service,
  'string':         Service,
  'color':          Service,

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/integer/service.js@3.8
   */
  'integer': class extends Service {},

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/float/service.js@3.8
   */
  'float': class extends Service {},

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/radio/service.js@3.8
   */
  'radio': class extends Service {},

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/unique/service.js@3.8
   */
  'unique': class extends Service {},

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/media/service.js@3.8
   */
  'media': class extends Service {},
  

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
      this.setValidator(Validators.get('range', { min: 1 * min, max: 1 * max }));
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

      this.setValidator(Validators.get('range', { min: 1 * min, max: 1 * max }));
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

/**
 * BACKCOMP
 */
InputsServices['select_autocomplete'] = InputsServices['select'];

export default {

  props: ['state'],

  computed: {

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
      return (false === this.state.validate.valid);
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
      return this.state.input.options.loading ? this.state.input.options.loading.state : null;
    }

  },

  watch: {

    'notvalid'(notvalid) {
      if (notvalid) {
       this.service.setErrorMessage(this.state);
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

      this.service.setEmpty();
      this.service.setUpdate();

      // validate input if is required or need to be unique
      if (this.state.validate.required || this.state.validate.unique) {
        this.service.validate();
      }

      this.$emit('changeinput', this.state);

      // emit to <child #slot="body"> from parent <g3w-input> 
      if (this.$slots && this.$slots.body && this.$slots.body[0].context && this.$slots.body[0].context.$emit) {
        this.$slots.body[0].context.$emit('changeinput', this.state);
      }
    },

    /**
     * ORIGINAL SOURCE: src/mixins/base-input.js@3.8
     */
    isVisible() {},

    /**
     * Factory method
     * 
     * @since 3.9.0
     */
    createInputService(type, options) {
      console.assert(undefined !== InputsServices[type], 'Uknwon InputsService type: ', type);
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

  },

  /**
   * @fires addinput
   * @fires changeinput
   */
  created() {
    console.log(
      '[ ' + this.state.name + ' ]',
      this.state.input.type,
      this.__isInput,
      this.__isForm,
      this.$scopedSlots,
      this.$slots,
      // this
    );

    if (this.__isInput && 'child' !== this.state.type && this.state.input && !this.state.input.options) {
      this.state.input.options = {};
    }

    if (this.__isInput || this.__isForm) {
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

  /**
   * @fires removeinput remove input to form (in case for example tab visibility condition)
   */
  destroyed() {
    this.$emit('removeinput', this.state);
  }

};