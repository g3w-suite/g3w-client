<!--
  @file
  @since v3.7
-->

<template>
  <div
    class      = "g3w-search-panel form-group"
    v-disabled = "state.searching || loading || reload"
  >
    <bar-loader :loading = "state.searching || loading || reload"/>
    <h4><b>{{ state.title }}</b></h4>

    <section v-if = "filterlayers.length > 0" id = "g3w-search-filter-layers" style = "display: flex; justify-content: space-between">
      <!-- HELP DIV -->
      <div style = "color: #FFF; text-align: justify; position: relative; border-radius: 3px; margin: 5px 2px 5px 2px; white-space: pre-line; background-color: #384246 !important;">
        <span style = "text-align: center; font-size: 0.7em; margin-top: -4px; margin-left: -4px; background-color: var(--bgcolor); font-weight: bold; color: #fff; position: absolute; top: 0; left: 0; width: 15px; height: 15px; border: 1px solid #fff; border-radius: 50%;">i</span>
        <div v-t = "'Search values are limited based on the active filter. Remove the filter to search all data.'" style = "max-height: 200px; padding: 10px; overflow-y: auto;"></div>
      </div>
      <button
        v-t-tooltip:left = "'Remove Filter'"
        @click.stop      = "clearFilters"
        class            = "btn skin-border-color"
        style            = "background-color: transparent; margin: 5px 0"
      >
        <i class = "skin-color" :class = "$fa('clear')"></i>
      </button>
    </section>
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
                <span :class = "$fa(input.options.format.time ? 'time': 'calendar')"></span>
              </span>
            </div>
          </div>

          <sub>{{ input.options.description }}</sub>

          <!-- DEBUG INFO -->
          <details v-if = "is_staff" style = "cursor: pointer; user-select: none; margin-top: .5em;">
            <ul style = "font-size: 80%;padding-left: 15px; font-family: monospace; white-space: nowrap; overflow-x: auto; scrollbar-width: thin;">
              <li><b class = "skin-color">{{ input.type }}</b></li>
              <li><b class = "skin-color">{{ input.widget_type }}</b><span v-if = "input.options.value">: {<br>  key: "{{ input.options.key }}",<br>  value: "{{ input.options.value }}"<br>}</span></li>
              <li v-if = "input.options.layer_id"><b class = "skin-color">layer_id:</b> "{{ input.options.layer_id }}"</li>
              <li v-if = "input.dependance"><b class = "skin-color">depends_on:</b> "{{ input.dependance }}"</li>
              <li v-if = "input.dependance"><b class = "skin-color">strict:</b> {{ input.dependance_strict }}</li>
            </ul>
          </details>

          <!-- LOGIC OPERATOR (AND | OR) -->
          <div
            v-if  = "input.logicop"
            class = "search-logicop skin-border-color"
          >
            <h4>{{ input.logicop }}</h4>
          </div>

        </div>

        <!-- "AUTOFILTER" -->
        <div class = "form-group" v-disabled = "'data' !== state.return">
          <label v-t-tooltip:right = "'Whether automatically filter geometries displayed within the map<br>in order to show only those related to current search results.'" style = "display: block;">
            <input type = "checkbox" v-model = "autofilter" style = "margin:0;" />
            <span v-t = "'Filter results'"></span>
            <i class = "fa fa-filter fa-pull-right" :style = "{ opacity: state.autofilter.value ? 1 : .5 }"></i>
          </label>
        </div>

        <!-- SEARCH BUTTON -->
        <div class = "form-group">
          <button
            id          = "dosearch"
            class       = "btn btn-block pull-right"
            @click.stop = "doSearch"
          >{{ $t('dosearch') }}</button>
        </div>

      </form>
    </slot>

    <!-- SEARCH FOOTER -->
    <slot name = "footer"></slot>

    <!-- Click to open G3W-ADMIN's project layers page -->
    <div v-if = "layers_url" style = "padding-top: 5em;"><b><a :href = "layers_url" target = "_blank">{{ $t('Edit in admin') }}</a></b></div>

  </div>
</template>

