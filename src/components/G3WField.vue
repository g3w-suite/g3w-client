<!--
  @file Render formatted field values and custom field content.
  @since v4.2
-->

<template>
  <!-- Plain text values, including HTML supplied by the field formatter. -->
  <div v-if = "'text' === type" class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <span style = "word-wrap: break-word;" v-html = "state.value"></span>
    </div>
  </div>

  <!-- External links are opened only after an explicit user action. -->
  <div v-else-if = "'link' === type" class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <button
        class       = "btn skin-button field_link"
        @click.stop = "openLink(value)"
        :title      = "value"
      >{{ $t('Open') }}</button>
    </div>
  </div>

  <!-- Image values may be a single URL or a collection of photos. -->
  <div v-else-if = "'image' === type" class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <div style = "text-align: left; display: inline-block;">
        <img
          v-for       = "(img, i) in images"
          :key        = "i"
          class       = "img-responsive"
          style       = "max-height: 50px; cursor: pointer;"
          @click.stop = "showGallery(images, i)"
          :src        = "img.src"
          loading     = "lazy"
        />
      </div>
    </div>
  </div>

  <!-- Uploaded files display their MIME-derived icon and keep caller content in the slot. -->
  <div v-else-if = "'media' === type && value" class = "preview">
    <a :href = "value" target = "_blank">
      <div class = "previewtype" :class = "mediaType">
        <i class = "fa-2x" :class = "g3wtemplate.font[mediaType]"></i>
      </div>
    </a>
    <div class = "filename">{{ filename }}</div>
    <slot></slot>
  </div>

  <!-- GeoJSON values can be toggled as a temporary vector layer on the map. -->
  <div v-else-if = "'geo' === type" class = "geo-content">
    <span
      @click.stop = "showLayer()"
      class       = "show-hide-geo"
      :class      = "[visible ? g3wtemplate.font['eye-close'] : g3wtemplate.font['eye']]">
    </span>
  </div>

  <!-- Custom Vue fields receive both their feature and current value. -->
  <div v-else-if = "'vue' === type" class = "field g3w-field">
    <div v-if = "state.showlabel" class = "field_label">{{ state.label }}</div>
    <div class = "field_value">
      <div>
        <component
          :feature = "feature"
          :value   = "state.value"
          :is      = "state.vueoptions.component"/>
      </div>
    </div>
  </div>
</template>

<script>
import GUI from 'g3w-app';

/**
 * Shared renderer for text, links, images, uploaded media, GeoJSON and custom Vue fields.
 *
 * Props:
 * - `state`: field metadata and value; defaults to an empty field.
 * - `data`: legacy GeoJSON input, accepted alongside `state.value`.
 * - `feature`: feature forwarded to a custom Vue field.
 * - `fieldType`: optional explicit type (`text`, `link`, `image`, `media`, `geo`, `vue`;
 *   legacy `*_field` values are accepted too). When omitted, the value shape is inspected.
 *
 * @since v4.2
 */
export default {
  name: 'g3w-field',
  props: {
    state: {
      type: Object,
      default: () => ({ value: null, mime_type: null, vueoptions: { component: null } })
    },
    data: {},
    feature: Object,
    fieldType: String,
  },
  data() {
    return {
      layer: null,
      visible: false,
      layerId: `table_layer_${Date.now()}`,
      id: `geo_table_${Date.now()}`,
    };
  },
  computed: {
    /** Resolve an explicit type first, then infer the renderer from the field value. */
    type() {
      const configuredType = (this.fieldType || '').replace(/_field$/, '');
      if (configuredType) {
        return ({ simple: 'text', text: 'text', photo: 'image' })[configuredType] || configuredType;
      }
      const value = this.state.value;
      if (this.data || value?.coordinates || value?.geometry?.coordinates) { return 'geo'; }
      if (this.state.vueoptions?.component || value?.vue) { return 'vue'; }
      if (this.state.mime_type || value?.mime_type) { return 'media'; }
      if (Array.isArray(value) || value?.photo || (typeof value === 'string' && /\.(png|jpe?g|gif|bmp)(?:[?#].*)?$/i.test(value))) { return 'image'; }
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) { return 'link'; }
      return 'text';
    },
    value() {
      return this.state?.value?.value ?? this.state.value;
    },
    images() {
      const imageValue = this.state.value?.mime_type ? this.state.value.value : this.state.value;
      return [].concat(imageValue || []).map(image => {
        let url = (image || {}).photo || image;
        if ('string' !== typeof url) { return { src: '' }; }
        url = `${!url.startsWith('/') && !url.startsWith('http') ? window.initConfig.mediaurl : ''}${url}`;
        return { src: url };
      });
    },
    mediaType() {
      return this.getMediaType(this.state.mime_type || this.state.value?.mime_type).type;
    },
    filename() {
      return this.value ? this.value.split('/').pop() : this.value;
    },
    geoData() {
      return this.data || this.state.value?.value || this.state.value;
    },
  },
  methods: {
    /** Open a field URL in a separate browsing context. */
    openLink(url) {
      window.open(url, '_blank');
    },
    /** Open the image collection in the application gallery. */
    async showGallery(images, index) {
      GUI.showGallery(images, index);
    },
    /** Return whether a value uses the media-field object format. */
    isMedia(value) {
      return !!(value && 'object' === typeof value && Object === value.constructor && value.mime_type);
    },
    /** Map a MIME type to the icon family used by the media preview. */
    getMediaType(mime_type) {
      const media = { type: 'unknow', options: {} };
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
      }
      return media;
    },
    /** Toggle visibility of the GeoJSON vector layer. */
    showLayer() {
      this.visible = !this.visible;
      this.layer.setVisible(this.visible);
    },
    /** Create and register the vector layer used by the GeoJSON preview. */
    createLayer() {
      const data = this.geoData;
      if (!data || !GUI.getMap()) { return; }
      const mapProjection = GUI.getProjection().getCode();
      let style;
      switch (data.type) {
        case 'Point':
        case 'MultiPoint':
          style = [new ol.style.Style({
            image: new ol.style.Circle({
              radius: 6,
              fill: new ol.style.Fill({ color: [255, 255, 255, 1.0] }),
              stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
            })
          }), new ol.style.Style({
            image: new ol.style.Circle({
              radius: 2,
              fill: new ol.style.Fill({ color: [255, 255, 255, 1.0] }),
              stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
            })
          })];
          break;
        case 'Line':
        case 'LineString':
        case 'MultiLineString':
        case 'Polygon':
        case 'MultiPolygon':
          style = new ol.style.Style({
            fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)' }),
            stroke: new ol.style.Stroke({ color: [0, 0, 0, 1.0], width: 2 })
          });
      }
      this.layer = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: new ol.format.GeoJSON().readFeatures(data, { featureProjection: mapProjection })
        }),
        visible: this.visible,
        style
      });
      GUI.getMap().addLayer(this.layer);
    },
  },
  created() {
    if ('geo' === this.type) { this.createLayer(); }
  },
  beforeDestroy() {
    if (this.layer && GUI.getMap()) { GUI.getMap().removeLayer(this.layer); }
  },
};
</script>

<style scoped>
.field_link {
  max-width: 100%;
}

.show-hide-geo {
  color: #3C8DBC;
  cursor: pointer;
  font-size: 1.2em;
}

.field_text_table {
  background-color: transparent !important;
}

.field_text_table .field_label {
  font-weight: bold;
}
</style>