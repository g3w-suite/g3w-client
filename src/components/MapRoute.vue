<template>
  <div class="maproute" style="background: #FFFFFF; padding: 5px; overflow: auto">
    <section class="maproute-header">
      <div class="maproute-header-info" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
          <span
            @click.stop="$emit('zoom-to-route')"
            class="action-button skin-color"
            style="font-size: 1.5em; padding: 5px;"
            :class="g3wtemplate.getFontClass('route')"></span>
          <span>
            <span style="font-size: 1.5em; font-weight: bold; color: green; margin-right: 5px;">{{Math.round($options.legs.reduce((accumulator, item)=> accumulator+=item.duration.value, 0)/60)}} min</span>
            <span style="font-size: 1.2em; font-weight: bold">({{($options.legs.reduce((accumulator, item)=> accumulator+=item.distance.value, 0)/1000)}} km)</span>
          </span>
           </div>
      <div v-for="(leg, index) in $options.legs" class="maproute-header-item">
        <i style="margin-right: 5px ; cursor: pointer"
           class="action-button"
           @click.stop="$emit('zoom-to-point', index)"
           :style="{color: index === 0 ? 'green' : '#000000'}"
           :class="g3wtemplate.getFontClass(index === 0 ? 'marker': 'empty-circle')">
        </i>
        <span style="font-weight: bold;">{{leg.start_address}}</span>
        <span
          class="action-button"
          @click.stop="$emit('delete-point', index)"
          style="margin-left: auto; cursor:pointer"
          :class="g3wtemplate.getFontClass('circle-close')">
        </span>
      </div>
      <div class="maproute-header-item">
        <i
          class="action-button"
          @click.stop="$emit('zoom-to-point', $options.legs.length)"
          style="margin-right: 5px; color: red; cursor: pointer"
          :class="g3wtemplate.getFontClass('marker')">
        </i>
        <span style="font-weight: bold;">{{$options.legs[$options.legs.length - 1].end_address}}</span>
        <span
          class="action-button"
          @click.stop="$emit('delete-point', $options.legs.length)"
          style="margin-left: auto; cursor:pointer"
          :class="g3wtemplate.getFontClass('circle-close')">
        </span>
      </div>
    </section>
    <section class="maproute-details" style="display: flex; flex-direction: column">
        <div
          @click.stop="showDetails = !showDetails"
          class="maproute-details-show-hide skin-background-color lighten" style="cursor: pointer; display: flex; justify-content: space-between; padding: 3px;">
          <span
            style="font-weight: bold">Dettagli
          </span>
          <span
            :class="[showDetails ? g3wtemplate.font['minus'] : g3wtemplate.font['plus']]"></span>
        </div>
        <div v-show="showDetails"  class="maproute-details-content">
            <template v-for="leg in $options.legs">
              <div v-for="step in leg.steps"
                  style="padding: 5px; border-bottom: 2px solid #eeeeee; cursor:pointer"
                  @click.stop="$options.showLine(step)">
                  <div v-html="step.instructions"></div>
                  <div style="display: flex; justify-content: center">
                      <span style="color:green; font-weight: bold">{{step.duration.text}}</span>
                      <span>({{step.distance.text}})</span>
                  </div>
              </div>
            </template>
        </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'MapRoute',
  data(){
    return {
      showDetails: false
    }
  },
};
</script>
<style scoped>
.maproute-header-item {
  display: flex;
  align-items: center;
  padding: 5px; margin-bottom: 5px;
  border-bottom: 1px solid #eeeeee;
}
</style>
