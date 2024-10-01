/**
 * ORIGINAL SOURCE: src/app/gui/inputs folder
 */
import ApplicationState                       from 'store/application';
import GUI                                    from 'services/gui';
import DataRouterService                      from 'services/data';
import { toRawType }                          from 'utils/toRawType';
import { convertQGISDateTimeFormatToMoment }  from 'utils/convertQGISDateTimeFormatToMoment';
import { getCatalogLayerById }                from 'utils/getCatalogLayerById';
import PickFeatureInteraction                 from 'map/interactions/pickfeatureinteraction';
import PickCoordinatesInteraction             from 'map/interactions/pickcoordinatesinteraction';

//Inputs
import BaseInputComponent                     from 'components/InputBase.vue'
import * as uniqueVueComponentOptions         from 'components/InputUnique.vue';
import * as texthtmlVueComponentOptions       from 'components/InputTextHtml.vue';
import * as textVueComponentOptions           from 'components/InputText.vue';
import * as textareaVueComponentOptions       from 'components/InputTextArea.vue';
import * as integerVueComponentOptions        from 'components/InputInteger.vue';
import * as floatVueComponentOptions          from 'components/InputFloat.vue';
import * as radioVueComponentOptions          from 'components/InputRadio.vue';
import * as checkboxVueComponentOptions       from 'components/InputCheckbox.vue';
import * as rangeVueComponentOptions          from 'components/InputRange.vue';
import * as datetimepickerVueComponentOptions from 'components/InputDateTimePicker.vue';
import * as selectVueComponentOptions         from 'components/InputSelect.vue';
import * as mediaVueComponentOptions          from 'components/InputMedia.vue';
import * as picklayerVueComponentOptions      from 'components/InputPickLayer.vue';
import * as colorVueComponentOptions          from 'components/InputColor.vue';
import * as sliderangeVueComponentOptions     from 'components/InputSliderRange.vue';
import * as lonlatVueComponentOptions         from 'components/InputLonLat.vue';

import {
  baseInputMixin as BaseInputMixin,
  widgetMixins,
  resizeMixin,
  selectMixin,
  select2Mixin,
}                                             from 'mixins';

import { t }                                  from 'g3w-i18n';

