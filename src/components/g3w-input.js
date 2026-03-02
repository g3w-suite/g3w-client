/**
 * @file
 * 
 * ORIGINAL SOURCE: src/gui/inputs/input.js@v4.0.0
 * 
 */
import ApplicationState                     from 'g3w-state';
import BaseInputComponent                   from 'components/InputBase.vue'
import { baseInputMixin as BaseInputMixin } from 'mixins';
import { QUERY_POINT_TOLERANCE }             from 'g3w-constants';
import { gettext as _ }                      from 'g3w-i18n';
import GUI                                   from 'g3w-app';
import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';
import { getCatalogLayerById }               from 'utils/getCatalogLayerById';
import { toRawType }                         from 'utils/toRawType';
import PickFeatureInteraction                from 'interactions/pick-feature';
import PickCoordinatesInteraction            from 'interactions/pick-coordinates';


const Validators = {

  validators: {

    float: (options = {}) => ({
      options,
      validate(value) {
        value = 1 * value;
        return !Number.isNaN(parseFloat(1 * value))
      }
    }),

    /**
     * @since v3.10.0
     * @param options
     */
    bigint: (options = {}) => ({
      options,
      validate(value) {
        value = 1 * value;
        return !Number.isNaN(value) ? Number.isSafeInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER : false;
      }
    }),

    integer: (options = {}) => ({
      options,
      validate(value) {
        value = 1 * value;
        return !Number.isNaN(value) ? Math.abs(value) <= 2147483647 : false;
      }
    }),

    checkbox: (options = {}) => ({
      options,
      validate: (value) => (this.options.values || []).includes(value)
    }),

    datetimepicker: (options = {}) => ({
      options,
      validate: (value, options) => moment(value, options.fielddatetimeformat, true).isValid()
    }),

    /**
     * @since 3.10.0
     * @param options
     */
    char: (options) => ({
      options,
      validate: (value) => value && 1 === `${value}`.length
    }),

    /**
     * @since 3.10.0
     * @param options
     */
    varchar: (options = {}) => ({ options, validate: () => true }),
    text:    (options = {}) => ({ options, validate: () => true }),
    string:  (options = {}) => ({ options, validate: () => true }),
    radio:   (options = {}) => ({ options, validate: () => true }),
    default: (options = {}) => ({ options, validate: () => true }),

    range: (options = {}) => ({
      options,
      validate(value) {
        value = 1 * value;
        return value >= options.min && value <= options.max;
      }
    }),

  },

  get(type, options = {}) {
    return (this.validators[type] || this.validators.default)(options);
  }

};

/**
* ORIGINAL SOURCE: src/app/gui/inputs/service.js@v4.0.0 
*/
export class Service {
  
  constructor(options = {}) {
    // set state of input
    this.state = options.state || {};
    // type of input
    //this.state.validate.required && this.setValue(this.state.value);
    /*
    * set starting value of input based on value or default value on options
     */
    this.setValue(this.state.value);
    this.setEmpty(this.state.value);
    const type = this.state.type;
    const validatorOptions = (options.validatorOptions || this.state.input.options) || {};
    // useful for the validator to validate input
    this._validator = Validators.get(type, validatorOptions);
    this.setErrorMessage();
  }

  getState() {
    return this.state;
  }

  getValue() {
    return this.state.value;
  }

  /**
   * @param value
   *
   * @returns {void}
   */
  setValue(value) {
    if (![null, undefined].includes(value)) { return }

    const { options }   = this.state.input;
    let default_value   = options.default;

    /** @TODO (maybe need to removed in v3.9.0) double check G3W-ADMIN server configuration. */
    if (Array.isArray(options)) {
      if (options[0].default) { default_value = options[0].default }
      else if (Array.isArray(options.values) && options.values.length > 0) {
        default_value = options.values[0] && (options.values[0].value || options.values[0]);
      }
    }

    // check if the default value is set
    const get_default_value = (
      this.state.get_default_value && // ref: core/layers/tablelayer.js::getFieldsWithValues()
      ![null, undefined].includes(default_value) 
    );

    // check if we can state.check get_default_value from input.options.default is set
    if (get_default_value && undefined === options.default_expression) {
      this.state.value = default_value;
    }

    this.state.value_from_default_value = get_default_value;

  }

  addValueToValues(value) {
    this.state.input.options.values.unshift(value);
  }

  _getValidatorType() {
    return this.state.type;
  }

  setState(state = {}) {
    this.state = 'Object' === toRawType(state) ? state : {};
  }

  // return validator
  getValidator() {
    return this._validator;
  }

  setValidator(validator) {
    this._validator = validator;
  }

  /**
   * set input empty '', null, undefined or []
   */
  setEmpty() {
    this.state.validate.empty = (null === this.state.value || '' === `${this.state.value}`.trim());
  }

