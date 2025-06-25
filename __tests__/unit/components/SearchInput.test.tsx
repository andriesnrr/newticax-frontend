// ===== __tests__/unit/components/SearchInput.test.tsx =====
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SearchInput from '@/components/search/SearchInput'

const mockOnSearch = jest.fn()
const mockOnClear = jest.fn()

describe('SearchInput Component', () => {
  beforeEach(() => {
    mockOnSearch.mockClear()
    mockOnClear.mockClear()
  })

  it('renders search input with placeholder', () => {
    render(<SearchInput onSearch={mockOnSearch} placeholder="Search articles..." />)
    
    expect(screen.getByPlaceholderText(/search articles/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('triggers search on input change with debounce', async () => {
    const user = userEvent.setup()
    render(<SearchInput onSearch={mockOnSearch} debounceMs={300} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'react')
    
    // Should not call immediately
    expect(mockOnSearch).not.toHaveBeenCalled()
    
    // Should call after debounce delay
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('react')
    }, { timeout: 500 })
  })

  it('triggers search on enter key press', async () => {
    const user = userEvent.setup()
    render(<SearchInput onSearch={mockOnSearch} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'javascript')
    await user.keyboard.press('Enter')
    
    expect(mockOnSearch).toHaveBeenCalledWith('javascript')
  })

  it('triggers search on search button click', async () => {
    const user = userEvent.setup()
    render(<SearchInput onSearch={mockOnSearch} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'vue')
    await user.click(screen.getByRole('button', { name: /search/i }))
    
    expect(mockOnSearch).toHaveBeenCalledWith('vue')
  })

  it('shows clear button when input has value', async () => {
    const user = userEvent.setup()
    render(<SearchInput onSearch={mockOnSearch} onClear={mockOnClear} />)
    
    const input = screen.getByRole('textbox')
    
    // Clear button should not be visible initially
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    
    await user.type(input, 'test')
    
    // Clear button should appear
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('clears input when clear button clicked', async () => {
    const user = userEvent.setup()
    render(<SearchInput onSearch={mockOnSearch} onClear={mockOnClear} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test query')
    await user.click(screen.getByRole('button', { name: /clear/i }))
    
    expect(input).toHaveValue('')
    expect(mockOnClear).toHaveBeenCalled()
  })

  it('shows search suggestions when enabled', async () => {
    const user = userEvent.setup()
    const suggestions = ['react tutorial', 'react hooks', 'react testing']
    
    render(
      <SearchInput 
        onSearch={mockOnSearch} 
        suggestions={suggestions}
        showSuggestions={true}
      />
    )
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'react')
    
    // Wait for suggestions to appear
    await waitFor(() => {
      expect(screen.getByText('react tutorial')).toBeInTheDocument()
      expect(screen.getByText('react hooks')).toBeInTheDocument()
      expect(screen.getByText('react testing')).toBeInTheDocument()
    })
  })

  it('selects suggestion when clicked', async () => {
    const user = userEvent.setup()
    const suggestions = ['react tutorial', 'react hooks']
    
    render(
      <SearchInput 
        onSearch={mockOnSearch} 
        suggestions={suggestions}
        showSuggestions={true}
      />
    )
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'react')
    
    await waitFor(() => {
      expect(screen.getByText('react tutorial')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('react tutorial'))
    
    expect(input).toHaveValue('react tutorial')
    expect(mockOnSearch).toHaveBeenCalledWith('react tutorial')
  })

  it('navigates suggestions with keyboard', async () => {
    const user = userEvent.setup()
    const suggestions = ['react tutorial', 'react hooks', 'react testing']
    
    render(
      <SearchInput 
        onSearch={mockOnSearch} 
        suggestions={suggestions}
        showSuggestions={true}
      />
    )
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'react')
    
    // Navigate down
    await user.keyboard.press('ArrowDown')
    expect(screen.getByText('react tutorial')).toHaveClass('suggestion--highlighted')
    
    await user.keyboard.press('ArrowDown')
    expect(screen.getByText('react hooks')).toHaveClass('suggestion--highlighted')
    
    // Navigate up
    await user.keyboard.press('ArrowUp')
    expect(screen.getByText('react tutorial')).toHaveClass('suggestion--highlighted')
    
    // Select with Enter
    await user.keyboard.press('Enter')
    expect(mockOnSearch).toHaveBeenCalledWith('react tutorial')
  })

  it('shows recent searches when focused and empty', async () => {
    const user = userEvent.setup()
    const recentSearches = ['previous search', 'another search']
    
    render(
      <SearchInput 
        onSearch={mockOnSearch} 
        recentSearches={recentSearches}
      />
    )
    
    const input = screen.getByRole('textbox')
    await user.click(input)
    
    await waitFor(() => {
      expect(screen.getByText('Recent searches')).toBeInTheDocument()
      expect(screen.getByText('previous search')).toBeInTheDocument()
      expect(screen.getByText('another search')).toBeInTheDocument()
    })
  })

  it('validates minimum search length', async () => {
    const user = userEvent.setup()
    render(<SearchInput onSearch={mockOnSearch} minLength={3} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'ab')
    await user.keyboard.press('Enter')
    
    expect(screen.getByText(/search must be at least 3 characters/i)).toBeInTheDocument()
    expect(mockOnSearch).not.toHaveBeenCalled()
  })

  it('shows loading state during search', () => {
    render(<SearchInput onSearch={mockOnSearch} isLoading={true} />)
    
    expect(screen.getByTestId('search-loading')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled()
  })
})

// ===== __tests__/unit/utils/search.test.ts =====
import {
  formatSearchQuery,
  parseSearchFilters,
  buildSearchParams,
  highlightSearchTerms,
  debounceSearch,
  validateSearchQuery
} from '@/utils/search'

describe('Search Utilities', () => {
  describe('formatSearchQuery', () => {
    it('trims and normalizes query', () => {
      expect(formatSearchQuery('  React Tutorial  ')).toBe('react tutorial')
      expect(formatSearchQuery('JAVASCRIPT')).toBe('javascript')
    })

    it('removes special characters', () => {
      expect(formatSearchQuery('react@#$%tutorial')).toBe('react tutorial')
    })

    it('handles empty queries', () => {
      expect(formatSearchQuery('')).toBe('')
      expect(formatSearchQuery('   ')).toBe('')
    })
  })

  describe('parseSearchFilters', () => {
    it('extracts basic filters', () => {
      const query = 'react author:john category:tutorial'
      const result = parseSearchFilters(query)
      
      expect(result).toEqual({
        query: 'react',
        filters: {
          author: 'john',
          category: 'tutorial'
        }
      })
    })

    it('handles date filters', () => {
      const query = 'javascript date:2024-01-01..2024-12-31'
      const result = parseSearchFilters(query)
      
      expect(result.filters.dateFrom).toBe('2024-01-01')
      expect(result.filters.dateTo).toBe('2024-12-31')
    })

    it('handles quoted phrases', () => {
      const query = '"react hooks" author:jane'
      const result = parseSearchFilters(query)
      
      expect(result.query).toBe('"react hooks"')
      expect(result.filters.author).toBe('jane')
    })
  })

  describe('buildSearchParams', () => {
    it('builds URL search parameters', () => {
      const params = {
        query: 'react',
        filters: { author: 'john', category: 'tutorial' },
        page: 2,
        sort: 'date'
      }
      
      const result = buildSearchParams(params)
      expect(result.get('q')).toBe('react')
      expect(result.get('author')).toBe('john')
      expect(result.get('category')).toBe('tutorial')
      expect(result.get('page')).toBe('2')
      expect(result.get('sort')).toBe('date')
    })
  })

  describe('highlightSearchTerms', () => {
    it('highlights single term', () => {
      const text = 'This is a React tutorial'
      const result = highlightSearchTerms(text, 'react')
      
      expect(result).toContain('<mark>React</mark>')
    })

    it('highlights multiple terms', () => {
      const text = 'Learn React and JavaScript'
      const result = highlightSearchTerms(text, 'react javascript')
      
      expect(result).toContain('<mark>React</mark>')
      expect(result).toContain('<mark>JavaScript</mark>')
    })

    it('preserves case in highlights', () => {
      const text = 'REACT tutorial'
      const result = highlightSearchTerms(text, 'react')
      
      expect(result).toContain('<mark>REACT</mark>')
    })
  })

  describe('debounceSearch', () => {
    jest.useFakeTimers()
    
    it('delays function execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounceSearch(mockFn, 300)
      
      debouncedFn('test')
      expect(mockFn).not.toHaveBeenCalled()
      
      jest.advanceTimersByTime(300)
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    it('cancels previous calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounceSearch(mockFn, 300)
      
      debouncedFn('first')
      debouncedFn('second')
      debouncedFn('third')
      
      jest.advanceTimersByTime(300)
      
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('third')
    })
  })

  describe('validateSearchQuery', () => {
    it('validates query length', () => {
      expect(validateSearchQuery('ab', { minLength: 3 })).toEqual({
        isValid: false,
        error: 'Search must be at least 3 characters long'
      })
      
      expect(validateSearchQuery('abc', { minLength: 3 })).toEqual({
        isValid: true,
        error: null
      })
    })

    it('validates against blocked terms', () => {
      const blockedTerms = ['spam', 'bad']
      
      expect(validateSearchQuery('spam content', { blockedTerms })).toEqual({
        isValid: false,
        error: 'Search contains blocked terms'
      })
    })
  })
})

// ===== __tests__/integration/search/search-functionality.test.tsx =====
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SearchPage from '@/pages/search'

// Mock API
jest.mock('@/lib/api', () => ({
  searchArticles: jest.fn(),
  getSearchSuggestions: jest.fn(),
  getPopularSearches: jest.fn()
}))

// Mock router
const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: { q: 'react' },
    pathname: '/search'
  })
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Search Functionality Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('performs search and displays results', async () => {
    const { searchArticles } = require('@/lib/api')
    searchArticles.mockResolvedValue({
      results: [
        {
          id: '1',
          title: 'React Hooks Tutorial',
          summary: 'Learn about React hooks',
          author: 'John Doe',
          publishedAt: '2024-01-01T00:00:00Z',
          category: 'tutorial'
        },
        {
          id: '2',
          title: 'Advanced React Patterns',
          summary: 'Advanced patterns in React',
          author: 'Jane Smith',
          publishedAt: '2024-01-02T00:00:00Z',
          category: 'advanced'
        }
      ],
      total: 2,
      page: 1,
      totalPages: 1
    })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    )

    // Perform search
    const searchInput = screen.getByRole('textbox')
    await user.type(searchInput, 'react hooks')
    await user.keyboard.press('Enter')

    await waitFor(() => {
      expect(searchArticles).toHaveBeenCalledWith({
        query: 'react hooks',
        page: 1,
        filters: {}
      })
    })

    // Verify results display
    await waitFor(() => {
      expect(screen.getByText('React Hooks Tutorial')).toBeInTheDocument()
      expect(screen.getByText('Advanced React Patterns')).toBeInTheDocument()
      expect(screen.getByText('2 results found')).toBeInTheDocument()
    })
  })

  it('applies search filters', async () => {
    const { searchArticles } = require('@/lib/api')
    searchArticles.mockResolvedValue({ results: [], total: 0 })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>
    )

    // Apply filters
    await user.selectOption(screen.getByLabelText(/category/i), 'tutorial')
    await user.selectOption(screen.getByLabelText(/sort by/i), 'date')
    
    // Set date range
    await user.type(screen.getByLabelText(/from date/i), '2024-01-01')
    await user.type(screen.getByLabelText(/to date/i), '2024-12-31')

    // Search with filters
    await user.type(screen.getByRole('textbox'), 'javascript')
    await user.keyboard.press('Enter')

    await waitFor(() => {
      expect(searchArticles).toHaveBeenCalledWith({
        query: 'javascript',
        page: 1,
        filters: {
          category: 'tutorial',
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31'
        },
        sort: 'date'
      })
    })
  })

  it('handles empty search results', async () => {
    const { searchArticles } = require('@/lib/api')
    searchArticles.mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      totalPages: 0
    })