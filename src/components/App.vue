<!--
  @file
  @since v3.7
-->

<template>
<div class="wrapper" v-disabled="app.disabled">

  <cookie-law theme="dark-lime" :buttonText="cookie_law_buttonText">
    <div slot="message" v-t="'cookie_law.message'">
    </div>
  </cookie-law>

  <header v-if="!isIframe" class="main-header">

    <!-- NAVBAR TOP (MAIN MENU) -->
    <!-- TODO: extract/refactor into sub-components or move into a dedicated single file component -->
    <!-- NB: additional styles can be found in `header.less` -->
    <nav ref="navbar" class="navbar navbar-inverse navbar-fixed-top" role="navigation">

      <div class="container-fluid">

        <div class="navbar-header">

          <!-- ELLIPSIS BUTTON (MAIN MENU) -->
          <button
            ref='navbar_toggle'
            type="button"
            class="navbar-toggle"
            data-toggle="collapse"
            data-target="#main-navbar"
          >
            <i
              style="font-size: 1.3em;"
              :class="g3wtemplate.getFontClass('ellips-v')">
            </i>
          </button>

          <!-- HAMBURGER BUTTON (SIDEBAR MENU) -->
          <a
            id="g3w-small-screen-hamburger-sidebar"
            href="#"
            class="sidebar-toggle"
            data-toggle="offcanvas"
            role="button"
          >
            <i
              style="font-size: 1.3em;"
              :class="g3wtemplate.getFontClass('bars')">
            </i>
          </a>

          <!-- LOGO -->
          <div
            class="logo-wrapper"
            :class="{'mobile': isMobile()}"
          >
            <a
              v-if="logo_url"
              :href="logo_link"
              :target="logo_link_target"
              class="project_logo_link"
            >
              <img
                class="img-responsive"
                style="max-width: 250px;"
                ref="img_logo"
                :src="logo_url">
            </a>
            <div
              ref="main_title_project_title"
              class="project_title_content"
            >
              <div class="main_title">{{ main_title }}</div>
              <div class="sub_title">{{ project_title }}</div>
            </div>
          </div>

        </div>

        <!-- TODO: add description -->
        <div
          ref="mainnavbar"
          id="main-navbar"
          class="collapse navbar-collapse"
          style="text-align: center; overflow: hidden; margin: 0 0;"
        >

          <!-- TODO: add description -->
          <navbarleftitems />

          <!-- TODO: add description -->
          <navbarrightitems />

          <ul
            ref="app-navbar-nav"
            class="nav navbar-nav navbar-right app-navbar-nav"
          >

            <!-- LOGIN -->
            <li v-if="!user" class="dropdown user user-menu">
              <a :href="login_url">
                <i
                  :class="g3wtemplate.getFontClass('sign-in')"
                  aria-hidden="true">
                </i>
                <span v-t="'sign_in'"></span>
              </a>
            </li>

            <!-- TODO: add description -->
            <header-item
              v-for="state in custom_header_items_position[0]"
              :key="state.id"
              :state="state"
              @show-custom-modal-content="showCustomModalContent"
            />

            <!-- CHANGE MAP -->
            <li
              v-if="hasRelatedMaps"
              id="changemaps"
              class="dropdown user"
            >
              <a
                href="#"
                @click.stop="openChangeMapMenu"
                class="dropdown-toggle"
                data-toggle="dropdown"
              >
                <i
                  :class="g3wtemplate.getFontClass('change-map')"
                  aria-hidden="true">
                </i>
                <span v-t="'changemap'"></span>
              </a>
            </li>

            <!-- TODO: add description -->
            <header-item
              v-for="state in custom_header_items_position[1]"
              :key="state.id"
              :state="state"
              @show-custom-modal-content="showCustomModalContent"
            />

            <!-- ADMIN / LOGOUT -->
            <li
              v-if="user"
              class="dropdown user user-menu"
            >
              <a
                href="#"
                class="dropdown-toggle"
                data-toggle="dropdown"
              >
                <i :class="g3wtemplate.getFontClass('user')"></i>
                <span class="hidden-xs">{{ user.username }}</span>
              </a>
              <ul class="dropdown-menu">
                <li class="user-header">
                  <p>
                    {{ user.first_name }} {{ user.last_name }}
                  </p>
                </li>
                <li class="user-footer">
                  <div
                    v-if="user.admin_url"
                    class="pull-left"
                  >
                    <a
                      :href="user.admin_url"
                      class="btn btn-default btn-flat skin-color bold"
                    >
                      <i :class="g3wtemplate.getFontClass('folder')"></i> Admin
                    </a>
                  </div>
                  <div class="pull-right">
                    <a
                      :href="user.logout_url"
                      class="btn btn-default btn-flat skin-color bold"
                      v-t="'logout'"
                    >
                      <i
                        :class="g3wtemplate.getFontClass('sign-out')"
                        style="margin-right: 2px;">
                      </i>
                    </a>
                  </div>
                </li>
              </ul>
            </li>

            <!-- TODO: add description -->
            <header-item
              v-for="state in custom_header_items_position[2]"
              :key="state.id"
              :state="state"
              @show-custom-modal-content="showCustomModalContent"
            />

            <!-- CREDITS -->
            <li class="dropdown user user-menu">
              <a
                href="#"
                data-toggle="modal"
                data-target="#credits"
                class="dropdown-toggle"
              >
                <span>Credits</span>
              </a>
            </li>

            <!-- TODO: add description -->
            <header-item
              v-for="state in custom_header_items_position[3]"
              :key="state.id"
              :state="state"
              @show-custom-modal-content="showCustomModalContent"
            />

            <!-- LANGUAGE SWITCHER -->
            <li v-if="languages" class="g3w-languages">
              <select
                v-select2="'language'"
                class="form-control"
                :templateSelection="templateResultLanguages"
                :templateResult="templateResultLanguages"
                v-model="language"
                style="cursor:pointer; width: 130px;"
              >
                <option
                  v-for="lang in languages"
                  :key="lang[0]"
                  :value="lang[0]"
                  :selected="lang[0] === language && 'selected'"
                >
                  {{ lang[1] }}
                </option>
              </select>
            </li>

            <!-- HOME PAGE -->
            <li v-if="frontendurl" class="dropdown">
              <a :href="frontendurl">
                <span>
                  <i :class="g3wtemplate.getFontClass('home')">
                  </i> Home
                </span>
              </a>
            </li>

            <!-- TODO: add description -->
            <header-item
              v-for="state in custom_header_items_position[4]"
              :key="state.id"
              :state="state"
              @show-custom-modal-content="showCustomModalContent"
            />

          </ul>

        </div>

      </div>
    </nav>
  </header>

  <!-- Left side column. contains the logo and sidebar -->
  <sidebar></sidebar>
  <!-- Content Wrapper. Contains page content -->
  <div
    class="content-wrapper"
    :style="{paddingTop: isIframe ? 0 : null}"
  >
    <viewport :appState="appState"/>
  </div>
  <!-- /.content-wrapper -->
  <!-- Control Sidebar -->
  <floatbar/>
  <!-- /.control-sidebar -->
  <!-- Add the sidebar's background. This div must be placed
       immediately after the control sidebar -->
  <div class="control-sidebar-bg"></div>
  <!--full screen modal element-->
  <div
    class="modal fade modal-fullscreen force-fullscreen"
    id="full-screen-modal"
    tabindex="-1"
    role="dialog"
    data-backdrop="static"
    data-keyboard="false"
    aria-labelledby="full-screen-modal"
    aria-hidden="true">
  </div>
  <!---->
  <div
    id="credits"
    class="modal fade"
  >
    <div
      class="modal-dialog"
      role="document"
    >
      <div class="modal-content">
        <div class="modal-header">
          <button
            type="button"
            class="close"
            data-dismiss="modal"
            aria-label="Close"
            style="color: #ffffff; font-weight: bold; opacity: 1; position: absolute; right: 25px; top: 20px"
          >
            <span aria-hidden="true">&times;</span>
          </button>
          <div style="display: flex; flex-direction: column; justify-content: space-around; justify-items: center; align-items: center">
            <div
              v-if="!!customcredits"
              class="customcredits"
              v-html="customcredits">
            </div>
            <div v-if="powered_by">
              <div class="g3w-credits-block">
                <div
                  v-t="'credits.g3wSuiteFramework'"
                  style="background-color: #95ad36; padding: 5px; border-radius:3px; color: #ffffff"
                  class="credit-title-logo">
                </div>
                <a
                  target="_blank"
                  href="https://g3wsuite.it/"
                >
                  <img
                    class="g3w-suite-logo"
                    :src="g3w_suite_logo"
                    alt="">
                </a>
                <div
                  v-t="'credits.g3wSuiteDescription'"
                  style="margin-top: 10px;">
                </div>
              </div>
              <div
                v-t:pre ="'credits.productOf'"
                class="credit-title-logo g3w-credits-block"
                style="font-size: 1em; display: flex; justify-content: center"
              >
                <a
                  style="text-align: center!important;"
                  href="http://www.gis3w.it"
                  target="_blank"
                >
                  <img
                    width="60"
                    style="margin-left: 5px"
                    :src="credits_logo"
                    class="img-responsive center-block"
                    alt="">
                </a>
              </div>

              <address
                id="address-credits"
                style="line-height: 1.3; text-align: center; margin-top: 5px; display: flex; justify-content: center"
              >
                <span style="padding: 2px">
                  <span
                    style="color: #95ad36; font-weight: bold"
                    :class="g3wtemplate.getFontClass('marker')"
                    aria-hidden="true">
                  </span> Montecatini Terme - Italy
                </span>
                <span style="padding: 2px">
                  <span
                    style="color: #95ad36"
                    :class="g3wtemplate.getFontClass('mobile')"
                    aria-hidden="true">
                  </span>  +39 393 8534336
                </span>
                <span style="padding: 2px">
                  <span
                    style="color: #95ad36"
                    :class="g3wtemplate.getFontClass('mail')"
                    aria-hidden="true">
                  </span>
                  <a
                    href="mailto:info@gis3w.it"
                    style="color:#000000"> info@gis3w.it</a>
                </span>
              </address>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    id="custom_modal"
    class="modal fade"
  >
    <div
      class="modal-dialog"
      role="document"
    >
      <div
        class="modal-content"
        v-html="current_custom_modal_content">
      </div>
    </div>
  </div>