const Validators = {

  validators: {

    float(options = {}) {
      this.options = options;
      this.validate = function(value) {
        return !Number.isNaN(Number(1 * value));
      }
    },

    /**
     * @since v3.10.0
     * @param options
     */
    bigint(options = {}) {
      this.options = options;
      this.validate = function(value) {
        value = 1 * value;
        return !Number.isNaN(value) ? value <= Number.MAX_SAFE_INTEGER : false;
      }
    },

    integer(options = {}) {
      this.options = options;
      this.validate = function(value) {
        const integer = 1 * value;
        return !Number.isNaN(integer) ? Number.isSafeInteger(integer) && (integer <= 2147483647) : false;
      }
    },

    checkbox(options = {}) {
      this.options = options;
      this.validate = function(value) {
        return (this.options.values || []).includes(value);
      }
    },

    datetimepicker(options = {}) {
      this.options = options;
      this.validate = function(value, options) {
        return moment(value, options.fielddatetimeformat, true).isValid();
      }
    },

    /**
     * @since 3.10.0
     * @param options
     */
    char(options) {
      this.options = options;
      this.validate = function(value) {
        return value && 1 === `${value}`.length;
      }
    },

    /**
     * @since 3.10.0
     * @param options
     */
    varchar(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    text(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    string(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    radio(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    default(options = {}) {
      this.options  = options;
      this.validate = () => true;
    },

    range(options = {}) {
      const { min, max } = options;
      this.validate = function(value) {
        value = 1 * value;
        return value >= min && value <= max;
      }
    },

  },

  get(type, options = {}) {
    return new (this.validators[type] || this.validators.default)(options);
  }

};

export class Service {

  constructor(opts = {}) {
    // set state of input
    this.state = opts.state || {};
    // type of input
    //this.state.validate.required && this.setValue(this.state.value);
    /*
    * set starting value of input based on value or default value on options
     */
    this.setValue(this.state.value);
    this.setEmpty(this.state.value);
    const type = this.state.type;
    const validatorOptions = (opts.validatorOptions || this.state.input.options) || {};
    // useful for the validator to validate input
    this._validator = Validators.get(type, validatorOptions);
    this.setErrorMessage();
  }

  getState() {
    return this.state;
  };

  getValue() {
    return this.state.value;
  };

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
      undefined !== default_value &&
      null !== default_value
    );

    // check if we can state.check get_default_value from input.options.default is set
    if (get_default_value && undefined === options.default_expression) {
      this.state.value = default_value;
    }

    this.state.value_from_default_value = get_default_value;

  };

  addValueToValues(value) {
    this.state.input.options.values.unshift(value)
  };

  _getValidatorType() {
    return this.state.type;
  };

  setState(state = {}) {
    this.state = 'Object' === toRawType(state) ? state : {};
  };

// return validator
  getValidator() {
    return this._validator;
  };

  setValidator(validator) {
    this._validator = validator;
  };

  /**
   * set input empty '', null, undefined or []
   */
  setEmpty() {
    this.state.validate.empty = (
      null === this.state.value //value is null
      || !((Array.isArray(this.state.value) && this.state.value.length > 0)  //or empty array
        || !(_.isEmpty(`${this.state.value}`.trim()))) // or empty string
    );
  };

// the general method to check the value of the state is valid or not
  validate() {
    if (this.state.validate.empty) {
      this.state.value           = null; //force to null
      // check if you require or check validation
      this.state.validate.valid  = !this.state.validate.required;
    } else {
      if (['integer', 'float', 'bigint'].includes(this.state.input.type)) {
        if (+this.state.value < 0) {
          this.state.value               = null;
          this.state.validate.empty      = true;
          this.state.validate.valid      = !this.state.validate.required;
        } else {
          this.state.validate.valid = this._validator.validate(this.state.value);
        }
      }
      //check exclude_values state.validate.unique (QGIS field property [x] Enforce unique constraint)
      if (this.state.validate.unique && this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
        //need to convert this.state.value to string because editing store exclude_values items as string
        this.state.validate.valid = !this.state.validate.exclude_values.has(`${this.state.value}`);
      } else {
        this.state.validate.valid = this._validator.validate(this.state.value);
      }
    }

    return this.state.validate.valid;
  };

  setErrorMessage() {
    //in vase of
    if (this.state.validate.error) {
      this.state.validate.message = t(this.state.validate.error);
      return;
    }
    let message;
    if (this.state.validate.mutually && !this.state.validate.mutually_valid) {
      this.state.validate.message =  `${t("sdk.form.inputs.input_validation_mutually_exclusive")} ( ${this.state.validate.mutually.join(',')} )`;
    } else if (this.state.validate.max_field) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_max_field")} (${this.state.validate.max_field})`;
    } else if (this.state.validate.min_field) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_min_field")} (${this.state.validate.min_field})`;
    } else if (('unique' === this.state.input.type || this.state.validate.unique) && this.state.validate.exclude_values && this.state.validate.exclude_values.size) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_exclude_values")}`;
    } else if (this.state.validate.required) {
      message = `${t("sdk.form.inputs.input_validation_error")} ( ${t("sdk.form.inputs." + this.state.type)} )`;
      if (this.state.info) {
        message = `${message}
                 <div>
                  <b>${this.state.info}</b>
                 </div>         
      `;
      }
      this.state.validate.message = this.state.info || message;
    } else {
      this.state.validate.message = this.state.info;
    }
  };
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
  };
}

