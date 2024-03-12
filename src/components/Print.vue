<!--
  @file
  @since v3.7
-->

<template>
  <ul id="print" class="treeview-menu">
    <li>
      <form class="g3w-search-form form-horizonal">

        <div class="box-body">

          <transition :duration="500" name="fade">
            <bar-loader :loading="state.loading"/>
          </transition>

          <helpdiv message='sdk.print.help'/>

          <!-- PRINT TEMPLATE -->
          <label for="templates" v-t="'sdk.print.template'"></label>
          <select
            id      = "templates"
            class   = "form-control"
            @change = "changeTemplate"
            v-model = "state.template"
            :style  = "{ marginBottom: this.state.atlas && '10px' }"
          >
            <option v-for="print in state.print" :value="print.name">{{ print.name }}</option>
          </select>

          <template v-if="!state.atlas">

            <!-- PRINT SCALE -->
            <label for="scale" v-t="'sdk.print.scale'"></label>
            <select
              id         = "scale"
              v-disabled = "!has_maps"
              class      = "form-control"
              @change    = "changeScale"
              v-model    = "state.scale"
            >
              <option
                v-for="scale in state.scales"
                :value="scale.value">
                {{ scale.label }}
              </option>
            </select>

            <!-- PRINT DPI -->
            <label for="dpi">dpi</label>
            <select
              id      = "dpi"
              class   = "form-control"
              v-model = "state.dpi"
            >
              <option v-for="dpi in state.dpis">{{ dpi }}</option>
            </select>

            <!-- PRINT ROTATION -->
            <label for="rotation" v-t="'sdk.print.rotation'"></label>
            <input
              id         = "rotation"
              v-disabled = "!has_maps"
              min        = "-360"
              max        = "360"
              @input     = "changeRotation"
              v-model    = "state.rotation"
              class      = "form-control"
              type       = "number"
            />

            <!-- PRINT FORMAT -->
            <label for="format" v-t="'sdk.print.format'"></label>
            <select
              id      = "format"
              class   = "form-control"
              v-model = "state.format"
            >
              <option
                v-for="format in state.formats"
                :value="format.value">
                {{ format.label }}
              </option>
            </select>

          </template>

          <!-- PRINT ATLAS -->
          <div
            v-if  = "state.atlas"
            class = "form-group"
            style = "width: 100%;"
            ref   = "print_atlas"
          >
            <!-- ORIGINAL SOURCE: src/componentsPrintSelectAtlasFieldValues.vue@v3.9.3 -->
            <template v-if = "has_autocomplete">
              <label for="print_atlas_autocomplete"><span>{{ state.atlas.field_name }}</span></label>
              <select id="print_atlas_autocomplete" :name="state.atlas.field_name" class="form-control"></select>
            </template>
            <!-- ORIGINAL SOURCE: src/components/PrintFidAtlasValues.vue@v3.9.3 -->
            <template v-else>
              <label><span>fids [max: {{ state.atlas.feature_count - 1 }}]</span></label>
              <input class="form-control" v-model="atlas_values" @keydown.space.prevent>
              <div id="fid-print-atals-instruction">
                <div id="fids_intruction"      v-t="'sdk.print.fids_instruction'"></div>
                <div id="fids_examples_values" v-t="'sdk.print.fids_example'"></div>
              </div>
            </template>
          </div>

          <div v-if="state.labels && state.labels.length" class="print-labels-content">
            <label class="skin-color" v-t="'sdk.print.labels'"></label>
            <div class="labels-input-content">
              <span
                v-for = "label in state.labels"
                :key  = "label.id"
              >
                <label :for="`g3w_label_id_input_${label.id}`">{{ label.id }}</label>
                <input
                  :id     = "`g3w_label_id_input_${label.id}`"
                  class   = "form-control"
                  v-model = "label.text"
                />
              </span>
            </div>
          </div>

        </div>

        <div class="box-footer">
          <span>
            <button
              id                  = "printbutton"
              class               = "sidebar-button-run btn"
              v-disabled          = "disabled"
              v-download
              v-t                 = "'create_print'"
              @click.stop.prevent = "print"
            ></button>
          </span>
        </div>

      </form>
    </li>
  </ul>
