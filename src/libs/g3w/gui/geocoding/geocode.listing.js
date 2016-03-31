var MapService = require('g3w/core/mapservice');

var ResultsList = Vue.extend({
  template: '<ul><li v-for="result in results" @click="goto(result.lon,result.lat)" style="cursor:pointer">{{ result.display_name }}</li></ul>',
  data: function(){
    return {
      results: []
    };
  },
  methods: {
    goto: function(x,y){
      MapService.goToWGS84([x,y]);
    }
  }
});

module.exports = ResultsList;
