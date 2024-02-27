<!--
  @file
  @since v3.7
-->

<template>
  <ul id="print" class="treeview-menu">
    <li>
      <form class="g3w-search-form form-horizonal">
        <div class="box-body">
          <transition :duration="500" name="fade">
            <bar-loader :loading="state.loading"/>
          </transition>
          <helpdiv message='sdk.print.help'/>

          <label for="templates" v-t="'sdk.print.template'"></label>
          <select
            id="templates"
            class="form-control"
            @change="onChangeTemplate"
            v-model="state.template"
            :style="{marginBottom: this.state.atlas && '10px'}">

            <option
              v-for="print in state.print"
              :value="print.name">{{ print.name }}
            </option>

          </select>

          <template v-if="!state.atlas">

            <label for="scala" v-t="'sdk.print.scale'"></label>
            <select
              id="scala"
              class="form-control"
              @change="onChangeScale"
              v-model="state.scala">

              <option
                v-for="scala in state.scale"
                :value="scala.value">{{ scala.label }}
              </option>

            </select>

            <label for="dpi">dpi</label>
            <select
              class="form-control"
              @change="onChangeDpi"
              v-model="state.dpi" id="dpi"
            >
              <option
                v-for="dpi in state.dpis"
              >{{ dpi }}</option>
            </select>

            <label for="rotation" v-t="'sdk.print.rotation'"></label>
            <input
              min="-360"
              max="360"
              @input="onChangeRotation"
              v-model="state.rotation"
              id="rotation"
              class="form-control"
              type="number"
            >
            <label for="format" v-t="'sdk.print.format'"></label>

            <select
              class="form-control"
              v-model="state.output.format"
              id="format"
            >
              <option
                v-for="format in state.formats"
                :value="format.value"
              >{{ format.label }}</option>
            </select>

          </template>

          <!-- since 3.8.7 -->
          <!-- Needed to recreate a component on change template -->
          <template v-else-if="!templateChanged">
              <template v-if="state.atlas.field_name">
                <select-atlas-field-values
                  @disable-print-button="setDisabledPrintButton"
                  @set-values="setAtlasValues"
                  :atlas="state.atlas"
                  :reset="!state.isShow"/>
              </template>

              <template v-else>
                <fid-atlas-values
                  @disable-print-button="setDisabledPrintButton"
                  @set-values="setAtlasValues"
                  :atlas="state.atlas"
                  :reset="!state.isShow"/>
              </template>
          </template>

          <template v-if="state.labels && state.labels.length">
            <div
              class="print-labels-content"
              style="margin-top: 5px;"
            >
              <label
                style="font-weight: bold; font-size: 1.1em; display: block; border-bottom: 2px solid #ffffff; margin-bottom: 5px;"
                class="skin-color"
                v-t="'sdk.print.labels'">
              </label>
              <div
                class="labels-input-content"
                style="max-height: 120px; overflow-y: auto"
              >
                <span
                  v-for="label in state.labels"
                  :key="label.id"
                >
                  <label :for="`g3w_label_id_input_${label.id}`">{{label.id}}</label>
                  <input
                    :id="`g3w_label_id_input_${label.id}`"
                    class="form-control"
                    v-model="label.text"/>
                </span>
              </div>
            </div>
          </template>
        </div>
        <div
          class="box-footer"
          style="background-color: transparent"
        >
          <span>
            <button
              id="printbutton"
              style="width:100%; font-weight: bold"
              class="sidebar-button-run btn"
              v-disabled="button.disabled"
              @click.stop.prevent="print"
              v-download v-t="'create_print'">
            </button>
          </span>
        </div>
      </form>
    </li>
  </ul>
</template>

<script>
import SelectAtlasFieldValues from 'components/PrintSelectAtlasFieldValues.vue';
import FidAtlasValues from 'components/PrintFidAtlasValues.vue';

export default {

  /** @since 3.8.6 */
  name: 'print',

  data() {
    return {
      state: null,
      /** @since 3.8.7 **/
      templateChanged: false,  // useful to a redrawn component related to change template
      button: {
        class: "btn-success",
        type:"stampa",
        disabled: false
      }
    }
  },
  components: {
    SelectAtlasFieldValues,
    FidAtlasValues
  },
  computed: {
    disabled() {
      return this.state.output.loading || (!!this.state.atlas &&  0 === this.state.atlasValues.length);
    }
  },
  methods: {
    setDisabledPrintButton(bool=false) {
      this.button.disabled = bool;
    },
    setAtlasValues(values=[]) {
      this.state.atlasValues = values;
    },
    async onChangeTemplate() {
      this.templateChanged = true; // set true
      this.$options.service.changeTemplate();
      await this.$nextTick();
      this.templateChanged = false; // reset to false
    },
    onChangeScale() {
      this.$options.service.changeScale()
    },
    onChangeFormat() {},
    onChangeDpi() {},
    onChangeRotation(evt) {
      if (this.state.rotation >= 0 && !_.isNil(this.state.rotation) && this.state.rotation != '') {
        this.state.rotation = (this.state.rotation > 360) ? 360 : this.state.rotation;
        evt.target.value = this.state.rotation;
      } else if (this.state.rotation < 0) {
        this.state.rotation = (this.state.rotation < -360) ? -360 : this.state.rotation;
        evt.target.value = this.state.rotation;
      } else {
        this.state.rotation = 0;
      }
      this.$options.service.changeRotation();
    },
    print() {
      this.$options.service.print();
    }
  }
};
</script>