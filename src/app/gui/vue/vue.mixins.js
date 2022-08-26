import ApplicationState from 'core/applicationstate';
const GUI = require('gui/gui');
const {throttle, debounce} = require('core/utils/utils');
const CatalogLayersStoresRegistry = require('core/catalog/cataloglayersstoresregistry');

const autocompleteMixin = {
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

const fieldsMixin = {
  methods: {
    getFieldType(value) {
      value = value && typeof  value === 'object' && value.constructor === Object && !value.coordinates? value.value : value;
      let Fields = {};
      Fields.SIMPLE = 'simple';
      Fields.GEO = 'geo';
      Fields.LINK = 'link';
      Fields.PHOTO = 'photo';
      Fields.PHOTOLINK = "photolink";
      Fields.IMAGE = 'image';
      Fields.POINTLINK = 'pointlink';
      Fields.ROUTE = 'route';
      const URLPattern = /^(https?:\/\/[^\s]+)/g;
      const PhotoPattern = /[^\s]+.(png|jpg|jpeg|gif)$/g;
      if (_.isNil(value)) {
        return Fields.SIMPLE;
      } else if (value && typeof value == 'object' && value.coordinates) {
        return Fields.GEO;
      } else if(value && Array.isArray(value)) {
        if (value.length && value[0].photo) return Fields.PHOTO;
        else return Fields.SIMPLE
      } else if (value.toString().toLowerCase().match(PhotoPattern)) {
        return Fields.PHOTO;
      } else if (value.toString().match(URLPattern)) {
        return Fields.LINK;
      }
      return Fields.SIMPLE;
    },
    sanitizeFieldValue(value) {
      if (Array.isArray(value) && !value.length) return '';
      else return value
    }
  }
};

const mediaMixin = {
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

const geoMixin = {
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
        style = [new ol.style.Style({
          image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
              color: [255,255,255,1.0]
            }),
            stroke: new ol.style.Stroke({
              color: [0,0,0,1.0],
              width: 2
            })
          })
        }),
          new ol.style.Style({
            image: new ol.style.Circle({
              radius: 2,
              fill: new ol.style.Fill({
                color: [255,255,255,1.0]
              }),
              stroke: new ol.style.Stroke({
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
        style = new ol.style.Style({
          fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.3)'
          }),
          stroke: new ol.style.Stroke({
            color: [0,0,0,1.0],
            width: 2
          })
        });
        break;
    }
    this.layer = new ol.layer.Vector({
      source: new ol.source.Vector({
        features: new ol.format.GeoJSON().readFeatures(data, {
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

const DELAY_TYPE = {
  throttle,
  debounce
};

const resizeMixin = {
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

const select2Mixin = {
  mixins: [resizeMixin],
  methods: {
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
const formInputsMixins = {
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

module.exports = {
  geoMixin,
  fieldsMixin,
  mediaMixin,
  resizeMixin,
  autocompleteMixin,
  select2Mixin,
  formInputsMixins
};
