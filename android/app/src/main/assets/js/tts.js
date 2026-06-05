// tts.js

class TTS {
  constructor() {
    this.readableNodeNames = [
      '#text',
      'B',
      'I',
      'SPAN',
      'EM',
      'BR',
      'STRONG',
      'A',
    ];
    this.internalElementIds = [
      'LNReader-title-novel',
    ];
    this.prevElement = null;
    this.currentElement = reader.chapterElement;
    this.started = false;
    this.reading = false;
    this.elementsRead = 0;
    this.totalElements = 0;
    this.allReadableElements = []; // Store all readable elements at start
    this.textQueue = []; // Flat list of normalized text for native fallback
  }

  readable = (element) => {
    const ele = element ?? this.currentElement;
    if (this.internalElementIds.includes(ele.id)) {
      return false;
    }
    if (
      ele.nodeName !== 'SPAN' &&
      this.readableNodeNames.includes(ele.nodeName)
    ) {
      return false;
    }
    if (!ele.hasChildNodes()) {
      return false;
    }
    for (let i = 0; i < ele.childNodes.length; i++) {
      if (!this.readableNodeNames.includes(ele.childNodes.item(i).nodeName)) {
        return false;
      }
    }
    return true;
  };

  normalizeText = (text) => {
    if (!text) return '';
    return text
      .replace(/\s+/g, ' ')
      .replace(/\s*([.,!?;:])\s*/g, '$1 ')
      .trim();
  };

  // if can find a readable node, else stop tts
  findNextTextNode = (depth = 0) => {
    // Prevent deep recursion
    if (depth > 500) {
      console.warn('TTS: findNextTextNode max depth reached');
      return false;
    }

    if (this.currentElement.isSameNode(reader.chapterElement) && this.started) {
      return false;
    } else {
      this.started = true;
    }

    // Safety check: ensure currentElement is valid
    if (!this.currentElement || !this.currentElement.nodeName) {
      return false;
    }

    // is read, have to go next or go back
    if (this.currentElement.isSameNode(this.prevElement)) {
      this.prevElement = this.currentElement;
      if (this.currentElement.nextElementSibling) {
        this.currentElement = this.currentElement.nextElementSibling;
        return this.findNextTextNode(depth + 1);
      } else if (
        this.currentElement.parentElement &&
        !this.currentElement.parentElement.isSameNode(document.body) &&
        !this.currentElement.parentElement.isSameNode(document.documentElement)
      ) {
        this.currentElement = this.currentElement.parentElement;
        return this.findNextTextNode(depth + 1);
      } else {
        return false;
      }
    } else {
      // can read? read it
      if (this.readable()) {
        return true;
      }
      if (
        !this.prevElement?.parentElement?.isSameNode(this.currentElement) &&
        this.currentElement.firstElementChild
      ) {
        // go deep
        this.prevElement = this.currentElement;
        this.currentElement = this.currentElement.firstElementChild;
        return this.findNextTextNode(depth + 1);
      } else if (this.currentElement.nextElementSibling) {
        this.prevElement = this.currentElement;
        this.currentElement = this.currentElement.nextElementSibling;
        return this.findNextTextNode(depth + 1);
      } else if (
        this.currentElement.parentElement &&
        !this.currentElement.parentElement.isSameNode(document.body) &&
        !this.currentElement.parentElement.isSameNode(document.documentElement)
      ) {
        this.prevElement = this.currentElement;
        this.currentElement = this.currentElement.parentElement;
        return this.findNextTextNode(depth + 1);
      } else {
        return false;
      }
    }
  };

  next = () => {
    try {
      this.currentElement?.classList?.remove('highlight');

      // Use array-based approach instead of DOM traversal (no recursion!)
      while (this.elementsRead < this.totalElements) {
        const nextElement = this.allReadableElements[this.elementsRead];
        if (!nextElement) break;

        const text = this.normalizeText(nextElement.innerText);
        if (text) {
          // Found valid text - speak it
          this.currentElement = nextElement;
          this.reading = true;
          this.elementsRead++;
          this.speak();
          return;
        } else {
          // Empty text, skip to next in array (no recursion!)
          this.elementsRead++;
        }
      }

      // Reached the end (elementsRead >= totalElements or no more valid elements)
      this.reading = false;
      const autoPageAdvance =
        reader.readerSettings.val.tts?.autoPageAdvance === true;
      const hasNextChapter = !!reader.nextChapter;

      if (autoPageAdvance && hasNextChapter) {
        reader.post({ type: 'next', autoStartTTS: true });
      } else {
        this.stop();
        const controller = document.getElementById('TTS-Controller');
        if (controller?.firstElementChild) {
          controller.firstElementChild.innerHTML = volumeIcon;
        }
      }
    } catch (e) {
      this.stop();
      alert('TTS Error: ' + e.message);
    }
  };

