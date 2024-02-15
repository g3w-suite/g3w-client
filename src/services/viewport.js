/**
 * @file
 * @since v3.7
 */

import ApplicationState                    from 'store/application-state';
import { VIEWPORT as viewportConstraints } from 'app/constant';
import GUI                                 from 'services/gui';
import G3WObject                           from 'core/g3wobject';

const { uniqueId }                         = require('utils');

console.assert(undefined !== GUI, 'GUI is undefined');

class ViewportService extends G3WObject {

  constructor() {

    super();

    /**
     * state of viewport
     */
    this.state = {

      /**
       * primary view (default)
       */
      primaryView: 'map',
      
      /**
       * percentage of secondary view
       * setted to 0 at beginning (not visible)
       */
      secondaryPerc: 0,
      
      /**
        * Whether if content vertical or horizontal (changed on resize)
        */
      resized: {
        start: false,
        'h': false,
        'v': false
      },

      /**
       * splitting orientation (h = horizontal, v = vertical)
       */
      split: 'h',

      /**
       * map 
       */
      map: {
        sizes: {
          width:0,
          height:0
        },
        aside: false
      },

      /**
       * content 
       */
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
        stack: [],            // array of stack content elements
        closable: true,       // (x) is closable
        backonclose: false,   // back on prevoius content
        contentsdata:[],      // content data array
      },

      usermessage: {
        id: null,             // unique id
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
      },

    };

    /**
     * content of viewport (map and content)
     */
    this._components = {
      map: null,
      content: null
    };

    // default contents
    this._defaultMapComponent    = undefined;
    this._contextualMapComponent = undefined;

    // minimun height and width of secondary view
    this._secondaryViewMinWidth     = viewportConstraints.resize.content.min;
    this._secondaryViewMinHeight    =  viewportConstraints.resize.content.min;
    this._immediateComponentsLayout = true;

