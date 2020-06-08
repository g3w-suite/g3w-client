export default {
  name: "bar-loader",
  props: ['loading'],
  render(createElement) {
    if (this.loading) {
      return createElement('div', {
        class: {
          "bar-loader": true
        }
      })
    }

  }
}
