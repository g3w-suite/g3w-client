//HERE YOU CAN PUT ALL DEV initConfiguration to test in realtime possible future configuration keys or test configuration in a fast way
export default {
  createProject: {
    before(projectConfig){
      //code here
    },
    after(projectConfig){
      //code here
    }
  },
  //insert code to change project setting here
  setCurrentProject: {
    before(project){
      //code here
    },
    after(project){
      //code here
    }
  },
  // override here "initConfig" plugins attribute for custom plugin development
  plugins: {
    // "your-plugin-folder-name": {
    //    baseurl: '../dist',
    //    gid: 'qdjango:1'    // 1 = current project id
    // }
  }
}
