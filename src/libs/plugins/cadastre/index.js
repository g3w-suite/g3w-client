var IternetPlugin = function(){
  this.name = 'cadastre';
};

(function(plugin){
  g3wsdk.core.PluginsRegistry.registerPlugin(plugin);
})(new IternetPlugin);
