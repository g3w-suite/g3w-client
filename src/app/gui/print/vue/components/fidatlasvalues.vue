<template>
  <div class="form-group" style="width: 100%;">
    <label :for="print_atlas_fid" style="display: block">
      <span>fids [max: {{atlas.feature_count - 1 }}]</span>
    </label>
    <input class="form-control" v-model="value" @keydown.space.prevent></input>
    <div id="fid-print-atals-instruction" style="margin-top: 5px; color: #ffffff">
      <div id="fids_intruction" v-t="'sdk.print.fids_instruction'" style="white-space: pre-line"></div>
      <div id="fids_examples_values" style="margin-top: 3px; font-weight: bold" v-t="'sdk.print.fids_example'"></div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "fid-atlas-values",
    props: {
      atlas: {
        type: Object
      },
      reset: {
        type: Boolean,
        default: false
      }
    },
    data(){
      return {
        value:''
      }
    },
    methods: {
      validateValue(value){
        value = value && 1*value;
        return Number.isInteger(value) && value >=0 && value < this.atlas.feature_count || null;
      }
    },
    watch: {
      value(value) {
        this.value = value;
        const values = new Set();
        const addValue = (value) =>{
          this.validateValue(value) !== null && values.add(value);
        };
        const addRangeToValues = (range=[]) => {
          const rangeLenght = range.length;
          for (let i=1; i<rangeLenght; i++) {
            const start = range[i-1];
            const end = range[i];
            for (let _i=start; _i < end; _i++ ){
              values.add(_i+'');
            }
          }
          values.add(range[rangeLenght-1]);
        };
        if (value) {
          value.split(',').forEach(value => {
            if (value) {
              if (value.indexOf('-') !== -1) {
                const _values = value.split('-');
                const range = _values.filter(value => this.validateValue(value) !== null);
                if (range.length === _values.length) {
                  const canAdd = range.reduce((bool, value, currentIndex) => {
                    return bool && ((currentIndex === 0) || range[currentIndex-1] <= value);
                  }, true);
                  canAdd && addRangeToValues(range);
                }
              } else addValue(value);
            }
          });
        }
        this.$emit('set-values', Array.from(values));
      },
      reset(bool){
        if (bool) {
          this.value = '';
          this.$emit('set-values', []);
        }
      }
    },
    beforeDestroy() {
      this.value = null;
    }
  }
</script>

<style scoped>

</style>