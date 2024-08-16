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

    <!-- ORIGINAL SOURCE: src/components/Sidebar.vue@v3.10.1 -->
    <!-- Left side column. contains the logo and sidebar -->
    <aside>
      <div
        class  = "main-sidebar"
        :class = "{ iframe: iframe}"
      >
        <!-- SIDEBAR CONTENT -->
        <div
          id     = "g3w-sidebar"
          class  = "sidebar"
          :class = "{ 'g3w-disabled': disabled }"
        >
          <div id="disable-sidebar"></div>

          <div
            v-show = "panelsinstack"
            class = "g3w-sidebarpanel"
          >
            <div id="g3w-sidebarpanel-header-placeholder">
                <div
                  style  = "display: flex;"
                  :style = "{ justifyContent: sstate.gui.title ? 'space-between' : 'flex-end' }"
                >

                  <h4
                    v-if  = "title"
                    style = "display: inline-block; font-weight: bold"
                    v-t   = "title"
                  ></h4>

                  <div>
                    <span
                      v-if               = "panels.length > 1"
                      @click             = "closePanel"
                      data-placement     = "left"
                      data-toggle        = "tooltip"
                      data-container     = "body"
                      v-t-tooltip.create = "'back'"
                      class              = "skin-tooltip-left g3w-span-button close-pane-button fa-stack"
                    >
                      <i :class = "g3wtemplate.getFontClass('circle')"     class = "fa-stack-1x panel-button"></i>
                      <i :class = "g3wtemplate.getFontClass('arrow-left')" class = "fa-stack-1x panel-icon"></i>
                    </span>
                    <span
                      @click             = "closeAllPanels"
                      data-placement     = "left"
                      data-toggle        = "tooltip"
                      data-container     = "body"
                      v-t-tooltip.create = "'close'"
                      class              = "skin-tooltip-left g3w-span-button close-pane-button fa-stack"
                    >
                      <i :class = "g3wtemplate.getFontClass('circle')" class = "fa-stack-1x panel-button"></i>
                      <i :class = "g3wtemplate.getFontClass('close')"  class = "fa-stack-1x panel-icon"></i>
                    </span>
                  </div>

                </div>
            </div>

            <div
              id    = "g3w-sidebarpanel-placeholder"
              class = "g3w-sidebarpanel-placeholder"
            ></div>
          </div>

          <div id = "g3w-sidebarcomponents-content" >
            <ul
              id     = "g3w-sidebarcomponents"
              v-show = "showmainpanel"
              class  = "sidebar-menu"
              :class = "{ 'g3w-disabled': sstate.disabled }"
            ></ul>
          </div>

        </div>

      </div>
      <!-- TOGGLE BUTTON (desktop only) -->
      <a
        href        = "#"
        class       = "sidebar-aside-toggle"
        :class      = "{ 'g3w-disabled': disabled, 'iframe': iframe}"
        :style      = "{zIndex: zIndex}"
        data-toggle = "offcanvas" role="button">
          <i :class = "g3wtemplate.getFontClass('bars')"></i>
      </a>

    </aside>

    <!-- ORIGINAL SOURCE: src/components/Viewport.vue@v3.10.1 -->
    <!-- Content Wrapper. Contains page content -->
    <div class="content-wrapper">
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
    </div>

    <!-- ORIGINAL SOURCE: src/components/Floatbar.vue@v3.10.1 -->
    <!-- Control Sidebar -->
    <aside class="control-sidebar control-sidebar-light" >
      <a v-show="fpanelsinstack" href="#" class="floatbar-aside-toggle" data-toggle="control-sidebar" role="button">
        <span class="sr-only">Expand</span>
      </a>
      <div id="floatbar-spinner" style="position:absolute"></div>
      <div v-show="fpanelsinstack" class="g3w-sidebarpanel">
        <div v-if="closable" class="row">
          <div class="col-xs-12 col-sm-12 col-md-12">
            <button :class="g3wtemplate.getFontClass('close')" class="pull-right close-panel-button" @click="fclosePanel"></button>
          </div>
        </div>
        <div v-if="fpanelname">
          <h4 class="g3w-floatbarpanel-name">{{ fpanelname }}</h4>
        </div>
        <div id="g3w-floatbarpanel-placeholder" class="g3w-floatbarpanel-placeholder"></div>
      </div>
    </aside>

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

import {
  LOCAL_ITEM_IDS,
  ZINDEXES,
  VIEWPORT as viewportConstraints
}                                from 'app/constant';
import { SidebarEventBus as VM } from 'app/eventbus';
import ApplicationState          from 'store/application-state';
import ProjectsRegistry          from "store/projects";
import ApplicationService        from "services/application";
import GUI                       from "services/gui";
import viewportService           from 'services/viewport';
import sidebarService            from 'services/sidebar';
import floatbarService           from 'services/floatbar';
import { resizeMixin }           from "mixins";

