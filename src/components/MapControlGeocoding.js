/**
 * @file
 * @since v3.8
 */

export default function({containerClass, cssClasses, fontIcon, placeholder, ctx}) {
  return {
    functional: true,
    render(h){
      return h('div', {class: {[containerClass]: true}}, [
        h('div', {
          class: {
            [cssClasses.inputText.control]: true,
          }
        }, [
          h('input', {
            attrs: {
              type: 'text',
              id: cssClasses.inputQueryId,
              autocomplete: 'off'
            },
            class:{
              [cssClasses.inputText.input]: true
            },
            directives:[
              {
                name: 't-placeholder',
                value: placeholder
              }
            ]
          }),
          h('button', {
            attrs: {
              type: 'button',
              id: 'search_nominatim'
            },
            class:{
              btn: true
            },
            on: {
              click() {
                ctx.query($(`input.${cssClasses.inputText.input}`).val());
              }
            }
          }, [h('i', {
            attrs: {
              'aria-hidden': true
            },
            style: {
              color:'#ffffff'
            },
            class: {
              [fontIcon]: true
            }
          })]),
          h('button', {
            attrs: {
              type: 'button',
              id:  cssClasses.inputResetId
            },
            class: {
              [`${cssClasses.inputText.reset}  ${cssClasses.hidden}`]: true
            }
          }),
        ]),
        h('ul', {
          class: {
            [cssClasses.inputText.result]: true
          }
        })])
    }
  };
};
