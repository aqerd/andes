package service

import (
	"bytes"
	"github.com/yuin/goldmark"
)

func Convert(markdown_text string) string {
	var buf bytes.Buffer
	if err := goldmark.Convert([]byte(markdown_text), &buf); err != nil {
		panic(err)
	}
	return buf.String()
}
