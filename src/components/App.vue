<!--
  @file
  @since v3.7
-->

<template>
  <div
    id         = "app"
    class      = "wrapper"
    v-disabled = "app.gui.app.disabled"
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
              id             = "g3w-small-screen-hamburger-sidebar"
              href           = "#"
              class          = "sidebar-toggle"
              @click.prevent = "toggleSidebar"
              role           = "button"
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
                :href   = "getLogoLink() || '#'"
                :target = "getLogoLink() ? '_blank' : ''"
                class   = "project_logo_link"
              >
                <img
                  class = "img-responsive"
                  style = "max-width: 250px;"
                  ref   = "img_logo"
                  alt   = ""
                  :src  = "logo_url"
                  @load = "setImgOffset"
                />
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

            <!-- ORIGINAL SOURCE: src/components/NavbaritemsRight.vue@v3.10.1 -->
            <ul class = "nav navbar-nav navbar-right">
              <li
                v-for = "item in app.navbaritems"
                :is = "item"
                :key = "item.id"
              ></li>
            </ul>

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
                v-for                      = "state in custom_headers[0]"
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
                v-for                      = "state in custom_headers[1]"
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
                    <a
                      v-if  = "user.admin_url"
                      :href = "user.admin_url"
                      class = "btn btn-default btn-flat skin-color"
                    >
                      <i :class="g3wtemplate.getFontClass('folder')"></i>
                      <b>Admin</b>
                    </a>
                    <a
                      :href = "user.logout_url"
                      class = "btn btn-default btn-flat skin-color"
                    >
                      <i
                        :class = "g3wtemplate.getFontClass('sign-out')"
                        style  = "margin-right: 2px;">
                      </i>
                     <b v-t="'logout'"></b>
                    </a>
                  </li>
                </ul>
              </li>

              <!-- TODO: add description -->
              <header-item
                v-for                      = "state in custom_headers[2]"
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
                v-for                      = "state in custom_headers[3]"
                :key                       = "state.id"
                :state                     = "state"
                @show-custom-modal-content = "showCustomModalContent"
              />

              <!-- HOME PAGE -->
              <li
                v-if  = "urls.frontendurl"
                class = "dropdown"
              >
                <a :href="urls.frontendurl">
                  <span>
                    <i :class="g3wtemplate.getFontClass('home')">
                    </i> Home
                  </span>
                </a>
              </li>

              <!-- LANGUAGE SWITCHER -->
              <li v-if="languages" class="g3w-languages">
                <select
                  v-select2          = "'language'"
                  class              = "form-control"
                  :templateSelection = "templateResultLanguages"
                  :templateResult    = "templateResultLanguages"
                  :dropdownAutoWidth = "true"
                  :dropdownParent    = "dropdownParent"
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

              <!-- TODO: add description -->
              <header-item
                v-for                      = "state in custom_headers[4]"
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
        :class = "{ iframe: iframe, 'g3w-disabled': disabled }"
      >
        <!-- SIDEBAR CONTENT -->
        <div id="disable-sidebar"></div>

        <div
          v-show = "panels.length > 0"
          class = "g3w-sidebarpanel"
        >
          <div id="g3w-sidebarpanel-header-placeholder">
            <div
              style  = "display: flex;"
              :style = "{ justifyContent: app.sidebar.title ? 'space-between' : 'flex-end' }"
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

        <ul
          id     = "g3w-sidebarcomponents"
          v-show = "showmainpanel"
          class  = "sidebar-menu"
          :class = "{ 'g3w-disabled': disabled }"
          @click = "toggleSidebarItem"
        ></ul>

      </div>
      <!-- TOGGLE BUTTON (desktop only) -->
      <a
        href           = "#"
        class          = "sidebar-aside-toggle"
        :class         = "{ 'g3w-disabled': disabled, 'iframe': iframe}"
        :style         = "{ zIndex: 4 }"
        @click.prevent = "toggleSidebar"
        role           = "button"
      >
          <i :class = "g3wtemplate.getFontClass('bars')"></i>
      </a>

    </aside>

    <!-- ORIGINAL SOURCE: src/components/Viewport.vue@v3.10.1 -->
    <!-- Content Wrapper. Contains page content -->
    <div
      class  = "content-wrapper"
      :style = "{paddingTop: isIframe ? 0 : null}"
    >
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
          <template v-if="usermessage.hooks.header"   slot="header"><component :is="usermessage.hooks.header" /></template>
          <template v-if="usermessage.hooks.body"     slot="body"><component   :is="usermessage.hooks.body" /></template>
          <template v-if="usermessage.hooks.footer" slot="footer"><component :is="usermessage.hooks.footer" /></template>
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
          :class       = "`split-${state.split}`"
        />

        <div id="application-notifications">
          <div id = "offline_notification" v-online:hide style = "color: #999">
            <i :class = "g3wtemplate.getFontClass('wifi')"></i>
            <div style = "font-weight: bold; font-size:0.4em">offline</div>
          </div>
          <div id = "download_notification" v-download.show title = "DOWNLOAD" class = "skin-color">
            <bar-loader :loading = "true"/>
            <i style = "padding:3px" :class = "g3wtemplate.getFontClass('download')"></i>
          </div>
          <div id = "plugins_notification" v-plugins style = "color: #994b10">
            <bar-loader :loading = "true"/>
            <i :class = "g3wtemplate.getFontClass('plugin')"></i>
          </div>
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

    <catalog-context-menu />

    <!-- MODAL (FULL SCREEN) -->
    <div
      class           = "modal fade modal-fullscreen force-fullscreen"
      id              = "full-screen-modal"
      tabindex        = "-1"
      role            = "dialog"
      data-backdrop   = "static"
      data-keyboard   = "false"
      aria-labelledby = "full-screen-modal"
      aria-hidden     = "true"
    ></div>

    <!-- MODAL CREDITS -->
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
                      :src  = "`${urls.clienturl}images/g3wsuite_logo.png`"
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
                      :src  = "`${urls.clienturl}images/logo_gis3w_156_85.png`"
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
import CookieLaw                 from 'vue-cookie-law';

