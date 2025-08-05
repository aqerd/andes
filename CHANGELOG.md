# Changelog

### Current: 0.5
All notable changes for Andes will be documented in this file.
Versions lower than `1.0` are betas.
Note that I don't believe in patches and `0.1` is equal to `0.1.0` and all patches should be zero.
All dates are in `DD.MM.YYYY` format.

## 0.5 (current, 05.08.2025)
- Code working and analyze (file linking, diffs, etc);
- Style code blocks in CSS;
- Containerization.

## 0.4 (02.08.2025, [#12](https://github.com/aqerd/andes/pull/12))
- Chat generation and memory;
- Clear button now removes all messages;
- Small CSS fixes like plugin width, messages dissapearing when plugin is closed or hidden and user responses they are now starting in newline.

## 0.3 (31.07.2025, [#11](https://github.com/aqerd/andes/pull/11))
- Fixed icons;
- Markdown converter to HTML, written in Golang and CSS for think tags ([#4](https://github.com/aqerd/andes/issues/4));
- Added support for thinking models;
- LLM's responses are now signed.

## 0.2 (30.07.2025, [#2](https://github.com/aqerd/andes/pull/2))
- Removed Golang code, because frontend now directly connects with Ollama's API;
- Added error handling for API requests;
- Plugin now has a little bit prettier interface;
- Added support for multiple models.

## 0.1 (29.07.2025, [#1](https://github.com/aqerd/andes/pull/1))
- Initial release.
