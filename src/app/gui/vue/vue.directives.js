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

    Vue.directive("disabled",function(el, binding){
        if (binding.value){
          el.setAttribute('disabled','disabled');
        } else {
          el.removeAttribute('disabled');
        }
      }
    );

    Vue.directive("checked",function(el, binding){
        if (binding.value){
          el.setAttribute('checked','checked');
        } else {
          el.removeAttribute('checked');
        }
      }
    );

    Vue.directive("selected-first",function(el, binding){
        if (binding.value===0) {
          el.setAttribute('selected','');
        } else {
          el.removeAttribute('selected');
        }
      }
    );

    Vue.directive('t-tooltip', {
      bind(el, binding){
        const value= binding.value;
        const i18Fnc = binding.arg;
        const handler = () =>{
          const title = i18Fnc === 'plugin' ? tPlugin(value) : t(value);
          el.setAttribute('data-original-title', title)
        };
        handler();
        vm.$watch(() => ApplicationState.lng, handler);
      }
    });

    Vue.directive('t-html', {
      bind(el, binding){
        const handlerElement = () => {
          el.innerHTML = `${t(binding.value)}`;
        };
        vm.$watch(() => ApplicationState.lng, () => {
            handlerElement();
          }
        );
        handlerElement();
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
        vm.$watch(() => ApplicationState.lng, handler);
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
        vm.$watch(() => ApplicationState.lng, handler);
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

