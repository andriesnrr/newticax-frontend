// ===== __tests__/unit/components/CommentForm.test.tsx =====
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentForm from '@/components/comments/CommentForm'

const mockOnSubmit = jest.fn()
const mockOnCancel = jest.fn()

describe('CommentForm Component', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear()
    mockOnCancel.mockClear()
  })

  it('renders comment form with textarea and buttons', () => {
    render(<CommentForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText(/write a comment/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /post comment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('validates comment content requirement', async () => {
    const user = userEvent.setup()
    render(<CommentForm onSubmit={mockOnSubmit} />)
    
    await user.click(screen.getByRole('button', { name: /post comment/i }))
    
    expect(screen.getByText(/comment cannot be empty/i)).toBeInTheDocument()
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('validates comment length limit', async () => {
    const user = userEvent.setup()
    render(<CommentForm onSubmit={mockOnSubmit} maxLength={100} />)
    
    const longComment = 'a'.repeat(101)
    await user.type(screen.getByLabelText(/write a comment/i), longComment)
    
    expect(screen.getByText(/comment is too long/i)).toBeInTheDocument()
  })

  it('shows character counter', async () => {
    const user = userEvent.setup()
    render(<CommentForm onSubmit={mockOnSubmit} maxLength={100} />)
    
    await user.type(screen.getByLabelText(/write a comment/i), 'Test comment')
    
    expect(screen.getByText('12/100')).toBeInTheDocument()
  })

  it('submits comment with valid content', async () => {
    const user = userEvent.setup()
    render(<CommentForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/write a comment/i), 'This is a test comment')
    await user.click(screen.getByRole('button', { name: /post comment/i }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: 'This is a test comment',
        parentId: null
      })
    })
  })

  it('handles reply mode correctly', () => {
    render(
      <CommentForm 
        onSubmit={mockOnSubmit} 
        parentId="123"
        placeholder="Reply to this comment..."
      />
    )
    
    expect(screen.getByPlaceholderText(/reply to this comment/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /post reply/i })).toBeInTheDocument()
  })

  it('shows loading state during submission', () => {
    render(<CommentForm onSubmit={mockOnSubmit} isSubmitting={true} />)
    
    const submitButton = screen.getByRole('button', { name: /post comment/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/posting/i)).toBeInTheDocument()
  })

  it('clears form after successful submission', async () => {
    const user = userEvent.setup()
    render(<CommentForm onSubmit={mockOnSubmit} />)
    
    const textarea = screen.getByLabelText(/write a comment/i)
    await user.type(textarea, 'Test comment')
    await user.click(screen.getByRole('button', { name: /post comment/i }))
    
    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('supports markdown formatting', async () => {
    const user = userEvent.setup()
    render(<CommentForm onSubmit={mockOnSubmit} supportMarkdown={true} />)
    
    expect(screen.getByText(/markdown supported/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument()
    
    // Test bold formatting
    await user.type(screen.getByLabelText(/write a comment/i), 'normal text')
    await user.selectAll()
    await user.click(screen.getByRole('button', { name: /bold/i }))
    
    expect(screen.getByLabelText(/write a comment/i)).toHaveValue('**normal text**')
  })

  it('shows preview when enabled', async () => {
    const user = userEvent.setup()
    render(<CommentForm onSubmit={mockOnSubmit} showPreview={true} />)
    
    await user.type(screen.getByLabelText(/write a comment/i), '**Bold text**')
    await user.click(screen.getByRole('tab', { name: /preview/i }))
    
    expect(screen.getByText('Bold text')).toBeInTheDocument()
    expect(screen.getByText('Bold text')).toHaveClass('font-bold')
  })
})

// ===== __tests__/unit/components/Comment.test.tsx =====
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Comment from '@/components/comments/Comment'

const mockComment = {
  id: '123',
  content: 'This is a test comment',
  author: {
    id: '456',
    name: 'John Doe',
    avatar: '/avatars/john.jpg'
  },
  createdAt: '2024-01-01T12:00:00Z',
  updatedAt: '2024-01-01T12:00:00Z',
  likes: 5,
  replies: [],
  isLiked: false,
  isEditable: true
}

const mockOnLike = jest.fn()
const mockOnReply = jest.fn()
const mockOnEdit = jest.fn()
const mockOnDelete = jest.fn()

describe('Comment Component', () => {
  beforeEach(() => {
    mockOnLike.mockClear()
    mockOnReply.mockClear()
    mockOnEdit.mockClear()
    mockOnDelete.mockClear()
  })

  it('renders comment with author and content', () => {
    render(<Comment comment={mockComment} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('This is a test comment')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /john doe/i })).toHaveAttribute('src', '/avatars/john.jpg')
  })

  it('displays formatted timestamp', () => {
    render(<Comment comment={mockComment} />)
    
    expect(screen.getByText(/jan 1, 2024/i)).toBeInTheDocument()
  })

  it('shows like button and count', () => {
    render(<Comment comment={mockComment} onLike={mockOnLike} />)
    
    expect(screen.getByRole('button', { name: /like comment/i })).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('handles like button click', async () => {
    const user = userEvent.setup()
    render(<Comment comment={mockComment} onLike={mockOnLike} />)
    
    await user.click(screen.getByRole('button', { name: /like comment/i }))
    
    expect(mockOnLike).toHaveBeenCalledWith('123')
  })

  it('shows liked state', () => {
    const likedComment = { ...mockComment, isLiked: true }
    render(<Comment comment={likedComment} onLike={mockOnLike} />)
    
    const likeButton = screen.getByRole('button', { name: /unlike comment/i })
    expect(likeButton).toHaveClass('comment-like--active')
  })

  it('shows reply button for authenticated user', () => {
    render(<Comment comment={mockComment} onReply={mockOnReply} />)
    
    expect(screen.getByRole('button', { name: /reply/i })).toBeInTheDocument()
  })

  it('shows edit and delete buttons for comment author', () => {
    render(
      <Comment 
        comment={mockComment} 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        currentUserId="456"
      />
    )
    
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides edit/delete buttons for other users', () => {
    render(
      <Comment 
        comment={mockComment} 
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        currentUserId="789"
      />
    )
    
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('shows edited indicator when comment is edited', () => {
    const editedComment = {
      ...mockComment,
      updatedAt: '2024-01-01T13:00:00Z' // Different from createdAt
    }
    render(<Comment comment={editedComment} />)
    
    expect(screen.getByText(/edited/i)).toBeInTheDocument()
  })

  it('renders nested replies', () => {
    const commentWithReplies = {
      ...mockComment,
      replies: [
        {
          id: '789',
          content: 'This is a reply',
          author: { id: '999', name: 'Jane Smith', avatar: '/avatars/jane.jpg' },
          createdAt: '2024-01-01T13:00:00Z',
          likes: 2,
          replies: []
        }
      ]
    }
    
    render(<Comment comment={commentWithReplies} />)
    
    expect(screen.getByText('This is a reply')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('shows load more replies button when needed', () => {
    const commentWithManyReplies = {
      ...mockComment,
      replyCount: 25,
      replies: Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        content: `Reply ${i}`,
        author: { id: String(i), name: `User ${i}`, avatar: '' },
        createdAt: '2024-01-01T13:00:00Z',
        likes: 0,
        replies: []
      }))
    }
    
    render(<Comment comment={commentWithManyReplies} />)
    
    expect(screen.getByRole('button', { name: /load more replies/i })).toBeInTheDocument()
    expect(screen.getByText(/15 more replies/i)).toBeInTheDocument()
  })

  it('supports markdown rendering', () => {
    const markdownComment = {
      ...mockComment,
      content: 'This is **bold** and *italic* text with [a link](https://example.com)'
    }
    
    render(<Comment comment={markdownComment} renderMarkdown={true} />)
    
    expect(screen.getByText('bold')).toHaveClass('font-bold')
    expect(screen.getByText('italic')).toHaveClass('italic')
    expect(screen.getByRole('link', { name: /a link/i })).toHaveAttribute('href', 'https://example.com')
  })
})

// ===== __tests__/integration/comments/comment-system.test.tsx =====
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import CommentsSection from '@/components/comments/CommentsSection'

// Mock API
jest.mock('@/lib/api', () => ({
  getComments: jest.fn(),
  createComment: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  likeComment: jest.fn()
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

describe('Comment System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads and displays comments', async () => {
    const { getComments } = require('@/lib/api')
    getComments.mockResolvedValue([
      {
        id: '123',
        content: 'First comment',
        author: { id: '1', name: 'User 1', avatar: '' },
        createdAt: '2024-01-01T12:00:00Z',
        likes: 5,
        replies: []
      },
      {
        id: '456',
        content: 'Second comment',
        author: { id: '2', name: 'User 2', avatar: '' },
        createdAt: '2024-01-01T13:00:00Z',
        likes: 3,
        replies: []
      }
    ])

    render(
      <TestWrapper>
        <CommentsSection articleId="article-123" />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('First comment')).toBeInTheDocument()
      expect(screen.getByText('Second comment')).toBeInTheDocument()
      expect(screen.getByText('User 1')).toBeInTheDocument()
      expect(screen.getByText('User 2')).toBeInTheDocument()
    })
  })

  it('creates new comment', async () => {
    const { getComments, createComment } = require('@/lib/api')
    getComments.mockResolvedValue([])
    createComment.mockResolvedValue({
      id: '789',
      content: 'New comment',
      author: { id: '1', name: 'Current User', avatar: '' },
      createdAt: '2024-01-01T14:00:00Z',
      likes: 0,
      replies: []
    })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <CommentsSection articleId="article-123" />
      </TestWrapper>
    )

    await user.type(screen.getByLabelText(/write a comment/i), 'New comment')
    await user.click(screen.getByRole('button', { name: /post comment/i }))

    await waitFor(() => {
      expect(createComment).toHaveBeenCalledWith({
        articleId: 'article-123',
        content: 'New comment',
        parentId: null
      })
    })

    await waitFor(() => {
      expect(screen.getByText('New comment')).toBeInTheDocument()
    })
  })

  it('replies to existing comment', async () => {
    const { getComments, createComment } = require('@/lib/api')
    getComments.mockResolvedValue([
      {
        id: '123',
        content: 'Original comment',
        author: { id: '1', name: 'User 1', avatar: '' },
        createdAt: '2024-01-01T12:00:00Z',
        likes: 0,
        replies: []
      }
    ])
    createComment.mockResolvedValue({
      id: '456',
      content: 'Reply comment',
      author: { id: '2', name: 'Current User', avatar: '' },
      createdAt: '2024-01-01T14:00:00Z',
      likes: 0,
      replies: []
    })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <CommentsSection articleId="article-123" />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Original comment')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /reply/i }))
    
    const replyForm = screen.getByLabelText(/reply to this comment/i)
    await user.type(replyForm, 'Reply comment')
    await user.click(screen.getByRole('button', { name: /post reply/i }))

    await waitFor(() => {
      expect(createComment).toHaveBeenCalledWith({
        articleId: 'article-123',
        content: 'Reply comment',
        parentId: '123'
      })
    })
  })

  it('likes and unlikes comments', async () => {
    const { getComments, likeComment } = require('@/lib/api')
    getComments.mockResolvedValue([
      {
        id: '123',
        content: 'Test comment',
        author: { id: '1', name: 'User 1', avatar: '' },
        createdAt: '2024-01-01T12:00:00Z',
        likes: 5,
        isLiked: false,
        replies: []
      }
    ])
    likeComment.mockResolvedValue({ likes: 6, isLiked: true })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <CommentsSection articleId="article-123" />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /like comment/i }))

    await waitFor(() => {
      expect(likeComment).toHaveBeenCalledWith('123')
    })

    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument()
    })
  })

  it('edits existing comment', async () => {
    const { getComments, updateComment } = require('@/lib/api')
    getComments.mockResolvedValue([
      {
        id: '123',
        content: 'Original content',
        author: { id: '1', name: 'Current User', avatar: '' },
        createdAt: '2024-01-01T12:00:00Z',
        likes: 0,
        isEditable: true,
        replies: []
      }
    ])
    updateComment.mockResolvedValue({
      id: '123',
      content: 'Updated content',
      author: { id: '1', name: 'Current User', avatar: '' },
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T14:00:00Z',
      likes: 0,
      replies: []
    })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <CommentsSection articleId="article-123" currentUserId="1" />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Original content')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit/i }))
    
    const editForm = screen.getByDisplayValue('Original content')
    await user.clear(editForm)
    await user.type(editForm, 'Updated content')
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(updateComment).toHaveBeenCalledWith('123', { content: 'Updated content' })
    })

    await waitFor(() => {
      expect(screen.getByText('Updated content')).toBeInTheDocument()
      expect(screen.getByText(/edited/i)).toBeInTheDocument()
    })
  })

  it('deletes comment with confirmation', async () => {
    const { getComments, deleteComment } = require('@/lib/api')
    getComments.mockResolvedValue([
      {
        id: '123',
        content: 'Comment to delete',
        author: { id: '1', name: 'Current User', avatar: '' },
        createdAt: '2024-01-01T12:00:00Z',
        likes: 0,
        isDeletable: true,
        replies: []
      }
    ])
    deleteComment.mockResolvedValue({ success: true })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <CommentsSection articleId="article-123" currentUserId="1" />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Comment to delete')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /delete/i }))
    
    // Confirm deletion in modal
    await user.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith('123')
    })

    await waitFor(() => {
      expect(screen.queryByText('Comment to delete')).not.toBeInTheDocument()
    })
  })
})

