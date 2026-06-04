// page-reader.js

class PageReader {
  constructor() {
    this.page = van.state(0);
    this.totalPages = van.state(0);
    this.chapterEndingVisible = van.state(
      initialPageReaderConfig.nextChapterScreenVisible
    );
    this.chapterEnding = document.getElementsByClassName('transition-chapter')[0];
    this.navigating = false; // Lock to prevent rapid tap chapter jumps
    this.initialized = false; // Flag to track if initial page position has been set

    // Run the reactive effect for page mode changes
    this.setupPageReaderReactiveEffect();
  }

  showChapterEnding = (bool, instant, left) => {
    if (!this.chapterEnding) {
      this.chapterEnding = document.getElementsByClassName('transition-chapter')[0];
      if (!this.chapterEnding) return;
    }
    this.chapterEnding.style.transition = 'unset';
    if (bool) {
      this.chapterEnding.style.transform = `translateX(${left ? -200 : 0}vw)`;
      requestAnimationFrame(() => {
        if (!instant) this.chapterEnding.style.transition = '200ms';
        this.chapterEnding.style.transform = 'translateX(-100vw)';
      });
      this.chapterEndingVisible.val = true;
    } else {
      if (!instant) this.chapterEnding.style.transition = '200ms';
      this.chapterEnding.style.transform = `translateX(${left ? -200 : 0}vw)`;
      this.chapterEndingVisible.val = false;
    }
  };

  movePage = (destPage) => {
    // Prevent rapid taps from causing chapter jumps
    if (this.navigating) return;

    if (this.chapterEndingVisible.val) {
      if (destPage < 0) {
        this.showChapterEnding(false);
        return;
      }
      if (destPage < this.totalPages.val) {
        this.showChapterEnding(false, false, true);
        return;
      }
      if (destPage >= this.totalPages.val) {
        this.navigating = true;
        reader.post({ type: 'next' });
        return;
      }
    }
    destPage = parseInt(destPage, 10);
    if (destPage < 0) {
      if (!reader.prevChapter) return;
      this.navigating = true;
      document.getElementsByClassName('transition-chapter')[0].innerText =
        reader.prevChapter.name;
      this.showChapterEnding(true, false, true);
      setTimeout(() => {
        reader.post({ type: 'prev' });
      }, 250);
      return;
    }
    if (destPage >= this.totalPages.val) {
      if (!reader.nextChapter) return;
      this.navigating = true;
      document.getElementsByClassName('transition-chapter')[0].innerText =
        reader.nextChapter.name;
      this.showChapterEnding(true);
      setTimeout(() => {
        reader.post({ type: 'next' });
      }, 250);
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
      reader.post({
        type: 'save',
        data: parseInt(
          ((this.page.val + 1) / this.totalPages.val) * 100,
          10
        ),
      });
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
        const ratio = Math.min(
          0.99,
          maxScrollY > 0 ? window.scrollY / maxScrollY : 1
        );
        document.body.classList.add('page-reader');
        setTimeout(() => {
          reader.refresh();
          this.totalPages.val = parseInt(
            (reader.chapterWidth + reader.readerSettings.val.padding * 2) /
              reader.layoutWidth,
            10
          );
          this.movePage(this.totalPages.val * ratio);
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
                ? maxScrollY * ((this.page.val + 1) / this.totalPages.val)
                : 0,
            behavior: 'smooth',
          });
        }, 100);
      }
    });
  };
}

window.pageReader = new PageReader();

document.addEventListener('DOMContentLoaded', () => {
  if (pageReader.chapterEndingVisible.val) {
    pageReader.showChapterEnding(true, true);
  }
});

function calculatePages() {
  reader.refresh();

  if (reader.generalSettings.val.pageReader) {
    pageReader.totalPages.val = parseInt(
      (reader.chapterWidth + reader.readerSettings.val.padding * 2) /
        reader.layoutWidth,
      10
    );

    if (initialPageReaderConfig.nextChapterScreenVisible) {
      pageReader.initialized = true;
      return;
    }

    pageReader.movePage(
      Math.max(
        0,
        Math.round(
          (pageReader.totalPages.val * reader.chapter.progress) / 100
        ) - 1
      )
    );
    pageReader.initialized = true;
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

const ro = new ResizeObserver(() => {
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
});
ro.observe(reader.chapterElement);

// Also call once on load
window.addEventListener('load', () => {
  document.fonts.ready.then(() => {
    requestAnimationFrame(() => setTimeout(calculatePages, 0));
  });
});
