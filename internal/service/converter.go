package service

import (
	"bytes"
	"strings"
	"unicode"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/renderer/html"
)

func Convert(markdown_text string) string {
	const thinkTagOpen = "<think>"
	const thinkTagClose = "</think>"

	md := goldmark.New(
		goldmark.WithExtensions(extension.GFM),
		goldmark.WithRendererOptions(html.WithUnsafe()),
	)

	textToConvert := markdown_text

	startIndex := strings.Index(textToConvert, thinkTagOpen)
	endIndex := strings.Index(textToConvert, thinkTagClose)

	if startIndex != -1 && endIndex != -1 && endIndex > startIndex {
		content := strings.TrimSpace(textToConvert[startIndex+len(thinkTagOpen) : endIndex])

		if content != "" {
			endOfCloseTag := endIndex + len(thinkTagClose)
			endOfWhitespace := endOfCloseTag
			for endOfWhitespace < len(textToConvert) && unicode.IsSpace(rune(textToConvert[endOfWhitespace])) {
				endOfWhitespace++
			}

			chunkToReplace := textToConvert[startIndex:endOfWhitespace]

			final_think_html := "<details><summary>Thoughts</summary><div class=\"summary-content\">" + content + "</div></details>"

			textToConvert = strings.Replace(textToConvert, chunkToReplace, final_think_html, 1)
		} else {
			fullBlock := textToConvert[startIndex : endIndex+len(thinkTagClose)]
			textToConvert = strings.Replace(textToConvert, fullBlock, "", 1)
		}
	}

	var buf bytes.Buffer
	if err := md.Convert([]byte(textToConvert), &buf); err != nil {
		panic(err)
	}

	finalResult := buf.String()

	wrapperP_open := "<p>" + "<details>"
	wrapperP_close := "</details>" + "</p>"
	if strings.HasPrefix(finalResult, wrapperP_open) && strings.HasSuffix(finalResult, wrapperP_close) {
		finalResult = strings.TrimPrefix(finalResult, "<p>")
		finalResult = strings.TrimSuffix(finalResult, "</p>")
	}

	return finalResult
}
