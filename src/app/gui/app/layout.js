// Make sure jQuery has been loaded before app.js
if (typeof jQuery === 'undefined') {
  throw new Error('LayoutManager requires jQuery');
}

$.LayoutManager = {};

/* --------------------
 * - LayoutManager Options -
 * --------------------
 * Modify these options to suit your implementation
 */
$.LayoutManager.options = {
  // Add slimscroll to navbar menus
  // This requires you to load the slimscroll plugin
  // in every page before app.js
  navbarMenuSlimscroll: true,
  navbarMenuSlimscrollWidth: '0px', // The width of the scroll bar
  navbarMenuHeight: '200px', // The height of the inner menu
  // General animation speed for JS animated elements such as box collapse/expand and
  // sidebar treeview slide up/down. This options accepts an integer as milliseconds,
  // 'fast', 'normal', or 'slow'
  animationSpeed: 'fast',
  // Sidebar push menu toggle button selector
  sidebarToggleSelector: "[data-toggle='offcanvas']",
  // Activate sidebar push menu
  sidebarPushMenu: true,
  // Activate sidebar slimscroll if the fixed layout is set (requires SlimScroll Plugin)
  sidebarSlimScroll: false,
  // Enable sidebar expand on hover effect for sidebar mini
  // This option is forced to true if both the fixed layout and sidebar mini
  // are used together
  sidebarExpandOnHover: false,
  // BoxRefresh Plugin
  enableBoxRefresh: true,
  // Enable Fast Click. Fastclick.js creates a more
  // native touch experience with touch devices. If you
  // choose to enable the plugin, make sure you load the script
  // before LayoutManager's app.js
  enableFastclick: true,
  // Control Sidebar Options
  enableControlSidebar: true,
  controlSidebarOptions: {
    // Which button should trigger the open/close event
    toggleBtnSelector: "[data-toggle='control-sidebar']",
    // The sidebar selector
    selector: '.control-sidebar',
    // Enable slide over content
    slide: true,
  },
  // Box Widget Plugin. Enable this plugin
  // to allow boxes to be collapsed and/or removed
  enableBoxWidget: true,
  // Box Widget plugin options
  boxWidgetOptions: {
    boxWidgetIcons: {
      // Collapse icon
      collapse: 'fa-minus',
      // Open icon
      open: 'fa-plus',
      // Remove icon
      remove: 'fa-times',
    },
    boxWidgetSelectors: {
      // Remove button selector
      remove: '[data-widget="remove"]',
      // Collapse button selector
      collapse: '[data-widget="collapse"]',
    },
  },
  // Direct Chat plugin options
  directChat: {
    // Enable direct chat by default
    enable: true,
    // The button to open and close the chat contacts pane
    contactToggleSelector: '[data-widget="chat-pane-toggle"]',
  },
  // Define the set of colors to use globally around the website
  colors: {
    lightBlue: '#3c8dbc',
    red: '#f56954',
    green: '#00a65a',
    aqua: '#00c0ef',
    yellow: '#f39c12',
    blue: '#0073b7',
    navy: '#001F3F',
    teal: '#39CCCC',
    olive: '#3D9970',
    lime: '#01FF70',
    orange: '#FF851B',
    fuchsia: '#F012BE',
    purple: '#8E24AA',
    maroon: '#D81B60',
    black: '#222222',
    gray: '#d2d6de',
  },
  // The standard screen sizes that bootstrap uses.
  // If you change these in the variables.less file, change
  // them here too.
  screenSizes: {
    xs: 480,
    sm: 768,
    md: 992,
    lg: 1200,
  },
};

/* ----------------------------------
 * - Initialize the LayoutManager Object -
 * ----------------------------------
 * All LayoutManager functions are implemented below.
 */
