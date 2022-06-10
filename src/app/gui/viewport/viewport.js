import ApplicationState from 'core/applicationstate';
import {viewport as viewportConstraints} from 'gui/constraints';
import userMessage from 'gui/usermessage/vue/usermessage.vue';
import onlineNotify from 'gui/notifications/online/vue/online.vue';
import downloadNotify from 'gui/notifications/download/vue/download.vue';
import pluginsNotify from 'gui/notifications/plugins/vue/plugins.vue';
import utils from 'core/utils/utils';
import G3WObject from 'core/g3wobject';
import GUI  from 'gui/gui';
import template from './viewport.html';

let SIDEBARWIDTH;

// calsse servizio della viewport
class ViewportService extends G3WObject {
  constructor() {
    super();
    // state of viewport
    this.state = {
      primaryView: 'map', // primary view (default)
      // percentage of secondary view
      secondaryPerc: 0, // setted to 0 at beginning (not visible)
      // used to store if content vertical or horizontal is  changed by resised
      resized: {
        start: false,
        'h': false,
        'v': false
      },
      // splitting orientation (h = horizontal, v = vertical)
      split: 'h',
      //map
      map: {
        sizes: {
          width:0,
          height:0
        },
        aside: false
      },
      //content
      content: {
        loading: false,
        disabled: false,
        sizes: {
          width: 0,
          height: 0
        },
        // store the resize vertical or horizontal
        resize: {
          'h': {
            perc: 0
          },
          'v': {
            perc: 0
          }
        },
        aside: true,
        showgoback: true,
        stack: [], // array elements of  stack contents
        closable: true, // (x) is closable
        backonclose: false, // back on prevoius content
        contentsdata:[], // content data array
      },
      usermessage: {
        id: null, // unique identify
        show: false,
        title: null,
        message: null,
        position: null,
        type: null,
        draggable: null,
        cloasable: null,
        autoclose: null,
        textMessage: false,
        hooks: {
          header: null,
          body: null,
          footer: null
        }
      }
    };
    // content of viewport (map and content)
    this._components = {
      map: null,
      content: null
    };
    // default contents
    this._defaultMapComponent;
    this._contextualMapComponent;

    // minimun height and width of secondary view
    this._secondaryViewMinWidth = viewportConstraints.resize.content.min;
    this._secondaryViewMinHeight =  viewportConstraints.resize.content.min;
    this._immediateComponentsLayout = true;
    this._firstLayout();
  }
  init(options={}) {
    const {primaryview='map', split='h', components} = options;
    // check if it set primary view (map is default)
    this.state.primaryView = primaryview;
    // check splitting property
    this.state.split = split;
    // add component (map and content)
    this._addComponents(components);
  };

  // Method to set true or false of content
  setResized(type, bool=false) {
    this.state.resized[type] = bool;
  };

  showUserMessage({title, message, type, position, size, draggable, duration, textMessage=false, closable, autoclose, hooks={}}={}) {
    this.closeUserMessage();
    setTimeout(() => {
      this.state.usermessage.id = utils.uniqueId();
      this.state.usermessage.show = true;
      this.state.usermessage.message = message;
      this.state.usermessage.textMessage = textMessage;
      this.state.usermessage.title = title;
      this.state.usermessage.position = position;
      this.state.usermessage.duration = duration;
      this.state.usermessage.type = type;
      this.state.usermessage.show = true;
      this.state.usermessage.size = size;
      this.state.usermessage.autoclose = autoclose;
      this.state.usermessage.closable = closable;
      this.state.usermessage.draggable = draggable;
      this.state.usermessage.hooks.header = hooks.header; // has to be a vue component or vue object
      this.state.usermessage.hooks.body = hooks.body; // has to be a vue component or vue object
      this.state.usermessage.hooks.footer = hooks.footer; // has to be a vue component or vue object
    });
    return this.state.usermessage;
  };

  closeUserMessage() {
    this.state.usermessage.id = null;
    this.state.usermessage.show = false;
    this.state.usermessage.textMessage = false;
    this.state.usermessage.message = '';
  };

