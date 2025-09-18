import * as Sentry from '@sentry/react';

interface SentryConfig {
  dsn: string;
  environment: string;
  userId?: string;
  userRole?: string;
}

class SentryService {
  private isInitialized = false;

  /**
   * Initialize Sentry only in production
   */
  initialize(config: SentryConfig) {
    // Only initialize in production
    if (import.meta.env.VITE_ENVIRONMENT !== 'production') {
      console.log('Sentry not initialized - not in production environment');
      return;
    }

    if (this.isInitialized) {
      console.warn('Sentry already initialized');
      return;
    }

    try {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        integrations: [
          // Browser tracing integration
        ],
        // Performance Monitoring
        tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
        
        // Session Replay
        replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%
        replaysOnErrorSampleRate: 1.0, // If an error occurs, capture 100% of the session
        
        // Error filtering
        beforeSend(event) {
          // Filter out non-critical errors
          if (event.exception) {
            const error = event.exception.values?.[0];
            if (error?.type === 'ChunkLoadError' || 
                error?.value?.includes('Loading chunk') ||
                error?.value?.includes('Loading CSS chunk')) {
              return null; // Don't send chunk loading errors
            }
          }
          return event;
        },

        // Set user context
        initialScope: {
          tags: {
            userRole: config.userRole || 'unknown',
          },
          user: {
            id: config.userId,
            role: config.userRole,
          },
        },
      });

      this.isInitialized = true;
      console.log('Sentry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, userRole: string, displayName?: string) {
    if (!this.isInitialized) return;

    Sentry.setUser({
      id: userId,
      role: userRole,
      username: displayName,
    });

    Sentry.setTag('userRole', userRole);
    Sentry.setContext('user', {
      id: userId,
      role: userRole,
      displayName,
    });
  }

  /**
   * Capture an exception with enhanced tagging
   */
  captureException(error: Error, context?: Record<string, any>) {
    if (!this.isInitialized) {
      console.error('Error (Sentry not initialized):', error, context);
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('errorContext', context);
        
        // Add specific tags based on context
        if (context.slotId) {
          scope.setTag('slotId', context.slotId);
        }
        if (context.operation) {
          scope.setTag('operation', context.operation);
        }
        if (context.scheduleType) {
          scope.setTag('scheduleType', context.scheduleType);
        }
        if (context.userRole) {
          scope.setTag('userRole', context.userRole);
        }
        if (context.component) {
          scope.setTag('component', context.component);
        }
        if (context.severity) {
          scope.setLevel(context.severity as Sentry.SeverityLevel);
        }
      }
      Sentry.captureException(error);
    });
  }

  /**
   * Capture a message (warning, info, etc.) with enhanced tagging
   */
  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) {
    if (!this.isInitialized) {
      console.log(`Message (Sentry not initialized): ${message}`, context);
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('messageContext', context);
        
        // Add specific tags based on context
        if (context.slotId) {
          scope.setTag('slotId', context.slotId);
        }
        if (context.operation) {
          scope.setTag('operation', context.operation);
        }
        if (context.scheduleType) {
          scope.setTag('scheduleType', context.scheduleType);
        }
        if (context.userRole) {
          scope.setTag('userRole', context.userRole);
        }
        if (context.component) {
          scope.setTag('component', context.component);
        }
      }
      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string = 'user', data?: Record<string, any>) {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Set custom tags
   */
  setTag(key: string, value: string) {
    if (!this.isInitialized) return;
    Sentry.setTag(key, value);
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>) {
    if (!this.isInitialized) return;
    Sentry.setContext(key, context);
  }

  /**
   * Create a performance transaction
   */
  startTransaction(name: string, op: string = 'custom') {
    if (!this.isInitialized) return null;
    // Sentry v8+ uses startSpan instead of startTransaction
    return Sentry.startSpan({ name, op }, () => {});
  }

  /**
   * Check if Sentry is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get Sentry client instance
   */
  get client() {
    return this.isInitialized ? Sentry : null;
  }
}

export const sentryService = new SentryService();

// Export Sentry components for React integration
export { ErrorBoundary as SentryErrorBoundary } from '@sentry/react';
