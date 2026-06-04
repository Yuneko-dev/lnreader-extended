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
    if (window.isNavigating) return;
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

// swipe and pull-to-refresh handler
(() => {
  let initialX = null;
  let initialY = null;
  let isPulling = false;
  let pullDirection = null; // 'prev' | 'next'
  let pullSpinnerContainer = null;
  let progressCircle = null;
  let separatorGroup = null;
  let animationFrameId = null;
  let canPull = true;
  let maxPull = 0;
  let hideTimeoutId = null;
  const SWIPE_THRESHOLD = 100;
  const CIRCUMFERENCE = 2 * Math.PI * 40; // 251.327

  const createSpinner = (direction) => {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
    if (pullSpinnerContainer) {
      pullSpinnerContainer.remove();
    }
    pullSpinnerContainer = document.createElement('div');
    pullSpinnerContainer.className = `pull-spinner-container pull-${
      direction === 'prev' ? 'top' : 'bottom'
    }`;
    pullSpinnerContainer.innerHTML =
      typeof pullSpinnerIcon !== 'undefined' ? pullSpinnerIcon : '';
    document.body.appendChild(pullSpinnerContainer);

    progressCircle = pullSpinnerContainer.querySelector('.progress-circle');
    separatorGroup = pullSpinnerContainer.querySelector('.separator-group');
    if (progressCircle) {
      progressCircle.style.strokeDasharray = CIRCUMFERENCE;
      progressCircle.style.strokeDashoffset = CIRCUMFERENCE;
    }
  };

  const updateSpinnerUI = (distance) => {
    if (!pullSpinnerContainer || !progressCircle || !separatorGroup) return;
    const percent = Math.min(
      100,
      Math.max(0, (distance / SWIPE_THRESHOLD) * 100),
    );
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    const angle = (percent / 100) * 360;

    progressCircle.style.strokeDashoffset = offset;
    separatorGroup.style.transform = `rotate(${angle}deg)`;
  };

  const hideSpinner = () => {
    if (pullSpinnerContainer) {
      pullSpinnerContainer.classList.remove('visible');
      pullSpinnerContainer.classList.add('hiding');
      const containerToRemove = pullSpinnerContainer;
      
      if (hideTimeoutId) clearTimeout(hideTimeoutId);
      hideTimeoutId = setTimeout(() => {
        if (containerToRemove && containerToRemove.parentNode) {
          containerToRemove.remove();
        }
        if (pullSpinnerContainer === containerToRemove) {
          pullSpinnerContainer = null;
        }
        hideTimeoutId = null;
      }, 300);
    }
  };

  document.addEventListener('touchstart', (e) => {
    initialX = e.changedTouches[0].screenX;
    initialY = e.changedTouches[0].screenY;
    isPulling = false;
    pullDirection = null;
    canPull = !window.isNavigating; // Disable pull if we are already navigating
    maxPull = 0;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  });

  document.addEventListener(
    'touchmove',
    (e) => {
      const diffY = e.changedTouches[0].screenY - initialY;
      if (Math.abs(diffY) > 10 && window.forceScrollEnd) {
        window.forceScrollEnd = false;
      }

      if (reader.generalSettings.val.pageReader) {
        const diffX = (e.changedTouches[0].screenX - initialX) / window.innerWidth;
        reader.chapterElement.style.transition = 'unset';
        reader.chapterElement.style.transform = `translateX(-${(pageReader.page.val - diffX) * 100}%)`;
        return;
      }

      if (
        e.target.id?.startsWith('scrollbar') ||
        e.target.id === 'Image-Modal-img'
      ) {
        return;
      }

      if (reader.generalSettings.val.swipeGestures) {
        const diffX = e.changedTouches[0].screenX - initialX;

        if (!isPulling && Math.abs(diffX) > Math.abs(diffY)) {
          // Horizontal swipe, ignore pull
          canPull = false;
          return;
        }

        if (!pullDirection) {
          if (!canPull) return;

          // Allow small tolerance for scrollY being slightly > 0 due to rounding
          if (window.scrollY <= 1 && diffY > 0) {
            if (!reader.prevChapter) return;
            pullDirection = 'prev';
            isPulling = true;
            createSpinner('prev');
            pullSpinnerContainer.classList.add('visible');
          } else if (
            window.scrollY + window.innerHeight >=
              document.documentElement.scrollHeight - 2 &&
            diffY < 0
          ) {
            if (!reader.nextChapter) return;
            pullDirection = 'next';
            isPulling = true;
            createSpinner('next');
            pullSpinnerContainer.classList.add('visible');
          } else if (Math.abs(diffY) > 10) {
            // User scrolled away from edge, lock out pull for this gesture
            canPull = false;
          }
        }

        if (isPulling) {
          e.preventDefault(); // lock scroll
          let currentPull = pullDirection === 'prev' ? diffY : -diffY;
          if (currentPull > maxPull) {
            maxPull = currentPull;
          }
          const distance = Math.min(maxPull, SWIPE_THRESHOLD) - (maxPull - currentPull);

          if (distance <= 0 && maxPull > 0) {
            console.log('[Gestures] Cancelled pull in touchmove. maxPull:', maxPull, 'currentPull:', currentPull);
            hideSpinner();
            isPulling = false;
            canPull = false;
            pullDirection = null;
          } else {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animationFrameId = requestAnimationFrame(() => {
              updateSpinnerUI(Math.max(0, distance));
            });
          }
        }
      }
    },
    { passive: false }
  );

  document.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - initialX;
    const diffY = e.changedTouches[0].screenY - initialY;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (reader.generalSettings.val.pageReader) {
      const diffXPercentage = diffX / window.innerWidth;
      reader.chapterElement.style.transition = '200ms';
      if (diffXPercentage < -0.3) {
        pageReader.movePage(pageReader.page.val + 1);
      } else if (diffXPercentage > 0.3) {
        pageReader.movePage(pageReader.page.val - 1);
      } else {
        pageReader.movePage(pageReader.page.val);
      }
      return;
    }

    if (isPulling && pullDirection) {
      let currentPull = pullDirection === 'prev' ? diffY : -diffY;
      let distance = Math.ceil(Math.min(maxPull, SWIPE_THRESHOLD) - (maxPull - currentPull));

      console.log('[Gestures] touchend. pullDirection:', pullDirection, 'distance:', distance, 'maxPull:', maxPull, 'currentPull:', currentPull);

      if (distance >= SWIPE_THRESHOLD) {
        console.log('[Gestures] Triggering chapter change!', pullDirection);
        hideSpinner();
        window.isNavigating = true; // Lock gestures until new HTML is loaded
        if (pullDirection === 'prev') {
          // The correct initial position would be "end" to align with infinite
          // scroll behavior, but because the DOMtakes too long to render, we
          // start at "start" to avoid the scroll animation.
          reader.post({ type: 'prev', initialScrollPosition: 'start' });
        } else {
          reader.post({ type: 'next', initialScrollPosition: 'start' });
        }
      } else {
        console.log('[Gestures] Distance not enough to trigger:', distance);
        hideSpinner();
      }
      isPulling = false;
      pullDirection = null;
      return;
    }

    /*
    // Old horizontal swipe logic disabled
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
    */
  });

  document.addEventListener('touchcancel', () => {
    console.log('[Gestures] touchcancel triggered');
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (isPulling) {
      hideSpinner();
      isPulling = false;
      canPull = false;
      pullDirection = null;
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
