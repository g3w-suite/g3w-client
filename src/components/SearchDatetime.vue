<template>
  <div :id="id" class="input-group date">
    <input :id="forminput.id" type='text' class="form-control" />
    <span class="input-group-addon skin-color">
      <span :class="g3wtemplate.getFontClass('calendar')"></span>
    </span>
  </div>

</template>

<script>
  import ApplicationState from 'core/applicationstate';
  const {getUniqueDomId} = require('core/utils/utils');

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
    async mounted() {
      await this.$nextTick();

      $(`#${this.id}`).datetimepicker({
        defaultDate: '',
        format: 'YYYY-MM-DD',
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
        this.forminput.value = _.isEmpty(_.trim(newDate)) ? null : moment(newDate, 'YYYY/MM/DD').format('YYYY/MM/DD');
      });

      ApplicationState.ismobile && setTimeout(()=>{
        $(`#${this.forminput.id}`).blur();
      })
    }
  };
</script>
