/**
 * @file
 * @since 3.9.0
 */

export default function ({ className, customClass, tipLabel, label }) {
  return {
    functional: true,
    render(h) {
      return h('div', {
        class: {
          [className]:       !!className,
          'ol-unselectable': true,
          'ol-control':      true
        }
      }, [
        h('button', {
          attrs: {
            type: 'button',
          },
          directives: [{
            name: 't-tooltip',
            value: tipLabel
          }]
        }, [
          label,
          h('i', {
            class: {
              [customClass]: !!customClass
            }
          })
        ])
      ]
      )
    }
  };
};
