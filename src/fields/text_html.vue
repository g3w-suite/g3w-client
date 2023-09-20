<!--
  @file
  
  ORIGINAL SOURCE: src/components/InputTextHtml.vue@3.8

  @since 3.9.0
-->

<template>
  <g3w-field :state="state">

    <!--
      @example <g3w-field mode="input" _type="texthtml" />
     -->
    <template #input-body="{ editable }">
      <div v-disabled="!editable">
        <div
          @keydown.stop = ""
          ref           = "quill_editor"
          class         = "form-control"
          :style        = "{ border: (`1px solid ${novalid ? 'red' : '#ccc' }`) }"
        ></div>
      </div>
    </template>

  </g3w-field>
</template>

<script>
import G3WField from 'components/G3WField.vue';

console.assert(undefined !== G3WField, 'G3WField is undefined');

export default {

  /** @since 3.8.6 */
  // name: "input-html",

  components: {
    'g3w-field': G3WField,
  },

  props: {
    state: {
      type: Object,
      required: true,
    },
  },

  watch: {

    'state.value'(value) {

      if (this.edit_state.edit) {
        return;
      }

      const { firstChild } = this.quill.container;

      if (this.edit_state.show_html) {
        firstChild.innerText = value;
      } else {
        firstChild.innerHTML = value;
      }

    },

  },

  methods: {

    setupTableCustomTools() {

      /** Column left */
      const left        = this.$el.querySelector('.ql-column-left');
      left.innerHTML    = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-left-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M10.205 12.456A.5.5 0 0 0 10.5 12V4a.5.5 0 0 0-.832-.374l-4.5 4a.5.5 0 0 0 0 .748l4.5 4a.5.5 0 0 0 .537.082z"/></svg>'
      left.title        = "Add column left";

      /** Column right */
      const right       = this.$el.querySelector('.ql-column-right');
      right.innerHTML   = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M5.795 12.456A.5.5 0 0 1 5.5 12V4a.5.5 0 0 1 .832-.374l4.5 4a.5.5 0 0 1 0 .748l-4.5 4a.5.5 0 0 1-.537.082z"/></svg>';
      right.title       = "Add column right";

      /** Column Remove */
      const cRemove     = this.$el.querySelector('.ql-column-remove');
      cRemove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
      cRemove.title     = "Remove column";

      /** Row above */
      const above       = this.$el.querySelector('.ql-row-above');
      above.innerHTML   = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-up-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M3.544 10.705A.5.5 0 0 0 4 11h8a.5.5 0 0 0 .374-.832l-4-4.5a.5.5 0 0 0-.748 0l-4 4.5a.5.5 0 0 0-.082.537z"/></svg>';
      above.title       = "Add row above";

      /** Row below */
      const below       = this.$el.querySelector('.ql-row-below');
      below.innerHTML   = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-down-square" viewBox="0 0 16 16"><path d="M3.626 6.832A.5.5 0 0 1 4 6h8a.5.5 0 0 1 .374.832l-4 4.5a.5.5 0 0 1-.748 0l-4-4.5z"/><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2z"/></svg>'
      below.title       = "Add row below";

      /** Row remove */
      const rRemove     = this.$el.querySelector('.ql-row-remove');
      rRemove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/></svg>';
      rRemove.title     = "Remove row";

    },

    handler() {
      const { firstChild } = this.quill.container;
      this.state.value     = this.edit_state.show_html ? firstChild.innerText : firstChild.innerHTML;
      this.edit_state.edit = true;
      this.$parent.change();
      setTimeout(() => this.edit_state.edit = false)
    },

  },

  created() {

    /** needed when this input is repeated in a different form tab */
    this.edit_state = {
      edit: false,
      show_html: false,
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
              const { firstChild }      = this.quill.container;

              this.edit_state.show_html = !this.edit_state.show_html;

              if (this.edit_state.show_html) {
                firstChild.innerText = firstChild.innerHTML;
              } else {
                firstChild.innerHTML = firstChild.innerText;
              }

              const formats = this.$el.querySelectorAll('.ql-formats');

              for (const qlformat of formats) {
                for (const child of qlformat.children) {
                  child.classList.toggle(child.classList.contains('ql-html') ? 'skin-color' : 'g3w-disabled');
                }
              }

            },
            'column-left':   () => this.table.insertColumnLeft(),
            'column-right':  () => this.table.insertColumnRight(),
            'column-remove': () => this.table.deleteColumn(),
            'row-above':     () => this.table.insertRowAbove(),
            'row-below':     () => this.table.insertRowBelow(),
            'row-remove':    () => this.table.deleteRow()
          },

        }
      },
    });

    this.quill.container.firstChild.innerHTML = this.state.value;

    this.table = this.quill.getModule('table');

    this.setupTableCustomTools();

    this.handler = this.handler.bind(this);

    this.quill.on('text-change', this.handler);
  },

  beforeDestroy() {
    this.quill.off('text-change', this.handler);
    this.handler              = null;
    this.quill                = null;
    this.edit_state.edit      = false;
    this.edit_state.show_html = false;
  },

};
</script>

<style>
  button.ql-html {
    width: 40px !important;
  }

  button.ql-html:after {
    content: "html";
  }
</style>