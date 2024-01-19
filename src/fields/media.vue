<!--
  @file
  
  ORIGINAL SOURCE: src/components/FieldLink.vue@3.8
  ORIGINAL SOURCE: src/components/FieldMedia.vue@3.8
  ORIGINAL SOURCE: src/components/FieldImage.vue@3.8
  ORIGINAL SOURCE: src/components/GlobalGallery.vue@3.8
  ORIGINAL SOURCE: src/components/InputMedia.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      @example <g3w-field mode="input" _type="media" />
    -->
    <template #input-body="{ tabIndex, editable, notvalid }">
      <div v-disabled="!editable">

        <div
          class  = "g3w_input_button skin-border-color"
          @click = "onClick"
        >
          <i
            :class = "g3wtemplate.getFontClass('file-upload')"
            class  = "fa-2x skin-color"
            style  = "padding: 5px;"
          >
            <input
              :id       = "mediaid"
              style     = "display: none;"
              :name     = "state.name"
              :tabIndex = "tabIndex"
              :data-url = "state.input.options.uploadurl"
              :class    = "{ 'input-error-validation' : notvalid }"
              type      = "file"
            >
          </i>
        </div>

        <bar-loader :loading="loading" />

        <g3w-field :state="data" _type="media" _mediaType="media">
          <div class="clearmedia" @click="clearMedia()">
            <i :class="g3wtemplate.font['trash-o']" class="g3w-icon"></i>
          </div>
        </g3w-field>

      </div>
    </template>

    <!--
      @example <g3w-field mode="read" _type="link" />
      @example <g3w-field mode="read" _type="media" />
      @example <g3w-field mode="read" _type="image" />
      @example <g3w-field mode="read" _type="gallery" />
    -->
    <template #field-value="{ state, field }">

      <!-- LINK FIELD -->
      <button
        v-if = "'link' === _mediaType || $parent.isLink(field)"
        class     = "btn skin-button field_link"
        v-t       = "'info.link_button'"
        @click    = "() => window.open(
          ('link' === _mediaType ? ((state.value && 'object' === typeof state.value) ? state.value.value : state.value) : (field.value)),
          '_blank'
        )"
      ></button>

      <!-- MEDIA FIELD -->
      <div v-else-if="'media' === _mediaType">
        <div v-if="state.value" class="preview">
          <a :href="state.value" target="_blank">
            <div class="previewtype" :class="getMediaType(state.mime_type)">
              <i class="fa-2x" :class="g3wtemplate.font[getMediaType(state.mime_type)]"></i>
            </div>
          </a>
          <div class="filename">{{ state.value ? state.value.split('/').pop() : state.value }}</div>
          <slot></slot>
        </div>
      </div>

      <!-- IMAGE FIELD -->
      <div v-else-if="'image' === _mediaType || $parent.isPhoto(field) || $parent.isImage(field)" style="text-align: left">
        <img
          v-for  = "(img, index) in values"
          class  = "img-responsive"
          style  = "max-height: 50px;"
          @click = "_showGallery(index)"
          :src   = "_getSrc(img)"
        />
        <div
          class           = "modal gallery fade modal-fullscreen force-fullscreen"
          ref             = "gallery"
          :id             = "'gallery_' + time"
          tabindex        = "-1"
          role            = "dialog"
          aria-labelledby = ""
          aria-hidden     = "true"
        >
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-body">
                <div :id="'carousel_' + time" class="carousel slide" data-interval="false">
                  <div class="carousel-inner">
                    <div v-for="(img, index) in images" class="item" :class="active == index ? 'active' : ''">
                      <img style="margin:auto" :src="_imgSrc(img.src)">
                    </div>
                  </div>
                  <a v-if="images.length > 1" class="left carousel-control" :href="'carousel_' + time" role="button" data-slide="prev">
                    <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
                  </a>
                  <a v-if="images.length > 1" class="right carousel-control" :href="'carousel_' + time" role="button" data-slide="next">
                    <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- GALLERY FIELD -->
      <div v-else-if="'gallery' === _mediaType" class="container-fluid">
        <div class="row">
          <div v-for="(img, index) in values" class="g3w-image col-md-6 col-sm-12">
            <img
              class  = "img-thumbnail"
              @click = "_showGallery(index)"
              :src   = "_getSrc(img)"
            />
          </div>
        </div>
        <div
          class           = "modal gallery fade modal-fullscreen force-fullscreen"
          ref             = "gallery"
          :id             = "'gallery_' + time"
          tabindex        = "-1"
          role            = "dialog"
          aria-labelledby = ""
          aria-hidden     = "true"
        >
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-body">
                <div :id="'carousel_' + time" class="carousel slide" data-interval="false">
                  <div class="carousel-inner">
                    <div v-for="(img, index) in images" class="item" :class="active == index ? 'active' : ''">
                      <img style="margin:auto" :src="_imgSrc(img.src)">
                    </div>
                  </div>
                  <a v-if="images.length > 1" class="left carousel-control" :href="'carousel_' + time" role="button" data-slide="prev">
                    <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
                  </a>
                  <a v-if="images.length > 1" class="right carousel-control" :href="'carousel_' + time" role="button" data-slide="next">
                    <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>

  </g3w-field>