import HeaderItem                from "components/HeaderItem.vue";
import userMessage               from 'components/UserMessage.vue';
import onlineNotify              from 'components/NotifyOnline.vue';
import downloadNotify            from 'components/NotifyDownload.vue';
import pluginsNotify             from 'components/NotifyPlugins.vue';
import getUniqueDomId            from 'utils/getUniqueDomId';

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
      customcredits:                false,
      appState:                     ApplicationService.getState(),
      current_custom_modal_content: null,
      language:                     null,
      cookie_law_buttonText:        t('cookie_law.buttonText'),
      state:                        viewportService.state,
      updatePreviousTitle:          false,
      media:                        { matches: true },

      components:                   sidebarService.state.components,
      panels:                       sidebarService.stack.state.contentsdata,
      bOpen:                        true,
      bPageMode:                    false,
      header:                       t('main navigation'),
      sstate:                       sidebarService.state,
      /** @since 3.9.0 */
      zIndex:                       ZINDEXES.usermessage.tool + 2,

      stack:                        floatbarService.stack.state,
    }
  },

  components: {
    HeaderItem,
    CookieLaw,
    userMessage,
    onlineNotify,
    downloadNotify,
    pluginsNotify
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

    title() {
      return this.sstate.gui.title;
    },

    disabled() {
      return ApplicationState.gui.sidebar.disabled;
    },

    panelsinstack() {
      return this.panels.length > 0;
    },

    showmainpanel() {
      return this.components.length>0 && !this.panelsinstack;
    },

    componentname() {
      return this.components.length ? this.components.slice(-1)[0].getTitle(): '';
    },

    panelname() {
      return this.panels.length ? this.panels.slice(-1)[0].content.getTitle() : '';
    },

    // active panels on stack
    fpanelsinstack(){
      return this.stack.contentsdata.length>0;
    },
    
    fpanelname(){
      let name;
      if (this.stack.contentsdata.length){
        name = this.stack.contentsdata.slice(-1)[0].content.getTitle();
      }
      return name;
    },
    
    closable() {
      return floatbarService.closable;
    }

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
          data: () => ({ id: getUniqueDomId(), checked: false }),
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
    },

    closePanel() {
      sidebarService.closePanel();
    },

    closeAllPanels() {
      sidebarService.closeAllPanels();
    },

    fclosePanel(){
      floatbarService.closePanel();
    }

  },

  watch: {

    'language'(l, cl) {
      if (cl) {
        ApplicationService.changeLanguage(l);
        this.cookie_law_buttonText = t('cookie_law.buttonText');
      }
    },

    "stack.contentsdata"() {
      const children = $("#g3w-floatbarpanel-placeholder").children();
      children.forEach((child, index) => {
        if (index == children.length-1) $(child).show();
        else $(child).hide();
      })
    },

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
            const id = customitem.id = getUniqueDomId();
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
    const resize = function() {
      //Set the min-height of the content and sidebar based on the height of the document.
      $(".content-wrapper")  .css('min-height', $(window).height());
      $(".content-wrapper")  .css('height',     $(window).height());
      $(".sidebar")          .css({'height':    ($(window).height() - $(".navbar-header").height()) + "px", 'overflow-y': 'auto'});
      $(".control-sidebar")  .css('max-height', $(window).innerHeight());
      $('.g3w-sidebarpanel') .css('height',     $(window).height() - $("#main-navbar").height());
      $('#g3w-modal-overlay').css('height',     $(window).height());
    };

    resize();
    $(window, ".wrapper").resize(resize);

    // toggle sidebar tree items on click
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
          $(".content-wrapper").css('min-height', $(window).height());
          $(".content-wrapper").css('height',     $(window).height());
        });
      }
      //if this isn't a link, prevent the page from being redirected
      if (next.is('.treeview-menu')) {
        e.preventDefault();
      }
    });

    //Enable control sidebar
    const sidebar = $(".control-sidebar");

    //Listen to the click event
    $("[data-toggle='control-sidebar']").on('click', function (e) {
      e.preventDefault();
      if (!sidebar.hasClass('control-sidebar-open') && !$('body').hasClass('control-sidebar-open')) {
        sidebar.addClass('control-sidebar-open');
      } else {
        sidebar.removeClass('control-sidebar-open');
      }
    });

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

    // INITIALIZE BUTTON TOGGLE 
    $('.btn-group[data-toggle="btn-toggle"]').each(function () {
      var group = $(this);
      $(this).find(".btn").on('click', function (e) {
        group.find(".btn.active").removeClass("active");
        $(this).addClass("active");
        e.preventDefault();
      });
    });

    document.body.classList.toggle('is-mobile', this.isMobile());

    this.iframe = ApplicationState.iframe;
    VM.$on('sidebaritemclick', () => $('.sidebar-toggle').click())

    const handleResizeViewport = () => this.state.resized.start = true;
    await this.$nextTick();
    const mediaQueryEventMobile = window.matchMedia("(min-height: 300px)");
    this.media.matches = mediaQueryEventMobile.matches;
    mediaQueryEventMobile.addListener(e => {
      if (e.type === 'change') { this.media.matches = e.currentTarget.matches }
    });
    handleResizeViewport();

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
  #g3w-sidebarpanel-header-placeholder {
    overflow: hidden;
    line-height: 14px;
    font-size: 1.5em;
    min-height: 35px;
    border-bottom: 1px solid #FFF;
    margin-bottom: 5px;
  }
  #disable-sidebar {
    display: none;
    position: absolute;
    background-color: rgba(0,0,0,.3);
    height: 100%;
    width: 100%;
    z-index: 10;
  }
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
  @media (max-width: 767px) {
    #g3w-small-screen-hamburger-sidebar { display: block; }
  }
</style>