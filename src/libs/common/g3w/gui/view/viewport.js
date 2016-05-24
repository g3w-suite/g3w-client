Vue.component('viewport',{
  template: require('./viewport.html')
});

var ViewportService = function(){
  var containerSelector = '#viewport';
  this.init = function(config){
  };
  
  this.setView = function(view){
    view.$mount().$appendTo(containerSelector);
  }
}

module.exports = new ViewportService;
