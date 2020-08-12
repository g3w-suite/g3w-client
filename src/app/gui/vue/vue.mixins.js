const GUI = require('gui/gui');

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
        if (value.length && value[0].photo)
          return Fields.PHOTO;
        else
          return Fields.SIMPLE
      } else if (value.toString().toLowerCase().match(PhotoPattern)) {
        return Fields.PHOTO;
      } else if (value.toString().match(URLPattern)) {
        return Fields.LINK;
      }
      return Fields.SIMPLE;
    },
    sanitizeFieldValue(value) {
      if (Array.isArray(value) && !value.length)
        return '';
      else
        return value
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
      if (value && typeof  value === 'object' && value.constructor === Object) {
        return !!value.mime_type;
      }
      return false;
    },
    getMediaType(mime_type) {
      let media = {
        type: null,
        options: {}
      };
      switch (mime_type) {
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

const resizeMixin = {
  created(){
    GUI.on('resize', this.resize);
  },
  async mounted(){
    await this.$nextTick();
    this.resize && this.resize();
  },
  beforeDestroy(){
    GUI.off('resize', this.resize)
  }
};

module.exports = {
  geoMixin,
  fieldsMixin,
  mediaMixin,
  resizeMixin
};
