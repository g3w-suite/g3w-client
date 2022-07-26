// ORIGINAL SOURCE:
// gui/vue/global-components/bar-loader.js@v3.4

export default {
  name: "bar-loader",
  props: ['loading', 'color'],
  render(createElement) {
    if (this.loading) {
      return createElement('div', {
        style:{
          backgroundColor: this.color || '#FFFFFF',
          border:0
        },
        class: {
          "bar-loader": true
        }
      })
    }

  }
};