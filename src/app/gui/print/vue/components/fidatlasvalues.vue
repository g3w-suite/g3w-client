<template>
  <div class="form-group" style="width: 100%;">
    <label :for="print_atlas_fid" style="display: block">
      <span>fids [max: {{atlas.feature_count}}]</span>
    </label>
    <input class="form-control" v-model="value"></input>
    <div id="fid-print-atals-instruction" style="margin-top: 5px;">
      Es: 1,2-6
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
    watch: {
      value(value) {
        const trimValue = value => value.replace(/ /g,'');
        value = trimValue(value);
        const values = new Set();
        const validateValue = (value => {
          value = trimValue(value) && 1*trimValue(value);
          return Number.isInteger(value) && value >=0 && value <= this.atlas.feature_count || null;
        });
        const addValue = (value) =>{
          validateValue(value) !== null && values.add(value);
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
            value = trimValue(value);
            if (value) {
              if (value.indexOf('-') !== -1) {
                const _values = value.split('-');
                const range = _values.filter(value => validateValue(value) !== null);
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
        bool && this.$emit('set-values', []);
      }
    }
  }
</script>

<style scoped>

</style>