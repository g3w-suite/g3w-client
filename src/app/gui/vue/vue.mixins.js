import ApplicationState from 'core/applicationstate';
const GUI = require('gui/gui');
const {throttle, debounce, XHR} = require('core/utils/utils');
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
    getFieldService(){
      if (this._fieldsService === undefined)
        this._fieldsService = require('gui/fields/fieldsservice');
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
    setValue(){
      this.state.value && this.select2.val(this.state.value).trigger('change');
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

module.exports = {
  geoMixin,
  fieldsMixin,
  mediaMixin,
  resizeMixin,
  autocompleteMixin,
  select2Mixin,
};
