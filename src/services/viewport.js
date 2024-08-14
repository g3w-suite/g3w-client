/**
 * @file
 * @since v3.7
 */

import ApplicationState                    from 'store/application-state';
import { VIEWPORT as viewportConstraints } from 'app/constant';
import GUI                                 from 'services/gui';

const { base, inherit, uniqueId } = require('utils');
const G3WObject                   = require('core/g3wobject');

const ViewportService = function() {
  // state of viewport
  this.state = {
    primaryView:  'map', // primary view (default)
    // percentage of secondary view
    secondaryPerc: 0, // setted to 0 at beginning (not visible)
    // used to store if content vertical or horizontal is  changed by resised
    resized: {
      start: false,
      'h':   false,
      'v':   false
    },
    // splitting orientation (h = horizontal, v = vertical)
    split: 'h',
    //map
    map: {
      sizes: {
        width:  0,
        height: 0
      },
      aside: false
    },
    //content
    content: {
      loading:  false,
      disabled: false,
      sizes: {
        width:  0,
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
      aside:        true,
      showgoback:   true,
      stack:        [], // array elements of stack contents
      closable:     true, // (x) is closable
      backonclose:  false, // back on prevoius content
      contentsdata: [], // content data array
    },
    usermessage: {
      id:          null, // unique identify
      show:        false,
      title:       null,
      message:     null,
      position:    null,
      type:        null,
      draggable:   null,
      cloasable:   null,
      autoclose:   null,
      textMessage: false,
      hooks: {
        header: null,
        body:   null,
        footer: null
      }
    }
  };
  // content of viewport (map and content)
  this._components = {
    map:     null,
    content: null
  };
  // default contents
  this._defaultMapComponent;
  this._contextualMapComponent;

  // minimun height and width of secondary view
  this._secondaryViewMinWidth     = viewportConstraints.resize.content.min;
  this._secondaryViewMinHeight    =  viewportConstraints.resize.content.min;
  this._immediateComponentsLayout = true;
  this.init = function(opts= {}) {
    const { primaryview='map', split='h', components } = opts;
    // check if it set primary view (a map is default)
    this.state.primaryView = primaryview;
    // check splitting property
    this.state.split       = split;
    // add component (map and content)
    this._addComponents(components);
  };

  // Method to set true or false of content
  this.setResized = function (type, bool= false) {
    this.state.resized[type] = bool;
  };

  this.showUserMessage = function({
    title,
    subtitle,
    message,
    type,
    position,
    size,
    draggable,
    duration,
    textMessage = false,
    closable,
    autoclose,
    hooks = {},
    iconClass = null, //@since 3.11.0
  } = {}) {
    this.closeUserMessage();
    setTimeout(() => {
      this.state.usermessage.id           = uniqueId();
      this.state.usermessage.show         = true;
      this.state.usermessage.message      = message;
      this.state.usermessage.textMessage  = textMessage;
      this.state.usermessage.title        = title;
      this.state.usermessage.subtitle     = subtitle;
      this.state.usermessage.position     = position;
      this.state.usermessage.duration     = duration;
      this.state.usermessage.type         = type;
      this.state.usermessage.show         = true;
      this.state.usermessage.size         = size;
      this.state.usermessage.autoclose    = autoclose;
      this.state.usermessage.closable     = closable;
      this.state.usermessage.draggable    = draggable;
      this.state.usermessage.hooks.header = hooks.header; // has to be a vue component or vue object
      this.state.usermessage.hooks.body   = hooks.body; // has to be a vue component or vue object
      this.state.usermessage.hooks.footer = hooks.footer; // has to be a vue component or vue object
      this.state.usermessage.iconClass    = iconClass;
    });
    return this.state.usermessage;
  };

  this.closeUserMessage = function() {
    this.state.usermessage.id          = null;
    this.state.usermessage.show        = false;
    this.state.usermessage.textMessage = false;
    this.state.usermessage.message     = '';
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

  this.setLoadingContent = function(loading= false) {
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
    Object
      .entries(components)
      .forEach(([viewName, component]) => {
        // check if component are map or content
        if (Object.keys(this._components).indexOf(viewName) > -1) {
          component.mount(`#g3w-view-${viewName}`, true)
            .then(() => {
              this._components[viewName] = component;
              // check if view name is map
              if ('map' === viewName) {
                this._defaultMapComponent = component;
              } // set de default component to map
            })
            .fail(e => console.warn(e));
        }
      })
  };

  this.showMap = function() {
    this._toggleMapComponentVisibility(this._defaultMapComponent,true);
    this._components['map'] = this._defaultMapComponent;
    this._showView('map');
  };

  this.showContextualMap = function(options={}) {
    if (!this._contextualMapComponent) {
      this._contextualMapComponent = this._defaultMapComponent;
    }
    if (this._contextualMapComponent != this._defaultMapComponent) {
      this._toggleMapComponentVisibility(this._defaultMapComponent,false);
    }
    if (!this._contextualMapComponent.ismount()) {
      const contextualMapComponent = this._contextualMapComponent;
      contextualMapComponent
        .mount('#g3w-view-map', true)
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
    if (mapComponent === this._defaultMapComponent) {
      return;
    }
    if (this._contextualMapComponent) {
      this._contextualMapComponent.unmount();
    }
    this._contextualMapComponent = mapComponent;
  };

  this.resetContextualMapComponent = function() {
    if (this._contextualMapComponent) {
      this._contextualMapComponent.unmount();
    }
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
  this.hideContent = function(bool) {
    const prevContentPerc = this.getContentPercentageFromCurrentLayout(this.state.split);
    this.state.secondaryVisible = !bool;
    this._layout('hide-content');
    // return previous percentage
    return prevContentPerc;
  };

  this.resetToDefaultContentPercentage = function(){
    const currentRightPanel = this.getCurrentContentLayout();
    currentRightPanel[`${this.state.split === 'h' ? 'width' : 'height'}`] = currentRightPanel[`${this.state.split === 'h' ? 'width' : 'height'}_default`];
    currentRightPanel[`${this.state.split === 'h' ? 'width' : 'height'}_100`] = false;
    this._layoutComponents();
  };

  this.toggleFullViewContent = function(){
    ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h' ? 'width' : 'height'}_100`] = !ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h' ? 'width' : 'height'}_100`];
    this._layoutComponents();
  };

  this.isFullViewContent = function(){
    return ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_100`]
  };

  this.contentLength = function() {
    return this.state.content.contentsdata.length;
  };

  // pull the last element of contentStack
  this.popContent = function() {
    const d = $.Deferred();
    // check if content exists compontent Stack
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
    } else {
      d.reject();
    }
    return d.promise();
  };

  /**
   * Return current compoent data
   * @returns {*}
   */
  this.getCurrentContent = function() {
    return this.contentLength() ? this.state.content.contentsdata[this.contentLength() -1] : null;
  };

  this.getCurrentContentTitle = function(){
    const currentContent = this.getCurrentContent();
    return currentContent && currentContent.options.title;
  };

  this.getCurrentContentId = function(){
    const currentContent = this.getCurrentContent();
    return currentContent && currentContent.options.id;
  };

  this.changeCurrentContentOptions = function(options={}){
    const currentContent = this.getCurrentContent();
    if (currentContent) {
      const {title, crumb} = options;
      if (title) {
        currentContent.options.title = title;
      }
      if (crumb) {
        currentContent.options.crumb = crumb;
      }
    }
  };

  this.changeCurrentContentTitle = function(title=''){
    const currentContent = this.getCurrentContent();
    if (currentContent) {
      currentContent.options.title = title;
    }
  };

  this.isContentOpen = function() {
    return !!this.state.content.contentsdata.length;
  };

  // close  content
  this.closeContent = function() {
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

  this.disableContent = function(disabled){
    this.state.content.disabled = disabled;
  };

  this.removeContent = function() {
    // check if backonclose proprerty is true or false
    // to remove all content stacks or just last component
    if (this.state.content.backonclose && this.state.content.contentsdata.length > 1) {
      this.popContent();
    } else {
      return this.closeContent();
    }
  };

  this.isPrimaryView = function(viewName) {
    return viewName == this.state.primaryView ;
  };

  this.setPrimaryView = function(viewTag) {
    if (viewTag !== this.state.primaryView ) {
      this.state.primaryView = viewTag;
    }
    this._layout();
  };

  this.showPrimaryView = function(perc=null) {
    if (perc && this.state.secondaryVisible && 100 === this.state.secondaryPerc) {
      this.state.secondaryPerc = 100 - perc;
      this._layout();
    }
  };

  this.showSecondaryView = function(split = this.state.split, perc = this.state.perc) {
    this.state.secondaryVisible = true;
    this.state.split = split;
    this.state.secondaryPerc = perc;
    this._layout();
  };

  // close secondary view
  this.closeSecondaryView = function(event = null) {
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
    if (this.state.primaryView !== viewTag) this.state.primaryView = viewTag;
  };

  /**
   * Set the state of content (right or bottom content other than map)
   * @param options
   * @private
   */
  this._prepareContentView = function(options={}) {
    const {
      title,
      split          = null,
      closable    = true,
      backonclose = true,
      style = {},
      showgoback  = true,
      headertools   = [],
    } = options;
    this.state.content.title        = title;
    this.state.content.split        = split;
    this.state.content.closable     = closable;
    this.state.content.backonclose  = backonclose;
    this.state.content.contentsdata = this._components.content.contentsdata;
    this.state.content.style        = style;
    this.state.content.headertools  = headertools;
    this.state.content.showgoback   = showgoback;
  };

  // manage all layout logic
  // viewName: map or content
  //options.  percentage , splitting title etc ..
  this._showView = function(viewName, options={}) {
    const { perc= this.getDefaultViewPerc(viewName), split= 'h' } = options;
    let aside;
    if (this.isPrimaryView(viewName)) {
      aside = (typeof(options.aside) == 'undefined') ? false : options.aside;
    } else {
      aside = true;
    }
    this.state[viewName].aside = aside;
    //calculate the content
    const secondaryPerc = this.isPrimaryView(viewName) ? 100 - perc : perc;
    //show Secondary View content only if more than 0
    if (secondaryPerc > 0)  {
      this.showSecondaryView(split, secondaryPerc);
    } else {
      return this.closeSecondaryView();
    }
  };

  this._getReducedSizes = function() {
    const contentEl = $('.content');
    let reducedWidth  = 0;
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
  this._layout = function(event=null) {
    const reducesdSizes = this._getReducedSizes();
    this._setViewSizes(reducesdSizes.reducedWidth, reducesdSizes.reducedHeight);
    if (this._immediateComponentsLayout) {
      this._layoutComponents(event);
    }
  };

  this._setViewSizes = function() {
    const primaryView   = this.state.primaryView;
    const secondaryView = this._otherView(primaryView);
    const { width: viewportWidth, height: viewportHeight } = this.getViewportSize();
    // assign all width and height of the view to primary view (map)
    let primaryWidth;
    let primaryHeight;
    let secondaryWidth;
    let secondaryHeight;
    // percentage of secondary view (content)
    const scale = (this.state.secondaryPerc !== 100 && !this.isFullViewContent() ? this.getContentPercentageFromCurrentLayout(this.state.split) : 100) / 100;
    if ('h' === this.state.split ) {
      secondaryWidth  = this.state.secondaryVisible ? Math.max((viewportWidth * scale), this._secondaryViewMinWidth) : 0;
      secondaryHeight = viewportHeight;
      primaryWidth    = viewportWidth - secondaryWidth;
      primaryHeight   = viewportHeight;
    } else {
      secondaryWidth  = viewportWidth;
      secondaryHeight = this.state.secondaryVisible ? Math.max((viewportHeight * scale),this._secondaryViewMinHeight) : 0;
      primaryWidth    = this.state.secondaryVisible && scale === 1 ? 0 : viewportWidth;
      primaryHeight   = viewportHeight - secondaryHeight;
    }
    this.state[primaryView].sizes.width    = primaryWidth;
    this.state[primaryView].sizes.height   = primaryHeight;
    this.state[secondaryView].sizes.width  = secondaryWidth;
    this.state[secondaryView].sizes.height = secondaryHeight;
  };

  this.getViewportSize = function(){
    return {
      width: this._viewportWidth(),
      height: this._viewportHeight()
    }
  };

  this._viewportHeight = function() {
    return $(document).innerHeight() - $('.navbar-header').innerHeight();
  };

  this._viewportWidth = function() {
    const main_sidebar  = $(".main-sidebar");
    const offset         = main_sidebar.length && main_sidebar.offset().left;
    const width = main_sidebar.length && main_sidebar[0].getBoundingClientRect().width;
    const sideBarSpace   = width + offset;
    return $('#app')[0].getBoundingClientRect().width - sideBarSpace;
  };

  /**
   * Method that se resize. Is called by moveFnc that is called from resize (vertical or horiziontal) component
   * @param type
   * @param sizes
   * @param perc
   */
  this.resizeViewComponents = function(type, sizes={}, perc){
    this.setResized(type, true);
    this.setContentPercentageFromCurrentLayout(type, perc);
    this._layout('resize');
  };

  /**
   * Get current information layout
   * @param type
   * @param perc
   */
  this.setContentPercentageFromCurrentLayout = function(type=this.state.split, perc){
    this.getCurrentContentLayout()['h' === type ? 'width' : 'height'] = perc;
  };

  this.getContentPercentageFromCurrentLayout = function(type= this.state.split){
    return this.getCurrentContentLayout()['h' === type ? 'width': 'height'];
  };

  this.getCurrentContentLayout = function(){
    return ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel;
  };

  // load components of viewport
  // after right size setting
  this._layoutComponents = function(event=null) {
    requestAnimationFrame(() => {
      const reducesdSizes = this._getReducedSizes();
      const reducedWidth  = reducesdSizes.reducedWidth || 0;
      const reducedHeight = reducesdSizes.reducedHeight || 0;
      // for each component
      this._setViewSizes();
      Object.entries(this._components).forEach(([name, component]) => {
        const width = this.state[name].sizes.width - reducedWidth ;
        const height = this.state[name].sizes.height - reducedHeight;
        component.layout(width, height);
      });
      if (event) {
        setTimeout(() => { this.emit(event); GUI.emit(event); })
      }
    });
  };

  /**
   * function called at the start of application (just one time)
   * @private
   */
  this._firstLayout = function() {
    let drawing     = false;
    let resizeFired = false;
    function triggerResize() {
      resizeFired = true;
      drawResize();
    }
    /**
     * function called from resize of browser windows (also open dev tool)
     */
    const drawResize = () => {
      if (true === resizeFired ) {
        resizeFired = false;
        drawing = true;
        this._layout('resize');
        requestAnimationFrame(drawResize);
      } else {
        drawing = false;
      }
    };
    // GUI ready event
    GUI.on('ready', () => {
      /**
       * SetSidebar width (used by components/Viewport.vue single file component)
       */
      this.SIDEBARWIDTH = GUI.getSize({element:'sidebar', what:'width'});
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
  this._firstLayout();
  base(this);
};

inherit(ViewportService, G3WObject);

//singleton
export default new ViewportService();