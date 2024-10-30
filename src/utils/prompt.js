import GUI                from 'services/gui';
import { getUniqueDomId } from 'utils/getUniqueDomId';

/**
 * @TODO make it simpler (native HTML dialogs, Vue SFC components, ..)
 * 
 * Similar to `window.prompt`
 * 
 * @since 3.9.0
 */
export async function prompt({
  value,
  label,
  callback,
}) {

  // Reactive vue object (input instance)
  let data = {
    value,
    id:   getUniqueDomId()
  };

  let vueInput = new Vue({
    template:`
      <div>
        <label :for="id">${ label }</label>
        <input
          v-model      = "value"
          :id          = "id"
          class        = "bootbox-input bootbox-input-text form-control"
          autocomplete = "off"
          type         = "text"
        >
      </div>`,
    data() {
      return data;
    },
  });

  let prompt; // store dialog modal window

  (
    new Promise((resolve, reject) => {
      // modal window with input name
      prompt = GUI.showModalDialog({
        message:     vueInput.$mount().$el,
        closeButton: false,
        buttons: {
          ok:     { label: 'Ok',     className: 'btn-success', callback: () => resolve(data.value) },
          cancel: { label: 'Cancel', className: 'btn-danger',  callback: () => reject()  },
        },
      });
      // conditionally disable confirm button (based on input value)
      const okBtn = prompt.find('button.btn-success');
      okBtn.prop('disabled', 0 === data.value.trim().length);
      vueInput.$watch('value', value => { okBtn.prop('disabled', 0 === value.trim().length) });
    })
  )
    .then(callback)
    .catch(e => console.warn(e))
    .finally(() => {
      vueInput.$destroy();
      vueInput = null;
      data     = null;
      prompt   = null;
    })
}