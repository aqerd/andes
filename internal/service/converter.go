package service

import (
	"bytes"
	"fmt"
	"strings"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/renderer/html"
)

func Convert(markdown_text string) string {
	const thinkTagOpen = "<think>"
	const thinkTagClose = "</think>"
	const placeholder = "<!--THINK_BLOCK_PLACEHOLDER-->"

	md := goldmark.New(
		goldmark.WithExtensions(extension.GFM),
		goldmark.WithRendererOptions(html.WithUnsafe()),
	)

	textToConvert := markdown_text
	var final_think string

	startIndex := strings.Index(markdown_text, thinkTagOpen)
	endIndex := strings.Index(markdown_text, thinkTagClose)

	if startIndex != -1 && endIndex != -1 && endIndex > startIndex {
		fullBlock := markdown_text[startIndex : endIndex+len(thinkTagClose)]
		content := strings.TrimSpace(markdown_text[startIndex+len(thinkTagOpen) : endIndex])
		fmt.Println("cntnt:", content)
		if content != "" {
			textToConvert = strings.Replace(markdown_text, fullBlock, placeholder, 1)
			fmt.Println("textToConvert:", textToConvert)
			fmt.Println("fullBlock:", fullBlock)

			final_think = "<details><summary>Thinking mode</summary><div class=\"summary-content\">" + fullBlock + "</div></details>"
		} else {
			textToConvert = strings.Replace(markdown_text, fullBlock, "", 1)
		}
	}

	var buf bytes.Buffer
	if err := md.Convert([]byte(textToConvert), &buf); err != nil {
		panic(err)
	}

	finalResult := buf.String()

	if final_think != "" {
		finalResult = strings.Replace(finalResult, placeholder, final_think, 1)
	}

	fmt.Println(finalResult)
	fmt.Println("------------------")
	fmt.Println(markdown_text)
	return finalResult
}
