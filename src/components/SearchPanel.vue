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
    <slot name = "tools"></slot>

    <!-- SEARCH FORM -->
    <slot name = "form">
      <form class= " g3w-search-form">

        <div
          v-for = "input in state.forminputs"
          :key  = "input.id"
          class = "form-group"
        >

          <!-- FIXME: hotfix for https://github.com/g3w-suite/g3w-admin/pull/787#discussion_r1537617143 -->
          <!-- NUMBER FIELD -->
          <div
            v-if  = "'numberfield' === input.type || ('textfield' === input.type && 'Range' === input.widget_type)"
            class = "numeric"
          >
            <label :for = "input.id" class = "search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class = "skin-color">{{ getLabelOperator(input.operator)}}</span>
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
            <label :for = "input.id" class = "search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class = "skin-color">{{ getLabelOperator(input.operator)}}</span>
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
            <label :for = "input.id" class = "search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class = "skin-color">{{ getLabelOperator(input.operator)}}</span>
            </label>

              <bar-loader
              v-if     = "input.dependance"
              :loading = "state.loading[input.dependance] || input.loading"
            />
            <select
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
                <span v-if = "allvalue === opt.value" v-t = "'sdk.search.all'"></span>
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
            <label :for = "input.id" class = "search-label">
              <span>{{ input.label || input.attribute }}</span>
              <span class = "skin-color">{{ getLabelOperator(input.operator)}}</span>
            </label>
            <div :ref = "'date_' + input.id" class = "input-group date">
              <input :id = "input.id" type = 'text' class = "form-control" />
              <span class = "input-group-addon skin-color">
                <span :class = "g3wtemplate.getFontClass(input.options.format.time ? 'time': 'calendar')"></span>
              </span>
            </div>
          </div>

          <sub>{{ input.options.description }}</sub>

          <!-- DEBUG INFO -->
          <sub v-if = "is_staff">
            <br v-if = "input.options.description">
            <span class = "skin-color">{{ input.type }}</span> | <span class = "skin-color">{{ input.widget_type }}</span>
            <template v-if = "input.options.value">: { key: "{{ input.options.key }}", value: "{{ input.options.value }} }"</template>
            <template v-if = "input.options.layer_id"><br><span class = "skin-color">layer_id:</span> "{{ input.options.layer_id }}"</template>
            <template v-if = "input.dependance"><br><span class = "skin-color">depends_on:</span> "{{ input.dependance }}"</template>
            <template v-if = "input.dependance"><br><span class = "skin-color">strict:</span> {{ input.dependance_strict }}</template>
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
        <div class = "form-group">
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
    <slot name = "footer"></slot>

    <!-- Click to open G3W-ADMIN's project layers page -->
    <div v-if = "layers_url" style = "padding-top: 5em;"><b><a :href = "layers_url" target = "_blank">Edit in admin</a></b></div>

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
       state:    this.$options.service.state,
       allvalue: SEARCH_ALLVALUE,
      }
    },

    computed: {

      layers_url() {
        return ApplicationService.getCurrentProject().getState().layers_url;
      },

      is_staff() {
        return ApplicationService.getConfig().user.is_staff;
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
        const field  = input.attribute;                                           // current field name
        const deps   = this.state.forminputs.filter(i => field === i.dependance); // inputs that depend on the current one
        const state  = this.state;
        let value    = input.value;

        const is_empty         = v => [SEARCH_ALLVALUE, null, undefined].includes(v) || '' === v.toString().trim(); // whether father input can search on subscribers
        const has_autocomplete = i => 'autocompletefield' === i.type;

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
          await (Promise.allSettled(deps.map(async d => {

            // cache server data by filter (eg: "zone|eq|A")
            const filter = getDataForSearchInput.field({
              state,
              field,
              fields: [SEARCH_ALLVALUE, undefined].includes(value) ? [] : [createSingleFieldParameter({ field, value, operator: input.operator })]
            });

            const cached = d.dvalues[filter];

            d.value  = 'selectfield' === d.type ? SEARCH_ALLVALUE : null;
            d.values = Array.from(new Set([                                       // ensure uniques values
              ...(!has_autocomplete(d) && !is_empty(value) ? [d.values[0]] : []), // get first value (ALL_VALUE)
              ...(!has_autocomplete(d) && is_empty(value) ? d._values      : []), // parent has an empty value (eg. ALL_VALUE) → show all original values on subscriber
              ...(cached || []),                                                  // cached
            ]));

            // value is empty → disable dependants inputs
            d.disabled = is_empty(value) ? d.dependance_strict : false;

            // update nested dependencies
            if (this.state.forminputs.find(i => i.dependance === d.attribute)) {
              this.changeInput(d);
            }

            // dependents values are there → no need to perform further server requests
            if (has_autocomplete(d) || is_empty(value) || cached) {
              return;
            }

            state.loading[d.attribute] = true;

            // extract the value of the field to get filter data from the relation layer
            // set undefined because if it has a subscribed input with valuerelations widget

            /** @TODO use `getDataForSearchInput` instead ? */

            try {
              const data = await state.search_layers[0].getFilterData({
                fformatter: d.attribute,
                ordering:   d.attribute,
                field:      filter,
              });

              data.data = (data.data || []).map(([key, value]) => ({ key: value, value }));

              // case value map
              if (!d.dependance_strict && 'selectfield' === d.type) {
                d._values.push(...d.values);
              }

              // set key value for select (!valuemap && !valuerelation)
              if (1 === d.values.length) {
                d.values.push(...data.data);
              }

              // exclude first element (ALL_VALUE)
              d.dvalues[filter] = d.values.slice(1);


            } catch(e) {
              console.warn(e);
            } finally {
              d.disabled                      = false;
              this.state.loading[d.attribute] = false;
            }
          })));
        } catch(e) {
          console.warn(e);
        } finally {
          this.state.searching            = false;
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

        $(this.$refs[`date_${input.id}`]).datetimepicker({
          defaultDate:       null,
          format:            input.options.format.displayformat,
          ignoreReadonly:    true,
          allowInputToggle:  true,
          toolbarPlacement:  'top',
          widgetPositioning: { vertical: 'bottom', horizontal: 'left' },
          showClose:         true,
          locale:            ApplicationState.language || 'en',
        });

        $(this.$refs[`date_${input.id}`]).on("dp.change", () => {
          const newDate = $(`#${input.id}`).val();
          input.value = newDate.trim()
            ? moment(newDate, input.options.format.displayformat).format(input.options.format.fieldformat)
            : null;
          this.changeInput(input);
        });

        if (ApplicationState.ismobile) {
          setTimeout(() => { $('#' + input.id).blur(); });
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
                  state:    this.state,
                  field:    input.attribute,
                  suggest: `${input.attribute}|${d.data.q}`,
                })).map(d => ({ id: d.value, text: d.key })
                )
              });
            }
            catch(e) { ko(e); }
          }
        } : null;

        const select2 = $(`#${input.id}`).select2({
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
            if ('' === (search || '').toString().trim())                             { return data }        // no search terms → get all of the data
            if (data.text.toLowerCase().includes(search) && undefined !== data.text) { return { ...data } } // the searched term
            return null;                                                                                    // hide the term
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
          if (value !== oldVal && SEARCH_ALLVALUE === value) {
            select2.val(value).trigger('change');
          }
        });

        // recreate select2 value when language change
        const unwatch = this.$watch(() => ApplicationState.language, () => {
          unwatch();
          this.clearSelect2();
          this.initSelect2Field(input);
        });

        // set initial value
        select2.val(input.value).trigger('change');
      },

      clearSelect2() {
        // remove all select2 DOM events
        SELECTS.forEach(select2 => {
          select2.select2('destroy');
          select2.off();
          select2 = null;
        })
        // reset SELECTS to an empty array
        SELECTS.splice(0);
      }

    },

    async mounted() {
      await this.state.mounted;
      for (const input of this.state.forminputs) {
        await this.initSelect2Field(input);
        await this.initDateTimeField(input);
      }
    },

    beforeDestroy() {
      this.clearSelect2();
    }

  };
</script>

<style scoped>
  .g3w-search-form label {
    color: #fff;
  }
  .g3w-search-form .search-logicop {
    width: 100%;
    position: relative;
    display: flex;
    justify-content: center;
    margin-bottom: 15px;
    margin-top: 30px;
    border-bottom: 1px solid;
  }
  .g3w-search-form .search-logicop h4 {
    font-weight: bold;
    position: absolute;
    padding: 5px;
    top: -24px;
    background: #222d32;
  }
  #dosearch {
    color: #fff;
    font-weight: bold;
    margin-top: 15px;
    background-color: var(--skin-color);
  }
  #dosearch:hover {
    color: #fff;
  }
  .search-label {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
</style>