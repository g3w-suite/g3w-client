<!-- ORIGINAL SOURCE: -->
<!-- gui/viewport/viewport.html@v3.4 -->
<!-- gui/viewport/viewport.js@v3.4 -->

<template>
  <div class="g3w-viewport">
    <transition name="fade" :duration="{ enter: 500, leave: 500 }">
      <user-message
              v-if="usermessage.show"
              @close-usermessage="closeUserMessage"
              :title="usermessage.title"
              :subtitle="usermessage.subtitle"
              :id="usermessage.id"
              :message="usermessage.message"
              :draggable="usermessage.draggable"
              :closable="usermessage.closable"
              :duration="usermessage.duration"
              :position="usermessage.position"
              :autoclose="usermessage.autoclose"
              :textMessage="usermessage.textMessage"
              :size="usermessage.size"
              :type="usermessage.type">
        <template v-if="hooks.header" slot="header">
          <component :is="hooks.header"></component>
        </template>
        <template v-if="hooks.body" slot="body">
          <component :is="hooks.body"></component>
        </template>
        <template v-if="hooks.footer" slot="footer">
          <component :is="usermessage.hooks.footer"></component>
        </template>
      </user-message>
    </transition>
    <div id="g3w-view-map" :class="`split-${state.split}`" class="g3w-view map" :style="styles.map">
      <g3w-resize id="resize-map-and-content" :show="showresize"
                  :moveFnc="moveFnc"
                  :orientation="state.split"
                  :style="{backgroundColor:'transparent'}"
                  :class="`split-${state.split}`"></g3w-resize>
      <div id="application-notifications">
        <online-notify></online-notify>
        <download-notify></download-notify>
        <plugins-notify></plugins-notify>
      </div>
    </div>
    <div id="g3w-view-content" :class="`split-${state.split}`" class="g3w-view content" :style="styles.content" v-disabled="state.content.disabled">
      <div v-if="(showtitle && contentTitle) || previousTitle || (state.content.closable && state.content.aside)" class="close-panel-block" style="display: flex; justify-content: space-between">
        <div v-if="previousTitle" class="g3w_contents_back">
          <div :class="backOrBackTo" v-if ="backOrBackTo === 'back'">
            <span class="action-button" :class="g3wtemplate.getFontClass('back')"></span>
            <span v-t="'back'"></span>
          </div>
          <div @click="gotoPreviousContent()" :class="backOrBackTo" v-else>
            <span class="action-button" :class="g3wtemplate.getFontClass('back')"></span>
            <span v-t="'backto'"></span>
            <span v-if="!updatePreviousTitle" v-t="previousTitle"></span>
          </div>
        </div>
        <div class="panel-title" :style="[state.content.style.title]" v-if="!previousTitle && showtitle && contentTitle" :class="{'mobile': isMobile()}">
        <span id="contenttitle">
          <span v-t="contentTitle.title"></span>
          <span v-t="contentTitle.post_title"></span>
        </span>
        </div>
        <div class="g3-content-header-action-tools" style="display: flex">
          <component v-for="tool in state.content.headertools" :is="tool"></component>
          <resize-icon v-if="showresizeicon" :type="state.split" style="font-size: 1em; padding: 0; align-self: center; margin-left: auto" :style="{marginRight: state.content.closable ? '5px': '0px'}"></resize-icon>
          <span v-if="state.content.closable && state.content.aside" @click="closeContent" :class="{'mobile': isMobile()}" class="action-button" style="display: flex; justify-content: center ">
          <i class="skin-color-dark" :class="g3wtemplate.getFontClass('close')"></i>
        </span>
        </div>
      </div>
      <div v-show="state.content.loading" class="bar-loader"></div>
    </div>
  </div>
</template>

