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
          class = "form-group"
        >

          <!-- FIXME: https://github.com/g3w-suite/g3w-admin/pull/787#discussion_r1537617143 -->
          <!-- NUMBER FIELD -->
          <div
            v-if  = "'numberfield' === input.type || ('textfield' === input.type && 'Range' === input.widget_type)"
            class = "numeric"
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
            class     = "form-item-search text"
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
            class      = "text"
            v-disabled = "state.loading[input.dependance] || input.loading || input.disabled"
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
            class      = "text"
            v-disabled = "state.loading[input.dependance] || false"
          >
            <label :for="input.id" class="search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class="skin-color">{{ getLabelOperator(input.operator)}}</span>
            </label>
            <div class="input-group date">
              <input :id="input.id" type='text' class="form-control" />
              <span class="input-group-addon skin-color">
                <span :class="g3wtemplate.getFontClass(input.options.format.time ? 'time': 'calendar')"></span>
              </span>
            </div>
          </div>

          <!-- DEBUG INFO -->
          <sub v-if="is_superuser">
            {{ input.type }} | {{ input.widget_type }}
            <template v-if="input.options.value">: { key: "{{ input.options.key }}", value: "{{ input.options.value }} }"</template>
            <template v-if="input.options.layer_id"><br>layer_id: "{{ input.options.layer_id }}"</template>
            <template v-if="input.dependance"><br>depends_on: "{{ input.dependance }}"</template>
            <template v-if="input.dependance"><br>strict: {{ input.dependance_strict }}</template>
          </sub>

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
import ApplicationService                    from 'services/application';
import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';
import { createSingleFieldParameter }        from 'utils/createSingleFieldParameter';
import { getDataForSearchInput }             from 'utils/getDataForSearchInput';
import resizeMixin                           from 'mixins/resize';

const { t } = require('core/i18n/i18n.service');

// store all select2 inputs
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

    is_superuser() {
      return ApplicationService.getConfig().user.is_superuser;
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
      const field  = input.attribute;
      const parent = this.state.forminputs.find(d => d.attribute === field);     // current input dependance
      const deps   = this.state.forminputs.filter(d => d.dependance === field);  // inputs that depends on the current one
      const cached = parent && undefined !== input.dvalues[parent.value] ? input.dvalues[parent.value][value] : input.dvalues[value]; // cached data
      const state  = this.state;
      let value    = input.value;

      console.log(input, deps, cached);

      const is_empty         = v => [SEARCH_ALLVALUE, null, undefined].includes(v) || '' === v.toString().trim(); // whether father input can search on subscribers
      const has_autocomplete = s => 'autocompletefield' === s.type;

      try {
        this.state.searching = true;

        if ('numberfield' === input.type) {
          value = value || 0 === value ? value : null;
        }

        // fallback to default value → `SEARCH_ALLVALUE`
        if (undefined === value) {
          value = SEARCH_ALLVALUE;
        }

        /** @TODO check if it has one reason to trim  */
        if (!['textfield', 'textField'].includes(input.type)) {
          value = value.trim();
        }

        input.value = value;

        // loop and update dependants
        await Promise.allSettled(deps.map(async s => {

          s.value  = 'selectfield' === s.type ? SEARCH_ALLVALUE : null;
          s.values = Array.from(new Set([                                       // ensure uniques values
            ...(!has_autocomplete(s) && !is_empty(value) ? [s.values[0]] : []), // get first value (ALL_VALUE)
            ...(!has_autocomplete(s) && is_empty(value) ? s._values      : []), // parent has an empty value (eg. ALL_VALUE) → show all original values on subscriber
            ...(input.dependance && cached && cached[s.attribute]       || [])  // get cached values 
          ]));

          // value is empty → disable dependants inputs
          s.disabled = is_empty(value) ? s.dependance_strict : false;

          // depentants values are there → no need to perform further server requests
          if (has_autocomplete(s) || is_empty(value) || (input.dependance && cached)) {
            return;
          }

          state.loading[field] = true;

          // extract the value of the field to get filter data from the relation layer
          // set undefined because if it has a subscribed input with valuerelations widget
          
          /** @TODO use `getDataForSearchInput` instead ? */
          const data = await state.search_layers[0].getFilterData({
            fformatter: s.attribute,
            field: getDataForSearchInput.field({
              state,
              field,
              fields: undefined !== value ? [createSingleFieldParameter({ field, value, operator: parent.operator })] : []
            }),
          });

          console.log('subscribe', s)

          // case value map
          if (!s.dependance_strict && 'selectfield' === s.type) {
            s._values.push(...s.values);
          }

          // set key value for select (!valuemap && !valuerelation)
          if (1 === s.values.length) {
            s.values.push(...(data.data || []).map(d => ({ key: d[1], value: d[1] })).sort());
          }

          // update cache
          if (input.dependance) {
            input.dvalues[parent.value]        = input.dvalues[parent.value] || {};
            input.dvalues[parent.value][value] = input.dvalues[parent.value][value] || {}
            input.dvalues[parent.value][s.attribute] = s.values.slice(1); // exclude first element (ALL_VALUE)
          } else {
            input.dvalues[value] = input.dvalues[value] || {};
            input.dvalues[value][s.attribute] = s.values.slice(1);        // exclude first element (ALL_VALUE)
          }

          s.disabled = false;

        }));
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

      $('#' + input.id).datetimepicker({
        defaultDate:       null,
        format:            input.options.format.displayformat,
        ignoreReadonly:    true,
        allowInputToggle:  true,
        toolbarPlacement:  'top',
        widgetPositioning: { vertical: 'bottom', horizontal: 'left' },
        showClose:         true,
        locale:            ApplicationState.language || 'en',
      });

      $('#' + input.id).on("dp.change", () => {
        const newDate = $(`#${input.id}`).val();
        input.value = newDate.trim()
          ? moment(newDate, input.options.format.displayformat).format(input.options.format.fieldformat)
          : null;
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

      const numdigaut        = input.options.numdigaut;
      const has_autocomplete = 'autocompletefield' === input.type;
      const ajax             = has_autocomplete ? {
        delay: 500,
        transport: async (d, ok, ko) => {
          try      {
            ok({
              results: (await getDataForSearchInput({
                state:   this.state,
                field:   input.attribute,
                suggest: `${input.attribute}|${d.data.q}`,
              })).map(d => ({ id: d.value, text: d.value }))
            });
          }
          catch(e) { ko(e); }
        }
      } : null;

      const select2 = $(this.$refs['search_select_'+ input.id]).select2({
        ajax,
        width:              '100%',
        dropdownParent:     $('.g3w-search-form:visible'),
        minimumInputLength: has_autocomplete && (numdigaut && !Number.isNaN(1 * numdigaut) && 1 * numdigaut > 0 && 1 * numdigaut || 2) || 0, // get numdigaut and validate it
        allowClear:         has_autocomplete,
        placeholder:        has_autocomplete ? '' : null,
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
        if ('select2:select' === e.type || has_autocomplete) {
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
    // remove all select2 DOM events
    SELECTS.forEach(select2 => {
      select2.select2('destroy');
      select2.off();
      select2 = null;
    })
    // reset SELECTS to empty array
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