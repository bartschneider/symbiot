# Synthora - Full-Stack Data Analytics Platform

A modern, full-stack data analytics platform built with React TypeScript frontend and Go backend, featuring advanced visualization capabilities and real-time text analysis.

## ✨ Features

### 🎨 Data-Noir Minimalist Design
- **Dark Theme**: Sophisticated dark interface with neon accent colors
- **Responsive Design**: Mobile-first approach with seamless desktop experience
- **Smooth Animations**: Framer Motion-powered transitions and micro-interactions
- **Accessible**: WCAG 2.1 AA compliant with proper ARIA labels

### 📊 Interactive Data Visualization
- **Advanced Charts**: Line charts, area charts with real-time data processing
- **Statistical Analysis**: Mean, median, standard deviation, peaks/valleys detection
- **Multiple Datasets**: Stock data, analytics data, sinusoidal waves, sample data
- **Interactive Elements**: Click-to-select data points, hover tooltips, chart type switching

### 📝 Text Analysis Engine
- **Sentiment Analysis**: Positive/negative/neutral classification with confidence scores
- **Keyword Extraction**: TF-IDF based keyword ranking and frequency analysis
- **Named Entity Recognition**: Person, organization, location detection
- **Readability Scoring**: Flesch Reading Ease calculation with difficulty levels

### 🚀 Modern Architecture
- **React 18**: Latest React features with hooks and concurrent rendering
- **TypeScript**: Full type safety and IntelliSense support
- **Vite**: Lightning-fast build tool with HMR
- **Code Splitting**: Lazy loading and route-based chunking for optimal performance

## 🛠️ Technology Stack

### Frontend Framework
- **React 18.2.0** - UI library with hooks and context
- **TypeScript 5.2.2** - Type-safe JavaScript
- **React Router DOM 6.20.1** - Client-side routing

### Styling & Animation
- **Emotion 11.11.1** - CSS-in-JS with styled components
- **Framer Motion 10.16.16** - Physics-based animations
- **Custom Theme System** - TypeScript-based design tokens

### Data Visualization
- **Recharts 2.8.0** - Composable charting library built on D3
- **Chart.js 4.4.0** - Alternative charting with react-chartjs-2
- **Custom Chart Utils** - Data generation and statistical functions

### State Management
- **Zustand 4.4.7** - Lightweight state management
- **React Context** - Built-in state sharing
- **Local State** - useState and useReducer hooks

### Development Tools
- **Vite 5.0.8** - Build tool and dev server
- **ESLint 8.55.0** - Code linting with TypeScript rules
- **Path Mapping** - Clean imports with @ aliases

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── layout/          # Header, Footer, Layout
│   ├── ui/              # Button, Card, LoadingSpinner, etc.
│   ├── charts/          # LineChart, ChartContainer
│   └── text/            # TextAnalyzer, SentimentDisplay
├── pages/               # Page components
│   ├── Portfolio.tsx    # Main portfolio page
│   ├── Landing.tsx      # Welcome/landing page
│   ├── ChartAnalysis.tsx # Interactive charts
│   └── TextAnalysis.tsx # Text processing
├── styles/              # Theme and global styles
│   ├── theme.ts         # Design system tokens
│   └── globalStyles.ts  # Global CSS-in-JS
├── utils/               # Utility functions
│   ├── chartUtils.ts    # Chart data generation
│   └── textUtils.ts     # NLP processing
├── types/               # TypeScript definitions
│   └── index.ts         # Shared interfaces
├── routes/              # Router configuration
│   └── index.tsx        # Route definitions
└── main.tsx             # Application entry point
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher (or yarn/pnpm)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd synthora-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Available Scripts

```bash
# Development
npm run dev          # Start Vite dev server with HMR
npm run preview      # Preview production build locally

# Building
npm run build        # TypeScript compilation + Vite build
npm run typecheck    # Run TypeScript type checking

# Code Quality
npm run lint         # ESLint with TypeScript support
```

## 🎯 Usage Examples

### Custom Chart Data

```typescript
import { ChartDataPoint } from '@/types';
import { generateSampleData } from '@/utils/chartUtils';

// Generate sample data
const data: ChartDataPoint[] = generateSampleData(30);

// Use with LineChart component
<LineChart
  data={data}
  title="Custom Dataset"
  type="area"
  animate={true}
  onDataPointClick={(point, index) => {
    console.log(`Clicked point ${index}:`, point);
  }}
/>
```

