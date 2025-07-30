package delivery

type ConvertRequest struct {
	MarkdownText string `json:"markdown_text"`
}

type ConverterResponse struct {
	HtmlText string `json:"html_text"`
}
