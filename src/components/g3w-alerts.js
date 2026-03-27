/**
 * @file Handle project messages (alerts) + Notification center (ie. mark elements as read/unread)
 * @since 4.0.0
 */

import ApplicationState from 'g3w-state';
import GUI              from 'g3w-app';
import { gettext as _ } from 'g3w-i18n';

/**
 * Custom navbar item: "alerts"
 */
GUI.on('app-ready', function() {
  if (ApplicationState.project.state.messages?.items?.length) {
    initConfig.header_custom_links.unshift({
      id:     'alerts',
      icon:   'far fa-bell',
      title:  'alerts',
      i18n:    true,
      onclick: _showAlertsManager,
    });
    GUI.isReady().then(() => _showAlerts());
  }
});

/**
 * Notification center (ie. mark elements as read/unread)
 */
async function _showAlertsManager() {
  if (document.querySelector('dialog#project-messages')) {
    return;
  }
  const pid      = ApplicationState.project.getId();
  const messages = ApplicationState.project.state.messages;
  const data     = JSON.parse(window.localStorage.getItem('MESSAGES') || '{}');
  const edit_url = ApplicationState.project.getState()?.edit_url || '';
  const dialog   = Object.assign(document.createElement('template'), {
    innerHTML: /* html */`
      <dialog id = "project-messages" popover = "manual">
        <h4 style = "margin: 0; padding: .5em; color: #FFF; position: sticky; top: 0; background-color: #212c31">${_('alerts')}</h4>
        <form method = "dialog">
          <table style = "user-select:none;width:100%;">
            <thead>
              <tr>
                <th><i class = "fa fa-check"></i> ${ _('Marked as read') }</th>
              </tr>
            </thead>
            <tbody>
              ${messages.items.map(message => /* html */`
                <tr>
                  <td>
                    <label style = "display: flex;justify-content: space-between; font-weight:${data[pid].some(id => message.id === id) ? 'normal' : 'bold'};" title = "${ _('Mark as read/unread') }">
                      &bull; ${message.title}
                      <input name = "dont_show_again_${message.id}" type = "checkbox" ${data[pid].some(id => message.id === id) ? 'checked' : ''}>
                    </label>
                  </td>
                  <td style = "width: 20px;" ${edit_url ? '' : 'hidden'}>
                    <a href = "${edit_url.replace('/projects/update/', '/projects/')}messages/update/${message.id}/" target = "_blank" data-i18n-title = "Edit in admin">
                      <i class = "far fa-edit"></i>
                    </a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <menu style = "display: flex; justify-content: end;">
            <button type = "button" value = "close" class = "btn btn-secondary" popovertargetaction = "hide" popovertarget = "project-messages">${messages.items.find(message => !data[pid].some(id => message.id === id)) ? _('show') : _('close')}</button>
          </menu>
        </form>
      </dialog>
    `.trim()
  }).content.firstChild;

  dialog.addEventListener('close', () => {
    dialog.remove();
    _showAlerts();
  });

  _makeDraggable(dialog);

  document.body.appendChild(dialog);
  dialog.showPopover();

  // Handle checkbox click event
  dialog.querySelectorAll('[name^="dont_show_again_"]').forEach(checkbox => checkbox.addEventListener('click', e => {
    const data = JSON.parse(window.localStorage.getItem('MESSAGES') || '{}');
    const id   = +checkbox.name.replace('dont_show_again_', '');
    if (checkbox.checked) {
      data[pid].push(id);
    } else {
      data[pid] = data[pid].filter(d => id !== d);
    }
    window.localStorage.setItem('MESSAGES', JSON.stringify(data));
    dialog.querySelector('menu button[value="close"]').innerHTML =
      Array.from(dialog.querySelectorAll('[name^="dont_show_again_"]')).some(checkbox => !checkbox.checked)
      ? _('show')
      : _('close');
  }));

  dialog.addEventListener('click', e => {
    if (e.target.closest('tbody label')) {
      const label = e.target.closest('tbody label');
      const input = label.querySelector('input');
      label.style.fontWeight = input.checked ? 'normal' : 'bold';
    }
  })
}

/**
 * Show project messages (alerts)
 */
async function _showAlerts() {
  const messages = ApplicationState.project.state.messages;
    
  // no messages to show
  if (!messages) {
    return;
  }

  const pid  = ApplicationState.project.getId();
  const data = JSON.parse(window.localStorage.getItem('MESSAGES') || '{}');
  data[pid]  = data[pid] || [];
  window.localStorage.setItem('MESSAGES', JSON.stringify(data));

  // show message count beside nav icon
  if (!document.querySelector('.nav-alerts a sup')) {
    document.querySelector('.nav-alerts a').insertAdjacentHTML(
      'beforeend',
      /* html */`<sup style = "font-weight: bold;margin-top: -6px;">${ messages.items.length > 10 ? '10+' : messages.items.length }</sup>`
    );
  }

  for (let i = 0; i < messages.items.length; i++) {
    const message = messages.items[i];

    // skip already shown messages (ref: "Do Not Show Again" checkbox)
    if (data[pid].some(id => id === message.id)) {
      continue;
    }

    const dialog = Object.assign(document.createElement('template'), {
      innerHTML: /* html */`
        <dialog id = "project-message" popover = "manual">
          <h4 style = "margin: 0; padding: .5em; color: #FFF; position: sticky; top: 0; background-color: ${({ Info: '#0073b7', Warning: '#e99611', Error: '#605ca8', Critical: '#605ca8', })[Object.entries(messages.levels).find(([key, value]) => value === message.level)[0]]};">${message.title}</h4>
          <form method = "dialog">
            ${message.body}
            <menu style = "display: flex;justify-content: space-between;">
              <label style = "display: block; width: fit-content;">
                <input type = "checkbox" name = "dont_show_again" /> ${_('Don’t show again')}
              </label>
              <button type = "button" value = "close" class = "btn btn-secondary" autofocus popovertargetaction = "hide" popovertarget = "project-message">${_('close')}</button>
            </menu>
          </form>
        </dialog>
      `.trim()
    }).content.firstChild;

    // wait for modal close
    const { promise, resolve } = Promise.withResolvers();
    dialog.addEventListener('close', async e => {
      // update locale storage if "Do Not Show Again" checkbox is checked 
      try {
        if (dialog.querySelector('input[name="dont_show_again"]').checked) {
          const data = JSON.parse(window.localStorage.getItem('MESSAGES') || '{}');
          data[pid].push(message.id);
          window.localStorage.setItem('MESSAGES', JSON.stringify(data));
        }
      } catch(e) {
        console.warn(e);
      }
      dialog.remove();
      resolve();
    });

    _makeDraggable(dialog);

    document.body.appendChild(dialog);
    dialog.showPopover();
    await promise;
  }

  // count unread messages and update the notification count
  const unread_messages = messages.items.filter(message => !data[pid].includes(message.id));
  if (unread_messages.length) {
    document.querySelector('.nav-alerts a sup').innerHTML = unread_messages.length > 10 ? '10+' : unread_messages.length;
  } else {
    document.querySelector('.nav-alerts a sup').innerHTML = '';
  }
}

/**
 * Make draggle a `<dialog>` element
 */
function _makeDraggable(dialog) {

  dialog.style.maxWidth  = '90vw';
  dialog.style.maxHeight = '90vh';
  dialog.style.resize    = "both";

  dialog.addEventListener('toggle', async e => {
    if (e.newState === "closed") {
      dialog.dispatchEvent(new Event('close'));
    }
  });

  // close popover on ESC
  document.addEventListener('keydown', function onEscape(e) {
    if (e.key === 'Escape') {
      dialog?.hidePopover?.();
      document.removeEventListener('keydown', onEscape);
    }
  });

  // draggable element
  dialog.addEventListener('mousedown', e => {
    const rect          = dialog.getBoundingClientRect();
    const is_backdrop = (
      e.clientY < rect.top - 20 ||
      e.clientY > rect.top + rect.height ||
      e.clientX < rect.left ||
      e.clientX > rect.left + rect.width - 20
    );
    const is_interactive = ['label', 'button', 'select', 'input', 'textarea', 'x-select'].some(i => e.target.closest(i));
    if (is_backdrop || is_interactive) {
      return;
    }
    e.preventDefault();
    const mousemove = ({ clientX, clientY }) => {
      Object.assign(dialog.style, {
        margin: 0,
        left:   `${clientX - e.clientX + rect.left}px`,
        top:    `${clientY - e.clientY + rect.top}px`,
      })
    };
    const mouseup = () => {
      document.removeEventListener('mousemove', mousemove);
      document.removeEventListener('mouseup', mouseup);
    };
    document.addEventListener('mousemove', mousemove);
    document.addEventListener('mouseup', mouseup);
  });

  dialog.addEventListener('mousemove', e => {
    const rect          = dialog.getBoundingClientRect();
    const is_backdrop   = (
      e.clientY < rect.top ||
      e.clientY > rect.top + rect.height ||
      e.clientX < rect.left ||
      e.clientX > rect.left + rect.width
    );
    dialog.style.cursor = is_backdrop ? null : 'move';
  });
}