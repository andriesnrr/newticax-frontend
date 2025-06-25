// ===== __tests__/unit/components/LoginForm.test.tsx =====
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/components/auth/LoginForm'

const mockOnSubmit = jest.fn()

describe('LoginForm Component', () => {
  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders login form with all fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    await user.tab()
    
    expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
  })

  it('validates password requirement', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    await user.click(passwordInput)
    await user.tab()
    
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      })
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />)
    
    const submitButton = screen.getByRole('button', { name: /login/i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText(/logging in/i)).toBeInTheDocument()
  })

  it('displays error message', () => {
    const errorMessage = 'Invalid credentials'
    render(<LoginForm onSubmit={mockOnSubmit} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('toggles remember me checkbox', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i)
    expect(rememberMeCheckbox).not.toBeChecked()
    
    await user.click(rememberMeCheckbox)
    expect(rememberMeCheckbox).toBeChecked()
  })

  it('shows/hides password when toggle clicked', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByLabelText(/toggle password visibility/i)
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })
})

// ===== __tests__/unit/utils/auth.test.ts =====
import { 
  validateEmail, 
  validatePassword, 
  encryptPassword,
  generateSessionToken,
  isSessionValid 
} from '@/utils/auth'

describe('Auth Utilities', () => {
  describe('validateEmail', () => {
    it('validates correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'firstname+lastname@example.org'
      ]
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true)
      })
    })

    it('rejects invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com'
      ]
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false)
      })
    })
  })

  describe('validatePassword', () => {
    it('validates strong passwords', () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd',
        'Test123$ecure'
      ]
      
      strongPasswords.forEach(password => {
        expect(validatePassword(password)).toEqual({
          isValid: true,
          errors: []
        })
      })
    })

    it('rejects weak passwords', () => {
      const weakPasswords = [
        { password: '123', expectedErrors: ['too_short', 'no_uppercase', 'no_special'] },
        { password: 'password', expectedErrors: ['no_numbers', 'no_uppercase', 'no_special'] },
        { password: 'PASSWORD123', expectedErrors: ['no_lowercase', 'no_special'] }
      ]
      
      weakPasswords.forEach(({ password, expectedErrors }) => {
        const result = validatePassword(password)
        expect(result.isValid).toBe(false)
        expectedErrors.forEach(error => {
          expect(result.errors).toContain(error)
        })
      })
    })
  })

  describe('encryptPassword', () => {
    it('encrypts password consistently', () => {
      const password = 'testPassword123'
      const salt = 'testSalt'
      
      const encrypted1 = encryptPassword(password, salt)
      const encrypted2 = encryptPassword(password, salt)
      
      expect(encrypted1).toBe(encrypted2)
      expect(encrypted1).not.toBe(password)
    })
  })

  describe('generateSessionToken', () => {
    it('generates unique tokens', () => {
      const token1 = generateSessionToken()
      const token2 = generateSessionToken()
      
      expect(token1).not.toBe(token2)
      expect(token1).toHaveLength(32)
      expect(token2).toHaveLength(32)
    })
  })

  describe('isSessionValid', () => {
    it('validates active sessions', () => {
      const futureTime = Date.now() + 3600000 // 1 hour from now
      expect(isSessionValid(futureTime)).toBe(true)
    })

    it('invalidates expired sessions', () => {
      const pastTime = Date.now() - 3600000 // 1 hour ago
      expect(isSessionValid(pastTime)).toBe(false)
    })
  })
})

// ===== __tests__/integration/auth/login.test.tsx =====
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from '@/pages/login'

// Mock API calls
jest.mock('@/lib/api', () => ({
  login: jest.fn(),
  verifySession: jest.fn()
}))

const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
    pathname: '/login'
  })
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

describe('Login Integration', () => {
  beforeEach(() => {
    mockPush.mockClear()
    jest.clearAllMocks()
  })

  it('completes successful login flow', async () => {
    const { login } = require('@/lib/api')
    login.mockResolvedValue({
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      token: 'mock-token'
    })

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    )

    // Fill and submit form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))

    // Wait for API call and redirect
    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      })
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles login failure', async () => {
    const { login } = require('@/lib/api')
    login.mockRejectedValue(new Error('Invalid credentials'))

    const user = userEvent.setup()
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    )

    await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /login/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects authenticated users', async () => {
    const { verifySession } = require('@/lib/api')
    verifySession.mockResolvedValue({
      user: { id: 1, email: 'test@example.com' }
    })

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })
})

// ===== __tests__/e2e/auth/login-flow.spec.ts =====
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    
    // Submit form
    await page.click('[data-testid="login-button"]')
    
    // Wait for redirect
    await expect(page).toHaveURL('/dashboard')
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('text=Welcome back')).toBeVisible()
  })

  test('invalid credentials show error', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    // Should stay on login page
    await expect(page).toHaveURL('/login')
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password')
  })

  test('form validation prevents submission', async ({ page }) => {
    // Try to submit empty form
    await page.click('[data-testid="login-button"]')
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
    
    // Should not redirect
    await expect(page).toHaveURL('/login')
  })

  test('remember me functionality', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.check('[data-testid="remember-me"]')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Refresh page to check if session persists
    await page.reload()
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('logout functionality', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'user@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('[data-testid="password-input"]')
    const toggleButton = page.locator('[data-testid="password-toggle"]')
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password')
    
    // Click toggle to show password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    
    // Click toggle to hide password
    await toggleButton.click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('social login buttons', async ({ page }) => {
    await expect(page.locator('[data-testid="google-login"]')).toBeVisible()
    await expect(page.locator('[data-testid="github-login"]')).toBeVisible()
    
    // Test Google login redirect
    await page.click('[data-testid="google-login"]')
    await expect(page).toHaveURL(/.*google\.com.*/)
  })

  test('forgot password link', async ({ page }) => {
    await page.click('text=Forgot password?')
    await expect(page).toHaveURL('/forgot-password')
    await expect(page.locator('h1')).toContainText('Reset Password')
  })

  test('register link navigation', async ({ page }) => {
    await page.click('text=Create account')
    await expect(page).toHaveURL('/register')
    await expect(page.locator('h1')).toContainText('Create Account')
  })
})