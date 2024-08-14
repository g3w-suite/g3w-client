<!--
  @file
  @since v3.7
-->

<template>
  <div class = "g3w-viewport">

    <transition name = "fade" :duration = "{ enter: 500, leave: 500 }">
      <user-message
        v-if               = "usermessage.show"
        @close-usermessage = "closeUserMessage"
        :title             = "usermessage.title"
        :subtitle          = "usermessage.subtitle"
        :id                = "usermessage.id"
        :message           = "usermessage.message"
        :draggable         = "usermessage.draggable"
        :closable          = "usermessage.closable"
        :duration          = "usermessage.duration"
        :position          = "usermessage.position"
        :autoclose         = "usermessage.autoclose"
        :textMessage       = "usermessage.textMessage"
        :size              = "usermessage.size"
        :type              = "usermessage.type"
        :icon-class        = "usermessage.iconClass"
      >
        <template v-if="hooks.header"   slot="header"><component :is="hooks.header" /></template>
        <template v-if="hooks.body"     slot="body"><component   :is="hooks.body" /></template>
        <template v-if = "hooks.footer" slot="footer"><component :is="usermessage.hooks.footer" /></template>
      </user-message>
    </transition>

    <div
      id     = "g3w-view-map"
      :class = "`split-${state.split}`"
      class  = "g3w-view map"
      :style = "styles.map"
    >
      <g3w-resize
        id           = "resize-map-and-content"
        :show        = "showresize"
        :moveFnc     = "moveFnc"
        :orientation = "state.split"
        :style       = "{backgroundColor:'transparent'}"
        :class       = "`split-${state.split}`"/>
      <div id="application-notifications">
        <online-notify/>
        <download-notify/>
        <plugins-notify/>
      </div>
    </div>
    <div
      id         = "g3w-view-content"
      :class     = "`split-${state.split}`"
      class      = "g3w-view content"
      :style     = "styles.content"
      v-disabled = "state.content.disabled"
    >
      <section
        v-if  = "breadcrumb.length > 1"
        :ref  = "breadcrumb"
        class = "content_breadcrumb"
      >
        <span
          v-for = "(crumb, index) in breadcrumb"
          :key  = "crumb.title"
        >
          <span
            class  = "skin-color-dark"
            :style = "{fontWeight: isNotLastCrumb(index) ? 'bold' : 'normal'}"
            v-t    = "crumb.title" >
          </span>
          <span
            v-if  = "isNotLastCrumb(index)"
            style = "font-weight: bold; margin: 3px 0">/</span>
        </span>
      </section>
      <div
        v-if  = "(showtitle && contentTitle) || previousTitle || (state.content.closable && state.content.aside)"
        class = "close-panel-block"
        style = "display: flex; justify-content: space-between"
      >
        <div
          v-if  = "previousTitle"
          class = "g3w_contents_back g3w-long-text"
        >
          <div
            v-if   = "'back' === backOrBackTo "
            :class = "backOrBackTo"
          >
            <span
              class  = "action-button"
              :class = "g3wtemplate.getFontClass('back')">
            </span>
            <span v-t="'back'"></span>
          </div>
          <div
            v-else
            @click.stop = "gotoPreviousContent()"
            :class      = "backOrBackTo"
          >
            <span
              class  = "action-button"
              :class = "g3wtemplate.getFontClass('back')">
            </span>
            <span v-t = "'backto'"></span>
            <span v-if = "!updatePreviousTitle" v-t = "previousTitle"></span>
          </div>
        </div>
        <div
          v-if   = "!previousTitle && showtitle && contentTitle"
          class  = "panel-title"
          :style = "[state.content.style.title]"
          :class = "{'mobile': isMobile()}"
        >
        <span id = "contenttitle">
          <span v-t = "contentTitle.title"></span>
          <span v-t = "contentTitle.post_title"></span>
        </span>
        </div>
        <div
          class = "g3-content-header-action-tools"
          style = "display: flex; align-items: center"
        >
          <component v-for = "tool in state.content.headertools" :is = "tool"/>
          <resize-icon
            v-if   = "showresizeicon"
            :type  = "state.split"
            style  = "font-size: 1em; padding: 0; align-self: center; margin-left: auto"
            :style = "{marginRight: state.content.closable ? '5px': '0px'}"/>
          <span
            v-if = "state.content.closable && state.content.aside"
            @click = "closeContent"
            :class = "{'mobile': isMobile()}"
            class  = "action-button"
            style  = "display: flex; justify-content: center "
          >
          <i class = "skin-color-dark" :class = "g3wtemplate.getFontClass('close')"></i>
        </span>
        </div>
      </div>
      <bar-loader :loading = "state.content.loading"/>
    </div>
  </div>
</template>

