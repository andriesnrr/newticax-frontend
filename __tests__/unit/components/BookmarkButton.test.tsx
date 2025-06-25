// ===== __tests__/unit/components/BookmarkButton.test.tsx =====
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BookmarkButton from '@/components/BookmarkButton'

const mockOnBookmark = jest.fn()

describe('BookmarkButton Component', () => {
  beforeEach(() => {
    mockOnBookmark.mockClear()
  })

  it('renders bookmark button in unbookmarked state', () => {
    render(
      <BookmarkButton 
        isBookmarked={false} 
        onBookmark={mockOnBookmark}
        articleId="123"
      />
    )
    
    const button = screen.getByRole('button', { name: /bookmark/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bookmark-button--unbookmarked')
    expect(screen.getByLabelText(/add to bookmarks/i)).toBeInTheDocument()
  })

  it('renders bookmark button in bookmarked state', () => {
    render(
      <BookmarkButton 
        isBookmarked={true} 
        onBookmark={mockOnBookmark}
        articleId="123"
      />
    )
    
    const button = screen.getByRole('button', { name: /bookmarked/i })
    expect(button).toHaveClass('bookmark-button--bookmarked')
    expect(screen.getByLabelText(/remove from bookmarks/i)).toBeInTheDocument()
  })

  it('calls onBookmark when clicked', async () => {
    const user = userEvent.setup()
    render(
      <BookmarkButton 
        isBookmarked={false} 
        onBookmark={mockOnBookmark}
        articleId="123"
      />
    )
    
    await user.click(screen.getByRole('button'))
    
    expect(mockOnBookmark).toHaveBeenCalledWith('123', true)
  })

  it('shows loading state during bookmark action', () => {
    render(
      <BookmarkButton 
        isBookmarked={false} 
        onBookmark={mockOnBookmark}
        articleId="123"
        isLoading={true}
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('shows bookmark count when provided', () => {
    render(
      <BookmarkButton 
        isBookmarked={false} 
        onBookmark={mockOnBookmark}
        articleId="123"
        bookmarkCount={42}
      />
    )
    
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('requires authentication for bookmark action', async () => {
    const mockOnAuthRequired = jest.fn()
    const user = userEvent.setup()
    
    render(
      <BookmarkButton 
        isBookmarked={false} 
        onBookmark={mockOnBookmark}
        articleId="123"
        isAuthenticated={false}
        onAuthRequired={mockOnAuthRequired}
      />
    )
    
    await user.click(screen.getByRole('button'))
    
    expect(mockOnAuthRequired).toHaveBeenCalled()
    expect(mockOnBookmark).not.toHaveBeenCalled()
  })
})

// ===== __tests__/unit/utils/bookmark.test.ts =====
import { 
  addBookmark, 
  removeBookmark, 
  getBookmarks,
  isBookmarked,
  syncBookmarks,
  exportBookmarks 
} from '@/utils/bookmark'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
global.localStorage = localStorageMock

describe('Bookmark Utilities', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  describe('addBookmark', () => {
    it('adds bookmark to empty list', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const bookmark = {
        id: '123',
        title: 'Test Article',
        url: '/article/123',
        timestamp: Date.now()
      }
      
      addBookmark(bookmark)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bookmarks',
        JSON.stringify([bookmark])
      )
    })

    it('adds bookmark to existing list', () => {
      const existingBookmarks = [
        { id: '456', title: 'Existing Article', url: '/article/456', timestamp: Date.now() }
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingBookmarks))
      
      const newBookmark = {
        id: '123',
        title: 'Test Article',
        url: '/article/123',
        timestamp: Date.now()
      }
      
      addBookmark(newBookmark)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bookmarks',
        JSON.stringify([...existingBookmarks, newBookmark])
      )
    })

    it('prevents duplicate bookmarks', () => {
      const existingBookmarks = [
        { id: '123', title: 'Test Article', url: '/article/123', timestamp: Date.now() }
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingBookmarks))
      
      const duplicateBookmark = {
        id: '123',
        title: 'Test Article Updated',
        url: '/article/123',
        timestamp: Date.now()
      }
      
      addBookmark(duplicateBookmark)
      
      // Should not add duplicate, storage should remain unchanged
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe('removeBookmark', () => {
    it('removes bookmark from list', () => {
      const bookmarks = [
        { id: '123', title: 'Article 1', url: '/article/123', timestamp: Date.now() },
        { id: '456', title: 'Article 2', url: '/article/456', timestamp: Date.now() }
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(bookmarks))
      
      removeBookmark('123')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'bookmarks',
        JSON.stringify([bookmarks[1]])
      )
    })
  })

  describe('getBookmarks', () => {
    it('returns empty array when no bookmarks', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const bookmarks = getBookmarks()
      expect(bookmarks).toEqual([])
    })

    it('returns sorted bookmarks by timestamp', () => {
      const bookmarks = [
        { id: '123', title: 'Old Article', url: '/article/123', timestamp: 1000 },
        { id: '456', title: 'New Article', url: '/article/456', timestamp: 2000 }
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(bookmarks))
      
      const result = getBookmarks()
      expect(result[0].id).toBe('456') // Newest first
      expect(result[1].id).toBe('123')
    })
  })

  describe('isBookmarked', () => {
    it('returns true for bookmarked article', () => {
      const bookmarks = [
        { id: '123', title: 'Test Article', url: '/article/123', timestamp: Date.now() }
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(bookmarks))
      
      expect(isBookmarked('123')).toBe(true)
    })

    it('returns false for non-bookmarked article', () => {
      localStorageMock.getItem.mockReturnValue('[]')
      
      expect(isBookmarked('123')).toBe(false)
    })
  })

  describe('exportBookmarks', () => {
    it('exports bookmarks as JSON', () => {
      const bookmarks = [
        { id: '123', title: 'Test Article', url: '/article/123', timestamp: Date.now() }
      ]
      localStorageMock.getItem.mockReturnValue(JSON.stringify(bookmarks))
      
      const exported = exportBookmarks()
      expect(exported).toEqual({
        bookmarks,
        exportDate: expect.any(String),
        version: '1.0'
      })
    })
  })
})

// ===== __tests__/integration/bookmark/bookmark-management.test.tsx =====
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import BookmarkPage from '@/pages/bookmarks'
import ArticleCard from '@/components/ArticleCard'

// Mock API
jest.mock('@/lib/api', () => ({
  getBookmarks: jest.fn(),
  addBookmark: jest.fn(),
  removeBookmark: jest.fn()
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('Bookmark Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('displays user bookmarks', async () => {
    const { getBookmarks } = require('@/lib/api')
    getBookmarks.mockResolvedValue([
      {
        id: '123',
        title: 'Bookmarked Article 1',
        summary: 'Article summary',
        bookmarkedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '456',
        title: 'Bookmarked Article 2',
        summary: 'Another summary',
        bookmarkedAt: '2024-01-02T00:00:00Z'
      }
    ])

    render(
      <TestWrapper>
        <BookmarkPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Bookmarked Article 1')).toBeInTheDocument()
      expect(screen.getByText('Bookmarked Article 2')).toBeInTheDocument()
    })
  })

  it('removes bookmark when unbookmark clicked', async () => {
    const { getBookmarks, removeBookmark } = require('@/lib/api')
    getBookmarks.mockResolvedValue([
      {
        id: '123',
        title: 'Bookmarked Article',
        summary: 'Article summary',
        bookmarkedAt: '2024-01-01T00:00:00Z'
      }
    ])
    removeBookmark.mockResolvedValue({ success: true })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <BookmarkPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Bookmarked Article')).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText(/remove from bookmarks/i))

    await waitFor(() => {
      expect(removeBookmark).toHaveBeenCalledWith('123')
    })
  })

  it('shows empty state when no bookmarks', async () => {
    const { getBookmarks } = require('@/lib/api')
    getBookmarks.mockResolvedValue([])

    render(
      <TestWrapper>
        <BookmarkPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText(/no bookmarks yet/i)).toBeInTheDocument()
      expect(screen.getByText(/discover great articles/i)).toBeInTheDocument()
    })
  })

  it('filters bookmarks by search term', async () => {
    const { getBookmarks } = require('@/lib/api')
    getBookmarks.mockResolvedValue([
      { id: '123', title: 'React Tutorial', summary: 'Learn React' },
      { id: '456', title: 'Vue Guide', summary: 'Vue.js guide' }
    ])

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <BookmarkPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('React Tutorial')).toBeInTheDocument()
      expect(screen.getByText('Vue Guide')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText(/search bookmarks/i), 'React')

    await waitFor(() => {
      expect(screen.getByText('React Tutorial')).toBeInTheDocument()
      expect(screen.queryByText('Vue Guide')).not.toBeInTheDocument()
    })
  })
})

