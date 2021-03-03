export default {
  name: "bar-loader",
  props: ['loading'],
  render(createElement) {
    if (this.loading) {
      return createElement('div', {
        style:{
          backgroundColor: '#FFFFFF',
          border:0
        },
        class: {
          "bar-loader": true
        }
      })
    }

  }
}
