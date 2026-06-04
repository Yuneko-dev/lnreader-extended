// page-reader.js

class PageReader {
  constructor() {
    this.page = van.state(0);
    this.totalPages = van.state(0);
    this.navigating = false; // Lock to prevent rapid tap chapter jumps
    this.initialized = false; // Flag to track if initial page position has been set
    this.saveProgressTimeout = null; // Debounce timer for saving progress

    // Run the reactive effect for page mode changes
    this.setupPageReaderReactiveEffect();
  }

  movePage = (destPage) => {
    // Prevent rapid taps from causing chapter jumps
    if (this.navigating) {
        return;
    }
    destPage = parseInt(destPage, 10);
    if (destPage < 0) {
      if (!reader.prevChapter) return;
      this.navigating = true;
      reader.post({ type: 'prev' });
      return;
    }
    if (this.totalPages.val > 0 && destPage >= this.totalPages.val) {
      if (!reader.nextChapter) return;
      this.navigating = true;
      reader.post({ type: 'next' });
      return;
    }
    this.page.val = destPage;
    reader.chapterElement.style.transform =
      'translateX(-' + destPage * 100 + '%)';

    // E-ink refresh: flash opacity to force full screen redraw and reduce ghosting
    if (reader.generalSettings.val.einkRefreshOnPageTurn) {
      document.body.style.opacity = '0';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.style.opacity = '1';
        });
      });
    }

    const newProgress = parseInt(
      ((this.page.val + 1) / this.totalPages.val) * 100,
      10
    );

    if (newProgress > reader.chapter.progress) {
      if (this.saveProgressTimeout) {
        clearTimeout(this.saveProgressTimeout);
      }
      this.saveProgressTimeout = setTimeout(() => {
        reader.post({
          type: 'save',
          data: parseInt(
            (this.page.val / Math.max(1, this.totalPages.val - 1)) * 100,
            10
          ),
        });
      }, 300);
    }
  };

  setupPageReaderReactiveEffect = () => {
    van.derive(() => {
      // ignore if initial or other states change
      if (
        reader.generalSettings.val.pageReader ===
        reader.generalSettings.oldVal.pageReader
      ) {
        return;
      }
      if (reader.generalSettings.val.pageReader) {
        const scrollHeight =
          document.documentElement.scrollHeight || document.body.scrollHeight;
        const maxScrollY = scrollHeight - window.innerHeight;
        const ratio = maxScrollY > 0 ? window.scrollY / maxScrollY : 1;
        document.body.classList.add('page-reader');
        setTimeout(() => {
          reader.refresh();
          this.totalPages.val = parseInt(
            (reader.chapterWidth + reader.readerSettings.val.padding * 2) /
              reader.layoutWidth,
            10
          );
          this.movePage(Math.round(Math.max(1, this.totalPages.val - 1) * ratio));
        }, 100);
      } else {
        reader.chapterElement.style = '';
        document.body.classList.remove('page-reader');
        setTimeout(() => {
          reader.refresh();
          const scrollHeight =
            document.documentElement.scrollHeight || document.body.scrollHeight;
          const maxScrollY = scrollHeight - window.innerHeight;
          window.scrollTo({
            top:
              maxScrollY > 0
                ? maxScrollY * (this.page.val / Math.max(1, this.totalPages.val - 1))
                : 0,
            behavior: 'smooth',
          });
        }, 100);
      }
    });
  };
}

window.pageReader = new PageReader();

function calculatePages() {
  reader.refresh();

  if (reader.generalSettings.val.pageReader) {
    pageReader.totalPages.val = parseInt(
      (reader.chapterWidth + reader.readerSettings.val.padding * 2) /
        reader.layoutWidth,
      10
    );
    if (!pageReader.initialized) {
      if (initialPageReaderConfig.nextChapterScreenVisible) {
        pageReader.initialized = true;
        pageReader.movePage(0);
        return;
      }

      const calculatedProgressPage = Math.max(
        0,
        Math.round((reader.chapter.progress / 100) * Math.max(1, pageReader.totalPages.val - 1))
      );
      
      pageReader.movePage(calculatedProgressPage);
      pageReader.initialized = true;
    }
  } else {
    if (initialReaderConfig.initialScrollPosition === 'end') {
      window.forceScrollEnd = true;
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    } else if (initialReaderConfig.initialScrollPosition === 'start') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      const scrollHeight =
        document.documentElement.scrollHeight || document.body.scrollHeight;
      const maxScrollY = scrollHeight - window.innerHeight;
      const targetTop =
        maxScrollY > 0 ? (maxScrollY * reader.chapter.progress) / 100 : 0;
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
    }
  }
}

let resizeTimeout;
const ro = new ResizeObserver(() => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = setTimeout(() => {
    if (reader.generalSettings.val.pageReader) {
      // Recalculate total pages but preserve current page position
      reader.refresh();
      const newTotalPages = parseInt(
        (reader.chapterWidth + reader.readerSettings.val.padding * 2) /
          reader.layoutWidth,
        10
      );
      pageReader.totalPages.val = newTotalPages;
      if (pageReader.initialized) {
        // After initial load, just clamp current page and re-apply transform
        if (pageReader.page.val >= newTotalPages) {
          pageReader.movePage(newTotalPages - 1);
        } else {
          // Re-apply current page transform
          reader.chapterElement.style.transform =
            'translateX(-' + pageReader.page.val * 100 + '%)';
        }
      } else {
        calculatePages();
      }
    } else {
      if (window.forceScrollEnd) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
      } else if (pageReader.totalPages.val) {
        calculatePages();
      }
    }
  }, 100);
});
ro.observe(reader.chapterElement);

// Also call once on load
window.addEventListener('load', () => {
  document.fonts.ready.then(() => {
    requestAnimationFrame(() => setTimeout(calculatePages, 0));
  });
});
