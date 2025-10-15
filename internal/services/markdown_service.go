package services

import (
	"bytes"
	"fmt"
	"io"
	"regexp"
	"strings"

	"tripflow/pkg/filestorage"

	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
)

// MarkdownService handles markdown processing
type MarkdownService struct {
	fileStorage filestorage.FileStorageService
}

// NewMarkdownService creates a new MarkdownService
func NewMarkdownService(fileStorage filestorage.FileStorageService) *MarkdownService {
	return &MarkdownService{
		fileStorage: fileStorage,
	}
}

// ProcessedContent represents the result of markdown processing
type ProcessedContent struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	HTMLContent string `json:"html_content"`
}

// ProcessMarkdown processes markdown content and returns processed content
func (s *MarkdownService) ProcessMarkdown(markdownContent string) (*ProcessedContent, error) {
	// Convert markdown to HTML
	htmlContent, err := s.markdownToHTML(markdownContent)
	if err != nil {
		return nil, fmt.Errorf("failed to convert markdown to HTML: %w", err)
	}

	// Extract title and description
	title, description := s.extractTitleAndDescription(markdownContent)

	// Process images in HTML
	processedHTML, err := s.processImages(htmlContent)
	if err != nil {
		return nil, fmt.Errorf("failed to process images: %w", err)
	}

	return &ProcessedContent{
		Title:       title,
		Description: description,
		HTMLContent: processedHTML,
	}, nil
}

// markdownToHTML converts markdown to HTML with XSS protection
func (s *MarkdownService) markdownToHTML(markdown string) (string, error) {
	// Create goldmark instance
	md := goldmark.New(
		goldmark.WithExtensions(),
	)

	// Convert markdown to HTML
	var buf bytes.Buffer
	if err := md.Convert([]byte(markdown), &buf); err != nil {
		return "", err
	}

	// Sanitize HTML to prevent XSS
	p := bluemonday.UGCPolicy()
	sanitizedHTML := p.Sanitize(buf.String())

	return sanitizedHTML, nil
}

// extractTitleAndDescription extracts title and description from markdown
func (s *MarkdownService) extractTitleAndDescription(markdown string) (string, string) {
	// Create goldmark instance for parsing
	md := goldmark.New()
	reader := text.NewReader([]byte(markdown))
	doc := md.Parser().Parse(reader)

	var title, description string

	// Walk through the AST to find first H1 and first paragraph
	ast.Walk(doc, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}

		switch n := node.(type) {
		case *ast.Heading:
			if n.Level == 1 && title == "" {
				// Extract text from heading
				var buf bytes.Buffer
				for child := n.FirstChild(); child != nil; child = child.NextSibling() {
					if textNode, ok := child.(*ast.Text); ok {
						buf.Write(textNode.Segment.Value(reader.Source()))
					}
				}
				title = strings.TrimSpace(buf.String())
			}
		case *ast.Paragraph:
			if description == "" {
				// Extract text from paragraph
				var buf bytes.Buffer
				for child := n.FirstChild(); child != nil; child = child.NextSibling() {
					if textNode, ok := child.(*ast.Text); ok {
						buf.Write(textNode.Segment.Value(reader.Source()))
					}
				}
				description = strings.TrimSpace(buf.String())
			}
		}
		return ast.WalkContinue, nil
	})

	return title, description
}

// processImages processes images in HTML content
func (s *MarkdownService) processImages(htmlContent string) (string, error) {
	// For now, return the HTML content as-is
	// TODO: Implement image processing in future subtasks
	return htmlContent, nil
}

// ProcessMarkdownFromFile processes markdown from a file path
func (s *MarkdownService) ProcessMarkdownFromFile(filePath string) (*ProcessedContent, error) {
	// Read file from storage
	fileReader, err := s.fileStorage.GetFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	
	// Check if fileReader implements io.Closer
	if closer, ok := fileReader.(io.Closer); ok {
		defer closer.Close()
	}

	// Read file content
	content, err := io.ReadAll(fileReader)
	if err != nil {
		return nil, fmt.Errorf("failed to read file content: %w", err)
	}

	// Process markdown
	return s.ProcessMarkdown(string(content))
}

// findInternalImages finds internal image paths in markdown content
func (s *MarkdownService) findInternalImages(markdownContent string) ([]string, error) {
	var internalImages []string

	// Regex to find image links: ![alt](path)
	imageRegex := regexp.MustCompile(`!\[.*?\]\(([^)]+)\)`)
	matches := imageRegex.FindAllStringSubmatch(markdownContent, -1)

	for _, match := range matches {
		if len(match) > 1 {
			imagePath := match[1]
			// Check if it's an internal path (not starting with http:// or https://)
			if !strings.HasPrefix(imagePath, "http://") && !strings.HasPrefix(imagePath, "https://") {
				internalImages = append(internalImages, imagePath)
			}
		}
	}

	return internalImages, nil
}
