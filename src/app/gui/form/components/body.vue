<template>
  <div>
    <form class="form-horizontal g3w-form">
      <div class="box-primary">
        <div class="box-body">
          <template v-if="hasFormStructure">
            <tabs :layerid="state.layerid"
              :feature="state.feature"
              :handleRelation="handleRelation"
              :contenttype="'editing'"
              :addToValidate="addToValidate"
              :changeInput="changeInput"
              :tabs="state.formstructure"
              :fields="state.fields">
            </tabs>
          </template>
          <template v-else>
            <g3w-form-inputs :state="state"
              :addToValidate="addToValidate"
              :changeInput="changeInput"
              @changeinput="changeInput"
              @addinput="addToValidate">
            </g3w-form-inputs>
          </template>
        </div>
      </div>
    </form>
  </div>
</template>

<script>
  import G3wFormInputs from 'gui/inputs/g3w-form-inputs.vue';

  export default {
    name: "body",
    props: ['state', 'handleRelation'],
    data() {
      return {
        show: true,
      };
    },
    components: {
      G3wFormInputs,
    },
    methods: {
      addToValidate(input) {
        this.$emit('addtovalidate', input);
      },
      changeInput(input) {
        this.$emit('changeinput', input);
      },
    },
    computed: {
      hasFormStructure() {
        return !!this.state.formstructure;
      },
    }
  }
</script>

<style scoped>

</style>