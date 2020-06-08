const Input = require('gui/inputs/input');
const selectMixin = require('./selectmixin');

const SelectInput = Vue.extend({
  mixins: [Input, selectMixin],
  data: function() {
    return {}
  },
  template: require('./select.html'),
  watch: {
    'state.input.options.values'(values) {
     if (!this.autocomplete && !this.state.value && values.length)
       this.changeSelect(values[0].value);
    }
  },
  created() {
    this.autocomplete && this.state.value && this.service.getKeyByValue({search: this.state.value});
  },
  mounted() {
    this.$nextTick(() => {
      const selectElement = $(this.$el).find('select');
      const language =  this.getLanguage();
      if (this.autocomplete) {
        this.select2 = selectElement.select2({
          minimumInputLength: 1,
          language,
          ajax: {
            delay: 250,
            transport: (params, success, failure) => {
              const search = params.data.term;
              // hide previous result if present
              $('.select2-results__option.loading-results').siblings().hide();
              this.resetValues();
              this.service.getData({
                search
              }).then((values) => {
                success(values)
              }).catch((err) => {
                failure(err)
              })
            },
            processResults:  (data, params) => {
              params.page = params.page || 1;
              return {
                results: data,
                pagination: {
                  more: false
                }
              }
            }
          },
        });
      } else {
        this.select2 = selectElement.select2({
          language
        });
      }
      this.state.value && this.select2.val(this.state.value).trigger('change');
      this.select2.on('select2:select', (event) => {
        const value = event.params.data.$value? event.params.data.$value : event.params.data.id;
        this.changeSelect(value);
      });
    })
  }
});

module.exports = SelectInput;