</template>

<script>
import GUI                from 'services/gui';
import ProjectsRegistry   from 'store/projects';
import G3WField           from 'components/G3WField.vue';
import { getUniqueDomId } from 'utils/getUniqueDomId';
import { toRawType }      from 'utils/toRawType';

const { t }               = require('core/i18n/i18n.service');

Object
    .entries({
      GUI,
      ProjectsRegistry,
      G3WField,
      getUniqueDomId,
      toRawType,
      t,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

export default {

  /** @since 3.8.6 */
  // name: 'input-media',

  components: {
    'g3w-field': G3WField,
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
    _mediaType: {
      default: ''
    }
  },

  data() {
    return {
      data: {
        value: null,
        mime_type: null
      },
      mediaid:     `media_${getUniqueDomId()}`,
      loading:     false,
      /** @since 3.9.0 */
      active:      null,   // image field
      /** @since 3.9.0 */
      time:        Date.now(),
      /** @since 3.9.0 */
      window:      window,
    }
  },

  computed: {

    /**
     * ORIGINAL SOURCE: src/components/GlobalImage.vue@3.8
     */
     values() {
      return Array.isArray(this.state.value) ? this.state.value : [this.state.value];
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalGallery.vue@3.8
     */
    images() {
      return this.values.map((img) => ({ src: ('Object' === toRawType(img) ? img.photo: img) }));
    },

  },

  methods: {
    onClick(e) {
      document.getElementById(this.mediaid).click();
    },

    createImage(file, field) {
      const reader = new FileReader();
      reader.onload = function(e) {
        field.value = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    checkFileSrc(value) {
      if (_.isNil(value)) {
        value = ''
      }
      return value
    },

    clearMedia() {
      this.data.value     = null;
      this.data.mime_type = null;
      this.state.value    = null;
      this.$parent.change();
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalImage.vue
     * 
     * @since 3.9.0
     */
     _showGallery(idx) {
      this.active = idx;
      if ('Object' === toRawType(this.state.value)) {
        this.state.value.active = true;
      }
      $('#' + this.$refs.gallery.id).modal('show');
    },

    /**
     * ORIGINAL SOURCE: src/components/GlobalGallery.vue@3.8
     * 
     * @since 3.9.0
     */
     _imgSrc(url) {
      return (_.startsWith(url,'/') || _.startsWith(url,'http') ? '' : ProjectsRegistry.getConfig().mediaurl) + url;
    },

    /**
     * ORIGINAL SOURCE: src/components/FieldImage.vue@3.8
     * 
     * @since 3.9.0
     */
    _getSrc(img) {
      return 'Object' === toRawType(img) ? img.photo: img;
    },

  },

  created() {
    console.log('media', this);
    if (this.state.value) {
      this.data.value = this.state.value.value;
      this.data.mime_type = this.state.value.mime_type;
    }
  },

  mounted() {
    const fieldName = this.state.name;
    const formData = {
      name: fieldName,
      csrfmiddlewaretoken: this.$cookie.get('csrftoken')
    };
    this.$nextTick(() => {
      $(`#${this.mediaid}`).fileupload({
        dataType: 'json',
        formData,
        start: ()=>{
          this.loading = true;
        },
        done: (e, data) => {
          const response = data.result[fieldName];
          if (response) {
            this.data.value = response.value;
            this.data.mime_type = response.mime_type;
            this.state.value = this.data;
            this.change();
          }
        },
        fail: () => {
          GUI.notify.error(t("info.server_error"));
        },
        always: () => {
          this.loading = false;
        }
      });
    });
  },

  beforeDestroy() {
    $(`#${this.mediaid}`).fileupload('destroy');
  },

};
</script>
<style scoped>
  .img-responsive {
    cursor: pointer;
  }
  .g3w-image {
    padding-left: 0 !important;
    min-width: 100px;
    max-width: 100%;
    cursor:pointer;
  }
  .modal.gallery .modal-content {
    background: rgba(255, 255, 255, 0.6);
    border-radius: 3px;
  }
  .modal.gallery .modal-dialog {
    display: inline-block;
    text-align: left;
    vertical-align: middle;
  }
  .modal.gallery {
    text-align: center;
    padding: 0!important;
  }
  .modal.gallery:before {
    content: '';
    display: inline-block;
    height: 100%;
    vertical-align: middle;
    margin-right: -4px;
  }
  .modal.gallery .carousel .carousel-control span {
    color: #3c8dbc
  }
</style>