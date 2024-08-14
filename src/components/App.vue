<!--
  @file
  @since v3.7
-->

<template>
  <div
    class      = "wrapper"
    v-disabled = "app.disabled"
  >

    <cookie-law
      theme       = "dark-lime"
      :buttonText = "cookie_law_buttonText"
    >
      <div
        slot="message"
        v-t="'cookie_law.message'">
      </div>

    </cookie-law>

    <header
      v-if  = "!isIframe"
      class = "main-header"
    >

      <!-- NAVBAR TOP (MAIN MENU) -->
      <!-- TODO: extract/refactor into sub-components or move into a dedicated single file component -->
      <!-- NB: additional styles can be found in `header.less` -->
      <nav
        ref   = "navbar"
        class = "navbar navbar-inverse navbar-fixed-top"
        role  = "navigation"
      >

        <div class="container-fluid">

          <div class="navbar-header">

            <!-- ELLIPSIS BUTTON (MAIN MENU) -->
            <button
              ref         = 'navbar_toggle'
              type        = "button"
              class       = "navbar-toggle"
              data-toggle = "collapse"
              data-target = "#main-navbar"
            >
              <i
                style  = "font-size: 1.3em;"
                :class = "g3wtemplate.getFontClass('ellips-v')">
              </i>
            </button>

            <!-- HAMBURGER BUTTON (SIDEBAR MENU) -->
            <a
              id          = "g3w-small-screen-hamburger-sidebar"
              href        = "#"
              class       = "sidebar-toggle"
              data-toggle = "offcanvas"
              role        = "button"
            >
              <i
                style  = "font-size: 1.3em;"
                :class = "g3wtemplate.getFontClass('bars')">
              </i>
            </a>

            <!-- LOGO -->
            <div
              class  = "logo-wrapper"
              :class = "{'mobile': isMobile()}"
            >
              <a
                v-if    = "logo_url"
                :href   = "logo_link"
                :target = "logo_link_target"
                class   = "project_logo_link"
              >
                <img
                  class = "img-responsive"
                  style = "max-width: 250px;"
                  ref   = "img_logo"
                  alt   = ""
                  :src  = "logo_url">
              </a>

              <div
                ref    = "main_title_project_title"
                class  = "project_title_content"
                :class = "{'mobile': isMobile()}"
              >
                <div class = "main_title">{{ main_title }}</div>
                <div class = "sub_title">{{ project_title }}</div>
              </div>
            </div>

          </div>

          <!-- TODO: add description -->
          <div
            ref   = "mainnavbar"
            id    = "main-navbar"
            class = "collapse navbar-collapse"
            style = "text-align: center; overflow: hidden; margin: 0 0;"
          >

            <!-- TODO: add description -->
            <navbarleftitems />

            <!-- TODO: add description -->
            <navbarrightitems />

            <ul
              ref   = "app-navbar-nav"
              class = "nav navbar-nav navbar-right app-navbar-nav"
            >

              <!-- LOGIN -->
              <li
                v-if  = "!user"
                class = "dropdown user user-menu"
              >
                <a :href="login_url">
                  <i
                    :class      = "g3wtemplate.getFontClass('sign-in')"
                    aria-hidden = "true">
                  </i>
                  <span v-t = "'sign_in'"></span>
                </a>
              </li>

              <!-- TODO: add description -->
              <header-item
                v-for                      = "state in custom_header_items_position[0]"
                :key                       = "state.id"
                :state                     = "state"
                @show-custom-modal-content = "showCustomModalContent"
              />

              <!-- CHANGE MAP -->
              <li
                v-if  = "hasRelatedMaps"
                id    = "changemaps"
                class = "dropdown user"
              >
                <a
                  href        = "#"
                  @click.stop = "openChangeMapMenu"
                  class       = "dropdown-toggle"
                  data-toggle = "dropdown"
                >
                  <i
                    :class      = "g3wtemplate.getFontClass('change-map')"
                    aria-hidden = "true">
                  </i>
                  <span v-t="'changemap'"></span>
                </a>
              </li>

              <!-- TODO: add description -->
              <header-item
                v-for                      = "state in custom_header_items_position[1]"
                :key                       = "state.id"
                :state                     = "state"
                @show-custom-modal-content = "showCustomModalContent"
              />

              <!-- ADMIN / LOGOUT -->
              <li
                v-if  = "user"
                class = "dropdown user user-menu"
              >
                <a
                  href        = "#"
                  class       = "dropdown-toggle"
                  data-toggle = "dropdown"
                >
                  <i :class = "g3wtemplate.getFontClass('user')"></i>
                  <span class = "hidden-xs">{{ user.username }}</span>
                </a>

                <ul class = "dropdown-menu">
                  <li class = "user-header">
                    <p>
                      {{ user.first_name }} {{ user.last_name }}
                    </p>
                  </li>
                  <li class = "user-footer">
                    <div
                      v-if  = "user.admin_url"
                      class = "pull-left"
                    >
                      <a
                        :href = "user.admin_url"
                        class = "btn btn-default btn-flat skin-color bold"
                      >
                        <i :class="g3wtemplate.getFontClass('folder')"></i> Admin
                      </a>
                    </div>
                    <div class="pull-right">
                      <a
                        :href = "user.logout_url"
                        class = "btn btn-default btn-flat skin-color bold"
                        v-t   = "'logout'"
                      >
                        <i
                          :class = "g3wtemplate.getFontClass('sign-out')"
                          style  = "margin-right: 2px;">
                        </i>
                      </a>
                    </div>
                  </li>
                </ul>
              </li>

              <!-- TODO: add description -->
              <header-item
                v-for                      = "state in custom_header_items_position[2]"
                :key                       = "state.id"
                :state                     = "state"
                @show-custom-modal-content = "showCustomModalContent"
              />

              <!-- CREDITS -->
              <li class="dropdown user user-menu">
                <a
                  href        = "#"
                  data-toggle = "modal"
                  data-target = "#credits"
                  class       = "dropdown-toggle"
                >
                  <span>Credits</span>
                </a>
              </li>

              <!-- TODO: add description -->
              <header-item
                v-for                      = "state in custom_header_items_position[3]"
                :key                       = "state.id"
                :state                     = "state"
                @show-custom-modal-content = "showCustomModalContent"
              />

              <!-- LANGUAGE SWITCHER -->
              <li v-if="languages" class="g3w-languages">
                <select
                  v-select2          = "'language'"
                  class              = "form-control"
                  :templateSelection = "templateResultLanguages"
                  :templateResult    = "templateResultLanguages"
                  v-model            = "language"
                  style              = "cursor:pointer; width: 130px;"
                >
                  <option
                    v-for     = "lang in languages"
                    :key      = "lang[0]"
                    :value    = "lang[0]"
                    :selected = "lang[0] === language && 'selected'"
                  >
                    {{ lang[1] }}
                  </option>
                </select>
              </li>

              <!-- HOME PAGE -->
              <li
                v-if  = "frontendurl"
                class = "dropdown"
              >
                <a :href="frontendurl">
                  <span>
                    <i :class="g3wtemplate.getFontClass('home')">
                    </i> Home
                  </span>
                </a>
              </li>

              <!-- TODO: add description -->
              <header-item
                v-for                      = "state in custom_header_items_position[4]"
                :key                       = "state.id"
                :state                     = "state"
                @show-custom-modal-content = "showCustomModalContent"
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
      class  = "content-wrapper"
      :style = "{paddingTop: isIframe ? 0 : null}"
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
      class           = "modal fade modal-fullscreen force-fullscreen"
      id              = "full-screen-modal"
      tabindex        = "-1"
      role            = "dialog"
      data-backdrop   = "static"
      data-keyboard   = "false"
      aria-labelledby = "full-screen-modal"
      aria-hidden     = "true">
    </div>
    <!---->
    <div
      id    = "credits"
      class = "modal fade"
    >
      <div
        class = "modal-dialog"
        role  = "document"
      >
        <div class="modal-content">
          <div class="modal-header">
            <button
              type         = "button"
              class        = "close"
              data-dismiss = "modal"
              aria-label   = "Close"
              style        = "color: #ffffff; font-weight: bold; opacity: 1; position: absolute; right: 25px; top: 20px"
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <div style="display: flex; flex-direction: column; justify-content: space-around; justify-items: center; align-items: center">
              <div
                v-if   = "!!customcredits"
                class  = "customcredits"
                v-html = "customcredits"
              >
              </div>

              <div
                v-if="powered_by"
              >
                <div class="g3w-credits-block">
                  <div
                    v-t   = "'credits.g3wSuiteFramework'"
                    style = "background-color: #95ad36; padding: 5px; border-radius:3px; color: #ffffff"
                    class = "credit-title-logo">
                  </div>
                  <a
                    target = "_blank"
                    href   = "https://g3wsuite.it/"
                  >
                    <img
                      class = "g3w-suite-logo"
                      :src  = "g3w_suite_logo"
                      alt   = "">
                  </a>
                  <div
                    v-t  = "'credits.g3wSuiteDescription'"
                    style = "margin-top: 10px;">
                  </div>
                </div>
                <div
                  v-t:pre = "'credits.productOf'"
                  class   = "credit-title-logo g3w-credits-block"
                  style   = "font-size: 1em; display: flex; justify-content: center"
                >
                  <a
                    style  = "text-align: center!important;"
                    href   = "http://www.gis3w.it"
                    target = "_blank"
                  >
                    <img
                      width = "60"
                      style = "margin-left: 5px"
                      :src  = "credits_logo"
                      class = "img-responsive center-block"
                      alt   = "">
                  </a>
                </div>

                <address
                  id    = "address-credits"
                  style = "line-height: 1.3; text-align: center; margin-top: 5px; display: flex; justify-content: center"
                >
                  <span style="padding: 2px">
                    <span
                      style       = "color: #95ad36; font-weight: bold"
                      :class      = "g3wtemplate.getFontClass('marker')"
                      aria-hidden = "true"
                    >
                    </span> Montecatini Terme - Italy
                  </span>

                  <span style="padding: 2px">
                    <span
                      style       = "color: #95ad36"
                      :class      = "g3wtemplate.getFontClass('mobile')"
                      aria-hidden = "true">
                    </span>  +39 393 8534336
                  </span>

                  <span style="padding: 2px">
                    <span
                      style       = "color: #95ad36"
                      :class      = "g3wtemplate.getFontClass('mail')"
                      aria-hidden = "true">
                    </span>
                    <a
                      href  = "mailto:info@gis3w.it"
                      style = "color:#000000"
                    > info@gis3w.it</a>
                  </span>

                </address>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

    <div
      id    = "custom_modal"
      class = "modal fade"
    >
      <div
        class = "modal-dialog"
        role  = "document"
      >
        <div
          class  = "modal-content"
          v-html = "current_custom_modal_content">
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

