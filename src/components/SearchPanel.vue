<!--
  @file Render and execute configured search forms.
  @since v3.7
-->

<template>
  <div
    class      = "g3w-search-panel form-group"
    v-disabled = "state.searching || loading || reload"
  >
    <div v-if = "state.searching || loading || reload" class = "bar-loader" style = "border: 0"></div>
    <h4><b>{{ state.title }}</b></h4>

    <section v-if = "filterlayers.length > 0" id = "g3w-search-filter-layers" style = "display: flex; justify-content: space-between">
      <!-- HELP DIV -->
      <div style = "color: #FFF; text-align: justify; position: relative; border-radius: 3px; margin: 5px 2px 5px 2px; white-space: pre-line; background-color: #384246 !important;">
        <span style = "text-align: center; font-size: 0.7em; margin-top: -4px; margin-left: -4px; background-color: var(--bgcolor); font-weight: bold; color: #fff; position: absolute; top: 0; left: 0; width: 15px; height: 15px; border: 1px solid #fff; border-radius: 50%;">i</span>
        <div v-t = "'Search values are limited based on the active filter. Remove the filter to search all data.'" style = "max-height: 200px; padding: 10px; overflow-y: auto;"></div>
      </div>
      <button
        title          = "Remove Filter"
        data-placement = "left"
        @click.stop    = "clearFilters"
        class          = "btn skin-border-color"
        style          = "background-color: transparent; margin: 5px 0"
      >
        <i aria-hidden = "true" class = "fas fa-broom skin-color"></i>
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

            <div
              v-if  = "input.dependance && (state.loading[input.dependance] || input.loading)"
              class = "bar-loader"
              style = "border: 0"
            ></div>
            <div class = "search-select-control">
              <x-select
                :data-input-id = "input.id"
                :value        = "getSelectInputValue(input)"
                :multiple     = "'in' === input.operator"
                :searchable   = "true"
                :disabled     = "input.disabled || input.loading"
                @change       = "onSelectInputChange(input, $event)"
                @search-input = "searchAutocomplete(input, $event)"
                @click.capture = "resetAutocompleteStatus(input, $event)"
                @keydown.capture = "resetAutocompleteStatus(input, $event)"
              >
                <x-option
                  v-for  = "opt in input.values"
                  :key   = "opt.value"
                  :value = "getSelectInputOptionValue(opt.value)"
                >
                  <span v-if = "allvalue === opt.value" v-t = "'sdk.search.all'"></span>
                  <span v-else>{{ opt.key }}</span>
                </x-option>
              </x-select>
              <button
                v-if    = "'autocompletefield' === input.type && 'in' !== input.operator && ![null, undefined, allvalue].includes(input.value)"
                type    = "button"
                class   = "btn btn-default search-select-clear"
                :title  = "$t('Clear Selection')"
                :aria-label = "$t('Clear Selection')"
                @click  = "clearAutocomplete(input)"
              ><i aria-hidden = "true" class = "fas fa-times"></i></button>
            </div>
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
              <span class = "input-group-addon skin-color" style="cursor:pointer;">
                <span :class = "input.options.format.time ? 'far fa-clock': 'fas fa-calendar-alt'"></span>
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
          <label title = "Whether automatically filter geometries displayed within the map<br>in order to show only those related to current search results." data-placement = "right" style = "display: block;">
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
  import { throttle }                          from 'utils/throttle';

  export default {

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
            i.value = 'in' === i.operator ? [i.values?.[0]?.value] : i.values?.[0]?.value; //set all or first value
          } else {
            i.value = null;
          }
          this.changeInput(i);
        })
        //@since 4.0.0 close content
        GUI.closeContent();
      },
      resize() {
        if (!ApplicationState.ismobile) {
          this.$el.querySelectorAll('x-select').forEach(select => select.close());
        }
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
            value = Array.isArray(value) ? value.map(v => v?.trim?.()) : value?.trim?.();
          }

          //in case of undefined or null, set to null
          input.value = value ?? null;

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
          await this.$nextTick();
          this.syncSelectInputs();
        }
      },

      doSearch(e) {
        e.preventDefault();
        this.$options.service.run();
      },

      getSelectInputValue(input) {
        return [].concat(input.value ?? this.allvalue).map(value => this.getSelectInputOptionValue(value)).join(',');
      },

      getSelectInputOptionValue(value) {
        return null === value ? 'null' : `${value}`;
      },

      syncSelectInput(input) {
        const select = Array.from(this.$el.querySelectorAll('x-select[data-input-id]'))
          .find(select => select.dataset.inputId === `${input.id}`);
        if (!select?.container) { return; }
        if ('autocompletefield' === input.type && !select.container.querySelector('.search-select-status')) {
          const status = document.createElement('div');
          status.className = 'search-select-status';
          status.setAttribute('role', 'status');
          status.style.cssText = 'padding: 8px 12px; color: #444;';
          status.textContent = `${this.$t('Please enter')} ${this.getAutocompleteMinimum(input)} ${this.$t('or more characters')}`;
          select.container.appendChild(status);
        }
        const multiple = 'in' === input.operator;
        const values = [].concat(input.value ?? this.allvalue).map(value => this.getSelectInputOptionValue(value));
        const options = Array.from(select.container.querySelectorAll('x-option'));
        select.selected_options = [];
        options.forEach(option => option.removeAttribute('selected'));
        values.forEach(value => {
          const option = options.find(option => option.value === value);
          if (option) { select.select(option, { autoclose: false, emit: false }); }
        });
        if (multiple) {
          select.select(null, { autoclose: false, emit: false });
        } else if (!select.selected_options.length) {
          select.content.textContent = `${g3w?.gettext?.('Select') || 'Select'}...`;
        }
        select.setAttribute('value', multiple ? values.join(',') : values[0]);
      },

      syncSelectInputs() {
        this.state.forminputs.forEach(input => this.syncSelectInput(input));
      },

      onSelectInputChange(input, event) {
        if ('in' === input.operator) {
          const values = event.target.selected_options.map(option => option.value);
          input.value = values.at(-1) === this.allvalue
            ? [this.allvalue]
            : values.filter(value => value !== this.allvalue);
          if (!input.value.length) { input.value = [this.allvalue]; }
        } else {
          input.value = event.target.value;
        }
        this.changeInput(input);
      },

      clearAutocomplete(input) {
        input.value = this.allvalue;
        this.changeInput(input);
      },

      getAutocompleteMinimum(input) {
        const digits = Number(input.options.numdigaut);
        return Number.isFinite(digits) && digits > 0 ? digits : 2;
      },

      resetAutocompleteStatus(input, event) {
        if ('autocompletefield' !== input.type || !event.target.closest('.x-select-trigger')) { return; }
        const status = event.currentTarget.container?.querySelector('.search-select-status');
        if (status) {
          status.hidden = false;
          status.textContent = `${this.$t('Please enter')} ${this.getAutocompleteMinimum(input)} ${this.$t('or more characters')}`;
        }
      },

      searchAutocomplete(input, { target, detail: { value = '' } = {} }) {
        clearTimeout(input._xSelectSearchTimer);
        const request = input._xSelectSearchRequest = (input._xSelectSearchRequest || 0) + 1;
        if ('autocompletefield' !== input.type) { return; }
        const term = value.trim();
        const minimum = this.getAutocompleteMinimum(input);
        const status = target.container?.querySelector('.search-select-status');
        if (term.length < minimum) {
          if (status) {
            status.hidden = false;
            status.textContent = `${this.$t('Please enter')} ${minimum} ${this.$t('or more characters')}`;
          }
          return;
        }
        if (status) {
          status.hidden = false;
          status.textContent = this.$t('Searching ...');
        }

        input._xSelectSearchTimer = setTimeout(async () => {
          try {
            const results = await getDataForSearchInput({
              state: this.state,
              layerid: input.alternativeuniquelayer,
              field: input.attribute,
              suggest: `${input.attribute}|${term}`,
            });
            if (request !== input._xSelectSearchRequest) { return; }

            const selected = new Set([].concat(input.value ?? []).map(value => `${value}`));
            const retained = input.values.filter(option => selected.has(`${option.value}`));
            input.values = Array.from(new Map([...retained, ...results].map(option => [`${option.value}`, option])).values());
            await this.$nextTick();
            this.syncSelectInput(input);
            if (status) {
              status.hidden = results.length > 0;
              status.textContent = this.$t('No results');
            }
          } catch (error) {
            if (request === input._xSelectSearchRequest) {
              console.warn(error);
              if (status) { status.textContent = this.$t('Error Loading Data'); }
            }
          }
        }, 500);
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
          format:         input.options.format.displayformat,
          ignoreReadonly: true,
          locale:         ApplicationState.language || 'en',
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

      async reloadSearchInputs() {
        if (this.reload) { return; }
        this.reload = true;
        await this.$nextTick();
        try {
          await this.$options.service.setInputs();
        } catch (error) {
          console.warn(error);
        } finally {
          this.reload = false;
          await this.$nextTick();
          this.syncSelectInputs();
        }
      }

    },
    watch: {
      //@since 3.11.0 Set state auto filter to a search result
      autofilter(bool = false) {
        this.state.autofilter.value = Number(bool); //0/1 instead true false
      }
    },

    async created() {
      this.delayResize   = this.resize ? throttle(this.resize.bind(this), this.delayTime) : null;
      GUI.on('resize', this.delayResize);

      //Listen change filtertoken on layer
      //Need to listen on each layer instead to watch ApplicationState.tokens.filtertoken changes
      //because when create a new filter with new rules, the filtertoken string doesn't change
      this.search_layers.forEach(l => l.on('filtertokenchange', this.reloadSearchInputs));
    },

    async mounted() {
      this.$nextTick().then(() => this.resize?.());

      await Promise.allSettled([this.$nextTick(), this.state.mounted]);
      for (const input of this.state.forminputs) {
        await this.initDateTimeField(input);
      }
      await this.$nextTick();
      this.syncSelectInputs();
    },

    beforeDestroy() {
      GUI.off('resize', this.delayResize);
      this.delayResize = null;
      this.delayTime   = null;

      this.state.forminputs.forEach(input => {
        clearTimeout(input._xSelectSearchTimer);
        input._xSelectSearchRequest = (input._xSelectSearchRequest || 0) + 1;
      });
      this.search_layers.forEach(l => l.off('filtertokenchange', this.reloadSearchInputs));
    }

  };
</script>

<style scoped>
  .search-select-control {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .search-select-control x-select {
    flex: 1;
    min-width: 0;
    color: #333;
  }
  .search-select-clear {
    flex: 0 0 34px;
    height: 34px;
    padding: 0;
  }
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
