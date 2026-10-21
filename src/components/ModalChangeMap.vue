<!--
  @file Select and open another map project.
  @since 3.11.0
-->

<template>
  <dialog
    id            = "modal-changemap"
    @beforetoggle = "onBeforetoggle"
    class         = "change-map-dialog"
    :aria-labelledby = "'change-map-title'"
  >
    <form method = "dialog" class = "change-map-form">
      <header class = "change-map-header">
        <button
          v-if       = "'root' !== current"
          type       = "button"
          class      = "change-map-back"
          :aria-label = "$t('back')"
          :disabled  = "loading"
          @click.stop = "back"
        >
          <i class = "fas fa-arrow-left" aria-hidden = "true"></i>
        </button>
        <div class = "change-map-heading">
          <span v-t = "'changemap'"></span>
          <h1 id = "change-map-title">{{ 'root' === current ? $t('changemap') : (parent && (parent.title || parent.name)) || $t('changemap') }}</h1>
        </div>
      </header>

      <div class = "change-map-content" :aria-busy = "loading">
        <div v-if = "items.length" class = "g3w-change-map-menu-container">
          <article v-for = "item in items" :key = "item.name" class = "menu-item">
            <button
              type       = "button"
              class      = "menu-item-open"
              :disabled  = "loading"
              @click.stop = "trigger(item)"
            >
              <span class = "menu-item-image">
                <img
                  :src   = "item.thumbnail || item.header_logo_img || item.logo_img"
                  @error = "setItemImageSrc({ item, type: 'net_error' })"
                  alt    = ""
                  loading = "lazy"
                />
              </span>
              <span class = "menu-item-title">
                <span>{{ item.title || item.name }}</span>
                <i v-if = "'projects' === current" class = "fas fa-map" aria-hidden = "true"></i>
                <i v-else class = "fas fa-chevron-right" aria-hidden = "true"></i>
              </span>
            </button>
            <div v-if = "item.description" class = "menu-item-description" v-html = "item.description"></div>
          </article>
        </div>

        <section v-else class = "change-map-empty" role = "status">
          <span class = "change-map-empty-icon" aria-hidden = "true">
            <i class = "fas fa-map-marked-alt"></i>
          </span>
          <h2 v-t = "`No other ${current}`"></h2>
          <button
            v-if       = "'root' !== current"
            type       = "button"
            class      = "change-map-empty-back"
            :disabled  = "loading"
            @click.stop = "back"
          >
            <i class = "fas fa-arrow-left" aria-hidden = "true"></i>
            {{ $t('back') }}
          </button>
        </section>
      </div>

      <menu class = "change-map-footer">
        <button
          type  = "submit"
          class = "btn btn-secondary"
        >{{ $t('close') }}</button>
      </menu>
    </form>
  </dialog>
</template>

<script>

import ApplicationState        from 'g3w-state';
import { XHR }                 from 'utils/XHR';
import { getListableProjects } from 'utils/getListableProjects';
import GUI                     from 'g3w-app';

const LOGO_GIS3W = 'images/logo_gis3w_156_85.png';

/** Cached HTTP GET request */
async function get_macro(id) {
  get_macro[id] = get_macro[id] || await XHR.get({ url: encodeURI(`/${ApplicationState.user.i18n}/about/api/group/${id}/`) });
  return get_macro[id];
}

/** Cached HTTP GET request */
async function get_group(id) {
  get_group[id] = get_group[id] || await XHR.get({ url: encodeURI(`/${ApplicationState.user.i18n}/about/api/group/${id}/projects/`) });
  return get_group[id];
}

