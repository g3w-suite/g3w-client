<!--
  @file
  @since v3.7
-->

<template>
  <div
    id         = "app"
    class      = "wrapper"
    v-disabled = "ApplicationState.disabled"
  >

    <!-- NAVBAR TOP (MAIN MENU) -->
    <nav
      ref   = "navbar"
      class = "navbar no-print"
      style = "display: flex;justify-content: start; height: 50px;"
    >

      <!-- LOGO -->
      <a
        v-if       = "logo_url"
        :href      = "initConfig.header_logo_link || urls.frontendurl || '#'"
        :target    = "initConfig.header_logo_link ? '_blank' : ''"
        style      = "padding: 4px; display: inline-block; height: 50px;"
        aria-label = "logo"
      >
        <img style="height: 100%;" alt = "" :src = "logo_url" />
      </a>

      <button class="navbar-toggler" hidden="" @click.prevent="toggleSidebar">
        <i :class = "$fa('bars')" ></i><b style="margin-left: 8px;">MENU</b>
      </button>

      <hgroup class  = "project_title">
        <p class = "h2">{{ main_title }}</p>
        <h1>{{ project_title }}</h1>
      </hgroup>

      <ul class = "nav-links" style = "display: flex; text-align: center;  white-space: nowrap; list-style: none; padding: 0; margin: 0;">

        <!-- CUSTOM LINKS -->
        <li
          :id     = "`g3w-nav-custom-links-${item.id}`"
          v-for  = "item in custom_links"
          :key   = "item.id"
          :style = "{ order: item.position }"
          :class = "`nav-${item.id}`"
        >
          <a
            :href          = "item.url || '#'"
            @click         = "onCustomItemClick($event, item)"
            :target        = "item.target"
            :title         = "item.i18n ? item.title : ('&nbsp;' + item.title + '&nbsp;')"
            data-placement = "bottom"
          >
            <i v-if     = "item.icon" :class = "item.icon" aria-hidden="true"></i>
            <img v-if   = "item.img" height = "20" :src  = "item.img" :title="item.img_title" :alt="item.img_title" />
            <span v-if  = "item.i18n"  v-t    = "item.text || item.title || item.img_title" :hidden="item.text ? undefined : ''"></span>
            <span v-if  = "!item.i18n" v-html = "item.text || item.title || item.img_title" :hidden="item.text ? undefined : ''"></span>
          </a>
        </li>

        <!-- ACCOUNT -->
        <li
          id    = "g3w-nav-account"
          class = "nav-user dropdown"
        >
          <a
            href        = "#"
            class       = "dropdown-toggle"
            data-toggle = "dropdown"
          >
            <i :class = "$fa('user')" aria-hidden="true"></i>
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
                <b v-t="'Logout'"></b><i :class = "$fa('sign-out')"></i>
              </a>

              <!-- SHARE URL -->
              <a
                href   = "#"
                @click = "showEmbedModal"
                class  = "nav-embedmap btn btn-default btn-flat skin-color"
              >
                <b v-t="'Embed map'"></b><i :class = "$fa('share-alt')"></i>
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
                href   = "#"
                @click = "showaddLayerModal"
                class  = "nav-addlayer btn btn-default btn-flat"
              >
                <b v-t="'Add Layer'"></b><i :class="$fa('layers')"></i> 
              </a>

            </li>
          </ul>
        </li>

        <!-- LANGUAGE SWITCHER -->
        <li 
          id    = "g3w-nav-language"
          v-if  = "languages" 
          class ="nav-lang"
        >
          <button type = "button" commandfor = "nav-lang-dialog" command = "show-modal" style = "display: flex; gap:5px; align-items: center;">
            <img :src = "urls.staticurl +'img/flags/' + language.toLowerCase() + '.png'" width = "24" height = "16" alt = "" />
            {{ languages.find(l => l[0] === language).at(1) }}
            <i class = "triangle" aria-hidden="true" style = "margin-top: 8px;"></i>
          </button>
          <dialog 
            id     = "nav-lang-dialog" 
            @click = "$event.target === $event.target.closest('dialog') && $event.target.closest('dialog').close()"
          >
            <form method = "dialog" style = " display: grid;grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; user-select: none;">
              <label
                v-for     = "lang in languages"
                :key      = "lang[0]"
                style     = "cursor:pointer; text-align: left;"
              >
                <input 
                  type    = "radio" 
                  :value  = "lang[0]" 
                  v-model = "language" 
                  @click  = "$event.target.closest('dialog').close()" 
                  style   = "pointer-events:none;margin-right: 8px;"
                >
                <img 
                  :src   = "urls.staticurl +'img/flags/' + lang[0].toLowerCase() + '.png'" 
                  width  = "24" 
                  height = "16" 
                  :alt   = "lang[0].toLowerCase()" />
                <span style = "margin-left: 5px;">{{ lang[1] }}</span> 
              </label>
            </form>
          </dialog>
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
        <div
          :hidden = "panels.length <= 0"
          class   = "g3w-sidebarpanel"
        >
          <div id = "g3w-sidebarpanel-header-placeholder">
            <div
              style  = "display: flex; margin-bottom: 5px;"
              :style = "{ justifyContent: ApplicationState.sidebar.title ? 'space-between' : 'flex-end' }"
            >

              <h4
                v-if  = "title"
                style = "display: inline-block; font-weight: bold"
                v-t   = "title"
              ></h4>

              <div>
                <span
                  v-if           = "panels.length > 1"
                  @click.stop    = "closePanel"
                  data-placement = "left"
                  v-t-tooltip    = "'back'"
                  class          = "close-pane-button"
                >
                  <i 
                    :class = "$fa('arrow-left')" 
                    :style = "{ opacity: ApplicationState.sidebar.btn_close ? '1' : '0.7', cursor: ApplicationState.sidebar.btn_close ? 'pointer' : 'not-allowed' }"
                    class = "panel-icon">
                  </i>
                </span>
                <span
                  @click.stop    = "ApplicationState.sidebar.btn_close && closeAllPanels()"
                  :title         = "ApplicationState.sidebar.tooltip_close || 'close'"
                  data-placement = "right"
                  class          = "close-pane-button"
                >
                  <i
                    :style = "{ opacity: ApplicationState.sidebar.btn_close ? '1' : '0.7', cursor: ApplicationState.sidebar.btn_close ? 'pointer' : 'not-allowed' }"
                    :class = "$fa('close')"
                    class  = "panel-icon">
                  </i>
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
          id      = "g3w-sidebarcomponents"
          :hidden = "!showmainpanel"
          class   = "sidebar-menu"
          :class  = "{ 'g3w-disabled': disabled }"
          @click  = "toggleSidebarItem"
        >

        <li id = "legend" class = "treeview sidebaritem">
          <a
            href = "#"
            @click.prevent = "showLegendPanel"
          >
            <i aria-hidden="true" class = "fas fa-list" style = "color: #fff;"></i>
            <span class = "treeview-label">{{ $t('legend') }}</span>
          </a>
        </li>

        <li id = "metadata" class = "treeview sidebaritem">
          <a
            href           = "#"
            data-toggle    = "modal"
            data-target    = "#modal-metadata"
          >
            <i aria-hidden="true" class = "fas fa-file-code" style = "color: #fff;"></i>
            <span class = "treeview-label">{{ $t('Metadata') }}</span>
          </a>
        </li>

        <li id="catalog" class="treeview sidebaritem">
          <a
            href           = "#"
            style          = "display: flex; justify-content: space-between; align-items: center;"
            @click.prevent = "showSidebar"
          >
            <i aria-hidden="true" class="far fa-map" style="color: rgb(1, 154, 76);"></i>
            <span class="treeview-label"> {{ $t('Layers') }}</span>
          </a>
          <div class = "catalog">
            <!-- THEME SELECTOR -->
            <div
              id    = "g3w-catalog-toc-layers-toolbar"
            >
              <catalog-themes
                v-if              = "ApplicationState.catalog.layerstrees.length"
                :map_themes       = "ApplicationState.project.state.map_themes"
                :layerstrees      = "ApplicationState.catalog.layerstrees"
                @change-map-theme = "changeMapTheme"
              />
            </div>

            <!-- LAYER TREES -->
            <div
              id     = "layers"
              style  = "padding-top: 5px;"
            >

              <ul
                v-for = "root in ApplicationState.catalog.layerstrees"
                :key  = "root.storeid"
                class = "tree-root root project-root"
              >
                <catalog-tree
                  v-for                      = "tree in root.tree"
                  :key                       = "tree.id"
                  :layerstree                = "tree"
                  class                      = "item"
                  :parentFolder              = "false"
                  :root                      = "true"
                  :legendplace               = "ApplicationState.project.state.legend_position || 'tab'"
                  :parent_mutually_exclusive = "false"
                  :storeid                   = "root.storeid"
                />
              </ul>

              <!-- EXTERNAL LAYERS -->
              <ul v-if = "ApplicationState.catalog.external.wms.length || ApplicationState.catalog.external.tms.length || ApplicationState.catalog.external.vector.length" class = "g3w-external_layers-group">
                <li>
                  <div style = "display: flex; align-items: baseline; margin-bottom: 5px;">
                    <span
                      style       = "padding-right: 2px; padding-left: 4px; width: 20px; font-size: 1.1em; cursor: pointer;"
                      :class      = "$fa(externalayers.collapsed ? 'caret-right' : 'caret-down')"
                      @click.stop = "expandCollapseExternaLayers"
                      class       = "collapse-expande-collapse-icon bold"
                    ></span>
                    <span
                      @click.stop = "toggleExternalLayers"
                      style       = "padding-right: 5px; cursor: pointer;"
                      :class      = "$fa(externalayers.checked ? 'check': 'uncheck')"
                    ></span>
                    <span style = "font-weight: bold" v-t = "'EXTERNAL LAYERS'"></span>
                    <span 
                      style       = "color: red; padding-right: 3px; margin-left: auto; margin-right: 8px; cursor: pointer;"
                      :class      = "$fa('trash')"
                      @click.stop = "removeExternalLayers"
                    ></span>
                  </div>
                </li>
                <catalog-tree
                  v-show          = "!externalayers.collapsed"
                  v-for           = "wms in ApplicationState.catalog.external.wms"
                  :key            = "wms.id"
                  :externallayers = "ApplicationState.catalog.external.wms"
                  :layerstree     = "wms"
                  @layerchecked   = "updateExternalLayersChecked"
                  class           = "item"
                />
                <!-- @since 4.1.0 add tms layers -->
                <catalog-tree
                  v-show          = "!externalayers.collapsed"
                  v-for           = "tms in ApplicationState.catalog.external.tms"
                  :key            = "tms.id"
                  :externallayers = "ApplicationState.catalog.external.tms"
                  :layerstree     = "tms"
                  @layerchecked   = "updateExternalLayersChecked"
                  class           = "item"
                />
                <catalog-tree
                  v-show          = "!externalayers.collapsed"
                  v-for           = "vector in ApplicationState.catalog.external.vector"
                  :key            = "vector.id"
                  :externallayers = "ApplicationState.catalog.external.vector"
                  @layerchecked   = "updateExternalLayersChecked"
                  :layerstree     = "vector"
                  class           = "item"
                />
              </ul>

            </div>

            <div
              v-if = "has_related_maps"
              style  = "
                position: sticky;
                bottom: 0;
                background-color: var(--bgcolor);
                display: flex;
                text-align: center;
                line-height: 48px;
                color: #fff;
                border-top: 2px solid var(--skin-color);
                margin-top: 12px;
                justify-content: space-around;
              "
            >
              <a
                href        = "#"
                @click.stop = "showaddLayerModal"
              >
                <i :class = "$fa('layers')"></i> <b>{{ $t('Add Layer') }}</b>
              </a>
              <a
                v-if           = "has_related_maps && !ApplicationState.iframe"
                href           = "#"
                @click.stop = "openChangeMapMenu"
              >
                <i :class = "$fa('refresh')"></i> <b>{{ $t('changemap') }}</b>
              </a>
            </div>

          </div>
        </li>

      </ul>

      </div>

      <!-- TOGGLE BUTTON (sidebar menu) -->
      <a
        href           = "#"
        class          = "sidebar-aside-toggle"
        :class         = "{ 'g3w-disabled': disabled, 'iframe': iframe}"
        style          = "z-index: 2"
        @click.prevent = "toggleSidebar"
        role           = "button"
        data-placement = "right"
        v-t-tooltip    = "'Sidebar menu'"
      ></a>

    </aside>

    <!-- MAIN (content) -->
    <div
      class  = "content-wrapper"
      :style = "{ paddingTop: isIframe ? 0 : null }"
    > 
      <bar-loader style = "position: absolute; z-index: 1;" :loading = "state.content.loading && 0 === state.contentsdata.length"/>
      <transition name = "fade" :duration = "{ enter: 500, leave: 500 }">
        <user-message
          v-if               = "usermessage.show"
          @close-usermessage = "closeUserMessage"
          :title             = "usermessage.title"
          :subtitle          = "usermessage.subtitle"
          :id                = "usermessage.id"
          :message           = "usermessage.message"
          :closable          = "usermessage.closable"
          :textMessage       = "usermessage.textMessage"
          :icon-class        = "usermessage.iconClass"
        >
          <template v-if = "usermessage.hooks.header" slot = "header"><component :is = "usermessage.hooks.header" /></template>
          <template v-if = "usermessage.hooks.body"   slot = "body"><component   :is = "usermessage.hooks.body" /></template>
          <template v-if = "usermessage.hooks.footer" slot = "footer"><component :is = "usermessage.hooks.footer" /></template>
        </user-message>
      </transition>

      <div
        id     = "g3w-view-map"
        :class = "`split-${state.split}`"
        class  = "g3w-view map"
        :style = "styles.map"
      >

        <div
          v-show          = "has_panel"
          id              = "resize-map-and-content"
          @mousedown.stop = "onResize"
          :class       = "`split-${state.split}`"
        ></div>

        <div id = "application-notifications">
          <!-- OFFLINE -->
          <div :class = "{ 'g3w-hide': ApplicationState.online }" style = "color: #999">
            <i :class = "$fa('wifi')"></i>
            <b style = "font-size: 0.4em">offline</b>
          </div>
          <!-- DOWNLOAD -->
          <div :class = "{ 'skin-color': true, 'g3w-hide': !ApplicationState.download }">
            <bar-loader :loading = "true" />
            <i style = "padding:3px" :class = "$fa('download')"></i>
            <b style = "font-size: 0.35em">download</b>
          </div>
          <!-- PLUGINS -->
          <div :class = "{ 'g3w-hide': 0 === ApplicationState.plugins.length }" style = "color: #994b10">
            <bar-loader :loading = "true" />
            <i :class = "$fa('tools')"></i>
            <b style = "font-size: 0.4em">plugins</b>
          </div>
        </div>

        <!-- ORIGINAL SOURCE: src/components/Map.vue -->
        <div id = "g3w-maps">

          <div
            v-for = "hidemap in ApplicationState.hidemaps"
            :key  = "hidemap.id"
            :id   = "hidemap.id"
            class = "g3w-map hidemap"
          ></div>

          <div :id = "GUI.target" class = "g3w-map" @drop.prevent = "onDrop" @dragenter.prevent = "onDrop" @dragleave.prevent = "onDrop" @dragover.prevent>

            <div class = "drop-area" hidden>
              Upload Files
            </div>

            <!-- COMMON MAP CONTROLS (zoom, querybypolygon, geoscreeenshot, ...) -->
            <div
              ref   = "g3w-map-controls"
              class = "g3w-map-controls rv"
              style = "display: flex"
            ></div>

            <!-- FIXME: add description -->
            <div
              v-if   = "ApplicationState.map_info"
              ref    = "g3w-map-info"
              id     = "g3w-map-info"
              :style = "ApplicationState.map_style"
            >
              {{ApplicationState.map_info}}
            </div>

            <!-- DIV that will contain marker on map -->
            <div style = "display: none;"><div id = "marker"></div></div>

            <!-- @since 3.8.0   -->
            <div class = "g3w-map-controls-left-bottom"></div>

          </div>

          <!-- Footer (bottom part) where scale and other component can be set -->
          <!-- ORIGINAL SOURCE: src/components/MapFooter.vue@v3.10.4 -->
          <!-- ORIGINAL SOURCE: src/components/MapFooterLeft.vue@v3.10.4 -->
          <!-- ORIGINAL SOURCE: src/components/MapFooterRight.vue@v3.10.4 -->
          <div id = "map_footer" class = "skin-border-color">

            <!-- MAP CREDITS -->
            <div
              id    = "map_footer_left"
              style = "display: flex;"
            >
              <a
                href   = "https://g3wsuite.it/"
                style  = "margin-left: 5px; align-self: center;"
                target = "_blank"
                :title = "version"
              >
                <img
                  height = "15"
                  src    = "/static/client/images/g3wsuite_logo.png"
                  alt    = ""
                />
              </a>
            </div>

            <div
              id    = "map_footer_right"
              style ="display: flex;"
            >

              <!-- MOUSE POSITION -->
              <div
                v-show = "mouse.visible"
                id     = "mouse-position-control"
              ></div>

              <!-- SWITCH COORDINATES  -->
              <div
                v-if                = "mouse.visible && mouse.switch_icon && !isMobile()"
                v-t-tooltip:top     = "mouse.tooltip"
                @click.stop.prevent = "switchMapsCoordinateTo4326"
                style               = "caret-color: transparent; padding: 0 5px 0 0; display: flex; height: 100%; align-items: center; cursor: pointer;"
                :class              = "$fa('mouse')"
              ></div>

              <div
                id              = "permalink"
                v-t-tooltip:top = "'Copy share URL'"
                :class          = "$fa('share-alt')"
                @click.stop     = "showEmbedModal"
              ></div>

              <!-- SCALE CONTROL -->
              <div id = "scale-control"></div>

              <div
                v-if = "showmapunits"
                id   = "scale-line-units"
              >
                <select
                  style   = "padding: 5px 2px; font-weight: bold; border:0; cursor: pointer"
                  v-model = "ApplicationState.map_unit"
                >
                  <option
                    v-for     = "unit in state.mapunits"
                    :value    = "unit"
                    v-t       = "`scaleline_units.${unit}`"
                    :selected = "ApplicationState.map_unit === unit"
                    style     = "font-weight: bold"
                  ></option>
                </select>

              </div>

            </div>
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
          v-if  = "(showtitle && contentTitle) || previousTitle || state.content.closable"
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
              <span v-t = "'back'"></span>
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
            style = "display: flex; align-items: center; gap: .5ch; padding: 0 .5ch;"
          >
            <component v-for = "tool in state.content.headertools" :is = "tool"/>
            <div
              style  = "
                display: flex;
                justify-content: space-between;
                font-size: 1em;
                padding: 0;
                align-self: center;
                margin-left: auto;
                cursor: pointer;
              "
            >
              <i
                v-if               = "undefined !== state.split"
                :class             = "$fa(`resize-${state.split}`)"
                v-t-tooltip:bottom = "'Enlarge / Reduce'"
                style              = "margin-right: 3px;"
                class              = "action-button action-button-resize skin-color-dark"
                @click             = "resizeFull"
              ></i>
            </div>
            <i
              style              = "cursor: pointer; scale:.9;"
              :style             = "{ transform: 'h' === state.split ? 'rotate(134deg)' : 'rotate(44deg)'}"
              v-t-tooltip:bottom = "`Dock to ${'h' === this.state.split ? 'Bottom' : 'Right'}`"
              class              = "action-button action-button-dock skin-color-dark fa fa-external-link-alt"
              @click             = "splitContent"
            ></i>
            <i
              v-if               = "state.content.closable"
              @click             = "closeContent"
              v-t-tooltip:bottom = "'close'"
              :class             = "{'mobile': isMobile()}"
              class              = "action-button action-button-close skin-color-dark fas fa-times"
            ></i>
          </div>
        </div>
        <bar-loader :loading = "state.content.loading"/>
      </div>
    </div>

    <context-menu />

    <!-- COOKIE BANNER -->
    <div v-if = "!state.cookie_accepted" class = "cookie-banner">
      <div v-t = "'This website uses cookies to ensure you get the best experience on our website.'"></div>
      <button class = "cookie-button" v-t = "'Got It!'" @click = "acceptCookie"></button>
    </div>

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

    <modal-login v-if = "!user && has_iframe_login" />
    <modal-addlayer />
    <modal-changemap />
    <modal-metadata />

  </div>
