// Header component with auth integration
import { useAuthStore } from '../store/auth'
import { SignOutButton } from './auth/SignOutButton'
import { ThemeToggle } from './ThemeToggle'
import { DensityToggle } from './DensityToggle'
import { LanguageToggle } from './LanguageToggle'
import { useTranslation } from '../store/i18n'

export function Header() {
  const { user, profile } = useAuthStore()
  const { t } = useTranslation()

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '슈퍼 관리자'
      case 'ADMIN':
        return '관리자'
      default:
        return role
    }
  }

  return (
    <header 
      className="bg-primary shadow-theme-sm border-b border-primary transition-theme"
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and title */}
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-primary">
              <span aria-hidden="true">📅</span> {t('header.title')}
            </h1>
          </div>

              {/* User info and actions */}
              <div className="flex items-center space-x-4">
                {/* Theme, density, and language controls */}
                <div className="flex items-center space-x-2">
                  <LanguageToggle size="sm" />
                  <DensityToggle size="sm" />
                  <ThemeToggle size="sm" />
                </div>

                {user && profile ? (
                  <>
                    {/* User info */}
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-primary">
                          {profile.display_name}
                        </p>
                        <p className="text-xs text-secondary">
                          {profile.display_name}
                        </p>
                      </div>
                      
                      {/* Role badge */}
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(profile.role)}`}
                        role="status"
                        aria-label={`사용자 역할: ${getRoleDisplayName(profile.role)}`}
                      >
                        {getRoleDisplayName(profile.role)}
                      </span>
                    </div>

                    {/* Sign out button */}
                    <SignOutButton variant="link" />
                  </>
                ) : (
                  <div className="text-sm text-secondary">
                    {t('header.notLoggedIn')}
                  </div>
                )}
              </div>
        </div>
      </div>
    </header>
  )
}
