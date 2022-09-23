<template>
  <div :id="id" class="input-group date">
    <input :id="forminput.id" type='text' class="form-control"/>
    <span class="input-group-addon skin-color">
      <span :class="g3wtemplate.getFontClass('calendar')"></span>
    </span>
  </div>

</template>

<script>
  import ApplicationState from 'core/applicationstate';
  const {getUniqueDomId, convertQGISDateTimeFormatToMoment} = require('core/utils/utils');

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
      this.forminput.options.formats = [{
        "date": true,
        "time": false,
        "fieldformat": "yyyy-MM-dd",
        "displayformat": "yyyy",
        "default": null
      }]
    },
    async mounted() {
      await this.$nextTick();
      const {options: {formats}} = this.forminput;
      let {fieldformat, displayformat} = formats[0];
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
        locale: ApplicationState.lng || 'en'
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