### Text Analysis Integration

```typescript
import { analyzeText } from '@/utils/textUtils';

const text = "This amazing product exceeded all expectations!";
const analysis = analyzeText(text);

console.log(analysis.sentiment);
// { score: 0.75, label: 'positive', confidence: 0.8 }

console.log(analysis.keywords);
// [{ word: 'amazing', frequency: 1, relevance: 0.1 }, ...]
```

### Theme Customization

```typescript
import { theme } from '@/styles/theme';
import styled from '@emotion/styled';

const CustomComponent = styled.div`
  background: ${theme.colors.bg.secondary};
  color: ${theme.colors.accent};
  padding: ${theme.spacing.lg};
  border-radius: ${theme.layout.borderRadius.default};
  
  @media (max-width: ${theme.breakpoints.md}) {
    padding: ${theme.spacing.sm};
  }
`;
```

## 🎨 Design System

### Color Palette
```css
/* Primary Colors */
--color-bg-primary: #101214    /* Deep space black */
--color-bg-secondary: #1a1d20  /* Charcoal gray */
--color-accent: #68FFC9        /* Electric mint */

/* Text Colors */
--color-text-primary: #ffffff   /* Pure white */
--color-text-secondary: #a8b2b8 /* Muted gray */

/* UI Colors */
--color-border: #2a2d30        /* Subtle border */
--color-hover: rgba(104, 255, 201, 0.1) /* Accent hover */
```

### Typography
- **Font Family**: Inter (Google Fonts)
- **Weights**: 300 (Light), 400 (Regular), 700 (Bold)
- **Scale**: 12px - 64px with responsive clamp()

### Spacing Scale
```css
--spacing-xs: 0.5rem   /* 8px */
--spacing-sm: 1rem     /* 16px */
--spacing-md: 1.5rem   /* 24px */
--spacing-lg: 2rem     /* 32px */
--spacing-xl: 3rem     /* 48px */
--spacing-xxl: 4rem    /* 64px */
```

## 📱 Responsive Breakpoints

```css
--breakpoint-sm: 640px    /* Mobile landscape */
--breakpoint-md: 768px    /* Tablet portrait */
--breakpoint-lg: 1024px   /* Tablet landscape */
--breakpoint-xl: 1280px   /* Desktop */
--breakpoint-2xl: 1536px  /* Large desktop */
```

## ⚡ Performance Features

### Code Splitting
- **Route-based splitting**: Each page loads independently
- **Component lazy loading**: Charts and heavy components load on demand
- **Vendor chunking**: Third-party libraries separated from app code

### Bundle Optimization
- **Tree shaking**: Dead code elimination
- **Asset optimization**: Image compression and font subsetting
- **Cache strategies**: Long-term caching for static assets

### Runtime Performance
- **React.memo**: Prevent unnecessary re-renders
- **useMemo/useCallback**: Expensive computation caching
- **Virtualization**: Large datasets handled efficiently

## 🔧 Configuration

### Path Aliases
```typescript
// tsconfig.json & vite.config.ts
{
  "@/*": ["./src/*"],
  "@/components/*": ["./src/components/*"],
  "@/pages/*": ["./src/pages/*"],
  "@/styles/*": ["./src/styles/*"],
  "@/utils/*": ["./src/utils/*"]
}
```

### Environment Variables
```bash
# .env.local
VITE_APP_TITLE="SYNTHORA"
VITE_API_BASE_URL="https://api.synthora.dev"
VITE_ANALYTICS_ID="GA_MEASUREMENT_ID"
```

## 🧪 Testing

### Component Testing
```bash
# Add testing dependencies
npm install -D @testing-library/react @testing-library/jest-dom vitest

# Run tests
npm run test
```

### Example Test
```typescript
import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify
```bash
# Build command
npm run build

# Publish directory
dist
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines
- Follow TypeScript strict mode
- Use semantic commit messages
- Add JSDoc comments for public APIs
- Maintain 80%+ test coverage
- Follow accessibility best practices

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** - For the amazing framework
- **Framer** - For physics-based animations
- **Recharts** - For beautiful chart components
- **Emotion** - For powerful CSS-in-JS
- **Vite** - For lightning-fast development

---

**Built with ❤️ by SYNTHORA**

*Transforming data into insights through elegant visualization*