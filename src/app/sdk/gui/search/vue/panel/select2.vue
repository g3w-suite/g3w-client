<template>
  <select :name="forminput.attribute" class="form-control" :id="forminput.id" :disabled="forminput.options.disabled">
    <option :value="value" v-for="value in forminput.options.values" :key="value">
      <span v-if="value === ''" v-t="'sdk.search.all'"></span>
      <span v-else>{{ value }}</span>
    </option>
  </select>
</template>

<script>
  const t = require('core/i18n/i18n.service').t;
  export default {
    name: "select2",
    props: ['forminput'],
    methods: {
      _initSelect2Element() {
        this.select2 = $(this.$el).select2({
          width: '100%',
          matcher: (params, data) => {
            const searchItem = params.term ? params.term.toLowerCase(): params.term;
            // If there are no search terms, return all of the data
            if ($.trim(searchItem) === '') {
              return data;
            }
            // Do not display the item if there is no 'text' property
            if (typeof data.text === 'undefined') {
              return null;
            }
            // `params.term` should be the term that is used for searching
            // `data.text` is the text that is displayed for the data object
            if (data.text.toLowerCase().indexOf(searchItem) > -1) {
              const modifiedData = $.extend({}, data, true);
              // You can return modified objects from here
              // This includes matching the `children` how you want in nested data sets
              return modifiedData;
            }
            // Return `null` if the term should not be displayed
            return null;
          },
          "language": {
            "noResults": function(){
              return t("no_results");
            }
          },
        });
        this.select2.on('select2:select', (evt) => {
          const attribute = $(evt.target).attr('name');
          const value = evt.params.data.id;
          this.$emit('select-change', {
            attribute,
            value
          });
        })
      }
    },
    watch : {
      'forminput.value'(value) {
        if (!value)
          this.select2.val('');
      }
    },
    mounted() {
      this.$nextTick(()=> {
        this._initSelect2Element();
      })
    },
    beforeDestroy() {
      this.select2.select2('destroy');
      this.select2 = null;
    }
  }
</script>

<style scoped>

</style>