  // the general method to check the value of the state is valid or not
  validate() {
    if (this.state.validate.empty) {
      this.state.value           = null; //force to null
      // check if you require or check validation
      this.state.validate.valid  = !this.state.validate.required;
    } else {
      //check exclude_values state.validate.unique (QGIS field property [x] Enforce unique constraint)
      if (this.state.validate.unique && this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
        //need to convert this.state.value to string because editing store exclude_values items as string
        this.state.validate.valid = !this.state.validate.exclude_values.has(`${this.state.value}`);
      } else {
        this.state.validate.valid = this._validator.validate(this.state.value);
      }
    }

    return this.state.validate.valid;
  }

  setErrorMessage() {
    //in vase of
    if (this.state.validate.error) {
      this.state.validate.message = _(this.state.validate.error);
      return;
    }
    let message;
    if (this.state.validate.mutually && !this.state.validate.mutually_valid) {
      this.state.validate.message =  `${_("sdk.form.inputs.input_validation_mutually_exclusive")} ( ${this.state.validate.mutually.join(',')} )`;
    } else if (this.state.validate.max_field) {
      this.state.validate.message = `${_("sdk.form.inputs.input_validation_max_field")} (${this.state.validate.max_field})`;
    } else if (this.state.validate.min_field) {
      this.state.validate.message = `${_("sdk.form.inputs.input_validation_min_field")} (${this.state.validate.min_field})`;
    } else if (('unique' === this.state.input.type || this.state.validate.unique) && this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
      this.state.validate.message = `${_("sdk.form.inputs.input_validation_exclude_values")}`;
    } else if (this.state.validate.required) {
      message = `${_("sdk.form.inputs.input_validation_error")} ( ${_("sdk.form.inputs." + this.state.type)} )`;
      if (this.state.info) {
        message = `${message}
                 <div>
                  <b>${this.state.info}</b>
                 </div>         
      `;
      }
      this.state.validate.message = this.state.info || message;
    } else {
      //@since 3.11.0
      // in case of state.validate.valid false and not required need to show a right message (info or type)
      this.state.validate.message = this.state.info || `${_("sdk.form.inputs.input_validation_error_type")} ( ${_("sdk.form.inputs." + this.state.type)} )`;
    }
  }

  /**
   * Method to set update
   */
  setUpdate() {
    const {value, _value} = this.state;
    if ('media' === this.state.input.type && 'Object' !== toRawType(value) && 'Object' !== toRawType(_value)) {
      this.state.update = value.value != _value.value;
    } else if ("datetimepicker" === this.state.input.type) {
      //check
      this.state.update = (null !== value ? value.toUpperCase(): value) != (_value ? _value.toUpperCase(): _value);
    } else {
      this.state.update = value != _value;
    }
  }
}

/**
* ORIGINAL SOURCE: src/app/gui/inputs/checkbox/service.js@v4.0.0 
*/
export class CheckBoxService extends Service {
  constructor(opts = {}) {
    opts.validatorOptions = {
      values: opts.state.input.options.values.map(v => v)
    };
    super(opts);
  }
};

/**
* ORIGINAL SOURCE: src/app/gui/inputs/range/service.js@v4.0.0 
*/
export class RangeService extends Service {
  constructor(opts = {}) {
    const { min, max } = opts.state.input.options.values[0];
    opts.state.info = `[MIN: ${min} - MAX: ${max}]`;
    super(opts);

    this.setValidator({
      validate(value) {
        value = 1 * value;
        return value >= 1*min && value <= 1*max;
      }
    });
  }
  isValueInRange(value, min, max) {
    return value <= max && value >= min;
  }
};

/**
* ORIGINAL SOURCE: src/app/gui/inputs/datetimepicker/service.js@v4.0.0 
*/
export class DateTimePickerService extends Service {
  constructor(opts = {}) {
    super(opts);

    this.validatorOptions = {};
  }

  getLocale() {
    return window.initConfig.user.i18n ? window.initConfig.user.i18n : 'en';
  }

  convertQGISDateTimeFormatToMoment(datetimeformat) {
    return convertQGISDateTimeFormatToMoment(datetimeformat);
  }

  setValidatorOptions(opts = {}) {
    this.validatorOptions = opts;
  }
};

/**
* ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@v4.0.0 
*/
export class LonLatService extends Service {
  constructor(opts = {}) {
    super(opts);
    this.coordinatebutton;
    this.mapEpsg = GUI.getCrs();

    this.mapControlToggleEventHandler = evt => {
      if (evt.target.isToggled() && evt.target.isClickMap()) {
        this.coordinatebutton.active && this.toggleGetCoordinate();
      }
    };
    this.map        = GUI.getMap();
    this.outputEpsg = this.state.epsg || this.mapEpsg;
    //Store event map key
    this.eventMapKey;
  }

