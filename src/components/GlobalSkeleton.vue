<!--
  @file
  @since v3.7
-->

<template>
  <div class="card br">
    <div class="chart-wrapper">
      <div class="chart-item br"></div>
      <div class="chart-item chart-item-80 item-light br"></div>
      <div class="chart-item br"></div>
      <div class="chart-item br chart-item-80"></div>
    </div>
    <div class="item br text80"></div>
    <div class="item item-light br"></div>
    <div class="item br"></div>
    <div class="item item-light br text80"></div>
  </div>
</template>

<script>
  export default {
    name: "skeleton",
  }
</script>

<style scoped>
  .br {
    border-radius: 8px;
  }
  .card {
    width: 80%;
    padding: 10px 20px;
    margin: 50px auto;
  }
  .item {
    height: 15px;
    background: #ccc;
    margin-top: 15px;
  }
  .item-light {
    background: #ddd;
  }
  .text80 {
    width: 80%
  }
  .chart-wrapper {
    height: 50px;
    display: flex;
    align-items: baseline;
    margin-bottom: 20px;
  }
  .chart-item {
    height: 100%;
    width: 15px;
    background: #ccc;
    margin-right: 10px;
  }
  .chart-item-80 {
    height: 80%;
  }
</style>