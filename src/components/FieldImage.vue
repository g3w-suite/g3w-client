<!--
  @file
  @since v3.7
-->

<template>
  <field :state = "state">
    <div slot = "field" style = "text-align: left">
      <img
        v-for       = "(img, i) in images"
        class       = "img-responsive"
        style       = "max-height:50px"
        alt         = ""
        @click.stop = "showGallery(i)"
        :src        = "img.src"
      />
      <Teleport to="body">
        <div
          class           = "modal fade modal-fullscreen"
          :id             = "`gallery_${id}`"
          tabindex        = "-1"
          role            = "dialog"
          aria-labelledby = ""
          aria-hidden     = "true"
        >
          <div class = "modal-dialog">
            <div class = "modal-content">
              <div class = "modal-body">
                <!--begin carousel-->
                <div
                  :id           = "`carousel_${id}`"
                  class         = "carousel slide"
                  data-interval = "false"
                >
                  <div class = "carousel-inner">
                    <div
                      v-for  = "(image, i) in images"
                      class  = "item"
                      :class = "active == i ? 'active' : ''"
                    >
                      <img :src="isRelativePath(image.src)" alt = "" style = "margin:auto" />
                    </div>
                  </div>
                  <a
                    v-if       = "images.length > 1"
                    class      = "left carousel-control"
                    :href      = "`#carousel_${id}`"
                    role       = "button"
                    data-slide = "prev"
                  >
                    <span :class = "$fa('arrow-left')"></span>
                  </a>
                  <a
                    v-if       = "images.length > 1"
                    class      = "right carousel-control"
                    :href      = "`#carousel_${id}`"
                    role       = "button"
                    data-slide = "next"
                  >
                    <span :class = "$fa('arrow-right')"></span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </field>
</template>

<script>
import { toRawType } from 'utils/toRawType';

import Field         from 'components/Field.vue';
import Teleport      from 'vue2-teleport';

export default {

  /** @since 3.8.6 */
  name: "field-image",

  props: ['state'],
  data() {
    return {
      id:     Date.now(),
      active: null,
      value:  undefined !== this.state.value.mime_type ? this.state.value.value : this.state.value,
    }
  },
  components: {
    Field,
    Teleport,
  },
  computed: {
    images() {
      return [].concat(this.value).map(img => ({ src: (img || {}).photo || img }));
    },
  },
  methods: {
    async showGallery(index) {
      this.active = index;
      if (toRawType(this.value) === 'Object') {
        this.value.active = true;
      }
      $(`#gallery_${this.id}`).modal('show');
    },
    isRelativePath(url) {
      if (!url.startsWith('/') && !url.startsWith('http')) {
        return `${window.initConfig.mediaurl}${url}`;
      }
      return url;
    },
  }
};
</script>

<style scoped>
  .img-responsive {
    cursor: pointer;
  }
  .modal-content {
    background: rgba(255, 255, 255, 0.6);
    border-radius: 3px;
  }
  .modal-dialog {
    display: inline-block;
    text-align: left;
    vertical-align: middle;
  }
  .modal {
    text-align: center;
    padding: 0!important;
  }
  .modal:before {
    content: '';
    display: inline-block;
    height: 100%;
    vertical-align: middle;
    margin-right: -4px;
  }
  .carousel .carousel-control span {
    color: #3c8dbc
  }
</style>