// ===== __tests__/e2e/bookmark/bookmark-flow.spec.ts =====
import { test, expect } from '@playwright/test'

test.describe('Bookmark Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('bookmark and unbookmark article from article page', async ({ page }) => {
    // Go to an article
    await page.goto('/articles/test-article-123')
    
    // Article should be unbookmarked initially
    const bookmarkButton = page.locator('[data-testid="bookmark-button"]')
    await expect(bookmarkButton).toHaveAttribute('aria-label', 'Add to bookmarks')
    
    // Bookmark the article
    await bookmarkButton.click()
    
    // Button should update to bookmarked state
    await expect(bookmarkButton).toHaveAttribute('aria-label', 'Remove from bookmarks')
    await expect(page.locator('.bookmark-button--bookmarked')).toBeVisible()
    
    // Verify bookmark appears in bookmarks page
    await page.goto('/bookmarks')
    await expect(page.locator('text=Test Article 123')).toBeVisible()
    
    // Return to article and unbookmark
    await page.goto('/articles/test-article-123')
    await bookmarkButton.click()
    
    // Button should return to unbookmarked state
    await expect(bookmarkButton).toHaveAttribute('aria-label', 'Add to bookmarks')
    
    // Verify bookmark removed from bookmarks page
    await page.goto('/bookmarks')
    await expect(page.locator('text=Test Article 123')).not.toBeVisible()
  })

  test('bookmark article from article list', async ({ page }) => {
    await page.goto('/articles')
    
    // Find first article and bookmark it
    const firstArticle = page.locator('[data-testid="article-card"]').first()
    const bookmarkButton = firstArticle.locator('[data-testid="bookmark-button"]')
    
    await bookmarkButton.click()
    await expect(bookmarkButton).toHaveClass(/bookmark-button--bookmarked/)
    
    // Verify it appears in bookmarks
    await page.goto('/bookmarks')
    await expect(page.locator('[data-testid="bookmark-item"]')).toHaveCount(1)
  })

  test('manage bookmarks from bookmarks page', async ({ page }) => {
    // First, bookmark some articles
    await page.goto('/articles')
    
    const articleCards = page.locator('[data-testid="article-card"]')
    await articleCards.nth(0).locator('[data-testid="bookmark-button"]').click()
    await articleCards.nth(1).locator('[data-testid="bookmark-button"]').click()
    
    // Go to bookmarks page
    await page.goto('/bookmarks')
    
    // Should see 2 bookmarks
    await expect(page.locator('[data-testid="bookmark-item"]')).toHaveCount(2)
    
    // Remove one bookmark
    await page.locator('[data-testid="bookmark-item"]').first()
      .locator('[data-testid="remove-bookmark"]').click()
    
    // Should confirm removal
    await page.locator('[data-testid="confirm-remove"]').click()
    
    // Should have 1 bookmark left
    await expect(page.locator('[data-testid="bookmark-item"]')).toHaveCount(1)
  })

  test('search and filter bookmarks', async ({ page }) => {
    // Bookmark articles with different titles
    await page.goto('/articles/react-tutorial')
    await page.locator('[data-testid="bookmark-button"]').click()
    
    await page.goto('/articles/vue-guide')
    await page.locator('[data-testid="bookmark-button"]').click()
    
    await page.goto('/articles/javascript-basics')
    await page.locator('[data-testid="bookmark-button"]').click()
    
    // Go to bookmarks and search
    await page.goto('/bookmarks')
    await expect(page.locator('[data-testid="bookmark-item"]')).toHaveCount(3)
    
    // Search for 'react'
    await page.fill('[data-testid="bookmark-search"]', 'react')
    await expect(page.locator('[data-testid="bookmark-item"]')).toHaveCount(1)
    await expect(page.locator('text=React Tutorial')).toBeVisible()
    
    // Clear search
    await page.fill('[data-testid="bookmark-search"]', '')
    await expect(page.locator('[data-testid="bookmark-item"]')).toHaveCount(3)
    
    // Filter by date
    await page.selectOption('[data-testid="bookmark-sort"]', 'newest')
    const bookmarkItems = page.locator('[data-testid="bookmark-item"]')
    await expect(bookmarkItems.first()).toContainText('Javascript Basics') // Most recent
  })

  test('export bookmarks', async ({ page }) => {
    // Bookmark some articles first
    await page.goto('/articles/test-article')
    await page.locator('[data-testid="bookmark-button"]').click()
    
    await page.goto('/bookmarks')
    
    // Start download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-bookmarks"]')
    ])
    
    // Verify download
    expect(download.suggestedFilename()).toBe('bookmarks.json')
    
    // Save and verify content
    const path = await download.path()
    expect(path).toBeTruthy()
  })

  test('bookmark synchronization across tabs', async ({ browser }) => {
    const context = await browser.newContext()
    const page1 = await context.newPage()
    const page2 = await context.newPage()
    
    // Login in both tabs
    for (const page of [page1, page2]) {
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'user@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
    }
    
    // Bookmark in tab 1
    await page1.goto('/articles/test-article')
    await page1.locator('[data-testid="bookmark-button"]').click()
    
    // Check tab 2 shows the bookmark
    await page2.goto('/bookmarks')
    await page2.reload() // Trigger sync
    await expect(page2.locator('[data-testid="bookmark-item"]')).toHaveCount(1)
    
    await context.close()
  })

  test('bookmark requires authentication', async ({ page }) => {
    // Logout first
    await page.goto('/logout')
    
    // Try to bookmark without login
    await page.goto('/articles/test-article')
    await page.locator('[data-testid="bookmark-button"]').click()
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="login-required-message"]')).toBeVisible()
  })

  test('bookmark limit and premium features', async ({ page }) => {
    // Simulate free user with bookmark limit
    await page.route('/api/user/profile', route => {
      route.fulfill({
        json: { user: { id: 1, plan: 'free', bookmarkLimit: 5 } }
      })
    })
    
    await page.goto('/bookmarks')
    
    // Mock having 5 bookmarks (at limit)
    await page.route('/api/bookmarks', route => {
      route.fulfill({
        json: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          title: `Article ${i + 1}`,
          summary: `Summary ${i + 1}`
        }))
      })
    })
    
    await page.reload()
    await expect(page.locator('[data-testid="bookmark-limit-warning"]')).toBeVisible()
    
    // Try to bookmark another article
    await page.goto('/articles/new-article')
    await page.locator('[data-testid="bookmark-button"]').click()
    
    // Should show upgrade prompt
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible()
    await expect(page.locator('text=Upgrade to Premium')).toBeVisible()
  })
})