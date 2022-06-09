import ApplicationState from 'core/applicationstate';
import GUI  from 'gui/gui';
import utils from 'core/utils/utils';
import fieldService from 'gui/fields/fieldsservice';
import CatalogLayersStoresRegistry  from 'core/catalog/cataloglayersstoresregistry';
import {Style, Fill, Circle, Stroke} from "ol/style";
import {Vector as VectorLayer} from "ol/layer";
import {Vector as VectorSource} from "ol/source";
import {GeoJSON} from "ol/format";

export const autocompleteMixin = {
  methods: {
    async autocompleteRequest({layerId, field, value}={}){
      let data = [];
      const layer = CatalogLayersStoresRegistry.getLayerById(layerId);
      try {
        data = await layer.getFilterData({
          suggest: `${field}|${value}`,
          unique: field
        })
      } catch(error) {}
      return data.map(value => ({
        id:value,
        text:value
      }))
    }
  }
};

export const fieldsMixin = {
  methods: {
    getFieldService(){
      if (this._fieldsService === undefined)
        this._fieldsService = fieldService;
      return this._fieldsService;
    },
    getFieldType(field) {
      return this.getFieldService().getType(field);
    },
    isSimple(field){
      return this.getFieldService().isSimple(field);
    },
    isLink(field){
      return this.getFieldService().isLink(field);
    },
    isImage(field){
      return this.getFieldService().isImage(field);
    },
    isPhoto(field){
      return this.getFieldService().isPhoto(field);
    },
    isVue(field){
      return this.getFieldService().isVue(field);
    },
    sanitizeFieldValue(value) {
      return (Array.isArray(value) && !value.length) ? '' : value;
    }
  }
};

export const mediaMixin = {
  computed: {
    filename() {
      return this.value ? this.value.split('/').pop() : this.value;
    }
  },
  methods: {
    isMedia(value) {
      if (value && typeof  value === 'object' && value.constructor === Object) return !!value.mime_type;
      return false;
    },
    getMediaType(mime_type) {
      let media = {
        type: null,
        options: {}
      };
      switch(mime_type) {
        case 'image/gif':
        case 'image/png':
        case 'image/jpeg':
        case 'image/bmp':
          media.type = 'image';
          break;
        case 'application/pdf':
          media.type = 'pdf';
          break;
        case 'video/mp4':
        case 'video/ogg':
        case 'video/x-ms-wmv':
        case 'video/x-msvideo':
        case 'video/quicktime':
          media.type = 'video';
          media.options.format = mime_type;
          break;
        case 'application/gzip':
        case 'application/zip':
          media.type = 'zip';
          break;
        case 'application/msword':
        case 'application/vnd.oasis.opendocument.text':
          media.type = 'text';
          break;
        case 'application/vnd.ms-office':
        case 'application/vnd.oasis.opendocument.spreadsheet':
          media.type = 'excel';
          break;
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.oasis.opendocument.presentation':
          media.type = 'ppt';
          break;
        default:
          media.type = 'unknow';
      }
      return media;
    }
  }
};

export const geoMixin = {
  methods: {
    showLayer() {
      this.visible = !this.visible;
      this.layer.setVisible(this.visible);
    }
  },
  created() {
    const data = this.data;
    const mapService = GUI.getComponent('map').getService();
    const mapProjection = mapService.getProjection().getCode();
    let style;
    switch (data.type) {
      case 'Point':
      case 'MultiPoint':
        style = [new Style({
          image: new Circle({
            radius: 6,
            fill: new Fill({
              color: [255,255,255,1.0]
            }),
            stroke: Stroke({
              color: [0,0,0,1.0],
              width: 2
            })
          })
        }),
          new Style({
            image: new Circle({
              radius: 2,
              fill: new Fill({
                color: [255,255,255,1.0]
              }),
              stroke: Stroke({
                color: [0,0,0,1.0],
                width: 2
              })
            })
          })];
        break;
      case 'Line':
      case 'MultiLineString':
      case 'Polygon':
      case 'MultiPolygon':
        style = new Style({
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.3)'
          }),
          stroke: Stroke({
            color: [0,0,0,1.0],
            width: 2
          })
        });
        break;
    }
    this.layer = new VectorLayer({
      source: new VectorSource({
        features: new GeoJSON().readFeatures(data, {
          featureProjection: mapProjection
        })
      }),
      visible: !!this.visible,
      style: style
    });
    mapService.getMap().addLayer(this.layer);
  },
  beforeDestroy() {
    const mapService = GUI.getComponent('map').getService();
    mapService.getMap().removeLayer(this.layer);
  }
};

