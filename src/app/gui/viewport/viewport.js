import {viewport as viewportConstraints} from 'gui/constraints';
import userMessage from 'gui/usermessage/vue/usermessage.vue';
import onlineNotify from 'gui/notifications/online/vue/online.vue';
import downloadNotify from 'gui/notifications/download/vue/download.vue';
import pluginsNotify from 'gui/notifications/plugins/vue/plugins.vue';
const {base, inherit, uniqueId} = require('core/utils/utils');
const G3WObject = require('core/g3wobject');
const GUI = require('gui/gui');
let SIDEBARWIDTH;

// calsse servizio della viewport
const ViewportService = function() {
  // state of viewport
  this.state = {
    primaryView: 'map', // primary view (default)
    // percentage of secondary view
    secondaryPerc: 0,
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
      sizes: {
        width: 0,
        height: 0
      },
      resize: {
        'h': {
          perc: 0
        },
        'v': {
          perc:0
        }
      },
      aside: true,
      showgoback: true,
      stack: [], // array elements of  stack contents
      closable: true, // (x) is closable
      backonclose: false, // back on prevoius content
      contentsdata:[] // content data array
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
  // attributo che serve per
  this._immediateComponentsLayout = true;
  /* PLUBILC INTARFACE */
  this.init = function(options={}) {
    // check if it set primary view (map is default)
    this.state.primaryView = options.primaryview ? options.primaryview : 'map';
    // check splitting property
    this.state.split = options.split ? options.split : 'h';
    // add component (map and content)
    const { components } = options;
    this._addComponents(components);
  };

  this.setResized = function (type, bool=false) {
    this.state.resized[type] = bool;
  };

  this.showUserMessage = function({title, message, type, position, size, draggable, duration, textMessage=false, closable, autoclose, hooks={}}={}) {
    this.closeUserMessage();
    setTimeout(() => {
      this.state.usermessage.id = uniqueId();
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

  this.closeUserMessage = function() {
    this.state.usermessage.id = null;
    this.state.usermessage.show = false;
    this.state.usermessage.textMessage = false;
    this.state.usermessage.message = '';
  };

  this.getState = function() {
    return this.state;
  };

  this.getMapState = function() {
    return this.state.map;
  };

  this.getContentState = function() {
    return this.state.content;
  };

  this.setLoadingContent = function(loading=false) {
    this.state.content.loading = loading;
  };

  this._addComponents = function(components) {
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

  this.showMap = function() {
    this._toggleMapComponentVisibility(this._defaultMapComponent,true);
    this._components['map'] = this._defaultMapComponent;
    this._showView('map');
  };

  this.showContextualMap = function(options) {
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
  this.recoverDefaultMap = function() {
    if (this._components['map'] !== this._defaultMapComponent) {
      this._components['map'] = this._defaultMapComponent;
      this._toggleMapComponentVisibility(this._contextualMapComponent, false);
      this._toggleMapComponentVisibility(this._defaultMapComponent, true);
    }
    return this._components['map']
  };

  this.setContextualMapComponent = function(mapComponent) {
    if (mapComponent === this._defaultMapComponent) return;
    if (this._contextualMapComponent) this._contextualMapComponent.unmount();
    this._contextualMapComponent = mapComponent;
  };

  this.resetContextualMapComponent = function() {
    this._contextualMapComponent && this._contextualMapComponent.unmount();
    this._contextualMapComponent = this._defaultMapComponent;
  };

  this._toggleMapComponentVisibility = function(mapComponent,toggle) {
    mapComponent.internalComponent.$el.style.display = toggle ? 'block' : 'none';
  };

  // close map method
  this.closeMap = function() {
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

  this.showContent = function(options={}) {
    // check if push is set
    options.push = options.push || false;
    const evenContentName = options.perc === 100 ? 'show-content-full' : 'show-content';
    // set all content parameters
    this._prepareContentView(options);
    this._immediateComponentsLayout = false;
    this._showView('content', options);
    this._components.content.setContent(options)
      .then(() => {
        this._immediateComponentsLayout = true;
        this._layoutComponents(evenContentName);
      });
  };

  // hide content
  this.hideContent = function(bool, perc) {
    const prevContentPerc = this.state.secondaryPerc;
    this.state.secondaryPerc = !!bool ? 0: perc;
    this.state.secondaryVisible = !bool;
    this._layout('hide-content');
    // return previous percentage
    return prevContentPerc;
  };

  //get content percentage
  this.getContentPercentage = function(){
    return this.state.secondaryPerc;
  };

  this.setContentPercentage = function(perc){
    this.state.secondaryPerc = perc;
    this._layoutComponents();
  };

  this.contentLength = function() {
    return this.state.content.contentsdata.length;
  };

  // pull the last element of contentStack
  this.popContent = function() {
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

  this.isContentOpen = function() {
    return !!this.state.content.contentsdata.length;
  };

  // close  content
  this.closeContent = function() {
    const d = $.Deferred();
    if (this.isContentOpen()) {
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
  
  this.removeContent = function() {
    // check if backonclose proprerty is  true o false
    // to remove all content stack or just last component
    if (this.state.content.backonclose && this.state.content.contentsdata.length > 1) this.popContent();
    else return this.closeContent();
  };

  this.isPrimaryView = function(viewName) {
    return this.state.primaryView == viewName;
  };

  this.setPrimaryView = function(viewTag) {
    if (this.state.primaryView !== viewTag) this.state.primaryView = viewTag;
    this._layout();
  };

  this.showPrimaryView = function(perc=null) {
    if (perc && this.state.secondaryVisible && this.state.secondaryPerc === 100) {
      this.state.secondaryPerc = 100 - perc;
      this._layout();
    }
  };

  this.showSecondaryView = function(split, perc) {
    this.state.secondaryVisible = true;
    this.state.split = split ? split : this.state.split;
    this.state.secondaryPerc = perc ? perc : this.state.perc;
    this._layout();
  };

  // close secondary view
  this.closeSecondaryView = function(event=null) {
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

  this.getDefaultViewPerc = function(viewName) {
    return this.isPrimaryView(viewName) ? 100 : 50;
  };

  // return the opposite view
  this._otherView = function(viewName) {
    return (viewName === 'map') ? 'content' : 'map';
  };

  this._isSecondary = function(view) {
    return this.state.primaryView !== view;
  };

  this._setPrimaryView = function(viewTag) {
    if (this.state.primaryView !== viewTag) {
      this.state.primaryView = viewTag;
    }
  };

  this._prepareContentView = function(options={}) {
    this.state.content.preferredPerc = options.perc || this.getDefaultViewPerc('content');
    this.state.content.title = options.title;
    this.state.content.split =  options.split ? options.split : null;
    this.state.content.closable =  _.isNil(options.closable) ? true : options.closable;
    this.state.content.backonclose = _.isNil(options.backonclose) ? true : options.backonclose;
    this.state.content.contentsdata = this._components.content.contentsdata;
    this.state.content.style = options.style || {};
    this.state.content.showgoback = _.isNil(options.showgoback) ? true : options.showgoback;
  };

  // manage all layout logic
  // viewName: map or content
  //options.  percentage , splitting title etc ..
  this._showView = function(viewName, options={}) {
    const perc = options.perc || this.getDefaultViewPerc(viewName);
    const split = options.split || 'h';
    let aside;
    if (this.isPrimaryView(viewName)) aside = (typeof(options.aside) == 'undefined') ? false : options.aside;
    else aside = true;
    this.state[viewName].aside = aside;
    const secondaryPerc = this.isPrimaryView(viewName) ? 100 - perc : perc;
    if (secondaryPerc > 0) this.showSecondaryView(split, secondaryPerc);
    else return this.closeSecondaryView();
  };

  this._getReducedSizes = function() {
    const contentEl = $('.content');
    let reducedWidth = 0;
    let reducedHeight = 0;
    if (contentEl && this.state.secondaryVisible && this.state.secondaryPerc === 100) {
      const sideBarToggleEl = $('.sidebar-aside-toggle');
      if (sideBarToggleEl && sideBarToggleEl.is(':visible')) {
        const toggleWidth = sideBarToggleEl.outerWidth();
        contentEl.css('padding-left',toggleWidth + 5);
        reducedWidth = (toggleWidth - 5);
      }
    } else contentEl.css('padding-left', 15);
    return {
      reducedWidth,
      reducedHeight
    }
  };

  //main layout function
  this._layout = function(event=null) {
    //const splitClassToAdd = (this.state.split === 'h') ? 'split-h' : 'split-v';
    //const splitClassToRemove =  (this.state.split === 'h') ? 'split-v' : 'split-h';
    //const viewportViewElement = $(".g3w-viewport .g3w-view");
    //viewportViewElement.addClass(splitClassToAdd).removeClass(splitClassToRemove);
    const reducesdSizes = this._getReducedSizes();
    this._setViewSizes(reducesdSizes.reducedWidth,reducesdSizes.reducedHeight);
    if (this._immediateComponentsLayout) this._layoutComponents(event);
  };

  this._setViewSizes = function() {
    const primaryView = this.state.primaryView;
    const secondaryView = this._otherView(primaryView);
    const viewportWidth = this._viewportWidth(); // remove  for zoom in zoom out issue
    //all viewport height
    const viewportHeight = this._viewportHeight();
    // assign all width and height of the view to primary view (map)
    let primaryWidth;
    let primaryHeight;
    let secondaryWidth;
    let secondaryHeight;
    // percentage of secondary view (content)
    const scale = (this.state.secondaryPerc < 100 && this.state.resized[this.state.split] ? this.state.content.resize[this.state.split].perc : this.state.secondaryPerc) / 100;
    if (this.state.split === 'h') {
      secondaryWidth = this.state.secondaryVisible ? Math.max((viewportWidth * scale), this._secondaryViewMinWidth) : 0;
      secondaryHeight = viewportHeight;
      primaryWidth = viewportWidth - secondaryWidth;
      primaryHeight = viewportHeight;
    } else {
      secondaryWidth = viewportWidth;
      secondaryHeight = this.state.secondaryVisible ? Math.max((viewportHeight * scale),this._secondaryViewMinHeight) : 0;
      primaryWidth = viewportWidth;
      primaryHeight = viewportHeight - secondaryHeight;
    }
    this.state[primaryView].sizes.width = primaryWidth;
    this.state[primaryView].sizes.height = primaryHeight;
    this.state[secondaryView].sizes.width = secondaryWidth;
    this.state[secondaryView].sizes.height = secondaryHeight;
  };

  this._viewportHeight = function() {
    const topHeight = $('.navbar-header').innerHeight();
    return $(document).innerHeight() - topHeight;
  };

  this._viewportWidth = function() {
    const main_sidebar = $(".main-sidebar");
    const offset = main_sidebar.length && main_sidebar.offset().left;
    const width = main_sidebar.length && main_sidebar[0].getBoundingClientRect().width;
    const sideBarSpace = width + offset;
    return $('#app')[0].getBoundingClientRect().width - sideBarSpace;
  };

  this.resizeViewComponents = function(type, sizes={}, perc){
    this.setResized(type, true);
    this.state.content.resize[type].perc = perc;
    this._layout('resize');
  };

  // load components of  viewport
  // after right size setting
  this._layoutComponents = function(event=null) {
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
      if (event) setTimeout(()=> {
        this.emit(event);
        GUI.emit(event);
      }, 0)
    });
  };

  this._firstLayout = function() {
    let drawing = false;
    let resizeFired = false;

    function triggerResize() {
      resizeFired = true;
      drawResize();
    }

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
      GUI.on('guiresized',() => {
        triggerResize();
      });
      // resize della window
      $(window).resize(() => {
        // set resizedFired to true and execute drawResize if it's not already running
        if (drawing === false) {
          triggerResize();
        }
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
  this._firstLayout();
  base(this);
};

inherit(ViewportService, G3WObject);

//singleton
const viewportService = new ViewportService;
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
      media: {
        matches: true
      }
    }
  },
  computed: {
    showresize(){
      return this.state.resized.start && this.state.secondaryPerc < 100 && this.state.secondaryPerc > 0
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
      return title;
    },
    contentSmallerThenPreferred() {
      return this.state.secondaryPerc < this.state.content.preferredPerc;
    }
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
  ViewportService: viewportService,
  ViewportComponent
};
