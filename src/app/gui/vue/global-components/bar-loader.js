export default {
  name: 'bar-loader',
  props: ['loading', 'color'],
  render(createElement) {
    if (this.loading) {
      return createElement('div', {
        style: {
          backgroundColor: this.color || '#FFFFFF',
          border: 0,
        },
        class: {
          'bar-loader': true,
        },
      });
    }
  },
};
