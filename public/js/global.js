// global.js
// Global utility for closing the side modal panel reliably
window.closeSideModalPanel = function() {
  var modal = document.getElementById('sideModalPanel');
  if (modal) modal.remove();
};
