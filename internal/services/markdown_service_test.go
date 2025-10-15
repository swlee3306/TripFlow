package services

import (
	"strings"
	"testing"
)

func TestMarkdownToHTML(t *testing.T) {
	service := &MarkdownService{}

	tests := []struct {
		name     string
		markdown string
		contains []string // Check if HTML contains these strings
	}{
		{
			name:     "Simple heading",
			markdown: "# Hello World",
			contains: []string{"<h1>Hello World</h1>"},
		},
		{
			name:     "Paragraph",
			markdown: "This is a paragraph.",
			contains: []string{"<p>This is a paragraph.</p>"},
		},
		{
			name:     "Bold text",
			markdown: "**Bold text**",
			contains: []string{"<strong>Bold text</strong>"},
		},
		{
			name:     "List",
			markdown: "- Item 1\n- Item 2",
			contains: []string{"<ul>", "<li>Item 1</li>", "<li>Item 2</li>", "</ul>"},
		},
		{
			name:     "XSS protection",
			markdown: "<script>alert('xss')</script>",
			contains: []string{""}, // Should be empty or sanitized
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			html, err := service.markdownToHTML(tt.markdown)
			if err != nil {
				t.Errorf("markdownToHTML() error = %v", err)
				return
			}
			
			for _, expected := range tt.contains {
				if expected == "" {
					// For XSS test, check that script tag is removed
					if strings.Contains(html, "<script>") {
						t.Errorf("markdownToHTML() contains script tag, should be sanitized: %v", html)
					}
				} else if !strings.Contains(html, expected) {
					t.Errorf("markdownToHTML() = %v, should contain %v", html, expected)
				}
			}
		})
	}
}

func TestExtractTitleAndDescription(t *testing.T) {
	service := &MarkdownService{}

	tests := []struct {
		name        string
		markdown    string
		wantTitle   string
		wantDesc    string
	}{
		{
			name:        "With title and description",
			markdown:    "# My Title\n\nThis is a description.",
			wantTitle:   "My Title",
			wantDesc:    "This is a description.",
		},
		{
			name:        "Only title",
			markdown:    "# Only Title",
			wantTitle:   "Only Title",
			wantDesc:    "",
		},
		{
			name:        "Only description",
			markdown:    "This is only a description.",
			wantTitle:   "",
			wantDesc:    "This is only a description.",
		},
		{
			name:        "Multiple headings",
			markdown:    "# First Title\n\n# Second Title\n\nDescription here.",
			wantTitle:   "First Title",
			wantDesc:    "Description here.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			title, desc := service.extractTitleAndDescription(tt.markdown)
			if title != tt.wantTitle {
				t.Errorf("extractTitleAndDescription() title = %v, want %v", title, tt.wantTitle)
			}
			if desc != tt.wantDesc {
				t.Errorf("extractTitleAndDescription() description = %v, want %v", desc, tt.wantDesc)
			}
		})
	}
}

func TestFindInternalImages(t *testing.T) {
	service := &MarkdownService{}

	tests := []struct {
		name           string
		markdown       string
		wantImages     []string
	}{
		{
			name:           "No images",
			markdown:       "Just text content.",
			wantImages:     []string{},
		},
		{
			name:           "Internal images",
			markdown:       "![alt](image.png) ![alt2](local/image.jpg)",
			wantImages:     []string{"image.png", "local/image.jpg"},
		},
		{
			name:           "External images",
			markdown:       "![alt](https://example.com/image.png) ![alt2](http://example.com/image.jpg)",
			wantImages:     []string{},
		},
		{
			name:           "Mixed images",
			markdown:       "![alt](local.png) ![alt2](https://external.com/image.jpg) ![alt3](another.png)",
			wantImages:     []string{"local.png", "another.png"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			images, err := service.findInternalImages(tt.markdown)
			if err != nil {
				t.Errorf("findInternalImages() error = %v", err)
				return
			}
			if len(images) != len(tt.wantImages) {
				t.Errorf("findInternalImages() = %v, want %v", images, tt.wantImages)
			}
		})
	}
}
