// ===== __tests__/unit/components/ProfileForm.test.tsx =====
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileForm from '@/components/profile/ProfileForm'

const mockUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  bio: 'Software developer',
  location: 'New York',
  website: 'https://johndoe.com',
  avatar: '/avatars/john.jpg'
}

const mockOnSubmit = jest.fn()

describe('ProfileForm Component', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders form with user data pre-filled', () => {
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Software developer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('New York')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://johndoe.com')).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    // Clear required field
    await user.clear(screen.getByLabelText(/name/i))
    await user.tab()
    
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    await user.clear(screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.tab()
    
    expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
  })

  it('validates website URL format', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    await user.clear(screen.getByLabelText(/website/i))
    await user.type(screen.getByLabelText(/website/i), 'not-a-url')
    await user.tab()
    
    expect(screen.getByText(/please enter a valid URL/i)).toBeInTheDocument()
  })

  it('validates bio character limit', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    const longBio = 'a'.repeat(501) // Exceeds 500 char limit
    await user.clear(screen.getByLabelText(/bio/i))
    await user.type(screen.getByLabelText(/bio/i), longBio)
    
    expect(screen.getByText(/bio must be 500 characters or less/i)).toBeInTheDocument()
  })

  it('shows character counter for bio', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    const bioField = screen.getByLabelText(/bio/i)
    await user.clear(bioField)
    await user.type(bioField, 'New bio')
    
    expect(screen.getByText('7/500')).toBeInTheDocument()
  })

  it('submits form with updated data', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    
    await user.clear(screen.getByLabelText(/bio/i))
    await user.type(screen.getByLabelText(/bio/i), 'Updated bio')
    
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        ...mockUser,
        name: 'Jane Doe',
        bio: 'Updated bio'
      })
    })
  })

  it('shows unsaved changes warning', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/name/i), ' Updated')
    
    expect(screen.getByText(/you have unsaved changes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /discard changes/i })).toBeInTheDocument()
  })

  it('discards unsaved changes', async () => {
    const user = userEvent.setup()
    render(<ProfileForm user={mockUser} onSubmit={mockOnSubmit} />)
    
    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), 'Changed Name')
    
    await user.click(screen.getByRole('button', { name: /discard changes/i }))
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument()
  })
})

// ===== __tests__/unit/components/AvatarUpload.test.tsx =====
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AvatarUpload from '@/components/profile/AvatarUpload'

const mockOnUpload = jest.fn()

describe('AvatarUpload Component', () => {
  beforeEach(() => {
    mockOnUpload.mockClear()
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()
  })

  it('renders current avatar', () => {
    render(
      <AvatarUpload 
        currentAvatar="/avatars/user.jpg"
        onUpload={mockOnUpload}
      />
    )
    
    const avatar = screen.getByRole('img', { name: /current avatar/i })
    expect(avatar).toHaveAttribute('src', '/avatars/user.jpg')
  })

  it('renders default avatar when no current avatar', () => {
    render(<AvatarUpload onUpload={mockOnUpload} />)
    
    expect(screen.getByTestId('default-avatar')).toBeInTheDocument()
  })

  it('opens file picker when upload button clicked', async () => {
    const user = userEvent.setup()
    render(<AvatarUpload onUpload={mockOnUpload} />)
    
    const fileInput = screen.getByLabelText(/upload avatar/i)
    const uploadButton = screen.getByRole('button', { name: /change avatar/i })
    
    await user.click(uploadButton)
    
    expect(fileInput).toHaveAttribute('type', 'file')
  })

  it('validates file type', async () => {
    const user = userEvent.setup()
    render(<AvatarUpload onUpload={mockOnUpload} />)
    
    const fileInput = screen.getByLabelText(/upload avatar/i)
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    await user.upload(fileInput, invalidFile)
    
    expect(screen.getByText(/please select an image file/i)).toBeInTheDocument()
    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('validates file size', async () => {
    const user = userEvent.setup()
    render(<AvatarUpload onUpload={mockOnUpload} maxSize={1024 * 1024} />) // 1MB limit
    
    const fileInput = screen.getByLabelText(/upload avatar/i)
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { 
      type: 'image/jpeg' 
    })
    
    await user.upload(fileInput, largeFile)
    
    expect(screen.getByText(/file size must be less than 1MB/i)).toBeInTheDocument()
    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('shows preview of selected image', async () => {
    const user = userEvent.setup()
    render(<AvatarUpload onUpload={mockOnUpload} />)
    
    const fileInput = screen.getByLabelText(/upload avatar/i)
    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, validFile)
    
    await waitFor(() => {
      expect(screen.getByTestId('avatar-preview')).toBeInTheDocument()
      expect(screen.getByTestId('avatar-preview')).toHaveAttribute('src', 'blob:mock-url')
    })
  })

  it('uploads valid image file', async () => {
    const user = userEvent.setup()
    render(<AvatarUpload onUpload={mockOnUpload} />)
    
    const fileInput = screen.getByLabelText(/upload avatar/i)
    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, validFile)
    await user.click(screen.getByRole('button', { name: /save avatar/i }))
    
    expect(mockOnUpload).toHaveBeenCalledWith(validFile)
  })

  it('shows upload progress', () => {
    render(
      <AvatarUpload 
        onUpload={mockOnUpload}
        uploadProgress={45}
        isUploading={true}
      />
    )
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('allows cropping functionality', async () => {
    const user = userEvent.setup()
    render(<AvatarUpload onUpload={mockOnUpload} allowCrop={true} />)
    
    const fileInput = screen.getByLabelText(/upload avatar/i)
    const validFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, validFile)
    
    expect(screen.getByTestId('image-cropper')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crop & save/i })).toBeInTheDocument()
  })
})

