package models

import (
	"time"

	"github.com/jinzhu/gorm"
)

// TextAnalysis represents a text analysis record
type TextAnalysis struct {
	ID         uint                 `json:"id" gorm:"primary_key"`
	Text       string               `json:"text" gorm:"type:text;not null"`
	Language   string               `json:"language" gorm:"default:'en'"`
	Sentiment  SentimentAnalysis    `json:"sentiment" gorm:"embedded"`
	Keywords   []Keyword            `json:"keywords,omitempty" gorm:"foreignkey:AnalysisID"`
	Entities   []Entity             `json:"entities,omitempty" gorm:"foreignkey:AnalysisID"`
	Readability ReadabilityAnalysis `json:"readability" gorm:"embedded"`
	Metadata   map[string]string    `json:"metadata" gorm:"type:jsonb"`
	IsPublic   bool                 `json:"is_public" gorm:"default:false"`
	CreatedAt  time.Time            `json:"created_at"`
	UpdatedAt  time.Time            `json:"updated_at"`
}

// SentimentAnalysis represents sentiment analysis results
type SentimentAnalysis struct {
	Score      float64 `json:"score" gorm:"column:sentiment_score"`           // -1 to 1
	Label      string  `json:"label" gorm:"column:sentiment_label"`           // positive, negative, neutral
	Confidence float64 `json:"confidence" gorm:"column:sentiment_confidence"` // 0 to 1
}

// Keyword represents a keyword extracted from text
type Keyword struct {
	ID         uint    `json:"id" gorm:"primary_key"`
	AnalysisID uint    `json:"analysis_id" gorm:"index"`
	Word       string  `json:"word" gorm:"not null"`
	Frequency  int     `json:"frequency" gorm:"not null"`
	Relevance  float64 `json:"relevance" gorm:"not null"`
	CreatedAt  time.Time `json:"created_at"`
}

// Entity represents a named entity extracted from text
type Entity struct {
	ID         uint    `json:"id" gorm:"primary_key"`
	AnalysisID uint    `json:"analysis_id" gorm:"index"`
	Text       string  `json:"text" gorm:"not null"`
	Type       string  `json:"type" gorm:"not null"` // person, organization, location, other
	Confidence float64 `json:"confidence" gorm:"not null"`
	StartPos   int     `json:"start_pos,omitempty"`
	EndPos     int     `json:"end_pos,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// ReadabilityAnalysis represents readability analysis results
type ReadabilityAnalysis struct {
	Score float64 `json:"score" gorm:"column:readability_score"` // 0 to 100
	Level string  `json:"level" gorm:"column:readability_level"` // Very Easy, Easy, etc.
}

// AnalyzeTextRequest represents request to analyze text
type AnalyzeTextRequest struct {
	Text     string            `json:"text" binding:"required"`
	Language string            `json:"language"`
	Metadata map[string]string `json:"metadata"`
	IsPublic bool              `json:"is_public"`
}

// BatchAnalyzeTextRequest represents request to analyze multiple texts
type BatchAnalyzeTextRequest struct {
	Texts []AnalyzeTextRequest `json:"texts" binding:"required"`
}

// TextAnalysisResponse represents the response format for text analysis
type TextAnalysisResponse struct {
	ID          uint                    `json:"id"`
	Text        string                  `json:"text"`
	Language    string                  `json:"language"`
	Sentiment   SentimentAnalysis       `json:"sentiment"`
	Keywords    []KeywordResponse       `json:"keywords,omitempty"`
	Entities    []EntityResponse        `json:"entities,omitempty"`
	Readability ReadabilityAnalysis     `json:"readability"`
	Statistics  TextStatistics          `json:"statistics"`
	Metadata    map[string]string       `json:"metadata"`
	IsPublic    bool                    `json:"is_public"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

// KeywordResponse represents the response format for keywords
type KeywordResponse struct {
	ID        uint    `json:"id"`
	Word      string  `json:"word"`
	Frequency int     `json:"frequency"`
	Relevance float64 `json:"relevance"`
}

// EntityResponse represents the response format for entities
type EntityResponse struct {
	ID         uint    `json:"id"`
	Text       string  `json:"text"`
	Type       string  `json:"type"`
	Confidence float64 `json:"confidence"`
	StartPos   int     `json:"start_pos,omitempty"`
	EndPos     int     `json:"end_pos,omitempty"`
}

// TextStatistics represents additional text statistics
type TextStatistics struct {
	WordCount              int     `json:"word_count"`
	CharacterCount         int     `json:"character_count"`
	SentenceCount          int     `json:"sentence_count"`
	AverageWordsPerSentence float64 `json:"average_words_per_sentence"`
	KeywordDensity         float64 `json:"keyword_density"`
}

// ToResponse converts a TextAnalysis to TextAnalysisResponse
func (ta *TextAnalysis) ToResponse() TextAnalysisResponse {
	response := TextAnalysisResponse{
		ID:          ta.ID,
		Text:        ta.Text,
		Language:    ta.Language,
		Sentiment:   ta.Sentiment,
		Readability: ta.Readability,
		Metadata:    ta.Metadata,
		IsPublic:    ta.IsPublic,
		CreatedAt:   ta.CreatedAt,
		UpdatedAt:   ta.UpdatedAt,
	}

	// Convert keywords
	response.Keywords = make([]KeywordResponse, len(ta.Keywords))
	for i, keyword := range ta.Keywords {
		response.Keywords[i] = KeywordResponse{
			ID:        keyword.ID,
			Word:      keyword.Word,
			Frequency: keyword.Frequency,
			Relevance: keyword.Relevance,
		}
	}

	// Convert entities
	response.Entities = make([]EntityResponse, len(ta.Entities))
	for i, entity := range ta.Entities {
		response.Entities[i] = EntityResponse{
			ID:         entity.ID,
			Text:       entity.Text,
			Type:       entity.Type,
			Confidence: entity.Confidence,
			StartPos:   entity.StartPos,
			EndPos:     entity.EndPos,
		}
	}

	// Calculate statistics
	response.Statistics = ta.CalculateStatistics()

	return response
}

// CalculateStatistics calculates text statistics
func (ta *TextAnalysis) CalculateStatistics() TextStatistics {
	// This would integrate with your existing textUtils.ts logic
	// For now, we'll provide a basic implementation
	words := len(ta.Text) // Simplified - would use proper word counting
	chars := len(ta.Text)
	sentences := 1 // Simplified - would use proper sentence counting
	
	avgWordsPerSentence := float64(words) / float64(sentences)
	keywordDensity := 0.0
	if len(ta.Keywords) > 0 && words > 0 {
		keywordDensity = float64(ta.Keywords[0].Frequency) / float64(words) * 100
	}

	return TextStatistics{
		WordCount:               words,
		CharacterCount:          chars,
		SentenceCount:           sentences,
		AverageWordsPerSentence: avgWordsPerSentence,
		KeywordDensity:          keywordDensity,
	}
}

// BeforeCreate sets default values before creating
func (ta *TextAnalysis) BeforeCreate(scope *gorm.Scope) error {
	if ta.Metadata == nil {
		ta.Metadata = make(map[string]string)
	}
	if ta.Language == "" {
		ta.Language = "en"
	}
	return nil
}