export default {

  /** @since 3.11.0 */
  name: 'modal-changemap',

  data() {
    return {
      
      /** @type { uknown } */
      state:      null,

      /** @type {boolean} */
      loading:    false,

      /** @type { 'projects' | 'groups' | 'root' } */
      current:    'projects',

      /** @type { Array } */
      items:      [],

      /** @type { uknown } */
      parent:     null,

      /** @type { Array } all items from top to bottom */
      steps:      [],

      /** @type { string } ID of a current project group */
      curr_group: null,
 
    }
  },

  methods: {

    /**
     * @returns { Promise<void> }
     */
    async back() {
      const last_step   = this.steps.pop();                               // remove last
      const has_steps   = this.steps.length > 0;
      const item        = has_steps && this.steps[this.steps.length - 1]; // get last step

      // back to macrogrup
      if (
        (has_steps && undefined !== item.macrogroup_id) ||
        (!has_steps && undefined === last_step && Array.isArray(this.parent.macrogroup_id) && this.parent.macrogroup_id.length > 0) // no steps done the first time
      ) {
        const macrogroup_id = has_steps ? item.macrogroup_id : this.parent.macrogroup_id;
        const add           = !has_steps; // false = step it's comping from bottom to top
        return this.showMacroGroups(macrogroup_id, add);
      }

      // back to group
      if (has_steps && undefined === item.macrogroup_id) {
        return this.showGroups(item, false);
      }

      // back to root
      if (!has_steps) {
        return this.showRoot();
      }
    },

    /**
     * @param { Array } macrogroup_id
     * @param { boolean } addStep Boolean
     * 
     * @returns { Promise<void> }
     * 
     * @since 3.10.0
     */
    async showMacroGroups(macrogroup_id = [], addStep = true) {
      // the current project belongs to just one macrogroup
      if (1 === macrogroup_id.length) {
        this.parent = this.macrogroups.find(mg => mg.id === macrogroup_id[0]);
        return await this.showGroups(this.parent);
      }

      // the current project belongs to more than one macrogroup
      this.items   = this.macrogroups.filter(m => macrogroup_id.includes(m.id));
      this.current = 'macrogroups';
      this.parent  = {
        macrogroup_id,
        title: null, // hide title
        name:  null   // hide name
      }

      if (addStep) {
        this.steps.push(this.parent);
      }
    },

    /**
     * @param item
     * @param { boolean } addStep Boolean
     * 
     * @returns { Promise<void> }
     */
    async showGroups(item, addStep = true) {
      try {
        this.loading = true;
        this.parent  = item;
        this.items   = await get_macro(item.id);
        this.current = 'groups';
      } catch(e) {
        console.warn(e);
        this.items = [];
      } finally {
        if (addStep) {
          this.steps.push(this.parent);
        }
        this.loading = false;
      }
    },

    /**
     * @param item
     * 
     * @returns { Promise<void> }
     */
    async showProjects(item) {
      try {
        this.loading = true;
        this.parent  = item;
        this.items   = (
          this.parent.id === this.curr_group
            ? getListableProjects()
            : await get_group(item.id, item => this.setItemImageSrc({ item, type: 'project' }))
        );
        this.current = 'projects';
      } catch(e) {
        console.warn(e);
        this.items = [];
      } finally {
        this.steps.push(this.parent);
        this.loading = false;
      }
    },

    showRoot() {
      this.current = 'root';
      this.items = [...this.macrogroups, ...this.groups];
      this.steps = [];
    },

    /**
     * @param {string} item.url
     * @param {string} item.map_url
     */
    async changeMapProject(item) {
      let url;
      const base_url = window.initConfig.urls.baseurl;
      const epsg     = this.parent.srid ? `EPSG:${this.parent.srid}` : this.parent.crs.epsg;
      await ApplicationState.projections.set(epsg);
      try {
        new URL(base_url);
        url = `${base_url}${item.url || item.map_url.replace(/^\//, "")}`;
      } catch(e) {
        url = `${location.origin}${base_url}${item.url || item.map_url.replace(/^\//, "")}`;
      }
      url = await GUI.addMapExtentUrlParameterToUrl(url, epsg);
      history.replaceState(null, null, url);
      location.replace(url);
    },

    async trigger(item) {
      switch(this.current) {
        case 'root':        return undefined === item.srid ? this.showGroups(item) : this.showProjects(item); // `srid` is undefined when item is a macrogroup
        case 'macrogroups': return this.showGroups(item);
        case 'groups':      return await this.showProjects(item);
        case 'projects':    return await this.changeMapProject(item);
      }
    },

    /**
     * Set scr image of project, group, macrogroup
     * 
     * @param { 'project' | 'group' | 'macrogroup' } image.type
     * @param                                        image.item
      */
    setItemImageSrc({ item, type } = {}) {
      switch(type) {
        case 'project':    item.thumbnail       = this._setSrc(item.thumbnail); break;
        case 'group':      item.header_logo_img = this._setSrc(item.header_logo_img); break;
        case 'macrogroup': item.logo_img        = this._setSrc(item.logo_img); break;
        // Set a fallback image on network error.
        case 'net_error':
          if (item.thumbnail || item.logo_img) {
            item.thumbnail = `${window.initConfig.urls.clienturl}${LOGO_GIS3W}`;
          } else if (item.header_logo_img) {
            item.header_logo_img = `${window.initConfig.urls.clienturl}${LOGO_GIS3W}`;
          }
          break;
      }
    },

    /**
     * @TODO extract as utility function (almost the same as `components/ProjectsMenu::logoSrc(src)`) 
     */
    _setSrc(src) {
      let imageSrc;
      const host       = this.$options.host || '';
      const mediaurl   = window.initConfig.mediaurl;
      const clienturl  = window.initConfig.urls.clienturl;
      const has_media  = src && (src.includes(mediaurl));
      const not_static = src && (!src.includes('static') && !src.includes('media'));

      if (!src) {
        imageSrc = `${clienturl}${LOGO_GIS3W}`;
      } else if (has_media) {
        imageSrc = src;
      } else if (not_static) {  
        imageSrc = `${mediaurl}${src}`;
      } else {
        imageSrc = `${clienturl}${LOGO_GIS3W}`;
      }

      return `${host}${imageSrc}`;
    },

    /**
     * @since 4.1.0
     */
    async onBeforetoggle(e) {
      if ('open' === e.newState && window.innerWidth < 767) {
        GUI.hideSidebar();
      }
    },

  },

  async created() {

    const config = window.initConfig;

    // setup items data (macrogrups and groups).
    this.items       = getListableProjects();
    this.parent      = window.initConfig;
    this.curr_group  = this.parent.id;
    this.macrogroups = config.macrogroups;
    this.groups      = config.groups;

    // setup items images
    Object
      .entries({ 'project': this.items, 'magrocroup': this.macrogroups, 'group': this.groups })
      .forEach(([type, d]) => d.forEach(item => this.setItemImageSrc({ item, type })))
  },

  mounted() {
    document.body.appendChild(this.$el);
  },

};
</script>

