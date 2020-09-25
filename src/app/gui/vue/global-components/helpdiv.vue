<template>
  <div class="help_div_container" v-t="message">
    <span class="help_icon">i</span>
  </div>
</template>

<script>
  export default {
    name: "helpdiv",
    props: {
      message: {
        type: String,
        required: true
      },
      type: {
        type: String,
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
    padding: 10px;
    margin: 5px;
    white-space: pre-line;
    background-color: rgba(255, 255, 255, 0.1);
  }
  .help_icon{
    text-align: center;
    font-size: 0.7em;
    margin-top: -5px;
    margin-left: -5px;
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

</style>