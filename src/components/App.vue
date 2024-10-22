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

    <!-- NAVBAR TOP (MAIN MENU) -->
    <nav
      v-if  = "!isIframe"
      ref   = "navbar"
      class = "navbar no-print"
      role  = "navigation"
      style = "display: flex;justify-content: start; height: 50px;"
    >

      <!-- LOGO -->
      <a
        v-if    = "logo_url"
        :href   = "appconfig.header_logo_link || urls.frontendurl || '#'"
        :target = "appconfig.header_logo_link ? '_blank' : ''"
        style   = "padding: 4px; display: inline-block; height: 50px;"
      >
        <img style="height: 100%;" alt = "" :src = "logo_url" />
      </a>

      <input id="menu-toggler" ref="menu-toggler" type="checkbox" autocomplete="off" hidden="">

      <label for="menu-toggler" class="navbar-toggler" hidden="">
        <i :class = "$fa('bars')" ></i><span style="margin-left: 8px;">MENU</span>
      </label>

      <hgroup class  = "project_title">
        <p class = "h2">{{ main_title }}</p>
        <h1>{{ project_title }}</h1>
      </hgroup>

      <ul class="nav-links" style = "display: flex; text-align: center;  white-space: nowrap; list-style: none; padding: 0; margin: 0;">

        <!-- CUSTOM LINKS -->
        <li
          v-for  = "item in custom_links"
          :key   = "item.id"
          :style = "{ order: item.position }"
          :class = "`nav-${item.id}`"
        >
          <a
            :href          = "item.url || '#'"
            @click         = "oncCustomItemClick($event, item)"
            :target        = "item.target"
            data-placement = "bottom"
            data-toggle    = "tooltip"
            data-container = "body"
            v-t-tooltip.create    = "item.i18n ? item.title : ('&nbsp;' + item.title + '&nbsp;')"
          >
            <i v-if   = "item.icon" :class = "item.icon"></i>
            <img v-if = "item.img" style = "max-height: 20px" :src  = "item.img" :title="item.img_title" :alt="item.img_title" />
          </a>
        </li>

        <!-- ACCOUNT -->
        <li
          class = "nav-user dropdown"
        >
          <a
            href        = "#"
            class       = "dropdown-toggle"
            data-toggle = "dropdown"
          >
            <i :class = "$fa('user')"></i>
            <span v-if = "user">{{ user.username }}</span>
            <span v-else v-t = "'sign_in'"></span>
            <i class="triangle"></i>
          </a>

          <ul class = "dropdown-menu">
            <!-- USER NAME -->
            <li v-if = "user" class = "user-header">
              👋
              <span v-if="!user.first_name && !user.last_name">{{ user.username }}</span>
              <span v-else>{{ user.first_name }} {{ user.last_name }}</span>
            </li>

            <li class = "user-footer">
              
              <!-- LOGIN URL -->
              <a
                v-if         = "!user"
                :src         = "login_url"
                :data-toggle = "has_iframe_login ? 'modal'        : undefined"
                :data-target = "has_iframe_login ? '#modal-login' : undefined"
                class        = "nav-login btn btn-default btn-flat skin-color"
              >
                <b v-t="'sign_in'"></b><i :class = "$fa('sign-in')"></i>
              </a>

              <!-- ADMIN URL -->
              <a
                v-if  = "user && user.admin_url"
                :href = "user.admin_url"
                class = "nav-admin btn btn-default btn-flat skin-color"
              >
                <b>Admin</b><i :class="$fa('tool')"></i>
              </a>

              <!-- HOME URL -->
              <a
                v-if  = "urls.frontendurl"
                :href = "urls.frontendurl"
                class = "nav-home btn btn-default btn-flat skin-color"
              >
                <b v-t="'homepage'"></b><i :class="$fa('home')"></i>
              </a>

              <!-- LOGOUT URL -->
              <a
                v-if  = "user && user.logout_url"
                :href = "user.logout_url"
                class = "nav-logout btn btn-default btn-flat skin-color"
              >
                <b v-t="'logout'"></b><i :class = "$fa('sign-out')"></i>
              </a>

              <!-- SHARE URL -->
              <a
                href   = "#"
                @click = "showEmbedModal"
                class  = "nav-embedmap btn btn-default btn-flat skin-color"
              >
                <b v-t="'embed_map'"></b><i :class = "$fa('link')"></i>
              </a>

              <!-- CHANGE MAP -->
              <a
                v-if   = "hasRelatedMaps"
                href   = "#"
                @click = "openChangeMapMenu"
                class  = "nav-changemap btn btn-default btn-flat"
              >
                <b v-t="'changemap'"></b><i :class = "$fa('refresh')"></i>
              </a>

              <!-- ADD LAYER -->
              <a
                v-if   = "'legend' !== activeTab"
                href   = "#"
                @click = "showaddLayerModal"
                class  = "nav-addlayer btn btn-default btn-flat"
              >
                <b v-t="'mapcontrols.add_layer_control.header'"></b><i :class="$fa('layers')"></i> 
              </a>

              <!-- SIDEBAR MENU -->
              <a
                href   = "#"
                @click = "toggleSidebar"
                class  = "nav-sidebar btn btn-default btn-flat"
              >
                <b v-t="'sidebar_menu'"></b><i class = "fa fa-toggle-on"></i>
              </a>
              
            </li>
          </ul>
        </li>

        <!-- LANGUAGE SWITCHER -->
        <li v-if = "languages" class="nav-lang">
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

      </ul>

    </nav>

    <!-- SIDEBAR MENU -->
    <aside>
      <div
        class  = "main-sidebar no-print"
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
                  <i :class = "$fa('circle')"     class = "fa-stack-1x panel-button"></i>
                  <i :class = "$fa('arrow-left')" class = "fa-stack-1x panel-icon"></i>
                </span>
                <span
                  @click             = "closeAllPanels"
                  data-placement     = "left"
                  data-toggle        = "tooltip"
                  data-container     = "body"
                  v-t-tooltip.create = "'close'"
                  class              = "skin-tooltip-left g3w-span-button close-pane-button fa-stack"
                >
                  <i :class = "$fa('circle')" class = "fa-stack-1x panel-button"></i>
                  <i :class = "$fa('close')"  class = "fa-stack-1x panel-icon"></i>
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
        >

        <li id="metadata" class="treeview sidebaritem">
          <a
            href           = "#"
            style          = "display: flex; justify-content: space-between; align-items: center;"
            data-placement = "right"
            class          = "skin-tooltip-right"
            data-container = "body"
            v-t-tooltip    = "'sdk.metadata.title'"
            data-toggle    = "modal"
            data-target    = "#modal-metadata"
          >
            <div>
              <i :class="$fa('file')" style="color: #fff;"></i>
              <span class="treeview-label" v-t="'sdk.metadata.title'"></span>
            </div>
          </a>
        </li>

      </ul>

      </div>

      <!-- TOGGLE BUTTON (sidebar menu) -->
      <a
        href               = "#"
        class              = "sidebar-aside-toggle"
        :class             = "{ 'g3w-disabled': disabled, 'iframe': iframe}"
        style              = "z-index: 2"
        @click.prevent     = "toggleSidebar"
        role               = "button"
        data-placement     = "right"
        v-t-tooltip.create = "'sidebar_menu'"
      ></a>

    </aside>

    <!-- MAIN (content) -->
    <div
      class  = "content-wrapper"
      :style = "{ paddingTop: isIframe ? 0 : null }"
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

        <div
          v-show          = "showresize"
          id              = "resize-map-and-content"
          @mousedown.stop = "resizeStart"
          :style          = "{ cursor: 'v' === state.split ? 'ns-resize' : 'col-resize' }"
          :class       = "`split-${state.split}`"
        ></div>

        <div id="application-notifications">
          <div id = "offline_notification"
            :class = "{ 'g3w-hide': app.online }"
            style = "color: #999"
          >
            <i :class = "$fa('wifi')"></i>
            <div style = "font-weight: bold; font-size:0.4em">offline</div>
          </div>
          <div id = "download_notification" v-download.show title = "DOWNLOAD" class = "skin-color">
            <bar-loader :loading = "true"/>
            <i style = "padding:3px" :class = "$fa('download')"></i>
          </div>
          <div
            id     = "plugins_notification"
            :class = "{ 'g3w-hide': 0 === app.plugins.length }"
            style  = "color: #994b10"
          >
            <bar-loader :loading = "true"/>
            <i :class = "$fa('plugin')"></i>
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
              v-t    = "crumb.text ? null : crumb.title"
            >
              <span v-if = "crumb.text"> {{ crumb.title }} </span>
            </span>
            <span
              v-if  = "isNotLastCrumb(index)"
              style = "font-weight: bold; margin: 3px 0"
            >/</span>
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
                :class = "$fa('back')">
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
                :class = "$fa('back')">
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
          <b id = "contenttitle">
            <span v-t = "contentTitle.text ? null : contentTitle.title">
              <span v-if = "contentTitle.text ">{{ contentTitle.title }}</span>
            </span>
            <span v-t = "contentTitle.post_title"></span>
          </b>
          </div>
          <div
            class = "g3-content-header-action-tools"
            style = "display: flex; align-items: center"
          >
            <component v-for = "tool in state.content.headertools" :is = "tool"/>
            <div
              v-if   = "showresizeicon"
              style  = "
                display: flex;
                justify-content: space-between;
                font-size: 1em;
                padding: 0;
                align-self: center;
                margin-left: auto;
                cursor: pointer;
              "
              :style = "{ marginRight: state.content.closable ? '5px': '0px' }"
            >
              <i
                v-if                      = "undefined !== state.split"
                :class                    = "$fa(`resize-${state.split}`)"
                v-t-tooltip:bottom.create = "'enlange_reduce'"
                style                     = "margin-right: 3px;"
                class                     = "action-button skin-color-dark"
                @click                    = "resizeFull"
              ></i>
            </div>
            <span
              v-if = "state.content.closable && state.content.aside"
              @click = "closeContent"
              :class = "{'mobile': isMobile()}"
              class  = "action-button"
              style  = "display: flex; justify-content: center "
            >
            <i class = "skin-color-dark" :class = "$fa('close')"></i>
          </span>
          </div>
        </div>
        <bar-loader :loading = "state.content.loading"/>
      </div>
    </div>

    <catalog-context-menu />

    <!-- COOKIE BANNER -->
    <cookie-law theme = "dark-lime" :buttonText = "cookie_law_buttonText">
      <div slot="message" v-t="'cookie_law.message'"></div>
    </cookie-law>

    <Teleport to="body">
      <!-- MODAL (FULL SCREEN) -->
      <div
        class           = "modal fade modal-fullscreen"
        id              = "modal-fullscreen"
        tabindex        = "-1"
        role            = "dialog"
        data-backdrop   = "static"
        data-keyboard   = "false"
        aria-labelledby = "modal-fullscreen"
        aria-hidden     = "true"
      ></div>

      <!-- MODAL LOGIN -->
      <div
        v-if     = "!user && has_iframe_login"
        id       = "modal-login"
        class    = "modal fade"
        tabindex = "-1"
        role     = "document"
      >
        <div class = "modal-dialog" style = "height: 60%; width: 60%;">
          <div class = "modal-content" style = "height: 100%; background: #d2d6de; display: grid; grid-template-areas: 'iframe'; place-items: center;">
            <button
              type         = "button"
              class        = "close"
              data-dismiss = "modal"
              style        = "position: absolute;inset: 0 0 auto auto;padding: 10px 15px;"
            >&times;</button>
            <span style="grid-area: iframe;">Loading..</span>
            <iframe
              loading = "lazy"
              style   = "border: 0; width: 100%; height: 100%; grid-area: iframe;"
              :src    = "login_url"
              @load   = "onIframeLoaded"
              ref     = "login_iframe"
            ></iframe>
          </div>
        </div>
      </div>

      <map-add-layer />
      <change-map />
      <metadata-project />

    </Teleport>

  </div>
