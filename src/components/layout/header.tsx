'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Search,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';
import { LanguageSelector } from '@/components/layout/language-selector';
import { useTranslations } from '@/hooks/use-translations';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { t } = useTranslations();

  // Handle mounting for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
      setIsSearchOpen(false);
      setSearchValue('');
    }
  };

  // Handle scroll for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on pathname change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Get user initials for avatar
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className={`sticky top-0 z-40 w-full transition-all ${isScrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm' : 'bg-white dark:bg-gray-900'
      }`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              NewticaX
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" asChild>
              <Link href="/">{t('general.homepage')}</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/trending">{t('general.trending')}</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/category/technology">Technology</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/category/business">Business</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/category/sports">Sports</Link>
            </Button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => router.push('/search')}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Language Selector */}
            <LanguageSelector />

            {/* Theme Toggle */}
            {mounted && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <NotificationDropdown />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                        <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">{t('general.dashboard')}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/bookmarks">{t('general.bookmarks')}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/reading-history">{t('general.readingHistory')}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/notifications">{t('general.notifications')}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/profile">{t('general.profile')}</Link>
                      </DropdownMenuItem>
                      {user?.role === 'ADMIN' && (
                        <DropdownMenuItem asChild>
                          <Link href="/dashboard/admin">Admin</Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()}>
                      {t('general.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
                  <Link href="/login">{t('general.signIn')}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">{t('general.signUp')}</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t">
          <div className="container mx-auto px-4 py-3 space-y-1">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/">{t('general.homepage')}</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/trending">{t('general.trending')}</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/category/technology">Technology</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/category/business">Business</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/category/sports">Sports</Link>
            </Button>

            {!isAuthenticated && (
              <>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/login">{t('general.signIn')}</Link>
                </Button>
                <Button variant="default" className="w-full justify-start" asChild>
                  <Link href="/register">{t('general.signUp')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}