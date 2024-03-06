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

        <span
          v-for = "forminput in state.forminputs"
          :key  = "forminput.id"
        >

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
              @change = "changeNumericInput(forminput)"
              @input  = "changeNumericInput(forminput)"
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
              ref        = "search_select"
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
            <div ref="search_datetime" class="input-group date">
              <input :id="forminput.id" type='text' class="form-control" />
              <span class="input-group-addon skin-color">
                <span :class="g3wtemplate.getFontClass(forminput.options.format.time ? 'time': 'calendar')"></span>
              </span>
            </div>
          </div>

          <!-- LOGIC OPERATOR -->
          <div
            v-if  = "forminput.logicop"
            class = "search-logicop skin-border-color"
          >
            <h4>{{ forminput.logicop }}</h4>
          </div>

        </span>

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

  </div>
</template>

<script>
import {
  FILTER_EXPRESSION_OPERATORS,
  SEARCH_ALLVALUE,
}                                            from 'app/constant';
import ApplicationState                      from 'store/application-state';
import { getUniqueDomId }                    from 'utils/getUniqueDomId';
import { convertQGISDateTimeFormatToMoment } from 'utils/convertQGISDateTimeFormatToMoment';
import resizeMixin                           from 'mixins/resize';

const { t } = require('core/i18n/i18n.service');

const SELECTS = [];

export default {

  mixins: [resizeMixin],

  data() {
    return {
     state: this.$options.service.state,
     allvalue: SEARCH_ALLVALUE,
    }
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

    isSelectDisabled(forminput) {
      return [
        this.state.loading[forminput.options.dependance],
        forminput.loading,
        forminput.options.disabled
      ].reduce((disabled, current=false) => disabled || current , false)
    },

    async onFocus(event) {
      if (this.isMobile()) {
        const top = $(event.target).position().top - 10 ;
        await this.$nextTick();
        setTimeout(() => $('.sidebar').scrollTop(top), 500);
      }
    },

    changeNumericInput(input) {
      input.value = input.value || input.value === 0 ? input.value : null;
      this.changeInput(input);
    },

    changeInput(input) {
      this.state.searching = true;
      try {
        /** @TODO check if has one reason to trim  */
        input.value = ['textfield', 'textField'].includes(input.type) ? input.value : input.value.trim();

        this.$options.service.changeInput({ id: input.id, value: input.value });

        // change dependency fields
        const subscribers = this.$options.service.getDependencies(input.attribute);

        if (subscribers.length) {
          this.$options.service.fillDependencyInputs({ subscribers, field: input.attribute, value: input.value, });
        }
      } catch(e) {
        console.warn(e);
      }
      this.state.searching = false;
    },

    doSearch(event) {
      event.preventDefault();
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

      const id = this.$refs.search_datetime.id = this.$refs.search_datetime.id || `search_datetime_${getUniqueDomId()}`;

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
          try      { ok({ results: await this.$options.service.getUniqueValuesFromField({ output: 'autocomplete', field: forminput.attribute, value: d.data.q.value }) }); }
          catch(e) { ko(e); }
        }
      } : null;

      let select2 = $(this.$refs.search_select).select2({
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
        if ('select2:unselecting' === e.type && !is_autocomplete) {
          return;
        }
        this.changeInput({
          id:        $(e.target).attr('id'),
          attribute: $(e.target).attr('name'),
          value:     e.params.data ? e.params.data.id : SEARCH_ALLVALUE,
          type:      forminput.type
        });
      });

      this.$watch(() => forminput.value, async (value) => {
        if (value === SEARCH_ALLVALUE) {
          select2.val(value).trigger('change');
        }
      });

    },

  },

  async mounted() {
    for (let forminput of this.state.forminputs) {
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