  start = (element) => {
    this.stop();
    this.started = true;
    const startElement = element ?? reader.chapterElement;
    this.currentElement = startElement;

    // Get all readable elements from the chapter
    this.allReadableElements = this.getAllReadableElements(
      reader.chapterElement
    );
    this.totalElements = this.allReadableElements.length;
    this.textQueue = this.allReadableElements
      .map((el) => this.normalizeText(el.innerText))
      .filter((text) => !!text);
    reader.post({
      type: 'tts-queue',
      data: {
        queue: this.textQueue,
        startIndex: this.elementsRead,
      },
    });

    // If starting from a specific element, count how many are before it
    if (element && element !== reader.chapterElement) {
      const startIndex = this.allReadableElements.indexOf(element);
      this.elementsRead = startIndex >= 0 ? startIndex : 0;
    } else {
      this.elementsRead = 0;
    }

    this.next();
  };

  // Get all readable elements in order
  getAllReadableElements = (element) => {
    const elements = [];
    const traverse = (el) => {
      if (!el) return;
      if (this.readable(el)) {
        elements.push(el);
      }
      for (let i = 0; i < el.children.length; i++) {
        traverse(el.children[i]);
      }
    };
    traverse(element);
    return elements;
  };

  resume = () => {
    if (!this.reading) {
      if (
        this.currentElement &&
        this.currentElement.id !== 'LNReader-chapter'
      ) {
        this.speak();
        this.reading = true;
      } else {
        this.next();
      }
    }
  };

  pause = () => {
    this.reading = false;
    reader.post({ type: 'pause-speak' });
    reader.post({ type: 'tts-state', data: { isReading: false } });
  };

  rewind = () => {
    if (!this.started || !this.currentElement) return;
    reader.post({ type: 'pause-speak' });
    this.reading = true;
    this.speak();
  };

  seekTo = (index) => {
    if (!this.started || !this.allReadableElements.length) return;
    const targetIndex = Math.max(0, Math.min(index, this.totalElements - 1));
    reader.post({ type: 'pause-speak' });
    this.currentElement?.classList?.remove('highlight');
    this.elementsRead = targetIndex;
    this.currentElement = this.allReadableElements[targetIndex];
    this.reading = true;
    this.elementsRead++;
    this.speak();
  };

  stop = () => {
    reader.post({ type: 'stop-speak' });
    this.currentElement?.classList?.remove('highlight');
    this.prevElement = null;
    this.currentElement = reader.chapterElement;
    this.started = false;
    this.reading = false;
    this.elementsRead = 0;
    this.totalElements = 0;
    this.allReadableElements = [];
    this.textQueue = [];
    reader.post({ type: 'tts-state', data: { isReading: false } });
    // Ensure icon updates to stopped state
    const controller = document.getElementById('TTS-Controller');
    if (controller?.firstElementChild) {
      controller.firstElementChild.innerHTML = volumeIcon;
    }
  };

  isElementInViewport = (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const windowWidth =
      window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    );
  };

  // UPDATED: Scroll to top or center based on settings with padding for notch/camera
  // In page reader mode, navigate to the correct page instead of scrolling
  scrollToElement = (element) => {
    if (!element) return;

    // Page reader mode: navigate to the page containing this element
    if (reader.generalSettings.val.pageReader) {
      const rect = element.getBoundingClientRect();
      const chapterRect = reader.chapterElement.getBoundingClientRect();
      // Calculate offset from the chapter element's left edge
      const offsetX = rect.left - chapterRect.left;
      const pageWidth = window.innerWidth;
      const targetPage = Math.floor(offsetX / pageWidth);
      if (
        targetPage !== pageReader.page.val &&
        targetPage >= 0 &&
        targetPage < pageReader.totalPages.val
      ) {
        pageReader.movePage(targetPage);
      }
      return;
    }
    // Check if element is partially visible (at least some part is in viewport)
    const rect = element.getBoundingClientRect();
    const windowHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const isPartiallyVisible =
      rect.top < windowHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0;

    // Only scroll if element is not visible or barely visible
    if (!isPartiallyVisible || rect.top < 0 || rect.bottom > windowHeight) {
      // Check scrollToTop setting (default to true for better reading experience)
      const scrollToTop = reader.readerSettings.val.tts?.scrollToTop !== false;

      if (scrollToTop) {
        // Scroll to top with padding for notch/camera (80px from top)
        const elementTop =
          element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementTop - 80; // 80px padding for notch/camera

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      } else {
        // Center scroll (original behavior)
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }
  };

  speak = () => {
    if (!this.currentElement) return;
    this.prevElement = this.currentElement;
    this.scrollToElement(this.currentElement);
    this.currentElement.classList.add('highlight');
    const text = this.normalizeText(this.currentElement.innerText);
    if (text) {
      reader.post({
        type: 'speak',
        data: text,
        index: this.elementsRead - 1,
        total: this.totalElements,
      });
      reader.post({ type: 'tts-state', data: { isReading: true } });
    } else {
      this.next();
    }
  };

  setLoading = (loading) => {
    const controller = document.getElementById('TTS-Controller');
    if (controller) {
      if (loading) {
        controller.classList.add('loading');
      } else {
        controller.classList.remove('loading');
      }
    }
  };
}

window.tts = new TTS();

// Watch for TTSEnable changes and stop TTS when disabled
van.derive(() => {
  if (!reader.generalSettings.val.TTSEnable && window.tts) {
    if (tts.reading || tts.started) {
      tts.stop();
    }
  }
});