  setCoordinateButtonReactiveObject(coordinatebutton) {
    this.coordinatebutton = coordinatebutton;
  }

  validate() {
    if (this.state.values.lon < -180) { this.state.values.lon = -180}
    else if (this.state.values.lon > 180) { this.state.values.lon = 180 }
    if (this.state.values.lat < -90) { this.state.values.lon = -90 }
    else if (this.state.values.lat > 90) { this.state.values.lon = 90 }

    this.state.validate.valid = !Number.isNaN(1*this.state.values.lon);
  }

  toggleGetCoordinate() {
    this.coordinatebutton.active = !this.coordinatebutton.active;
    this.coordinatebutton.active ? this.startToGetCoordinates() : this.stopToGetCoordinates();
  }

  startToGetCoordinates() {
    GUI.deactiveMapControls();
    GUI.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
    this.eventMapKey = this.map.on('click', evt =>{
      evt.originalEvent.stopPropagation();
      evt.preventDefault();
      const coordinate = this.mapEpsg !== this.outputEpsg ? ol.proj.transform(evt.coordinate, this.mapEpsg, this.outputEpsg) : evt.coordinate;
      this.state.value      = [coordinate];
      const [lon, lat]      = coordinate;
      this.state.values.lon = lon;
      this.state.values.lat = lat;
    })
  }

  stopToGetCoordinates() {
    ol.Observable.unByKey(this.eventMapKey);
    GUI.off('mapcontrol:toggled', this.mapControlToggleEventHandler)
  }

  clear() {
    this.stopToGetCoordinates();
  }
};

/**
* ORIGINAL SOURCE: src/app/gui/inputs/select/service.js@v4.0.0 
*/
export class SelectService extends Service {
  constructor(opts = {}) {
    super(opts);
    this.layer = null;
  }

  _getLayerById(layer_id) {
    return getCatalogLayerById(layer_id);
  }

  addValue(value) {
    this.state.input.options.values.push(value);
  }

  sortValues() {
    const { orderbyvalue } = this.state.input.options;
    this.state.input.options.values.sort((a, b) => {
      const val1 = a[orderbyvalue ? 'value' : 'key'];
      const val2 = b[orderbyvalue ? 'value' : 'key'];
      if ( val1 < val2 ) {
        return -1;
      }
      if ( val1 > val2) {
        return 1;
      }
      return 0;
    });
  }

  getKeyByValue({ search } = {}) {
    const { value, key,  } = this.state.input.options;
    return new Promise((resolve, reject) => {
      this.getData({
        key,
        value,
        search
      }).then(values => {
        values.forEach(({ $value : key, text: value }) => {
          this.addValue({ key,value })
        })
        this.sortValues();
        resolve(this.state.input.options.values);
      }).catch(e => { console.warn(e); reject(e); });
    })
  }

  /**
   *
   * @param layer_id
   * @param key
   * @param value
   * @param search
   * @return {Promise<unknown>}
   */
  getData({
    layer_id = this.state.input.options.layer_id,
    key      = this.state.input.options.key,
    value    = this.state.input.options.value,
    search,
  } = {}) {

    return new Promise((resolve, reject) => {
      if (!this._layer) { this._layer = this._getLayerById(layer_id) }
      this._layer.getDataTable({
        [ Array.isArray(search) ? 'field' : 'suggest' ] : Array.isArray(search) //take in account multiselect value
          ? search
            .map((_, j) => [].concat(search[j]).map(v => `${key}|eq|${encodeURIComponent(v)}`).join(`|null,`))
            .join('|OR,') || ''
          : `${key}|${search}`.trim(),
        ordering: this.state.input.options.orderbyvalue ? value : key, //@since 3.11.0
      }).then(response => {
        const values = response.features.map(f =>({
          text:   f.properties[key],
          id:     f.properties[value],
          $value: f.properties[value]
        }))
        resolve(values);
      }).catch(e => { console.warn(e); reject(e) });
    });
  }
};

/**
* ORIGINAL SOURCE: src/app/gui/inputs/sliderrange/service.js@v4.0.0 
*/
export class SliderRangeService extends Service {
  constructor(opts = {}) {
    const { state } = opts;
    opts.state.info = `[MIN: ${state.input.options.min} - MAX: ${state.input.options.max}]`;
    super(opts);
    this.setValidator({
      validate(value) {
        value = 1 * value;
        return value >= (1 * opts.state.input.options.min) && value <= (1 * opts.state.input.options.max);
      }
    });
  }

  validate() {
    this.state.value          = 1*this.state.value;
    this.state.validate.valid = this.state.value >= this.state.input.options.min || this.state.value <= this.state.input.options.max;
  }

