import ApplicationState from 'core/applicationstate';
const {t, tPlugin} = require('core/i18n/i18n.service');
const { uniqueId, toRawType } = require('core/utils/utils');
const GlobalDirective = {
  install(Vue) {
    const vm = new Vue();
    const directives = {};
    const createDirectiveObj = ({el, attr}) =>{
      //create unique id
      const unique_attr_id = uniqueId();
      // set new attribute
      el.setAttribute(attr, unique_attr_id);
      directives[unique_attr_id] = {};
      return unique_attr_id;
    };
    const setUnwatch = ({id, unwatch})=>{
      directives[id].unwatch = unwatch;
    };
    const unbindWatch = ({attr, el})=>{
      const unique_attr_id = el.getAttribute(attr);
      if (unique_attr_id) {
        directives[unique_attr_id].unwatch();
        delete directives[unique_attr_id];
      }
    };
    const runHandlerOnUpdate = ({el, attrId, attr, oldValue})=>{
      const unique_attr_id =  el.getAttribute(attrId);
      const attr_value = el.getAttribute(attr);
      (attr_value != null && attr_value !== oldValue) && directives[unique_attr_id].handler({el});
    };
    const prePositioni18n = ({el, binding, i18nFnc=t}) => {
      const innerHTML = el.innerHTML;
      const position = binding.arg ? binding.arg : 'post';
      const handlerElement = (innerHTML) => {
        const value = binding.value !== null ?  i18nFnc(binding.value) : '';
        if (position === 'pre') el.innerHTML =  `${value} ${innerHTML}`;
        else if (position === 'post') el.innerHTML = `${innerHTML} ${value}`;
      };
      handlerElement(innerHTML);
      return vm.$watch(() => ApplicationState.lng, () => handlerElement(innerHTML));
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
      bind(_el, binding) {
        binding.modifiers.create && $(_el).tooltip();
        const unique_v_t_tooltip_attr = createDirectiveObj({
          el:_el,
          attr: 'g3w-v-t-tooltip-id'
        });
        const i18Fnc = binding.arg;
        directives[unique_v_t_tooltip_attr].modifiers = binding.modifiers;
        const handler = ({el=_el}={}) =>{
          const current_tooltip = el.getAttribute('current-tooltip');
          const unique_v_t_tooltip_attr =  el.getAttribute('g3w-v-t-tooltip-id');
          const value = current_tooltip !== null ? current_tooltip:  binding.value;
          const title = directives[unique_v_t_tooltip_attr].modifiers.text  ? value : (i18Fnc === 'plugin') ? tPlugin(value) : t(value);
          el.setAttribute('data-original-title', title);
        };
        handler();
        directives[unique_v_t_tooltip_attr].handler = handler;
        setUnwatch({
          id:unique_v_t_tooltip_attr,
          unwatch: vm.$watch(() => ApplicationState.lng, handler)
        })
      },
      componentUpdated(el, oldVnode){
        runHandlerOnUpdate({
          el,
          attrId: 'g3w-v-t-tooltip-id',
          attr:'current-tooltip',
          oldValue: oldVnode.oldValue
        });
      },
      unbind(el){
        $(el).tooltip('hide');
        unbindWatch({
          attr:'g3w-v-t-tooltip-id',
          el
        })
      }
    });

    Vue.directive('t-html', {
      bind(el, binding){
        const unique_v_t_html_attr = createDirectiveObj({
          el,
          attr: 'g3w-v-t-html-id'
        });
        const handlerElement = () => {
          el.innerHTML = `${t(binding.value)}`;
        };
        handlerElement();
        setUnwatch({
          id: unique_v_t_html_attr,
          unwatch: vm.$watch(() => ApplicationState.lng, handlerElement)
        });
      },
      unbind(el){
        unbindWatch({
          attr:'g3w-v-t-html-id',
          el
        })
      }
    });

    Vue.directive('t-placeholder', {
      bind(el, binding){
        const unique_v_t_placeholder_attr = createDirectiveObj({
          el,
          attr: 'g3w-v-t-placeholder-id'
        });
        const value= binding.value;
        const i18Fnc = binding.arg;
        const handler = () =>{
          const placeholder = i18Fnc === 'plugin' ? tPlugin(value) : t(value);
          el.setAttribute('placeholder', placeholder);
        };
        handler();
        setUnwatch({
          id:unique_v_t_placeholder_attr,
          unwatch: vm.$watch(() => ApplicationState.lng, handler)
        });
      },
      unbind(el){
        unbindWatch({
          attr:'g3w-v-t-placeholder-id',
          el
        })
      }
    });
    
    Vue.directive('t-title', {
      bind(el, binding){
        // get unique id
        const unique_v_t_title_attr = createDirectiveObj({
          el,
          attr: 'g3w-v-t-title-id'
        });
        const value= binding.value;
        const i18Fnc = binding.arg;
        const handler = () =>{
          const title = i18Fnc === 'plugin' ? tPlugin(value) : t(value);
          el.setAttribute('title', title);
          el.setAttribute('data-original-title', title)
        };
        handler();
        setUnwatch({
          id: unique_v_t_title_attr,
          unwatch: vm.$watch(() => ApplicationState.lng, handler)
        });
      },
      unbind(el){
        unbindWatch({
          attr:'g3w-v-t-title-id',
          el
        })
      }
    });
    
    Vue.directive("t", {
      bind: function (el, binding) {
        const unique_v_t_attr = createDirectiveObj({
          el,
          attr: 'g3w-v-t-id'
        });
        setUnwatch({
          id: unique_v_t_attr,
          unwatch: prePositioni18n({
            el,
            binding,
            i18nFnc: t
          })
        })
      },
      unbind(el){
        unbindWatch({
          el,
          attr:'g3w-v-t-id'
        })
      }
    });

    Vue.directive("t-plugin", {
      bind: function (el, binding) {
        const unique_v_t_plugin_attr = createDirectiveObj({
          el,
          attr: 'g3w-v-t-plugin-id'
        });
        setUnwatch({
          id: unique_v_t_plugin_attr,
          unwatch: prePositioni18n({
            el,
            binding,
            i18nFnc: tPlugin,
          })
        })
      },
      unbind(el){
        unbindWatch({
          el,
          attr: 'g3w-v-t-plugin-id'
        })
      }
    });

    Vue.directive("plugins", {
      bind(el) {
        const showHideHandler = plugins =>{
          el.classList.toggle('g3w-hide', plugins.length === 0)
        };
        showHideHandler(ApplicationState.plugins);
        const unique_v_plugins_notify_attr = createDirectiveObj({
          el,
          attr: 'g3w-v-plugins-id'
        });
        setUnwatch({
          id: unique_v_plugins_notify_attr,
          unwatch: vm.$watch(() => ApplicationState.plugins, showHideHandler)
        })
      },
      unbind(el){
        unbindWatch({
          el,
          attr: 'g3w-v-plugins-id'
        })
      }
    });

    Vue.directive("online", {
      bind(el, binding) {
        // show if online
        const showOnline = binding.arg && binding.arg === 'hide' ? false : true;
        const showHideHandler = bool =>{
          bool = showOnline ?  bool : !bool;
          el.classList.toggle('g3w-hide', !bool)
        };
        showHideHandler(ApplicationState.online);
        const unique_v_online_notify_attr = createDirectiveObj({
          el,
          attr: 'g3w-v-offline-id'
        });
        setUnwatch({
          id: unique_v_online_notify_attr,
          unwatch: vm.$watch(() => ApplicationState.online, showHideHandler)
        })
      },
      unbind(){
        unbindWatch({
          el,
          attr: 'g3w-v-offline-id'
        })
      }
    });

    Vue.directive("download", {
      bind(el, binding) {
        const className = binding.modifiers && binding.modifiers.show && 'hide' || 'disabled';
        const listen = toRawType(binding.value) === 'Boolean' ? binding.value : true;
        const downloadHandler = bool => {
          el.classList.toggle(`g3w-${className}`, className === 'hide' ? !bool: bool)
        };
        if (listen) {
          const unique_v_download_attr = createDirectiveObj({
            el,
            attr: 'g3w-v-download-id'
          });
          downloadHandler(listen && ApplicationState.download);
          setUnwatch({
            id: unique_v_download_attr,
            unwatch: vm.$watch(() => ApplicationState.download, downloadHandler)
          })
        }
      },
      unbind(el){
        unbindWatch({
          el,
          attr: 'g3w-v-download-id'
        })
      }
    });

    Vue.directive('select2', {
      inserted(el, binding, vnode){
        vnode.context._select2 = $(el).select2({
          dropdownCssClass: 'skin-color'
        });
        binding.value && vnode.context._select2.on('select2:select', (evt)=>{
          vnode.context[binding.value] = evt.params.data.id;
        });
      },
      unbind(ele, binding, vnode){
        vnode.context._select2.select2('destroy');
      }
    })
  }
};

module.exports = GlobalDirective;

