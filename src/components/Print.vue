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
            <label for="scala" v-t="'sdk.print.scale'"></label>
            <select
              id         = "scala"
              v-disabled = "!has_maps"
              class      = "form-control"
              @change    = "changeScale"
              v-model    = "state.scala"
            >
              <option v-for="scale in state.scale" :value="scale.value">{{ scale.label }}</option>
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
              @input     = "onChangeRotation"
              v-model    = "state.rotation"
              class      = "form-control"
              type       = "number"
            />

            <!-- PRINT FORMAT -->
            <label for="format" v-t="'sdk.print.format'"></label>
            <select
              id      = "format"
              class   = "form-control"
              v-model = "state.output.format"
            >
              <option v-for="format in state.formats" :value="format.value">{{ format.label }}</option>
            </select>

          </template>

          <!-- PRINT ATLAS -->
          <div
            v-if                = "!atlas_change && state.atlas"
            class               = "form-group"
            style               = "width: 100%;"
            ref                 = "print_atlas"
          >
            <!-- ORIGINAL SOURCE: src/componentsPrintSelectAtlasFieldValues.vue@v3.9.3 -->
            <template v-if = "is_autocomplete">
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
      /** @since 3.8.7 **/
      atlas_change: false, // whether redraw component after changing template
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

    is_autocomplete() {
      return !!(this.state.atlas && this.state.atlas.field_name);
    },

  },

  methods: {

    init() {
      this._initialized       = undefined !== this._initialized ? this._initialized: false;
      this._moveMapKeyEvent   = this._moveMapKeyEvent || null;
      this._page              = this._page || null;
      this._scalesResolutions = this._scalesResolutions || {};

      const print   = ProjectsRegistry.getCurrentProject().getPrint() || [];
      const visible = print.length > 0; 

      this.state = Object.assign(this.state || {}, {
        visible,
        print,
        isShow: false,
        loading: false,
        url: null,
        output: {
          url: null,
          method: ProjectsRegistry.getCurrentProject().getOwsMethod(),
          layers: true,
          format: visible ? null : undefined,
          loading: false,
          type: null,
        },
        printextent: {
          minx: [0, 0],
          miny: [0, 0],
          maxx: [0, 0],
          maxy: [0, 0]
        },
        template:    visible ? print[0].name        : undefined,
        atlas:       visible ? print[0].atlas       : undefined,
        atlasValues: visible ? []                   : undefined,
        rotation:    visible ? 0                    : undefined,
        inner:       visible ? [0, 0, 0, 0]         : undefined,
        center:      visible ? null                 : undefined,
        size:        visible ? null                 : undefined,
        scale:       visible ? PRINT_SCALES         : undefined,
        scala:       visible ? null                 : undefined,
        dpis:        visible ? PRINT_RESOLUTIONS    : undefined,
        dpi:         visible ? PRINT_RESOLUTIONS[0] : undefined,
        formats:     visible ? PRINT_FORMATS        : undefined,
        maps:        visible ? print[0].maps        : undefined,
        labels:      visible ? print[0].labels      : undefined,
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

      this.atlas_change = true;

      const has_previous = this.state.atlas || 0 === this.state.maps.length;
      const print        = this.state.print.find(p => p.name === this.state.template)
    
      Object.assign(this.state, {
        maps:        print.maps,
        atlas:       print.atlas,
        labels:      print.labels,
        atlasValues: [],
      });

      if (this.state.atlas) {
        this._clearPrint();
      } else if (has_previous) {
        this.showPrintArea(true);
      } else {
        this._setPrintArea();
      }

      await this.$nextTick();

      this.atlas_change = false;
    },

    onChangeRotation(e) {
      if (this.state.rotation >= 0 && null !== this.state.rotation  && '' != this.state.rotation) {
        e.target.value = this.state.rotation = Math.min(this.state.rotation, 360);
      } else if (this.state.rotation < 0) {
        e.target.value = this.state.rotation = Math.max(this.state.rotation, -360);
      } else {
        this.state.rotation = 0;
      }
      this.changeRotation();
    },

    /**
     * On change scala set print area
     */
    changeScale() {
      if (this.state.scala) {
        this._setPrintArea();
      }
    },

    /**
     * On change rotation, rotate print area
     */
    changeRotation() {
      GUI.getService('map').setInnerGreyCoverBBox({ rotation: this.state.rotation });
    },

    /**
     * @param extent
     * 
     * @returns { string }
     */
    getOverviewExtent(extent={}) {
      const { xmin, xmax, ymin, ymax } = extent;
      return (GUI.getService('map').isAxisOrientationInverted() ? [ymin, xmin, ymax, xmax ] : [xmin, ymin, xmax, ymax]).join();
    },

    /**
     * @returns { string }
     */
    getPrintExtent() {
      const [minx, miny, maxx, maxy] = [...this.state.printextent.lowerleft, ...this.state.printextent.upperright];
      return (GUI.getService('map').isAxisOrientationInverted() ? [miny, minx, maxy, maxx ] : [minx, miny, maxx, maxy]).join();
    },

    /**
     * @returns { Promise<unknown> }
     */
    async print() {
      // disable sidebar
      GUI.disableSideBar(true);

      const has_atlas = !!this.state.atlas;
      let err;

      if (has_atlas) {
        const download_id = ApplicationService.setDownload(true);
        this.state.loading = true;
        try {
          return await downloadFile({
            url: (await printAtlas({
              template: this.state.template,
              field:    this.state.atlas.field_name || '$id',
              values:   this.state.atlasValues,
              download: true
            })).url,
            filename: this.state.template,
            mime_type: 'application/pdf'
          });
        } catch (e) {
          err = e;
        }
        this.state.loading = false;
        ApplicationService.setDownload(false, download_id);
      }

      if (!has_atlas) {
        this.state.output.url    = null;
        this.state.output.layers = true;

        console.log(this);

        this._page = new Component({ service: this.$options.service, vueComponentObject: vueComp });
        this._page.internalComponent.state = this.state.output;

        // set print area after closing content
        this._page.unmount = () => {
          GUI.getService('map').viewer.map.once('postrender', this._setPrintArea.bind(this));
          this.state.output.loading = false;
          return Component.prototype.unmount.call(this._page);
        };

        GUI.setContent({
          content: this._page,
          title: 'print',
          perc: 100
        });

        try {
          const output = await print({
            rotation:             this.state.rotation,
            dpi:                  this.state.dpi,
            template:             this.state.template,
            scale:                this.state.scala,
            format:               this.state.output.format,
            labels:               this.state.labels,
            is_maps_preset_theme: this.state.maps.some(m => undefined !== m.preset_theme),
            maps:                 this.state.maps.map(m => ({
              name:         m.name,
              preset_theme: m.preset_theme,
              scale:        m.overview ? m.scale : this.state.scala,
              extent:       m.overview ? this.getOverviewExtent(m.extent) : this.getPrintExtent()
            })),
          }, this.state.output.method);
          this.state.output.url       = output.url;
          this.state.output.layers    = output.layers;
          this.state.output.mime_type = output.mime_type;
        } catch (e) {
          err = e;
        }
      }

      // in case of no layers
      if (has_atlas || (!has_atlas && !this.state.output.layers)) {
        GUI.disableSideBar(false);
      }

      if (err) {
        console.warn(err);
        GUI.notify.error(err || t("info.server_error"));
        GUI.closeContent();
        throw err;
      }

    },

    /**
     * @param { boolean } show
     */
    showPrintArea(show) {
      // close content if open
      this.state.isShow = show;
      GUI
        .closeContent()
        .then(component => {
          setTimeout(() => {
            const map      = GUI.getService('map');
            map.getMap().once('postrender', e => {
              if (!show) {
                return this._clearPrint();
              }
              this._moveMapKeyEvent = map.viewer.map.on('moveend', this._setPrintArea.bind(this));
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

    _setPrintArea() {
      const map               = GUI.getService('map').viewer.map;
      this.state.size         = map.getSize();
      const resolution        = map.getView().getResolution();
      this.state.currentScala = getScaleFromResolution(resolution, GUI.getService('map').getMapUnits());
      this.state.center       = map.getView().getCenter();
  
      // calculate internal print extent
      const { h, w }          = this.state.maps.find(m=> !m.overview);
      const res               = GUI.getService('map').getMapUnits() === 'm' ? resolution : getMetersFromDegrees(resolution); // resolution in meters
      const w2                = (((w / 1000.0) * parseFloat(this.state.scala)) / res) / 2;
      const h2                = (((h / 1000.0) * parseFloat(this.state.scala)) / res) / 2;
      const [x, y]            = [ (this.state.size[0]) / 2, (this.state.size[1]) / 2 ]; // current map center: [x, y] (in pixel)
      this.state.inner        = [x - w2, y + h2, x + w2, y - h2];                       // inner bbox: [xmin, ymax, xmax, ymin] (in pixel)
      const ll                = map.getCoordinateFromPixel([this.state.inner[0], this.state.inner[1]]);
      const ur                = map.getCoordinateFromPixel([this.state.inner[2], this.state.inner[3]]);
      const { printextent }   = this.state;
      printextent.lowerleft   = ll ? ll : printextent.lowerleft;
      printextent.upperright  = ur ? ur : printextent.upperright;
  
      GUI.getService('map').setInnerGreyCoverBBox({
        type: 'pixel',
        inner: this.state.inner,
        rotation: this.state.rotation
      });
    },

    /**
     * @param reset
     */
    _clearPrint(reset=false) {
      ol.Observable.unByKey(this._moveMapKeyEvent);
      this._moveMapKeyEvent = null;
      GUI.getService('map').stopDrawGreyCover();
    },
  
    /**
     * @param maxResolution
     */
    _setAllScalesBasedOnMaxResolution(maxResolution) {
      let res        = maxResolution;
      const units    = GUI.getService('map').getMapUnits();
      const mapScala = getScaleFromResolution(res, units);
      const scales   = _.orderBy(this.state.scale, ['value'], ['desc']);
      let scale      = [];
      let first      = true;
      scales
        .forEach((scala, i) => {
          if (mapScala > scala.value) {
            let s = first ? scales[i-1] : scala;
            first = false;
            scale.push(s);
            res = getResolutionFromScale(s.value, units);
            this._scalesResolutions[s.value] = res;
            res /= 2;
          }
        });
      this.state.scale = scale;
    },
  
    _initPrintConfig() {
      const view = GUI.getService('map').viewer.map.getView();
      if (!this._initialized) {
        this._setAllScalesBasedOnMaxResolution(view.getMaxResolution());
        this._initialized = true;
      }
      const resolution = view.getResolution();
      // set current scale
      Object
        .entries(this._scalesResolutions)
        .find(([scala, res]) => {
          if (resolution <= res) {
            this.state.scala = scala;
            return true
          }
        });
    },

    reload() {
      this.state.print    = ProjectsRegistry.getCurrentProject().state.print || [];
      const visible       = this.state.visible = this.state.print.length > 0;
      const init          = this._initialized;
      this.state.template = visible ? this.state.print[0].name : this.state.template;
      if (visible && !init) {
        this.init();
      }
      if (visible) {
        this._initPrintConfig();
        const map = GUI.getService('map');
        map.on('changeviewaftercurrentproject', () => {
          const maxResolution = map.viewer.map.getView().getMaxResolution();
          this.state.scale = PRINT_SCALES;
          this._setAllScalesBasedOnMaxResolution(maxResolution);
        });
      } else {
        this._clearPrint();
      }
    },

  },

  watch: {

    async is_autocomplete(b) {
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
      this.select2.on('select2:select', e => {
        this.atlas_values.push(e.params.data.id);
        this.$nextTick().then(() => this.state.atlasValues = this.atlas_values || []);
      });
      this.select2.on('select2:unselect', async e => {
        this.atlas_values = this.atlas_values.filter(v => v != e.params.data.id); // NB: != instead of !== because sometime we need to compare "numbers" with "strings"
        this.$nextTick().then(() => this.state.atlasValues = this.atlas_values || []);
      });
    },

    async atlas_change(b) {
      if (!b) return;
      await this.$nextTick();
      this.atlas_values = null;
      // destroy select2 dom element and remove all events
      if (this.select2) {
        this.select2.select2('destroy');
        this.select2.off();
        this.select2 = null;
      }
      this.disabled = false
    },

    atlas_values: {
      immediate: true,
      handler(value) {
        if (this.is_autocomplete) {
          this.disabled = 0 === value.length;
          return;
        }
        const validate = n => n && Number.isInteger(1 * n) && 1 * n >= 0 && 1 * n < this.state.atlas.feature_count || null;
        const values = new Set();
        (value || '').split(',').filter(v => v).forEach(value => {
          if (value.indexOf('-') !== -1) {
            const _values = value.split('-');
            const range = _values.filter(v => validate(v) !== null);
            if (range.length === _values.length && range.reduce((bool, value, i) => bool && ((0 === i) || range[i-1] <= value), true)) {
              const r = range || [];
              const len = r.length;
              for (let i=1; i<len; i++) {
                const start = r[i-1];
                const end = r[i];
                for (let _i=start; _i < end; _i++ ) {
                  values.add(_i+'');
                }
              }
              values.add(r[len-1]);
            }
          } else if(validate(value) !== null) {
            values.add(value);
          }
        });
        this.state.atlasValues = Array.from(values);
        this.disabled = '' === value.trim();
      }
    },

    'state.isShow'(isShow) {
      const reset = !isShow;
      if (!reset) {
        return;
      }
      if (this.select2) {
        this.select2.val(null).trigger('change');
      }
      this.atlas_values = [];
      this.$nextTick().then(() => this.state.atlasValues = this.atlas_values || []);
      if (!this.is_autocomplete) {
        this.disabled = true
      }
    },

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