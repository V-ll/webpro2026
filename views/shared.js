
// shared.js
const SHARED_CONSTS = {
  POPUP_IDS: ['popup-status', 'popup-priority', 'popup-progress', 'popup-duedate', 'popup-reminder'],

};

// Node.js (EJS) と ブラウザ(JS) の両方で読み込めるようにエクスポートしておく
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SHARED_CONSTS;
}
