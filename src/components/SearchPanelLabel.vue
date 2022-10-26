<template>
  <label :for="forminput.id" class="search-label" style="width: 100%; display: flex; justify-content: space-between">
    <span>{{ forminput.label || forminput.attribute }}</span>
    <span class="skin-color">{{ getLabelOperator(forminput.operator)}}</span>
  </label>
</template>

<script>
  import {EXPRESSION_OPERATORS} from 'core/layers/filter/operators';
  export default {
    name: 'Searchpanellabel',
    props: {
      forminput: {
        type: Object,
        require: true
      }
    },
    methods: {
      getLabelOperator(operator){
        return `[ ${EXPRESSION_OPERATORS[operator]} ]`
      },
    }
  };
</script>