export const Input = {
  props:      {
    state: {
      type: Object,
      require: true,
    }
  },
  mixins:     [ BaseInputMixin ],
  components: {
    'baseinput': BaseInputComponent
  },
  methods: {
    getService(type) {
      return InputServices[type];
    }
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

export const InputServices = {
  'text':           Service,
  'textarea':       Service,
  'texthtml':       Service,
  'integer':        Service,
  'string':         Service,
  'float':          Service,
  'radio':          Service,
  'media':          Service,
  'unique':         Service,
  'color':          Service,
  'check':          class CheckBoxService extends Service {
    constructor(opts = {}) {
      const value = opts.state.input.options.values.find(v => false === v.checked);
      opts.validatorOptions = {
        values: opts.state.input.options.values.map(v => v)
      };
      if (null === opts.state.value && !opts.state.forceNull) {
        opts.state.value = value.value
      }
      super(opts);
    }

    convertCheckedToValue(checked) {
      checked          = [null, undefined].includes(checked) ? false : checked;
      this.state.value = (this.state.input.options.values.find(v => checked === v.checked) || {}).value;

      return this.state.value;
    };

    convertValueToChecked() {
      const valueToCheck = this.state.value;
      if ([null, undefined].includes(valueToCheck)) { return false }
      let option = this.state.input.options.values.find(value => valueToCheck == value.value);
      if (undefined === option) {
        option = this.state.input.options.values.find(value => false === value.checked);
        this.state.value = option.value;
      }
      return option.checked;
    };
  },
  'range':          class RangeService extends Service {
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
    };
  },
  'datetimepicker': class DateTimePickerService extends Service {
    constructor(opts = {}) {
      super(opts);

      this.validatorOptions = {};
    }

    getLocale() {
      return window.initConfig.user.i18n ? window.initConfig.user.i18n : 'en';
    };

    convertQGISDateTimeFormatToMoment(datetimeformat) {
      return convertQGISDateTimeFormatToMoment(datetimeformat);
    };

    setValidatorOptions(opts = {}) {
      this.validatorOptions = opts;
    };
  },
  'select':         class SelectService extends Service {
    constructor(opts = {}) {
      super(opts);
      this.layer = null;
    }

    _getLayerById(layer_id) {
      return getCatalogLayerById(layer_id);
    };

    addValue(value) {
      this.state.input.options.values.push(value);
    };

    getKeyByValue({ search } = {}) {
      const { value, key } = this.state.input.options;
      return new Promise((resolve, reject) => {
        this.getData({
          key:   value,
          value: key,
          search
        }).then(arrayValues => {
          const [_value] = arrayValues;
          const {$value : key, text: value} = _value;
          this.addValue({
            key,
            value
          })
          resolve(this.state.input.options.values);
        }).catch(e => {
          console.warn(e);
          reject(e);
        });
      })
    };

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
      const search_value = `${key}|${search}`.trim();
      return new Promise((resolve, reject) => {
        if (!this._layer) { this._layer = this._getLayerById(layer_id) }

        this._layer.getDataTable({
          suggest:  search_value,
          ordering: key
        }).then(response => {
          const values = response.features.map(f =>({
            text:   f.properties[key],
            id:     f.properties[value],
            $value: f.properties[value]
          }))
          resolve(values);
        }).fail(e => { console.warn(e); reject(e) });
      });
    };
  },
  'picklayer':      class PickLayerService {
    constructor(opts = {}) {
      this.pick_type   = opts.pick_type || 'wms';
      this.ispicked    = false;
      this.fields      = opts.fields || [opts.value];
      this.layerId     = opts.layer_id;
      this.mapService  = GUI.getService('map');
      this.interaction = 'map' === this.pick_type  ? new PickFeatureInteraction({
        layers: [this.mapService.getLayerById(this.layerId)]
      }) : new PickCoordinatesInteraction();
    }

    /**
     *
     * @return {boolean|*}
     */
    isPicked() {
      return this.ispicked;
    };

    /**
     *  bind interrupt event
     */
    escKeyUpHandler({ keyCode, data : { owner } }) {
      if (27 === keyCode) { owner.unpick() }
    };

    unbindEscKeyUp() {
      $(document).unbind('keyup', this.escKeyUpHandler);
    };

    bindEscKeyUp() {
      $(document).on('keyup', { owner: this }, this.escKeyUpHandler);
    };

    /**
     *
     * @return {Promise<unknown>}
     */
    pick() {
      return new Promise((resolve, reject) => {
        this.bindEscKeyUp();
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
        this.mapService.addInteraction(this.interaction);

        this.interaction.once('picked', e => {
          if ('map' === this.pick_type) {
            const feature = e.feature;
            afterPick(feature);
          } else if ('wms' === this.pick_type) {
            const layer = GUI.getService('map').getProjectLayer(this.layerId);
            if (layer) {
              DataRouterService.getQueryLayersPromisesByCoordinates(
                [layer],
                {
                  map:           this.mapService.getMap(),
                  feature_count: 1,
                  coordinates:   e.coordinate
                })
                .then(response => {
                  const { data = [] } = response[0];
                  const feature = data.length && data[0].features[0] || null;
                  afterPick(feature);
                })
                .fail(e => console.warn(e) )
            }
          }
        })
      })
    };

    /**
     *
     */
    unpick() {
      this.mapService.removeInteraction(this.interaction);
      GUI.setModal(true);
      this.unbindEscKeyUp();
      this.ispicked = false;
    };

    /**
     *
     */
    clear() {
      if (this.isPicked()) { this.unpick() }
      this.mapService = this.interaction = this.field = null;
    };
  },
  'slider':         class SliderRangeService extends Service {
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
    };
  },
  'lonlat':         class LonLatService extends Service {
    constructor(opts = {}) {
      super(opts);
      this.coordinatebutton;
      this.mapService = GUI.getService('map');
      this.mapEpsg = this.mapService.getCrs();

      this.mapControlToggleEventHandler = evt => {
        if (evt.target.isToggled() && evt.target.isClickMap()) {
          this.coordinatebutton.active && this.toggleGetCoordinate();
        }
      };
      this.map        = this.mapService.getMap();
      this.outputEpsg = this.state.epsg || this.mapEpsg;
      //Store event map key
      this.eventMapKey;
    }

    setCoordinateButtonReactiveObject(coordinatebutton) {
      this.coordinatebutton = coordinatebutton;
    };

    validate() {
      if (this.state.values.lon < -180) { this.state.values.lon = -180}
      else if (this.state.values.lon > 180) { this.state.values.lon = 180 }
      if (this.state.values.lat < -90) { this.state.values.lon = -90 }
      else if (this.state.values.lat > 90) { this.state.values.lon = 90 }

      this.state.validate.valid = !Number.isNaN(1*this.state.values.lon);
    };

    toggleGetCoordinate() {
      this.coordinatebutton.active = !this.coordinatebutton.active;
      this.coordinatebutton.active ? this.startToGetCoordinates() : this.stopToGetCoordinates();
    };

    startToGetCoordinates() {
      this.mapService.deactiveMapControls();
      this.mapService.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
      this.eventMapKey = this.map.on('click', evt =>{
        evt.originalEvent.stopPropagation();
        evt.preventDefault();
        const coordinate = this.mapEpsg !== this.outputEpsg ? ol.proj.transform(evt.coordinate, this.mapEpsg, this.outputEpsg) : evt.coordinate;
        this.state.value      = [coordinate];
        const [lon, lat]      = coordinate;
        this.state.values.lon = lon;
        this.state.values.lat = lat;
      })
    };

    stopToGetCoordinates() {
      ol.Observable.unByKey(this.eventMapKey);
      this.mapService.off('mapcontrol:toggled', this.mapControlToggleEventHandler)
    };

    clear() {
      this.stopToGetCoordinates();
    };
  },
};

