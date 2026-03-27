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
  get value() {
    return this.getAttribute('value') ?? this.textContent.trim();
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
    this.selected_options = [];
    this.activeOption     = null;

    this._onClickOutside  = e => { if (!this.contains(e.target)) this.close(); };

    // throttle component "resizing" (on page scroll)
    let resizing = false;
    this._onPageScroll = () => {
      if (!resizing && this.isOpen) {
        resizing = true;
        requestAnimationFrame(() => { this.#resize(); resizing = false; });
       }
    };

    this._onPageResize = () => { if (this.isOpen) this.close(); };
    this._onPageKeyDown = e => {
      if (this.isOpen && e.target !== this.input) {
        e.preventDefault();
        e.stopPropagation();
        this.#onContainerKeydown(e);
      }
    };
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

  get #search_placeholder() {
    return (this.getAttribute('search-placeholder') ?? g3w?.gettext('Search') ?? 'Search') + '...';
  }

  get #select_placeholder() {
    return (g3w?.gettext('Select') ?? 'Select') + '...';
  }

  #getOptions() {
    return Array.from(new Set([...this.selected_options, ...Array.from(this.querySelectorAll('x-option'))]));
  }

  #getOption(val) {
    return this.#getOptions().find(o => o.value === val)
  }

  static observedAttributes = ['disabled', 'search-placeholder']

  attributeChangedCallback(attr) {
    // make reactive: "disabled" attribute
    if ('disabled' === attr) {
      this.#onDisabled()
    }
    // make reactive: "search-placeholder" attribute
    if ('search-placeholder' === attr && this.input) {
      this.input.placeholder = this.#search_placeholder;
    }
  }

  connectedCallback() {

    Promise.resolve().then(() => {

      this.insertAdjacentHTML('afterbegin', /* html */`
        <div class="x-select-trigger" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox">
          <div class="x-selected-content"></div>
          <i class="triangle"></i>
        </div>
        <div class="x-options" popover="manual" role="listbox" ${ this.hasAttribute('multiple') ? 'aria-multiselectable="true"' : '' }>
          ${ this.hasAttribute('searchable') || this.hasAttribute('multiple') ? `<input class="x-search-box" type="text" placeholder="${ this.#search_placeholder }">` : '' }
        </div>
      `);

      this.trigger   = this.querySelector('.x-select-trigger');
      this.content   = this.querySelector('.x-selected-content');
      this.container = this.querySelector('.x-options');
      this.input     = this.querySelector('.x-search-box');

      Array.from(this.querySelectorAll(':scope > x-option')).forEach(opt => {
        this.container.appendChild(opt);
        opt.onclick = (e) => { e.stopPropagation(); this.select(opt); };
      });

      this.container.onkeydown = (e) => this.#onContainerKeydown(e);

      this.container.addEventListener('beforetoggle', e => this.#onContainerToggle(e));
      // this.container.addEventListener('toggle', e => this.#resize());

      if (this.input) {
        this.input.oninput   = (e) => this.#onSearchInput(e);
        this.input.onchange  = (e) => { e.stopPropagation(); }; // suppress 'change' event on parent `<x-select>`
        this.input.onkeydown = (e) => this.#onSearchKeydown(e);
      }

      this.trigger.onclick   = (e) => { e.stopPropagation(); if (!this.isDisabled) this.toggle(); };
      this.trigger.onkeydown = (e) => this.#onTriggerKeydown(e);

      // make reactive: "<x-option>" elements
      this.observer = (new MutationObserver((mutations) => {
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
            opt._xselect_observer = (new MutationObserver((mutations) => {
              proxy.innerHTML = opt.innerHTML;
              // Array.from(opt.attributes).forEach(attr => proxy.setAttribute(attr.name, attr.value));
              for (const mutation of mutations) {
                //get attributes mutation
                if ('attributes' === mutation.type) {
                  proxy.setAttribute(mutation.attributeName, mutation.target.getAttribute(mutation.attributeName))
                }
              }
            }));
            opt._xselect_observer.observe(opt, { childList: true, attributes: true, characterData: true, subtree: true });

            proxy.style.display = null;
            // delegate click event
            proxy.onclick = (e) => { e.stopPropagation(); this.select(opt); };
            this.container.appendChild(proxy);
          });
          // remove proxied node (dynamically removed by vue)
          mutation.removedNodes.forEach(opt => {
            opt?._xselect_proxy?.remove();
            opt?._xselect_observer?.disconnect();
            delete opt._xselect_proxy;
          });
        });
      }));
      
      this.observer.observe(this, { childList: true });

      this.langWatcher = Vue.watch(() => g3w?.state?.language, lang => this.refresh());

      document.addEventListener('pointerup', this._onClickOutside);
      window.addEventListener('scroll', this._onPageScroll, true);
      window.addEventListener('resize', this._onPageResize);
      window.addEventListener('keydown', this._onPageKeyDown);

      if (this.getAttribute('value')) {                                 // inital value (from <x-select value="some value">)
        this.select(this.#getOption(this.getAttribute('value')), { autoclose: false, emit: false });
      } else if (this.container.querySelector('x-option[selected]')) {  // inital value (from <x-option selected>)
        this.select(this.container.querySelector('x-option[selected]'));
      } else {                                                          // initial value (from first available <x-option>)
        this.select(Array.from(this.container.querySelectorAll('x-option')).find(opt => !opt.hasAttribute('disabled')));
      }
    });
  }

  disconnectedCallback() {
    document.removeEventListener('pointerup', this._onClickOutside);
    window.removeEventListener('scroll', this._onPageScroll, true);
    window.removeEventListener('resize', this._onPageResize);
    window.removeEventListener('keydown', this._onPageKeyDown);
    this.observer?.disconnect();
    this.langWatcher();
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
    const value = this.input.value.trim();

    if (!(e.key === 'Enter' && value && (this.hasAttribute('createTag') || this.getAttribute('createTag') === 'true'))) {
      return;
    }

    e.preventDefault();

    // create a new (dynamic) option
    if (!this.#getOption(value)) {
      const opt = document.createElement('x-option');
      opt.setAttribute('value', value);
      opt.textContent = value;
      opt.onclick = (e) => { e.stopPropagation(); this.select(opt); };
      this.container.appendChild(opt);
    }

    // select the option
    this.select(this.#getOption(value));
  }

  #onSearchInput(e) {
    const value = e.target.value;
    this.#search(value);
    // emit custom "search-input" event (eg. for AJAX search)
    this.dispatchEvent(new CustomEvent('search-input', { 
      detail: { value },
      bubbles: true,
      composed: true
    }));
  }

  #onTriggerKeydown(e) {
    if (this.isDisabled) {
      return;
    }
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
    if (!options.length) {
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); e.stopPropagation(); this.#focus(1);                     break;
      case 'ArrowUp':   e.preventDefault(); e.stopPropagation(); this.#focus(-1);                    break;
      case 'Enter':     e.preventDefault(); e.stopPropagation(); this.select(this.activeOption);     break;
      case 'Escape':    e.preventDefault(); e.stopPropagation(); this.close(); this.trigger.focus(); break;
      case 'Tab':       this.close();                                           break; // Allow tab to move out
    }
  }

  #onContainerToggle(e) {
    const isOpen = 'open' === e.newState;
    this.trigger.setAttribute('aria-expanded', isOpen);
    this.trigger.classList.toggle('open', isOpen);

    if (isOpen) {
      this.#resize();
    }

    if (isOpen && this.input) {
      this.input.value = '';                    // reset search box
      this.#search('');
      setTimeout(() => this.input.focus(), 50); // auto focus
    }

    // scroll container to selected option (keep it visible)
    if (isOpen && this.selected_options.length) {
      setTimeout(() => {
        const opt = this.container.querySelector(`x-option[value="${this.selected_options[0].value}"]`);
        if (!this.input) {
          this.#focus(opt);                         // auto focus selected option
        }
        opt?.scrollIntoView({ block: 'nearest' });
      }, 100);
    }

    if (isOpen && !this.input && !this.selected_options.length) {
      this.#focus('first'); // no selected option
    }

    if (!isOpen) {
      this.trigger.removeAttribute('aria-activedescendant');
    }

    if (!isOpen && this.activeOption) {
      this.activeOption.setAttribute('aria-selected', this.activeOption.hasAttribute('selected'));
      this.activeOption = null;
    }
  }

  #focus(direction) {
    const options = Array.from(this.container.querySelectorAll('x-option:not([hidden], [disabled])'));

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

    let idx = options.indexOf(this.activeOption) + direction;
    if (idx < 0) idx = options.length - 1;
    if (idx >= options.length) idx = 0;

    if (this.input && 0 === idx && document.activeElement !== this.input) {
      this.input.focus(); // focus search box when reaching end of list
    } else {
      this.#setActiveOption(options.at(idx));
    }
    
  }

  #setActiveOption(option) {
    this.activeOption?.setAttribute('aria-selected', this.activeOption?.hasAttribute('selected'));
    this.activeOption = option;
    this.trigger.setAttribute('aria-activedescendant', option.id || (option.id = 'option-' + Math.random().toString(36).substr(2, 9)));
    option.setAttribute('aria-selected', 'true');
    option.focus();
  }

  #resize() {
    if (!this.trigger || !this.container) {
      return;
    }

    // wait for next browser "paint"
    requestAnimationFrame(() => { 
      const rect = this.trigger.getBoundingClientRect();
      this.container.style.top = (window.innerHeight - rect.bottom < this.container.offsetHeight)
        ? `${rect.top - 2 - this.container.offsetHeight}px` // prevent bottom overflow (page) 
        : `${rect.bottom + 2}px`;
      this.container.style.left  = `${rect.left}px`;
      this.container.style.width = `${rect.width}px`;
    });
  }

  /**
   * @param { XOption | 'string' } opt 
   * @param settings 
   */
  select(opt, settings = { autoclose: false, emit: true }) {

    if ('string' === typeof opt) {
      opt = this.#getOption(opt);
    }

    // single-select
    if (!this.hasAttribute('multiple')) {
      if (opt) {
        this.container.querySelectorAll('x-option').forEach(o => { o.removeAttribute('selected'); o.setAttribute('aria-selected', 'false'); });
        this.selected_options = [opt];
        opt.setAttribute('aria-selected', 'true');
        opt.setAttribute('selected', '');
      }
      this.content.innerHTML = this.selected_options.length ? this.selected_options[0].innerHTML : this.#select_placeholder;
    }

    // multi-select
    if (this.hasAttribute('multiple')) {
      if (opt) {
        this.selected_options = opt.hasAttribute('selected') ? this.selected_options.filter(o => o.value !== opt.value) : this.selected_options.concat(opt);
        opt.setAttribute('aria-selected', !opt.hasAttribute('selected'));
        opt.toggleAttribute('selected');
      }
      this.content.innerHTML = this.selected_options.length ? this.selected_options.map((opt, i) => 
        `<span class="x-selected-badge"><span class="x-remove" data-index="${i}">×</span>${opt.innerHTML}</span>`
      ).join('') : this.#select_placeholder;
      this.content.querySelectorAll('.x-remove').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const opt = this.selected_options[parseInt(btn.getAttribute('data-index'))];
          this.select(this.#getOption(opt?.value));
        };
      });
    }

    // auto close
    if (opt && (true == settings.autoclose || !this.hasAttribute('multiple'))) {
      this.close();
    }

    // emit new value
    if (opt && false !== settings.emit ) {
      const value = this.selected_options.map(opt => opt.value).join(',');
      this.setAttribute('value', value);
      this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { value } }));
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

  /**
   * reloads the current HTML from the selected option and updates the trigger
   */
  refresh() {
    this.select(this.#getOption(this.value), { autoclose: false, emit: false });
  }
}

