<!--
  @file
  @since v3.7
-->

<template>
  <div
    class = "modal fade modal-fullscreen force-fullscreen"
    :id             = "id"
    tabindex        = "-1"
    role            = "dialog"
    aria-labelledby = ""
    aria-hidden     = "true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-body">
          <!--begin carousel-->
          <div
            :id           = "carouselId"
            class         = "carousel slide"
            data-interval = "false"
          >
            <div class="carousel-inner">
              <div
                v-for  = "(image, index) in images"
                class  = "item"
                :class = "active == index ? 'active' : ''"
              >
                <img
                  style = "margin:auto"
                  :src  = "isRelativePath(image.src)">
              </div>
            </div>
            <a
              v-if       ="images.length > 1"
              class      = "left carousel-control"
              :href      = "`#${carouselId}`"
              role       = "button"
              data-slide = "prev"
            >
              <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
            </a>
            <a
              v-if       = "images.length > 1"
              class      = "right carousel-control"
              :href      = "`#${carouselId}`"
              role       = "button"
              data-slide = "next"
            >
              <span :class="g3wtemplate.getFontClass('arrow-left')"></span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import ProjectsRegistry from 'store/projects';

  export default {
    name: "g3w-images-gallery",
    props: {
      images: {
        type:    Array,
        default: []
      },
      id: {
        type:     String,
        default: 'gallery'
      },
      active: {
        type: Number
      }
    },
    data() {
      return {
        carouselId: `carousel_${Date.now()}`
      }
    },
    methods: {
      isActive(src) {
        return src === this.active;
      },
      isRelativePath(url) {
        if (!_.startsWith(url,'/') && !_.startsWith(url,'http')) {
          return ProjectsRegistry.getConfig().mediaurl + url
        }
        return url
      },
    }
  }
</script>

<style scoped>
  .modal-content {
    background: rgba(255, 255, 255, 0.6);
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
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