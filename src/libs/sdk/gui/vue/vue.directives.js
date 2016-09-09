var t = require('core/i18n/i18n.service').t;

Vue.directive("disabled",function(value){
    if (value){
      this.el.setAttribute('disabled','disabled');
    }
    else {
      this.el.removeAttribute('disabled');
    }
  }
);

Vue.directive("checked",function(value){
    if (value){
      this.el.setAttribute('checked','checked');
    }
    else {
      this.el.removeAttribute('checked');
    }
  }
);

Vue.directive("selected-first",function(value){
    if (value==0){
      this.el.setAttribute('selected','');
    }
    else {
      this.el.removeAttribute('selected');
    }
  }
);

Vue.directive("t",function(text){
  return t(text);
})
