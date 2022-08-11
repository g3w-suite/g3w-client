/**
 * STILL HERE: file viewport.html and viewport.js non possible convert to SFC for a bug on vue-template-compiler on v-slot
 */
import ViewportService from "services/viewport";
import viewportService from 'services/viewport';
import userMessage from 'components/UserMessage.vue';
import onlineNotify from 'components/NotifyOnline.vue';
import downloadNotify from 'components/NotifyDownload.vue';
import pluginsNotify from 'components/NotifyPlugins.vue';
import {viewport as viewportConstraints} from 'gui/constraints';
const GUI = require('gui/gui');

const compiledTemplate = Vue.compile(require('./viewport.html'));

// COMPONENTE VUE VIEWPORT
const ViewportComponent = Vue.extend({
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
  ...compiledTemplate,
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
      const sidebarHeaderSize = (size === 'width') ? $('.sidebar-collapse').length ? 0 : SIDEBARWIDTH : $('#main-navbar').height();
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
});

module.exports = {
  ViewportService,
  ViewportComponent
};