<script>
  import {
    FILTER_EXPRESSION_OPERATORS,
    SEARCH_ALLVALUE,
  }                                            from 'g3w-constants';
  import ApplicationState                      from 'g3w-state';
  import GUI                                   from 'g3w-app';    
  import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';
  import { getDataForSearchInput }             from 'utils/getDataForSearchInput';
  import { getRelationLayerById }              from 'utils/getRelationLayerById';
  import resizeMixin                           from 'mixins/resize';
  import { gettext as _ }                      from 'g3w-i18n';

  // store all select2 inputs
  const SELECTS = [];

  export default {

    mixins: [resizeMixin],

    data() {
      return {
       state:      this.$options.service.state,
       autofilter: false, //@since 3.11.0
       allvalue:   SEARCH_ALLVALUE,
       reload:     false,
      }
    },

    computed: {

      layers_url() {
        return ApplicationState.project.getState().layers_url;
      },

      is_staff() {
        return window.initConfig.user.is_staff;
      },

      /**
       * @since 3.11.0 loading inputs data
       * Disabled search form during loading input data
       * @return {*}
       */
      loading() {
        return this.state.forminputs.reduce((bool, i) => bool || i.loading, false);
      },

      /**
       * @TODO make use only of "this.state.search_layers" instead
       */
      search_layers() {
        return [].concat(getRelationLayerById(this.state.search_1n_relationid) || [], this.state.search_layers);
      },

      filterlayers() {
        return ApplicationState.tokens.filtertoken && this.search_layers.filter(l => l.getToken()) || [];
      },

    },

    methods: {
      /**
      * @since 3.11.0
      */
      clearFilters() {
        this.filterlayers.forEach(l => l.getToken() && l.clearSelectionFids());
        //@since v4.0 reset all form values after clear
        this.state.forminputs.forEach(i => {
          if (['selectfield','autocompletefield'].includes(i.type)) {
            i.value = 'in' === i.operator ? [i.values[0].value] : i.values[0].value; //set all or first value
          } else {
            i.value = null;
          }
          this.changeInput(i);
        })
        //@since 4.0.0 close content
        GUI.closeContent();
      },
      resize() {
        SELECTS.forEach(s2 => !ApplicationState.ismobile && s2.select2('close'));
      },

      /**
       * ORIGINAL SOURCE: src/components/SearchPanelLabel.vue@v3.9.3
       */
      getLabelOperator(operator) {
        return `[${FILTER_EXPRESSION_OPERATORS[operator]}]`;
      },

      async onFocus(e) {
        if (this.isMobile()) {
          const top = $(e.target).position().top - 10 ;
          await this.$nextTick();
          setTimeout(() => $('.main-sidebar').scrollTop(top), 500);
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

        const is_empty         = v => [].concat(v).find(v => [SEARCH_ALLVALUE, null, undefined].includes(v)) || '' === v.toString().trim(); // whether father input can search on subscribers
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
            value = Array.isArray(value) ? value.map(v => v.trim()) : value.trim();
          }

          input.value = value;

          // loop and update dependants
          await (Promise.allSettled(deps.map(async d => {

            // cache server data by filter (eg: "zone|eq|A")
            const filter = getDataForSearchInput.field({
              state,
              field,
              fields: [].concat(value).find(v => [SEARCH_ALLVALUE, undefined].includes(v)) //consider in value Array
                ? []
                : ['in' === input.operator //@since 4.0.0 consider in operator
                    ? `${field}|${input.operator}|(${[].concat(value).map( v => encodeURIComponent(v))})`
                    : [].concat(value).map(v => `${field}|${(input.operator || 'eq').toLowerCase()}|${encodeURIComponent(v)}`).join(`|OR,`)
                  ]
            });

            const cached = d.dvalues[filter];

            // In case of in operator
            if ( 'in' === d.operator && ['selectfield', 'autocompletefield'].includes(d.type)) {
              d.value  = [SEARCH_ALLVALUE];
            }

            //In case of no in operator
            if ( 'in' !== d.operator) {
              d.value  =  'selectfield' === d.type ? SEARCH_ALLVALUE : null;
            }

            d.values = Array.from(new Set([                                       // ensure uniques values
              ...(!has_autocomplete(d) && !is_empty(value) ? [d.values[0]] : []), // get first value (ALL_VALUE)
              ...(!has_autocomplete(d) && is_empty(value) ? d._values      : []), // parent has an empty value (eg. ALL_VALUE) → show all original values on subscriber
              ...(cached || []),                                                  // cached
            ]));

            // value is empty → disable dependants inputs
            d.disabled = is_empty(value) ? d.dependance_strict : false;

            // update nested dependencies
            if (this.state.forminputs.find(i => d.attribute === i.dependance)) {
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
              // get data for all searchable layers
              const data = await getDataForSearchInput({ state, layerid: d.alternativeuniquelayer, field: d.attribute, filter });
              // case value map
              if (!d.dependance_strict && 'selectfield' === d.type) {
                d._values.push(...d.values);
              }

              // set key value for select (!valuemap && !valuerelation)
              if (1 === d.values.length) {
                d.values.push(...data);
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
          setTimeout(() => document.getElementById(input.id)?.blur());
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
        const is_multiple      = 'in' === input.operator; //@since 4.0.0 set multiple select2 only for select box
        const ajax             = has_autocomplete ? {
          delay: 500,
          transport: async (d, ok, ko) => {
            try      {
              ok({
                results: (await getDataForSearchInput({
                  state:    this.state,
                  layerid:  input.alternativeuniquelayer,
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
          dropdownParent:     this.$el.querySelector('.g3w-search-form'),
          minimumInputLength: has_autocomplete && (numdigaut && !Number.isNaN(1 * numdigaut) && 1 * numdigaut > 0 && 1 * numdigaut || 2) || 0, // get numdigaut and validate it
          allowClear:         has_autocomplete,
          placeholder:        has_autocomplete ? '' : null,
          multiple:           is_multiple, 
          /**
           * @param { Object } params
           * @param params.term the term that is used for searching
           * @param { Object } data
           * @param data.text the text that is displayed for the data object
           */
          matcher: (params, data) => {
            const search = params?.term?.toLowerCase();
            if ('' === (search || '').toString().trim())                             { return data }        // no search terms → get all of the data
            if (data.text.toLowerCase().includes(search) && undefined !== data.text) { return { ...data } } // the searched term
            return null;                                                                                    // hide the term
          },
          language: {
            noResults:     () => _('No results'),
            errorLoading:  () => _('Error Loading Data'),
            searching:     () => _('Searching ...'),
            inputTooShort: d => `${_('Please enter')} ${d.minimum - d.input.length} ${_('or more characters')}`,
          },
        });

        SELECTS.push(select2);

        select2.on('select2:select select2:unselecting', e => {

          //Add/Change value

          if ('select2:select' === e.type || has_autocomplete) {
            const value = e.params.data ? `${e.params.data.id}` : SEARCH_ALLVALUE;

            
            if (is_multiple && input.value.find(v => value === v)) {
              input.value = input.value.filter(v => value !== v);
            }

            if (is_multiple && !input.value.find(v => value === v)) {
              //remove alway SEARCH_ALLVALUE value
              input.value = input.value.filter(v => !(value === SEARCH_ALLVALUE) && SEARCH_ALLVALUE !== v);
              input.value.push(value);
            }

            if (!is_multiple) {
              input.value = value;
            }
            
          }

          //remove value  
          if ('select2:unselecting' === e.type && is_multiple) {
            input.value = input.value.filter(v => e.params?.args?.data?.id !== v);
            //If we remove all values, we set the SEARCH_ALLVALUE
            if (0 === input.value.length) {
              input.value = [SEARCH_ALLVALUE];
            }
          }

          this.changeInput(input);


        }
      );

        // trigger select2 change on input value change
        this.$watch(() => input.value, async (value, oldVal) => {
          //Need to convert to an array to consider 'in' operator type
          if ((new Set([].concat(value))).difference((new Set([].concat(oldVal)))) || [].conact(value).find(v => SEARCH_ALLVALUE === v)) {
            select2.val(value).trigger('change');
          }
        });

        // recreate select2 value when language change
        GUI.on('i18n-ready', () => {
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
      },

      /**
       * Reload select2Inputs
        * @return {Promise<void>}
       */
      async reloadSelect2Inputs() {
        //Already reload from another layer
        if (this.reload) { return }

        this.reload = true;
        //wait to be sure that another layer is call to reload
        await this.$nextTick();

        try {
          await this.$options.service.setInputs();
        } catch(e) {
          console.warn(e);
        }

        this.clearSelect2();
        try {
          await Promise.allSettled(this.state.forminputs.map(input => this.initSelect2Field(input)));
        } catch(e) {
          console.warn(e);
        }

        this.reload = false;
      }

    },
    watch: {
      //@since 3.11.0 Set state auto filter to a search result
      autofilter(bool = false) {
        this.state.autofilter.value = Number(bool); //0/1 instead true false
      }
    },

    async created() {
      //Listen change filtertoken on layer
      //Need to listen on each layer instead to watch ApplicationState.tokens.filtertoken changes
      //because when create a new filter with new rules, the filtertoken string doesn't change
      this.search_layers.forEach(l => l.on('filtertokenchange', this.reloadSelect2Inputs));
    },

    async mounted() {
      //@since 3.11.0 Need to add $nextTick()
      // because can happen that .g3w-search-form is not yet visible for select2 dropdownParent:$('.g3w-search-form:visible'),
      await Promise.allSettled([this.$nextTick(), this.state.mounted]);
      for (const input of this.state.forminputs) {
        await this.initSelect2Field(input);
        await this.initDateTimeField(input);
      }
    },

    beforeDestroy() {
      this.search_layers.forEach(l => l.off('filtertokenchange', this.reloadSelect2Inputs));
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
    background: var(--bgcolor);
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
  .search-label .skin-color {
    font-family: monospace;
  }
</style>