<script>
  import userMessage from 'components/UserMessage.vue';
  import onlineNotify from 'components/NotifyOnline.vue';
  import downloadNotify from 'components/NotifyDownload.vue';
  import pluginsNotify from 'components/NotifyPlugins.vue';
  import { ZINDEXES, VIEWPORT as viewportConstraints } from 'app/constant';
  import viewportService from 'services/viewport';
  import GUI from 'services/gui';

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
        state: viewportService.state,
        updatePreviousTitle: false,
        media: {
          matches: true
        }
      }
    },
    computed: {
      showresize(){
        const currentPerc = viewportService.getCurrentContentLayout()[this.state.split === 'h' ? 'width' : 'height'];
        return this.state.resized.start && this.state.secondaryPerc > 0 && this.state.secondaryPerc < 100 && currentPerc < 100 && currentPerc > 0;
      },
      showresizeicon(){
        return this.state.secondaryPerc !== 100;
      },
      hooks() {
        return this.usermessage.hooks;
      },
      usermessage() {
        return this.state.usermessage;
      },
      showtitle() {
        let showtitle = true;
        const contentsData = this.state.content.contentsdata;
        if (contentsData.length) {
          const options = contentsData[contentsData.length - 1].options;
          if (_.isBoolean(options.showtitle)) showtitle = options.showtitle;
        }
        return showtitle;
      },
      showContent() {
        return this.state.content.show;
      },
      styles() {
        return {
          map: {
            width: `${this.state.map.sizes.width}px`,
            height: `${this.state.map.sizes.height}px`,
          },
          content: {
            width: `${this.state.content.sizes.width}px`,
            height: `${this.state.content.sizes.height}px`,
            zIndex: ZINDEXES.usermessage.tool + 1,
            minHeight: this.state.split === 'v' ? `${viewportConstraints.resize.content.min}px` : null
          }
        }
      },
      contentTitle() {
        const contentsData = this.state.content.contentsdata;
        if (contentsData.length) {
          const {title, post_title} = contentsData[contentsData.length - 1].options;
          return {title, post_title};
        }
      },
      backOrBackTo(){
        const contentsData = this.state.content.contentsdata;
        return (contentsData.length > 1 && this.state.content.showgoback) ? !(contentsData[contentsData.length - 2].options.title) ? 'back' : 'backto' : false;

      },
      previousTitle() {
        const contentsData = this.state.content.contentsdata;
        const title = (contentsData.length > 1 && this.state.content.showgoback) ? contentsData[contentsData.length - 2].options.title : null;
        this.updatePreviousTitle = true;
        this.$nextTick(()=> this.updatePreviousTitle = false);
        return title;
      },
    },
    methods: {
      closeContent() {
        GUI.closeContent();
      },
      closeMap() {
        viewportService.closeMap();
      },
      gotoPreviousContent() {
        viewportService.popContent();
      },
      closeUserMessage(){
        viewportService.closeUserMessage();
      },
      moveFnc(evt){
        const size =  this.state.split === 'h' ? 'width' : 'height';
        evt.preventDefault();
        const sidebarHeaderSize = (size === 'width') ? $('.sidebar-collapse').length ? 0 : viewportService.SIDEBARWIDTH : $('#main-navbar').height();
        const viewPortSize = $(this.$el)[size]();
        let mapSize = (size === 'width' ? (evt.pageX+2): (evt.pageY+2)) - sidebarHeaderSize;
        if (mapSize > viewPortSize - viewportConstraints.resize.content.min)
          mapSize = viewPortSize -  viewportConstraints.resize.content.min;
        else if( mapSize < viewportConstraints.resize.map.min)
          mapSize = viewportConstraints.resize.map.min;
        const contentSize = viewPortSize - mapSize;
        const resizePercentageMap = Math.round((mapSize / viewPortSize) * 100);
        const resizePercentageContent = 100 - resizePercentageMap;
        viewportService.resizeViewComponents(this.state.split, {
          map: {
            [size]: mapSize
          },
          content: {
            [size]: contentSize
          }
        }, resizePercentageContent);
      }
    },
    async mounted() {
      const handleResizeViewport = () => {
        this.state.resized.start = true;
      };
      await this.$nextTick();
      const mediaQueryEventMobile = window.matchMedia("(min-height: 300px)");
      this.media.matches = mediaQueryEventMobile.matches;
      mediaQueryEventMobile.addListener(event => {
        if (event.type === 'change') this.media.matches = event.currentTarget.matches;
      });
      handleResizeViewport();
    }
  }
</script>

<style scoped>

</style>