</template>

<script>
import ApplicationState        from 'g3w-state';
import GUI                     from 'g3w-app';

import { getUniqueDomId }      from 'utils/getUniqueDomId';
import { sameOrigin }          from 'utils/sameOrigin';
import { waitFor }             from 'utils/waitFor';
import { XHR }                 from 'utils/XHR';
import { getCatalogLayerById } from 'utils/getCatalogLayerById';

import userMessage             from 'components/UserMessage.vue';
import ContextMenu             from 'components/ContextMenu.vue';
import ModalLogin              from 'components/ModalLogin.vue';
import ModalAddlayer           from 'components/ModalAddLayer.vue';
import ModalChangemap          from 'components/ModalChangeMap.vue';
import ModalMetadata           from 'components/ModalMetadata.vue';
import CatalogThemes           from 'components/CatalogThemes.vue';
import CatalogTree             from 'components/CatalogTree.vue';

import { gettext as _ }        from 'g3w-i18n';

export default {

  /** @since 3.8.6 */
  name: 'app',

  data() {
    return {
      state:                 ApplicationState,
      GUI,
      ApplicationState,
      iframe:                false,
      language:              null,
      updatePreviousTitle:   false,
      header:                _('main navigation'),
      custom_links:          (window.initConfig.header_custom_links || []).concat(ApplicationState.navbaritems).filter(Boolean).map(l => Object.assign(l, { id: l.id || getUniqueDomId() })),
      mouse: {
        visible:     true,
        switch_icon: false,
        epsg_4326:   false,
        tooltip:     null,
      },
      externalayers:    {
        checked:   false,
        collapsed: false,
      },
    }
  },

  components: {
    userMessage,
    ContextMenu,
    ModalLogin,
    ModalAddlayer,
    ModalChangemap,
    ModalMetadata,
    CatalogThemes,
    CatalogTree,
  },

  computed: {

    languages() {
      const languages = (Array.isArray(this.initConfig.i18n) && this.initConfig.i18n || []).sort((a, b) => a[0].localeCompare(b[0]));
      return languages.length > 1 && languages;
    },

    dropdownParent() {
      return window.innerWidth >= 768;
    },

    initConfig() {
      return window.initConfig;
    },

    isIframe() {
      return window.top !== window.self;
    },

    urls() {
      return this.initConfig.urls;
    },

    logo_url() {
      return ApplicationState.project.state.thumbnail || `${this.initConfig.mediaurl}${window.initConfig.header_logo_img}`;
    },

    project_title() {
      return ApplicationState.project.getState().name;
    },

    user() {
      return this.initConfig?.user?.username ? this.initConfig.user : null;
    },

    login_url() {
      return this.initConfig.user.login_url;
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
      return this.initConfig.macrogroups.length + this.initConfig.groups.length + this.initConfig.projects.length > 1;
    },

    /**
     * @returns {boolean} whether it should list any related projects or maps.
     *
     * @since 4.1.0
     */
    has_related_maps() {
      return window.initConfig.macrogroups.length + window.initConfig.groups.length + window.initConfig.projects.length > 1;
    },

    main_title() {
      const main_title = this.initConfig.main_map_title;
      const group_name = this.initConfig.title || this.initConfig.slug;
      return main_title ? `${main_title} - ${group_name}` : group_name;
    },

    breadcrumb() {
      return this.state.content.contentsdata.filter(c => c.options.crumb).map(c => c.options.crumb);
    },

    has_panel() {
      return this.state.content.contentsdata.length > 0;
    },

    usermessage() {
      return this.state.usermessage;
    },

    showtitle() {
      if (this.state.content.contentsdata.length > 0) {
        const options = this.state.content.contentsdata.at(-1).options;
        if ( [true, false].includes(options.showtitle) ) { return options.showtitle }
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
        },
      }
    },

    contentTitle() {
      if (this.state.content.contentsdata.length) {
        const { title, post_title, text = false } = this.state.content.contentsdata.at(-1).options;
        return { title, post_title, text };
      }
    },

    backOrBackTo() {
      return (this.state.content.contentsdata.length > 1 && this.state.content.showgoback)
        ? !(this.state.content.contentsdata.at(-2).options.title)
          ? 'back'
          : 'backto'
        : false;
    },

    previousTitle() {
      const title = (this.state.content.contentsdata.length > 1 && this.state.content.showgoback)
        ? this.state.content.contentsdata.at(-2).options.title
        : null;
      this.updatePreviousTitle = true;
      this.$nextTick(() => this.updatePreviousTitle = false);
      return title;
    },

    title() {
      return ApplicationState.sidebar.title;
    },

    disabled() {
      return ApplicationState.sidebar.disabled;
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

    version() {
      return 'Powered by G3W-SUITE ' + initConfig.version;
    },

    showmapunits() {
      return GUI.state.mapunits.length > 1;
    }

  },

  methods: {

    /**
     * @since 3.11.0
     */
    onCustomItemClick(e, item) {
      if (item.onclick) {
        e.preventDefault();
        return item.onclick();
      }
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
      document.body.insertAdjacentHTML('beforeend', /* html */`
        <div id = "custom_modal" class = "modal fade" tabindex="-1">
          <div class = "modal-dialog">
            <div class  = "modal-content">${ item.content }</div>
          </div>
        </div>
      `);
      $('#custom_modal').modal('show');
      $('#custom_modal').on('hidden.bs.modal', () => document.querySelector('#custom_modal')?.remove());
    },

    async showEmbedModal() {
      await GUI.getPermalink(new URL(window.location.href), {});
    },

    /**
     * @since 4.1.0
     */
    showLegendPanel() {
      GUI.showLegendPanel();
    },

    /**
     * @since 3.11.0
     */
    showaddLayerModal() {
      $('#modal-addlayer').modal('show');
    },

    /**
     * @since 3.8.0
     */
    openChangeMapMenu() {
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

    async onResize(e) {
      const sidebar = document.getElementById('g3w-view-content');
      const panel   = ApplicationState.layout[ApplicationState.layout.__current].rightpanel;
      let rect, dx, dy;

      this.state.content.disabled = true;

      const mousemove = e => {
        e.preventDefault();
        rect = sidebar.getBoundingClientRect();

        dx   = e.pageX - rect.left - window.scrollX;
        dy   = e.pageY - rect.top - window.scrollY;

        const wrapper = document.querySelector('.content-wrapper');

        panel.width  = Math.min(Math.max(
          Math.round((200               / wrapper.clientWidth)  * 100),
          Math.round(((rect.width  -dx) / wrapper.clientWidth)  * 100),
        ), 90);

        panel.height = Math.min(Math.max(
          Math.round((200               / wrapper.clientHeight) * 100),
          Math.round(((rect.height -dy) / wrapper.clientHeight) * 100),
        ), 90);

        const viewW = document.querySelector('#app').getBoundingClientRect().width - document.querySelector('.main-sidebar').getBoundingClientRect().width - document.querySelector('.main-sidebar').getBoundingClientRect().left - window.scrollX;
        const viewH = window.innerHeight - document.querySelector('.navbar').offsetHeight;

        const h_split = 'h' === this.state.split;
        const v_split = 'v' === this.state.split;
        
        // percentage of secondary view (content)
        const scale = (h_split ? panel.width : panel.height) /100;

        // size "content"
        Object.assign(this.state.content.sizes, {
          width:  (h_split ?  (viewW * scale) : viewW),
          height: (v_split ? (viewH * scale) : viewH),
        });
      };

      const mouseup = async e => {
        document.removeEventListener('mousemove', mousemove);
        if (!this.disabled && 'h' === this.state.split && panel.width > 65) {
          GUI.hideSidebar();
        }
        this.state.content.disabled = false;
        GUI._layout();
      };

      document.addEventListener('mousemove', mousemove);
      document.addEventListener('mouseup', mouseup, { once: true });
    },

    resizeFull() {
      const panel = ApplicationState.layout[ApplicationState.layout.__current].rightpanel;
      if ('h' === ApplicationState.split) {
        panel.width_100 = !panel.width_100;
      } else {
        panel.height_100 = !panel.height_100;
      }
      GUI._layout();
    },

    /**
     * @sine 4.0.0
     */
    splitContent(e) {
      const split            = GUI.getCurrentContent().options.split;
      ApplicationState.split = GUI.getCurrentContent().options.split = 'v' === split ? 'h' : 'v';
      e.target.setAttribute('data-original-title', `Dock ${'h' === split ? 'right' : 'bottom'}`);
      GUI._layout();
    },

    closePanel() {
      GUI.closePanel();
    },

    async closeAllPanels() {
      ApplicationState.sidebar.title = null;
      const data = ApplicationState.sidebar.contentsdata;
      if (data.length) {
        await Promise.allSettled(data.map(async d => await d.content.unmount()));
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
     * @since 4.1.0
     */
    showSidebar() {
      GUI.showSidebar();
    },

    /**
     * Toggle sidebar tree items on click
     * 
     * @since 3.11.0
     */
    toggleSidebarItem(e) {
      const mini      = document.body.classList.contains('sidebar-mini');
      const collapsed = document.body.classList.contains('sidebar-collapse');

      const li        = e.target.closest('.sidebaritem');
      const component = ApplicationState.sidebar.components.find(comp => li.id === comp.id);

      // open sidebar only in case of mini/collapsed sidebar and has a component that has a li id collapsible
      if (mini && collapsed && component?.collapsible) {
        GUI.showSidebar();
      }

      const open      = component?.getOpen();
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
     * ORIGINAL SOURCE: src/components/Map.vue@4.0.0
     * 
     * @since 4.1.0
     */
    onDrop(e) {
      document.querySelector('.drop-area').toggleAttribute('hidden', 'dragenter' !== e.type);
      if (e.dataTransfer.files && 'drop' === e.type) {
        const q = document.querySelector.bind(document);
        // set modal options
        const setOption = async (el, value) => {
          el = '#modal-addlayer ' + el;
          await waitFor(() => q(el), 1000);
          q(el).value = value;
          q(el).dispatchEvent(new Event('input'));
          q(el).dispatchEvent(new Event('change'));
        }
        const setFile = async (file) => {
          await waitFor(() => !q('#add-layer-type').value, 5000);
          if (GUI.getLayerByName(file.name)) {
            return console.assert(!GUI.getLayerByName(file.name), `Unable to add layer: ${file.name}`);
          }
          setTimeout(() => console.assert(GUI.getLayerByName(file.name), `Unable to add layer: ${file.name}`), 2500);
          await setOption('#add-layer-type', 'file');
          await waitFor(() => q('#addcustomlayer input[type="file"]'), 1000);
          const data = new DataTransfer();
          data.items.add(file);
          q('#addcustomlayer input[type="file"]').files = data.files;
          q('#addcustomlayer input[type="file"]').dispatchEvent(new Event('change'));
          $('#modal-addlayer').modal('show');
        }
        setFile(e.dataTransfer.files[0]);
      }
    },

    /**
     * ORIGINAL SOURCE: src/components/Map.vue@4.0.0
     * 
     * @since 4.1.0
     */
    switchMapsCoordinateTo4326() {
      this.mouse.epsg_4326 = !this.mouse.epsg_4326;
      GUI.getMapControl('mouseposition').dispatchEvent({
        type: 'change:epsg',
        epsg: this.mouse.epsg_4326 ? 'EPSG:4326' : GUI.getEpsg(),
      })
    },

    /**
     * @since 4.1.0
     */
    acceptCookie() {
      window.localStorage.setItem('cookie:accepted', true);
      this.state.cookie_accepted = true;
    },

    /**
     * @since 4.1.0
     */
    expandCollapseExternaLayers() {
      this.externalayers.collapsed = !this.externalayers.collapsed;
    },

    /**
     * @since 4.1.0
     */
    toggleExternalLayers() {
      this.externalayers.checked = !this.externalayers.checked;
      [
        ...(this.ApplicationState.catalog.external?.vector || []),
        ...(this.ApplicationState.catalog.external?.wms || []),
        ...(this.ApplicationState.catalog.external?.tms || []),
      ].forEach(l => l.checked = this.externalayers.checked);
    },

    /**
     * @since 4.1.0 Remove external layers
     */
    removeExternalLayers() {
      [
        ...(this.ApplicationState.catalog.external?.vector || []),
        ...(this.ApplicationState.catalog.external?.wms || []),
        ...(this.ApplicationState.catalog.external?.tms || []),
      ].forEach(l =>  GUI.removeExternalLayer(l.name));
    },

    /**
     * get map Theme_configuration
     * 
     * @since 4.1.0
     */
    async getMapThemeFromThemeName(theme) {
      const project = ApplicationState.project;
      // get map theme configuration from map_themes project config
      const config  = Object.values(project.state.map_themes).flat().find(c => theme === c.theme );
      if (config && undefined === config.layerstree) {
        try {
          const response = await XHR.get({ url: `${project.urls.map_themes}${theme}/` });
          if (response.result) {
            config.layerstree = response.data;
          }
        } catch(e) {
          console.warn('Error while retreiving map theme configuration', e);
        }
      }
      return config;
    },

    /**
     * Set properties (checked and visible) from view to layerstree
     * 
     * @param map_theme map theme name
     * @param layerstree // current layerstree of TOC
     * 
     * @since 4.1.0
     */
    async setLayersTreePropertiesFromMapTheme({ map_theme, layerstree }) {
      const project  = ApplicationState.project;
      layerstree     = undefined !== layerstree ? layerstree : project.state.layerstree;
      /** map theme config */
      const theme    = await this.getMapThemeFromThemeName(map_theme);
      // create a chages need to apply map_theme changes to map and TOC
      const changes  = { layers: {} }; // key is the layer id and object has style, visibility change (Boolean)
      const promises = [];
      /**
       * Traverse current layerstree of TOC and get changes with the new one related to map_theme choose
       * @param mapThemeLayersTree // new mapLayerTree
       * @param layerstree // current layerstree
       */
      const groups = [];
      const traverse = (mapThemeLayersTree, layerstree, checked) => {
        mapThemeLayersTree
          .forEach((node, index) => {
            if (node.nodes) { // case of a group
              groups.push({
                node,
                group: layerstree[index]
              });
              traverse(node.nodes, layerstree[index].nodes, checked && node.checked);
            } else {
              // case of layer
              node.style = theme.styles[node.id]; // set style from map_theme
              if (layerstree[index].checked !== node.visible) {
                changes.layers[node.id] = {
                  visibility: true,
                  style:      false
                };
              }
              layerstree[index].checked = node.visible;
              // if it has a style settled
              if (node.style) {
                const promise = new Promise(resolve => {
                  const setCurrentStyleAndResolvePromise = node => {
                    if (undefined === changes.layers[node.id]) {
                      changes.layers[node.id] = {
                        visibility: false,
                        style:      false
                      }
                    }
                    changes.layers[node.id].style = project.getLayerById(node.id).setCurrentStyle(node.style);
                    resolve();
                  };
                  if (project.getLayersStore()) { setCurrentStyleAndResolvePromise(node) }
                  else { (node => setTimeout(() => setCurrentStyleAndResolvePromise(node)))(node) }// case of starting project creation
                });
                promises.push(promise);
              }
            }
        });
      };
      traverse(theme.layerstree, layerstree);

      await Promise.allSettled(promises);

      // all groups checked after layer checked so is set checked but not visible
      groups.forEach(({ group, node: { checked, expanded }}) => {
        group.checked  = checked;
        group.expanded = expanded;
      });

      return changes // eventually, information about changes (for example style etc..)
    },

    /**
     * Change view
     *
     * @fires GUI~layer-change-style
     * @since 4.1.0
     */
    async changeMapTheme(map_theme) {
      GUI.closeContent();

      // change map theme
      this.ApplicationState.catalog.layerstrees[0].checked = true;

      const changes = (await this.setLayersTreePropertiesFromMapTheme({
        map_theme,
        rootNode:   this.ApplicationState.catalog.layerstrees[0],
        layerstree: this.ApplicationState.catalog.layerstrees[0].tree[0].nodes
      })).layers;

      // get all layers with styles
      const layers  = Object.keys(changes).filter(id => changes[id].style);
      const styles  = (await this.getMapThemeFromThemeName(map_theme)).styles;

      // clear categories
      layers.forEach(id => {
        if (!changes[id].visible) {
          const layer = getCatalogLayerById(id);
          layer.clearCategories();
          layer.change();
        }
      });

      // apply styles on each layer
      layers.forEach(id => GUI.emit('layer-change-style', { layerId: id, style: styles[id] }));

    },

    /**
     * Remove layer from queryresults selection
     *
     * @since 4.1.0
     */
   async onUnSelectionLayer(storeid, layer) {
      if (!layer) {
        return console.warn('undefined layer');;
      }

      const action = layer.external && GUI.getActionLayerById({ layer, id: 'selection' });

      // PROJECT LAYER
      if (!layer.external && storeid) {
        await ApplicationState.layers[storeid].getLayerById(layer.id).clearSelectionFids();
      }

      // EXTERNAL LAYER
      if (layer.external) {
        layer.selection.active = false;
        layer.selection.features.forEach((feature, i) => {
          // skip when ..
          if (!feature.selected) {
            return;
          }
          feature.selected = false;
          if (action) {
            action.state.toggled[i] = false;
          }
          GUI.defaultsLayers.selectionLayer.getSource().removeFeature(feature);
        });
      }
      //@since 4.0.4 Need to set to false eventually features of layer in queryresults service
      if (!layer.external) {
        (GUI.state.queried_layers.find(l => layer.id === l.id)?.features || []).forEach(f => f.selected = false);
      }
    },

    /**
     * @since 4.1.0
     */
    async onActiveToken(storeid, layerstree) {
      layerstree.filter.active = await ApplicationState.layers[storeid].getLayerById(layerstree.id).toggleToken();
    },

    /**
     * Handle visibilty change on legend item
     *
     * @fires GUI~cataloglayervisible
     *
     * @since 4.1.0
     */
    onTreeNodeVisible(layer) {
      GUI.emit('cataloglayervisible', layer);
    },

    /**
     * Handle legend item select (single mouse click ?)
     *
     * @since 4.1.0
     */
    onTreeNodeSelected(node) {
      GUI.selectLayer(node.id);
    },

    /**
     * @since 4.1.0
     */
    updateExternalLayersChecked() {
      this.externalayers.checked = [
        ...(ApplicationState.catalog.external?.vector || []),
        ...(ApplicationState.catalog.external?.wms || []),
      ].every(l => l.checked)
    },

  },

  watch: {

    language: {
      immediate: true,
      async handler(lang, plang) {
        //In case of no language, loading time, set default language en
        if (!lang) {
          // lazy load i18n translations
          _.register('en', (await import(`${initConfig.urls.clienturl}locales/en.js`)).default);
          return;
        }

        history.replaceState(null, null, window.location.pathname.split('/').map((part, index) => index === 1 ? lang : part).join('/') + window.location.search + window.location.hash);

        // lazy load i18n translations
        try {
          _.register(lang, (await import(`${initConfig.urls.clienturl}locales/${lang}.js`)).default);
        } catch(e) {
          GUI.showUserMessage({ type: 'warning', message: e.toString(), autoclose: true });
        }

        //wait loading all plugins. Need to wait for plugins to be loaded when open apllication first time
        await waitFor(() => 0 === ApplicationState.plugins.length);

        ApplicationState.language = lang;

        //need to wait change laguage. Some plugins watch language change
        await this.$nextTick();

        //ge locale from current languare or previuous language to check if plugins are translated
        const locale             = Object.keys(ApplicationState.locales[plang || lang]);
        const installed_plugins  = Object.keys(initConfig.plugins); //plugins provided by the server
        const i18n_plugins       = installed_plugins.filter(name => locale.find(k => k.includes(`plugins.${name}`)));
        // wait until all plugins have been translated
        await waitFor(() => {
          return i18n_plugins.length === i18n_plugins.filter(name => locale.find(key => key.startsWith(`plugins.${name}`))).length;
        });

        /** @since 4.0.0 */
        GUI.emit('i18n-ready', lang);
      },
    },

    /**
     * @since 4.1.0
     */
    'ApplicationState.catalog.external.vector': {
      immediante: true,
      handler() {
        this.updateExternalLayersChecked();
      },
    },

    /**
     * @since 4.1.0
     */
    'ApplicationState.catalog.external.wms': {
      immediante: true,
      handler() {
        this.updateExternalLayersChecked();
      },
    },

  },

  /**
   * @listens GUI~unselectionlayer
   * @listens GUI~activefiltertokenlayer
   * @listens GUI~treenodevisible
   * @listens GUI~treenodeselected
   * @listens GUI~layer-change-style
   */
  created() {
    this.language = this.initConfig.user.i18n;

    GUI.on('unselectionlayer',       this.onUnSelectionLayer);
    GUI.on('activefiltertokenlayer', this.onActiveToken);
    GUI.on('treenodevisible',        this.onTreeNodeVisible);
    GUI.on('treenodeselected',       this.onTreeNodeSelected);
  },

  async mounted() {

    document.body.appendChild(this.$el.querySelector('#modal-fullscreen'));

    this.language = this.initConfig.user.i18n;

    await this.$nextTick();

    document.getElementById('startingspinner')?.remove();

    document.body.classList.toggle('is-mobile', this.isMobile());
    document.body.classList.toggle('is-iframe', ApplicationState.iframe);

    if (!ApplicationState.iframe) {
      document.body.classList.add('sidebar-mini');
    }

    this.crs = GUI.getCrs();

    await this.$nextTick();

    GUI.once('after:setupControls', () => {
      if (GUI.getMapControl('mouseposition')) {
        this.mouse.switch_icon = (
          GUI.getMapControl('mouseposition')
          && 'EPSG:4326' !== GUI.getEpsg()
        );
        this.mouse.tooltip = `ESPG ${GUI.getCrs().split(':')[1]} ↔ WGS84`;
      } else {
        this.mouse.visible = false;
      }
    });

    await this.$nextTick();
    
    // in case of dynamic legend
    if (ApplicationState.project.state.context_base_legend) {
      GUI.on('change-map-legend-params', () => { GUI.getLegendSrc(); });
    }
    
    if ('legend' === ApplicationState.project.state.catalog_tab) {
      GUI.showLegendPanel();
    }
  },

};
</script>

<style>
  #g3w-view-map {
    anchor-name: --g3w-view-map; 
  }
  .usermessage-success   { background-color: #62ac62; }
  .usermessage-info      { background-color: #44a0bb; }
  .usermessage-warning   { background-color: #f29e1d; }
  .usermessage-alert     { background-color: #c34943; }

  dialog:is(.usermessage-alert, .usermessage-info, .usermessage-warning, .usermessage-alert)::backdrop {
    opacity: 0;
  }

  .catalog .tree-item.selected                                                   { background-color: var(--skin-color); }
  .catalog .nav-tabs ul li                                                       { color: #fff; }
  .catalog > .nav-tabs                                                           { border: none; margin: 0px; display: flex; flex: 1 1 0; }
  .catalog > .nav-tabs:has(> li:only-child)                                      { display: none; }
  .catalog > .nav-tabs > li                                                      { margin-right: 2px; border-bottom: 4px solid hsl(from var(--bgcolor) h s calc(l - 2)); font-size: 1em; white-space: initial; display: flex; flex: 1 1 0; align-items: stretch; }
  .catalog > .nav-tabs > li > a                                                  { border: 0; margin-right: 0; color: #fff; }
  .catalog > .nav-tabs > li > a > i                                              { color: #a6a6a6; }
  .catalog > .nav-tabs > li:is(.open, :hover) > a                                { border: 0; background: none !important; }
  .catalog > .nav-tabs > li:is(.open, :hover) > a > i                            { color: #a6a6a6; }
  .catalog > .nav-tabs > li:is(.open, :hover) .dropdown-menu                     { margin-top: 0; }
  .catalog > .nav-tabs > li.active                                               { border-bottom: 4px solid var(--skin-color); position: relative; font-weight: bold; }
  .catalog > .nav-tabs > li.active > a                                           { border: 0; color: #fff; background-color: hsl(from var(--bgcolor) h s calc(l + 4)); }
  .catalog > .nav-tabs > li.active > a > i                                       { color: #fff; }
  .catalog > .nav-tabs > li a                                                    { padding: 10px 0; text-align: center; height: 100%; width: 100%; }
  .nav-tabs > li.active > a,
  .nav-tabs > li.active > a:is(:focus, :hover)                                   { color: #fff; }
  .catalog > .title                                                              { padding: 10px; font-weight: bold; }
  .catalog ul                                                                    { line-height: 1.75em; list-style-type: none; }
  .catalog .tree-item.selected ul.layer-categories                               { background-color: var(--bgcolor); }
  .catalog .tree-item div.tree-node-title                                        { padding-left: 3px; cursor: pointer; width: 80%; display: inline-flex; justify-content: space-between; user-select: none; }
  .catalog .tree-item div.tree-node-title.disabled                               { color: #999; }
  .catalog button[type="button"]                                                 { border: unset; background-color: unset; box-shadow: rgba(0,0,0,0.3) 0 2px 5px; padding: 5px; border-radius: 3px; margin: 0 3px; font-weight: bold; color: #fff !important; }
  .catalog button[type="button"].active                                          { box-shadow: none; background-color: #384247; }
  .catalog .tree-item                                                            { cursor: pointer; margin-bottom: 3px; }
  .catalog .tree-item.disabled > span                                            { color: #999; }
  .catalog .root                                                                 { padding: 2px 1px 1px 5px; }
  .catalog .root .tree-item.group                                                { padding-left: 1px; }
  .catalog .root.fa-chevron-right                                                { padding-right: 5px; padding-left: 0; }
  .bold                                                                          { font-weight: bold; color: #fff; }
  .highlightlayer                                                                { border-bottom: 2px dashed; border-color: #ffb516; }
  .catalog                                                                       { padding: 0 3px; }
  .catalog .tree-root                                                            { padding-left: 0; }
  .catalog .tree-root li > .root                                                 { padding-left: 5px; }
  .catalog .tree-root li.tree-item ul.tree-content-items.root                    { padding-left: 18px; }
  .catalog .tree-root li.tree-item ul.tree-content-items.root > .tree-item.group { padding-left: 1px !important; }
  .catalog .tree-root li.tree-item ul.tree-content-items                         { padding-left: 17px; padding-top: 2px; }
  .g3w-lendplace-toc                                                             { padding-left: 23px; }
  .g3w-lendplace-toc.group                                                       { padding-left: 17px; }
  .g3w-lendplace-toc.root                                                        { padding-left: 18px; }
  .g3w-lendplace-toc.root > li.itemmarginbottom                                  { margin-left: -13px; }
  .g3w-lendplace-toc.root > li.itemmarginbottom div.layer-legend                 { padding-left: 56px; }
  .g3w-lendplace-toc.root > li.itemmarginbottom > span.child                     { padding-left: 18px !important; }
  .catalog .tree-root span.root.collapse-expande-collapse-icon                   { width: 19px; }
  .catalog .tree-root span.root.collapse-expande-collapse-icon.project-root      { width: 17px; }
  .catalog .tree-root span.collapse-expande-collapse-icon                        { width: 10px; }
  .catalog .child-categories                                                     { padding: 5px 3px 1px 12px; }
  .catalog .layer-legend                                                         { padding: 3px 0 0 35px; background-color: var(--bgcolor); }
  .catalog .tree                                                                 { color: #fff; }
  .catalog .tree.disabled                                                        { color: #999; cursor: not-allowed; }
  #catalog #layers ul.g3w-external_layers-group                                  { padding-left: 0 !important; background: var(--bgcolor); border-top: 2px solid var(--skin-color); padding-top: 12px; }
  #catalog #layers ul.g3w-external_layers-group li                               { padding-left: 2px !important; }
  #catalog #layers .sidebar-menu > li > a                                        { border: 0; }
  #catalog > a                                                                   { display: none !important; }
  #catalog .tree-item > .toggle-context-menu                                     { opacity: 0; position: absolute; inset: 0 4px auto auto; padding: 4px 8px; border: 1px solid; border-radius: 3px; }
  #catalog .tree-item > .toggle-context-menu.root                                { opacity: 1; border: none; }
  #catalog .tree-item:not(.group):hover > .toggle-context-menu                   { opacity: 1; }
</style>

<style scoped>
  .project_title     { display: inline-flex; flex-direction: column; justify-content: center; height: 100%; font-weight: bold; color: white; max-height: 50px; overflow: hidden; max-width: calc(100% - 150px); }
  .project_title > * { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: bold; margin: 0; }
  .project_title .h2 { font-size: 1.5em; }
  .project_title h1  { font-size: 1.2em; padding-bottom: 5px; }

  #g3w-sidebarpanel-header-placeholder {
    overflow: hidden;
    line-height: 14px;
    font-size: 1.5em;
    min-height: 35px;
    border-bottom: 1px solid #FFF;
    margin-bottom: 5px;
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

  i.triangle                            { border-color: #fff transparent transparent transparent; border-style: solid; border-width: 5px 4px 0 4px; display: inline-block; margin: 3px; }
  .open i.triangle                      { border-color: transparent transparent #fff transparent; border-width: 0 4px 5px 4px; }

  @media (min-width: 767px) {
    .user-footer :is(.nav-sidebar, .nav-addlayer).btn-default { display: none; }
    .project_title                                            { margin-right: auto; }
  }

  @media (max-width: 767px) {
    body:not(.sidebar-open) .navbar-toggler ~ *,
    .nav-user > .dropdown-toggle,
    .user-header                        { display: none !important; }
    .navbar-nav                         { flex-direction: column; }
    .user-footer .btn-default           { padding: 10px; }
    .user-footer                        { background-color: transparent; border: none; }
    .nav-user > ul                      { display: block; position: static; float:none; border: none; background-color: transparent; }
    .nav-user .btn                      { color: #fff !important; }
    .nav-user > .dropdown-menu          { border: none; }
  }

  #marker {
    width: 15px;
    height: 15px;
    border: 2px solid yellow;
    border-radius: 10px;
    background-color: yellow;
    opacity: 0.8;
  }
  .g3w-map-controls-left-bottom {
    position: absolute;
    bottom: 75px;
    left: 10px;
    z-index: 1;
  }
  #g3w-map-info {
    position: absolute;
    top: 60px;
    left: 5px;
    font-weight: bold;
    z-index: 100;
    background: rgba(255,255,255, 0.6);
    padding: 5px;
    border-radius: 3px;
  }
  #g3w-maps {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .g3w-map {
    position: absolute;
    width: 100%;
    height: 100%;
  }
  .g3w-map.show {
    display: block;
  }
  .g3w-map.hide {
    display: none;
  }
  #map_footer {
    position:absolute;
    bottom:0;
    height: 30px;
    width:100%;
    display: flex;
    justify-content: space-between;
    background-color: rgba(255, 255, 255, 0.7);
  }
  #permalink {
    font-weight: bold;
    font-size: 1.2em;
    padding: 8px 5px 0 5px;
    cursor: pointer;
  }

  #map_footer_right {
    flex-shrink: 0;
  }

  .drop-area:not([hidden]) {
    display: flex;
  }

  .drop-area {
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    color: #fff;
    font-size: 4em;
    position: absolute;
    z-index: 100;
    background-color: var(--bgcolor);
    pointer-events: none;
  }

  .drop-area::before {
    border: 5px dashed #fff;
    content: "";
    bottom: 60px;
    left: 60px;
    position: absolute;
    right: 60px;
    top: 60px;
  }
</style>