  getState() {
    return this.state;
  };

  getMapState() {
    return state.map;
  };

  getContentState() {
    return this.state.content;
  };

  setLoadingContent(loading=false) {
    this.state.content.loading = loading;
  };

  _addComponents(components) {
    // components is an object
    //(index.js)
    /*
     {
      map: new MapComponent({
        id: 'map'
      }),
      content: new ContentsComponent({
        id: 'contents'
      })
     }
     */
    Object.entries(components).forEach(([viewName, component]) => {
      // check if component are map or content
      if (Object.keys(this._components).indexOf(viewName) > -1) {
        component.mount(`#g3w-view-${viewName}`, true)
          .then(() => {
            this._components[viewName] = component;
            // check if view name is map
            if (viewName === 'map') this._defaultMapComponent = component; // set de default component to map
          })
          .fail(err => console.log(err));
      }
    })
  };

  showMap() {
    this._toggleMapComponentVisibility(this._defaultMapComponent,true);
    this._components['map'] = this._defaultMapComponent;
    this._showView('map');
  };

  showContextualMap(options={}) {
    if (!this._contextualMapComponent) this._contextualMapComponent = this._defaultMapComponent;
    if (this._contextualMapComponent != this._defaultMapComponent) this._toggleMapComponentVisibility(this._defaultMapComponent,false);
    if (!this._contextualMapComponent.ismount()) {
      const contextualMapComponent = this._contextualMapComponent;
      contextualMapComponent.mount('#g3w-view-map', true)
        .then(() => this._components['map'] = contextualMapComponent);
    } else {
      this._components['map'] = this._contextualMapComponent;
      this._toggleMapComponentVisibility(this._contextualMapComponent, true);
    }
    this._showView('map',options);
  };

  // get default component
  recoverDefaultMap() {
    if (this._components['map'] !== this._defaultMapComponent) {
      this._components['map'] = this._defaultMapComponent;
      this._toggleMapComponentVisibility(this._contextualMapComponent, false);
      this._toggleMapComponentVisibility(this._defaultMapComponent, true);
    }
    return this._components['map']
  };

  setContextualMapComponent(mapComponent) {
    if (mapComponent === this._defaultMapComponent) return;
    if (this._contextualMapComponent) this._contextualMapComponent.unmount();
    this._contextualMapComponent = mapComponent;
  };

  resetContextualMapComponent() {
    this._contextualMapComponent && this._contextualMapComponent.unmount();
    this._contextualMapComponent = this._defaultMapComponent;
  };

  _toggleMapComponentVisibility(mapComponent,toggle) {
    mapComponent.internalComponent.$el.style.display = toggle ? 'block' : 'none';
  };

  // close map method
  closeMap() {
    this.state.secondaryPerc = (this.state.primaryView === 'map') ? 100 : 0;
    this.recoverDefaultMap();
    this._layout();
  };

  // show content of the viewport content
  /*
   options: {
     content: (string, jQuery elemento or Vue component)
     title: Title of the content
     push: (opyionale, default false): if yes the content is push on top of the stack (contentStack)
     split: (optional, default 'h'): 'h' || 'v' splitting map and content orientation
     perc: (optional, default 50): percentage of content
   }
   */

  showContent(options={}) {
    options.perc = options.perc !== undefined ? options.perc : this.getContentPercentageFromCurrentLayout();
    // check if push is set
    options.push = options.push || false;
    const evenContentName = options.perc === 100 ? 'show-content-full' : 'show-content';
    // set all content parameters
    this._prepareContentView(options);
    // immediate layout false (to understand better)
    this._immediateComponentsLayout = false;
    // call show view (in this case content (other is map)
    this._showView('content', options);
    this._components.content.setContent(options)
      .then(() => {
        this._immediateComponentsLayout = true;
        this._layoutComponents(evenContentName);
      });
  };