$.LayoutManager._init = function () {
  /* Layout
   * ======
   * Fixes the layout height in case min-height fails.
   *
   * @type Object
   * @usage $.LayoutManager.layout.activate()
   *        $.LayoutManager.layout.fix()
   *        $.LayoutManager.layout.fixSidebar()
   */
  $.LayoutManager.layout = {
    activate() {
      const _this = this;
      _this.fix();
      _this.fixSidebar();
      $(window, '.wrapper').resize(() => {
        _this.fix();
        _this.fixSidebar();
      });
    },
    fix() {
      // Get window height and the wrapper height
      const neg = $('.main-header').outerHeight() + $('.main-footer').outerHeight();
      const window_height = $(window).height();
      const sidebar_height = $('.sidebar').height();
      // Set the min-height of the content and sidebar based on the
      // the height of the document.
      if ($('body').hasClass('fixed')) {
        $('.content-wrapper, .right-side').css('min-height', window_height - $('.main-footer').outerHeight());
        $('.content-wrapper, .right-side').css('height', window_height - $('.main-footer').outerHeight());
      } else {
        let postSetWidth;
        if (window_height >= sidebar_height) {
          $('.content-wrapper, .right-side').css('min-height', window_height - neg);
          postSetWidth = window_height - neg;
        } else {
          $('.content-wrapper, .right-side').css('min-height', sidebar_height);
          postSetWidth = sidebar_height;
        }
        // Fix for the control sidebar height
        const controlSidebar = $($.LayoutManager.options.controlSidebarOptions.selector);
        if (typeof controlSidebar !== 'undefined') {
          if (controlSidebar.height() > postSetWidth) { $('.content-wrapper, .right-side').css('min-height', controlSidebar.height()); }
        }
      }
    },
    fixSidebar() {
      // Make sure the body tag has the .fixed class
      if (!$('body').hasClass('fixed')) {
        if (typeof $.fn.slimScroll !== 'undefined') {
          $('.sidebar').slimScroll({ destroy: true }).height('auto');
        }
        return;
      } if (typeof $.fn.slimScroll === 'undefined' && window.console) {
        window.console.error('Error: the fixed layout requires the slimscroll plugin!');
      }
      // Enable slimscroll for fixed layout (sidebar)
      if ($.LayoutManager.options.sidebarSlimScroll && !isMobile.any) {
        if (typeof $.fn.slimScroll !== 'undefined') {
          // Destroy if it exists
          $('#g3w-sidebar').slimScroll({ destroy: true }).height('auto');
          // Add slimscroll
          $('#g3w-sidebar').slimScroll({
            touchScrollStep: 50,
            height: `${$(window).height() - $('.navbar-header').height() - 10}px`,
            color: 'rgba(255,255,255,0.7)',
            size: '3px',
          });
        }
      } else {
        $('.sidebar').css({ height: `${$(window).height() - $('.navbar-header').height()}px` });
        $('.sidebar').css('overflow-y', 'auto');
      }
    },

  };

  /* PushMenu()
   * ==========
   * Adds the push menu functionality to the sidebar.
   *
   * @type Function
   * @usage: $.LayoutManager.pushMenu("[data-toggle='offcanvas']")
   */
  $.LayoutManager.pushMenu = {
    activate(toggleBtn) {
      // Get the screen sizes
      const { screenSizes } = $.LayoutManager.options;

      // Enable sidebar toggle
      $(toggleBtn).on('click', (e) => {
        e.preventDefault();

        // Enable sidebar push menu
        if ($(window).width() > (screenSizes.sm - 1)) {
          if ($('body').hasClass('sidebar-collapse')) {
            $('body').removeClass('sidebar-collapse').trigger('expanded.pushMenu');
          } else {
            $('body').addClass('sidebar-collapse').trigger('collapsed.pushMenu');
          }
        }
        // Handle sidebar push menu for small screens
        else if ($('body').hasClass('sidebar-open')) {
          $('body').removeClass('sidebar-open').removeClass('sidebar-collapse').trigger('collapsed.pushMenu');
        } else {
          $('body').addClass('sidebar-open').trigger('expanded.pushMenu');
        }
      });

      /* $(".content-wrapper").click(function () {
        //Enable hide menu when clicking on the content-wrapper on small screens
        if ($(window).width() <= (screenSizes.sm - 1) && $("body").hasClass("sidebar-open")) {
          $("body").removeClass('sidebar-open');
        }
      }); */

      // Enable expand on hover for sidebar mini
      if ($.LayoutManager.options.sidebarExpandOnHover || ($('body').hasClass('fixed') && $('body').hasClass('sidebar-mini'))) {
        this.expandOnHover();
      }
    },
    expandOnHover() {
      const _this = this;
      const screenWidth = $.LayoutManager.options.screenSizes.sm - 1;
      // Expand sidebar on hover
      $('.main-sidebar').hover(() => {
        if ($('body').hasClass('sidebar-mini') && $('body').hasClass('sidebar-collapse') && $(window).width() > screenWidth) {
          _this.expand();
        }
      }, () => {
        if ($('body').hasClass('sidebar-mini') && $('body').hasClass('sidebar-expanded-on-hover') && $(window).width() > screenWidth) {
          _this.collapse();
        }
      });
    },
    expand() {
      $('body').removeClass('sidebar-collapse').addClass('sidebar-expanded-on-hover');
    },
    collapse() {
      if ($('body').hasClass('sidebar-expanded-on-hover')) {
        $('body').removeClass('sidebar-expanded-on-hover').addClass('sidebar-collapse');
      }
    },
  };

  /* Tree()
   * ======
   * Converts the sidebar into a multilevel
   * tree view menu.
   *
   * @type Function
   * @Usage: $.LayoutManager.tree('.sidebar')
   */
  $.LayoutManager.tree = function (menu) {
    const _this = this;
    const { animationSpeed } = $.LayoutManager.options;
    // click event //
    $(document).on('click', `${menu} li a`, function (e) {
      // Get the clicked link and the next element
      const $this = $(this);
      // is the content of the "accordion" ul //
      const checkElement = $this.next();

      // Check if the next element is a menu and is visible
      if ((checkElement.is('.treeview-menu')) && (checkElement.is(':visible'))) {
        // Close the menu
        checkElement.slideUp(animationSpeed, () => {
          checkElement.parent('li.treeview').removeClass('active');
          checkElement.removeClass('menu-open');
          // Fix the layout in case the sidebar stretches over the height of the window
          // _this.layout.fix();
        });
      }
      // If the menu is not visible
      else if ((checkElement.is('.treeview-menu')) && (!checkElement.is(':visible'))) {
        // Get the parent menu
        const parent = $this.parents('ul').first();
        const parent_li = $this.parent('li');
        const li_siblings = parent_li.siblings();
        let parent_find_active;
        const sidebar_content_height = parent.height() - parent.find('li.header').outerHeight();
        let treeviewHeight = parent_li.outerHeight();
        li_siblings.not('.header').each((index, el) => {
          treeviewHeight += $(el).find('a').outerHeight();
        });
        const section_height = (sidebar_content_height - treeviewHeight);
        /* checkElement.css({
          'height': section_height + 'px',
          'max-height':section_height + 'px',
          //'overflow-y': 'auto'
        }); */
        // Close all open menus within the parent
        const ul = parent.find('ul.treeview-menu:visible').slideUp(animationSpeed);
        // Remove the menu-open class from the parent
        ul.removeClass('menu-open');
        // Get the parent li
        // Open the target menu and add the menu-open class
        checkElement.slideDown(animationSpeed, () => {
          // Add the class active to the parent li
          checkElement.addClass('menu-open');
          parent_find_active = parent.find('li.treeview.active');
          parent_find_active.removeClass('active');
          parent_li.addClass('active');
          // Fix the layout in case the sidebar stretches over the height of the window
          _this.layout.fix();
        });
      }
      // if this isn't a link, prevent the page from being redirected
      if (checkElement.is('.treeview-menu')) {
        e.preventDefault();
      }

      // $.LayoutManager.layout.fix();
      // $.LayoutManager.layout.fixSidebar();
    });
  };

  /* ControlSidebar
   * ==============
   * Adds functionality to the right sidebar
   *
   * @type Object
   * @usage $.LayoutManager.controlSidebar.activate(options)
   */
  $.LayoutManager.floatBar = $.LayoutManager.controlSidebar = {
    // instantiate the object
    activate() {
      // Get the object
      const _this = this;
      // Update options
      const o = $.LayoutManager.options.controlSidebarOptions;
      // Get the sidebar
      const sidebar = $(o.selector);
      // The toggle button
      const btn = $(o.toggleBtnSelector);

      // Listen to the click event
      btn.on('click', (e) => {
        e.preventDefault();
        // If the sidebar is not open
        if (!sidebar.hasClass('control-sidebar-open') && !$('body').hasClass('control-sidebar-open')) {
          // Open the sidebar
          _this.open(sidebar, o.slide);
        } else {
          _this.close(sidebar, o.slide);
        }
      });

      // If the body has a boxed layout, fix the sidebar bg position
      const bg = $('.control-sidebar-bg');
      _this._fix(bg);

      // If the body has a fixed layout, make the control sidebar fixed
      if ($('body').hasClass('fixed')) {
        _this._fixForFixed(sidebar);
      } else {
        // If the content height is less than the sidebar's height, force max height
        if ($('.content-wrapper, .right-side').height() < sidebar.height()) {
          _this._fixForContent(sidebar);
        }
      }
    },
    // Open the control sidebar
    open(sidebar, slide) {
      // Slide over content
      if (slide) {
        sidebar.addClass('control-sidebar-open');
      } else {
        // Push the content by adding the open class to the body instead
        // of the sidebar itself
        $('body').addClass('control-sidebar-open');
      }
    },
    // Close the control sidebar
    close(sidebar, slide) {
      if (slide) {
        sidebar.removeClass('control-sidebar-open');
      } else {
        $('body').removeClass('control-sidebar-open');
      }
    },
    _fix(sidebar) {
      const _this = this;
      if ($('body').hasClass('layout-boxed')) {
        sidebar.css('position', 'absolute');
        sidebar.height($('.wrapper').height());
        $(window).resize(() => {
          _this._fix(sidebar);
        });
      } else {
        sidebar.css({
          position: 'fixed',
          height: 'auto',
        });
      }
    },
    _fixForFixed(sidebar) {
      sidebar.css({
        position: 'fixed',
        'max-height': '100%',
        // 'overflow': 'auto',  // non dovrebbe fare danni questo commento, serve per non nascondere il pulsanti "Chiudi pannello"
        'padding-bottom': '50px',
      });
    },
    _fixForContent(sidebar) {
      $('.content-wrapper, .right-side').css('min-height', sidebar.height());
    },
  };

  /* BoxWidget
   * =========
   * BoxWidget is a plugin to handle collapsing and
   * removing boxes from the screen.
   *
   * @type Object
   * @usage $.LayoutManager.boxWidget.activate()
   *        Set all your options in the main $.LayoutManager.options object
   */
  $.LayoutManager.boxWidget = {
    selectors: $.LayoutManager.options.boxWidgetOptions.boxWidgetSelectors,
    icons: $.LayoutManager.options.boxWidgetOptions.boxWidgetIcons,
    animationSpeed: $.LayoutManager.options.animationSpeed,
    activate(_box) {
      const _this = this;
      if (!_box) {
        _box = document; // activate all boxes per default
      }
      // Listen for collapse event triggers
      $(_box).on('click', _this.selectors.collapse, function (e) {
        e.preventDefault();
        _this.collapse($(this));
      });

      // Listen for remove event triggers
      $(_box).on('click', _this.selectors.remove, function (e) {
        e.preventDefault();
        _this.remove($(this));
      });
    },
    collapse(element) {
      const _this = this;
      // Find the box parent
      const box = element.parents('.box').first();
      // Find the body and the footer
      const box_content = box.find('> .box-body, > .box-footer, > form  >.box-body, > form > .box-footer');
      if (!box.hasClass('collapsed-box')) {
        // Convert minus into plus
        element.find('.btn-collapser')
          .removeClass(_this.icons.collapse)
          .addClass(_this.icons.open);
        // Hide the content
        box_content.slideUp(_this.animationSpeed, () => {
          box.addClass('collapsed-box');
        });
      } else {
        // Convert plus into minus
        element.find('.btn-collapser')
          .removeClass(_this.icons.open)
          .addClass(_this.icons.collapse);
        // Show the content
        box_content.slideDown(_this.animationSpeed, () => {
          box.removeClass('collapsed-box');
        });
      }
    },
    remove(element) {
      // Find the box parent
      const box = element.parents('.box').first();
      box.slideUp(this.animationSpeed);
    },
  };

  return $.LayoutManager;
};

