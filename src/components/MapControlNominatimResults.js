/**
 * @file
 * @since 3.9
 */

export default function({ noresults }) {
  return {
    functional: true,
    render(h){
      return h('li', {
        class: {
          'nominatim-noresult': true
        },
        directives:[{name: 't', value: noresults}]
      })
    }
  };
};