// ===== __tests__/e2e/comments/comment-interactions.spec.ts =====
import { test, expect } from '@playwright/test'

test.describe('Comment Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('complete comment workflow - post, reply, edit, delete', async ({ page }) => {
    await page.goto('/articles/test-article')
    
    // Post a new comment
    await page.fill('[data-testid="comment-input"]', 'This is my original comment')
    await page.click('[data-testid="post-comment"]')
    
    // Verify comment appears
    await expect(page.locator('text=This is my original comment')).toBeVisible()
    
    // Reply to the comment
    await page.click('[data-testid="reply-button"]')
    await page.fill('[data-testid="reply-input"]', 'This is a reply to my comment')
    await page.click('[data-testid="post-reply"]')
    
    // Verify reply appears
    await expect(page.locator('text=This is a reply to my comment')).toBeVisible()
    
    // Edit the original comment
    await page.click('[data-testid="edit-comment"]')
    await page.fill('[data-testid="edit-input"]', 'This is my edited comment')
    await page.click('[data-testid="save-edit"]')
    
    // Verify edit appears with edited indicator
    await expect(page.locator('text=This is my edited comment')).toBeVisible()
    await expect(page.locator('[data-testid="edited-indicator"]')).toBeVisible()
    
    // Delete the reply
    await page.click('[data-testid="delete-reply"]')
    await page.click('[data-testid="confirm-delete"]')
    
    // Verify reply is removed
    await expect(page.locator('text=This is a reply to my comment')).not.toBeVisible()
    
    // Delete the original comment
    await page.click('[data-testid="delete-comment"]')
    await page.click('[data-testid="confirm-delete"]')
    
    // Verify comment is removed
    await expect(page.locator('text=This is my edited comment')).not.toBeVisible()
  })

  test('like and unlike comments', async ({ page }) => {
    await page.goto('/articles/test-article')
    
    // Post a comment
    await page.fill('[data-testid="comment-input"]', 'Comment to be liked')
    await page.click('[data-testid="post-comment"]')
    
    // Like the comment
    const likeButton = page.locator('[data-testid="like-button"]').first()
    const likeCount = page.locator('[data-testid="like-count"]').first()
    
    // Initial state should be 0 likes
    await expect(likeCount).toContainText('0')
    
    await likeButton.click()
    
    // Should increase to 1 like
    await expect(likeCount).toContainText('1')
    await expect(likeButton).toHaveClass(/liked/)
    
    // Unlike the comment
    await likeButton.click()
    
    // Should return to 0 likes
    await expect(likeCount).toContainText('0')
    await expect(likeButton).not.toHaveClass(/liked/)
  })

  test('nested comment threads', async ({ page }) => {
    await page.goto('/articles/test-article')
    
    // Post original comment
    await page.fill('[data-testid="comment-input"]', 'Original comment')
    await page.click('[data-testid="post-comment"]')
    
    // Reply to original comment
    await page.click('[data-testid="reply-button"]')
    await page.fill('[data-testid="reply-input"]', 'First level reply')
    await page.click('[data-testid="post-reply"]')
    
    // Reply to the reply (nested reply)
    await page.locator('[data-testid="comment-thread"]')
      .locator('[data-testid="reply-button"]')
      .last()
      .click()
    
    await page.fill('[data-testid="nested-reply-input"]', 'Second level reply')
    await page.click('[data-testid="post-nested-reply"]')
    
    // Verify nested structure
    await expect(page.locator('text=Original comment')).toBeVisible()
    await expect(page.locator('text=First level reply')).toBeVisible()
    await expect(page.locator('text=Second level reply')).toBeVisible()
    
    // Verify proper indentation/nesting
    const nestedReply = page.locator('[data-testid="nested-comment"]')
    await expect(nestedReply).toHaveClass(/ml-8|pl-8/) // Check for indentation classes
  })

  test('comment moderation and reporting', async ({ page }) => {
    await page.goto('/articles/test-article')
    
    // Find an existing comment to report
    const comment = page.locator('[data-testid="comment-item"]').first()
    
    // Click report button
    await comment.locator('[data-testid="report-comment"]').click()
    
    // Fill report form
    await page.selectOption('[data-testid="report-reason"]', 'spam')
    await page.fill('[data-testid="report-details"]', 'This comment is spam')
    await page.click('[data-testid="submit-report"]')
    
    // Verify report success
    await expect(page.locator('[data-testid="report-success"]')).toBeVisible()
    await expect(page.locator('text=Report submitted successfully')).toBeVisible()
  })

  test('comment sorting and filtering', async ({ page }) => {
    await page.goto('/articles/test-article')
    
    // Change sort order
    await page.selectOption('[data-testid="comment-sort"]', 'oldest')
    
    // Verify comments are sorted by oldest first
    const comments = page.locator('[data-testid="comment-item"]')
    const firstComment = comments.first()
    const lastComment = comments.last()
    
    // Check timestamps (implementation would depend on your actual data)
    await expect(firstComment.locator('[data-testid="comment-date"]')).toBeVisible()
    
    // Test newest first
    await page.selectOption('[data-testid="comment-sort"]', 'newest')
    await page.waitForLoadState('networkidle')
    
    // Test most liked
    await page.selectOption('[data-testid="comment-sort"]', 'most-liked')
    await page.waitForLoadState('networkidle')
  })

  test('comment pagination and load more', async ({ page }) => {
    await page.goto('/articles/popular-article') // Article with many comments
    
    // Should show initial batch of comments
    await expect(page.locator('[data-testid="comment-item"]')).toHaveCount(10)
    
    // Load more comments
    await page.click('[data-testid="load-more-comments"]')
    
    // Should show more comments
    await expect(page.locator('[data-testid="comment-item"]')).toHaveCount(20)
    
    // Test "View all replies" for comment with many replies
    const commentWithReplies = page.locator('[data-testid="comment-with-replies"]').first()
    await commentWithReplies.locator('[data-testid="view-all-replies"]').click()
    
    // Should expand to show all replies
    await expect(commentWithReplies.locator('[data-testid="reply-item"]')).toHaveCountGreaterThan(3)
  })

  test('comment markdown support', async ({ page }) => {
    await page.goto('/articles/test-article')
    
    // Post comment with markdown
    const markdownComment = `
**Bold text** and *italic text*
[Link to example](https://example.com)
\`inline code\`

\`\`\`javascript
console.log('code block');
\`\`\`
    `
    
    await page.fill('[data-testid="comment-input"]', markdownComment)
    
    // Switch to preview tab
    await page.click('[data-testid="preview-tab"]')
    
    // Verify markdown rendering in preview
    await expect(page.locator('[data-testid="comment-preview"] strong')).toContainText('Bold text')
    await expect(page.locator('[data-testid="comment-preview"] em')).toContainText('italic text')
    await expect(page.locator('[data-testid="comment-preview"] a')).toHaveAttribute('href', 'https://example.com')
    
    // Post the comment
    await page.click('[data-testid="post-comment"]')
    
    // Verify markdown is rendered in the posted comment
    const postedComment = page.locator('[data-testid="comment-item"]').first()
    await expect(postedComment.locator('strong')).toContainText('Bold text')
    await expect(postedComment.locator('em')).toContainText('italic text')
  })

  test('comment notifications', async ({ page }) => {
    // Login as first user
    await page.goto('/articles/test-article')
    
    // Post a comment
    await page.fill('[data-testid="comment-input"]', 'Comment for notification test')
    await page.click('[data-testid="post-comment"]')
    
    // Logout and login as different user
    await page.goto('/logout')
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'user2@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    // Reply to the first user's comment
    await page.goto('/articles/test-article')
    await page.click('[data-testid="reply-button"]')
    await page.fill('[data-testid="reply-input"]', 'Reply that should notify')
    await page.click('[data-testid="post-reply"]')
    
    // Login back as first user
    await page.goto('/logout')
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    // Check notifications
    await page.click('[data-testid="notifications-bell"]')
    await expect(page.locator('[data-testid="notification-item"]')).toContainText('replied to your comment')
  })

  test('comment accessibility features', async ({ page }) => {
    await page.goto('/articles/test-article')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab') // Focus on comment input
    await page.keyboard.type('Keyboard navigation test')
    await page.keyboard.press('Tab') // Focus on post button
    await page.keyboard.press('Enter') // Submit comment
    
    // Verify comment was posted
    await expect(page.locator('text=Keyboard navigation test')).toBeVisible()
    
    // Test screen reader labels
    const commentForm = page.locator('[data-testid="comment-form"]')
    await expect(commentForm.locator('textarea')).toHaveAttribute('aria-label', /write a comment/i)
    
    const likeButton = page.locator('[data-testid="like-button"]').first()
    await expect(likeButton).toHaveAttribute('aria-label', /like comment/i)
    
    // Test focus management
    await page.click('[data-testid="reply-button"]')
    const replyInput = page.locator('[data-testid="reply-input"]')
    await expect(replyInput).toBeFocused()
  })

  test('comment real-time updates', async ({ browser }) => {
    // Open two browser contexts to simulate real-time updates
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    // Login in both contexts
    for (const page of [page1, page2]) {
      await page.goto('/login')
      await page.fill('[data-testid="email-input"]', 'user@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')
    }
    
    // Both navigate to same article
    await page1.goto('/articles/test-article')
    await page2.goto('/articles/test-article')
    
    // Post comment in page1
    await page1.fill('[data-testid="comment-input"]', 'Real-time update test')
    await page1.click('[data-testid="post-comment"]')
    
    // Comment should appear in page2 automatically (via WebSocket/polling)
    await expect(page2.locator('text=Real-time update test')).toBeVisible({ timeout: 10000 })
    
    await context1.close()
    await context2.close()
  })

  test('comment spam protection', async ({ page }) => {
    await page.goto('/articles/test-article')
    
    // Try to post multiple comments quickly
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="comment-input"]', `Rapid comment ${i}`)
      await page.click('[data-testid="post-comment"]')
      
      if (i >= 2) {
        // Should show rate limiting message after 3rd comment
        await expect(page.locator('[data-testid="rate-limit-warning"]')).toBeVisible()
        break
      }
    }
    
    // Test duplicate comment prevention
    await page.fill('[data-testid="comment-input"]', 'Exact same comment')
    await page.click('[data-testid="post-comment"]')
    
    // Try to post the same comment again
    await page.fill('[data-testid="comment-input"]', 'Exact same comment')
    await page.click('[data-testid="post-comment"]')
    
    await expect(page.locator('[data-testid="duplicate-warning"]')).toBeVisible()
  })
})