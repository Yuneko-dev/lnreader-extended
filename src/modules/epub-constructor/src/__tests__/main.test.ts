import EpubFile from '../main';

jest.mock('react-native-quick-crypto', () => ({
  randomUUID: jest.fn(() => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
}));

describe('EpubFile.constructEpub', () => {
  it('wires custom JavaScript only into scripted EPUB chapter artifacts', async () => {
    const customJavaScript = 'document.body.dataset.ready = "true";';
    const scriptedFiles = await new EpubFile({
      title: 'Scripted Book',
      bookId: 'scripted-book-id',
      js: customJavaScript,
      chapters: [
        {
          title: 'Chapter One',
          htmlBody: '<p id="chapter-body">Chapter body</p>',
        },
      ],
    }).constructEpub();

    expect(
      scriptedFiles.find(file => file.path === 'EPUB/script.js')?.content,
    ).toBe(`function fnEpub(){${customJavaScript}}`);

    const scriptedChapters = scriptedFiles.filter(file =>
      /^EPUB\/content\/.*\.xhtml$/.test(file.path),
    );
    expect(scriptedChapters).toHaveLength(1);
    scriptedChapters.forEach(chapter => {
      const chapterBodyIndex = chapter.content.indexOf(
        '<p id="chapter-body">Chapter body</p>',
      );
      const scriptReferenceIndex = chapter.content.indexOf(
        '<script src="../script.js"></script>',
      );
      const invocationIndex = chapter.content.indexOf(
        '<script>fnEpub();</script>',
      );
      const bodyCloseIndex = chapter.content.indexOf('</body>');

      expect(chapterBodyIndex).toBeGreaterThan(-1);
      expect(scriptReferenceIndex).toBeGreaterThan(chapterBodyIndex);
      expect(invocationIndex).toBeGreaterThan(scriptReferenceIndex);
      expect(bodyCloseIndex).toBeGreaterThan(invocationIndex);
    });

    const packageDocument = scriptedFiles.find(
      file => file.path === 'EPUB/package.opf',
    )?.content;
    expect(packageDocument).toContain(
      '<item id="script" href="script.js" media-type="text/javascript"/>',
    );
    expect(packageDocument).toContain('properties="scripted"');

    const plainFiles = await new EpubFile({
      title: 'Plain Book',
      bookId: 'plain-book-id',
      chapters: [
        {
          title: 'Chapter One',
          htmlBody: '<p id="chapter-body">Chapter body</p>',
        },
      ],
    }).constructEpub();

    expect(plainFiles.some(file => file.path === 'EPUB/script.js')).toBe(false);

    const plainChapters = plainFiles.filter(file =>
      /^EPUB\/content\/.*\.xhtml$/.test(file.path),
    );
    expect(plainChapters).toHaveLength(1);
    plainChapters.forEach(chapter => {
      expect(chapter.content).not.toContain('<script');
      expect(chapter.content).not.toContain('fnEpub()');
    });
  });
});
