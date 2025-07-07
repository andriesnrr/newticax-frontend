import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface UseAuthOptions {
  requireAuth?: boolean;
  redirectTo?: string;
  requireAdmin?: boolean;
  requireAuthor?: boolean;
  redirectIfAuthenticated?: boolean;
  redirectAuthenticatedTo?: string;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const {
    requireAuth = false,
    redirectTo = '/login',
    requireAdmin = false,
    requireAuthor = false,
    redirectIfAuthenticated = false,
    redirectAuthenticatedTo = '/dashboard',
  } = options;

  const { isAuthenticated, user, isLoading, isInitialized, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      console.log('🔍 useAuth: Checking authentication status...');
      checkAuth().catch(error => {
        console.warn('⚠️ useAuth: Auth check failed (this is normal if backend is down):', error.message);
        // Don't throw error, just log it - app should continue working
      });
    }
  }, [checkAuth, isInitialized, isLoading]);

  useEffect(() => {
    // Skip redirection if still loading or not initialized
    if (!isInitialized) return;

    console.log('🚦 useAuth: Checking redirect conditions:', {
      requireAuth,
      requireAdmin,
      requireAuthor,
      redirectIfAuthenticated,
      isAuthenticated,
      userRole: user?.role,
    });

    if (requireAuth && !isAuthenticated) {
      console.log('🔒 useAuth: Redirecting to login - auth required');
      router.push(redirectTo);
      return;
    }

    // Redirect if admin role is required but user is not admin
    if (requireAdmin && (!isAuthenticated || user?.role !== 'ADMIN')) {
      console.log('👮 useAuth: Redirecting - admin role required');
      router.push(redirectTo);
      return;
    }

    // Redirect if author role is required but user is not author or admin
    if (requireAuthor && (!isAuthenticated || (user?.role !== 'AUTHOR' && user?.role !== 'ADMIN'))) {
      console.log('✍️ useAuth: Redirecting - author role required');
      router.push(redirectTo);
      return;
    }

    // Redirect if user is authenticated but shouldn't be (e.g., login page)
    if (redirectIfAuthenticated && isAuthenticated) {
      console.log('🏠 useAuth: Redirecting authenticated user');
      router.push(redirectAuthenticatedTo);
      return;
    }
  }, [
    isAuthenticated,
    isLoading,
    isInitialized,
    requireAuth,
    requireAdmin,
    requireAuthor,
    redirectIfAuthenticated,
    redirectTo,
    redirectAuthenticatedTo,
    router,
    user?.role,
  ]);

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || !isInitialized,
    isAdmin: user?.role === 'ADMIN',
    isAuthor: user?.role === 'AUTHOR' || user?.role === 'ADMIN',
    checkAuth,
  };
};