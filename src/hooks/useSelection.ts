'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  LinkData,
  LinkCategory,
  CategoryState,
  GlobalState,
  SelectionState,
  CategoryMaps,
  SelectionStats,
  SelectionHandlers
} from '@/types/sitemap';

interface UseSelectionOptions {
  initialSelection?: string[];
  enablePerformanceMonitoring?: boolean;
  performanceThreshold?: number; // ms
}

export function useSelection(
  linkData: LinkData[], 
  options: UseSelectionOptions = {}
) {
  const { 
    initialSelection = [], 
    enablePerformanceMonitoring = false,
    performanceThreshold = 100
  } = options;

  // Core selection state
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedLinks: new Set(initialSelection),
    categoryStates: new Map<LinkCategory, CategoryState>(),
    globalState: { selected: false, indeterminate: false }
  });

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    lastOperationTime: number;
    operationCount: number;
    averageTime: number;
  }>({
    lastOperationTime: 0,
    operationCount: 0,
    averageTime: 0
  });

  /**
   * Pre-computed category maps for O(1) lookups
   */
  const categoryMaps = useMemo<CategoryMaps>(() => {
    const startTime = performance.now();
    
    const linkToCategory = new Map<string, LinkCategory>();
    const categoryToLinks = new Map<LinkCategory, string[]>();
    
    // Initialize category maps
    const categories: LinkCategory[] = ['internal', 'external', 'files', 'email', 'phone', 'anchors'];
    categories.forEach(cat => categoryToLinks.set(cat, []));
    
    // Populate maps
    linkData.forEach(link => {
      linkToCategory.set(link.id, link.category);
      const categoryLinks = categoryToLinks.get(link.category) || [];
      categoryLinks.push(link.id);
      categoryToLinks.set(link.category, categoryLinks);
    });

    if (enablePerformanceMonitoring) {
      const operationTime = performance.now() - startTime;
      if (operationTime > performanceThreshold) {
        console.warn(`Slow category mapping operation: ${operationTime.toFixed(2)}ms`);
      }
    }

    return {
      linkToCategory,
      categoryToLinks,
      allLinks: linkData
    };
  }, [linkData, enablePerformanceMonitoring, performanceThreshold]);

  /**
   * Calculate category states based on current selection
   */
  const categoryStates = useMemo<Map<LinkCategory, CategoryState>>(() => {
    const states = new Map<LinkCategory, CategoryState>();
    
    categoryMaps.categoryToLinks.forEach((linkIds, category) => {
      const selectedCount = linkIds.filter(id => selectionState.selectedLinks.has(id)).length;
      const totalCount = linkIds.length;
      
      if (totalCount === 0) {
        states.set(category, { selected: false, indeterminate: false });
      } else if (selectedCount === 0) {
        states.set(category, { selected: false, indeterminate: false });
      } else if (selectedCount === totalCount) {
        states.set(category, { selected: true, indeterminate: false });
      } else {
        states.set(category, { selected: false, indeterminate: true });
      }
    });
    
    return states;
  }, [categoryMaps.categoryToLinks, selectionState.selectedLinks]);

  /**
   * Calculate global selection state
   */
  const globalState = useMemo<GlobalState>(() => {
    const totalLinks = linkData.length;
    const selectedCount = selectionState.selectedLinks.size;
    
    if (totalLinks === 0 || selectedCount === 0) {
      return { selected: false, indeterminate: false };
    } else if (selectedCount === totalLinks) {
      return { selected: true, indeterminate: false };
    } else {
      return { selected: false, indeterminate: true };
    }
  }, [linkData.length, selectionState.selectedLinks.size]);

  /**
   * Performance monitoring helper
   */
  const trackPerformance = useCallback((operationType: string, operationFn: () => void) => {
    if (!enablePerformanceMonitoring) {
      operationFn();
      return;
    }

    const startTime = performance.now();
    operationFn();
    const operationTime = performance.now() - startTime;

    setPerformanceMetrics(prev => {
      const newCount = prev.operationCount + 1;
      const newAverage = (prev.averageTime * prev.operationCount + operationTime) / newCount;
      
      return {
        lastOperationTime: operationTime,
        operationCount: newCount,
        averageTime: newAverage
      };
    });

    if (operationTime > performanceThreshold) {
      console.warn(`Slow ${operationType} operation: ${operationTime.toFixed(2)}ms`);
    }
  }, [enablePerformanceMonitoring, performanceThreshold]);

  /**
   * Toggle a single link selection
   */
  const toggleLink = useCallback((linkId: string) => {
    trackPerformance('toggleLink', () => {
      setSelectionState(prev => {
        const newSelected = new Set(prev.selectedLinks);
        if (newSelected.has(linkId)) {
          newSelected.delete(linkId);
        } else {
          newSelected.add(linkId);
        }
        return {
          ...prev,
          selectedLinks: newSelected
        };
      });
    });
  }, [trackPerformance]);

  /**
   * Toggle all links in a category
   */
  const toggleCategory = useCallback((category: LinkCategory) => {
    trackPerformance('toggleCategory', () => {
      const categoryLinks = categoryMaps.categoryToLinks.get(category) || [];
      const categoryState = categoryStates.get(category);
      
      setSelectionState(prev => {
        const newSelected = new Set(prev.selectedLinks);
        
        if (categoryState?.selected) {
          // Deselect all in category
          categoryLinks.forEach(linkId => newSelected.delete(linkId));
        } else {
          // Select all in category
          categoryLinks.forEach(linkId => newSelected.add(linkId));
        }
        
        return {
          ...prev,
          selectedLinks: newSelected
        };
      });
    });
  }, [categoryMaps.categoryToLinks, categoryStates, trackPerformance]);

  /**
   * Toggle global selection (all links)
   */
  const toggleGlobal = useCallback(() => {
    trackPerformance('toggleGlobal', () => {
      setSelectionState(prev => {
        const newSelected = globalState.selected 
          ? new Set<string>() 
          : new Set(linkData.map(link => link.id));
        
        return {
          ...prev,
          selectedLinks: newSelected
        };
      });
    });
  }, [globalState.selected, linkData, trackPerformance]);

  /**
   * Select all links
   */
  const selectAll = useCallback(() => {
    trackPerformance('selectAll', () => {
      setSelectionState(prev => ({
        ...prev,
        selectedLinks: new Set(linkData.map(link => link.id))
      }));
    });
  }, [linkData, trackPerformance]);

  /**
   * Deselect all links
   */
  const selectNone = useCallback(() => {
    trackPerformance('selectNone', () => {
      setSelectionState(prev => ({
        ...prev,
        selectedLinks: new Set<string>()
      }));
    });
  }, [trackPerformance]);

  /**
   * Get selected URLs
   */
  const getSelectedUrls = useCallback((): string[] => {
    return linkData
      .filter(link => selectionState.selectedLinks.has(link.id))
      .map(link => link.url);
  }, [linkData, selectionState.selectedLinks]);

  /**
   * Get links by category
   */
  const getLinksByCategory = useCallback((category: LinkCategory): LinkData[] => {
    const linkIds = categoryMaps.categoryToLinks.get(category) || [];
    return linkIds.map(id => linkData.find(link => link.id === id)!).filter(Boolean);
  }, [categoryMaps.categoryToLinks, linkData]);

  /**
   * Get selected links by category
   */
  const getSelectedLinksByCategory = useCallback((category: LinkCategory): LinkData[] => {
    return getLinksByCategory(category).filter(link => selectionState.selectedLinks.has(link.id));
  }, [getLinksByCategory, selectionState.selectedLinks]);

  /**
   * Check if a link is selected
   */
  const isLinkSelected = useCallback((linkId: string): boolean => {
    return selectionState.selectedLinks.has(linkId);
  }, [selectionState.selectedLinks]);

  /**
   * Get category state
   */
  const getCategoryState = useCallback((category: LinkCategory): CategoryState => {
    return categoryStates.get(category) || { selected: false, indeterminate: false };
  }, [categoryStates]);

  /**
   * Get selection statistics
   */
  const selectionStatistics = useMemo<SelectionStats>(() => {
    const stats: SelectionStats = {
      totalLinks: linkData.length,
      selectedLinks: selectionState.selectedLinks.size,
      categoryStats: {} as Record<LinkCategory, { total: number; selected: number; percentage: number }>
    };

    const categories: LinkCategory[] = ['internal', 'external', 'files', 'email', 'phone', 'anchors'];
    categories.forEach(category => {
      const categoryLinks = getLinksByCategory(category);
      const selectedCategoryLinks = getSelectedLinksByCategory(category);
      
      stats.categoryStats[category] = {
        total: categoryLinks.length,
        selected: selectedCategoryLinks.length,
        percentage: categoryLinks.length > 0 
          ? Math.round((selectedCategoryLinks.length / categoryLinks.length) * 100)
          : 0
      };
    });

    return stats;
  }, [linkData.length, selectionState.selectedLinks.size, getLinksByCategory, getSelectedLinksByCategory]);

  // Update state when linkData changes
  useEffect(() => {
    setSelectionState(prev => ({
      ...prev,
      categoryStates: categoryStates,
      globalState
    }));
  }, [categoryStates, globalState]);

  // Selection handlers object
  const handlers: SelectionHandlers = useMemo(() => ({
    toggleLink,
    toggleCategory,
    toggleGlobal,
    selectAll,
    selectNone,
    getSelectedUrls
  }), [toggleLink, toggleCategory, toggleGlobal, selectAll, selectNone, getSelectedUrls]);

  return {
    // Core state
    selectedUrls: getSelectedUrls(),
    selectedLinks: Array.from(selectionState.selectedLinks),
    linkData,
    
    // Category operations
    getLinksByCategory,
    getSelectedLinksByCategory,
    getCategoryState,
    
    // Individual link operations  
    isLinkSelected,
    
    // Global state
    globalState,
    categoryStatistics: selectionStatistics.categoryStats,
    
    // Statistics
    totalLinks: linkData.length,
    selectedCount: selectionState.selectedLinks.size,
    selectionPercentage: linkData.length > 0 
      ? Math.round((selectionState.selectedLinks.size / linkData.length) * 100) 
      : 0,
    
    // Actions (handlers)
    ...handlers,
    
    // Computed state maps for external use
    categoryStates,
    
    // Performance metrics (if enabled)
    ...(enablePerformanceMonitoring && {
      performanceMetrics,
      isPerformanceWarning: performanceMetrics.lastOperationTime > performanceThreshold
    }),
    
    // Utility
    isEmpty: linkData.length === 0,
    hasSelection: selectionState.selectedLinks.size > 0
  };
}

export type UseSelectionReturn = ReturnType<typeof useSelection>;