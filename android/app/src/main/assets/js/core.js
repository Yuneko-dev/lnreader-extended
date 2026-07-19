/* eslint-disable */

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
        'padding-top',
      ),
      10,
    );
    this.chapterHeight = this.chapterElement.scrollHeight + this.paddingTop;
    // Use viewport (CSS pixels) instead of monitor screen so coordinate math
    // matches `clientX/Y` and works on environments like WSA where the WebView
    // window can be smaller than the host monitor.
    this.layoutHeight = window.innerHeight;
    this.layoutWidth = window.innerWidth;

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
          10,
        );
        const finalProgress = progressToSave > 100 ? 100 : progressToSave;
        this.post({
          type: 'save',
          data: finalProgress,
        });
      }
    };

    // Track viewport size changes (e.g. WSA window resize, foldable, split-screen)
    // so click-region math, page counts and scroll amounts stay in sync with the
    // current WebView size rather than the value captured at first load.
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.layoutHeight = window.innerHeight;
        this.layoutWidth = window.innerWidth;
        if (
          this.generalSettings.val.pageReader &&
          typeof calculatePages === 'function'
        ) {
          calculatePages();
        }
      }, 150);
    });
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

// Support legacy JavaScript variables from LNReader v1
/**
 * @param {string} globalName
 * @param {function} getParent
 * @param {string} key
 * @deprecated
 */
function defineSafeProp(globalName, getParent, key) {
  Object.defineProperty(window, globalName, {
    get() {
      return getParent()?.[key];
    },
    set(value) {
      const parent = getParent();
      if (parent) {
        parent[key] = value;
      }
    },
    configurable: true,
  });
}

defineSafeProp('novelName',      () => window.reader?.novel,   'name');
defineSafeProp('chapterName',    () => window.reader?.chapter, 'name');
defineSafeProp('sourceId',       () => window.reader?.novel,   'pluginId');
defineSafeProp('chapterId',      () => window.reader?.chapter, 'id');
defineSafeProp('novelId',        () => window.reader?.novel,   'id');
defineSafeProp('chapterElement', () => window.reader,          'chapterElement');
defineSafeProp('html',           () => window.chapterElement,  'innerHTML');
