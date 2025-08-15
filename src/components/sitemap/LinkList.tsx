'use client';
import { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/styles/theme';
import { LinkData, LinkCategory } from '@/types/sitemap';

interface LinkListProps {
  links: LinkData[];
  selectedLinks: Set<string>;
  onToggleLink: (linkId: string) => void;
  category: LinkCategory;
  maxVisible?: number;
}

const Container = styled.div`
  margin-top: ${theme.spacing.md};
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  background: ${theme.colors.bg.primary};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.sm};
  margin-bottom: ${theme.spacing.md};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.accent};
    box-shadow: 0 0 0 2px ${theme.colors.accent}20;
  }
  
  &::placeholder {
    color: ${theme.colors.text.secondary};
  }
`;

const LinkItem = styled(motion.div)<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  margin-bottom: ${theme.spacing.xs};
  background: ${({ $selected }) => $selected ? `${theme.colors.accent}10` : theme.colors.bg.primary};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $selected }) => $selected ? `${theme.colors.accent}20` : `${theme.colors.accent}05`};
    border-color: ${theme.colors.accent};
  }
`;

const Checkbox = styled.input`
  margin-right: ${theme.spacing.sm};
  cursor: pointer;
`;

const LinkContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const LinkUrl = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.fontWeight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const LinkMeta = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing.xs};
  display: flex;
  gap: ${theme.spacing.sm};
`;

const MetaItem = styled.span`
  &:not(:last-child)::after {
    content: '•';
    margin-left: ${theme.spacing.sm};
    color: ${theme.colors.text.tertiary};
  }
`;

const ShowMoreButton = styled.button`
  width: 100%;
  padding: ${theme.spacing.sm};
  border: 1px dashed ${theme.colors.border};
  border-radius: ${theme.layout.borderRadius.sm};
  background: transparent;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${theme.colors.accent};
    color: ${theme.colors.accent};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.lg};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

export function LinkList({ 
  links, 
  selectedLinks, 
  onToggleLink, 
  category, 
  maxVisible = 5 
}: LinkListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filteredLinks = useMemo(() => {
    if (!searchTerm.trim()) return links;
    
    const term = searchTerm.toLowerCase();
    return links.filter(link => 
      link.url.toLowerCase().includes(term) ||
      (link.url && link.url.toLowerCase().includes(term))
    );
  }, [links, searchTerm]);

  const visibleLinks = useMemo(() => {
    if (showAll) return filteredLinks;
    return filteredLinks.slice(0, maxVisible);
  }, [filteredLinks, showAll, maxVisible]);

  const hasMore = filteredLinks.length > maxVisible && !showAll;

  if (links.length === 0) {
    return (
      <Container>
        <EmptyState>
          No {category} links found
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      {links.length > 3 && (
        <SearchInput
          type="text"
          placeholder={`Search ${category} links...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      )}
      
      {visibleLinks.map((link) => (
        <LinkItem
          key={link.id}
          $selected={selectedLinks.has(link.id)}
          onClick={() => onToggleLink(link.id)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Checkbox
            type="checkbox"
            checked={selectedLinks.has(link.id)}
            onChange={() => onToggleLink(link.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <LinkContent>
            <LinkUrl title={link.url}>{link.url}</LinkUrl>
            <LinkMeta>
              {link.lastmod && (
                <MetaItem>
                  Modified: {new Date(link.lastmod).toLocaleDateString()}
                </MetaItem>
              )}
              {link.changefreq && (
                <MetaItem>
                  Frequency: {link.changefreq}
                </MetaItem>
              )}
              {link.priority && (
                <MetaItem>
                  Priority: {link.priority}
                </MetaItem>
              )}
            </LinkMeta>
          </LinkContent>
        </LinkItem>
      ))}
      
      {hasMore && (
        <ShowMoreButton onClick={() => setShowAll(true)}>
          Show {filteredLinks.length - maxVisible} more links
        </ShowMoreButton>
      )}
      
      {searchTerm && filteredLinks.length === 0 && (
        <EmptyState>
          No links match "{searchTerm}"
        </EmptyState>
      )}
    </Container>
  );
}

export default LinkList;