// ===== __tests__/integration/profile/profile-update.test.tsx =====
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import ProfilePage from '@/pages/profile'

// Mock API
jest.mock('@/lib/api', () => ({
  getCurrentUser: jest.fn(),
  updateProfile: jest.fn(),
  uploadAvatar: jest.fn()
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

describe('Profile Update Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads and displays user profile', async () => {
    const { getCurrentUser } = require('@/lib/api')
    getCurrentUser.mockResolvedValue({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      bio: 'Software developer',
      location: 'New York'
    })

    render(
      <TestWrapper>
        <ProfilePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Software developer')).toBeInTheDocument()
    })
  })

  it('updates profile successfully', async () => {
    const { getCurrentUser, updateProfile } = require('@/lib/api')
    getCurrentUser.mockResolvedValue({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    })
    updateProfile.mockResolvedValue({
      id: 1,
      name: 'John Smith',
      email: 'john@example.com'
    })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ProfilePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    })

    // Update name
    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), 'John Smith')
    
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        id: 1,
        name: 'John Smith',
        email: 'john@example.com'
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument()
    })
  })

  it('handles profile update errors', async () => {
    const { getCurrentUser, updateProfile } = require('@/lib/api')
    getCurrentUser.mockResolvedValue({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    })
    updateProfile.mockRejectedValue(new Error('Email already exists'))

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ProfilePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
    })

    await user.clear(screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })
  })

  it('uploads avatar successfully', async () => {
    const { getCurrentUser, uploadAvatar } = require('@/lib/api')
    getCurrentUser.mockResolvedValue({
      id: 1,
      name: 'John Doe',
      avatar: '/avatars/old.jpg'
    })
    uploadAvatar.mockResolvedValue({
      avatarUrl: '/avatars/new.jpg'
    })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ProfilePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /current avatar/i })).toBeInTheDocument()
    })

    // Upload new avatar
    const fileInput = screen.getByLabelText(/upload avatar/i)
    const avatarFile = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
    
    await user.upload(fileInput, avatarFile)
    await user.click(screen.getByRole('button', { name: /save avatar/i }))

    await waitFor(() => {
      expect(uploadAvatar).toHaveBeenCalledWith(avatarFile)
    })

    await waitFor(() => {
      expect(screen.getByText(/avatar updated successfully/i)).toBeInTheDocument()
    })
  })
})

