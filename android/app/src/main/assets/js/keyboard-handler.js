/* eslint-disable */

// keyboard handler (desktop / WSA: PgUp / PgDown / arrows / space)
;(() => {
  const isEditableTarget = el => {
    if (!el) {
      return false;
    }
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      return true;
    }
    return el.isContentEditable === true;
  };

  document.addEventListener('keydown', e => {
    if (isEditableTarget(e.target)) {
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    if (reader.generalSettings.val.pageReader) {
      if (
        e.key === 'PageDown' ||
        e.key === 'ArrowRight' ||
        e.key === ' ' ||
        e.key === 'Spacebar'
      ) {
        e.preventDefault();
        pageReader.movePage(pageReader.page.val + 1);
        return;
      }
      if (e.key === 'PageUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        pageReader.movePage(pageReader.page.val - 1);
        return;
      }
      return;
    }

    if (
      e.key === 'PageDown' ||
      e.key === 'ArrowDown' ||
      e.key === ' ' ||
      e.key === 'Spacebar'
    ) {
      e.preventDefault();
      window.scrollBy({
        top: reader.layoutHeight * 0.75,
        behavior: 'smooth',
      });
      return;
    }
    if (e.key === 'PageUp' || e.key === 'ArrowUp') {
      e.preventDefault();
      window.scrollBy({
        top: -reader.layoutHeight * 0.75,
        behavior: 'smooth',
      });
    }
  });
})();