/**
 * Original source: src/gui/app/layout.js@v3.6
 */
$.LayoutManager = $.LayoutManager || {

  loading(start) {
    $('#initerror').remove();
    if (false !== start) {
      $('body').append(`<div id="startingspinner"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>`)
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
      customcredits                : false,
      appState                     : ApplicationService.getState(),
      current_custom_modal_content : null,
      language                     : null,
      cookie_law_buttonText        : t('cookie_law.buttonText')
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
      const group_name = this.appconfig.group.title || this.appconfig.group.slug;
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
      if (!state.id) { return state.text }
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
      this.current_custom_modal_content = this.custom_modals.find(m => m.id === id).content;
    },

    closePanel() {
      sidebarService.closePanel();
    },

    getLogoLink() {
      return this.appconfig.logo_link ? this.appconfig.logo_link: null;
    },

    /**
     * Display dialog messages on a first page load (on app bootstrap).
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

        if (undefined === data[projectId]) { data[projectId] = [] }

        // check if a current project has already messages stored
        if (undefined !== data[projectId].find(id => id === message.id)) { continue }

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

    'language'(l, cl) {
      if (cl) {
        ApplicationService.changeLanguage(l);
        this.cookie_law_buttonText = t('cookie_law.buttonText');
      }
    }

  },

  beforeCreate() {
    this.delayType = 'debounce';
    this.delayTime = 0;
  },

  created() {
    this.language                     = this.appconfig._i18n.language;
    this.custom_modals                = [];
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
      $.get(this.appconfig.credits).then(c => this.customcredits = c !== 'None' && c);
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

    // Fixes the layout height in case min-height fails.
    const fix = function() {
      //Set the min-height of the content and sidebar based on the height of the document.
      $(".content-wrapper, .right-side").css('min-height', $(window).height() - $('.main-footer').outerHeight());
      $(".content-wrapper, .right-side").css('height',     $(window).height() - $('.main-footer').outerHeight());
      $(".sidebar")                     .css({'height':    ($(window).height() - $(".navbar-header").height()) + "px", 'overflow-y': 'auto'});
    };

    fix();
    $(window, ".wrapper").resize(fix);

    //Enable sidebar tree view controls

    //click event
    $(document).on('click', '.sidebar li a', function (e) {

      // Expand on click for sidebar mini
      if ($('body').hasClass('sidebar-mini') && $("body").hasClass('sidebar-collapse') && $(window).width() > 767) {
        $("body").removeClass('sidebar-collapse');
      }

      //Get the clicked link and the next element
      const $this = $(this);
      //is the content of the "accordion" ul
      const next = $this.next();

      //Check if the next element is a menu and is visible
      if ((next.is('.treeview-menu')) && (next.is(':visible'))) {
        //Close the menu
        next.slideUp('fast', function () {
          next.parent("li.treeview").removeClass("active");
          next.removeClass('menu-open');
        });
      }
      //If the menu is not visible
      else if ((next.is('.treeview-menu')) && (!next.is(':visible'))) {
        //Get the parent menu
        var parent = $this.parents('ul').first();
        //Close all open menus within the parent
        //Remove the menu-open class from the parent
        parent.find('ul.treeview-menu:visible').slideUp('fast').removeClass('menu-open');
        //Get the parent li
        //Open the target menu and add the menu-open class
        next.slideDown('fast', function () {
          //Add the class active to the parent li
          next.addClass('menu-open');
          parent.find('li.treeview.active').removeClass('active');
          $this.parent("li").addClass('active');
          //Fix the layout in case the sidebar stretches over the height of the window
          //Set the min-height of the content and sidebar based on the height of the document.
          $(".content-wrapper, .right-side").css('min-height', $(window).height() - $('.main-footer').outerHeight());
          $(".content-wrapper, .right-side").css('height',     $(window).height() - $('.main-footer').outerHeight());
        });
      }
      //if this isn't a link, prevent the page from being redirected
      if (next.is('.treeview-menu')) {
        e.preventDefault();
      }
    });

    //Enable control sidebar
    //Get the sidebar
    var sidebar = $(".control-sidebar");

    //Listen to the click event
    $("[data-toggle='control-sidebar']").on('click', function (e) {
      e.preventDefault();
      if (!sidebar.hasClass('control-sidebar-open') && !$('body').hasClass('control-sidebar-open')) {
        sidebar.addClass('control-sidebar-open');
      } else {
        sidebar.removeClass('control-sidebar-open');
      }
    });

    //If the body has a boxed layout, fix the sidebar bg position
    const _fix = function(sidebar) {
      if ($("body").hasClass('layout-boxed')) {
        sidebar.css('position', 'absolute');
        sidebar.height($(".wrapper").height());
        $(window).resize(() => _fix(sidebar));
      } else {
        sidebar.css({ 'position': 'fixed', 'height': 'auto' });
      }
    };
    _fix($(".control-sidebar-bg"));

    //If the body has a fixed layout, make the control sidebar fixed
    sidebar.css({ 'position': 'fixed', 'max-height': '100%', 'padding-bottom': '50px' });

    //Add slimscroll to navbar dropdown
    $(".navbar .menu").slimscroll({ height: "200px", alwaysVisible: false, size: "0"}).css("width", "100%");

    //Enable sidebar toggle
    $("[data-toggle='offcanvas']").on('click', function (e) {
      e.preventDefault();

      //Enable sidebar push menu
      if ($(window).width() > 767) {
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

    //Activate box widget
    $(document).on('click', '[data-widget="collapse"]', function (e) {
      e.preventDefault();
      //Find the box parent
      var box = $(this).parents(".box").first();
      //Find the body and the footer
      var box_content = box.find("> .box-body, > .box-footer, > form  >.box-body, > form > .box-footer");
      if (!box.hasClass("collapsed-box")) {
        $(this).find(".btn-collapser").removeClass('fa-minus').addClass('fa-plus'); // Convert minus into plus
        box_content.slideUp('fast', () => box.addClass("collapsed-box"));           // Hide the content
      } else {
        $(this).find(".btn-collapser").removeClass('fa-plus').addClass('fa-minus'); // Convert plus into minus
        box_content.slideDown('fast', () => box.removeClass("collapsed-box"));      // Show the content
      }
    });

    //Listen for remove event triggers
    $(document).on('click', '[data-widget="remove"]', function (e) {
      e.preventDefault();
      $(this).parents(".box").first().slideUp('fast');
    });

    //Activate fast click
    FastClick.attach(document.body);

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

    // fix right sidebar and boxed layout 
    _fix($(".control-sidebar-bg"));
    _fix($(".control-sidebar"));

    $(".control-sidebar") .css('max-height', $(window).innerHeight());
    $('.g3w-sidebarpanel').css('height',     $(window).height() - $("#main-navbar").height());

    $(window).resize(() => {
      $(".control-sidebar")  .css('max-height', $(window).innerHeight());
      $('.g3w-sidebarpanel') .css('height',     $(window).height() - $("#main-navbar").height());
      $('#g3w-modal-overlay').css('height',     $(window).height());
    });

    document.body.classList.toggle('is-mobile', this.isMobile());

  },

};
</script>

<style>
  @keyframes sk-bounce                              { 0%, 100% { transform: scale(0.0); } 50% { transform: scale(1.0); } }
  #startingspinner                                  { position: fixed; z-index: 100000; height: 10em; width: 10em; overflow: show; margin: auto; inset: 0; }
  #startingspinner .double-bounce1,
  #startingspinner .double-bounce2                  { width: 100%; height: 100%; border-radius: 50%; background-color: var(--skin-color); opacity: .6; position: absolute; top: 0; left: 0; animation: sk-bounce 2.0s infinite ease-in-out; }
  #startingspinner .double-bounce2                  { animation-delay: -1.0s; }
  .g3w-modal-project-message.Info .modal-header     { background-color: #0073b7; }
  .g3w-modal-project-message.Warning .modal-header  { background-color: #e99611; }
  .g3w-modal-project-message.Error .modal-header    { background-color: #dd4b39; }
  .g3w-modal-project-message.Critical .modal-header { background-color: #605ca8; }
  .g3w-modal-project-message h4.modal-title         { color: #FFF !important; }
</style>

<style scoped>
  #g3w-small-screen-hamburger-sidebar              { display: none; }

  .logo-wrapper                                    { display: flex; max-height: 50px; height: 50px; font-weight: bold; align-items: center; color: white; }
  .logo-wrapper a.project_logo_link                { height: 46px; padding: 2px; }
  .logo-wrapper a.project_logo_link img            { height: 100%; }
  .project_title_content                           { display:flex; flex-direction: column; justify-content: center; height: 100%; }
  .project_title_content > div                     { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .project_title_content .main_title               { font-size: 1.6em; }
  .project_title_content .sub_title                { font-size: 1.3em; }

  /* TODO: remove isMobile(), use only css @media queries */
  @media (max-width: 767px)                        { .logo-wrapper { padding-left: 5px; } }
  .logo-wrapper.mobile                             { padding: 5px; }
  .logo-wrapper.mobile img                         { height: 23px; max-width: 150px !important; padding-left: 0; margin-right: 5px; }
  .logo-wrapper.mobile .main_title                 { font-size: 1.1em; }
  .logo-wrapper.mobile .sub_title                  { font-size: 1em; }
  .project_title_content.mobile                    { margin-top: 2px; }
  .project_title_content.mobile .sub_title         { height: auto; }

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
  .g3w-languages {
    min-width: 125px;
  }
  @media (max-width: 767px) {
    #g3w-small-screen-hamburger-sidebar { display: block; }
  }
</style>