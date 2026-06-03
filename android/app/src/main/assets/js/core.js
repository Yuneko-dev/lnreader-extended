/* eslint-disable no-console */

class Reader {
  constructor() {
    const {
      readerSettings,
      chapterGeneralSettings,
      novel,
      chapter,
      nextChapter,
      prevChapter,
      batteryLevel,
      autoSaveInterval,
      strings,
    } = initialReaderConfig;

    // state
    this.hidden = van.state(true);
    this.batteryLevel = van.state(batteryLevel);
    this.readerSettings = van.state(readerSettings);
    this.generalSettings = van.state(chapterGeneralSettings);

    this.chapterElement = document.querySelector('#LNReader-chapter');
    this.selection = window.getSelection();
    this.viewport = document.querySelector('meta[name=viewport]');

    this.novel = novel;
    this.chapter = chapter;
    this.nextChapter = nextChapter;
    this.prevChapter = prevChapter;
    this.strings = strings;
    this.autoSaveInterval = autoSaveInterval;
    this.rawHTML = this.chapterElement.innerHTML;

    // layout props
    this.paddingTop = parseInt(
      getComputedStyle(document.querySelector('body')).getPropertyValue(
        'padding-top'
      ),
      10
    );
    this.chapterHeight = this.chapterElement.scrollHeight + this.paddingTop;
    this.layoutHeight = window.screen.height;
    this.layoutWidth = window.screen.width;

    this.layoutEvent = undefined;
    this.chapterEndingVisible = van.state(false);

    let lastScrollSaveTime = 0;

    document.onscrollend = () => {
      if (!this.generalSettings.val.pageReader) {
        const now = Date.now();
        if (now - lastScrollSaveTime < 300) return;
        lastScrollSaveTime = now;
        const scrollHeight =
          document.documentElement.scrollHeight || document.body.scrollHeight;
        const maxScrollY = scrollHeight - window.innerHeight;
        const progressToSave = parseInt(
          maxScrollY > 0 ? (window.scrollY / maxScrollY) * 100 : 100,
          10
        );
        const finalProgress = progressToSave > 100 ? 100 : progressToSave;
        this.post({
          type: 'save',
          data: finalProgress,
        });
      }
    };
  }

  post = (obj) => {
    window.ReactNativeWebView.postMessage(JSON.stringify(obj));
  };

  refetch = () => {
    this.post({ type: 'refetch' });
  };

  refresh = () => {
    if (this.generalSettings.val.pageReader) {
      this.chapterWidth = this.chapterElement.scrollWidth;
    } else {
      this.chapterHeight = this.chapterElement.scrollHeight + this.paddingTop;
    }
  };
}

window.reader = new Reader();