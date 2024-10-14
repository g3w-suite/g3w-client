<!--
  @file
  @since 3.11.0
-->

<template>
  <!-- Modal -->
  <div
    class    = "modal fade"
    id       = "modal-changemap"
    tabindex = "-1"
  >
    <div class = "modal-dialog" style="width: 80vw;">
      <div class = "modal-content">

        <div id = "g3w-change-map-menu" class="modal-body" style="height: 80vh;">

          <!-- CHILD NODE -->
          <div
            v-if  = "'root' !== this.current"
            style = "
              display: flex;
              align-items: center;
              color: #fff
            "
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
                :class = "$fa('reply')">
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

          <div
            v-if  = "items.length"
            class = "g3w-change-map-menu-container"
          >
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
                />
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

          <h3 v-else
            style = "font-weight: bold"
            v-t   = "` no_other_${current}`">
          </h3>

        </div>

        <div class = "modal-footer">
          <button
            v-t          = "'close'"
            type         = "button"
            class        = "btn btn-default"
            data-dismiss = "modal"
          ></button>
        </div>

      </div>
    </div>
  </div>
</template>

<script>

import ApplicationState        from 'store/application';
import Projections             from 'store/projections';
import { XHR }                 from 'utils/XHR';
import { getListableProjects } from 'utils/getListableProjects';
import GUI                     from 'services/gui';

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
  name: 'change-map',

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
      await Projections.registerProjection(epsg);
      try {
        new URL(base_url);
        url = `${base_url}${item.url || item.map_url.replace(/^\//, "")}`;
      } catch(e) {
        url = `${location.origin}${base_url}${item.url || item.map_url.replace(/^\//, "")}`;
      }
      url = await GUI.getService('map').addMapExtentUrlParameterToUrl(url, epsg);
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

};
</script>

<style scoped>
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