//add select_autocomplete
InputServices['select_autocomplete'] = InputServices.select;

export const InputsComponents =  {
  'text_input':                Vue.extend({ ...textVueComponentOptions,           mixins: [ Input ]}),
  'texthtml_input':            Vue.extend({ ...texthtmlVueComponentOptions,       mixins: [ Input ] }),
  'textarea_input':            Vue.extend({ ...textareaVueComponentOptions,       mixins: [ Input ] }),
  'integer_input':             Vue.extend({ ...integerVueComponentOptions,        mixins: [ Input ] }),
  'string_input':              Vue.extend({ ...textVueComponentOptions,           mixins: [ Input ] }), //temporary
  'float_input':               Vue.extend({ ...floatVueComponentOptions,          mixins: [ Input ] }),
  'radio_input':               Vue.extend({ ...radioVueComponentOptions,          mixins: [ Input ] }),
  'check_input':               Vue.extend({ ...checkboxVueComponentOptions,       mixins: [ Input, widgetMixins ]}),
  'range_input':               Vue.extend({ ...rangeVueComponentOptions,          mixins: [ Input ] }),
  'datetimepicker_input':      Vue.extend({ ...datetimepickerVueComponentOptions, mixins: [ Input, resizeMixin ] }),
  'unique_input':              Vue.extend({ ...uniqueVueComponentOptions,         mixins: [ Input, selectMixin ] }),
  'select_input':              Vue.extend({ ...selectVueComponentOptions,         mixins: [ Input, selectMixin, select2Mixin ] }),
  'media_input':               Vue.extend({ ...mediaVueComponentOptions,          mixins: [ Input ]}),
  'select_autocomplete_input': Vue.extend({ ...selectVueComponentOptions,         mixins: [ Input, selectMixin, select2Mixin ] }),
  'picklayer_input':           Vue.extend({ ...picklayerVueComponentOptions,      mixins: [ Input ] }),
  'color_input':               Vue.extend({ ...colorVueComponentOptions,          mixins: [ Input ] }),
  'slider_input':              Vue.extend({ ...sliderangeVueComponentOptions,     mixins: [ Input ] }),
  'lonlat_input':              Vue.extend({ ...lonlatVueComponentOptions,         mixins: [ Input ] }),
}