    this._firstLayout();

  }

  init(options = {}) {
    const {
      primaryview = 'map',
      split       = 'h',
      components,
    } = options;

    // check if it set primary view (map is default)
    this.state.primaryView = primaryview;

    // check splitting property
    this.state.split = split;

    // add component (map and content)
    this._addComponents(components);
  }

  /**
   * set true or false of content 
   */
  setResized(type, bool=false) {
    this.state.resized[type] = bool;
  }

  showUserMessage({
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
    hooks = {}
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
      this.state.usermessage.hooks.header = hooks.header; // vue object or component 
      this.state.usermessage.hooks.body   = hooks.body;   // vue object or component
      this.state.usermessage.hooks.footer = hooks.footer; // vue object or component
    });
    return this.state.usermessage;
  }

  closeUserMessage() {
    this.state.usermessage.id             = null;
    this.state.usermessage.show           = false;
    this.state.usermessage.textMessage    = false;
    this.state.usermessage.message        = '';
  }

  getState() {
    return this.state;
  }

  getMapState() {
    return this.state.map;
  }

  getContentState() {
    return this.state.content;
  }

  setLoadingContent(loading=false) {
    this.state.content.loading = loading;
  };

  /**
   * @param components is an object
   * ```js
   * components = {
   *     map:     new MapComponent({ id: 'map' }),
   *     content: new ContentsComponent({ id: 'contents' })
   * }
   * ```
   */
  _addComponents(components) {
    Object
      .entries(components)
      .forEach(([viewName, component]) => {
        // check if component are map or content
        if (Object.keys(this._components).indexOf(viewName) > -1) {
          component
            .mount(`#g3w-view-${viewName}`, true)
            .then(() => {
              this._components[viewName] = component;
              // set de default component to map if view name is map
              if (viewName === 'map') {
                this._defaultMapComponent = component;
              }
            })
            .fail(err => console.log(err));
        }
      });
  }

  showMap() {
    this._toggleMapComponentVisibility(this._defaultMapComponent,true);
    this._components['map'] = this._defaultMapComponent;
    this._showView('map');
  }

  showContextualMap(options={}) {

    if (!this._contextualMapComponent) {
      this._contextualMapComponent = this._defaultMapComponent;
    }

    if (this._contextualMapComponent != this._defaultMapComponent) {
      this._toggleMapComponentVisibility(this._defaultMapComponent,false);
    }

    if (!this._contextualMapComponent.ismount()) {
      this._contextualMapComponent
        .mount('#g3w-view-map', true)
        .then(() => this._components['map'] = this._contextualMapComponent);
    } else {
      this._components['map'] = this._contextualMapComponent;
      this._toggleMapComponentVisibility(this._contextualMapComponent, true);
    }

    this._showView('map',options);
  }

  // get default component
  recoverDefaultMap() {
    if (this._components['map'] !== this._defaultMapComponent) {
      this._components['map'] = this._defaultMapComponent;
      this._toggleMapComponentVisibility(this._contextualMapComponent, false);
      this._toggleMapComponentVisibility(this._defaultMapComponent, true);
    }
    return this._components['map']
  }

  setContextualMapComponent(mapComponent) {
    if (mapComponent === this._defaultMapComponent) {
      return;
    }
    if (this._contextualMapComponent) {
      this._contextualMapComponent.unmount();
    }
    this._contextualMapComponent = mapComponent;
  }

  resetContextualMapComponent() {
    if (this._contextualMapComponent) {
     this._contextualMapComponent.unmount();
    }
    this._contextualMapComponent = this._defaultMapComponent;
  }

  _toggleMapComponentVisibility(mapComponent,toggle) {
    mapComponent.internalComponent.$el.style.display = toggle ? 'block' : 'none';
  }

  // close map method
  closeMap() {
    this.state.secondaryPerc = ('map' === this.state.primaryView) ? 100 : 0;
    this.recoverDefaultMap();
    this._layout();
  }

   /**
    * Show content of the viewport content
    *  
    * @param options.content (string, jQuery element or Vue component)
    * @param options.title   title of the content
    * @param options.push    (optional, default false): if yes the content is push on top of the stack (contentStack)
    * @param options.split   (optional, default 'h'): 'h' || 'v' splitting map and content orientation
    * @param options.perc    (optional, default 50): percentage of content
    */
  showContent(options={}) {
    options.perc = options.perc !== undefined ? options.perc : this.getContentPercentageFromCurrentLayout();
    options.push = options.push || false;
    this._prepareContentView(options);
    this._immediateComponentsLayout = false;
    this._showView('content', options);
    this._components
      .content
      .setContent(options)
      .then(() => {
        this._immediateComponentsLayout = true;
        this._layoutComponents(100 === options.perc ? 'show-content-full' : 'show-content');
      });
  }

  hideContent(bool) {
    const prevPercentage = this.getContentPercentageFromCurrentLayout(this.state.split);
    this.state.secondaryVisible = !bool;
    this._layout('hide-content');
    return prevPercentage;
  }

  resetToDefaultContentPercentage() {
    const rightpanel = this.getCurrentContentLayout();
    rightpanel[`${this.state.split === 'h'? 'width' : 'height'}`] = rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_default`];
    rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_100`] = false;
    this._layoutComponents();
  }

  toggleFullViewContent() {
    ApplicationState
      .gui
      .layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_100`] = !ApplicationState.gui.layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_100`];
    this._layoutComponents();
  }

  isFullViewContent() {
    return ApplicationState
      .gui
      .layout[ApplicationState.gui.layout.__current]
      .rightpanel[`${this.state.split === 'h'? 'width' : 'height'}_100`]
  };

  /**
   * Number of components on stack
   */
  contentLength() {
    return this.state.content.contentsdata.length;
  }

  /**
   * Remove last element (content) from stack
   */
  popContent() {
    const d = $.Deferred();

    // check if content exist on compontents stack
    if (this.state.content.contentsdata.length) {
      this.recoverDefaultMap();
      const data = this._components.content.getPreviousContentData();
      this._prepareContentView(data.options);
      this._immediateComponentsLayout = false;
      this._showView('content', data.options);
      this._components
        .content
        .popContent()
        .then(() => {
          this.state.secondaryPerc        = data.options.perc;
          this._immediateComponentsLayout = true;
          this._layout('pop-content');
          d.resolve(this._components.contentgetCurrentContentData)
        })
    } else {
      d.reject();
    }

    return d.promise();
  }

  /**
   * Current component data
   */
  getCurrentContent() {
    return this.contentLength() ? this.state.content.contentsdata[this.contentLength() -1] : null;
  }

  getCurrentContentTitle() {
    const content = this.getCurrentContent();
    return content && content.options.title;
  }

  getCurrentContentId() {
    const content = this.getCurrentContent();
    return content && content.options.id;
  }

  changeCurrentContentOptions(options={}) {
    const content          = this.getCurrentContent();
    const { title, crumb } = options;
    if (content && title) content.options.title = title;
    if (content && crumb) content.options.crumb = crumb;
  }

  changeCurrentContentTitle(title='') {
    const content = this.getCurrentContent();
    if (content) content.options.title = title;
  }

  isContentOpen() {
    return !!this.state.content.contentsdata.length;
  }

  // close  content
  closeContent() {
    const d = $.Deferred();

    if (this.isContentOpen()) {
      this._components.content.removeContent();
      this
        .closeSecondaryView('close-content')
        .then(() => { d.resolve(this.recoverDefaultMap()); });
    } else {
      d.resolve(this.recoverDefaultMap());
    }
  
    return d.promise()
  }

  disableContent(disabled) {
    this.state.content.disabled = disabled;
  }

  /**
   * Check `backonclose` proprerty in order to remove
   * all content stack or just last component
   */
  removeContent() {
    if (this.state.content.backonclose && this.state.content.contentsdata.length > 1) {
      this.popContent();
    } else {
      return this.closeContent();
    }
  }

  isPrimaryView(viewName) {
    return this.state.primaryView == viewName;
  }

  setPrimaryView(viewTag) {
    if (this.state.primaryView !== viewTag) {
      this.state.primaryView = viewTag;
    }
    this._layout();
  }

  showPrimaryView(perc=null) {
    if (perc && this.state.secondaryVisible && 100 === this.state.secondaryPerc) {
      this.state.secondaryPerc = 100 - perc;
      this._layout();
    }
  }

  showSecondaryView(split=this.state.split, perc=this.state.perc) {
    this.state.secondaryVisible = true;
    this.state.split            = split;
    this.state.secondaryPerc    = perc;
    this._layout();
  }

  closeSecondaryView(event=null) {
    const d = $.Deferred();

    const component = this._components[this._otherView(this.state.primaryView)];

    if (component.clearContents) {
      component
        .clearContents()
        .then(() => {
          this.state.secondaryVisible = false;
          this.state.secondaryPerc    = 0;
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
  }

  /**
   * return the opposite view
   */
  _otherView(viewName) {
    return ('map' === viewName) ? 'content' : 'map';
  }

  _isSecondary(view) {
    return this.state.primaryView !== view;
  };

  _setPrimaryView(viewTag) {
    if (this.state.primaryView !== viewTag) {
      this.state.primaryView = viewTag;
    }
  }

  /**
   * Set the state of content (right or bottom content other than map)
   */
  _prepareContentView(options={}) {
    const {
      title,
      split       = null,
      closable    = true,
      backonclose = true,
      style       = {},
      showgoback  = true,
      headertools = []
    } = options;
    this.state.content.title        = title;
    this.state.content.split        = split;
    this.state.content.closable     = closable;
    this.state.content.backonclose  = backonclose;
    this.state.content.contentsdata = this._components.content.contentsdata;
    this.state.content.style        = style;
    this.state.content.headertools  = headertools;
    this.state.content.showgoback   = showgoback;
  }


  /**
   * Handle all layout logic
   * 
   * @param { 'map' | 'content' } viewName 
   * @param options.perc  percentage
   * @param options.split splitting title
   * @param options.aside 
   */
  _showView(viewName, options={}) {
    const {
      perc  = this.getDefaultViewPerc(viewName),
      split = 'h'
    } = options;

    this.state[viewName].aside = this.isPrimaryView(viewName)
      ? ('undefined' == typeof(options.aside)) ? false : options.aside
      : true;

      //calculate the content
    const secondaryPerc = this.isPrimaryView(viewName) ? 100 - perc : perc;

    //show Secondary View content only if more then 0
    if (secondaryPerc > 0) {
      this.showSecondaryView(split, secondaryPerc);
    } else {
      return this.closeSecondaryView();
    }
  }

  _getReducedSizes() {
    const contentEl = $('.content');
    const sideBarToggleEl = $('.sidebar-aside-toggle');
    const is_fullview = contentEl && this.state.secondaryVisible && this.isFullViewContent();
    const toggleWidth = sideBarToggleEl.outerWidth();
    if (is_fullview && sideBarToggleEl.is(':visible')) {
      contentEl.css('padding-left', toggleWidth + 5);
      return {
        reducedWidth: (toggleWidth - 5),
        reducedHeight: 0,
      }
    } else {
      contentEl.css('padding-left', 100 === this.state.secondaryPerc ? toggleWidth + 5 : 15);
      return {
        reducedWidth: 0,
        reducedHeight: 0,
      }
    }
  }

  /**
   * main layout function
   */
  _layout(event=null) {
    const reducesdSizes = this._getReducedSizes();
    this._setViewSizes(reducesdSizes.reducedWidth, reducesdSizes.reducedHeight);
    if (this._immediateComponentsLayout) {
      this._layoutComponents(event);
    }
  }

  _setViewSizes() {
    const p                       = this.state.primaryView;  // primary view.
    const s                       = this._otherView(p);      // secondary view.
    const { width: w, height: h } = this.getViewportSize();  // parent viewport (main).

    // percentage of secondary view (content)
    const perc = (
      this.state.secondaryPerc !== 100 && !this.isFullViewContent()
        ? this.getContentPercentageFromCurrentLayout(this.state.split)
        : 100
      ) / 100;

    if ('h' === this.state.split) {
      this.state[s].sizes.width  = this.state.secondaryVisible ? Math.max((w * perc), this._secondaryViewMinWidth) : 0;
      this.state[s].sizes.height = h;
      this.state[p].sizes.height = h;
      this.state[p].sizes.width  = w - this.state[s].sizes.width;

    } else {
      this.state[s].sizes.width  = w;
      this.state[s].sizes.height = this.state.secondaryVisible ? Math.max((h * perc), this._secondaryViewMinHeight) : 0;
      this.state[p].sizes.width  = this.state.secondaryVisible && 1 == perc ? 0 : w;
      this.state[p].sizes.height = h - this.state[s].sizes.height;
    }

  }

  getViewportSize() {
    return {
      width:  this._viewportWidth(),
      height: this._viewportHeight(),
    }
  }

  _viewportHeight() {
    return $(document).innerHeight() - $('.navbar-header').innerHeight();
  }

  _viewportWidth() {
    const main_sidebar = $(".main-sidebar");
    const sideBarSpace = main_sidebar.length && (main_sidebar[0].getBoundingClientRect().width + main_sidebar.offset().left);
    return $('#app')[0].getBoundingClientRect().width - sideBarSpace;
  }

  /**
   * Set resize. (Called by moveFnc on vertical or horiziontal component resize).
   */
  resizeViewComponents(type, sizes={}, perc){
    this.setResized(type, true);
    this.setContentPercentageFromCurrentLayout(type, perc);
    this._layout('resize');
  }

  /**
   * Get current information layout
   */
  setContentPercentageFromCurrentLayout(type = this.state.split, perc) {
    this.getCurrentContentLayout()['h' === type ? 'width' : 'height'] = perc;
  };

  getContentPercentageFromCurrentLayout(type = this.state.split) {
    return this.getCurrentContentLayout()['h' === type ? 'width' : 'height'];
  };

  getCurrentContentLayout() {
    return ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel;
  }

  /**
   * Load viewport components after right size setting
   */
  _layoutComponents(event=null) {
    requestAnimationFrame(() => {
      const delta = this._getReducedSizes();
      const dw = delta.reducedWidth || 0;
      const dh = delta.reducedHeight || 0;
      // For each component
      this._setViewSizes();
      Object
        .entries(this._components)
        .forEach(([name, component]) => {
          component.layout(
            this.state[name].sizes.width - dw,
            this.state[name].sizes.height - dh,
          );
        });
      if (event) {
        setTimeout(() => {
          this.emit(event);
          GUI.emit(event);
        })
      }
    });
  }

  /**
   * Called at start of application (once)
   */
  _firstLayout() {
    let drawing     = false;
    let resizeFired = false;

    function triggerResize() {
      resizeFired = true;
      drawResize();
    }

    /** Called from resize of browser windows (also open dev tool) */
    const drawResize = () => {
      if (true === resizeFired) {
        resizeFired = false;
        drawing     = true;
        this._layout('resize');
        requestAnimationFrame(drawResize);
      } else {
        drawing = false;
      }
    };

    // Wait for GUI ready event
    GUI.on('ready', () => {

      /** Set sidebar width (see: `components/Viewport.vue`) */
      this.SIDEBARWIDTH = GUI.getSize({ element: 'sidebar', what:'width' });

      this._layout();

      GUI.on('guiresized', () => triggerResize());

      // listen for window resize
      $(window).resize(() => { false === drawing && triggerResize(); });
    
      // listend for main sidebar resize (ie. open / close sidebar)
      $('.main-sidebar')
        .on(
          'webkitTransitionEnd transitionend msTransitionEnd oTransitionEnd',
          function (event) {
            // ensure that is the main sidebar that has transitioned (and not a child)
            if (event.target === this) {
              $(this).trigger('trans-end');
              triggerResize();
            }
          }
        );

    });

  }

}

//singleton
export default new ViewportService();