export const DELAY_TYPE = {
  throttle: utils.throttle,
  debounce: utils.debounce
};

export const resizeMixin = {
  created(){
    const delayWrapper = this.delayType && DELAY_TYPE[this.delayType] || DELAY_TYPE.throttle;
    this.delayResize = this.resize ? delayWrapper(this.resize.bind(this), this.delayTime): null;
    GUI.on('resize', this.delayResize);
  },
  async mounted(){
    await this.$nextTick();
    this.resize && this.resize();
  },
  beforeDestroy(){
    GUI.off('resize', this.delayResize);
    this.delayResize = null;
    this.delayTime = null;
  }
};

export const  select2Mixin = {
  mixins: [resizeMixin],
  methods: {
    setValue(){
      this.select2.val(this.state.value).trigger('change');
    },
    resize() {
      this.select2 && !ApplicationState.ismobile && this.select2.select2('close');
    }
  },
  beforeDestroy() {
    //destroy a select2  dom element
    this.select2 && this.select2.select2('destroy');
    // remove all event
    this.select2.off();
    this.select2 = null;
  }
};

// FormInputsMixins
export const  formInputsMixins = {
  data(){
    return {
      valid: false
    }
  },
  methods: {
    addToValidate(input){
      this.tovalidate.push(input);
    },
    changeInput(input){
      this.isValid(input)
    },
    // Every input send to form it valid value that will change the genaral state of form
    isValid(input) {
      if (input) {
        // check mutually
        if (input.validate.mutually) {
          if (!input.validate.required) {
            if (!input.validate.empty) {
              input.validate._valid = input.validate.valid;
              input.validate.mutually_valid = input.validate.mutually.reduce((previous, inputname) => {
                return previous && this.tovalidate[inputname].validate.empty;
              }, true);
              input.validate.valid = input.validate.mutually_valid && input.validate.valid;
            } else {
              input.value = null;
              input.validate.mutually_valid = true;
              input.validate.valid = true;
              input.validate._valid = true;
              let countNoTEmptyInputName = [];
              for (let i = input.validate.mutually.length; i--;) {
                const inputname = input.validate.mutually[i];
                !this.tovalidate[inputname].validate.empty && countNoTEmptyInputName.push(inputname) ;
              }
              if (countNoTEmptyInputName.length < 2) {
                countNoTEmptyInputName.forEach((inputname) => {
                  this.tovalidate[inputname].validate.mutually_valid = true;
                  this.tovalidate[inputname].validate.valid = true;
                  setTimeout(()=>{
                    this.tovalidate[inputname].validate.valid = this.tovalidate[inputname].validate._valid;
                    this.state.valid = this.state.valid && this.tovalidate[inputname].validate.valid;
                  })
                })
              }
            }
          }
          //check if min_field or max_field is set
        } else if (!input.validate.empty && (input.validate.min_field || input.validate.max_field)) {
          const input_name = input.validate.min_field || input.validate.max_field;
          input.validate.valid = input.validate.min_field ?
            this.tovalidate[input.validate.min_field].validate.empty || 1*input.value > 1*this.tovalidate[input.validate.min_field].value :
            this.tovalidate[input.validate.max_field].validate.empty || 1*input.value < 1*this.tovalidate[input.validate.max_field].value;
          if (input.validate.valid) this.tovalidate[input_name].validate.valid = true
        }
      }
      this.valid = Object.values(this.tovalidate).reduce((previous, input) => {
        return previous && input.validate.valid;
      }, true);
    }
  },
  created(){
    this.tovalidate = [];
  },
  destroyed(){
    this.tovalidate = null;
  }
};

export default  {
  geoMixin,
  fieldsMixin,
  mediaMixin,
  resizeMixin,
  autocompleteMixin,
  select2Mixin,
  formInputsMixins
};