</template>

<script>
import CookieLaw          from 'vue-cookie-law';
import Teleport           from 'vue2-teleport';

import {
  LOCAL_ITEM_IDS,
  VIEWPORT
}                         from 'g3w-constants';
import ApplicationState   from 'store/application';
import Panel              from 'g3w-panel';
import Component          from 'g3w-component';
import GUI                from 'services/gui';

import { getUniqueDomId } from 'utils/getUniqueDomId';
import { promisify }      from 'utils/promisify';
import { sameOrigin }     from 'utils/sameOrigin';

import userMessage        from 'components/UserMessage.vue';
import CatalogContextMenu from 'components/CatalogContextMenu.vue';
import MapAddLayer        from 'components/MapAddLayer.vue';
import ChangeMap          from 'components/ChangeMap.vue';
import MetadataProject    from 'components/MetadataProject.vue';


const { t }               = require('g3w-i18n');

export default {

  /** @since 3.8.6 */
  name: 'app',

  data() {
    const custom_links = (window.initConfig.header_custom_links || []).concat(ApplicationState.navbaritems).filter(Boolean)

    custom_links.unshift({
      id: 'credits',
      type: 'metadata',
      target: '#metadata_credits',
      icon: 'far fa-question-circle',
      title: 'Credits'
    });

    custom_links.forEach(item => !item.id && (item.id = getUniqueDomId()));

    return {
      language:              null,
      cookie_law_buttonText: t('cookie_law.buttonText'),
      app:                   ApplicationState,
      state:                 ApplicationState.viewport,
      updatePreviousTitle:   false,
      header:                t('main navigation'),
      custom_links,
    }
  },

  components: {
    CookieLaw,
    userMessage,
    CatalogContextMenu,
    MapAddLayer,
    ChangeMap,
    MetadataProject,
    Teleport,
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

    logo_url() {
      return ApplicationState.project.state.thumbnail || `${this.appconfig.mediaurl}${window.initConfig.header_logo_img}`;
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
     * @since 3.11.0
     */
    has_iframe_login() {
      return this.login_url && ('/' === this.login_url[0] || sameOrigin(this.login_url, window.location.href));
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
      return this.state.secondaryPerc > 0 && this.state.secondaryPerc < 100 && currentPerc < 100 && currentPerc > 0;
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
          zIndex:        1,
          minHeight:     'v' === this.state.split ? `${VIEWPORT.resize.content.min}px` : null,
          paddingTop:    '8px',
          paddingBottom: '8px',
        },
      }
    },

    contentTitle() {
      if (this.state.content.contentsdata.length) {
        const { title, post_title, text = false } = this.state.content.contentsdata[this.state.content.contentsdata.length - 1].options;
        return { title, post_title, text };
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
     * @since v3.11
     */
    onIframeLoaded(e) {
      const iframe = this.$refs.login_iframe.contentWindow.g3wsdk && this.$refs.login_iframe.contentWindow.g3wsdk.core.ApplicationState;
      if (iframe && iframe.user && iframe.user.logout_url) {
        window.location.reload();
      }
    },

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

    /**
     * @since 3.11.0
     */
    oncCustomItemClick(e, item) {
      if (!['modal', 'metadata'].includes(item.type)) {
        return;
      }
      e.preventDefault();
      if (item.target && 'modal' === item.type && document.querySelector(item.target)) {
        return $(item.target).modal('show');
      }
      if (item.target && 'metadata' === item.type && document.querySelector('#modal-metadata')) {
        $('#modal-metadata').modal('show');
        document.querySelector('#modal-metadata a[href="' + item.target + '"]').click();
        return;
      }
      $('body').append(/* html */`
        <div id = "custom_modal" class = "modal fade" tabindex="-1">
          <div class = "modal-dialog">
            <div class  = "modal-content">${ item.content }</div>
          </div>
        </div>
      `);
      $('#custom_modal').modal('show');
      $('#custom_modal').on('hidden.bs.modal', () => $('#custom_modal').remove());
    },
    
    showEmbedModal() {
      const url = new URL(location.href);
      url.searchParams.set('map_extent', GUI.getService('map').getMapExtent().toString());

      $('body').append(/* html */`
        <div id = "share_modal" class = "modal fade" tabindex="-1">
          <div class = "modal-dialog">
            <div class  = "modal-content">
              <div class = "modal-header">
                <h4 style = "font-weight: bold" class = "modal-title">${this.$t('sdk.mapcontrols.query.actions.copy_zoom_to_fid_url.hint')}</h4>
              </div>
              <div class="form-group modal-body">
                <input readonly value="${url.toString()}" onfocus="event.target.select()" class="form-control" />
                <button onclick="event.target.previousElementSibling.focus() || document.execCommand('copy') && $('#share_modal').modal('hide')" class="form-control btn btn-success">${ this.$t('sdk.tooltips.copy_map_extent_url') }</button>
              </div>
          </div>
        </div>
      `);
      $('#share_modal').modal('show');
      $('#share_modal').on('hidden.bs.modal', () => $('#share_modal').remove());
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

      const pid = ApplicationState.project.getId();

      for (let i = 0; i < messages.items.length; i++) {
        const message = messages.items[i];
        const item    = window.localStorage.getItem(LOCAL_ITEM_IDS.MESSAGES.id);
        const data    = (item ? JSON.parse(item) : undefined) || LOCAL_ITEM_IDS.MESSAGES.value;
        data[pid]     = data[pid] || []

        // check if a current project has already messages stored
        if (undefined !== data[pid].find(id => id === message.id)) {
          continue
        }

        // create "Do Not Show Again" component
        const doNotShowAgainVueComponent = new (Vue.extend({
          data: () => ({ id: getUniqueDomId(), checked: false }),
          template: /* html */ `
            <div style="display: flex; margin-top: 10px;">
              <input :id="id"  v-model="checked" class="magic-checkbox" type="checkbox" />
              <label :for="id" v-t="'dont_show_again'"/>
            </div>`
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
                      data[pid].push(message.id);
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
     * @since 3.11.0
     */
    showaddLayerModal() {
      this.$refs['menu-toggler'].checked = false;
      $('#modal-addlayer').modal('show');
    },

    /**
     * @since 3.8.0
     */
    openChangeMapMenu() {
      this.$refs['menu-toggler'].checked = false;
      $('#modal-changemap').modal('show');
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

    wrapMoveFnc(e) {
      this.moveFnc(e);
    },

    resizeStart() {
      document.addEventListener('mousemove', this.wrapMoveFnc);
      document.addEventListener('mouseup',   this.resizeStop, { once: true });
    },

    async resizeStop() {
      document.removeEventListener('mousemove', this.wrapMoveFnc);
      await this.$nextTick();
      GUI.emit('resize');
    },

    resizeFull() {
      GUI.toggleFullViewContent();
      GUI.emit('resize');
    },

    moveFnc(e) {
      e.preventDefault();
      const size         = 'h' === this.state.split ? 'width' : 'height';
      const sidebarSize  = (size === 'width') ? $('.sidebar-collapse').length ? 0 : ApplicationState.viewport.SIDEBARWIDTH : $('.navbar').height();
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
      this.$refs['menu-toggler'].checked = false;
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

  created() {
    this.language = this.appconfig.user.i18n;
  },

  async mounted() {

    // check if show Project messages when app is mounted
    this.initDialogMessages();

    await this.$nextTick();

    this.language = this.appconfig.user.i18n;

    await this.$nextTick();

    $('#startingspinner').remove();

    // Fixes the layout height in case min-height fails.
    const resize = function() {
      $(".main-sidebar")    .css('height', $(window).height() - $(".navbar").height());
      $('.g3w-sidebarpanel').css('height', $(window).height() - $(".navbar").height());
    };

    resize();
    $(window, ".wrapper").resize(resize);

    this.iframe = ApplicationState.iframe;

    if (!this.iframe) {
      document.body.classList.add('sidebar-mini');
    }

    document.body.classList.toggle('is-mobile', this.isMobile());
    document.body.classList.toggle('is-iframe', this.iframe);
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
  .nav-lang .select2-container--default .select2-selection--single {
    background: none;
    border: none;
  }
  .nav-lang .select2-container--default .select2-selection--single .select2-selection__arrow b {
    border-color: #fff transparent transparent transparent
  }
  .nav-lang .select2-container--default.select2-container--open .select2-selection--single .select2-selection__arrow b {
    border-color: transparent transparent #fff transparent;
  }
  .nav-lang .select2-container--default .select2-selection--single .select2-selection__rendered {
    color: #fff !important;
  }
  @media (min-width: 768px) {
    .nav-lang .select2-container {
      right: 0;
      left: auto !important;
    }
  }
</style>

<style scoped>
  .project_title     { display: inline-flex; flex-direction: column; justify-content: center; height: 100%; font-weight: bold; color: white; max-height: 50px; overflow: hidden; max-width: calc(100% - 150px); }
  .project_title > * { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: bold; margin: 0; }
  .project_title .h2 { font-size: 1.6em; }
  .project_title h1  { font-size: 1.3em; }

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

  .user-header                          { padding: 10px; text-align: center; border-bottom: 1px solid rgba(0,0,0,.3); }
  .user-footer                          { padding: 8px; display: flex; justify-content: space-between; flex-direction: column; gap: 8px; }
  .user-footer .btn-default             { color: rgba(0,0,0,.75); border-color: currentColor; display: flex; flex-direction: row-reverse; justify-content: left; align-items: center; gap: 8px; }
  .user-footer .btn-default:not(:hover) { background-color: transparent; }
  .nav-user > .dropdown-menu            { padding: 1px 0 0 0; border: 1px solid #aaaaaa; border-top-width: 0; border-radius: 0; margin-top: 0 }

  .nav-user .triangle                   { border-color: #fff transparent transparent transparent; border-style: solid; border-width: 5px 4px 0 4px; display: inline-block; margin: 3px; }
  .nav-user.open .triangle              { border-color: transparent transparent #fff transparent; border-width: 0 4px 5px 4px; }

  #menu-toggler                         { display:none }
  .navbar-toggler                       { color: #fff; margin: 12px; font-size: 1.3em; position: absolute; z-index: 101; right: 0; }

  @media (min-width: 767px) {
    .user-footer :is(.nav-sidebar, .nav-addlayer).btn-default { display: none; }
  }

  @media (max-width: 767px) {
    .navbar-toggler                     { display: block; cursor: pointer; user-select: none;}
    #menu-toggler:checked ~ hgroup      { position: fixed; top: 0; background: var(--skin-color); padding-left: 8px; }
    #menu-toggler:checked ~ ul          { position: fixed; inset: 50px 0 0 0; background: var(--skin-color); z-index: 100; flex-direction: column; border-top: 1px solid #fff;}
    #menu-toggler:not(:checked)~*:not(.navbar-toggler),
    .nav-user > .dropdown-toggle,
    .user-header                        { display: none !important; }
    .navbar-nav                         { flex-direction: column; }
    .user-footer .btn-default           { padding: 10px; }
    .user-footer                        { background-color: transparent; border: none; }
    .nav-user > ul                      { display: block; position: static; float:none; border: none; background-color: transparent; }
    .nav-user .btn                      { color: #fff !important; }
    .nav-user > .dropdown-menu          { border: none; }
  }

</style>