<!--
  @file
  @since v3.7
-->

<template>
  <div class = "help_div_container">
    <span class = "help_icon">i</span>
    <div v-t = "message" class = "g3w-help-message-content"></div>
  </div>
</template>

<script>
  export default {
    name: "helpdiv",
    props: {
      message: {
        type:     String,
        required: true
      },
      type: {
        type:    String,
        default: 'info' // alert, warning
      }
    }
  }
</script>

<style scoped>
  .help_div_container {
    color: #FFFFFF;
    text-align: justify;
    position: relative;
    border-radius: 3px;
    margin: 5px 2px 5px 2px;
    white-space: pre-line;
    background-color: #384246 !important;
  }
  .help_icon{
    text-align: center;
    font-size: 0.7em;
    margin-top: -4px;
    margin-left: -4px;
    background-color: #222d32;
    font-weight: bold;
    color: #ffffff;
    position: absolute;
    top: 0;
    left: 0;
    width: 15px;
    height: 15px;
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.5);
    border: 1px solid #ffffff;
    border-radius: 50%;
  }
  .g3w-help-message-content{
    max-height: 200px;
    padding: 10px;
    overflow-y: auto;
  }

</style>