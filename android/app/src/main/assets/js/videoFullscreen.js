/* eslint-disable */

(function () {
  function handleFullscreenChange() {
    const fullscreenElement =
      document.fullscreenElement || document.webkitFullscreenElement;
    const containsVideoTag = fullscreenElement?.querySelector('video') !== null;
    if (
      fullscreenElement &&
      (fullscreenElement.tagName === 'VIDEO' || containsVideoTag)
    ) {
      window.reader.post({
        type: 'video-fullscreen-enter',
      });
    } else {
      window.reader.post({
        type: 'video-fullscreen-exit',
      });
    }
  }

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
})();