</div>
</template>

<script>
import CookieLaw          from "vue-cookie-law";
import HeaderItem         from "components/HeaderItem.vue";
import ProjectsRegistry   from "store/projects";
import ApplicationService from "services/application";
import GUI                from "services/gui";
import { resizeMixin }    from "mixins";
import { LOCAL_ITEM_IDS } from "app/constant";

const { uniqueId } = require('utils');
const { t }        = require('core/i18n/i18n.service');

//Make sure jQuery has been loaded before app.js
if (typeof jQuery === "undefined") {
  throw new Error("LayoutManager requires jQuery");
}
/**
 * Original source: src/gui/app/layout.js@v3.6
 */
$.LayoutManager = $.LayoutManager || {

  /* --------------------
   * - LayoutManager Options -
   * --------------------
   * Modify these options to suit your implementation
   */
  options: {
    //Add slimscroll to navbar menus
    //This requires you to load the slimscroll plugin
    //in every page before app.js
    navbarMenuSlimscroll: true,
    navbarMenuSlimscrollWidth: "0px", //The width of the scroll bar
    navbarMenuHeight: "200px", //The height of the inner menu
    //General animation speed for JS animated elements such as box collapse/expand and
    //sidebar treeview slide up/down. This options accepts an integer as milliseconds,
    //'fast', 'normal', or 'slow'
    animationSpeed:'fast',
    //Sidebar push menu toggle button selector
    sidebarToggleSelector: "[data-toggle='offcanvas']",
    //Activate sidebar push menu
    sidebarPushMenu: true,
    //Activate sidebar slimscroll if the fixed layout is set (requires SlimScroll Plugin)
    sidebarSlimScroll: false,
    //Enable sidebar expand on hover effect for sidebar mini
    //This option is forced to true if both the fixed layout and sidebar mini
    //are used together
    sidebarExpandOnHover: false,
    //BoxRefresh Plugin
    enableBoxRefresh: true,
    //Enable Fast Click. Fastclick.js creates a more
    //native touch experience with touch devices. If you
    //choose to enable the plugin, make sure you load the script
    //before LayoutManager's app.js
    enableFastclick: true,
    //Control Sidebar Options
    enableControlSidebar: true,
    controlSidebarOptions: {
      //Which button should trigger the open/close event
      toggleBtnSelector: "[data-toggle='control-sidebar']",
      //The sidebar selector
      selector: ".control-sidebar",
      //Enable slide over content
      slide: true
    },
    //Box Widget Plugin. Enable this plugin
    //to allow boxes to be collapsed and/or removed
    enableBoxWidget: true,
    //Box Widget plugin options
    boxWidgetOptions: {
      boxWidgetIcons: {
        //Collapse icon
        collapse: 'fa-minus',
        //Open icon
        open: 'fa-plus',
        //Remove icon
        remove: 'fa-times'
      },
      boxWidgetSelectors: {
        //Remove button selector
        remove: '[data-widget="remove"]',
        //Collapse button selector
        collapse: '[data-widget="collapse"]'
      }
    },
    //Direct Chat plugin options
    directChat: {
      //Enable direct chat by default
      enable: true,
      //The button to open and close the chat contacts pane
      contactToggleSelector: '[data-widget="chat-pane-toggle"]'
    },
    //Define the set of colors to use globally around the website
    colors: {
      lightBlue: "#3c8dbc",
      red: "#f56954",
      green: "#00a65a",
      aqua: "#00c0ef",
      yellow: "#f39c12",
      blue: "#0073b7",
      navy: "#001F3F",
      teal: "#39CCCC",
      olive: "#3D9970",
      lime: "#01FF70",
      orange: "#FF851B",
      fuchsia: "#F012BE",
      purple: "#8E24AA",
      maroon: "#D81B60",
      black: "#222222",
      gray: "#d2d6de"
    },
    //The standard screen sizes that bootstrap uses.
    //If you change these in the variables.less file, change
    //them here too.
    screenSizes: {
      xs: 480,
      sm: 768,
      md: 992,
      lg: 1200
    }
  },

  /* ----------------------------------
   * - Initialize the LayoutManager Object -
   * ----------------------------------
   * All LayoutManager functions are implemented below.
   */
  _init: function() {
    'use strict';
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
      activate () {
        const _this = this;
        _this.fix();
        _this.fixSidebar();
        $(window, ".wrapper").resize(function () {
          _this.fix();
          _this.fixSidebar();
        });
      },
      fix () {
        //Get window height and the wrapper height
        const neg = $('.main-header').outerHeight() + $('.main-footer').outerHeight();
        const window_height = $(window).height();
        const sidebar_height = $(".sidebar").height();
        //Set the min-height of the content and sidebar based on the
        //the height of the document.
        if ($("body").hasClass("fixed")) {
          $(".content-wrapper, .right-side").css('min-height', window_height - $('.main-footer').outerHeight());
          $(".content-wrapper, .right-side").css('height', window_height - $('.main-footer').outerHeight());
        } else {
          let postSetWidth;
          if (window_height >= sidebar_height) {
            $(".content-wrapper, .right-side").css('min-height', window_height - neg);
            postSetWidth = window_height - neg;
          } else {
            $(".content-wrapper, .right-side").css('min-height', sidebar_height);
            postSetWidth = sidebar_height;
          }
          //Fix for the control sidebar height
          const controlSidebar = $($.LayoutManager.options.controlSidebarOptions.selector);
          if (typeof controlSidebar !== "undefined") {
            if (controlSidebar.height() > postSetWidth) {
              $(".content-wrapper, .right-side").css('min-height', controlSidebar.height());
            }
          }

        }
      },
      fixSidebar () {
        //Make sure the body tag has the .fixed class
        if (!$("body").hasClass("fixed")) {
          if (typeof $.fn.slimScroll != 'undefined') {
            $(".sidebar").slimScroll({destroy: true}).height("auto");
          }
          return;
        } else if (typeof $.fn.slimScroll == 'undefined' && window.console) {
          window.console.error("Error: the fixed layout requires the slimscroll plugin!");
        }
        //Enable slimscroll for fixed layout (sidebar)
        if ($.LayoutManager.options.sidebarSlimScroll && !isMobile.any) {
          if (typeof $.fn.slimScroll != 'undefined') {
            //Destroy if it exists
            $("#g3w-sidebar").slimScroll({destroy: true}).height("auto");
            //Add slimscroll
            $("#g3w-sidebar").slimScroll({
              touchScrollStep: 50,
              height: ($(window).height() - $(".navbar-header").height() - 10) + "px",
              color: "rgba(255,255,255,0.7)",
              size: "3px"
            });
          }
        } else {
          $(".sidebar").css({'height': ($(window).height() - $(".navbar-header").height()) + "px"});
          $(".sidebar").css('overflow-y', 'auto');
        }
      }

    };

    /* PushMenu()
    * ==========
    * Adds the push menu functionality to the sidebar.
    *
    * @type Function
    * @usage: $.LayoutManager.pushMenu("[data-toggle='offcanvas']")
    */
    $.LayoutManager.pushMenu = {
      activate (toggleBtn) {
        //Get the screen sizes
        var screenSizes = $.LayoutManager.options.screenSizes;

        //Enable sidebar toggle
        $(toggleBtn).on('click', function (e) {
          e.preventDefault();

          //Enable sidebar push menu
          if ($(window).width() > (screenSizes.sm - 1)) {
            if ($("body").hasClass('sidebar-collapse')) {
              $("body").removeClass('sidebar-collapse').trigger('expanded.pushMenu');
            } else {
              $("body").addClass('sidebar-collapse').trigger('collapsed.pushMenu');
            }
          }
          //Handle sidebar push menu for small screens
          else {
            if ($("body").hasClass('sidebar-open')) {
              $("body").removeClass('sidebar-open').removeClass('sidebar-collapse').trigger('collapsed.pushMenu');
            } else {
              $("body").addClass('sidebar-open').trigger('expanded.pushMenu');
            }
          }
        });

        /*$(".content-wrapper").click(function () {
          //Enable hide menu when clicking on the content-wrapper on small screens
          if ($(window).width() <= (screenSizes.sm - 1) && $("body").hasClass("sidebar-open")) {
            $("body").removeClass('sidebar-open');
          }
        });*/

        //Enable expand on hover for sidebar mini
        if ($.LayoutManager.options.sidebarExpandOnHover || ($('body').hasClass('fixed') && $('body').hasClass('sidebar-mini'))) {
          this.expandOnHover();
        }
      },
      expandOnHover () {
        const _this = this;
        const screenWidth = $.LayoutManager.options.screenSizes.sm - 1;
        //Expand sidebar on hover
        $('.main-sidebar').hover(function () {
          if ($('body').hasClass('sidebar-mini') && $("body").hasClass('sidebar-collapse') && $(window).width() > screenWidth) {
            _this.expand();
          }
        }, function () {
          if ($('body').hasClass('sidebar-mini') && $('body').hasClass('sidebar-expanded-on-hover') && $(window).width() > screenWidth) {
            _this.collapse();
          }
        });
      },
      expand () {
        $("body").removeClass('sidebar-collapse').addClass('sidebar-expanded-on-hover');
      },
      collapse () {
        if ($('body').hasClass('sidebar-expanded-on-hover')) {
          $('body').removeClass('sidebar-expanded-on-hover').addClass('sidebar-collapse');
        }
      }
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
      const animationSpeed = $.LayoutManager.options.animationSpeed;
      //click event //
      $(document).on('click', menu + ' li a', function (e) {
        //Get the clicked link and the next element
        const $this = $(this);
        //is the content of the "accordion" ul //
        const checkElement = $this.next();

        //Check if the next element is a menu and is visible
        if ((checkElement.is('.treeview-menu')) && (checkElement.is(':visible'))) {
          //Close the menu
          checkElement.slideUp(animationSpeed, function () {
            checkElement.parent("li.treeview").removeClass("active");
            checkElement.removeClass('menu-open');
            //Fix the layout in case the sidebar stretches over the height of the window
            //_this.layout.fix();
          });

        }
        //If the menu is not visible
        else if ((checkElement.is('.treeview-menu')) && (!checkElement.is(':visible'))) {
          //Get the parent menu
          var parent = $this.parents('ul').first();
          var parent_li = $this.parent("li");
          var li_siblings = parent_li.siblings();
          var parent_find_active;
          var sidebar_content_height = parent.height() - parent.find('li.header').outerHeight();
          var treeviewHeight = parent_li.outerHeight();
          li_siblings.not('.header').each(function(index, el) {
                  treeviewHeight+=$(el).find('a').outerHeight();
          });
          var section_height = (sidebar_content_height - treeviewHeight);
          /*checkElement.css({
            'height': section_height + 'px',
            'max-height':section_height + 'px',
            //'overflow-y': 'auto'
          });*/
          //Close all open menus within the parent
          var ul = parent.find('ul.treeview-menu:visible').slideUp(animationSpeed);
          //Remove the menu-open class from the parent
          ul.removeClass('menu-open');
          //Get the parent li
          //Open the target menu and add the menu-open class
          checkElement.slideDown(animationSpeed, function () {
            //Add the class active to the parent li
            checkElement.addClass('menu-open');
            parent_find_active = parent.find('li.treeview.active');
            parent_find_active.removeClass('active');
            parent_li.addClass('active');
            //Fix the layout in case the sidebar stretches over the height of the window
            _this.layout.fix();
          });
        }
        //if this isn't a link, prevent the page from being redirected
        if (checkElement.is('.treeview-menu')) {
          e.preventDefault();
        }

        //$.LayoutManager.layout.fix();
        //$.LayoutManager.layout.fixSidebar();
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
      //instantiate the object
      activate () {
        //Get the object
        var _this = this;
        //Update options
        var o = $.LayoutManager.options.controlSidebarOptions;
        //Get the sidebar
        var sidebar = $(o.selector);
        //The toggle button
        var btn = $(o.toggleBtnSelector);

        //Listen to the click event
        btn.on('click', function (e) {
          e.preventDefault();
          //If the sidebar is not open
          if (!sidebar.hasClass('control-sidebar-open') && !$('body').hasClass('control-sidebar-open')) {
            //Open the sidebar
            _this.open(sidebar, o.slide);
          } else {
            _this.close(sidebar, o.slide);
          }
        });

        //If the body has a boxed layout, fix the sidebar bg position
        var bg = $(".control-sidebar-bg");
        _this._fix(bg);

        //If the body has a fixed layout, make the control sidebar fixed
        if ($('body').hasClass('fixed')) {
          _this._fixForFixed(sidebar);
        } else {
          //If the content height is less than the sidebar's height, force max height
          if ($('.content-wrapper, .right-side').height() < sidebar.height()) {
            _this._fixForContent(sidebar);
          }
        }
      },
      //Open the control sidebar
      open (sidebar, slide) {
        //Slide over content
        if (slide) {
          sidebar.addClass('control-sidebar-open');
        } else {
          //Push the content by adding the open class to the body instead
          //of the sidebar itself
          $('body').addClass('control-sidebar-open');
        }
      },
      //Close the control sidebar
      close (sidebar, slide) {
        if (slide) {
          sidebar.removeClass('control-sidebar-open');
        } else {
          $('body').removeClass('control-sidebar-open');
        }
      },
      _fix (sidebar) {
        var _this = this;
        if ($("body").hasClass('layout-boxed')) {
          sidebar.css('position', 'absolute');
          sidebar.height($(".wrapper").height());
          $(window).resize(function () {
            _this._fix(sidebar);
          });
        } else {
          sidebar.css({
            'position': 'fixed',
            'height': 'auto'
          });
        }
      },
      _fixForFixed (sidebar) {
        sidebar.css({
          'position': 'fixed',
          'max-height': '100%',
          //'overflow': 'auto',  // non dovrebbe fare danni questo commento, serve per non nascondere il pulsanti "Chiudi pannello"
          'padding-bottom': '50px'
        });
      },
      _fixForContent (sidebar) {
        $(".content-wrapper, .right-side").css('min-height', sidebar.height());
      }
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
      activate (_box) {
        var _this = this;
        if (!_box) {
          _box = document; // activate all boxes per default
        }
        //Listen for collapse event triggers
        $(_box).on('click', _this.selectors.collapse, function (e) {
          e.preventDefault();
          _this.collapse($(this));
        });

        //Listen for remove event triggers
        $(_box).on('click', _this.selectors.remove, function (e) {
          e.preventDefault();
          _this.remove($(this));
        });
      },
      collapse (element) {
        var _this = this;
        //Find the box parent
        var box = element.parents(".box").first();
        //Find the body and the footer
        var box_content = box.find("> .box-body, > .box-footer, > form  >.box-body, > form > .box-footer");
        if (!box.hasClass("collapsed-box")) {
          //Convert minus into plus
          element.find(".btn-collapser")
                  .removeClass(_this.icons.collapse)
                  .addClass(_this.icons.open);
          //Hide the content
          box_content.slideUp(_this.animationSpeed, function () {
            box.addClass("collapsed-box");
          });
        } else {
          //Convert plus into minus
          element.find(".btn-collapser")
                  .removeClass(_this.icons.open)
                  .addClass(_this.icons.collapse);
          //Show the content
          box_content.slideDown(_this.animationSpeed, function () {
            box.removeClass("collapsed-box");
          });
        }
      },
      remove (element) {
        //Find the box parent
        var box = element.parents(".box").first();
        box.slideUp(this.animationSpeed);
      }
    };

    return $.LayoutManager;
  },

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
  addRefreshButton() {
    "use strict";

    $.fn.boxRefresh = function (options) {

      // Render options
      var settings = $.extend({
        //Refresh button selector
        trigger: ".refresh-btn",
        //File source to be loaded (e.g: ajax/src.php)
        source: "",
        //Callbacks
        onLoadStart (box) {
          return box;
        }, //Right after the button has been clicked
        onLoadDone (box) {
          return box;
        } //When the source has been loaded

      }, options);

      //The overlay
      var overlay = $('<div class="overlay"><div class="fa fa-refresh fa-spin"></div></div>');

      return this.each(function () {
        //if a source is specified
        if (settings.source === "") {
          if (window.console) {
            window.console.log("Please specify a source first - boxRefresh()");
          }
          return;
        }
        //the box
        var box = $(this);
        //the button
        var rBtn = box.find(settings.trigger).first();

        //On trigger click
        rBtn.on('click', function (e) {
          e.preventDefault();
          //Add loading overlay
          start(box);

          //Perform ajax call
          box.find(".box-body").load(settings.source, function () {
            done(box);
          });
        });
      });

      function start(box) {
        //Add overlay and loading img
        box.append(overlay);

        settings.onLoadStart.call(box);
      }

      function done(box) {
        //Remove overlay and loading img
        box.find(overlay).remove();

        settings.onLoadDone.call(box);
      }

    };
    return $.LayoutManager;
  },

  /*
   * EXPLICIT BOX ACTIVATION
   * -----------------------
   * This is a custom plugin to use with the component BOX. It allows you to activate
   * a box inserted in the DOM after the app.js was loaded.
   *
   * @type plugin
   * @usage $("#box-widget").activateBox();
   */
  activateBox() {
    'use strict';

    $.fn.activateBox = function () {
      $.LayoutManager.boxWidget.activate(this);
    };

    return $.LayoutManager;
  },

  /*
   * TODO LIST CUSTOM PLUGIN
   * -----------------------
   * This plugin depends on iCheck plugin for checkbox and radio inputs
   *
   * @type plugin
   * @usage $("#todo-widget").todolist( options );
   */
  listCustomPlugin() {
    'use strict';

    $.fn.todolist = function (options) {
      // Render options
      var settings = $.extend({
        //When the user checks the input
        onCheck (ele) {
          return ele;
        },
        //When the user unchecks the input
        onUncheck (ele) {
          return ele;
        }
      }, options);

      return this.each(function () {

        if (typeof $.fn.iCheck != 'undefined') {
          $('input', this).on('ifChecked', function () {
            var ele = $(this).parents("li").first();
            ele.toggleClass("done");
            settings.onCheck.call(ele);
          });

          $('input', this).on('ifUnchecked', function () {
            var ele = $(this).parents("li").first();
            ele.toggleClass("done");
            settings.onUncheck.call(ele);
          });
        } else {
          $('input', this).on('change', function () {
            var ele = $(this).parents("li").first();
            ele.toggleClass("done");
            if ($('input', ele).is(":checked")) {
              settings.onCheck.call(ele);
            } else {
              settings.onUncheck.call(ele);
            }
          });
        }
      });
    };
    return $.LayoutManager;
  },

  /* ------------------
   * - Implementation -
   * ------------------
   * The next block of code implements LayoutManager's
   * functions and plugins as specified by the
   * options above.
   */
  setup() {
    "use strict";

    //Fix for IE page transitions
    $("body").removeClass("hold-transition");

    //Extend options if external options exist
    if (typeof LayoutManagerOptions !== "undefined") {
      $.extend(true,
              $.LayoutManager.options,
              LayoutManagerOptions);
    }

    //Easy access to options
    var o = $.LayoutManager.options;

    //Set up the object
    $.LayoutManager._init();

    //Activate the layout maker
    $.LayoutManager.layout.activate();

    //Enable sidebar tree view controls
    $.LayoutManager.tree('.sidebar');

    //Enable control sidebar
    if (o.enableControlSidebar) {
      $.LayoutManager.controlSidebar.activate();
    }

    //Add slimscroll to navbar dropdown
    if (o.navbarMenuSlimscroll && typeof $.fn.slimscroll != 'undefined') {
      $(".navbar .menu").slimscroll({
        height: o.navbarMenuHeight,
        alwaysVisible: false,
        size: o.navbarMenuSlimscrollWidth
      }).css("width", "100%");
    }

    //Activate sidebar push menu
    if (o.sidebarPushMenu) {
      $.LayoutManager.pushMenu.activate(o.sidebarToggleSelector);
    }

    //Activate box widget
    if (o.enableBoxWidget) {
      $.LayoutManager.boxWidget.activate();
    }

    //Activate fast click
    if (o.enableFastclick && typeof FastClick != 'undefined') {
      FastClick.attach(document.body);
    }

    //Activate direct chat widget
    if (o.directChat.enable) {
      $(document).on('click', o.directChat.contactToggleSelector, function () {
        var box = $(this).parents('.direct-chat').first();
        box.toggleClass('direct-chat-contacts-open');
      });
    }

    /*
     * INITIALIZE BUTTON TOGGLE
     * ------------------------
     */
    $('.btn-group[data-toggle="btn-toggle"]').each(function () {
      var group = $(this);
      $(this).find(".btn").on('click', function (e) {
        group.find(".btn.active").removeClass("active");
        $(this).addClass("active");
        e.preventDefault();
      });

    });

    return $.LayoutManager
      .addRefreshButton()
      .activateBox()
      .listCustomPlugin();
  },

  loading(start) {
    $('#initerror').remove();
    start = _.isBoolean(start) ? start : true;
    if (start) {
      $('body').append(`
          <div id="startingspinner">
          <div class="double-bounce1"></div>
          <div class="double-bounce2"></div>
          </div>`
      )
    } else {
      $('#startingspinner').remove();
    }
  },

};

const layout = $.LayoutManager;

export default {

  /** @since 3.8.6 */
  name: 'app',

  mixins: [resizeMixin],

  data() {
    return {
      customcredits: false,
      appState: ApplicationService.getState(),
      current_custom_modal_content: null,
      language: null,
      cookie_law_buttonText: t('cookie_law.buttonText')
    }
  },

  components: {
    HeaderItem,
    CookieLaw
  },

  computed: {

    app() {
      return this.appState.gui.app;
    },

    languages() {

      /***
       * check if the length of languages is more than one
       */
      const languages = Array.isArray(this.appconfig.i18n) && this.appconfig.i18n || [];
      return languages.length > 1 && languages;
    },

    currentProject() {
      return ProjectsRegistry.getCurrentProject();
    },

    appconfig() {
      return ApplicationService.getConfig();
    },

    isIframe() {
      return !!this.appconfig.group.layout.iframe;
    },

    urls() {
      return this.appconfig.urls;
    },

    staticurl() {
      return this.urls.staticurl;
    },

    powered_by() {
      return this.appconfig.group.powered_by;
    },

    clienturl() {
      return this.urls.clienturl;
    },

    g3w_suite_logo() {
      return `${this.clienturl}images/g3wsuite_logo.png`;
    },

    credits_logo() {
      return `${this.clienturl}images/logo_gis3w_156_85.png`;
    },

    logo_url() {
      const logo_project_url = this.currentProject.getThumbnail();
      return logo_project_url ? logo_project_url : `${this.appconfig.mediaurl}${this.appconfig.logo_img}`;
    },

    logo_link() {
      const logo_link = this.getLogoLink();
      return logo_link ? logo_link : "#";
    },

    logo_link_target() {
      const logo_link = this.getLogoLink();
      return logo_link ? "_blank" : "";
    },

    project_title() {
      return this.currentProject.getState().name;
    },

    user() {
      return (this.appconfig.user && this.appconfig.user.username) ? this.appconfig.user : null;
    },

    login_url() {
      return this.appconfig.user.login_url
    },

    /**
     * @deprecated since 3.8.0. will be removed in 3.9.0. Use `hasRelatedMaps` instead
     */
    numberOfProjectsInGroup() {
      return this.appconfig.projects.length;
    },

    /**
     * @returns {boolean} whether it should list any related projects or maps.
     *
     * @since 3.8.0
     */
    hasRelatedMaps() {
      return this.appconfig.macrogroups.length + this.appconfig.groups.length + this.appconfig.projects.length > 1;
    },

    frontendurl() {
      return this.urls.frontendurl;
    },

    main_title() {
      const main_title = this.appconfig.main_map_title;
      const group_name = this.appconfig.group.name || this.appconfig.group.slug;
      return main_title ? `${main_title} - ${group_name}` : group_name;
    },

  },

  methods: {

    /**
     * Language switcher item template (select2)
     * 
     * @TODO find out how to replace `justify-content: space-around` with `justify-content: center` (it's really weird on mobile)
     */
    templateResultLanguages(state) {
      if (!state.id) {
        return state.text;
      }
      return $(/*html*/`
        <div style="font-weight: bold; display:flex; align-items: center; justify-content: space-around;">
          <img src="${this.staticurl}img/flags/${state.element.value.toLowerCase()}.png" />
          <span style="margin-left: 5px;">${state.text}</span> 
        </span>`
      );
    },

    async resize() {
      if (!this.isIframe) {
        await this.$nextTick();
        const max_width = this.$refs.navbar_toggle.offsetWidth > 0 ? this.$refs.navbar.offsetWidth - this.$refs.navbar_toggle.offsetWidth :
          this.$refs.mainnavbar.offsetWidth - this.$refs['app-navbar-nav'].offsetWidth;
        this.$refs.main_title_project_title.style.maxWidth = `${max_width - this.logoWidth - 15}px`;
      }
    },

    showCustomModalContent(id) {
      const { content } = this.custom_modals.find(custommodal => custommodal.id === id);
      this.current_custom_modal_content = content;
    },

    closePanel() {
      sidebarService.closePanel();
    },

    getLogoLink() {
      return this.appconfig.logo_link ? this.appconfig.logo_link: null;
    },

    /**
     * @deprecated since 3.8.0. will be removed in 3.9.0. Use `openChangeMapMenu` instead.
     */
    openProjectsMenu() {
      GUI.openProjectsMenu();
    },

    /**
     * Display dialog messages on first page load (on app bootstrap).
     * 
     * @since 3.8.0
     */
    async initDialogMessages() {
      const messages = this.currentProject.getMessages();
      
      // no messages to show
      if (!messages) {
        return;
      }

      const projectId = this.currentProject.getId();

      for (let i =0; i < messages.items.length; i++) {
        const message = messages.items[i];
        const data    = ApplicationService.getLocalItem(LOCAL_ITEM_IDS.MESSAGES.id) || LOCAL_ITEM_IDS.MESSAGES.value;

        if (undefined === data[projectId]) {
          data[projectId] = [];
        }

        // check if a current project has already messages stored
        if (undefined !== data[projectId].find(id => id === message.id)) {
          continue;
        }

        // create "Do Not Show Again" component
        const doNotShowAgainVueComponent = new (Vue.extend({
          data: () => ({ id: uniqueId(), checked: false }),
          template: `
            <div style="display: flex; margin-top: 10px;">
              <input :id="id"
                v-model="checked"
                class="magic-checkbox"
                type="checkbox"/>
              <label :for="id" v-t="'dont_show_again'"/>
            </div>
          `
        }));
    
        // create content message div
        const content = document.createElement('div');
        // create dom element message from body html string from server
        content.append(...(new DOMParser()).parseFromString(message.body, 'text/html').body.childNodes);
        // append input don't show again checkbox vue component
        content.append(doNotShowAgainVueComponent.$mount().$el);

        // show a modal window
        await new Promise((resolve) => {
          GUI.showModalDialog({
            title: message.title,
            message: content,
            size: 'large',
            closeButton: false,
            className: `g3w-modal-project-message ${Object.entries(messages.levels).find(([key, value]) => value === message.level)[0]}`,
            buttons: {
              close: {
                label: t('close'),
                className: 'btn-secondary',
                callback: () => {
                  // update locale storage if "Do Not Show Again" checkbox is checked 
                  if (doNotShowAgainVueComponent.checked) {
                    data[projectId].push(message.id);
                    ApplicationService.setLocalItem({ id: LOCAL_ITEM_IDS.MESSAGES.id, data })
                  }
                  resolve();
                }
              },
            }
          })
        })

      }

    },

    /**
     * @since 3.8.0
     */
    openChangeMapMenu() {
      GUI.openChangeMapMenu();
    },

  },

  watch: {

    'language'(language, currentlanguage) {
      if (currentlanguage) {
        ApplicationService.changeLanguage(language);
        this.cookie_law_buttonText = t('cookie_law.buttonText');
      }
    }

  },

  beforeCreate() {
    this.delayType = 'debounce';
    this.delayTime = 0;
  },

  created() {
    this.language = this.appconfig._i18n.language;
    this.custom_modals = [];
    this.custom_header_items_position = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: []
    };

    this.customlinks = Array.isArray(this.appconfig.header_custom_links)
      ? this.appconfig.header_custom_links
        .filter(customitem => {
          if (customitem !== null) {
            const id = customitem.id = uniqueId();
            customitem.type === 'modal' && this.custom_modals.push({ id, content: customitem.content });
            let position = 1*(customitem.position || 0);
            position = position > 4 ? 4 : position < 0 || Number.isNaN(position)? 0 : position;
            this.custom_header_items_position[position].push(customitem);
            return true
          }
          return false;
        })
      : [];

    if (!!this.appconfig.credits) {
      $.get(this.appconfig.credits).then(credits=> this.customcredits = credits !== 'None' && credits);
    }
  },

  async mounted() {

    //check if show Project messages when app is mounted
    this.initDialogMessages();

    this.logoWidth = 0;

    await this.$nextTick();

    const rightNavBarElements = !this.isIframe ? this.$refs.mainnavbar.getElementsByTagName('ul') : [];

    const elementLenght = rightNavBarElements.length;

    this.rightNavbarWidth = 15; // margin right

    for (let i = 0; i < elementLenght; i++ ) {
      this.rightNavbarWidth+= rightNavBarElements.item(i).offsetWidth;
    }

    this.language = this.appconfig.user.i18n;

    await this.$nextTick();

    // add some marging to the logo
    if (!this.isIframe) {
      this.$refs.img_logo.addEventListener('load', () => {
        this.logoWidth = this.$refs.img_logo.offsetWidth + 15;
        this.resize()
      }, { once: true });
    }

    // start to render LayoutManager layout
    layout.loading(false);
    layout.setup();

    // fix right sidebar and boxed layout 
    layout.pushMenu.expandOnHover();
    layout.controlSidebar._fix($(".control-sidebar-bg"));
    layout.controlSidebar._fix($(".control-sidebar"));

    function setFloatBarMaxHeight() {
      $(layout.options.controlSidebarOptions.selector).css('max-height',$(window).innerHeight());
      $('.g3w-sidebarpanel').css('height',$(window).height() - $("#main-navbar").height());
    }
    setFloatBarMaxHeight();

    $(window).resize(() => {
      setFloatBarMaxHeight();
      $('#g3w-modal-overlay').css('height',$(window).height());
    });

    document.body.classList.toggle('is-mobile', this.isMobile());

  },

};
</script>

<style>
.g3w-modal-project-message.Info .modal-header     { background-color: #0073b7; }
.g3w-modal-project-message.Warning .modal-header  { background-color: #e99611; }
.g3w-modal-project-message.Error .modal-header    { background-color: #dd4b39; }
.g3w-modal-project-message.Critical .modal-header { background-color: #605ca8; }
.g3w-modal-project-message h4.modal-title         { color: #FFF !important; }
</style>

<style scoped>
.credit-title-logo {
  font-weight: bold;
  font-size: 1.2em;
  margin-bottom: 15px;
}
.g3w-credits-block {
  text-align: center!important;
  margin-bottom: 20px;
}
.g3w-suite-logo {
  width: 50% !important;
}
.customcredits {
  margin-bottom : 10px;
  margin-top: 5px;
}
#address-credits span {
  padding-left: 3px;
}
</style>