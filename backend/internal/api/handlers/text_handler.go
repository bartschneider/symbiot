package handlers

import (
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/bartosz/stocks-out-for-harambe/backend/internal/models"
	"github.com/bartosz/stocks-out-for-harambe/backend/internal/storage"
	"github.com/gin-gonic/gin"
)

// TextHandler handles text analysis API endpoints
type TextHandler struct {
	db *storage.Database
}

// NewTextHandler creates a new text handler
func NewTextHandler(db *storage.Database) *TextHandler {
	return &TextHandler{db: db}
}

// AnalyzeText analyzes a single text
func (h *TextHandler) AnalyzeText(c *gin.Context) {
	var req models.AnalyzeTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Perform text analysis
	analysis := h.performTextAnalysis(req.Text, req.Language)
	analysis.Metadata = req.Metadata
	analysis.IsPublic = req.IsPublic

	// Save to database
	if err := h.db.Create(&analysis).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save analysis"})
		return
	}

	// Load relationships for response
	h.db.Preload("Keywords").Preload("Entities").First(&analysis, analysis.ID)

	c.JSON(http.StatusCreated, analysis.ToResponse())
}

// BatchAnalyzeText analyzes multiple texts
func (h *TextHandler) BatchAnalyzeText(c *gin.Context) {
	var req models.BatchAnalyzeTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var results []models.TextAnalysisResponse
	var analyses []models.TextAnalysis

	for _, textReq := range req.Texts {
		analysis := h.performTextAnalysis(textReq.Text, textReq.Language)
		analysis.Metadata = textReq.Metadata
		analysis.IsPublic = textReq.IsPublic
		analyses = append(analyses, analysis)
	}

	// Bulk create
	if err := h.db.Create(&analyses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save analyses"})
		return
	}

	// Convert to response format
	for _, analysis := range analyses {
		h.db.Preload("Keywords").Preload("Entities").First(&analysis, analysis.ID)
		results = append(results, analysis.ToResponse())
	}

	c.JSON(http.StatusCreated, gin.H{
		"analyses": results,
		"count":    len(results),
	})
}

// ListAnalyses returns all text analyses
func (h *TextHandler) ListAnalyses(c *gin.Context) {
	var analyses []models.TextAnalysis

	query := h.db.Preload("Keywords").Preload("Entities")

	// Filter by language if provided
	if language := c.Query("language"); language != "" {
		query = query.Where("language = ?", language)
	}

	// Filter by public status
	if public := c.Query("public"); public == "true" {
		query = query.Where("is_public = ?", true)
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&analyses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch analyses"})
		return
	}

	// Convert to response format
	var responses []models.TextAnalysisResponse
	for _, analysis := range analyses {
		responses = append(responses, analysis.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"analyses": responses,
		"page":     page,
		"limit":    limit,
	})
}

// GetAnalysis returns a specific text analysis
func (h *TextHandler) GetAnalysis(c *gin.Context) {
	id := c.Param("id")

	var analysis models.TextAnalysis
	if err := h.db.Preload("Keywords").Preload("Entities").First(&analysis, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Analysis not found"})
		return
	}

	c.JSON(http.StatusOK, analysis.ToResponse())
}

// DeleteAnalysis deletes a text analysis
func (h *TextHandler) DeleteAnalysis(c *gin.Context) {
	id := c.Param("id")

	// Delete keywords and entities first
	h.db.Where("analysis_id = ?", id).Delete(&models.Keyword{})
	h.db.Where("analysis_id = ?", id).Delete(&models.Entity{})

	// Delete analysis
	if err := h.db.Delete(&models.TextAnalysis{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete analysis"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Analysis deleted successfully"})
}

// GetPopularKeywords returns most frequent keywords
func (h *TextHandler) GetPopularKeywords(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	var keywords []models.Keyword
	if err := h.db.
		Select("word, SUM(frequency) as frequency, AVG(relevance) as relevance").
		Group("word").
		Order("frequency DESC").
		Limit(limit).
		Find(&keywords).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch keywords"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"keywords": keywords})
}

