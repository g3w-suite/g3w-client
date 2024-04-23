<!--
  @file
  
  ORIGINAL SOURCE: src/components/GlobalDateTime.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="{ visible: true, type: 'datetime' }" _type="legacy" _plain="true">

    <!--
      @example <g3w-field mode="input" _type="datetime" />
     -->
    <template #default>
      <div ref="datimecontainer">
        <label
          :for  = "id"
          style = "display: block;"
          v-t   = "label"
        ></label>
        <div class="form-group">
          <div
            ref   = "iddatetimepicker"
            class = "input-group date"
          >
            <input
              ref     = "idinputdatetimepiker"
              :id     = "id"
              type    = "text"
              @change = "changeInput"
              class   = "form-control"
            />
            <span class="input-group-addon caret">
              <span
                class  = "datetimeinput"
                :class = "g3wtemplate.getFontClass(type === 'time' ? 'time' : 'calendar')"
              ></span>
            </span>
          </div>
        </div>
      </div>
    </template>

  </g3w-field>
</template>

<script>
  import ApplicationState   from 'store/application-state';
  import G3WField           from 'components/G3WField.vue';
  import { getUniqueDomId } from 'utils/getUniqueDomId';

  Object
    .entries({
      ApplicationState,
      G3WField,
      getUniqueDomId,
    })
    .forEach(([k, v]) => console.assert(undefined !== v, `${k} is undefined`));

  export default {

    /** @since 3.9.0 */
    // name: "input-datetime",

    components: {
      'g3w-field': G3WField,
    },

    props: {

      type:{
        type: String,
        default: 'date' // time
      },

      format: {
        type: String,
        default: 'YYYY-MM-DD'
      },

      minDate:{
        default: false
      },

      maxDate: {
        default: false
      },

      enabledDates: {
        default: false
      },

      value: {},

      label: {
        default: 'Date'
      },

    },

    data() {
      return {
        datetimevalue: this.value,
      };
    },

    methods: {

      changeInput(evt) {},

      change(value) {
        this.$emit('change', moment(value).format(this.format)) // emit date.
      },

    },

    async mounted() {

      await this.$nextTick();

      this.datetimeinputelement = $(this.$refs.iddatetimepicker);

      this.datetimeinputelement.datetimepicker({
        minDate:           this.minDate,
        maxDate:           this.maxDate,
        defaultDate:       this.datetimevalue,
        useCurrent:        false,
        allowInputToggle:  true,
        enabledDates:      this.enabledDates,
        showClose:         true,
        format:            this.format,
        locale:            ApplicationState.language,
        toolbarPlacement: 'top',
        widgetPositioning: { horizontal: 'right' },
      });

      this.datetimeinputelement.on("dp.change", ({date}) => {
        this.change(date);
      });

      this.datetimeinputelement.on("dp.hide", evt => {
        /**
         * for developement purpose. It used to leave open datimepicker open
         */
        //$(this.$refs.iddatetimepicker).data("DateTimePicker").show();
      });

      ApplicationState.ismobile && setTimeout(() => datetimeinputelement.blur());

    },

    watch: {

      value(datetime) {
        this.datetimevalue = datetime;
        this.datetimeinputelement.data("DateTimePicker").date(datetime)
      },

      async minDate(mindatetime) {
        this.datetimeinputelement.data("DateTimePicker").minDate(mindatetime);
      },

      async maxDate(maxdatetime) {
        this.datetimeinputelement.data("DateTimePicker").maxDate(maxdatetime);
      },

      enabledDates(dates) {
        this.datetimeinputelement.data("DateTimePicker").enabledDates(dates);
      },

    },

    created(){
      this.id = getUniqueDomId();
    },

  }
</script>