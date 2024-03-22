<!--
  @file a generic "legacy" field type for deprecated BACKCOMPS (v3.x)

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      ORIGINAL SOURCE: src/components/InputG3W.vue@3.8

      @example <g3w-field mode="input" _type="legacy" />

      @since 3.9.0
    -->
    <template #default>
      <template v-if="'input' == $parent.mode && $parent.state.visible">

        <div v-if="'child' === state.type">
          <div
            style = "border-top: 2px solid"
            class = "skin-border-color field-child"
          >
            <h4 style="font-weight: bold">{{ state.label }}</h4>
            <div> {{ state.description }} </div>
            <g3w-field
              v-for   ="field in state.fields"
              v-bind  = "{ $attrs, state }"
              :state  = "field"
              :key    = "field.name"
              mode    = "input"
              _type   = "legacy"
            />
          </div>
        </div>

        <div v-else>
          <component
            v-bind = "{ ...$parent.$attrs, ...$parent.$props }"
            :is    = "$parent.type"
          />
          <span class="divider"></span>
        </div>

      </template>
    </template>

    <!--
      ORIGINAL SOURCE: src/components/FieldVue.vue@3.8

      @example <g3w-field mode="read" _type="legacy" _legacyType="vue" />

      @since 3.9.0
    -->
    <template #field-value="{ field }">
      <div v-if="'vue' === _legacyType || isVue(field)">
        <component
          :feature = "feature"
          :value   = "undefined === field.value       ? null        : field.value"
          :is      = "(undefined === field.vueoptions ? {}          : field.vueoptions.component) || {}"
        />
      </div>
    </template>

  </g3w-field>
</template>

<script>
import G3WField from 'components/G3WField.vue';

console.assert(undefined !== G3WField, 'G3WField is undefined');

export default {

  components: {
    'g3w-field': G3WField,
  },

  props: {

    state: {
      type: Object,
      required: true,
    },

    _legacyType: {
      type: String,
      default: "",
    },

  },

  created() {
    console.warn('>> legacy field type <<');
  },

};
</script>