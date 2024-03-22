<!--
  @file
  
  ORIGINAL SOURCE: src/components/GlobalLayerPositions.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field>

    <!--
      @example <g3w-field mode="input" _type="layer_positions" />
     -->
    <template #default>
      <div
        :id   = "ids.layerpositions"
        class = "g3w-layer-positions"
      >
        <div
          v-t   = "`layer_position.message`"
          class = "g3w-layer-positions-info-message"
        ></div>
        <div class="g3w-layer-positions-checkboxes">
          <div
            v-for = "lp in layerpositions"
            :key  = "lp"
          >
            <input
              @change  = "change"
              class    = "form-control magic-radio"
              type     = "radio"
              :id      = "ids[lp]"
              v-model  = "position"
              :value   = "lp"
              :checked = "position === lp"
            >
            <label
              :for = "ids[lp]"
              v-t  = "`layer_position.${lp}`"
            ></label>
          </div>
        </div>
      </div>
    </template>

  </g3w-field>
</template>

<script>
  import G3WField           from 'components/G3WField.vue';
  import { MAP_SETTINGS }   from 'app/constant';
  import { getUniqueDomId } from 'utils/getUniqueDomId';

  Object
    .entries({
      G3WField,
      MAP_SETTINGS,
      getUniqueDomId,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

  export default {

    /** @since 3.9.0 */
    // name: "input-layerpositions",

    components: {
      'g3w-field': G3WField,
    },

    props: {
      position: {
        type: String,
        default: MAP_SETTINGS.LAYER_POSITIONS.default
      }
    },

    data() {
      return {
        layerpositions: MAP_SETTINGS.LAYER_POSITIONS.getPositions()
      }
    },

    methods: {
      change() {
        this.$emit('layer-position-change', this.position)
      }
    },

    created() {
      this.ids = { layerpositions: getUniqueDomId() };
      this.layerpositions.forEach(layerposition => this.ids[layerposition] = getUniqueDomId());
      this.change();
    },

  }
</script>

<style scoped>
  .g3w-layer-positions {
    display: flex;
    flex-direction: column;
    margin: 5px 0 5px 0;
  }
  .g3w-layer-positions-info-message{
    margin-bottom: 5px;
    font-weight: bold;
  }
  .g3w-layer-positions-checkboxes {
    display: flex;
    justify-content: space-between;
  }
</style>