/* ------------------
 * - Custom Plugins -
 * ------------------
 * All custom plugins are defined below.
 */

/*
 * BOX REFRESH BUTTON
 * ------------------
 * This is a custom plugin to use with the component BOX. It allows you to add
 * a refresh button to the box. It converts the box's state to a loading state.
 *
 * @type plugin
 * @usage $("#box-widget").boxRefresh( options );
 */
$.LayoutManager.addRefreshButton = function () {
  $.fn.boxRefresh = function (options) {
    // Render options
    const settings = $.extend({
      // Refresh button selector
      trigger: '.refresh-btn',
      // File source to be loaded (e.g: ajax/src.php)
      source: '',
      // Callbacks
      onLoadStart(box) {
        return box;
      }, // Right after the button has been clicked
      onLoadDone(box) {
        return box;
      }, // When the source has been loaded

    }, options);

    // The overlay
    const overlay = $('<div class="overlay"><div class="fa fa-refresh fa-spin"></div></div>');

    return this.each(function () {
      // if a source is specified
      if (settings.source === '') {
        if (window.console) {
          window.console.log('Please specify a source first - boxRefresh()');
        }
        return;
      }
      // the box
      const box = $(this);
      // the button
      const rBtn = box.find(settings.trigger).first();

      // On trigger click
      rBtn.on('click', (e) => {
        e.preventDefault();
        // Add loading overlay
        start(box);

        // Perform ajax call
        box.find('.box-body').load(settings.source, () => {
          done(box);
        });
      });
    });

    function start(box) {
      // Add overlay and loading img
      box.append(overlay);

      settings.onLoadStart.call(box);
    }

    function done(box) {
      // Remove overlay and loading img
      box.find(overlay).remove();

      settings.onLoadDone.call(box);
    }
  };
  return $.LayoutManager;
};

