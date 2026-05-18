## LNReader eXtended

This is a modified version for my personal use. It is perfectly compatible with the original LNReader's plugins and backup files, allowing you to easily migrate to this application.

> [!WARNING]  
> This version is not recommended for production use.

> [!CAUTION]  
> Despite having a similar icon and app name, this application is not affiliated with the original app (I just haven't come up with a better icon and name yet).

> [!NOTE]  
> This fork uses AI slop.

---

### Screenshots

|                             App Lock                             |                             Book Detail                              |                             Reader                              |                         Translate Setting                          |
| :--------------------------------------------------------------: | :------------------------------------------------------------------: | :-------------------------------------------------------------: | :----------------------------------------------------------------: |
| <img src="./.github/readme-images/v2/applock.jpg" width="220" /> | <img src="./.github/readme-images/v2/book_detail.jpg" width="220" /> | <img src="./.github/readme-images/v2/reader.jpg" width="220" /> | <img src="./.github/readme-images/v2/translate.jpg" width="220" /> |

### Key Changes from the Original LNReader

- **Advanced Light Novel Structure**: Partial support for organizing Japanese Light Novels into "series" and "volumes" based on the legacy Page structure.
- **Auto HTTPS Upgrade**: The reader WebView now automatically upgrades insecure HTTP connections to HTTPS.
- ~~**Default DNS over HTTPS (DoH)**: Implemented DoH by default using Cloudflare's 1.1.1.1 for enhanced privacy and bypass.~~ https://github.com/Yuneko-dev/lnreader-extended/issues/8
- **EPUB Image Fixes**: Fixed bugs causing missing images when exporting image-heavy novels to EPUB (also resolved issues when importing these EPUB files).
- **EPUB Import Permissions**: Fixed file read permission errors that occurred when importing EPUBs.
- **Novel Translation**: Implemented in-app novel translation capabilities using Google Translate and LLMs.
- **App Lock & Privacy**: Added custom App Lock and prevented taking screenshots to protect privacy.
- **Smooth Backups**: Optimized the Backup & Restore menu to prevent UI freezes.
- **Developer Tools**: Added a Debug menu and a Storage/Cache viewer.
- **UI Enhancements**: Minor but meaningful tweaks and improvements to the user interface.
- **Samsung S-Pen Air Actions (Only on N10-N20U/S21U-S24U/Tab S6-Tab S10U)**: Support for Samsung users with S-Pen to control without touching the screen when reading. 
---

<details>
<summary><b>Original README</b> (Click to expand/collapse)</summary>

<p align="center">
  <a href="https://lnreader.app">
    <img src="./.github/readme-images/icon_new.png" align="center" width="128" />
  </a>
</p>

<h1 align="center">LNReader</h1>

<p align="center">
  LNReader is a free and open source light novel reader for Android, inspired by Tachiyomi.
</p>

<div align="center">
  <a href="https://discord.gg/QdcWN4MD63">
    <img alt="Discord Chat" src="https://img.shields.io/discord/835746409357246465.svg?logo=discord&logoColor=white&logoWidth=20&labelColor=5865F2&color=4752C4&label=discord&style=flat">
  </a>
  <a href="https://github.com/lnreader/lnreader/releases">
    <img alt="GitHub Downloads" src="https://img.shields.io/github/downloads/lnreader/lnreader/total?label=downloads&labelColor=27303D&color=0D1117&logo=github&logoColor=FFFFFF&style=flat">
  </a>
</div>

<div align="center">
  <img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/lnreader/lnreader/build.yml?labelColor=27303D&style=flat">
  <a href="https://github.com/lnreader/lnreader/blob/main/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/lnreader/lnreader?labelColor=27303D&color=1a73e8&style=flat">
  </a>
  <a title="Crowdin" target="_blank" href="https://crowdin.com/project/lnreader">
    <img src="https://badges.crowdin.net/lnreader/localized.svg">
  </a>
</div>

<h2 align="center">Download</h2>

<p align="center">
  <a href="https://github.com/lnreader/lnreader/releases/latest">
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/lnreader/lnreader?label=Stable&labelColor=0d7377&color=084c4e&style=flat">
  </a>
  <a href="https://github.com/lnreader/lnreader/releases/latest">
    <img alt="GitHub release (latest SemVer)" src="https://img.shields.io/github/v/release/lnreader/lnreader?include_prereleases&sort=semver&label=Beta&labelColor=3d3d5c&color=2a2a47&style=flat">
  </a>
</p>

<p align="center">
  Get the app from our <a href="https://github.com/lnreader/lnreader/releases">releases page</a>.
</p>

<p align="center">
  <em>Android 7.0 or higher.</em>
</p>

<h2 align="center">Screenshots</h2>

<p align="center">
  <img src="./.github/readme-images/screenshots.png" align="center" />
</p>

## Plugins

LNReader does not have any affiliation with the content providers available.

Plugin requests should be created at [lnreader-plugins](https://github.com/lnreader/lnreader-plugins).

## Translation

Help translate LNReader into your language on [Crowdin](https://crowdin.com/project/lnreader).

## Building & Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

[MIT](https://github.com/lnreader/lnreader/blob/main/LICENSE)

</details>
