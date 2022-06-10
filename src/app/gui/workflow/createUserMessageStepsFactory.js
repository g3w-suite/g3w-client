import ApplicationState from 'core/applicationstate';
import GUI  from 'gui/gui';
export default  function({steps={}}={}) {
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
        deep: false
      }
    },
    render(h) {
      return h('ul', {
        style: {
          alignSelf: 'flex-start',
          listStyle: 'none',
          padding: `${ApplicationState.ismobile ? 5 : 10}px !important`,
          marginBottom: 0
        }
      }, Object.values(this.steps).map((step, index) => {
        const state = {
          current: !step.done && index === this.currentStep,
          done: step.done,
          todo: !step.done && index !== this.currentStep
        };
        return h('li',
          {
            style: {
              fontWeight: (step.done || !step.done && index === this.currentStep) && 'bold' || null,
              marginBottom: '5px',
              color: step.done && "green",
              display: step.buttonnext && 'inline-flex'
            }
          },
          [
            h('i', {
              style: {
                marginRight: '5px',
                fontWeight: step.done && 'bold'
              },
              class: {
                [GUI.getFontClass('arrow-right')]: state.current,
                [GUI.getFontClass('empty-circle')]: state.todo,
                [GUI.getFontClass('success')]: state.done,
              }
            }),
            h('span', {
              directives:[
                {
                  name: step.directive,
                  value: step.description
                }
              ],
              style: {
                display: step.buttonnext ? 'inline-flex': 'inline',
                flexDirection: step.buttonnext && 'row-reverse'
              }
            }),
            step.dynamic !== undefined && h('span', {
              style: {
                alignSelf: 'center',
                padding: '3px',
              }
            }, step.dynamic),
            step.buttonnext && h('button', {
              on: {
                click() {
                  step.done = true;
                  step.buttonnext.done();
                }
              },
              directives: [{
                name: 't',
                value: 'sdk.workflow.next'
              }],
              style: {
                fontWeight: 'bold'
              },
              class: {
                btn: true,
                'btn-success': true,
                'g3w-disabled': step.buttonnext.disabled
              }
            })
          ])
      }))
    }
  };
};