</template>

<script>
import {
  PRINT_SCALES,
  PRINT_RESOLUTIONS,
  PRINT_FORMATS,
  TIMEOUT,
}                                   from 'app/constant';
import Component                    from 'core/g3w-component';
import ApplicationState             from 'store/application-state';
import CatalogLayersStoresRegistry  from 'store/catalog-layers';
import ProjectsRegistry             from 'store/projects';
import ApplicationService           from 'services/application';
import GUI                          from 'services/gui';
import { getScaleFromResolution }   from 'utils/getScaleFromResolution';
import { getResolutionFromScale }   from 'utils/getResolutionFromScale';
import { getMetersFromDegrees }     from 'utils/getMetersFromDegrees';
import { downloadFile }             from 'utils/downloadFile';
import { printAtlas }               from 'utils/printAtlas';
import { print }                    from 'utils/print';

import resizeMixin                  from 'mixins/resize';

import * as vueComp                 from 'components/PrintPage.vue';

const { t } = require('core/i18n/i18n.service');

export default {

  /** @since 3.8.6 */
  name: 'print',

  mixins: [resizeMixin],

  data() {
    this.init();
    return {
      state: this.state || {},
      disabled: false,
      /** @since 3.10.0 */
      atlas_values: [],
    };
  },

  computed: {

    /**
     * @return { boolean } whether current print has maps (only alphanumerical data)
     *
     * @since 3.9.4
     */
    has_maps() {
      return this.state.maps.length > 0;
    },

    has_autocomplete() {
      return !!(this.state.atlas && this.state.atlas.field_name);
    },

  },

  methods: {

    init() {
      this._init        = undefined !== this._init ? this._init: false;
      this._moveKey     = this._moveKey || null;
      this._page        = this._page || null;
      this._resolutions = this._resolutions || {};

      const print   = ProjectsRegistry.getCurrentProject().getPrint() || [];
      const visible = print.length > 0;

      this.state = Object.assign(this.state || {}, {
        print,
        loading:      false,
        downloading:  false,
        url:          null,
        layers:       true,
        maps:         visible ? print[0].maps   : undefined,
        labels:       visible ? print[0].labels : undefined,
        template:     visible ? print[0].name   : undefined,
        atlas:        visible ? print[0].atlas  : undefined,
        rotation:     visible ? 0               : undefined,
        inner:        [0, 0, 0, 0],
        scales:       PRINT_SCALES,
        scale:        visible ? null            : undefined,
        dpis:         PRINT_RESOLUTIONS,
        dpi:          PRINT_RESOLUTIONS[0],
        formats:      PRINT_FORMATS,
        format:       PRINT_FORMATS[0].value,
      });
    },

    resize() {
      if (this.select2 && !ApplicationState.ismobile) {
        this.select2.select2('close');
      }
    },

    async changeTemplate() {
      if (!this.state.template) {
        return;
      }

      await this.$nextTick();

      // destroy select2 dom element and remove all events
      if (this.select2) {
        this.select2.select2('destroy');
        this.select2.off();
        this.select2 = null;
      }

      this.disabled = false;

      const has_previous = this.state.atlas || 0 === this.state.maps.length;
      const print        = this.state.print.find(p => p.name === this.state.template)

      Object.assign(this.state, {
        maps:        print.maps,
        atlas:       print.atlas,
        labels:      print.labels,
      });

      this.atlas_values = [];

      if (this.state.atlas) {
        this._clearPrint();
      } else if (has_previous) {
        this.showPrintArea(true);
      } else {
        this._setPrintArea();
      }

      await this.$nextTick();
    },

    /**
     * On scale change set print area
     */
    changeScale() {
      if (this.state.scale) {
        this._setPrintArea();
      }
    },

    /**
     * On change rotation, rotate print area
     */
    changeRotation() {
      this.state.rotation = this.state.rotation >= 0 ? Math.min(this.state.rotation || 0, 360) : Math.max(this.state.rotation || 0, -360);
      GUI.getService('map').setInnerGreyCoverBBox({ rotation: this.state.rotation });
    },

    /**
     * @param extent
     *
     * @returns { string }
     */
    getOverviewExtent(extent={}) {
      const { xmin, xmax, ymin, ymax } = extent;
      return (GUI.getService('map').isAxisOrientationInverted() ? [ymin, xmin, ymax, xmax] : [xmin, ymin, xmax, ymax]).join();
    },

    /**
     * @returns { string }
     */
    getPrintExtent() {
      const map          = GUI.getService('map').viewer.map;
      const [xmin, ymin] = map.getCoordinateFromPixel([this.state.inner[0], this.state.inner[1]]);
      const [xmax, ymax] = map.getCoordinateFromPixel([this.state.inner[2], this.state.inner[3]]);
      return (GUI.getService('map').isAxisOrientationInverted() ? [ymin, xmin, ymax, xmax] : [xmin, ymin, xmax, ymax]).join();
    },

    /**
     * @returns { Promise<unknown> }
     */
    async print() {
      const has_atlas = !!this.state.atlas;
      let err, download_id;

      this.state.loading = true;

      try {

        // disable sidebar
        GUI.disableSideBar(true);

        // ATLAS PRINT
        if (has_atlas) {
          download_id = ApplicationService.setDownload(true);
          await downloadFile({
            url: (await printAtlas({
              template: this.state.template,
              field:    this.state.atlas.field_name || '$id',
              values:   this.state.atlas_values,
              download: true
            })).url,
            filename: this.state.template,
            mime_type: 'application/pdf'
          });
        }

        // SIMPLE PRINT
        if (!has_atlas) {
          this.state.url       = null;
          this.state.layers    = true;

          const output = await print({
            rotation:             this.state.rotation,
            dpi:                  this.state.dpi,
            template:             this.state.template,
            scale:                this.state.scale,
            format:               this.state.format,
            labels:               this.state.labels,
            is_maps_preset_theme: this.state.maps.some(m => undefined !== m.preset_theme),
            maps:                 this.state.maps.map(m => ({
                name:         m.name,
                preset_theme: m.preset_theme,
                scale:        m.overview ? m.scale : this.state.scale,
                extent:       m.overview ? this.getOverviewExtent(m.extent) : this.getPrintExtent()
            })),
          }, ProjectsRegistry.getCurrentProject().getOwsMethod());
          this.state.url       = output.url;
          this.state.layers    = output.layers;

          //In case of already print page open, need to close it otherwise is appended on a dom element
          if (this._page) {
            GUI.closeContent();
          }

          this._page = new Component({ service: { state: this.state }, vueComponentObject: vueComp });

          // set print area after closing content
          this._page.unmount = () => {
            GUI.getService('map').viewer.map.once('postrender', this._setPrintArea.bind(this));
            this.state.downloading = false;
            return Component.prototype.unmount.call(this._page);
          };

          GUI.setContent({
            content: this._page,
            title: 'print',
            perc: 100
          });
        }

      } catch(e) {
        err = e;
      }

      this.state.loading = false;

      if (download_id) {
        ApplicationService.setDownload(false, download_id);
      }

      // in case of no layers
      if (has_atlas || !this.state.layers) {
        GUI.disableSideBar(false);
      }

      if (err) {
        console.warn(err);
        GUI.notify.error(err || t("info.server_error"));
        GUI.closeContent();
      }

    },

    /**
     * @param { boolean } show
     */
    showPrintArea(show) {
      // close content if open
      const reset = !show;
      if (reset && this.select2)           { this.select2.val(null).trigger('change'); }
      if (reset)                           { this.atlas_values = []; }
      if (reset && !this.has_autocomplete) { this.disabled = true }
      GUI
        .closeContent()
        .then(component => {
          setTimeout(() => {
            const map      = component.getService();
            map.getMap().once('postrender', e => {
              if (!show) {
                return this._clearPrint();
              }
              this._moveKey = map.viewer.map.on('moveend', this._setPrintArea.bind(this));
              this._initPrintConfig();
              // show print area
              if (undefined === this.state.atlas) {
                this._setPrintArea();
                map.startDrawGreyCover();
              }
            });
            map.getMap().renderSync();
          })
        })
    },

    /**
     * Calculate internal print extent
     */
    _setPrintArea() {
      // No maps set. Only attributes label
      if (!this.has_maps) {
        return this._clearPrint();
      }
      const map        = GUI.getService('map').viewer.map;
      const size       = map.getSize();
      const resolution = map.getView().getResolution();
      const { h, w }   = this.state.maps.find(m => !m.overview);
      const res        = GUI.getService('map').getMapUnits() === 'm' ? resolution : getMetersFromDegrees(resolution); // resolution in meters
      const w2         = (((w / 1000.0) * parseFloat(this.state.scale)) / res) / 2;
      const h2         = (((h / 1000.0) * parseFloat(this.state.scale)) / res) / 2;
      const [x, y]     = [ (size[0]) / 2, (size[1]) / 2 ]; // current map center: [x, y] (in pixel)
      this.state.inner = [x - w2, y + h2, x + w2, y - h2]; // inner bbox: [xmin, ymax, xmax, ymin] (in pixel)
      GUI.getService('map').setInnerGreyCoverBBox({
        type: 'pixel',
        inner: this.state.inner,
        rotation: this.state.rotation
      });
    },

    _clearPrint() {
      ol.Observable.unByKey(this._moveKey);
      this._moveKey = null;
      GUI.getService('map').stopDrawGreyCover();
    },

    /**
     * Set all scales based on max resolution
     *
     * @param maxResolution
     */
    _setScales(maxResolution) {
      let res        = maxResolution;
      const units    = GUI.getService('map').getMapUnits();
      const mapScale = getScaleFromResolution(res, units);
      const scales   = this.state.scales.sort((a, b) => b.value - a.value);
      let scale      = [];
      let first      = true;
      scales
        .forEach((scala, i) => {
          if (mapScale > scala.value) {
            let s = first ? scales[i-1] : scala;
            first = false;
            scale.push(s);
            res = getResolutionFromScale(s.value, units);
            this._resolutions[s.value] = res;
            res /= 2;
          }
        });
      this.state.scales = scale;
    },

    _initPrintConfig() {
      const view = GUI.getService('map').viewer.map.getView();
      if (!this._initialized) {
        this._setScales(view.getMaxResolution());
        this._initialized = true;
      }
      const resolution = view.getResolution();

      // set current scale
      Object
        .entries(this._resolutions)
        .find(([scala, res]) => {
          if (resolution <= res) {
            this.state.scale = scala;
            return true
          }
        });
    },

    reload() {
      this.state.print    = ProjectsRegistry.getCurrentProject().state.print || [];
      const visible       = this.state.print.length > 0;
      const init          = this._initialized;
      this.state.template = visible ? this.state.print[0].name : this.state.template;
      if (visible && !init) {
        this.init();
      }
      if (visible) {
        this._initPrintConfig();
        const map = GUI.getService('map');
        map.on('changeviewaftercurrentproject', () => {
          this.state.scales = PRINT_SCALES;
          this._setScales(map.viewer.map.getView().getMaxResolution());
        });
      } else {
        this._clearPrint();
      }
    },

  },

  watch: {

    async has_autocomplete(b) {
      if (!b) return;

      await this.$nextTick();

      this.select2 = $('#print_atlas_autocomplete').select2({
        width: '100%',
        multiple: true,
        dropdownParent: $(this.$refs.print_atlas.$el),
        minimumInputLength: 1,
        ajax: {
          delay: 500,
          transport: async d => {
            try {
              d.success({
                results: (await CatalogLayersStoresRegistry.getLayerById(this.state.atlas.qgs_layer_id).getFilterData({
                  suggest: `${this.state.atlas.field_name}|${d.data.q}`,
                  unique: this.state.atlas.field_name,
                })).map(v => ({ id: v, text: v }))
              });
            } catch(e) {
              console.warn(e);
              d.failure(e);
            }
          }
        },
        /**
         * @param { Object } params
         * @param params.term the term that is used for searching
         * @param { Object } data
         * @param data.text the text that is displayed for the data object
         */
        matcher: (params, data) => {
            const search = params.term ? params.term.toLowerCase() : params.term;
            if ('' === (search || '').toString().trim())                             return data;        // no search terms → get all of the data
            if (data.text.toLowerCase().includes(search) && undefined !== data.text) return { ...data }; // the searched term
            return null;                                                                                 // hide the term
        },
        language: {
          noResults:     () => t("sdk.search.no_results"),
          errorLoading:  () => t("sdk.search.error_loading"),
          searching:     () => t("sdk.search.searching"),
          inputTooShort: d => `${t("sdk.search.autocomplete.inputshort.pre")} ${d.minimum - d.input.length} ${t("sdk.search.autocomplete.inputshort.post")}`,
        },
      });
      this.select2.on('select2:select',   e => { this.atlas_values.push(e.params.data.id); });
      this.select2.on('select2:unselect', e => { this.atlas_values = this.atlas_values.filter(v => v != e.params.data.id); }); // NB: != instead of !== because sometime we need to compare "numbers" with "strings"
    },

    atlas_values: {
      immediate: true,
      async handler(vals) {
        if (this._skip_atlas_check || !this.atlas) {
          return;
        }
        if (this.has_autocomplete) {
          this.disabled = 0 === vals.length;
          return;
        }
        const validate = n => (n && Number.isInteger(1 * n) && 1 * n >= 0 && 1 * n < this.state.atlas.feature_count) || null;
        const values = new Set();
        const value = (vals ? vals[0] : '') || '';
        value
          .split(',')
          .filter(v => v)
          .forEach(value => {
            if (-1 === value.indexOf('-') && validate(value) !== null) {
              values.add(value);
              return;
            }
            const _values = value.split('-');
            const range = _values.filter(v => validate(v) !== null);
            if (range.length === _values.length && range.reduce((bool, value, i) => bool && ((0 === i) || range[i-1] <= value), true)) {
              for (let i = 1; i < range.length; i++) {
                for (let j = range[i-1]; j < range[i]; j++ ) { values.add(j+''); }
              }
              values.add(range[range.length-1]);
            }
          });
        this._skip_atlas_check = true;
        this.atlas_values = Array.from(values);
        await this.$nextTick();
        this._skip_atlas_check = false;
        this.disabled = '' === value.trim();
      }
    },

    'state.url': async function(url) {
      if (!url) {
        return;
      }
      let timeout;

      try {

        await this.$nextTick();

        // add timeout
        timeout = setTimeout(() => {
          GUI.disableSideBar(false);
          this.state.downloading = false;
          GUI.showUserMessage({ type: 'alert', message: 'timeout' });
        }, TIMEOUT);

        const response = await fetch(url);

        if (!response.ok) {
          throw response.statusText;
        }
      } catch (e) {
        console.warn(e);
        GUI.notify.error(e || t("info.server_error"));
        GUI.closeContent();
      } finally {
        clearTimeout(timeout);
        GUI.disableSideBar(false);
        this.state.downloading = false;
      }

    }

  },

};
</script>

<style scoped>
.print-labels-content {
  margin-top: 5px;
}
.print-labels-content > label.skin-color {
  font-weight: bold;
  font-size: 1.1em;
  display: block;
  border-bottom: 2px solid #ffffff;
  margin-bottom: 5px;
}
.print-labels-content > .labels-input-content {
  max-height: 120px;
  overflow-y: auto
}
.g3w-search-form > .box-footer {
  background-color: transparent;
}
#printbutton {
  width:100%;
  font-weight: bold;
}
.form-group > label {
  display: block;
}
#fid-print-atals-instruction {
  margin-top: 5px;
  color: #fff;
}
#fids_intruction {
  white-space: pre-line;
}
#fids_examples_values {
  margin-top: 3px;
  font-weight: bold;
}
</style>