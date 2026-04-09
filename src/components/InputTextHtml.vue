<template>
  <baseinput :state = "state" v-disabled = "!editable">
    <div
      slot          = "body"
      @keydown.stop = ""
      ref           = "quill_editor"
      class         = "form-control"
      :style        = " { border: state.validate.valid ? '1px solid #ccc' : '1px solid reed' }">
    </div>
  </baseinput>
</template>

<script>
  import Input from 'components/g3w-input';
  import Quill from 'quill';

  export default {

    /** @since 3.8.6 */
    name: "input-html",

    mixins: [ Input ],

    created() {

      /**
       * edit_state is need if this input is repeated in different form tab
       */
      this.edit_state = {
        edit:      false,
        show_html: false
      };

      if (!this.state.edit_states) {
        this.state.edit_states = [];
      }
      this.state.edit_states.push(this.edit_state);
    },
    async mounted() {
      await this.$nextTick();
      this.quill = new Quill(this.$refs.quill_editor, {
        theme: 'snow',
        modules: {
          clipboard: {
            matchVisual: false,
          },
          table: true,
          toolbar: {
            container: [
              [{ header: [1, 2, 3, 4, 5, 6,  false] }],
              [{ 'align': ''}, {'align': 'center'}, {'align': 'right'}, {'align': 'justify'}],
              [{ 'color': [] }, { 'background': [] }],
              ['bold', 'italic', 'underline', { 'list': 'ordered' }, { 'list': 'bullet' }, 'link', 'clean', 'html'],
              ['table', 'column-left', 'column-right', 'column-remove', 'row-above', 'row-below', 'row-remove'],
            ],
            handlers: {
              html: () => {
                this.edit_state.show_html = !this.edit_state.show_html;
                if (this.edit_state.show_html) {
                  this.quill.container.firstChild.innerText = this.quill.container.firstChild.innerHTML;
                } else {
                  this.quill.container.firstChild.innerHTML = this.quill.container.firstChild.innerText;
                }
                this.$el.querySelectorAll('.ql-formats > *').forEach(child => {
                  child.classList.toggle(child.classList.contains('ql-html') ? 'skin-color' : 'g3w-disabled');
                });
              },
              'column-left':   () => this.table.insertColumnLeft(),
              'column-right':  () => this.table.insertColumnRight(),
              'column-remove': () => this.table.deleteColumn(),
              'row-above':     () => this.table.insertRowAbove(),
              'row-below':     () => this.table.insertRowBelow(),
              'row-remove':    () => this.table.deleteRow()
            },
          },
        },
      });

      // set value in quill editor
      this.quill.clipboard.dangerouslyPasteHTML(0, this.state.value);

      this.table = this.quill.getModule('table');

      // a11y: help text (button tooltip)
      this.$el.querySelector('.ql-formats button[aria-label="align: "]').ariaLabel = 'align: left';
      this.$el.querySelector('.ql-formats .ql-color.ql-picker').title = 'color: text';
      this.$el.querySelector('.ql-formats .ql-color.ql-picker').dataset.placement = 'top';
      this.$el.querySelector('.ql-formats .ql-background.ql-picker').title = 'color: background';
      this.$el.querySelector('.ql-formats .ql-background.ql-picker').dataset.placement = 'top';
      this.$el.querySelectorAll('.ql-formats button').forEach(btn => { btn.title = btn.ariaLabel; btn.dataset.placement = 'top'; });

      // CUSTOM TOOL: html
      this.$el.querySelector('.ql-html').innerHTML   = 'html';
      this.$el.querySelector('.ql-html').style.width = 'unset';

      // CUSTOM TOOL: column left
      Object.assign(this.$el.querySelector('.ql-column-left'), {
        innerHTML: '<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M10 12V4H9L5 8z"/></svg>',
        title: 'Add column left',
      });

      // CUSTOM TOOL: column right
      Object.assign(this.$el.querySelector('.ql-column-right'), {
        innerHTML: '<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M6 12V4l5 4z"/></svg>',
        title: 'Add column right',
      });

      // CUSTOM TOOL: column remove
      Object.assign(this.$el.querySelector('.ql-column-remove'), {
        innerHTML: '<svg fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d="M4.6 4.6a.5.5 0 0 1 .8 0L8 7.3l2.6-2.7a.5.5 0 0 1 .8.8L8.7 8l2.7 2.6a.5.5 0 0 1-.8.8L8 8.7l-2.6 2.7a.5.5 0 0 1-.8-.8L7.3 8 4.6 5.4a.5.5 0 0 1 0-.8"/></svg>',
        title: 'Remove column',
      });

      // CUSTOM TOOL: row above
      Object.assign(this.$el.querySelector('.ql-row-above'), {
        innerHTML: '<svg fill="currentColor" viewBox="0 0 16 16"><path d="m14 1 1 1v12l-1 1H2l-1-1V2l1-1zM2 0 0 2v12l2 2h12l2-2V2l-2-2z"/><path d="M4 11h8v-1L8 6z"/></svg>',
        title: 'Add row above',
      });

      // CUSTOM TOOL: row below
      Object.assign(this.$el.querySelector('.ql-row-below'), {
        innerHTML: '<svg fill="currentColor" viewBox="0 0 16 16"><path d="M4 7V6h8v1l-4 4z"/><path d="m0 2 2-2h12l2 2v12l-2 2H2l-2-2zm15 0-1-1H2L1 2v12l1 1h12l1-1z"/></svg>',
        title: 'Add row below',
      });

      // CUSTOM TOOL: row remove
      Object.assign(this.$el.querySelector('.ql-row-remove'), {
        innerHTML: '<svg fill="currentColor" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d="m4 8 .5-.5h7a.5.5 0 0 1 0 1h-7z"/></svg>',
        title: 'Remove row',
      });

      this.handler = () => {
        this.state.value = this.edit_state.show_html ? this.quill.container.firstChild.innerText : this.quill.container.firstChild.innerHTML;
        this.edit_state.edit = true;
        this.change();
        setTimeout(() => this.edit_state.edit = false)
      };

      this.quill.on('text-change', this.handler);
    },
    watch: {
      'state.value'(value) {
        if (!this.edit_state.edit) {
          if (this.edit_state.show_html) {
            this.quill.container.firstChild.innerText = value;
          } else {
            this.quill.container.firstChild.innerHTML = value;
          }
        }
      }
    },
    beforeDestroy() {
      this.quill.off('text-change', this.handler);
      this.handler = null;
      this.quill = null;
      this.edit_state.edit = false;
      this.edit_state.show_html = false;
    }
  };
</script>