<style scoped>
  .change-map-dialog {
    width: min(980px, calc(100vw - 32px));
    min-width: 0;
    max-width: none;
    height: min(740px, calc(100dvh - 32px));
    max-height: calc(100dvh - 24px);
    padding: 0;
    overflow: hidden;
    border: 1px solid #cbd4d5;
    border-radius: 12px;
    color: #263238;
    background: #f4f7f5;
    box-shadow: 0 24px 70px rgb(10 25 30 / 30%);
  }

  .change-map-form {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 0 !important;
  }

  .change-map-header {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 76px;
    padding: 14px 22px;
    color: #fff;
    background: #202d31;
    border-bottom: 3px solid var(--skin-color);
  }

  .change-map-back {
    display: grid;
    place-items: center;
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    border: 1px solid rgb(255 255 255 / 55%);
    border-radius: 6px;
    color: #fff;
    background: transparent;
    cursor: pointer;
  }

  .change-map-back:hover:not(:disabled) {
    background: rgb(255 255 255 / 12%);
  }

  .change-map-back:focus-visible,
  .menu-item-open:focus-visible,
  .change-map-empty-back:focus-visible {
    outline: 3px solid var(--skin-focus);
    outline-offset: 2px;
  }

  .change-map-back:disabled,
  .menu-item-open:disabled,
  .change-map-empty-back:disabled {
    cursor: wait;
  }

  .change-map-heading {
    min-width: 0;
  }

  .change-map-heading > span {
    display: block;
    margin-bottom: 3px;
    color: #cbd6d7;
    font-size: 1.2rem;
  }

  .change-map-heading h1 {
    margin: 0;
    color: #fff;
    font-size: 2.2rem;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .change-map-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px 22px;
  }

  .g3w-change-map-menu-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
    gap: 16px;
  }

  .menu-item {
    overflow: hidden;
    border: 1px solid #d8e0de;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 2px 5px rgb(25 45 40 / 6%);
  }

  .menu-item-open {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    color: inherit;
    text-align: left;
    background: transparent;
    cursor: pointer;
  }

  .menu-item-image {
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 7;
    overflow: hidden;
    background: linear-gradient(135deg, #e7eeeb, #f5f7f6);
  }

  .menu-item-image img {
    width: 100%;
    height: 100%;
    padding: 12px;
    object-fit: contain;
  }

  .menu-item-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 52px;
    padding: 12px 15px;
    font-size: 1.6rem;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .menu-item-title i {
    flex: 0 0 auto;
    color: var(--skin-color);
  }

  .menu-item-description {
    padding: 0 15px 15px;
    color: #536267;
    font-size: 1.4rem;
    line-height: 1.5;
  }

  .change-map-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    padding: 28px;
    text-align: center;
    background: linear-gradient(135deg, #eef3f0, #fbfcfb 70%);
    border: 1px solid #e0e7e3;
    border-radius: 8px;
  }

  .change-map-empty-icon {
    display: grid;
    place-items: center;
    width: 68px;
    height: 68px;
    border-radius: 18px;
    color: #355a4b;
    background: #dce9e1;
    font-size: 3rem;
  }

  .change-map-empty h2 {
    margin: 16px 0 0;
    color: #263238;
    font-size: 2rem;
    font-weight: 700;
  }

  .change-map-empty-back {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    margin-top: 18px;
    padding: 8px 14px;
    border: 1px solid #aab9b1;
    border-radius: 6px;
    color: #263d33;
    background: #fff;
    cursor: pointer;
  }

  .change-map-dialog > .change-map-form > .change-map-footer {
    display: flex;
    justify-content: flex-end;
    margin: 0;
    padding: 12px 22px 18px;
    border-top: 1px solid #e0e5e3;
    background: #fff;
  }

  @media (max-width: 600px) {
    .change-map-dialog {
      width: calc(100vw - 20px);
      height: calc(100dvh - 20px);
      max-height: calc(100dvh - 20px);
      border-radius: 8px;
    }

    .change-map-header {
      min-height: 68px;
      padding: 12px 14px;
    }

    .change-map-heading h1 {
      font-size: 1.9rem;
    }

    .change-map-content {
      padding: 14px;
    }

    .change-map-dialog > .change-map-form > .change-map-footer {
      padding: 10px 14px 14px;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    .menu-item {
      transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
    }

    .menu-item:has(.menu-item-open:hover) {
      transform: translateY(-2px);
      border-color: #a9bbb2;
      box-shadow: 0 8px 20px rgb(25 45 40 / 12%);
    }
  }
</style>