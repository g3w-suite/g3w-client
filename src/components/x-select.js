/**
 * @file inspired by "select2" (v4.0.4)
 */

/**
 * Custom HTMLElement `<x-option>`
 * 
 * @since 4.1.0
 */
class XOption extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'option');
    this.setAttribute('tabindex', '-1');
    this.setAttribute('aria-selected', 'false');
  }
}

/**
 * Custom HTMLElement `<x-select>`
 * 
 * @since 4.1.0
 */
class XSelect extends HTMLElement {

  constructor() {
    super();
    this.selected_values = [];
    this.activeOption = null;
  }

  get isOpen() {
    return this.container && this.container.matches(":popover-open");
  }

  get value() {
    return this.getAttribute('value') || '';
  }

  set value(val) {
    if (this.value === val) {
      return;
    }
    this.setAttribute('value', val);
    this.select(this.#getOption(val), { autoclose: false, emit: false });
  }

  #getOptions() {
    return Array.from(this.querySelectorAll('x-option'));
  }

  #getOption(val) {
    return this.#getOptions().find(o => (o.getAttribute('value') ?? o.textContent.trim()) === val)
  }

  static observedAttributes = ['disabled']

  attributeChangedCallback(attr) {
    // make reactive: "disabled" attribute
    if ('disabled' === attr) {
      this.#onDisabled()
    }
  }

  connectedCallback() {

    Promise.resolve().then(() => {

      this.insertAdjacentHTML('afterbegin', /* html */`
        <div class="x-select-trigger" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox">
          <div class="x-selected-content"></div>
          <i class="triangle"></i>
        </div>
        <div class="x-options-container" popover="manual" role="listbox" ${ this.hasAttribute('multiple') ? 'aria-multiselectable="true"' : '' }>
          ${ this.hasAttribute('searchable') || this.hasAttribute('multiple') ? '<div class="x-search-box"><input type="text" placeholder="Search..."></div>' : '' }
          <div class="x-options-list"></div>
        </div>
      `);

      this.trigger   = this.querySelector('.x-select-trigger');
      this.content   = this.querySelector('.x-selected-content');
      this.container = this.querySelector('.x-options-container');
      this.list      = this.querySelector('.x-options-list');
      this.input     = this.querySelector('.x-search-box input');

      Array.from(this.querySelectorAll(':scope > x-option')).forEach(opt => {
        this.list.appendChild(opt);
        opt.onclick = (e) => { e.stopPropagation(); this.select(opt); };
      });

      this.container.onkeydown = (e) => this.#onContainerKeydown(e);
      this.container.addEventListener('beforetoggle', e => this.#onContainerToggle(e));

      if (this.input) {
        this.input.oninput   = (e) => this.#onSearchInput(e);
        this.input.onchange  = (e) => { e.stopPropagation(); }; // suppress 'change' event on parent `<x-select>`
        this.input.onkeydown = (e) => this.#onSearchKeydown(e);
      }

      this.trigger.onclick   = (e) => { e.stopPropagation(); if (!this.isDisabled) this.toggle(); };
      this.trigger.onkeydown = (e) => { if (!this.isDisabled) this.#onTriggerKeydown(e); };

      // make reactive: "<x-option>" elements
      (new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          // proxy original node (dynamically added by vue)
          mutation.addedNodes.forEach(opt => {
            if (opt._xselect_proxy || opt.tagName !== 'X-OPTION') {
              return;
            }
            const proxy = opt.cloneNode(true);
            opt._xselect_proxy = proxy;
            opt.style.display = 'none';
            // copy attributes from original node
            (new MutationObserver(() => {
              proxy.innerHTML = opt.innerHTML;
              Array.from(opt.attributes).forEach(attr => proxy.setAttribute(attr.name, attr.value));
            })).observe(opt, { childList: true, attributes: true, characterData: true, subtree: true });

            proxy.style.display = null;
            // delegate click event
            proxy.onclick = (e) => { e.stopPropagation(); this.select(opt); };
            this.list.appendChild(proxy);
          });
          // remove proxied node (dynamically removed by vue)
          mutation.removedNodes.forEach(opt => {
            if (opt._xselect_proxy) {
              opt._xselect_proxy.remove();
              opt._xselect_proxy = null;
            }
          });
        });
      })).observe(this, { childList: true });

      document.addEventListener('pointerup', this.#onClickOutside.bind(this));
      window.addEventListener('scroll', () => { if(this.isOpen) this.#updatePosition(); }, true);
      window.addEventListener('resize', () => { if(this.isOpen) this.#updatePosition(); });

      if (this.getAttribute('value')) {                       // inital value (from <x-select value="some value">)
        this.select(this.#getOption(this.getAttribute('value')), { autoclose: false, emit: false });
      } else if (this.container.querySelector('x-option[selected]')) {  // inital value (from <x-option selected>)
        this.select(this.container.querySelector('x-option[selected]'));
      } else {                                                // initial value (from first available <x-option>)
        const opt = Array.from(this.container.querySelectorAll('x-option')).find(opt => !opt.hasAttribute('disabled')) 
        if (opt) this.select(opt);
        else this.render();
      }
    });
  }

  #onClickOutside(e) {
    if (!this.contains(e.target)) {
      this.close();
    }
  }

  #onDisabled() {
    this.isDisabled                  = this.hasAttribute('disabled');
    this.trigger.style.opacity       = this.isDisabled ? '0.5' : '1';
    this.trigger.style.cursor        = this.isDisabled ? 'not-allowed' : 'pointer';
    this.trigger.style.pointerEvents = this.isDisabled ? 'none' : 'auto';
  }

  #search(query) {
    const term    = query.toLowerCase();
    this.container.querySelectorAll('x-option').forEach(opt => { opt.toggleAttribute('hidden', !opt.textContent.toLowerCase().includes(term)); });
  }

  #onSearchKeydown(e) {
    const currentValue = this.input.value.trim();

    if (e.key === 'Enter' && currentValue && (this.hasAttribute('createTag') || this.getAttribute('createTag') === 'true')) {
      e.preventDefault();

      // create a new (dynamic) option
      if (!this.#getOption(currentValue)) {
        const opt = document.createElement('x-option');
        opt.setAttribute('value', currentValue);
        opt.textContent = currentValue;
        opt.onclick = (e) => { e.stopPropagation(); this.select(opt); };
        this.list.appendChild(opt);
      }

      // select the option
      this.select(this.#getOption(currentValue));
    }
  }

  #onSearchInput(e) {
    const value = e.target.value;
    this.#search(value);
    // open dropdown
    if (!this.isOpen) {
      this.open();
    }
    // emit custom "search-input" event (eg. for AJAX search)
    this.dispatchEvent(new CustomEvent('search-input', { 
      detail: { value },
      bubbles: true,
      composed: true
    }));
  }

  #onTriggerKeydown(e) {
    switch (e.key) {
      case 'Enter':
      case ' ':         e.preventDefault(); this.toggle();                                       break;
      case 'ArrowDown': e.preventDefault(); if (!this.isOpen) this.open(); this.#focus('first'); break;
      case 'ArrowUp':   e.preventDefault(); if (!this.isOpen) this.open(); this.#focus('last');  break;
      case 'Escape':    if (this.isOpen) { e.preventDefault(); this.close(); }                   break;
    }
  }

  #onContainerKeydown(e) {
    const options = Array.from(this.container.querySelectorAll('x-option:not([hidden])'));
    if (0 === options.length) {
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this.#focus(1);                     break;
      case 'ArrowUp':   e.preventDefault(); this.#focus(-1);                    break;
      case 'Enter':     e.preventDefault(); this.select(this.activeOption);     break;
      case 'Escape':    e.preventDefault(); this.close(); this.trigger.focus(); break;
      case 'Tab':       this.close();                                           break; // Allow tab to move out
    }
  }

  #onContainerToggle(e) {
    const isOpen = 'open' === e.newState;
    this.trigger.setAttribute('aria-expanded', isOpen);
    this.trigger.classList.toggle('open', isOpen);
    if (isOpen) {
      this.#updatePosition(); 
      if (this.input) {
        this.input.value = '';                    // reset search box
        this.#search('');
        setTimeout(() => this.input.focus(), 50); // auto focus
      } else {
        this.#focus('first');
      }
    } else {
      this.trigger.removeAttribute('aria-activedescendant');
      if (this.activeOption) {
        this.activeOption.setAttribute('aria-selected', this.activeOption.hasAttribute('selected') ? 'true' : 'false');
        this.activeOption = null;
      }
    }
  }

  #focus(direction) {
    const options = Array.from(this.container.querySelectorAll('x-option:not([hidden])'));

    if ('first' === direction) {
      if (options.length > 0) {
        this.#setActiveOption(options.at(0));
      }
      return; 
    }

    if ('last' === direction) {
      if (options.length > 0) {
        this.#setActiveOption(options.at(-1));
      }
      return;
    }

    if (!this.activeOption) {
      this.#setActiveOption(options.at(0));
      return;
    }

    const currentIndex = options.indexOf(this.activeOption);
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = options.length - 1;
    if (newIndex >= options.length) newIndex = 0;
    this.#setActiveOption(options.at(newIndex));
  }

  #setActiveOption(option) {
    if (this.activeOption) {
      this.activeOption.setAttribute('aria-selected', this.activeOption.hasAttribute('selected') ? 'true' : 'false');
    }
    this.activeOption = option;
    this.trigger.setAttribute('aria-activedescendant', option.id || (option.id = 'option-' + Math.random().toString(36).substr(2, 9)));
    option.setAttribute('aria-selected', 'true');
    option.focus();
  }

  #updatePosition() {
    const rect = this.trigger.getBoundingClientRect();
    this.container.style.top = `${rect.bottom + 2}px`;
    this.container.style.left = `${rect.left}px`;
    this.container.style.setProperty('--select-width', `${rect.width}px`);
  }

  select(opt, settings = { autoclose: false, emit: true }) {

    if (!opt) {
      return;
    }

    const val = opt.getAttribute('value') ?? opt.textContent.trim();

    // single-select
    if (!this.hasAttribute('multiple')) {
      this.container.querySelectorAll('x-option').forEach(o => { o.removeAttribute('selected'); o.setAttribute('aria-selected', 'false'); });
      this.selected_values = [{ value: val, html: opt.innerHTML }];
      opt.setAttribute('selected', '');
      opt.setAttribute('aria-selected', 'true');
    }

    // multi-select
    if (this.hasAttribute('multiple')) {
      if (opt.hasAttribute('selected')) {
        opt.removeAttribute('selected');
        opt.setAttribute('aria-selected', 'false');
        this.selected_values = this.selected_values.filter(v => v.value !== val);
      } else {
        opt.setAttribute('selected', '');
        opt.setAttribute('aria-selected', 'true');
        this.selected_values.push({ value: val, html: opt.innerHTML });
      }
    }

    this.render();

    if (true == settings.autoclose || !this.hasAttribute('multiple')) {
      this.close();
    }

    if (false !== settings.emit ) {
      const newValue = this.selected_values.map(v => v.value).join(',');
      this.setAttribute('value', newValue);
      this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value: newValue } }));
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.container.showPopover(); 
  }

  close() {
    this.container.hidePopover(); 
  }

  render() {
    if (!this.content) {
      return;
    }

    // single-select
    if (!this.hasAttribute('multiple')) {
      this.content.innerHTML = this.selected_values.length ? this.selected_values[0].html : 'Seleziona...';
    }

    // multi-select
    if (this.hasAttribute('multiple')) {
      this.content.innerHTML = this.selected_values.length ? this.selected_values.map((v, i) => 
        `<span class="x-selected-badge"><span class="x-remove" data-index="${i}">×</span>${v.html}</span>`
      ).join('') : 'Seleziona...';
      this.content.querySelectorAll('.x-remove').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.select(this.#getOption(this.selected_values[parseInt(btn.getAttribute('data-index'))].value));
        };
      });
    }
  }

  /**
   * reloads the current HTML from the selected option and updates the trigger
   */
  refresh() {
    this.select(this.#getOption(this.value), { autoclose: false, emit: false });
  }
}

