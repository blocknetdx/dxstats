/* eslint-disable linebreak-style */
const P2Prot = require('./libs');

class BackgroundManager {
  constructor(appWindow, backgroundWindow) {
    this.appWindow = appWindow;
    this.backgroundWindow = backgroundWindow;
  }

  async init() {
    P2Prot.start(this.appWindow);
  }
}

exports.createBgManager = (appWindow, backgroundWindow) => {
  new BackgroundManager(appWindow, backgroundWindow).init();
};
