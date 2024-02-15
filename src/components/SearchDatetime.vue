<template>
  <div :id="id" class="input-group date">
    <input :id="forminput.id" type='text' class="form-control"/>
    <span class="input-group-addon skin-color">
      <span :class="g3wtemplate.getFontClass(time ? 'time': 'calendar')"></span>
    </span>
  </div>

</template>

<script>
  import ApplicationState from 'store/application-state';

  const { getUniqueDomId, convertQGISDateTimeFormatToMoment } = require('utils');

  export default {
    name: 'Searchdatetime',
    props: {
      forminput: {
        type: Object,
        require: true
      }
    },
    created(){
      this.id = `search_datetime_${getUniqueDomId()}`;
    },
    computed: {
      time() {
        return this.forminput.options.format.time;
      }
    },
    async mounted() {
      await this.$nextTick();
      const {options: {format}} = this.forminput;
      let {fieldformat, displayformat} = format;
      fieldformat = convertQGISDateTimeFormatToMoment(fieldformat);
      displayformat = convertQGISDateTimeFormatToMoment(displayformat);
      $(`#${this.id}`).datetimepicker({
        defaultDate: null,
        format: displayformat,
        ignoreReadonly: true,
        allowInputToggle: true,
        toolbarPlacement: 'top',
        widgetPositioning: {
          vertical: 'bottom',
          horizontal: 'left'
        },
        showClose: true,
        locale: ApplicationState.language || 'en'
      });

      $(`#${this.id}`).on("dp.change", () => {
        const newDate = $(`#${this.forminput.id}`).val();
        this.forminput.value = _.isEmpty(_.trim(newDate)) ? null : moment(newDate, displayformat).format(fieldformat);
        this.$emit('change', this.forminput);
      });

      ApplicationState.ismobile && setTimeout(()=>{
        $(`#${this.forminput.id}`).blur();
      })
    }
  };
</script>
