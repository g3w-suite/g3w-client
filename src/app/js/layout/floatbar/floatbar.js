function FloatBar(){
  this.state = {};
  this.layout = null;
  this.sidebarEl = null;
  this.child = null;
  
  this.init = function(layout){
    this.layout = layout;
    this.sidebarEl = $(this.layout.options.controlSidebarOptions.selector);
  };
  
  this.open = function(){
    this.layout.floatBar.open(this.sidebarEl,true);
  };
  
  this.close = function(){
    if (this.child && _.hasIn(this.child,"$destroy")){
      this.child.$destroy();
      this.child = null;
    };
    this.layout.floatBar.close(this.sidebarEl,true);
  };
  
  this.insert = function(vm){
    this.child = vm;
    this.child.$mount("#floatbar-content-wrapper");
    this.open();
  };
}

var floatBar = new FloatBar;
module.exports = floatBar;

Vue.component('floatbar',{
    template: require('./floatbar.html'),
    data: function(){
      return  { 
        content: "Contenuto"
      }
    },
    methods: {
      close: function(){
        floatBar.close();
      }
    }
});
