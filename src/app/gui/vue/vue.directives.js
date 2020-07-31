import ApplicationState from 'core/applicationstate';
const {t, tPlugin} = require('core/i18n/i18n.service');
const GlobalDirective = {
  install(Vue) {
    const vm = new Vue();
    const prePositioni18n = ({el, binding, i18nFnc=t , update=false}) => {
      const innerHTML = el.innerHTML;
      const position = binding.arg ? binding.arg : 'post';
      const handlerElement = (innerHTML) => {
        const value = binding.value !== null ?  i18nFnc(binding.value) : '';
        if (position === 'pre') el.innerHTML =  `${value} ${innerHTML}`;
        else if (position === 'post') el.innerHTML = `${innerHTML} ${value}`;
      };
      vm.$watch(() => ApplicationState.lng, () => {
          handlerElement(innerHTML);
        }
      );
      handlerElement(innerHTML);
    };

    Vue.directive("disabled", (el, binding) => {
      binding.value ? el.setAttribute('disabled','disabled') : el.removeAttribute('disabled');
    });

    Vue.directive("checked",(el, binding) => {
      binding.value ? el.setAttribute('checked','checked') : el.removeAttribute('checked');
    });

    Vue.directive("selected-first", (el, binding) => {
      binding.value===0 ? el.setAttribute('selected','') : el.removeAttribute('selected');
    });

    Vue.directive('t-tooltip', {
      bind(_el, binding){
        const i18Fnc = binding.arg;
        this.handler = ({el=_el}={}) =>{
          const current_tooltip = el.getAttribute('current-tooltip');
          const value = current_tooltip !== null ? current_tooltip:  binding.value;
          const title = i18Fnc === 'plugin' ? tPlugin(value) : t(value);
          el.setAttribute('data-original-title', title);
        };
        this.handler();
        this.unwatch = vm.$watch(() => ApplicationState.lng, this.handler);
      },
      componentUpdated(el, oldVnode){
        const current_tooltip = el.getAttribute('current-tooltip');
        (current_tooltip != null && current_tooltip !== oldVnode.oldValue) &&
            this.handler({
            el
          });
      },
      unbind(){
        this.unwatch();
      }
    });

    Vue.directive('t-html', {
      bind(el, binding){
        const handlerElement = () => {
          el.innerHTML = `${t(binding.value)}`;
        };
        this.unwatch = vm.$watch(() => ApplicationState.lng, () => {
            handlerElement();
          }
        );
        handlerElement();
      },
      unbind(){
        this.unwatch();
      }
    });

    Vue.directive('t-placeholder', {
      bind(el, binding){
        const value= binding.value;
        const i18Fnc = binding.arg;
        const handler = () =>{
          const placeholder = i18Fnc === 'plugin' ? tPlugin(value) : t(value);
          el.setAttribute('placeholder', placeholder);
        };
        handler();
        this.unwatch = vm.$watch(() => ApplicationState.lng, handler);
      },
      unbind(){
        this.unwatch();
      }
    });
    
    Vue.directive('t-title', {
      bind(el, binding){
        const value= binding.value;
        const i18Fnc = binding.arg;
        const handler = () =>{
          const title = i18Fnc === 'plugin' ? tPlugin(value) : t(value);
          el.setAttribute('title', title);
          el.setAttribute('data-original-title', title)
        };
        handler();
        this.unwatch = vm.$watch(() => ApplicationState.lng, handler);
      },
      unbind(){
        this.unwatch();
      }
    });
    
    Vue.directive("t", {
      bind: function (el, binding) {
        prePositioni18n({
          el,
          binding,
          i18nFnc: t
        })
      }
    });

    Vue.directive("t-plugin", {
      bind: function (el, binding) {
        prePositioni18n({
          el,
          binding,
          i18nFnc: tPlugin,
        })
      }
    });
  }
};

module.exports = GlobalDirective;

