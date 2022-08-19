<template>
  <baseinput :state="state">
    <div
      slot="body"
      @keydown.stop=""
      v-disabled="!editable"
      class="form-control"
      :style="{border: novalid ? '1px solid reed' : '1px solid #ccc'}"
      :id="state.name"></div>
  </baseinput>
</template>

<script>
const Input = require('gui/inputs/input');

export default {
  mixins: [Input],
  methods: {
    setupTableCustomTools(){
      /**
       * Column left
       */
      document.querySelectorAll('.ql-column-left').forEach(button => {
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-left-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M10.205 12.456A.5.5 0 0 0 10.5 12V4a.5.5 0 0 0-.832-.374l-4.5 4a.5.5 0 0 0 0 .748l4.5 4a.5.5 0 0 0 .537.082z"/></svg>'
        button.title = "Add column left";
        button.addEventListener('click', () => {
          this.table.insertColumnLeft();
        });
      });

      /**
       * Column Right
       */
      document.querySelectorAll('.ql-column-right').forEach(button => {
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-right-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M5.795 12.456A.5.5 0 0 1 5.5 12V4a.5.5 0 0 1 .832-.374l4.5 4a.5.5 0 0 1 0 .748l-4.5 4a.5.5 0 0 1-.537.082z"/></svg>';
        button.title = "Add column right";
        button.addEventListener('click', () => {
          this.table.insertColumnRight();
        });
      });

      /**
       * Column Remove
       * */
      document.querySelectorAll('.ql-column-remove').forEach(button => {
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>';
        button.title = "Remove column";
        button.addEventListener('click', () => {
          this.table.deleteColumn();
        });
      });

      /**
       * Row above
       */

      document.querySelectorAll('.ql-row-above').forEach(button => {
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-up-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M3.544 10.705A.5.5 0 0 0 4 11h8a.5.5 0 0 0 .374-.832l-4-4.5a.5.5 0 0 0-.748 0l-4 4.5a.5.5 0 0 0-.082.537z"/></svg>';
        button.title = "Add row above";
        button.addEventListener('click', () => {
          this.table.insertRowAbove();
        });
      });

      /**
       * Row below
       */

      document.querySelectorAll('.ql-row-below').forEach(button => {
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-down-square" viewBox="0 0 16 16"><path d="M3.626 6.832A.5.5 0 0 1 4 6h8a.5.5 0 0 1 .374.832l-4 4.5a.5.5 0 0 1-.748 0l-4-4.5z"/><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2z"/></svg>'
        button.title = "Add row below";
        button.addEventListener('click', () => {
          this.table.insertRowBelow();
        });
      });

      /**
       * Row remove
       */
      document.querySelectorAll('.ql-row-remove').forEach(button => {
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash-square" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/><path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/></svg>';
        button.title = "Remove row";
        button.addEventListener('click', () => {
          this.table.deleteRow();
        });
      });

    }
  },
  async mounted(){
    await this.$nextTick();
    this.quill = new Quill(`#${this.state.name}`, {
      modules: {
        table: true,
        toolbar:[
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          ['link', 'clean'],
          ['table', 'column-left', 'column-right', 'column-remove'],
          ['row-above', 'row-below', 'row-remove'],
        ]
      },
      theme: 'snow'
    });
    this.quill.container.firstChild.innerHTML = this.state.value;
    this.handler = () => {
      this.state.value = this.quill.container.firstChild.innerHTML;
      this.change()
    };
    this.quill.on('text-change', this.handler);
    this.table = this.quill.getModule('table');

    this.setupTableCustomTools();
  },
  beforeDestroy(){
    this.quill.off('text-change', this.handler);
    this.handler = null;
    this.quill = null;
  }
};
</script>