/*
 * EXPLICIT BOX ACTIVATION
 * -----------------------
 * This is a custom plugin to use with the component BOX. It allows you to activate
 * a box inserted in the DOM after the app.js was loaded.
 *
 * @type plugin
 * @usage $("#box-widget").activateBox();
 */
$.LayoutManager.activateBox = function () {
  $.fn.activateBox = function () {
    $.LayoutManager.boxWidget.activate(this);
  };

  return $.LayoutManager;
};

/*
 * TODO LIST CUSTOM PLUGIN
 * -----------------------
 * This plugin depends on iCheck plugin for checkbox and radio inputs
 *
 * @type plugin
 * @usage $("#todo-widget").todolist( options );
 */

$.LayoutManager.listCustomPlugin = function () {
	  $.fn.todolist = function (options) {
	    // Render options
	    const settings = $.extend({
	      // When the user checks the input
	      onCheck(ele) {
	        return ele;
	      },
	      // When the user unchecks the input
	      onUncheck(ele) {
	        return ele;
	      },
	    }, options);

	    return this.each(function () {
	      if (typeof $.fn.iCheck !== 'undefined') {
	        $('input', this).on('ifChecked', function () {
	          const ele = $(this).parents('li').first();
	          ele.toggleClass('done');
	          settings.onCheck.call(ele);
	        });

	        $('input', this).on('ifUnchecked', function () {
	          const ele = $(this).parents('li').first();
	          ele.toggleClass('done');
	          settings.onUncheck.call(ele);
	        });
	      } else {
	        $('input', this).on('change', function () {
	          const ele = $(this).parents('li').first();
	          ele.toggleClass('done');
	          if ($('input', ele).is(':checked')) {
	            settings.onCheck.call(ele);
	          } else {
	            settings.onUncheck.call(ele);
	          }
	        });
	      }
	    });
	  };
	  return $.LayoutManager;
};

