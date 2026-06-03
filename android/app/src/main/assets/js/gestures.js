// gestures.js

// click handler
(() => {
  const detectTapPosition = (x, y, horizontal) => {
    if (horizontal) {
      if (x < 0.33) {
        return 'left';
      }
      if (x > 0.66) {
        return 'right';
      }
    } else {
      if (y < 0.33) {
        return 'top';
      }
      if (y > 0.66) {
        return 'bottom';
      }
    }
    return 'center';
  };
  document.onclick = (e) => {
    const { clientX, clientY } = e;
    const { x, y } = {
      x: clientX / window.innerWidth,
      y: clientY / window.innerHeight,
    };

    if (reader.generalSettings.val.pageReader) {
      if (reader.generalSettings.val.tapToScroll) {
        const position = detectTapPosition(x, y, true);
        if (position === 'left') {
          pageReader.movePage(pageReader.page.val - 1);
          return;
        }
        if (position === 'right') {
          pageReader.movePage(pageReader.page.val + 1);
          return;
        }
      }
    } else {
      if (reader.generalSettings.val.tapToScroll) {
        const position = detectTapPosition(x, y, false);
        if (position === 'top') {
          window.scrollBy({
            top: -window.innerHeight * 0.75,
            behavior: 'smooth',
          });
          return;
        }
        if (position === 'bottom') {
          window.scrollBy({
            top: window.innerHeight * 0.75,
            behavior: 'smooth',
          });
          return;
        }
      }
    }
    reader.post({ type: 'hide' });
  };
})();

// swipe handler
(() => {
  let initialX = null;
  let initialY = null;

  reader.chapterElement.addEventListener('touchstart', (e) => {
    initialX = e.changedTouches[0].screenX;
    initialY = e.changedTouches[0].screenY;
  });

  reader.chapterElement.addEventListener('touchmove', (e) => {
    if (reader.generalSettings.val.pageReader) {
      const diffX =
        (e.changedTouches[0].screenX - initialX) / window.innerWidth;
      reader.chapterElement.style.transition = 'unset';
      reader.chapterElement.style.transform = `translateX(-${(pageReader.page.val - diffX) * 100}%)`;
    }
  });

  reader.chapterElement.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - initialX;
    const diffY = e.changedTouches[0].screenY - initialY;
    if (reader.generalSettings.val.pageReader) {
      reader.chapterElement.style.transition = '200ms';
      const diffXPercentage = diffX / window.innerWidth;
      if (diffXPercentage < -0.3) {
        pageReader.movePage(pageReader.page.val + 1);
      } else if (diffXPercentage > 0.3) {
        pageReader.movePage(pageReader.page.val - 1);
      } else {
        pageReader.movePage(pageReader.page.val);
      }
      return;
    }
    if (
      e.target.id?.startsWith('scrollbar') ||
      e.target.id === 'Image-Modal-img'
    ) {
      return;
    }
    if (
      reader.generalSettings.val.swipeGestures &&
      Math.abs(diffX) > Math.abs(diffY) * 2 &&
      Math.abs(diffX) > 180
    ) {
      if (diffX < 0 && initialX >= window.innerWidth / 2) {
        e.preventDefault();
        reader.post({ type: 'next' });
      } else if (diffX > 0 && initialX <= window.innerWidth / 2) {
        e.preventDefault();
        reader.post({ type: 'prev' });
      }
    }
  });
})();

// Auto scroll feature
(() => {
  const interact = () => {
    reader.post({ type: 'user-interaction' });
  };
  ['touchstart', 'touchend', 'mousedown', 'mouseup', 'wheel'].forEach((evt) => {
    window.addEventListener(evt, interact, { passive: true });
  });
})();