// GetPopularEntities returns most frequent entities
func (h *TextHandler) GetPopularEntities(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	entityType := c.Query("type")

	query := h.db.
		Select("text, type, COUNT(*) as frequency, AVG(confidence) as confidence").
		Group("text, type").
		Order("frequency DESC").
		Limit(limit)

	if entityType != "" {
		query = query.Where("type = ?", entityType)
	}

	var entities []struct {
		Text       string  `json:"text"`
		Type       string  `json:"type"`
		Frequency  int     `json:"frequency"`
		Confidence float64 `json:"confidence"`
	}

	if err := query.Find(&entities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch entities"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"entities": entities})
}

// GetSampleTexts returns sample texts for development/testing
func (h *TextHandler) GetSampleTexts(c *gin.Context) {
	samples := map[string]string{
		"positive": "This amazing product has completely transformed our workflow! The user interface is incredibly intuitive and beautiful. Our team loves how efficient and powerful the features are. Customer support is outstanding and always helpful. We've seen fantastic results and would definitely recommend this to everyone. It's a perfect solution that exceeds all expectations.",

		"negative": "This terrible software is a complete waste of time and money. The interface is confusing and difficult to navigate. Nothing works as advertised and the performance is awful. Customer support is useless and unhelpful. We're frustrated and disappointed with this poor quality product. It's broken, slow, and causes more problems than it solves.",

		"neutral": "The software provides basic functionality for data management. Users can create, edit, and delete records through the interface. The system includes standard features such as search, filter, and export capabilities. Documentation is available in the help section. Regular updates are released quarterly to address issues and add features.",

		"technical": "The React application utilizes TypeScript for type safety and Framer Motion for animations. The architecture implements a component-based design with custom hooks for state management. Data visualization is handled through Recharts library with responsive design patterns. The build process leverages Vite for optimal performance and development experience. Code splitting and lazy loading ensure efficient bundle sizes.",

		"business": "Our quarterly revenue increased by 15% compared to last year, demonstrating strong market performance. The company expanded operations to three new regions, establishing strategic partnerships with key industry leaders. Customer satisfaction scores improved significantly, with retention rates reaching 92%. Investment in research and development continues to drive innovation and competitive advantage in the marketplace.",
	}

	category := c.Query("category")
	if category != "" {
		if text, exists := samples[category]; exists {
			c.JSON(http.StatusOK, gin.H{
				"category": category,
				"text":     text,
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"samples": samples})
}

// performTextAnalysis performs the actual text analysis
func (h *TextHandler) performTextAnalysis(text, language string) models.TextAnalysis {
	if language == "" {
		language = "en"
	}

	analysis := models.TextAnalysis{
		Text:     text,
		Language: language,
	}

	// Analyze sentiment
	analysis.Sentiment = h.analyzeSentiment(text)

	// Extract keywords
	keywords := h.extractKeywords(text)
	for _, keyword := range keywords {
		analysis.Keywords = append(analysis.Keywords, models.Keyword{
			Word:      keyword.Word,
			Frequency: keyword.Frequency,
			Relevance: keyword.Relevance,
		})
	}

	// Extract entities
	entities := h.extractEntities(text)
	for _, entity := range entities {
		analysis.Entities = append(analysis.Entities, models.Entity{
			Text:       entity.Text,
			Type:       entity.Type,
			Confidence: entity.Confidence,
		})
	}

	// Calculate readability
	analysis.Readability = h.calculateReadability(text)

	return analysis
}

// analyzeSentiment performs sentiment analysis
func (h *TextHandler) analyzeSentiment(text string) models.SentimentAnalysis {
	positiveWords := []string{
		"good", "great", "excellent", "amazing", "wonderful", "fantastic", "awesome",
		"love", "like", "enjoy", "happy", "pleased", "satisfied", "perfect",
		"brilliant", "outstanding", "superb", "magnificent", "impressive",
		"positive", "success", "successful", "achievement", "accomplish",
		"effective", "efficient", "valuable", "helpful", "useful",
	}

	negativeWords := []string{
		"bad", "terrible", "awful", "horrible", "disgusting", "hate", "dislike",
		"angry", "frustrated", "disappointed", "upset", "sad", "depressed",
		"poor", "weak", "fail", "failure", "problem", "issue", "difficult",
		"impossible", "useless", "worthless", "waste", "expensive",
		"slow", "broken", "error", "bug", "wrong", "incorrect",
	}

	words := regexp.MustCompile(`\b\w+\b`).FindAllString(strings.ToLower(text), -1)

	positiveCount := 0
	negativeCount := 0

	for _, word := range words {
		for _, pos := range positiveWords {
			if word == pos {
				positiveCount++
				break
			}
		}
		for _, neg := range negativeWords {
			if word == neg {
				negativeCount++
				break
			}
		}
	}

	totalSentimentWords := positiveCount + negativeCount

	if totalSentimentWords == 0 {
		return models.SentimentAnalysis{
			Score:      0,
			Label:      "neutral",
			Confidence: 0.5,
		}
	}

	score := float64(positiveCount-negativeCount) / float64(totalSentimentWords)
	confidence := math.Min(0.9, math.Max(0.1, float64(totalSentimentWords)/float64(len(words))*5))

	label := "neutral"
	if score > 0.1 {
		label = "positive"
	} else if score < -0.1 {
		label = "negative"
	}

	return models.SentimentAnalysis{
		Score:      math.Round(score*1000) / 1000,
		Label:      label,
		Confidence: math.Round(confidence*1000) / 1000,
	}
}

// extractKeywords extracts keywords from text
func (h *TextHandler) extractKeywords(text string) []models.KeywordResponse {
	stopWords := map[string]bool{
		"the": true, "a": true, "an": true, "and": true, "or": true, "but": true,
		"in": true, "on": true, "at": true, "to": true, "for": true, "of": true, "with": true,
		"by": true, "from": true, "up": true, "about": true, "into": true, "through": true,
		"during": true, "before": true, "after": true, "above": true, "below": true,
		"is": true, "are": true, "was": true, "were": true, "be": true, "been": true, "being": true,
		"have": true, "has": true, "had": true, "do": true, "does": true, "did": true,
		"this": true, "that": true, "these": true, "those": true, "i": true, "you": true,
		"he": true, "she": true, "it": true, "we": true, "they": true,
	}

	words := regexp.MustCompile(`\b\w{3,}\b`).FindAllString(strings.ToLower(text), -1)
	wordCount := make(map[string]int)
	totalWords := len(words)

	for _, word := range words {
		if !stopWords[word] {
			wordCount[word]++
		}
	}

	type wordFreq struct {
		word string
		freq int
	}

	var sortedWords []wordFreq
	for word, freq := range wordCount {
		sortedWords = append(sortedWords, wordFreq{word, freq})
	}

	// Simple bubble sort for top 10
	for i := 0; i < len(sortedWords)-1; i++ {
		for j := 0; j < len(sortedWords)-i-1; j++ {
			if sortedWords[j].freq < sortedWords[j+1].freq {
				sortedWords[j], sortedWords[j+1] = sortedWords[j+1], sortedWords[j]
			}
		}
	}

	var keywords []models.KeywordResponse
	limit := 10
	if len(sortedWords) < limit {
		limit = len(sortedWords)
	}

	for i := 0; i < limit; i++ {
		keywords = append(keywords, models.KeywordResponse{
			Word:      sortedWords[i].word,
			Frequency: sortedWords[i].freq,
			Relevance: float64(sortedWords[i].freq) / float64(totalWords),
		})
	}

	return keywords
}

// extractEntities extracts named entities from text
func (h *TextHandler) extractEntities(text string) []models.EntityResponse {
	var entities []models.EntityResponse

	// Simple patterns for entity detection
	patterns := map[string]*regexp.Regexp{
		"person":       regexp.MustCompile(`\b[A-Z][a-z]+ [A-Z][a-z]+\b`),
		"organization": regexp.MustCompile(`\b[A-Z][a-zA-Z]+ (Inc|LLC|Corp|Company|Corporation|Ltd)\b`),
		"location":     regexp.MustCompile(`\b(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Washington|Boston|El Paso|Detroit|Nashville|Portland|Memphis|Oklahoma City|Las Vegas|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Mesa|Kansas City|Atlanta|Long Beach|Colorado Springs|Raleigh|Miami|Virginia Beach|Omaha|Oakland|Minneapolis|Tulsa|Arlington|Tampa|New Orleans)\b`),
	}

	for entityType, pattern := range patterns {
		matches := pattern.FindAllString(text, -1)
		for _, match := range matches {
			entities = append(entities, models.EntityResponse{
				Text:       match,
				Type:       entityType,
				Confidence: 0.8,
			})
		}
	}

	return entities
}

// calculateReadability calculates readability score
func (h *TextHandler) calculateReadability(text string) models.ReadabilityAnalysis {
	sentences := regexp.MustCompile(`[.!?]+`).Split(text, -1)
	sentenceCount := 0
	for _, s := range sentences {
		if strings.TrimSpace(s) != "" {
			sentenceCount++
		}
	}

	words := regexp.MustCompile(`\b\w+\b`).FindAllString(text, -1)
	wordCount := len(words)

	syllables := 0
	for _, word := range words {
		syllables += h.countSyllables(word)
	}

	if sentenceCount == 0 || wordCount == 0 {
		return models.ReadabilityAnalysis{
			Score: 0,
			Level: "Unreadable",
		}
	}

	avgSentenceLength := float64(wordCount) / float64(sentenceCount)
	avgSyllablesPerWord := float64(syllables) / float64(wordCount)

	// Simplified Flesch Reading Ease formula
	score := 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord)

	level := "Very Difficult"
	if score >= 90 {
		level = "Very Easy"
	} else if score >= 80 {
		level = "Easy"
	} else if score >= 70 {
		level = "Fairly Easy"
	} else if score >= 60 {
		level = "Standard"
	} else if score >= 50 {
		level = "Fairly Difficult"
	} else if score >= 30 {
		level = "Difficult"
	}

	finalScore := math.Max(0, math.Min(100, score))
	return models.ReadabilityAnalysis{
		Score: math.Round(finalScore*10) / 10,
		Level: level,
	}
}

// countSyllables counts syllables in a word (simplified)
func (h *TextHandler) countSyllables(word string) int {
	word = strings.ToLower(word)
	if len(word) <= 3 {
		return 1
	}

	vowels := "aeiouy"
	count := 0
	previousWasVowel := false

	for _, char := range word {
		isVowel := strings.ContainsRune(vowels, char)
		if isVowel && !previousWasVowel {
			count++
		}
		previousWasVowel = isVowel
	}

	// Adjust for silent 'e'
	if strings.HasSuffix(word, "e") {
		count--
	}

	if count < 1 {
		count = 1
	}

	return count
}
