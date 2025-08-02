import { TextAnalysisResult } from '@/types';

/**
 * Simple sentiment analysis based on positive/negative word counts
 */
export const analyzeSentiment = (text: string): TextAnalysisResult['sentiment'] => {
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
    'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'perfect',
    'brilliant', 'outstanding', 'superb', 'magnificent', 'impressive',
    'positive', 'success', 'successful', 'achievement', 'accomplish',
    'effective', 'efficient', 'valuable', 'helpful', 'useful',
  ];

  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'dislike',
    'angry', 'frustrated', 'disappointed', 'upset', 'sad', 'depressed',
    'poor', 'weak', 'fail', 'failure', 'problem', 'issue', 'difficult',
    'impossible', 'useless', 'worthless', 'waste', 'expensive',
    'slow', 'broken', 'error', 'bug', 'wrong', 'incorrect',
  ];

  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });

  const totalSentimentWords = positiveCount + negativeCount;
  
  if (totalSentimentWords === 0) {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0.5,
    };
  }

  const score = (positiveCount - negativeCount) / totalSentimentWords;
  const confidence = Math.min(0.9, Math.max(0.1, totalSentimentWords / words.length * 5));

  let label: 'positive' | 'negative' | 'neutral';
  if (score > 0.1) {
    label = 'positive';
  } else if (score < -0.1) {
    label = 'negative';
  } else {
    label = 'neutral';
  }

  return {
    score: parseFloat(score.toFixed(3)),
    label,
    confidence: parseFloat(confidence.toFixed(3)),
  };
};

/**
 * Extract and rank keywords from text
 */
export const extractKeywords = (text: string): TextAnalysisResult['keywords'] => {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'between', 'among', 'throughout', 'despite', 'towards',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  ]);

  const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
  const wordCount = new Map<string, number>();

  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }
  });

  const keywords = Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, frequency]) => ({
      word,
      frequency,
      relevance: parseFloat((frequency / words.length).toFixed(4)),
    }));

  return keywords;
};

/**
 * Simple named entity recognition
 */
export const extractEntities = (text: string): TextAnalysisResult['entities'] => {
  const entities: TextAnalysisResult['entities'] = [];

  // Simple patterns for entity detection
  const patterns = {
    person: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Simple name pattern
    organization: /\b[A-Z][a-zA-Z]+ (Inc|LLC|Corp|Company|Corporation|Ltd)\b/g,
    location: /\b(New York|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Washington|Boston|El Paso|Detroit|Nashville|Portland|Memphis|Oklahoma City|Las Vegas|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Mesa|Kansas City|Atlanta|Long Beach|Colorado Springs|Raleigh|Miami|Virginia Beach|Omaha|Oakland|Minneapolis|Tulsa|Arlington|Tampa|New Orleans)\b/g,
  };

  Object.entries(patterns).forEach(([type, pattern]) => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      entities?.push({
        text: match,
        type: type as 'person' | 'organization' | 'location' | 'other',
        confidence: 0.8, // Simple confidence score
      });
    });
  });

  return entities;
};

/**
 * Calculate readability score (simplified Flesch Reading Ease)
 */
export const calculateReadability = (text: string): TextAnalysisResult['readability'] => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.match(/\b\w+\b/g) || [];
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);

  if (sentences.length === 0 || words.length === 0) {
    return {
      score: 0,
      level: 'Unreadable',
    };
  }

  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  // Simplified Flesch Reading Ease formula
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

  let level: string;
  if (score >= 90) level = 'Very Easy';
  else if (score >= 80) level = 'Easy';
  else if (score >= 70) level = 'Fairly Easy';
  else if (score >= 60) level = 'Standard';
  else if (score >= 50) level = 'Fairly Difficult';
  else if (score >= 30) level = 'Difficult';
  else level = 'Very Difficult';

  return {
    score: Math.max(0, Math.min(100, parseFloat(score.toFixed(1)))),
    level,
  };
};

/**
 * Count syllables in a word (simplified)
 */
const countSyllables = (word: string): number => {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  // Adjust for silent 'e'
  if (word.endsWith('e')) {
    count--;
  }

  return Math.max(1, count);
};

/**
 * Perform complete text analysis
 */
export const analyzeText = (text: string): TextAnalysisResult => {
  if (!text.trim()) {
    return {
      text: '',
      sentiment: { score: 0, label: 'neutral', confidence: 0 },
      keywords: [],
      entities: [],
      readability: { score: 0, level: 'Unreadable' },
    };
  }

  return {
    text: text.trim(),
    sentiment: analyzeSentiment(text),
    keywords: extractKeywords(text),
    entities: extractEntities(text),
    readability: calculateReadability(text),
  };
};

/**
 * Generate sample texts for demonstration
 */
export const getSampleTexts = (): { [key: string]: string } => {
  return {
    positive: `This amazing product has completely transformed our workflow! The user interface is incredibly intuitive and beautiful. Our team loves how efficient and powerful the features are. Customer support is outstanding and always helpful. We've seen fantastic results and would definitely recommend this to everyone. It's a perfect solution that exceeds all expectations.`,
    
    negative: `This terrible software is a complete waste of time and money. The interface is confusing and difficult to navigate. Nothing works as advertised and the performance is awful. Customer support is useless and unhelpful. We're frustrated and disappointed with this poor quality product. It's broken, slow, and causes more problems than it solves.`,
    
    neutral: `The software provides basic functionality for data management. Users can create, edit, and delete records through the interface. The system includes standard features such as search, filter, and export capabilities. Documentation is available in the help section. Regular updates are released quarterly to address issues and add features.`,
    
    technical: `The React application utilizes TypeScript for type safety and Framer Motion for animations. The architecture implements a component-based design with custom hooks for state management. Data visualization is handled through Recharts library with responsive design patterns. The build process leverages Vite for optimal performance and development experience. Code splitting and lazy loading ensure efficient bundle sizes.`,
    
    business: `Our quarterly revenue increased by 15% compared to last year, demonstrating strong market performance. The company expanded operations to three new regions, establishing strategic partnerships with key industry leaders. Customer satisfaction scores improved significantly, with retention rates reaching 92%. Investment in research and development continues to drive innovation and competitive advantage in the marketplace.`,
  };
};

/**
 * Format analysis results for display
 */
export const formatAnalysisResults = (analysis: TextAnalysisResult) => {
  return {
    wordCount: analysis.text.split(/\s+/).length,
    characterCount: analysis.text.length,
    sentenceCount: analysis.text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
    averageWordsPerSentence: Math.round(
      analysis.text.split(/\s+/).length / 
      Math.max(1, analysis.text.split(/[.!?]+/).filter(s => s.trim().length > 0).length)
    ),
    keywordDensity: analysis.keywords.length > 0 
      ? parseFloat((analysis.keywords[0].frequency / analysis.text.split(/\s+/).length * 100).toFixed(2))
      : 0,
  };
};