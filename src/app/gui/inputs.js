/**
 * @file 
 * @deprecated components and services listed in here will undergo further rewrites after v3.8,
 *             therefore using this file within third-party plugins is strongly discouraged.
 */

import CatalogLayersStoresRegistry            from 'store/catalog-layers';
import MapLayersStoresRegistry                from 'store/map-layers';
import ApplicationService                     from 'services/application';
import GUI                                    from 'services/gui';

import * as CheckboxVueComponentOptions       from 'components/InputCheckbox.vue';
import * as ColorVueComponentOptions          from 'components/InputColor.vue';
import * as DateTimePickerVueComponentOptions from 'components/InputDateTimePicker.vue';
import * as FloatVueComponentOptions          from 'components/InputFloat.vue';
import * as IntegerVueComponentOptions        from 'components/InputInteger.vue';
import * as LonLatVueComponentOptions         from 'components/InputLonLat.vue';
import * as MediaVueComponentOptions          from 'components/InputMedia.vue';
import * as PickLayerVueComponentOptions      from 'components/InputPickLayer.vue';
import * as RadioVueComponentOptions          from 'components/InputRadio.vue';
import * as RangeVueComponentOptions          from 'components/InputRange.vue';
import * as SelectVueComponentOptions         from 'components/InputSelect.vue';
import * as SliderRangeVueComponentOptions    from 'components/InputSliderRange.vue';
import * as TableVueComponentOptions          from 'components/InputTable.vue';
import * as TextVueComponentOptions           from 'components/InputText.vue';
import * as TextAreaVueComponentOptions       from 'components/InputTextArea.vue';
import * as TextHtmlvueComponentOptions       from 'components/InputTextHtml.vue';
import * as UniqueVueComponentOptions         from 'components/InputUnique.vue';

const { convertQGISDateTimeFormatToMoment, toRawType }     = require('core/utils/utils');
const { getQueryLayersPromisesByCoordinates }              = require('core/utils/geo');
const Validators                                           = require('core/utils/validators');

const PickFeatureInteraction                               = require('g3w-ol/interactions/pickfeatureinteraction');
const PickCoordinatesInteraction                           = require('g3w-ol/interactions/pickcoordinatesinteraction');

const { t }                                                = require('core/i18n/i18n.service');


/******************************************************* */

/**
 * ORIGINAL SOURCE: src/app/gui/inputs/service.js@3.8
 */
class Service {

