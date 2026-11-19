const assert = require('node:assert/strict');
const { Before, Then } = require('@cucumber/cucumber');

Before({ tags: '@notification-workflows' }, async function () {
  await this.corePage.evaluate(async () => {
    g3w.gettext.register('en', (await import('/static/client/locales/en.js')).default);
    initConfig.header_custom_links = [];
    document.querySelector('#fixture').innerHTML = '<nav class="nav-alerts"><a>Alerts</a></nav>';
    g3w.app.isReady = async () => true;
    g3w.state.project.state.edit_url = '/projects/update/1/';
    window.startProjectMessages = async count => {
      g3w.state.project.state.messages = {
        levels: { Info: 0, Warning: 1, Error: 2, Critical: 3 },
        items: Array.from({ length: count }, (_, index) => ({
          id: index + 1, title: `Message ${index + 1}`, body: `<p>Notice ${index + 1}</p>`, level: index % 4,
        })),
      };
      g3w.app.emit('app-ready');
      await coreTestExports.waitFor(() => document.querySelector('#project-message')?.matches(':popover-open'), 1000);
    };
    window.closeProjectMessage = async (id, read = false) => {
      const dialog = document.querySelector('#project-message');
      dialog.querySelector('[name="dont_show_again"]').checked = read;
      dialog.querySelector('button').click();
      await coreTestExports.waitFor(() => !document.body.contains(dialog), 1000);
      if (id) await coreTestExports.waitFor(() => document.querySelector('#project-message h4')?.textContent === `Message ${id}`, 1000);
    };
  });
});

Then('project messages and their manager preserve read and unread preferences', async function () {
  const result = await this.corePage.evaluate(async () => {
    await startProjectMessages(2);
    await closeProjectMessage(2, true);
    await closeProjectMessage(null);
    const stored = JSON.parse(localStorage.getItem('MESSAGES')).project;
    const link = initConfig.header_custom_links.find(link => link.id === 'alerts');
    await link.onclick();
    await link.onclick();
    const manager = document.querySelector('#project-messages');
    const boxes = manager.querySelectorAll('input[type="checkbox"]');
    const initial = Array.from(boxes, checkbox => checkbox.checked);
    const admin = manager.querySelector('a').getAttribute('href');
    boxes[1].click();
    boxes[0].click();
    const unread = {
      stored: JSON.parse(localStorage.getItem('MESSAGES')).project,
      weight: boxes[0].closest('label').style.fontWeight,
    };
    boxes[0].click();
    const closeLabel = manager.querySelector('button').textContent;
    const unique = document.querySelectorAll('#project-messages').length;
    manager.querySelector('button').click();
    await coreTestExports.waitFor(() => !document.querySelector('#project-messages') && document.querySelector('.nav-alerts sup').textContent === '', 1000);
    return {
      stored, initial, admin, unread, closeLabel, unique,
      final: JSON.parse(localStorage.getItem('MESSAGES')).project,
      remaining: document.querySelectorAll('#project-message, #project-messages').length,
    };
  });
  assert.deepEqual(result, {
    stored: [1], initial: [true, false], admin: '/projects/1/messages/update/1/',
    unread: { stored: [2], weight: 'bold' }, closeLabel: 'Close', unique: 1, final: [2, 1], remaining: 0,
  });
});

Then('project message dragging respects interactive controls and Escape closes the dialog', async function () {
  const result = await this.corePage.evaluate(async () => {
    await startProjectMessages(1);
    const dialog = document.querySelector('#project-message');
    const rect = dialog.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + 10;
    dialog.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
    const cursor = dialog.style.cursor;
    dialog.querySelector('h4').dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('mousemove', { clientX: x + 20, clientY: y + 30, bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    const dragged = [parseFloat(dialog.style.left), parseFloat(dialog.style.top)];
    document.body.dispatchEvent(new MouseEvent('mousemove', { clientX: x + 80, clientY: y + 90, bubbles: true }));
    const released = [parseFloat(dialog.style.left), parseFloat(dialog.style.top)];
    dialog.querySelector('input').dispatchEvent(new MouseEvent('mousedown', { clientX: x + 20, clientY: y + 30, bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('mousemove', { clientX: x + 100, clientY: y + 100, bubbles: true }));
    const interactive = [parseFloat(dialog.style.left), parseFloat(dialog.style.top)];
    document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await coreTestExports.waitFor(() => !document.querySelector('#project-message'), 1000);
    return { cursor, offset: [dragged[0] - rect.left, dragged[1] - rect.top], released, interactive, dragged };
  });
  assert.equal(result.cursor, 'move');
  assert.ok(Math.abs(result.offset[0] - 20) < 0.001);
  assert.ok(Math.abs(result.offset[1] - 30) < 0.001);
  assert.deepEqual(result.released, result.dragged);
  assert.deepEqual(result.interactive, result.dragged);
});

Then('eleven unread project messages keep a capped badge after dismissal', async function () {
  const result = await this.corePage.evaluate(async () => {
    await startProjectMessages(11);
    const initial = document.querySelector('.nav-alerts sup').textContent;
    for (let id = 1; id <= 11; id++) await closeProjectMessage(id < 11 ? id + 1 : null);
    await coreTestExports.waitFor(() => document.querySelector('.nav-alerts sup').textContent === '10+', 1000);
    return {
      initial, final: document.querySelector('.nav-alerts sup').textContent,
      read: JSON.parse(localStorage.getItem('MESSAGES')).project,
      dialogs: document.querySelectorAll('#project-message').length,
      links: initConfig.header_custom_links.filter(link => link.id === 'alerts').length,
    };
  });
  assert.deepEqual(result, { initial: '10+', final: '10+', read: [], dialogs: 0, links: 1 });
});