<script>
  import userMessage                                   from 'components/UserMessage.vue';
  import onlineNotify                                  from 'components/NotifyOnline.vue';
  import downloadNotify                                from 'components/NotifyDownload.vue';
  import pluginsNotify                                 from 'components/NotifyPlugins.vue';
  import { ZINDEXES, VIEWPORT as viewportConstraints } from 'app/constant';
  import viewportService                               from 'services/viewport';
  import GUI                                           from 'services/gui';

  export default {
    name: "Viewport",
    props: {
      appState: {
        type: Object
      }
    },
    components: {
      userMessage,
      onlineNotify,
      downloadNotify,
      pluginsNotify
    },
    data() {
      return {
        state:               viewportService.state,
        updatePreviousTitle: false,
        media:              { matches: true }
      }
    },
    computed: {
      breadcrumb() {
         return this.state.content.contentsdata
           .filter(c => c.options.crumb)
           .map(c => c.options.crumb);
      },
      showresize() {
        const currentPerc = viewportService.getCurrentContentLayout()[this.state.split === 'h' ? 'width' : 'height'];
        return this.state.resized.start && this.state.secondaryPerc > 0 && this.state.secondaryPerc < 100 && currentPerc < 100 && currentPerc > 0;
      },
      showresizeicon() {
        return 100 !== this.state.secondaryPerc;
      },
      hooks() {
        return this.usermessage.hooks;
      },
      usermessage() {
        return this.state.usermessage;
      },
      showtitle() {
        if (this.state.content.contentsdata.length) {
          const options = this.state.content.contentsdata[this.state.content.contentsdata.length - 1].options;
          if (_.isBoolean(options.showtitle)) { return options.showtitle }
        }
        return true;
      },
      showContent() {
        return this.state.content.show;
      },
      styles() {
        return {
          map: {
            width:         `${this.state.map.sizes.width}px`,
            height:        `${this.state.map.sizes.height}px`,
          },
          content: {
            width:         `${this.state.content.sizes.width}px`,
            height:        `${this.state.content.sizes.height}px`,
            zIndex:        ZINDEXES.usermessage.tool + 1,
            minHeight:     'v' === this.state.split ? `${viewportConstraints.resize.content.min}px` : null,
            paddingTop:    '8px',
            paddingBottom: '8px',
          }
        }
      },
      contentTitle() {
        if (this.state.content.contentsdata.length) {
          const {title, post_title} = this.state.content.contentsdata[this.state.content.contentsdata.length - 1].options;
          return {title, post_title};
        }
      },
      backOrBackTo(){
        return (this.state.content.contentsdata.length > 1 && this.state.content.showgoback)
          ? !(this.state.content.contentsdata[this.state.content.contentsdata.length - 2].options.title)
            ? 'back'
            : 'backto'
          : false;
      },
      previousTitle() {
        const title = (this.state.content.contentsdata.length > 1 && this.state.content.showgoback)
          ? this.state.content.contentsdata[this.state.content.contentsdata.length - 2].options.title
          : null;
        this.updatePreviousTitle = true;
        this.$nextTick(() => this.updatePreviousTitle = false);
        return title;
      },
    },
    methods: {
      isNotLastCrumb(index) {
        return index < this.breadcrumb.length - 1;
      },
      closeContent() {
        GUI.closeContent();
      },
      closeMap() {
        viewportService.closeMap();
      },
      gotoPreviousContent() {
        GUI.popContent();
      },
      closeUserMessage() {
        GUI.closeUserMessage();
      },
      moveFnc(e) {
        e.preventDefault();
        const size         = 'h' === this.state.split ? 'width' : 'height';
        const sidebarSize  = (size === 'width') ? $('.sidebar-collapse').length ? 0 : viewportService.SIDEBARWIDTH : $('#main-navbar').height();
        const viewPortSize = $(this.$el)[size]();
        let mapSize        = ('width' === size ? (e.pageX+2): (e.pageY+2)) - sidebarSize;
        const { content, map } = viewportConstraints.resize;
        if (mapSize > viewPortSize - content.min) {
          mapSize = viewPortSize -  content.min;
        } else if ( mapSize < map.min) {
          mapSize = map.min;
        }
        viewportService.resizeViewComponents(this.state.split, { }, 100 - Math.round((mapSize / viewPortSize) * 100));
      }
    },
    async mounted() {
      const handleResizeViewport = () => this.state.resized.start = true;
      await this.$nextTick();
      const mediaQueryEventMobile = window.matchMedia("(min-height: 300px)");
      this.media.matches = mediaQueryEventMobile.matches;
      mediaQueryEventMobile.addListener(e => {
        if (e.type === 'change') { this.media.matches = e.currentTarget.matches }
      });
      handleResizeViewport();
    }
  }
</script>

<style scoped>
  .content_breadcrumb {
    font-size: 1.2em;
    padding: 0 3px;
    border-radius: 3px;
  }
  .close-panel-block {
    overflow: hidden;
    margin-top: 2px;
    margin-bottom: 2px;
    font-size: 1.4em;
  }
  .g3w_contents_back {
    font-size: 0.8em;
  }
  .g3w_contents_back :is(.backto, .back) {
    display: inline-block;
    font-weight: bold;
  }
  .g3w_contents_back .backto {
    margin-top: 5px;
    cursor: pointer;
  }
</style>