customElements.define('x-option', XOption);
customElements.define('x-select', XSelect);

// document.body.insertAdjacentHTML('afterbegin', /* html */`
// <x-select multiple>
//   <x-option>Nothing</x-option>
//   <x-option value="1">Some option</x-option>
//   <x-option value="2">Another option</x-option>
//   <x-option value="3" disabled>A disabled option</x-option>
//   <x-option value="4">Potato</x-option>
// </x-select>
// `);

// document.body.insertAdjacentHTML('afterbegin', /* html */`
// <x-select>
//   <x-option>Nothing</x-option>
//   <x-option value="1" selected>Some option</x-option>
//   <x-option value="2">Another option</x-option>
//   <x-option value="3" disabled>A disabled option</x-option>
//   <x-option value="4">Potato</x-option>
// </x-select>
// `);

document.head.insertAdjacentHTML('beforeend', /* html */`<style id ="x-select-css">
  x-select                          { display: inline-block; position: relative; width:100%; font-family: inherit; }
  .x-select-trigger                 { border: 1px solid #ccc; background: white; padding: 6px 12px; display: flex; align-items: center; min-height: 34px; cursor: pointer; box-sizing: border-box; }
  .x-selected-content               { flex: 1; display: flex; flex-wrap: wrap; gap: 5px; align-items: center; pointer-events: none; overflow: hidden; }
  .x-selected-badge                 { display: inline-flex; align-items: center; background: var(--skin-color, #007bff); color: white; padding: 1px 10px; border-radius: 4px; pointer-events: auto; }
  .x-selected-badge .x-remove       { margin-right: 5px; cursor: pointer; font-weight: bold; }
  .x-options-container              { margin: 0; padding: 0; border: 1px solid #ccc; background: white; z-index: 9999; max-height: 300px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); position: fixed; width: var(--select-width); display: none; }
  .x-options-container:popover-open { display: block; }
  .x-search-box                     { padding: 8px; border-bottom: 1px solid #eee; position: sticky; top: 0; background: white; z-index: 1; }
  .x-search-box input               { width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; outline: none; }
  x-option                          { padding: 8px 12px; display: flex; align-items: center; cursor: pointer; color: #333; }
  x-option[hidden]                  { display: none; }
  x-option:hover                    { background: #f8f9fa; }
  x-option[selected]                { background: var(--skin-color, #007bff) !important; color: white !important; }
  .triangle                         { margin-left: 8px; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #666; }
</style>`);