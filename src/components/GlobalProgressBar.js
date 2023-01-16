/**
 * @file
 * @since v3.7
 */

export default {
  name: "progressbar",
  props: ['progress'],
  render(createElement) {
    if (this.progress !== null && this.progress !== undefined) {
      return createElement('div', {
        style:{
          margin: '5px 0 5px 0',
          width: '100%',
          backgroundColor: '#FFFFFF',
          border:0,
          borderRadius: '3px'
        }
      }, [
        createElement('div', {
          style: {
            width: `${this.progress < 10 ? 10 : this.progress}%`,
            display: 'flex',
            justifyContent:'center',
            fontWeight: 'bold'
          },
          class: {
            'skin-background-color': true
          }
        },
          [
            createElement('span',`${this.progress}%`)
          ]
        )
      ])
    }
  }
};