  constructor(options = {}) {
    // state of input
    this.state = options.state || {};

    // type of input
    //this.state.validate.required && this.setValue(this.state.value);

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
   * @param value
   *
   * @returns {void}
   */
  setValue(value) {
    if (null !== value && "undefined" !== typeof value) {
      return;
    }

    const {options}   = this.state.input;
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
      undefined !== default_value &&
      null !== default_value
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
    this.state.validate.empty = !((Array.isArray(this.state.value) && this.state.value.length) || !_.isEmpty(_.trim(this.state.value)));
  }

  // general method to check the value of the state is valid or not
  validate() {
    if (this.state.validate.empty) {
      this.state.validate.empty  = true;
      this.state.value           = null;
      this.state.validate.unique = true;
      // check if require or check validation
      this.state.validate.valid = this.state.validate.required ? false : this._validator.validate(this.state.value);
    } else {
      if (this.state.input.type === 'integer' || this.state.input.type === 'float') {
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
    let message;
    if (input.validate.mutually && !input.validate.mutually_valid) {
      this.state.validate.message =  `${t("sdk.form.inputs.input_validation_mutually_exclusive")} ( ${input.validate.mutually.join(',')} )`;
    } else if (input.validate.max_field) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_max_field")} (${input.validate.max_field})`;
    } else if (input.validate.min_field) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_min_field")} (${input.validate.min_field})`;
    } else if (input.validate.unique && input.validate.exclude_values && input.validate.exclude_values.size) {
      this.state.validate.message = `${t("sdk.form.inputs.input_validation_exclude_values")}`;
    } else if (input.validate.required) {
      message = `${t("sdk.form.inputs.input_validation_error")} ( ${t("sdk.form.inputs." + input.type)} )`;
      if (this.state.info) {
        message = `${message} <div><b>${this.state.info}</b></div>`;
      }
      this.state.validate.message = this.state.info || message;
    } else {
      this.state.validate.message = this.state.info;
    }
  }

  setUpdate() {
    const { value, _value } = this.state;
    if (this.state.input.type === 'media' && toRawType(value) !== 'Object' && toRawType(_value) !== 'Object') {
      this.state.update = value.value != _value.value;
    } else if (this.state.input.type === "datetimepicker") {
      //check
      this.state.update = (null !== value ? value.toUpperCase(): value) != (_value ? _value.toUpperCase(): _value);
    } else {
      this.state.update = value != _value;
    }
  }

}

/******************************************************* */

/**
 * ORIGINAL SOURCE: src/app/gui/inputs/services.js@3.8
 * 
 * @TODO consolidate all these services into their related `src/components/*.vue` files
 */
export const InputsServices = {
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
 
    constructor(options={}) {
      const value = options.state.input.options.values.find(value => value.checked === false);
      options.validatorOptions = { values: options.state.input.options.values.map(value => value) };
      if (options.state.value === null && !options.state.forceNull) {
        options.state.value = value.value;
      }
      super(options);
    }

    convertCheckedToValue(checked) {
      checked = checked === null ||  checked === undefined ? false : checked;
      const option = this.state.input.options.values.find(value => value.checked === checked);
      this.state.value = option.value;
      return this.state.value;
    }

    convertValueToChecked() {
      const valueToCheck = this.state.value;
      if (valueToCheck === null || valueToCheck === undefined) return false;
      let option = this.state.input.options.values.find(value => value.value == valueToCheck);
      if (option === undefined) {
        option = this.state.input.options.values.find(value => value.checked === false);
        this.state.value = option.value;
      }
      return option.checked;
    }
  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/range/service.js@3.8
   */
  'range': class extends Service {

    constructor(options={}) {
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
      const search_value = `${key}|${search}`.trim();
      return new Promise((resolve, reject) => {
        if (!this._layer) this._layer = this._getLayerById(layer_id);
        this._layer
          .getDataTable({
            suggest: search_value,
            ordering: key
          })
          .then(response => {
            const values = [];
            const features = response.features;
            for (let i=0; i < features.length; i++) {
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
  'picklayer': class extends Service {
  
    constructor(options={}) {
      super(options);
      this.pick_type = options.pick_type || 'wms';
      this.ispicked = false;
      this.fields = options.fields || [options.value];
      this.layerId = options.layer_id;
      this.mapService = GUI.getService('map');
      this.interaction = this.pick_type === 'map' ?  new PickFeatureInteraction({
        layers: [this.mapService.getLayerById(this.layerId)]
      }) : new PickCoordinatesInteraction();
    }
  
    isPicked() {
      return this.ispicked;
    }
  
    //bind interrupt event
    escKeyUpHandler({keyCode, data:{owner}}) {
      keyCode === 27 && owner.unpick();
    }
  
    unbindEscKeyUp() {
      $(document).unbind('keyup', this.escKeyUpHandler);
    }
  
    bindEscKeyUp() {
      $(document).on('keyup', {owner: this}, this.escKeyUpHandler);
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
          if (this.pick_type === 'map') {
            afterPick(event.feature);
          } else if (this.pick_type === 'wms') {
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
                const {data=[]} = response[0];
                const feature = data.length && data[0].features[0] || null;
                afterPick(feature);
              })
            }
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
      this.isPicked() && this.unpick();
      this.mapService = this.interaction = this.field = null;
    }
  
  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/sliderrange/service.js@3.8
   */
  'slider': class extends Service {

    constructor(options={}) {
      const { min, max } = options.state.input.option;
      options.state.info = `[MIN: ${min} - MAX: ${max}]`;
      super(options);
      this.setValidator( Validators.get('range', { min: 1 * min, max: 1 * max }));
      this.validate = function() {
        this.state.value = 1 * this.state.value;
        this.state.validate.valid = this.state.value >= this.state.input.options.min || this.state.value <= this.state.input.options.max;
      }
    }

    changeInfoMessage() {
      this.state.info =  `[MIN: ${this.state.input.options.min} - MAX: ${this.state.input.options.max}]`;
    }

  },

  /**
   * ORIGINAL SOURCE: src/app/gui/inputs/lonlat/service.js@3.8
   */
  'lonlat': class extends Service {
  
    constructor(options={}) {
      super(options);

      this.coordinatebutton = undefined;
      this.mapService = GUI.getComponent('map').getService();
      this.mapEpsg    = this.mapService.getCrs();
      this.mapControlToggleEventHandler = evt => {
        if (evt.target.isToggled() && evt.target.isClickMap()) {
          this.coordinatebutton.active && this.toggleGetCoordinate();
        }
      };
      this.map = this.mapService.getMap();
      this.outputEpsg = this.state.epsg || this.mapEpsg;
      this.eventMapKey;
    }
  
    setCoordinateButtonReactiveObject(coordinatebutton) {
      this.coordinatebutton = coordinatebutton;
    }
  
    validate() {
      if (this.state.values.lon < -180)     this.state.values.lon = -180;
      else if (this.state.values.lon > 180) this.state.values.lon = 180;
      if (this.state.values.lat < -90)      this.state.values.lon = -90;
      else if (this.state.values.lat > 90)  this.state.values.lon = 90;
      this.state.validate.valid = !Number.isNaN(1*this.state.values.lon);
    }
  
    toggleGetCoordinate() {
      this.coordinatebutton.active = !this.coordinatebutton.active;
      this.coordinatebutton.active ? this.startToGetCoordinates() : this.stopToGetCoordinates();
    }
  
    startToGetCoordinates() {
      this.mapService.deactiveMapControls();
      this.mapService.on('mapcontrol:toggled', this.mapControlToggleEventHandler);
      this.eventMapKey = this.map.on('click', evt =>{
        evt.originalEvent.stopPropagation();
        evt.preventDefault();
        const coordinate = this.mapEpsg !== this.outputEpsg ? ol.proj.transform(evt.coordinate, this.mapEpsg, this.outputEpsg) : evt.coordinate;
        this.state.value = [coordinate];
        const [lon, lat] = coordinate;
        this.state.values.lon = lon;
        this.state.values.lat = lat;
      })
    }
  
    stopToGetCoordinates() {
      ol.Observable.unByKey(this.eventMapKey);
      this.mapService.off('mapcontrol:toggled', this.mapControlToggleEventHandler)
    }
  
    clear() {
      this.stopToGetCoordinates();
    }
  
  },

};

/**
 * ORIGINAL SOURCE: src/app/gui/inputs/inputs.js@3.8
 * 
 * @TODO find how to get rid of all those `vue.extend` calls
 */
export const InputsComponents = {

  /**
   * ORIGINAL SOURCE: src/gui/inputs/text/vue/text.js@3.8
   */
  'text_input': Vue.extend(TextVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/texthtml/vue/texthtml.js@3.8
   */
  'texthtml_input': Vue.extend(TextHtmlvueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/textarea/vue/textarea.js@3.8
   */
  'textarea_input': Vue.extend(TextAreaVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/integer/vue/integer.js@3.8
   */
  'integer_input': Vue.extend(IntegerVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/float/vue/float.js@3.8
   */
  'float_input': Vue.extend(FloatVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/radio/vue/radio.js@3.8
   */
  'radio_input': Vue.extend(RadioVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/checkbox/vue/checkbox.js@3.8
   */
  'check_input': Vue.extend(CheckboxVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/range/vue/range.js@3.8
   */
  'range_input': Vue.extend(RangeVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/datetimepicker/vue/datetimepicker.js@3.8
   */
  'datetimepicker_input': Vue.extend(DateTimePickerVueComponentOptions),

    /**
   * ORIGINAL SOURCE: src/gui/inputs/unique/vue/unique.js@3.8
   */
  'unique_input': Vue.extend(UniqueVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/select/vue/select.js@3.8
   */
  'select_input': Vue.extend(SelectVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/media/vue/media.js@3.8
   */
  'media_input': Vue.extend(MediaVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/picklayer/vue/picklayer.js@3.8
   */
  'picklayer_input': Vue.extend(PickLayerVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/color/vue/color.js@3.8
   */
  'color_input': Vue.extend(ColorVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/sliderrange/vue/sliderrange.js@3.8
   */
  'slider_input': Vue.extend(SliderRangeVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/lonlat/vue/lonlat.js@3.8
   */
  'lonlat_input': Vue.extend(LonLatVueComponentOptions),

  /**
   * ORIGINAL SOURCE: src/gui/inputs/table/vue/table.js@3.8
   */
  'table_input': Vue.extend(TableVueComponentOptions),

};

/**
 * BACKCOMP
 */
InputsServices['select_autocomplete']         = InputsServices['select'];
InputsComponents['select_autocomplete_input'] = InputsComponents['select_input'];
InputsComponents['string_input']              = InputsComponents['text_input'];