  // hide content
  hideContent(bool) {
    const prevContentPerc = this.getContentPercentageFromCurrentLayout(this.state.split);
    this.state.secondaryVisible = !bool;
    this._layout('hide-content');
    // return previous percentage
    return prevContentPerc;
  };

  resetToDefaultContentPercentage(){
    const currentRightPanel = this.getCurrentContentLayout();
    currentRightPanel[`${this.state.split === 'h'? 'width' : 'height'}`] = currentRightPanel[`${this.state.split === 'h'? 'width' : 'height'}_default`];
    currentRightPanel[`${this.state.split === 'h'? 'width' : 'height'}_100`] = false;
    this._layoutComponents();
  };

  toggleFullViewContent(){
    ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_100`] = !ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_100`];
    this._layoutComponents();
  };

  isFullViewContent(){
    return ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_100`]
  };

  contentLength() {
    return this.state.content.contentsdata.length;
  };

  // pull the last element of contentStack
  popContent() {
    const d = $.Deferred();
    // check if content exist compontentStack
    if (this.state.content.contentsdata.length) {
      this.recoverDefaultMap();
      const data = this._components.content.getPreviousContentData();
      this._prepareContentView(data.options);
      this._immediateComponentsLayout = false;
      this._showView('content', data.options);
      this._components.content.popContent()
        .then(() => {
          this.state.secondaryPerc = data.options.perc;
          this._immediateComponentsLayout = true;
          this._layout('pop-content');
          d.resolve(this._components.contentgetCurrentContentData)
        })
    } else d.reject();
    return d.promise();
  };

  /**
   * Return current compoent data
   * @returns {*}
   */
  getCurrentContent() {
    return this.contentLength() ? this.state.content.contentsdata[this.contentLength() -1] : null;
  };

  getCurrentContentTitle(){
    const currentContent = this.getCurrentContent();
    return currentContent && currentContent.options.title
  };

  changeCurrentContentTitle(title=''){
    const currentContent = this.getCurrentContent();
    if (currentContent) currentContent.options.title = title;
  };

  isContentOpen() {
    return !!this.state.content.contentsdata.length;
  };

  // close  content
  closeContent() {
    const d = $.Deferred();
    if (this.isContentOpen()) {
      //.setFullViewContent(false);
      this._components.content.removeContent();
      // close secondary view( return a promise)
      this.closeSecondaryView('close-content')
        .then(() => {
          //recover default map
          const mapComponent = this.recoverDefaultMap();
          d.resolve(mapComponent);
        });
    } else {
      const mapComponent = this.recoverDefaultMap();
      d.resolve(mapComponent);
    }
    return d.promise()
  };

  disableContent(disabled){
    this.state.content.disabled = disabled;
  };
  removeContent() {
    // check if backonclose proprerty is  true o false
    // to remove all content stack or just last component
    if (this.state.content.backonclose && this.state.content.contentsdata.length > 1) this.popContent();
    else return this.closeContent();
  };

  isPrimaryView(viewName) {
    return this.state.primaryView == viewName;
  };

  setPrimaryView(viewTag) {
    if (this.state.primaryView !== viewTag) this.state.primaryView = viewTag;
    this._layout();
  };
  showPrimaryView(perc=null) {
    if (perc && this.state.secondaryVisible && this.state.secondaryPerc === 100) {
      this.state.secondaryPerc = 100 - perc;
      this._layout();
    }
  };

  showSecondaryView(split=this.state.split, perc=this.state.perc) {
    this.state.secondaryVisible = true;
    this.state.split = split;
    this.state.secondaryPerc = perc;
    this._layout();
  };

  // close secondary view
  closeSecondaryView(event=null) {
    const d = $.Deferred();
    const secondaryViewComponent = this._components[this._otherView(this.state.primaryView)];
    if (secondaryViewComponent.clearContents) {
      secondaryViewComponent.clearContents()
        .then(() => {
          this.state.secondaryVisible = false;
          this.state.secondaryPerc = 0;
          this._layout(event);
          Vue.nextTick(() => d.resolve());
        });
    } else {
      this.state.secondaryVisible = false;
      this._layout(event);
      Vue.nextTick(() => d.resolve());
    }
    return d.promise();
  };

  getDefaultViewPerc(viewName) {
    return this.isPrimaryView(viewName) ? 100 : 50;
  };

  // return the opposite view
  _otherView(viewName) {
    return (viewName === 'map') ? 'content' : 'map';
  };

  _isSecondary(view) {
    return this.state.primaryView !== view;
  };

  _setPrimaryView(viewTag) {
    if (this.state.primaryView !== viewTag) this.state.primaryView = viewTag;
  };

  /**
   * Set the state of content (right or bottom content other than map)
   * @param options
   * @private
   */
  _prepareContentView(options={}) {
    const {title, split=null,
      closable=true, backonclose=true, style={}, showgoback=true, headertools=[]} = options;
    this.state.content.title = title;
    this.state.content.split =  split;
    this.state.content.closable = closable;
    this.state.content.backonclose = backonclose;
    this.state.content.contentsdata = this._components.content.contentsdata;
    this.state.content.style = style;
    this.state.content.headertools = headertools;
    this.state.content.showgoback = showgoback;
  };

  // manage all layout logic
  // viewName: map or content
  //options.  percentage , splitting title etc ..
  _showView(viewName, options={}) {
    const {perc=this.getDefaultViewPerc(viewName), split='h'} = options;
    let aside;
    if (this.isPrimaryView(viewName)) aside = (typeof(options.aside) == 'undefined') ? false : options.aside;
    else aside = true;
    this.state[viewName].aside = aside;
    //calculate the content
    const secondaryPerc = this.isPrimaryView(viewName) ? 100 - perc : perc;
    //show Secondary View content only if more then 0
    if (secondaryPerc > 0) this.showSecondaryView(split, secondaryPerc);
    else return this.closeSecondaryView();
  };

  _getReducedSizes() {
    const contentEl = $('.content');
    let reducedWidth = 0;
    let reducedHeight = 0;
    const sideBarToggleEl = $('.sidebar-aside-toggle');
    if (contentEl && this.state.secondaryVisible && this.isFullViewContent()) {
      if (sideBarToggleEl && sideBarToggleEl.is(':visible')) {
        const toggleWidth = sideBarToggleEl.outerWidth();
        contentEl.css('padding-left', toggleWidth + 5);
        reducedWidth = (toggleWidth - 5);
      }
    } else {
      const toggleWidth = sideBarToggleEl.outerWidth();
      contentEl.css('padding-left', this.state.secondaryPerc === 100 ? toggleWidth + 5 : 15);
    }
    return {
      reducedWidth,
      reducedHeight
    }
  };

  //main layout function
  _layout(event=null) {
    const reducesdSizes = this._getReducedSizes();
    this._setViewSizes(reducesdSizes.reducedWidth, reducesdSizes.reducedHeight);
    if (this._immediateComponentsLayout) this._layoutComponents(event);
  };

  _setViewSizes() {
    const primaryView = this.state.primaryView;
    const secondaryView = this._otherView(primaryView);
    const {width:viewportWidth, height:viewportHeight}= this.getViewportSize();
    // assign all width and height of the view to primary view (map)
    let primaryWidth;
    let primaryHeight;
    let secondaryWidth;
    let secondaryHeight;
    // percentage of secondary view (content)
    const scale = (this.state.secondaryPerc !== 100 && !this.isFullViewContent() ? this.getContentPercentageFromCurrentLayout(this.state.split) : 100) / 100;
    if (this.state.split === 'h') {
      secondaryWidth = this.state.secondaryVisible ? Math.max((viewportWidth * scale), this._secondaryViewMinWidth) : 0;
      secondaryHeight = viewportHeight;
      primaryWidth = viewportWidth - secondaryWidth;
      primaryHeight = viewportHeight;
    } else {
      secondaryWidth = viewportWidth;
      secondaryHeight = this.state.secondaryVisible ? Math.max((viewportHeight * scale),this._secondaryViewMinHeight) : 0;
      primaryWidth = this.state.secondaryVisible && scale === 1 ? 0 : viewportWidth;
      primaryHeight = viewportHeight - secondaryHeight;
    }
    this.state[primaryView].sizes.width = primaryWidth;
    this.state[primaryView].sizes.height = primaryHeight;
    this.state[secondaryView].sizes.width = secondaryWidth;
    this.state[secondaryView].sizes.height = secondaryHeight;
  };

  getViewportSize(){
    return {
      width: this._viewportWidth(),
      height: this._viewportHeight()
    }
  };

  _viewportHeight() {
    const topHeight = $('.navbar-header').innerHeight();
    return $(document).innerHeight() - topHeight;
  };

  _viewportWidth() {
    const main_sidebar = $(".main-sidebar");
    const offset = main_sidebar.length && main_sidebar.offset().left;
    const width = main_sidebar.length && main_sidebar[0].getBoundingClientRect().width;
    const sideBarSpace = width + offset;
    return $('#app')[0].getBoundingClientRect().width - sideBarSpace;
  };

  /**
   * Method that se resize. Is called by moveFnc that is called from resize (vertical or horiziontal) component
   * @param type
   * @param sizes
   * @param perc
   */
  resizeViewComponents(type, sizes={}, perc){
    this.setResized(type, true);
    this.setContentPercentageFromCurrentLayout(type, perc);
    this._layout('resize');
  };

  /**
   * Get current information layout
   * @param type
   * @param perc
   */
  setContentPercentageFromCurrentLayout(type=this.state.split, perc){
    this.getCurrentContentLayout()[type==='h'? 'width': 'height'] = perc;
  };

  getContentPercentageFromCurrentLayout(type= this.state.split){
    return this.getCurrentContentLayout()[type==='h'? 'width': 'height'];
  };

  getCurrentContentLayout(){
    return ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel;
  };

  // load components of  viewport
  // after right size setting
  _layoutComponents(event=null) {
    requestAnimationFrame(() => {
      const reducesdSizes = this._getReducedSizes();
      const reducedWidth = reducesdSizes.reducedWidth || 0;
      const reducedHeight = reducesdSizes.reducedHeight || 0;
      // for each components
      this._setViewSizes();
      Object.entries(this._components).forEach(([name, component]) => {
        const width = this.state[name].sizes.width - reducedWidth ;
        const height = this.state[name].sizes.height - reducedHeight;
        component.layout(width, height);
      });
      event && setTimeout(()=> {
        this.emit(event);
        GUI.emit(event);
      })
    });
  };

  /**
   * function called at start of application (just one time)
   * @private
   */
  _firstLayout() {
    let drawing = false;
    let resizeFired = false;
    function triggerResize() {
      resizeFired = true;
      drawResize();
    }
    /**
     * function called from resize of browser windows (also open dev tool)
     */
    const drawResize = () => {
      if (resizeFired === true) {
        resizeFired = false;
        drawing = true;
        this._layout('resize');
        requestAnimationFrame(drawResize);
      } else {
        drawing = false;
      }
    };
    // GUI ready event
    GUI.on('ready',() => {
      SIDEBARWIDTH = GUI.getSize({element:'sidebar', what:'width'});
      this._layout();
      GUI.on('guiresized',() => triggerResize());
      // resize della window
      $(window).resize(() => {
        // set resizedFired to true and execute drawResize if it's not already running
        drawing === false && triggerResize();
      });
      // resize on main siedemar open close sidebar
      $('.main-sidebar').on('webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd', function (event) {
        //be sure that is the main sidebar that is transitioned non his child
        if (event.target === this) {
          $(this).trigger('trans-end');
          triggerResize();
        }
      });
    });
  };
};



//singleton
const viewportService = new ViewportService;

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
  template,
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
          minHeight: this.state.split === 'v'?  `${viewportConstraints.resize.content.min}px` : null
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

export default  {
  ViewportService: viewportService,
  ViewportComponent
};