customElements.define('x-option', XOption);
customElements.define('x-select', XSelect);

// document.addEventListener('DOMContentLoaded', () => {
//   g3w.app.isReady().then(() => {
//     const sidebar = document.querySelector('.main-sidebar');
//     sidebar.insertAdjacentHTML('afterbegin', /* html */`
//       <x-select style="color: #000; margin: .5em 0">
//         <x-option>Nothing</x-option>
//         <x-option value="1" selected>Some option</x-option>
//         <x-option value="2">Another option</x-option>
//         <x-option value="3" disabled>A disabled option</x-option>
//         <x-option value="4">Potato</x-option>
//       </x-select>
//       <x-select multiple style="color: #000; margin: .5em 0;">
//         <x-option>Nothing</x-option>
//         <x-option value="1">Some option</x-option>
//         <x-option value="2">Another option</x-option>
//         <x-option value="3" disabled>A disabled option</x-option>
//         <x-option value="4">Potato</x-option>
//       </x-select>
//     `);
//   });
// });

document.head.insertAdjacentHTML('beforeend', /* html */`<style id ="x-select-css">
  x-select                       { display: inline-block; position: relative; width:100%; font-family: inherit; }
  .x-select-trigger              { border: 1px solid #ccc; background: white; padding: 6px 6px 6px 12px; display: flex; align-items: center; min-height: 34px; cursor: pointer; box-sizing: border-box; user-select: none; }
  .x-selected-content            { flex: 1; display: flex; flex-wrap: wrap; gap: 5px; align-items: center; pointer-events: none; overflow: hidden; }
  .x-selected-badge              { display: inline-flex; align-items: center; background: var(--skin-color, #007bff); color: white; padding: 1px 10px; border-radius: 4px; pointer-events: auto; }
  .x-selected-badge .x-remove    { margin-right: 5px; cursor: pointer; font-weight: bold; }
  .x-options                     { margin: 0; padding: 0; border: 1px solid #ccc; background: white; z-index: 9999; max-height: 300px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); position: fixed; display: none; }
  .x-options:popover-open        { display: block; }
  .x-search-box                  { margin: 8px; box-shadow: 0 0 0 19px white; clip-path: inset(-8px -8px -8px -8px); /*! border-bottom: 1px solid #eee; */position: sticky;top: 8px;background: white;z-index: 1;padding: 6px;border: 1px solid #ddd;border-radius: 4px;box-sizing: border-box;outline: none;width: calc(100% - 16px); }
  x-option                       { padding: 8px 12px; display: flex; align-items: center; cursor: pointer; color: #333; border-bottom: 1px solid #eee; }
  x-option[hidden]               { display: none; }
  x-option[disabled]             { pointer-events: none; opacity: .5; }
  x-option[selected],
  x-option[aria-selected="true"] { background: var(--skin-color, #007bff) !important; color: white !important; outline: none !important; }
  x-option:hover:not([disabled]),
  x-option[aria-selected="true"]:not([selected]) { background: hsl(from var(--skin-color, #007bff) h s calc(l + 20)) !important; color: white !important; }
  .triangle                      { margin-left: 8px; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #666; }
</style>`);