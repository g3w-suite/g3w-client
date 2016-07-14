
var SearchResultPanelComponent = Vue.extend({
  template: require('./resultpanel.html'),
  methods: {},
  created: function(){
    $("#search-results-table").footable({
      calculateWidthOverride: function(){
        return {
          width: $('#search-results').width()
        }
      }
    });
  }
});

module.exports = SearchResultPanelComponent;
