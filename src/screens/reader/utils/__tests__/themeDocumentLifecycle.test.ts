import fs from 'fs';
import path from 'path';

describe('reader theme document lifecycle', () => {
  it('preserves custom DOM when an unrelated setting reruns reactive derives', () => {
    const themeScript = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../../android/app/src/main/assets/js/theme.js',
      ),
      'utf8',
    );
    const derives: Array<() => void> = [];
    const chapterElement = { innerHTML: '<p>Original chapter body</p>' };
    const reader = {
      rawHTML: '<p>Original chapter body</p>',
      chapterElement,
      readerSettings: {
        val: {
          theme: '#111111',
          padding: 16,
          paragraphIndent: 0,
          paragraphSpacing: 1,
          textSize: 16,
          textColor: '#eeeeee',
          textAlign: 'left',
          lineHeight: 1.5,
          fontFamily: '',
        },
      },
      generalSettings: {
        val: {
          bionicReading: false,
          removeExtraParagraphSpacing: false,
          showBatteryAndTime: false,
        },
      },
    };
    const documentBoundary = {
      documentElement: { style: { setProperty: jest.fn() } },
      fonts: {
        add: jest.fn(),
        delete: jest.fn(),
        forEach: jest.fn(),
      },
    };

    // Evaluate the shipped asset itself within the bounded reader globals.
    // eslint-disable-next-line no-new-func
    new Function(
      'van',
      'reader',
      'document',
      'FontFace',
      'textVide',
      themeScript,
    )(
      {
        derive: (derive: () => void) => {
          derives.push(derive);
          derive();
        },
      },
      reader,
      documentBoundary,
      class FontFace {
        load() {
          return Promise.resolve(this);
        }
      },
      { textVide: (html: string) => html },
    );

    const customDOM =
      '<p>Original chapter body<button id="plugin-control">Play</button></p>';
    chapterElement.innerHTML = customDOM;
    reader.generalSettings.val = {
      ...reader.generalSettings.val,
      showBatteryAndTime: true,
    };
    derives.forEach(derive => derive());

    expect(chapterElement.innerHTML).toBe(customDOM);
  });
});
