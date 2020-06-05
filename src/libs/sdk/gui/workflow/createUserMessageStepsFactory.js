const GUI = require('gui/gui');
module.exports = function({steps={}}={}) {
  return {
    data() {
      return {
        steps,
        currentStep: 0
      }
    },
    watch: {
      steps: {
        handler(steps) {
          Object.values(steps).find((step, index)=>{
            if (!step.done) {
              this.currentStep = index;
              return true;
            }
          })
        },
        deep: true
      }
    },
    render(h) {
      return h('ul', {
        style: {
          alignSelf: 'flex-start',
          listStyle: 'none',
          padding: '10px !important'
        }
      }, Object.values(this.steps).map((step, index) => {
        const state = {
          current: !step.done && index === this.currentStep,
          done: step.done,
          todo: !step.done && index !== this.currentStep,
        };
        return h('li',
          {
            style: {
              fontWeight: !step.done && index === this.currentStep && 'bold' || null,
              marginBottom: '5px',
              color: step.done && "green"
            }
          },
          [h('i', {
            style: {
              marginRight: '5px',
            },
            class: {
              [GUI.getFontClass('arrow-right')]: state.current,
              [GUI.getFontClass('empty-circle')]: state.todo,
              [GUI.getFontClass('success')]: state.done,
            }
          }), h('span', {
            directives:[
              {
                name: step.directive,
                value: step.description
              }
            ]
          })])
      }))
    }
  };
};