/* ------------------
	 * - Implementation -
	 * ------------------
	 * The next block of code implements LayoutManager's
	 * functions and plugins as specified by the
	 * options above.
	 */
$.LayoutManager.setup = function () {
	  // Fix for IE page transitions
	  $('body').removeClass('hold-transition');

	  // Extend options if external options exist
	  if (typeof LayoutManagerOptions !== 'undefined') {
	    $.extend(
      true,
	            $.LayoutManager.options,
	            LayoutManagerOptions,
    );
	  }

	  // Easy access to options
	  const o = $.LayoutManager.options;

	  // Set up the object
	  $.LayoutManager._init();

	  // Activate the layout maker
	  $.LayoutManager.layout.activate();

	  // Enable sidebar tree view controls
	  $.LayoutManager.tree('.sidebar');

	  // Enable control sidebar
	  if (o.enableControlSidebar) {
	    $.LayoutManager.controlSidebar.activate();
	  }

	  // Add slimscroll to navbar dropdown
	  if (o.navbarMenuSlimscroll && typeof $.fn.slimscroll !== 'undefined') {
	    $('.navbar .menu').slimscroll({
	      height: o.navbarMenuHeight,
	      alwaysVisible: false,
	      size: o.navbarMenuSlimscrollWidth,
	    }).css('width', '100%');
	  }

	  // Activate sidebar push menu
	  if (o.sidebarPushMenu) {
	    $.LayoutManager.pushMenu.activate(o.sidebarToggleSelector);
	  }

	  // Activate box widget
	  if (o.enableBoxWidget) {
	    $.LayoutManager.boxWidget.activate();
	  }

	  // Activate fast click
	  if (o.enableFastclick && typeof FastClick !== 'undefined') {
	    FastClick.attach(document.body);
	  }

	  // Activate direct chat widget
	  if (o.directChat.enable) {
	    $(document).on('click', o.directChat.contactToggleSelector, function () {
	      const box = $(this).parents('.direct-chat').first();
	      box.toggleClass('direct-chat-contacts-open');
	    });
	  }

	  /*
	   * INITIALIZE BUTTON TOGGLE
	   * ------------------------
	   */
	  $('.btn-group[data-toggle="btn-toggle"]').each(function () {
	    const group = $(this);
	    $(this).find('.btn').on('click', function (e) {
	      group.find('.btn.active').removeClass('active');
	      $(this).addClass('active');
	      e.preventDefault();
	    });
	  });

	  return $.LayoutManager
	  	.addRefreshButton()
	  	.activateBox()
	  	.listCustomPlugin();
};

$.LayoutManager.loading = function (start) {
  $('#initerror').remove();
  start = _.isBoolean(start) ? start : true;
  if (start) {
    $('body').append(`
         <div id="startingspinner">
         <div class="double-bounce1"></div>
         <div class="double-bounce2"></div>
         </div>`);
  } else {
    $('#startingspinner').remove();
  }
};

module.exports = $.LayoutManager;