import {
  LOCAL_ITEM_IDS,
  VIEWPORT
}                         from 'g3w-constants';
import ApplicationState   from 'store/application';
import Panel              from 'g3w-panel';
import Component          from 'g3w-component';
import GUI                from 'services/gui';
import { resizeMixin }    from "mixins";

import HeaderItem         from 'components/HeaderItem.vue';
import userMessage        from 'components/UserMessage.vue';
import CatalogContextMenu from 'components/CatalogContextMenu.vue';
import getUniqueDomId     from 'utils/getUniqueDomId';
import { XHR }            from 'utils/XHR';
import { promisify }      from 'utils/promisify';

const { t }        = require('g3w-i18n');

export default {

  /** @since 3.8.6 */
  name: 'app',

  mixins: [resizeMixin],

  data() {
    return {
      customcredits:                false,
      current_custom_modal_content: null,
      language:                     null,
      cookie_law_buttonText:        t('cookie_law.buttonText'),
      app:                          ApplicationState,
      state:                        ApplicationState.viewport,
      updatePreviousTitle:          false,
      header:                       t('main navigation'),
    }
  },

  components: {
    HeaderItem,
    CookieLaw,
    userMessage,
    CatalogContextMenu,
  },

  computed: {

    languages() {
      const languages = Array.isArray(this.appconfig.i18n) && this.appconfig.i18n || [];
      return languages.length > 1 && languages;
    },

    dropdownParent() {
      return window.innerWidth >= 768;
    },

    appconfig() {
      return window.initConfig;
    },

    isIframe() {
      return window.top !== window.self;
    },

    urls() {
      return this.appconfig.urls;
    },

    powered_by() {
      return this.appconfig.powered_by;
    },

    logo_url() {
      return ApplicationState.project.state.thumbnail || `${this.appconfig.mediaurl}${this.appconfig.logo_img}`;
    },

    project_title() {
      return ApplicationState.project.getState().name;
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

    main_title() {
      const main_title = this.appconfig.main_map_title;
      const group_name = this.appconfig.title || this.appconfig.slug;
      return main_title ? `${main_title} - ${group_name}` : group_name;
    },

    breadcrumb() {
        return this.state.content.contentsdata
          .filter(c => c.options.crumb)
          .map(c => c.options.crumb);
    },

    showresize() {
      const layout = ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel;
      const currentPerc = layout[this.state.split === 'h' ? 'width' : 'height'];
      return this.state.resized.start && this.state.secondaryPerc > 0 && this.state.secondaryPerc < 100 && currentPerc < 100 && currentPerc > 0;
    },

    showresizeicon() {
      return 100 !== this.state.secondaryPerc;
    },

    usermessage() {
      return this.state.usermessage;
    },

    showtitle() {
      if (this.state.content.contentsdata.length > 0) {
        const options = this.state.content.contentsdata[this.state.content.contentsdata.length - 1].options;
        if (true === options.showtitle || false === options.showtitle) { return options.showtitle }
      }
      return true;
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
          zIndex:        3,
          minHeight:     'v' === this.state.split ? `${VIEWPORT.resize.content.min}px` : null,
          paddingTop:    '8px',
          paddingBottom: '8px',
        }
      }
    },

    contentTitle() {
      if (this.state.content.contentsdata.length) {
        const { title, post_title } = this.state.content.contentsdata[this.state.content.contentsdata.length - 1].options;
        return { title, post_title };
      }
    },

    backOrBackTo() {
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
      return ApplicationState.sidebar.title;
    },

    disabled() {
      return ApplicationState.gui.sidebar.disabled;
    },

    panels() {
      return ApplicationState.sidebar.contentsdata;
    },

    showmainpanel() {
      return ApplicationState.sidebar.components.length > 0 && !this.panels.length;
    },

    componentname() {
      return ApplicationState.sidebar.components.length ? ApplicationState.sidebar.components.slice(-1)[0].getTitle(): '';
    },

    panelname() {
      return this.panels.length ? this.panels.slice(-1)[0].content.getTitle() : '';
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
          <img src="${this.urls.staticurl}img/flags/${state.element.value.toLowerCase()}.png" />
          <span style="margin-left: 5px;">${state.text}</span> 
        </span>`
      );
    },

    async resize() {
      if (!this.isIframe) {
        await this.$nextTick();
        const max_width = this.$refs.navbar_toggle.offsetWidth > 0
          ? this.$refs.navbar.offsetWidth     - this.$refs.navbar_toggle.offsetWidth
          : this.$refs.mainnavbar.offsetWidth - this.$refs['app-navbar-nav'].offsetWidth;
        this.$refs.main_title_project_title.style.maxWidth = `${max_width - this.logoWidth - 15}px`;
      }
    },

    showCustomModalContent(id) {
      this.current_custom_modal_content = this.custom_modals.find(m => m.id === id).content;
    },

    getLogoLink() {
      return this.appconfig.logo_link || null;
    },

    /**
     * Display dialog messages on a first page load (on app bootstrap).
     * 
     * @since 3.8.0
     */
    async initDialogMessages() {
      const messages = ApplicationState.project.state.messages;
      
      // no messages to show
      if (!messages) {
        return;
      }

      const projectId = ApplicationState.project.getId();

      for (let i = 0; i < messages.items.length; i++) {
        const message = messages.items[i];
        const item = window.localStorage.getItem(LOCAL_ITEM_IDS.MESSAGES.id);
        const data = (item ? JSON.parse(item) : undefined) || LOCAL_ITEM_IDS.MESSAGES.value;

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
            title:       message.title,
            message:     content,
            size:        'large',
            closeButton: false,
            className:   `g3w-modal-project-message ${Object.entries(messages.levels).find(([key, value]) => value === message.level)[0]}`,
            buttons: {
              close: {
                label: t('close'),
                className: 'btn-secondary',
                callback: () => {
                  // update locale storage if "Do Not Show Again" checkbox is checked 
                  try {
                    if (doNotShowAgainVueComponent.checked) {
                      data[projectId].push(message.id);
                      window.localStorage.setItem(LOCAL_ITEM_IDS.MESSAGES.id, JSON.stringify(data));
                    }
                  } catch(e) {
                    console.warn(e);
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
      if (GUI.getComponent('contents').getComponentById('changemapmenu')) {
        GUI.closeContent();
        return;
      }
      if (this.isMobile()) {
        GUI.hideSidebar();
        $('#main-navbar.navbar-collapse').removeClass('in');
      }
      GUI.closeSideBar();

      GUI.setContent({
        content: new Component({
          id:                 'changemapmenu',
          vueComponentObject: require('components/ChangeMapMenu.vue'),
        }),
        title: '',
        perc: 100
      });
    },

    isNotLastCrumb(index) {
      return index < this.breadcrumb.length - 1;
    },

    closeContent() {
      GUI.closeContent();
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
      const sidebarSize  = (size === 'width') ? $('.sidebar-collapse').length ? 0 : ApplicationState.viewport.SIDEBARWIDTH : $('#main-navbar').height();
      const viewPortSize = $(this.$el)[size]();
      let mapSize        = ('width' === size ? (e.pageX+2): (e.pageY+2)) - sidebarSize;
      const { content, map } = VIEWPORT.resize;
      if (mapSize > viewPortSize - content.min) {
        mapSize = viewPortSize -  content.min;
      } else if ( mapSize < map.min) {
        mapSize = map.min;
      }
      ApplicationState.viewport.resized[this.state.split] = true;
      ApplicationState.gui.layout[ApplicationState.gui.layout.__current].rightpanel['h' === this.state.split ? 'width' : 'height'] = 100 - Math.round((mapSize / viewPortSize) * 100);
      GUI._layout('resize');
    },

    closePanel() {
      GUI.closePanel();
    },

    async closeAllPanels() {
      ApplicationState.sidebar.title = null;
      const data = ApplicationState.sidebar.contentsdata;
      if (data.length) {
        await Promise.allSettled(data.map(async d => {
          if (d.content instanceof Component || d.content instanceof Panel) {
            await promisify(d.content.unmount());
          } else {
            $(ApplicationState.sidebar.parent).empty();
          }

        }));
        data.splice(0, data.length);
      }
    },

    /**
     * @since 3.11.0
     */
    toggleSidebar() {
      GUI.toggleSidebar();
    },

    /**
     * Toggle sidebar tree items on click
     * 
     * @since 3.11.0
     */
    toggleSidebarItem(e) {
      const mini      = document.body.classList.contains('sidebar-mini');
      const collapsed = document.body.classList.contains('sidebar-collapse');

      // open sidebar
      if (mini && collapsed) {
        GUI.showSidebar();
      }

      const li        = e.target.closest('.sidebaritem');
      const component = ApplicationState.sidebar.components.find(comp => comp.id === li.id);
      const open      = component && component.getOpen();
      const menu      = li.querySelector('.treeview-menu');

      // skip toggling element
      if (!component || (open && collapsed) || (menu && menu.contains(e.target))) {
        return;
      }

      // automatically toggle sidebar on mobile
      if (!component.collapsible && window.innerWidth <= 767) {
        GUI.toggleSidebar();
      }

      component.click({ open: !open });
    },

    /**
     * Add some marging to the logo
     * 
     * @since 3.11.0
     */
    setImgOffset() {
      if (!this.isIframe) {
        this.logoWidth = this.$refs.img_logo.offsetWidth + 15;
        this.resize()
      }
    }

  },

  watch: {

    'language'(language, cl) {
      if (cl) {
        i18next.changeLanguage(language);
        /**
         * @deprecated Since v3.8. Will be deleted in v4.x. Use ApplicationState.language instead
         */
        ApplicationState.lng      = language;
        ApplicationState.language = language;
        const pathArray           = window.location.pathname.split('/');
        pathArray[1]              = language;
        history.replaceState(null, null, pathArray.join('/'));
        this.cookie_law_buttonText = t('cookie_law.buttonText');
      }
    },

  },

  beforeCreate() {
    this.delayType = 'debounce';
    this.delayTime = 0;
  },

  created() {
    this.language       = this.appconfig.user.i18n;
    this.custom_modals  = [];
    this.custom_headers = { 0: [], 1: [], 2: [], 3: [], 4: [] };

    this.customlinks = Array.isArray(this.appconfig.header_custom_links)
      ? this.appconfig.header_custom_links
        .filter(item => {
          if (null !== item !== null) {
            const id = item.id = getUniqueDomId();
            item.type === 'modal' && this.custom_modals.push({ id, content: item.content });
            let position = 1*(item.position || 0);
            position = position > 4 ? 4 : position < 0 || Number.isNaN(position)? 0 : position;
            this.custom_headers[position].push(item);
            return true
          }
          return false;
        })
      : [];

    if (!!this.appconfig.credits) {
      XHR.get({ url: this.appconfig.credits })
        .then(c => this.customcredits = 'None' !== c && c )
        .catch(e => console.warn(e))
    }
  },

  async mounted() {

    //check if show Project messages when app is mounted
    this.initDialogMessages();

    this.logoWidth = 0;

    await this.$nextTick();

    // margin right
    this.rightNavbarWidth = Array.from(this.isIframe
      ? []
      : this.$refs.mainnavbar.getElementsByTagName('ul')
    ).reduce((w, item) => w + item.offsetWidth, 15);

    this.language = this.appconfig.user.i18n;

    await this.$nextTick();

    $('#startingspinner').remove();

    // Fixes the layout height in case min-height fails.
    const resize = function() {
      $(".main-sidebar")    .css('height', $(window).height() - $(".navbar-header").height());
      $('.g3w-sidebarpanel').css('height', $(window).height() - $("#main-navbar").height());
    };

    resize();
    $(window, ".wrapper").resize(resize);

    this.iframe = ApplicationState.iframe;

    if (!this.iframe) {
      document.body.classList.add('sidebar-mini');
    }

    document.body.classList.toggle('is-mobile', this.isMobile());
    document.body.classList.toggle('is-iframe', this.iframe);

    await this.$nextTick();

    this.state.resized.start = true
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
  .g3w-languages .select2-container--default .select2-selection--single {
    background: none;
    border: none;
  }
  .g3w-languages .select2-container--default .select2-selection--single .select2-selection__arrow b {
    border-color: #fff transparent transparent transparent
  }
  .g3w-languages .select2-container--default.select2-container--open .select2-selection--single .select2-selection__arrow b {
    border-color: transparent transparent #fff transparent;
  }
  .g3w-languages .select2-container--default .select2-selection--single .select2-selection__rendered {
    color: #fff !important;
  }
  @media (min-width: 768px) {
    .g3w-languages .select2-container {
      right: 0;
      left: auto !important;
    }
  }
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

  .user-header              { background-color: var(--skin-color); }
  .user-header              { height: 175px; padding: 10px; text-align: center; }
  .user-header > p          { z-index: 5; color: #fff; color: rgba(255, 255, 255, 0.8); font-size: 17px; margin-top: 10px; }
  .user-footer              { background-color: #f9f9f9; padding: 10px; display: flex;justify-content: space-between; }
  .user-footer .btn-default { color: #666; }

  @media (max-width: 767px) {
    #g3w-small-screen-hamburger-sidebar { display: block; }
    .user-footer .btn-default:hover     { background-color: #f9f9f9; }
    .user-header                        { display: none; }
  }

</style>