  changeInfoMessage() {
    this.state.info =  `[MIN: ${this.state.input.options.min} - MAX: ${this.state.input.options.max}]`;
  }
}

/**
 * ORIGINAL SOURCE: src/app/gui/inputs/picklayer/service.js@v4.0.0 
 */
export class PickLayerService {
  constructor(opts = {}) {
    this.pick_type   = opts.pick_type || 'wms';
    this.ispicked    = false;
    this.fields      = opts.fields || [opts.value];
    this.layerId     = opts.layer_id;
    //'map' referred to a v4.0.x where getEditingLayer was a method of Layer.  
    this.interaction = 'map' === this.pick_type  ? new PickFeatureInteraction({
      layers: [GUI.getLayerById(this.layerId)]
    }) : new PickCoordinatesInteraction();
    //@since 4.0.1 set id. It used on editing plugin
    this.interaction.set('id', 'picklayer');
    this.escKeyUpHandler = this.escKeyUpHandler.bind(this);
  }

  isPicked() {
    return this.ispicked;
  }

  escKeyUpHandler(event) {
    if ('Escape' === event.key) {
      this.unpick();
    }
  }

  pick() {
    return new Promise((resolve, reject) => {
      document.addEventListener('keyup', this.escKeyUpHandler);
      const values = {};
      this.ispicked = true;
      const afterPick = feature => {
        if (feature) {
          const attributes = feature.getProperties();
          //filter eventually null or undefined field
          this.fields.filter(f => f).forEach(field => values[field] = attributes[field]);
          resolve(values);
        } else {
          reject();
        }
        this.ispicked = false;
        this.unpick();
      };
      GUI.setModal(false);
      GUI.addInteraction(this.interaction);

      this.interaction.once('picked', async e => {
        try {
          let feature = e.feature; 
          const layer = 'wms' === this.pick_type && GUI.getProjectLayer(this.layerId);
          if (layer) {
            const response = await layer.query({
              feature_count:         1,
              coordinates:           e.coordinate,
              query_point_tolerance: QUERY_POINT_TOLERANCE,
              mapProjection:         GUI.getMap().getView().getProjection(),
              size:                  GUI.getMap().getSize(),
              resolution:            GUI.getMap().getView().getResolution()
            });
            feature = response?.data?.at?.(0)?.features?.at(0) ?? null;
          }
          afterPick(feature);
        } catch (e) {
          console.warn(e);
        }
      })
    })
  }

  unpick() {
    GUI.removeInteraction(this.interaction);
    GUI.setModal(true);
    document.removeEventListener(this.escKeyUpHandler);
    this.ispicked = false;
  }

  clear() {
    if (this.isPicked()) {
      this.unpick();
    }
    this.interaction = this.field = null;
  }
};

/**
* ORIGINAL SOURCE: src/app/gui/inputs/services.js@v4.0.0 
*/
const InputServices = {
  'text':                Service,
  'textarea':            Service,
  'texthtml':            Service,
  'integer':             Service,
  'string':              Service,
  'float':               Service,
  'radio':               Service,
  'check':               CheckBoxService,
  'range':               RangeService,
  'datetimepicker':      DateTimePickerService,
  'unique':              Service,
  'select':              SelectService,
  'media':               Service,
  'select_autocomplete': SelectService,
  'color':               Service,
  'slider':              SliderRangeService,
  'lonlat':              LonLatService,
  'picklayer':           PickLayerService,
};

export default {
  props:      ['state'],
  mixins:     [BaseInputMixin],
  components: {
    'baseinput': BaseInputComponent
  },
  watch: {
    'notvalid'(notvalid) {
      if (notvalid) { this.service.setErrorMessage() }
    },
    'state.value'() {
      if (undefined !== this.state.input.options.default_expression) {
        // need to postpone state.value watch parent that use mixin
        setTimeout(() => this.change());
      }
    }
  },
  created() {
    this.service = new InputServices[this.state.input.type]({ state: this.state });

    this.$watch(
      () => ApplicationState.language,
      async () => {
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

    this.$emit('addinput', this.state);
    /**
     * in case of input value is fill with default value option we need to emit changeinput event
     * without check validation. Example:
     * {
        "name": "id",
        "type": "integer",
        "label": "id",
        "editable": false,
        "validate": {
            "required": true,
            "unique": true
        },
        "pk": true,
        "default": "nextval('g3wsuite.zone_id_seq'::regclass)",
        "input": {
            "type": "text",
            "options": {}
        }
      }
     in this case if we start a validation, it fail because default value is a string while input is interger
     */
    if (this.state.value_from_default_value) { this.$emit('changeinput', this.state) }
  },
  destroyed() {
    // emit remove input to form (in case for example tab visibility condition)
    this.$emit('removeinput', this.state);
  }
};
