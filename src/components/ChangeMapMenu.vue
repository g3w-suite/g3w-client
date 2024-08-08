<!--
  @file
  @since 3.8.0
-->

<template>
  <div id = "g3w-change-map-menu">
    <!-- current node is a child -->
    <template v-if = "'root' !== this.current">
      <div
        style = "
          display: flex;
          align-items: center;
          color: #ffffff"
        class = "skin-background-color"
      >
        <span
          v-t-tooltip:bottom.create = "'change_session'"
          v-disabled                = "loading"
          @click.stop               = "back"
          style                     = "
            font-size: 2em;
            margin: 5px;
            cursor: pointer;
            padding: 3px;
            border: 2px solid #ffffff;
            border-radius: 3px;
          "
        >
          <i
            style  = "color: #FFFFFF"
            :class = "g3wtemplate.getFontClass('reply')">
          </i>
        </span>

        <div
          v-if  = "parent"
          style = "margin: auto"
        >
          <h3 style = "font-weight: bold">
            {{parent.title || parent.name}}
          </h3>
        </div>
      </div>
    </template>

    <div
      v-if  = "items.length"
      class = "g3w-change-map-menu-container">
      <div
        v-for = "item in items"
        :key  = "item.name"
        class = "menu-item"
      >

      <!-- ITEM IMAGE -->
        <div
          class       = "menu-item-image"
          @click.stop = "trigger(item)"
        >
          <img
            :src   = "item.thumbnail || item.header_logo_img || item.logo_img"
            @error = "setItemImageSrc({ item, type: 'net_error' })"
            alt    = "logo"
            class  = "img-responsive"
          >
        </div>

        <!-- ITEM CONTENT -->
        <div class = "menu-item-content">
          <div class = "menu-item-text">
            <h4 class = "menu-item-title">{{ item.title }}</h4>
            <div v-html = "item.description"></div>
          </div>
        </div>

      </div>
    </div>

    <template v-else>
      <h3
        style = "font-weight: bold"
        v-t   = "` no_other_${current}`">
      </h3>
    </template>

  </div>

</template>

<script>

import ApplicationService            from 'services/application';
import ProjectsRegistry              from "store/projects";
import Projections                   from 'store/projections';
import { API_BASE_URLS, LOGO_GIS3W } from 'app/constant';
import { XHR }                       from 'utils/XHR';


/** Cached HTTP GET request */
async function get_macro(id) {
  get_macro[id] = get_macro[id] || await XHR.get({ url: encodeURI(`/${ApplicationService.getApplicationUser().i18n}${API_BASE_URLS.ABOUT.group}${id}/`) });
  return get_macro[id];
}

/** Cached HTTP GET request */
async function get_group(id) {
  get_group[id] = get_group[id] || await XHR.get({ url: encodeURI(`/${ApplicationService.getApplicationUser().i18n}${API_BASE_URLS.ABOUT.projects.replace('__G3W_GROUP_ID__', id)}`) });
  return get_group[id];
}

export default {

  /** @since 3.8.6 */
  name: 'change-map-menu',

  data() {
    return {
      
      /**
       * @type {uknown}
       */
      state:      null,

      /**
       * @type {boolean}
       */
      loading:    false,

      /**
       * @type { 'projects' | 'groups' | 'root' }
       */
      current:    'projects',

      /**
       * @type {Array}
       */
      items:      [],

      /**
       * @type {uknown}
       */
      parent:     null,

      /**
       * @type { Array } all items from top to bottom
       */
      steps:      [],

      /**
       * @type { string } ID of a current project group
       */
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
            ? ProjectsRegistry.getListableProjects()
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
      const base_url = ProjectsRegistry.getBaseUrl();
      const epsg     = this.parent.srid ? `EPSG:${this.parent.srid}` : this.parent.crs.epsg;
      await Projections.registerProjection(epsg);
      try {
        new URL(base_url);
        url = `${base_url}${item.url || item.map_url.replace(/^\//, "")}`;
      } catch(e) {
        url = `${location.origin}${base_url}${item.url || item.map_url.replace(/^\//, "")}`;
      }
      return ApplicationService.changeMapProject({ url, epsg });
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
            item.thumbnail = `${ApplicationService.getConfig().urls.clienturl}${LOGO_GIS3W}`;
          } else if (item.header_logo_img) {
            item.header_logo_img = `${ApplicationService.getConfig().urls.clienturl}${LOGO_GIS3W}`;
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
      const mediaurl   = ProjectsRegistry.config.mediaurl;
      const clienturl  = ApplicationService.getConfig().urls.clienturl;
      const has_media  = src && (-1 !== src.indexOf(mediaurl));
      const not_static = src && (-1 === src.indexOf('static') && -1 === src.indexOf('media'));

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

  },

  async created() {

    const config = ApplicationService.getConfig();

    // setup items data (macrogrups and groups).
    this.items       = ProjectsRegistry.getListableProjects();
    this.parent      = ProjectsRegistry.getCurrentProjectGroup();
    this.curr_group  = this.parent.id;
    this.macrogroups = config.macrogroups;
    this.groups      = config.groups;

    // setup items images
    Object
      .entries({ 'project': this.items, 'magrocroup': this.macrogroups, 'group': this.groups })
      .forEach(([type, d]) => d.forEach(item => this.setItemImageSrc({ item, type })))
  },

};
</script>

<style scoped>
  #g3w-change-map-menu {
    width: 100%;
    position: relative;
  }
  .g3w-change-map-menu-container {
    height: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(30%, 1fr));
    grid-gap: 1em;
    overflow-y: auto;

  }
  .menu-item {
    margin-bottom: 20px;
    margin-top:20px;
  }

  .menu-item-image {
    cursor: pointer;
    position: relative;
    overflow: hidden;
    padding-bottom: 50%;
    opacity: 0.7;
  }

  .menu-item-image:hover {
    opacity: 1;
  }

  .menu-item-image img {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    margin: auto
  }
  .menu-item-content {
    padding: 15px;
    background: rgba(255,255,255,0.3);
  }
  .menu-item-text {
    position: relative;
    overflow: hidden;
    height: 100%;
    text-align: justify;
  }
  .menu-item-title {
    text-align: center;
    font-weight: bold;
    background: rgba(255,255,255,0.5);
    padding: 5px;
  }
</style>