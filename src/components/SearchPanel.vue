<!--
  @file
  @since v3.7
-->

<template>
  <div
    class      = "g3w-search-panel form-group"
    v-disabled = "state.searching"
  >

    <h4><b>{{ state.title }}</b></h4>

    <!-- SEARCH TOOLS -->
    <slot name="tools"></slot>

    <!-- SEARCH FORM -->
    <slot name="form">
      <form class="g3w-search-form">

        <div
          v-for = "forminput in state.forminputs"
          :key  = "forminput.id"
        >

          <sub>{{ forminput.type }}</sub>
          <sub>{{ forminput.widget }}</sub>

          <!-- NUMBER FIELD -->
          <div
            v-if  = "'numberfield' === forminput.type"
            class = "form-group numeric"
          >
            <label :for="forminput.id" class="search-label">
              <span>{{ forminput.label || forminput.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(forminput.operator)}}</span>
            </label>
            <input
              type    = "number"
              min     = "0"
              @change = "changeInput(forminput)"
              @input  = "changeInput(forminput)"
              v-model = "forminput.value"
              class   = "form-control"
              :id     = "forminput.id"
            />
          </div>

          <!-- TEXT FIELD -->
          <div
            v-else-if = "['textfield', 'textField'].includes(forminput.type)"
            class     = "form-group form-item-search text"
          >
            <label :for="forminput.id" class="search-label">
              <span>{{ forminput.label || forminput.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(forminput.operator)}}</span>
            </label>
            <input
              @focus  = "onFocus"
              type    = "text"
              v-model = "forminput.value"
              @change = "changeInput(forminput)"
              class   = "form-control"
              :id     = "forminput.id"
            />
          </div>

          <!-- AUTOCOMPLETE FIELD -->
          <div
            v-else-if  = "['selectfield', 'autocompletefield'].includes(forminput.type)"
            class      = "form-group text"
            v-disabled = "isSelectDisabled(forminput)"
          >
            <label :for="forminput.id" class="search-label">
              <span>{{ forminput.label || forminput.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(forminput.operator)}}</span>
            </label>
            <bar-loader
              v-if     = "forminput.options.dependance"
              :loading = "state.loading[forminput.options.dependance] || forminput.loading"
            />
            <select
              :ref       = "'search_select_' + forminput.id"
              :name      = "forminput.attribute"
              class      = "form-control"
              :id        = "forminput.id"
              v-disabled = "forminput.options.disabled || forminput.loading"
            >
              <option
                v-for  = "opt in forminput.options.values"
                :key   = "opt.value"
                :value = "opt.value"
              >
                <span v-if="opt.value === allvalue" v-t="'sdk.search.all'"></span>
                <span v-else>{{ opt.key }}</span>
              </option>
            </select>
          </div>

          <!-- DATETIME FIELD -->
          <div
            v-else-if  = "'datetimefield' === forminput.type"
            class      = "form-group text"
            v-disabled = "state.loading[forminput.options.dependance] || false"
          >
            <label :for="forminput.id" class="search-label">
              <span>{{ forminput.label || forminput.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(forminput.operator)}}</span>
            </label>
            <div :ref="'search_datetime_' + forminput.id" class="input-group date">
              <input :id="forminput.id" type='text' class="form-control" />
              <span class="input-group-addon skin-color">
                <span :class="g3wtemplate.getFontClass(forminput.options.format.time ? 'time': 'calendar')"></span>
              </span>
            </div>
          </div>

          <!-- LOGIC OPERATOR (AND | OR) -->
          <div
            v-if  = "forminput.logicop"
            class = "search-logicop skin-border-color"
          >
            <h4>{{ forminput.logicop }}</h4>
          </div>

        </div>

        <!-- SEARCH BUTTON -->
        <div class="form-group">
          <button
            id          = "dosearch"
            class       = "sidebar-button-run btn btn-block pull-right"
            @click.stop = "doSearch"
            data-i18n   = "dosearch"
            v-t         = "'dosearch'"
          ></button>
        </div>

      </form>
    </slot>

    <!-- SEARCH FOOTER -->
    <slot name="footer"></slot>

    <!-- Click to open G3W-ADMIN's project layers page -->
    <div v-if="layers_url" style="padding-top: 5em;"><b><a :href="layers_url" target="_blank">Edit in admin</a></b></div>

  </div>
</template>

