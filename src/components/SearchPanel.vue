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
          v-for = "input in state.forminputs"
          :key  = "input.id"
        >

          <sub>{{ input.type }}</sub>

          <!-- NUMBER FIELD -->
          <div
            v-if  = "'numberfield' === input.type"
            class = "form-group numeric"
          >
            <label :for="input.id" class="search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(input.operator)}}</span>
            </label>
            <input
              type    = "number"
              min     = "0"
              @change = "changeInput(input)"
              @input  = "changeInput(input)"
              v-model = "input.value"
              class   = "form-control"
              :id     = "input.id"
            />
          </div>

          <!-- TEXT FIELD -->
          <div
            v-else-if = "['textfield', 'textField'].includes(input.type)"
            class     = "form-group form-item-search text"
          >
            <label :for="input.id" class="search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(input.operator)}}</span>
            </label>
            <input
              @focus  = "onFocus"
              type    = "text"
              v-model = "input.value"
              @change = "changeInput(input)"
              class   = "form-control"
              :id     = "input.id"
            />
          </div>

          <!-- AUTOCOMPLETE FIELD -->
          <div
            v-else-if  = "['selectfield', 'autocompletefield'].includes(input.type)"
            class      = "form-group text"
            v-disabled = "isSelectDisabled(input)"
          >
            <label :for="input.id" class="search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(input.operator)}}</span>
            </label>
            <bar-loader
              v-if     = "input.dependance"
              :loading = "state.loading[input.dependance] || input.loading"
            />
            <select
              :ref       = "'search_select_' + input.id"
              :name      = "input.attribute"
              class      = "form-control"
              :id        = "input.id"
              v-disabled = "input.disabled || input.loading"
            >
              <option
                v-for  = "opt in input.values"
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
            v-else-if  = "'datetimefield' === input.type"
            class      = "form-group text"
            v-disabled = "state.loading[input.dependance] || false"
          >
            <label :for="input.id" class="search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(input.operator)}}</span>
            </label>
            <div :ref="'search_datetime_' + input.id" class="input-group date">
              <input :id="input.id" type='text' class="form-control" />
              <span class="input-group-addon skin-color">
                <span :class="g3wtemplate.getFontClass(input.options.format.time ? 'time': 'calendar')"></span>
              </span>
            </div>
          </div>

          <!-- LOGIC OPERATOR (AND | OR) -->
          <div
            v-if  = "input.logicop"
            class = "search-logicop skin-border-color"
          >
            <h4>{{ input.logicop }}</h4>
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
import { getDataForSearchInput }             from 'utils/getDataForSearchInput';
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

    resize() {
      SELECTS.forEach(select2 => !ApplicationState.ismobile && select2.select2('close'));
    },

    /**
     * ORIGINAL SOURCE: src/components/SearchPanelLabel.vue@v3.9.3
     */
    getLabelOperator(operator) {
      return `[ ${FILTER_EXPRESSION_OPERATORS[operator]} ]`
    },

    isSelectDisabled(input) {
      return this.state.loading[input.dependance] || input.loading || input.disabled;
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
      console.log(input);
      const field       = input.attribute;
      const deps        = this.state.forminputs.filter(d => d.dependance === field);  // get inputs that depends on the current one
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

        input.value = value;

        if (!deps.length) {
          console.info('no deps for: ', input)
          return;
        }

        const invalid = [SEARCH_ALLVALUE, null, undefined].includes(value) || '' === value.toString().trim(); // whether father input can search on subscribers

        // loop over dependencies fields inputs
        deps.forEach(s => {
          const is_autocomplete = 'autocompletefield' === s.type;

          // in the case of autocomplete reset values to an empty array
          if (is_autocomplete || invalid) {
            s.values.splice(0);
          }

          // set starting all values
          if (!is_autocomplete && undefined === s._allvalues) {
            s._allvalues = [...s.values];
          }

          // otherwise has to get first __ALL_VALUE
          if (!is_autocomplete && !invalid) {
            s.values.splice(1);
          }

          // father has an empty invalid value (eg. ALL_VALUE) → set all values to subscribe 
          if (!is_autocomplete && invalid) {
            setTimeout(() => s.values = [...s._allvalues]);
          }

          s.value = 'selectfield' === s.type ? SEARCH_ALLVALUE : null;
        });

        if (!value || value === SEARCH_ALLVALUE) {
          console.info('deps for: ', input, deps);
          deps.forEach(s => s.disabled = s.dependance_strict);
          return;
        }

        // get current dependance value
        const parent = this.state.forminputs.find(d => d.attribute === field);

        // val is cached
        if (input.dependance && input.dvalues[parent.value] && undefined !== input.dvalues[parent.value][value]) {
          console.info('val for: ', input, input.dvalues[parent.value][value]);
          deps.forEach(s => {
            (input.dvalues[parent.value][value][s.attribute] || []).forEach(v => s.values.push(v));
            s.disabled = false;                                      // set disabled dependence field
          });
          return;
        }

        // val is cached
        if (!input.dependance && undefined !== input.dvalues[value]) {
          console.info('val for: ', input, input.dvalues[value]);
          deps.forEach(s => {
            (input.dvalues[value][s.attribute] || []).forEach(v => s.values.push(v));
            s.disabled = false;                                      // set disabled dependence field
          });
          return;
        }

        state.loading[field] = true;

        // exclude autocomplete subscribers
        const no_autocomplete = deps.filter(s => 'autocompletefield' !== s.type);
        
        // disable no autocomplete subscribers
        if (no_autocomplete.length > 0) {
          no_autocomplete.forEach(s => s.dependance_strict && (s.disabled = false));
        }

        // extract the value of the field to get filter data from the relation layer
        const data = await getDataForSearchInput({
          state: this.state,
          search_layers: state.search_layers[0],
          formatter: 0, // since v3.x, force to use raw value
          value,
        })

        const has_dependance   = s => ['selectfield', 'autocompletefield'].includes(s.type) && !s.dependance_strict && s.dependance
        const is_valuemap      = s => !!(has_dependance(s) && s.values.length);
        const is_valuerelation = s => !!(has_dependance(s) && !s.values.length && s.options.layer_id);

        for (let i = 0; i < no_autocomplete.length; i++) {
          const subscribe = no_autocomplete[i];
          const vals = new Set(); // ensure unique values

          // parent features
          (data.data[0].features || []).forEach(f => {
            const value = f.get(subscribe.attribute);
            if (value) { vals.add(is_valuemap(subscribe) ? `${value}` : value); } // enforce string value
          });

          // case value map
          if (is_valuemap(subscribe)) {
            []
              .concat(subscribe._values)
              .forEach(v => vals.has(v.key) && subscribe.values.push(v));
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
                    field: subscribe.value, // since v3.8.x
                    value:  [...vals]
                  }),
                  ordering: subscribe.options.key, // since v3.8.x
                },
                outputs: false,
              });
              (data && data[0] && data[0].features || []).forEach(f => { subscribe.values.push({ key: f.get(subscribe.options.key), value: f.get(subscribe.value) }); });
            } catch(e) {
              console.warn(e);
            }
          }

          // set key value for select
          if (!is_valuemap(subscribe) && !is_valuerelation(subscribe)) {
            [...vals].sort().forEach(v => subscribe.values.push({ key: v, value: v }));
          }

          const sliced = subscribe.values.slice(1);

          if (input.dependance) {
            input.dvalues[parent.value]        = input.dvalues[parent.value] || {};
            input.dvalues[parent.value][value] = input.dvalues[parent.value][value] || {}
            input.dvalues[parent.value][subscribe.attribute] = sliced;
          } else {
            input.dvalues[value] = input.dvalues[value] || {};
            input.dvalues[value][subscribe.attribute] = sliced;
          }

          subscribe.disabled = false;
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
    async initDateTimeField(input) {
      if ('datetimefield' !== input.type) {
        return;
      }

      await this.$nextTick();

      input.options.format.fieldformat   = convertQGISDateTimeFormatToMoment(input.options.format.fieldformat);
      input.options.format.displayformat = convertQGISDateTimeFormatToMoment(input.options.format.displayformat);

      const id = this.$refs['search_datetime_' + input.id].id = this.$refs['search_datetime_' + input.id].id || `search_datetime_${getUniqueDomId()}`;

      $('#' + id).datetimepicker({
        defaultDate:       null,
        format:            input.options.format.displayformat,
        ignoreReadonly:    true,
        allowInputToggle:  true,
        toolbarPlacement:  'top',
        widgetPositioning: { vertical: 'bottom', horizontal: 'left' },
        showClose:         true,
        locale:            ApplicationState.language || 'en',
      });

      $('#' + id).on("dp.change", () => {
        const newDate = $(`#${input.id}`).val();
        input.value = _.isEmpty(_.trim(newDate))
          ? null
          : moment(newDate, input.options.format.displayformat).format(input.options.format.fieldformat);
        this.changeInput(input);
      });

      if (ApplicationState.ismobile) {
        setTimeout(()=> { $('#' + input.id).blur(); });
      }
    },

    /**
     * ORIGINAL SOURCE: src/components/SearchSelect2.vue@v3.9.3
     */
    async initSelect2Field(input) {
      if (!['selectfield', 'autocompletefield'].includes(input.type)) {
        return;
      }

      await this.$nextTick();

      const numdigaut       = input.options.numdigaut;
      const is_autocomplete = 'autocompletefield' === input.type;
      const ajax            = is_autocomplete ? {
        delay: 500,
        transport: async (d, ok, ko) => {
          try      {
            ok({
              results: await getDataForSearchInput({
                state:   this.state,
                output:  'autocomplete',
                field:   input.attribute,
                suggest: `${input.attribute}|${d.data.q}`,
              })
            });
          }
          catch(e) { ko(e); }
        }
      } : null;

      const select2 = $(this.$refs['search_select_'+ input.id]).select2({
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
          input.value = e.params.data ? `${e.params.data.id}` : SEARCH_ALLVALUE;
          this.changeInput(input);
        }
      });

      // trigger select2 change on input value change
      this.$watch(() => input.value, async (value, oldVal) => {
        if (value !== oldVal && value === SEARCH_ALLVALUE) {
          select2.val(value).trigger('change');
        }
      });

      // set initial value
      select2.val(input.value).trigger('change');
    },

  },

  async mounted() {
    await this.state.mounted;
    for (const input of this.state.forminputs) {
      console.log(input);
      await this.initSelect2Field(input);
      await this.initDateTimeField(input);
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