// ===== __tests__/unit/components/Button.test.tsx =====
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '@/components/Button'

describe('Button Component', () => {
  it('renders button with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>)
    expect(screen.getByRole('button')).toHaveClass('custom-class')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

// ===== __tests__/unit/utils/helpers.test.ts =====
import { formatDate, validateEmail, debounce } from '@/utils/helpers'

describe('Helper Functions', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15')
      expect(formatDate(date)).toBe('January 15, 2024')
    })

    it('handles invalid date', () => {
      expect(formatDate(null)).toBe('Invalid Date')
    })
  })

  describe('validateEmail', () => {
    it('validates correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true)
    })

    it('rejects invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false)
    })
  })

  describe('debounce', () => {
    jest.useFakeTimers()

    it('delays function execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn()
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })
})

// ===== __tests__/integration/pages/Home.test.tsx =====
import { render, screen } from '@testing-library/react'
import Home from '@/pages/index'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
  }),
}))

describe('Home Page Integration', () => {
  it('renders home page with main sections', () => {
    render(<Home />)
    
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText(/welcome to newticax/i)).toBeInTheDocument()
  })

  it('displays hero section', () => {
    render(<Home />)
    
    expect(screen.getByTestId('hero-section')).toBeInTheDocument()
  })

  it('renders footer', () => {
    render(<Home />)
    
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})

// ===== __tests__/integration/hooks/useAuth.test.ts =====
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  it('initializes with no user', () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useAuth())
    
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logs in user successfully', async () => {
    const { result } = renderHook(() => useAuth())
    
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })
    
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('test@example.com')
  })

  it('logs out user successfully', async () => {
    const { result } = renderHook(() => useAuth())
    
    // First login
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })
    
    // Then logout
    act(() => {
      result.current.logout()
    })
    
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})

// ===== __tests__/e2e/navigation.spec.ts =====
import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load homepage correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Newticax/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('should navigate to about page', async ({ page }) => {
    await page.click('text=About')
    await expect(page).toHaveURL(/.*about/)
    await expect(page.locator('h1')).toContainText('About')
  })

  test('should navigate back to home', async ({ page }) => {
    await page.click('text=About')
    await page.click('text=Home')
    await expect(page).toHaveURL('/')
  })

  test('should show mobile menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
  })
})

// ===== __tests__/e2e/user-flow.spec.ts =====
import { test, expect } from '@playwright/test'

test.describe('User Authentication Flow', () => {
  test('should complete full login flow', async ({ page }) => {
    await page.goto('/')
    
    // Go to login page
    await page.click('text=Login')
    await expect(page).toHaveURL(/.*login/)
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    
    // Submit form
    await page.click('[data-testid="login-button"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.locator('text=Welcome back')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
  })

  test('should complete registration flow', async ({ page }) => {
    await page.goto('/register')
    
    // Fill registration form
    await page.fill('[data-testid="name-input"]', 'John Doe')
    await page.fill('[data-testid="email-input"]', 'john@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'password123')
    
    // Submit form
    await page.click('[data-testid="register-button"]')
    
    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })
})

// ===== __tests__/e2e/accessibility.spec.ts =====
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/')
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/')
    
    // Tab through navigation
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
    
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')
    
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    
    const h2 = page.locator('h2')
    const h2Count = await h2.count()
    expect(h2Count).toBeGreaterThan(0)
  })
})

// ===== __tests__/e2e/performance.spec.ts =====
import { test, expect } from '@playwright/test'

test.describe('Performance Tests', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000) // 3 seconds
  })

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/')
    
    // Measure LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          resolve(lastEntry.startTime)
        }).observe({ entryTypes: ['largest-contentful-paint'] })
      })
    })
    
    expect(lcp).toBeLessThan(2500) // 2.5 seconds
  })
})

// ===== __tests__/e2e/global-setup.ts =====
import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...')
  
  // Launch browser for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  // Pre-authenticate user if needed
  await page.goto('http://localhost:3000/login')
  await page.fill('[data-testid="email-input"]', 'admin@example.com')
  await page.fill('[data-testid="password-input"]', 'admin123')
  await page.click('[data-testid="login-button"]')
  
  // Save authentication state
  await page.context().storageState({ path: 'auth-state.json' })
  
  await browser.close()
  console.log('✅ Global setup completed')
}

export default globalSetup

// ===== __tests__/e2e/global-teardown.ts =====
import { FullConfig } from '@playwright/test'
import fs from 'fs'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...')
  
  // Clean up authentication state
  if (fs.existsSync('auth-state.json')) {
    fs.unlinkSync('auth-state.json')
  }
  
  // Clean up test data
  console.log('🗑️ Cleaning up test data...')
  
  console.log('✅ Global teardown completed')
}

export default globalTeardown

// ===== __tests__/e2e/fixtures/test-data.ts =====
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User'
  },
  user: {
    email: 'user@example.com', 
    password: 'user123',
    name: 'Regular User'
  },
  guest: {
    email: 'guest@example.com',
    password: 'guest123', 
    name: 'Guest User'
  }
}

export const testData = {
  validEmail: 'test@example.com',
  invalidEmail: 'invalid-email',
  validPassword: 'SecurePass123!',
  weakPassword: '123',
  longText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10)
}   