var hash = (location.href.split("?!")[1] || "");
var initpaths = hash.split("/");
var initurl = '/api/initconfig/'+initpaths[0]+'/'+initpaths[1]+'/'+initpaths[2];
$.get(initurl,function(initconfig){
  initconfig.staticurl = "../build/"; // in locale forziamo il path degli asset
  $(document).trigger('initconfigReady',initconfig);
})