// ===== __tests__/e2e/profile/profile-management.spec.ts =====
import { test, expect } from '@playwright/test'

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('view and edit profile information', async ({ page }) => {
    await page.goto('/profile')
    
    // Verify profile page loads
    await expect(page.locator('h1')).toContainText('Profile Settings')
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible()
    
    // Edit profile information
    await page.fill('[data-testid="name-input"]', 'Updated Name')
    await page.fill('[data-testid="bio-textarea"]', 'Updated bio description')
    await page.fill('[data-testid="location-input"]', 'San Francisco')
    await page.fill('[data-testid="website-input"]', 'https://example.com')
    
    // Save changes
    await page.click('[data-testid="save-profile"]')
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Profile updated successfully')
    
    // Verify changes persisted
    await page.reload()
    await expect(page.locator('[data-testid="name-input"]')).toHaveValue('Updated Name')
    await expect(page.locator('[data-testid="bio-textarea"]')).toHaveValue('Updated bio description')
  })

  test('upload and change profile avatar', async ({ page }) => {
    await page.goto('/profile')
    
    // Current avatar should be visible
    await expect(page.locator('[data-testid="current-avatar"]')).toBeVisible()
    
    // Upload new avatar
    const fileInput = page.locator('[data-testid="avatar-upload"]')
    await fileInput.setInputFiles('./test-fixtures/avatar.jpg')
    
    // Verify preview appears
    await expect(page.locator('[data-testid="avatar-preview"]')).toBeVisible()
    
    // Save avatar
    await page.click('[data-testid="save-avatar"]')
    
    // Verify upload success
    await expect(page.locator('[data-testid="avatar-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="current-avatar"]')).toHaveAttribute('src', /\/avatars\/.*\.jpg/)
  })

  test('form validation prevents invalid submissions', async ({ page }) => {
    await page.goto('/profile')
    
    // Clear required field
    await page.fill('[data-testid="name-input"]', '')
    await page.click('[data-testid="save-profile"]')
    
    // Should show validation error
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required')
    
    // Test email validation
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.click('[data-testid="save-profile"]')
    
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email')
    
    // Test website URL validation
    await page.fill('[data-testid="website-input"]', 'not-a-url')
    await page.click('[data-testid="save-profile"]')
    
    await expect(page.locator('[data-testid="website-error"]')).toBeVisible()
  })

  test('unsaved changes warning', async ({ page }) => {
    await page.goto('/profile')
    
    // Make changes
    await page.fill('[data-testid="name-input"]', 'Changed Name')
    
    // Try to navigate away
    await page.click('text=Dashboard')
    
    // Should show confirmation dialog
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('unsaved changes')
      dialog.dismiss()
    })
    
    // Should stay on profile page
    await expect(page).toHaveURL('/profile')
  })

  test('password change functionality', async ({ page }) => {
    await page.goto('/profile/security')
    
    // Fill password change form
    await page.fill('[data-testid="current-password"]', 'password123')
    await page.fill('[data-testid="new-password"]', 'newpassword456')
    await page.fill('[data-testid="confirm-password"]', 'newpassword456')
    
    await page.click('[data-testid="change-password"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="password-success"]')).toBeVisible()
    
    // Test new password works
    await page.goto('/logout')
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'newpassword456')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/dashboard')
  })

  test('account deactivation', async ({ page }) => {
    await page.goto('/profile/account')
    
    // Click deactivate account
    await page.click('[data-testid="deactivate-account"]')
    
    // Should show confirmation modal
    await expect(page.locator('[data-testid="deactivate-modal"]')).toBeVisible()
    await expect(page.locator('text=This action cannot be undone')).toBeVisible()
    
    // Confirm deactivation
    await page.fill('[data-testid="deactivate-confirmation"]', 'DEACTIVATE')
    await page.click('[data-testid="confirm-deactivation"]')
    
    // Should redirect to goodbye page
    await expect(page).toHaveURL('/account-deactivated')
    await expect(page.locator('text=Your account has been deactivated')).toBeVisible()
  })

  test('privacy settings management', async ({ page }) => {
    await page.goto('/profile/privacy')
    
    // Toggle privacy settings
    await page.check('[data-testid="profile-public"]')
    await page.check('[data-testid="show-email"]')
    await page.uncheck('[data-testid="allow-messages"]')
    
    await page.click('[data-testid="save-privacy"]')
    
    // Verify settings saved
    await expect(page.locator('[data-testid="privacy-success"]')).toBeVisible()
    
    // Test settings persisted
    await page.reload()
    await expect(page.locator('[data-testid="profile-public"]')).toBeChecked()
    await expect(page.locator('[data-testid="show-email"]')).toBeChecked()
    await expect(page.locator('[data-testid="allow-messages"]')).not.toBeChecked()
  })

  test('notification preferences', async ({ page }) => {
    await page.goto('/profile/notifications')
    
    // Configure notification settings
    await page.check('[data-testid="email-notifications"]')
    await page.check('[data-testid="push-notifications"]')
    await page.uncheck('[data-testid="marketing-emails"]')
    
    // Set notification frequency
    await page.selectOption('[data-testid="notification-frequency"]', 'weekly')
    
    await page.click('[data-testid="save-notifications"]')
    
    // Verify success
    await expect(page.locator('[data-testid="notifications-success"]')).toBeVisible()
  })

  test('export user data', async ({ page }) => {
    await page.goto('/profile/data')
    
    // Request data export
    await page.click('[data-testid="export-data"]')
    
    // Should show export initiated message
    await expect(page.locator('[data-testid="export-initiated"]')).toBeVisible()
    await expect(page.locator('text=We will email you when your data is ready')).toBeVisible()
  })

  test('mobile responsive profile editing', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/profile')
    
    // Form should be mobile-friendly
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible()
    
    // Avatar upload should work on mobile
    await page.click('[data-testid="change-avatar-mobile"]')
    await expect(page.locator('[data-testid="avatar-upload-modal"]')).toBeVisible()
    
    // Form fields should be touch-friendly
    const nameInput = page.locator('[data-testid="name-input"]')
    await nameInput.click()
    await expect(nameInput).toBeFocused()
  })
})