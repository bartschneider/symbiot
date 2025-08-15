/**
 * Prompt templates for LLM entity extraction and relationship detection
 * Optimized for consistent, high-quality knowledge graph construction
 */

export interface PromptTemplate {
  system: string
  user: string
  responseFormat: 'json' | 'text'
  expectedTokens: number
}

// Entity extraction prompt template
export const ENTITY_EXTRACTION_PROMPT: PromptTemplate = {
  system: `You are an expert knowledge analyst specializing in entity extraction from web content. Your task is to identify and classify entities with high precision and confidence scoring.

ENTITY TYPES:
- person: Individual people (names, titles, roles)
- organization: Companies, institutions, groups, teams
- concept: Ideas, methodologies, products, technologies, services
- location: Geographic places, addresses, regions
- technology: Technical tools, programming languages, frameworks, systems

REQUIREMENTS:
1. Extract only clearly identifiable entities with sufficient context
2. Assign confidence scores (0.0-1.0) based on clarity and context
3. Include relevant context snippets that support the entity identification
4. Avoid duplicate or overly generic entities
5. Focus on entities that contribute to understanding relationships and knowledge

RESPONSE FORMAT: Valid JSON only, no additional text.`,

  user: `Extract entities from this content and return a JSON object with this exact structure:

{
  "entities": [
    {
      "name": "entity name",
      "type": "person|organization|concept|location|technology",
      "confidence": 0.95,
      "context": "surrounding text that supports this entity",
      "sourceSpan": {"start": 123, "end": 145},
      "metadata": {"title": "optional title", "description": "optional description"}
    }
  ],
  "processingNotes": {
    "totalEntitiesFound": 5,
    "averageConfidence": 0.85,
    "qualityAssessment": "high|medium|low"
  }
}

Content to analyze:
---
{{content}}
---`,

  responseFormat: 'json',
  expectedTokens: 1500
}

// Relationship detection prompt template
export const RELATIONSHIP_DETECTION_PROMPT: PromptTemplate = {
  system: `You are an expert knowledge analyst specializing in relationship detection between entities. Your task is to identify meaningful connections that create valuable knowledge graph insights.

RELATIONSHIP TYPES:
- works_for: Employment, affiliation, membership relationships
- competes_with: Competitive business relationships, market competition
- influences: Impact, inspiration, mentorship, leadership relationships
- related_to: General associations, collaborations, partnerships
- part_of: Hierarchical inclusion, component relationships
- located_in: Geographic or organizational location relationships

REQUIREMENTS:
1. Only identify relationships explicitly supported by the content
2. Assign confidence scores based on evidence strength
3. Include context that demonstrates the relationship
4. Focus on relationships that add knowledge graph value
5. Avoid inferring relationships not clearly stated or implied

RESPONSE FORMAT: Valid JSON only, no additional text.`,

  user: `Analyze the entities and content to identify relationships. Return a JSON object with this exact structure:

{
  "relationships": [
    {
      "sourceEntity": "entity name 1",
      "targetEntity": "entity name 2", 
      "type": "works_for|competes_with|influences|related_to|part_of|located_in",
      "confidence": 0.85,
      "context": "text evidence supporting this relationship",
      "bidirectional": false
    }
  ],
  "processingNotes": {
    "totalRelationshipsFound": 3,
    "averageConfidence": 0.82,
    "qualityAssessment": "high|medium|low"
  }
}

Entities to analyze:
{{entities}}

Content context:
---
{{content}}
---`,

  responseFormat: 'json',
  expectedTokens: 1000
}

// Content analysis and summarization prompt
export const CONTENT_ANALYSIS_PROMPT: PromptTemplate = {
  system: `You are an expert content analyst specializing in knowledge extraction and insight generation. Your task is to provide concise, valuable analysis that supports knowledge graph construction.

ANALYSIS FOCUS:
1. Key insights and takeaways from the content
2. Important themes and concepts discussed
3. Notable patterns or trends mentioned
4. Strategic implications or significance
5. Quality assessment of the source content

REQUIREMENTS:
1. Provide actionable insights, not generic summaries
2. Focus on information valuable for knowledge graph users
3. Maintain factual accuracy and source attribution
4. Assess content quality and reliability indicators
5. Generate insights that complement entity and relationship data

RESPONSE FORMAT: Valid JSON only, no additional text.`,

  user: `Analyze this content and provide insights. Return a JSON object with this exact structure:

{
  "summary": "concise 2-3 sentence summary of key content",
  "keyInsights": [
    "insight 1: specific finding or pattern",
    "insight 2: strategic implication or significance",
    "insight 3: notable trend or development"
  ],
  "themes": ["theme1", "theme2", "theme3"],
  "quality": {
    "contentReliability": "high|medium|low",
    "informationDensity": "high|medium|low", 
    "sourceCredibility": "high|medium|low",
    "recency": "current|recent|outdated"
  },
  "recommendations": [
    "recommendation for further analysis or follow-up"
  ]
}

Content to analyze:
---
{{content}}
---`,

  responseFormat: 'json',
  expectedTokens: 800
}

// Prompt template utilities
export function renderPrompt(template: PromptTemplate, variables: Record<string, string>): { system: string; user: string } {
  let renderedUser = template.user
  
  // Replace template variables
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`
    renderedUser = renderedUser.replace(new RegExp(placeholder, 'g'), value)
  })
  
  return {
    system: template.system,
    user: renderedUser
  }
}

export function estimateTokens(content: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(content.length / 4)
}

export function validatePromptLength(content: string, maxTokens: number): boolean {
  const estimatedTokens = estimateTokens(content)
  return estimatedTokens <= maxTokens * 0.8 // Leave 20% buffer for response
}

// Content preprocessing utilities
export function preprocessContent(content: string): string {
  // Clean up content for better LLM processing
  return content
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .replace(/\s{2,}/g, ' ') // Normalize multiple spaces
    .trim()
}

export function chunkContent(content: string, maxTokens: number): string[] {
  const maxChars = maxTokens * 3 // Conservative estimate
  const chunks: string[] = []
  
  if (content.length <= maxChars) {
    return [content]
  }
  
  // Split by paragraphs first, then by sentences if needed
  const paragraphs = content.split('\n\n')
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length <= maxChars) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
        currentChunk = paragraph
      } else {
        // Paragraph is too long, split by sentences
        const sentences = paragraph.split('. ')
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length <= maxChars) {
            currentChunk += (currentChunk ? '. ' : '') + sentence
          } else {
            if (currentChunk) chunks.push(currentChunk)
            currentChunk = sentence
          }
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}