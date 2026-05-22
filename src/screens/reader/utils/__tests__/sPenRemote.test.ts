import {
  buildSPenPageNavigationScript,
  handleSPenRemoteEvent,
  SPEN_REMOTE_EVENTS,
} from '../sPenRemote';

describe('sPenRemote', () => {
  const navigateChapter = jest.fn();
  const injectJavaScript = jest.fn();
  const deps = {
    navigateChapter,
    webViewRef: {
      current: {
        injectJavaScript,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('injects next page navigation script', () => {
    handleSPenRemoteEvent(deps as any, SPEN_REMOTE_EVENTS.NEXT_PAGE);

    expect(injectJavaScript).toHaveBeenCalledWith(
      buildSPenPageNavigationScript('NEXT'),
    );
    expect(navigateChapter).not.toHaveBeenCalled();
  });

  it('injects previous page navigation script', () => {
    handleSPenRemoteEvent(deps as any, SPEN_REMOTE_EVENTS.PREV_PAGE);

    expect(injectJavaScript).toHaveBeenCalledWith(
      buildSPenPageNavigationScript('PREV'),
    );
    expect(navigateChapter).not.toHaveBeenCalled();
  });

  it('navigates to next chapter', () => {
    handleSPenRemoteEvent(deps as any, SPEN_REMOTE_EVENTS.NEXT_CHAPTER);

    expect(navigateChapter).toHaveBeenCalledWith('NEXT');
    expect(injectJavaScript).not.toHaveBeenCalled();
  });

  it('navigates to previous chapter', () => {
    handleSPenRemoteEvent(deps as any, SPEN_REMOTE_EVENTS.PREV_CHAPTER);

    expect(navigateChapter).toHaveBeenCalledWith('PREV');
    expect(injectJavaScript).not.toHaveBeenCalled();
  });
});
