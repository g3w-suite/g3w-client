<!--
  @file
  @since v3.7
-->

<template>
  <div class="g3w-search-panel form-group" v-disabled="state.searching">
    <h4 class=""><b>{{ state.title }}</b></h4>
    <slot name="tools"></slot>
    <slot name="form">
      <form class="g3w-search-form">
        <span v-for="forminput in state.forminputs" :key="forminput.id">
          <div v-if="forminput.type === 'numberfield'" class="form-group numeric">
            <search-panel-label :forminput="forminput"/>
            <input type="number" min="0" @change="changeNumericInput(forminput)" @input="changeNumericInput(forminput)"
              v-model="forminput.value" class="form-control" :id="forminput.id">
            </div>
          <div v-else-if="forminput.type === 'textfield' || forminput.type === 'textField'" class="form-group form-item-search  text">
            <search-panel-label :forminput="forminput"/>
            <input @focus="onFocus" type="text" v-model="forminput.value" @change="changeInput(forminput)" class="form-control" :id="forminput.id" >
          </div>
          <div v-else-if="['selectfield', 'autocompletefield'].includes(forminput.type)" class="form-group text" v-disabled="isSelectDisabled(forminput)">
            <search-panel-label :forminput="forminput"/>
            <bar-loader v-if ="forminput.options.dependance" :loading="state.loading[forminput.options.dependance] || forminput.loading"/>
            <select2 :forminput="forminput" :autocompleteRequest="autocompleteRequest" @select-change="changeInput"/>
          </div>
           <div v-if="forminput.type === 'datetimefield'" class="form-group text" v-disabled="state.loading[forminput.options.dependance] || false">
             <search-panel-label :forminput="forminput"/>
             <search-datetime :forminput="forminput" @change="changeInput"/>
          </div>
          <div v-if="forminput.logicop" class="search-logicop skin-border-color">
            <h4>{{ forminput.logicop }}</h4>
          </div>
        </span>
        <div class="form-group">
          <button id="dosearch" class="sidebar-button-run btn btn-block pull-right" @click.stop="doSearch" data-i18n="dosearch"  v-t="'dosearch'"></button>
        </div>
      </form>
    </slot>
    <slot name="footer"></slot>
  </div>
</template>

<script>
import Select2          from 'components/SearchSelect2.vue';
import SearchDatetime   from 'components/SearchDatetime.vue';
import SearchPanelLabel from 'components/SearchPanelLabel.vue';

export default {
  components:{
    Select2,
    SearchDatetime,
    SearchPanelLabel
  },
  data() {
    return {
     state: this.$options.service.state
    }
  },
  methods: {
    isSelectDisabled(forminput){
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
    async autocompleteRequest(params={}){
      return this.$options.service.getUniqueValuesFromField({
        ...params,
        output: 'autocomplete'
      });
    },
    changeDependencyFields({attribute:field, value}) {
      const subscribers = this.$options.service.getDependencies(field);
      return subscribers.length ? this.$options.service.fillDependencyInputs({
        field,
        subscribers,
        value
      }): Promise.resolve();
    },
    changeNumericInput(input) {
      input.value = input.value || input.value === 0 ? input.value : null;
      this.changeInput(input);
    },
    changeInput(input) {
      let {id, attribute, value, type} = input;
      try {
        //try to trim value inside try catch some cases tha trim doesn't work to avoid
        // to check if has one reason to trim
        value = type === 'textfield' || type === 'textField' ? value : value.trim();
      } catch(err){}
      this.$options.service.changeInput({id, value});
      this.state.searching = true;
      this.changeDependencyFields({
        attribute,
        value
      }).finally(() => {
        this.state.searching = false;
      })
    },
    doSearch(event) {
     event.preventDefault();
     this.$options.service.run();
    }
  }
};
</script>