<script>
import {
  FILTER_EXPRESSION_OPERATORS,
  SEARCH_ALLVALUE,
}                                            from 'app/constant';
import ApplicationState                      from 'store/application-state';
import CatalogLayersStoresRegistry           from 'store/catalog-layers';
import ApplicationService                    from 'services/application';
import DataRouterService                     from 'services/data';
import { getUniqueDomId }                    from 'utils/getUniqueDomId';
import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';
import { createSingleFieldParameter }        from 'utils/createSingleFieldParameter';
import resizeMixin                           from 'mixins/resize';

const { t } = require('core/i18n/i18n.service');

//Contain all select inputs
const SELECTS = [];

export default {

  mixins: [resizeMixin],

  data() {
    return {
     state: this.$options.service.state,
     allvalue: SEARCH_ALLVALUE,
    }
  },

  computed: {
    layers_url() {
      return ApplicationService.getCurrentProject().getState().layers_url;
    },
  },

  methods: {

    /**
     * @param { Object } opts
     * @param opts.fields
     * @param opts.field
     * @param opts.value
     * 
     * @returns { string | undefined | * }
     */
    createFieldsDeps({ field, fields = [] } = {}) {
      const cached_deps = this.state.cached_deps;
      const filter      = this.state.filter;

      const parent = this.state.forminputs.find(d => d.attribute === field);
      let dep      = field && filter.find(d => d.attribute === field).input.options.dependance;
      let dvalue   = undefined;

      if (!dep || !cached_deps[dep] || SEARCH_ALLVALUE === parent.value) {
        return fields.length && fields.join() || undefined;
      }

      // get current field dependance
      if (dep && (cached_deps[dep] && SEARCH_ALLVALUE !== parent.value)) {
        dvalue = parent.value; // dependance as value
      }

      // In case of some input dependency is not filled
      if (undefined !== dvalue) {
        // need to set to lower a case for api purpose
        const { op, logicop } = filter.find(f =>  f.attribute === dep).op;
        fields.unshift(`${dep}|${op.toLowerCase()}|${encodeURI(dvalue)}|` + (fields.length ? logicop.toLowerCase() : ''));
      }
      return this.createFieldsDeps({ fields, field: dep });
    },

    resize() {
      SELECTS.forEach(select2 => !ApplicationState.ismobile && select2.select2('close'));
    },

    /**
     * ORIGINAL SOURCE: src/components/SearchPanelLabel.vue@v3.9.3
     */
    getLabelOperator(operator) {
      return `[ ${FILTER_EXPRESSION_OPERATORS[operator]} ]`
    },

    isSelectDisabled(forminput) {
      return [
        this.state.loading[forminput.options.dependance],
        forminput.loading,
        forminput.options.disabled
      ].reduce((disabled, curr=false) => disabled || curr , false)
    },

    async onFocus(e) {
      if (this.isMobile()) {
        const top = $(e.target).position().top - 10 ;
        await this.$nextTick();
        setTimeout(() => $('.sidebar').scrollTop(top), 500);
      }
    },

    /**
     * Sync `this.state.forminputs` with `input.value`
     */
    async changeInput(input) {
      const field       = input.attribute;
      const forminput   = this.state.forminputs.find(i => i.id == input.id);
      const is_root     = !forminput.dependance;
      const deps        = this.state.forminputs.filter(d => d.options.dependance === field);  // get inputs that depends on the current one
      const cached_deps = this.state.cached_deps;
      const state       = this.state;
      let value         = input.value;

      console.log(input, deps);

      try {
        this.state.searching = true;

        if ('numberfield' === input.type) {
          value = value || 0 === value ? value : null;
        }

        if (undefined === value) {
          value = SEARCH_ALLVALUE;
        }

        /** @TODO check if it has one reason to trim  */
        if (!['textfield', 'textField'].includes(input.type)) {
          value = value.trim();
        }

        // sync `this.state.forminputs` with `input.value`
        forminput.value = input.value = value;

        if (!deps.length) {
          console.info('no deps for: ', input.label)
          return;
        }

        const invalid = [SEARCH_ALLVALUE, null, undefined].includes(value) || '' === value.toString().trim(); // check id inpute father is valid to search on subscribers

        // loop over dependencies fields inputs
        deps.forEach(s => {
          const is_autocomplete = 'autocompletefield' === s.type;

          // in the case of autocomplete reset values to an empty array
          if (is_autocomplete || invalid) {
            s.options.values.splice(0);
          }

          // set starting all values
          if (!is_autocomplete && undefined === s.options._allvalues) {
            s.options._allvalues = [...s.options.values];
          }

          // otherwise has to get first __ALL_VALUE
          if (!is_autocomplete && !invalid) {
            s.options.values.splice(1);
          }

          // father has an empty invalid value (eg. ALL_VALUE) → set all values to subscribe 
          if (!is_autocomplete && invalid) {
            setTimeout(() => s.options.values = [...s.options._allvalues]);
          }

          s.value = 'selectfield' === s.type ? SEARCH_ALLVALUE : null;
        });

        if (!value || value === SEARCH_ALLVALUE) {
          console.info('deps for: ', input.label, deps);
          deps.forEach(s => s.options.disabled = s.options.dependance_strict);
          return;
        }

        const parent = this.state.forminputs.find(d => d.attribute === field);

        // check if cache field values are set
        const cached = cached_deps[field] = cached_deps[field] || {};

        const dep = this.state.filter.find(d => d.attribute === field).input.options.dependance

        // get current dependance value
        const dvalue = dep ? parent.value : state.forminputs.find(f => f.attribute === field).value;

        const val = is_root && cached ? cached[value] : (cached[dvalue] && cached[dvalue][value]);

        // val is cached
        if (undefined !== val) {
          console.info('val for: ', input.label, val);
          deps.forEach(s => {
            (val[s.attribute] || []).forEach(v => s.options.values.push(v));
            s.options.disabled = false;                                      // set disabled dependence field
          });
          return;
        }

        state.loading[field] = true;

        if (is_root) {
          cached[value] = cached[value] || {};
        } else {
          cached[dvalue]        = cached[dvalue] || {};
          cached[dvalue][value] = cached[dvalue][value] || {}
        }

        // exclude autocomplete subscribers
        const no_autocomplete = deps.filter(s => 'autocompletefield' !== s.type);
        
        // disable no autocomplete subscribers
        if (no_autocomplete.length > 0) {
          no_autocomplete.forEach(s => s.options.dependance_strict && (s.options.disabled = false));
        }

        // set undefined because if it has a subscribed input with valuerelations widget
        // needs to extract the value of the field to get filter data from the relation layer
        const data = await state.search_layers[0].getFilterData({
          formatter: 0, // since v3.x, force to use raw value
          field: this.createFieldsDeps({
            field,
            fields: undefined !== value ? [createSingleFieldParameter({ field, value, operator: state.filter.find(f =>  f.attribute === field).op })] : [],
          }),
        });

        const has_dependance   = s => ['selectfield', 'autocompletefield'].includes(s.type) && !s.options.dependance_strict && s.options.dependance
        const is_valuemap      = s => !!(has_dependance(s) && s.options.values.length);
        const is_valuerelation = s => !!(has_dependance(s) && !s.options.values.length && s.options.layer_id);

        for (let i = 0; i < no_autocomplete.length; i++) {
          const subscribe = no_autocomplete[i];
          const vals = new Set(); // ensure unique values

          // parent features
          (data.data[0].features || []).forEach(feat => {
            const value = feat.get(subscribe.attribute);
            if (value) { vals.add(is_valuemap(subscribe) ? `${value}` : value); } // enforce string value
          });

          // case value map
          if (is_valuemap(subscribe)) {
            []
              .concat(subscribe.options._values)
              .forEach(v => vals.has(v.key) && subscribe.options.values.push(v));
          }

          if (is_valuerelation(subscribe) && vals.size > 0) {
            try {
              const { data = [] } = await DataRouterService.getData('search:features', {
                inputs: {
                  layer: CatalogLayersStoresRegistry.getLayerById(subscribe.options.layer_id),
                  search_endpoint: state.search_endpoint || state.search_layers[0].getSearchEndPoint(),
                  filter: createSingleFieldParameter({
                    layer: CatalogLayersStoresRegistry.getLayerById(subscribe.options.layer_id),
                    search_endpoint: state.search_endpoint || state.search_layers[0].getSearchEndPoint(),
                    field: subscribe.options.value, // since v3.8.x
                    value:  [...vals]
                  }),
                  ordering: subscribe.options.key, // since v3.8.x
                },
                outputs: false,
              });
              (data && data[0] && data[0].features || []).forEach(f => { subscribe.options.values.push({ key: f.get(subscribe.options.key), value: f.get(subscribe.options.value) }); });
            } catch(e) {
              console.warn(e);
            }
          }

          const sorted = [...vals].sort();

          // set key value for select
          if (!is_valuemap(subscribe) && !is_valuerelation(subscribe)) {
            sorted.forEach(v => subscribe.options.values.push({ key: v, value: v }));
          }

          cached[is_root ? value : dvalue][subscribe.attribute] = subscribe.options.values.slice(1);
          subscribe.options.disabled = false;
        }
      } catch(e) {
        console.warn(e);
      } finally {
        this.state.loading[field] = false;
        this.state.searching = false;
      }
    },

    doSearch(e) {
      e.preventDefault();
      this.$options.service.run();
    },

    /**
     * ORIGINAL SOURCE: src/components/SearchDatetime.vue@v3.9.3
     */
    async initDateTimeField(forminput) {
      if ('datetimefield' !== forminput.type) {
        return;
      }

      await this.$nextTick();

      forminput.options.format.fieldformat   = convertQGISDateTimeFormatToMoment(forminput.options.format.fieldformat);
      forminput.options.format.displayformat = convertQGISDateTimeFormatToMoment(forminput.options.format.displayformat);

      const id = this.$refs['search_datetime_' + forminput.id].id = this.$refs['search_datetime_' + forminput.id].id || `search_datetime_${getUniqueDomId()}`;

      $('#' + id).datetimepicker({
        defaultDate:       null,
        format:            forminput.options.format.displayformat,
        ignoreReadonly:    true,
        allowInputToggle:  true,
        toolbarPlacement:  'top',
        widgetPositioning: { vertical: 'bottom', horizontal: 'left' },
        showClose:         true,
        locale:            ApplicationState.language || 'en',
      });

      $('#' + id).on("dp.change", () => {
        const newDate = $(`#${forminput.id}`).val();
        forminput.value = _.isEmpty(_.trim(newDate))
          ? null
          : moment(newDate, forminput.options.format.displayformat).format(forminput.options.format.fieldformat);
        this.changeInput(forminput);
      });

      if (ApplicationState.ismobile) {
        setTimeout(()=> { $('#' + forminput.id).blur(); });
      }
    },

    /**
     * ORIGINAL SOURCE: src/components/SearchSelect2.vue@v3.9.3
     */
    async initSelect2Field(forminput) {
      if (!['selectfield', 'autocompletefield'].includes(forminput.type)) {
        return;
      }

      await this.$nextTick();

      const numdigaut       = forminput.options.numdigaut;
      const is_autocomplete = 'autocompletefield' === forminput.type;
      const ajax            = is_autocomplete ? {
        delay: 500,
        transport: async (d, ok, ko) => {
          try      {
            ok({
              results: await getDataForSearchInput({
                state: this.state,
                output: 'autocomplete',
                field: forminput.attribute,
                suggest: `${forminput.attribute}|${d.data.q}`,
              })
            });
          }
          catch(e) { ko(e); }
        }
      } : null;

      const select2 = $(this.$refs['search_select_'+ forminput.id]).select2({
        ajax,
        width:              '100%',
        dropdownParent:     $('.g3w-search-form:visible'),
        minimumInputLength: is_autocomplete && (numdigaut && !Number.isNaN(1 * numdigaut) && 1 * numdigaut > 0 && 1 * numdigaut || 2) || 0, // get numdigaut and validate it
        allowClear:         is_autocomplete,
        placeholder:        is_autocomplete ? '' : null,
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
      SELECTS.push(select2);

      select2.on('select2:select select2:unselecting', e => {
        if ('select2:select' === e.type || is_autocomplete) {
          this.changeInput({
            id:        $(e.target).attr('id'),
            attribute: $(e.target).attr('name'),
            value:     e.params.data ? `${e.params.data.id}` : SEARCH_ALLVALUE,
            type:      forminput.type
          });
        }
      });

      // trigger select2 change on input value change
      this.$watch(() => forminput.value, async (value, oldVal) => {
        if (value !== oldVal && value === SEARCH_ALLVALUE) {
          select2.val(value).trigger('change');
        }
      });

      // set initial value
      select2.val(forminput.value).trigger('change');
    },

  },

  async mounted() {
    await this.state.mounted;
    for (const forminput of this.state.forminputs) {
      console.log(forminput);
      await this.initSelect2Field(forminput);
      await this.initDateTimeField(forminput);
    }
  },

  beforeDestroy() {
    // select2 dom element and remove all events
    SELECTS.forEach(select2 => {
      select2.select2('destroy');
      select2.off();
      select2 = null;
    })

    //reset SELECTS to empty Array
    SELECTS.splice(0);
  }

};
</script>

<style scoped>
.search-label {
  width: 100%;
  display: flex;
  justify-content: space-between;
}
</style>