import { supabase } from '../lib/supabase';
import { sentryService } from '../lib/sentry';

export interface SharedSnapshot {
  id: string;
  snapshot_id: string;
  share_token: string;
  expires_at: string | null;
  is_public: boolean;
  allow_download: boolean;
  is_single_use: boolean;
  max_access_count: number | null;
  is_revoked: boolean;
  revoked_at: string | null;
  revoked_by: string | null;
  created_at: string;
  access_count: number;
  last_accessed_at: string | null;
  created_by: string;
  // Optionally include snapshot data if fetched with the share link
  snapshot?: {
    slot_config: any;
    mwf_result: any;
    tt_result: any;
    generated_at: string;
    slot_name: string;
  };
}

export interface ShareAccessLog {
  id: string;
  shared_snapshot_id: string;
  share_token: string;
  accessed_at: string;
  ip_address: string;
  user_agent: string;
  country?: string;
  city?: string;
  success: boolean;
  failure_reason?: string;
}

export interface ShareAuditTrail {
  id: string;
  shared_snapshot_id: string;
  action: 'created' | 'rotated' | 'revoked' | 'expired' | 'accessed' | 'failed_access';
  performed_by: string | null;
  performed_at: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
}

export interface CreateShareLinkOptions {
  snapshotId: string;
  expiresInDays?: number;
  isPublic?: boolean;
  allowDownload?: boolean;
  isSingleUse?: boolean;
  maxAccessCount?: number;
}

export interface ShareLinkFilters {
  snapshotId?: string;
  isPublic?: boolean;
  isRevoked?: boolean;
  expired?: boolean;
  createdBy?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ShareLinkSortOptions {
  field: 'created_at' | 'expires_at' | 'access_count' | 'last_accessed_at';
  direction: 'asc' | 'desc';
}

class SecureShareService {
  private readonly TOKEN_LENGTH = 64; // Increased entropy
  private readonly TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  /**
   * Generate a cryptographically secure random token
   */
  private generateSecureToken(): string {
    // Use crypto.getRandomValues for better entropy
    const array = new Uint8Array(this.TOKEN_LENGTH);
    crypto.getRandomValues(array);
    
    let result = '';
    for (let i = 0; i < this.TOKEN_LENGTH; i++) {
      result += this.TOKEN_CHARS[array[i] % this.TOKEN_CHARS.length];
    }
    return result;
  }

  /**
   * Log access attempt
   */
  private async logAccess(
    sharedSnapshotId: string,
    shareToken: string,
    success: boolean,
    failureReason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await supabase
        .from('share_access_logs')
        .insert({
          shared_snapshot_id: sharedSnapshotId,
          share_token: shareToken,
          accessed_at: new Date().toISOString(),
          ip_address: ipAddress || 'unknown',
          user_agent: userAgent || 'unknown',
          success,
          failure_reason: failureReason,
        });
    } catch (error) {
      console.error('Failed to log access:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Log audit trail
   */
  private async logAuditTrail(
    sharedSnapshotId: string,
    action: ShareAuditTrail['action'],
    details: string,
    performedBy?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await supabase
        .from('share_audit_trails')
        .insert({
          shared_snapshot_id: sharedSnapshotId,
          action,
          performed_by: performedBy,
          performed_at: new Date().toISOString(),
          details,
          ip_address: ipAddress,
          user_agent: userAgent,
        });
    } catch (error) {
      console.error('Failed to log audit trail:', error);
    }
  }

  /**
   * Get client IP and User Agent
   */
  private getClientInfo(): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: typeof window !== 'undefined' ? 
        (window as any).clientIP || 'unknown' : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? 
        navigator.userAgent : 'unknown',
    };
  }

  /**
   * Create a new secure share link
   */
  async createShareLink(options: CreateShareLinkOptions): Promise<SharedSnapshot> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      const shareToken = this.generateSecureToken();
      const expiresAt = options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const clientInfo = this.getClientInfo();

      // Create share record
      const { data, error: shareError } = await supabase
        .from('shared_snapshots')
        .insert({
          snapshot_id: options.snapshotId,
          share_token: shareToken,
          expires_at: expiresAt,
          is_public: options.isPublic ?? true,
          allow_download: options.allowDownload ?? true,
          is_single_use: options.isSingleUse ?? false,
          max_access_count: options.maxAccessCount || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (shareError) {
        throw new Error(`Failed to create share link: ${shareError.message}`);
      }

      // Log audit trail
      await this.logAuditTrail(
        data.id,
        'created',
        `Share link created with token: ${shareToken.substring(0, 8)}...`,
        user.id,
        clientInfo.ipAddress,
        clientInfo.userAgent
      );

      return data;

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'createShareLink',
        options,
      });
      throw error;
    }
  }

  /**
   * Get shared snapshot by token with security checks
   */
  async getSharedSnapshot(shareToken: string): Promise<SharedSnapshot | null> {
      const clientInfo = this.getClientInfo();

    try {
      const { data, error } = await supabase
        .from('shared_snapshots')
        .select(`
          *,
          snapshots (
            slot_config,
            mwf_result,
            tt_result,
            generated_at,
            slot_name
          )
        `)
        .eq('share_token', shareToken)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch shared snapshot: ${error.message}`);
      }

      if (!data) {
        await this.logAccess('', shareToken, false, 'Token not found', clientInfo.ipAddress, clientInfo.userAgent);
        return null;
      }

      // Security checks
      if (data.is_revoked) {
        await this.logAccess(data.id, shareToken, false, 'Link revoked', clientInfo.ipAddress, clientInfo.userAgent);
        await this.logAuditTrail(data.id, 'failed_access', 'Access denied - link revoked', undefined, clientInfo.ipAddress, clientInfo.userAgent);
        return null;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        await this.logAccess(data.id, shareToken, false, 'Link expired', clientInfo.ipAddress, clientInfo.userAgent);
        await this.logAuditTrail(data.id, 'failed_access', 'Access denied - link expired', undefined, clientInfo.ipAddress, clientInfo.userAgent);
        return null;
      }

      if (data.is_single_use && data.access_count > 0) {
        await this.logAccess(data.id, shareToken, false, 'Single use limit exceeded', clientInfo.ipAddress, clientInfo.userAgent);
        await this.logAuditTrail(data.id, 'failed_access', 'Access denied - single use limit exceeded', undefined, clientInfo.ipAddress, clientInfo.userAgent);
        return null;
      }

      if (data.max_access_count && data.access_count >= data.max_access_count) {
        await this.logAccess(data.id, shareToken, false, 'Max access count exceeded', clientInfo.ipAddress, clientInfo.userAgent);
        await this.logAuditTrail(data.id, 'failed_access', 'Access denied - max access count exceeded', undefined, clientInfo.ipAddress, clientInfo.userAgent);
        return null;
      }

      // Update access count and timestamp
      await supabase
        .from('shared_snapshots')
        .update({
          access_count: data.access_count + 1,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      // Log successful access
      await this.logAccess(data.id, shareToken, true, undefined, clientInfo.ipAddress, clientInfo.userAgent);
      await this.logAuditTrail(data.id, 'accessed', 'Successful access', undefined, clientInfo.ipAddress, clientInfo.userAgent);

      return data as SharedSnapshot;

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'getSharedSnapshot',
        shareToken: shareToken.substring(0, 8) + '...',
      });
      throw error;
    }
  }

  /**
   * Rotate (regenerate) share token
   */
  async rotateShareToken(shareToken: string): Promise<SharedSnapshot> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      const clientInfo = this.getClientInfo();
      const newToken = this.generateSecureToken();

      // Update the token
      const { data, error } = await supabase
        .from('shared_snapshots')
        .update({ share_token: newToken })
        .eq('share_token', shareToken)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to rotate token: ${error.message}`);
      }

      // Log audit trail
      await this.logAuditTrail(
        data.id,
        'rotated',
        `Token rotated from ${shareToken.substring(0, 8)}... to ${newToken.substring(0, 8)}...`,
        user.id,
        clientInfo.ipAddress,
        clientInfo.userAgent
      );

      return data;

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'rotateShareToken',
        shareToken: shareToken.substring(0, 8) + '...',
      });
      throw error;
    }
  }

  /**
   * Revoke share link immediately
   */
  async revokeShareLink(shareToken: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      const clientInfo = this.getClientInfo();

      // Revoke the link
      const { error } = await supabase
        .from('shared_snapshots')
        .update({
          is_revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('share_token', shareToken);

      if (error) {
        throw new Error(`Failed to revoke link: ${error.message}`);
      }

      // Get the snapshot ID for audit trail
      const { data: snapshot } = await supabase
        .from('shared_snapshots')
        .select('id')
        .eq('share_token', shareToken)
        .single();

      if (snapshot) {
        await this.logAuditTrail(
          snapshot.id,
          'revoked',
          `Share link revoked: ${shareToken.substring(0, 8)}...`,
          user.id,
          clientInfo.ipAddress,
          clientInfo.userAgent
        );
      }

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'revokeShareLink',
        shareToken: shareToken.substring(0, 8) + '...',
      });
      throw error;
    }
  }

  /**
   * Get share links with filtering and pagination (Admin only)
   */
  async getShareLinks(
    filters: ShareLinkFilters = {},
    sortOptions: ShareLinkSortOptions = { field: 'created_at', direction: 'desc' },
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    shareLinks: SharedSnapshot[];
    totalCount: number;
    totalPages: number;
  }> {
    try {
      let query = supabase
        .from('shared_snapshots')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.snapshotId) {
        query = query.eq('snapshot_id', filters.snapshotId);
      }

      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      if (filters.isRevoked !== undefined) {
        query = query.eq('is_revoked', filters.isRevoked);
      }

      if (filters.expired) {
        const now = new Date().toISOString();
        query = query.lt('expires_at', now);
      }

      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }

      if (filters.searchTerm) {
        query = query.or(`share_token.ilike.%${filters.searchTerm}%`);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // Apply sorting
      query = query.order(sortOptions.field, { ascending: sortOptions.direction === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch share links: ${error.message}`);
      }

      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        shareLinks: data || [],
        totalCount: count || 0,
        totalPages,
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'getShareLinks',
        filters,
        sortOptions,
      });
      throw error;
    }
  }

  /**
   * Get access logs for a share link
   */
  async getAccessLogs(shareToken: string): Promise<ShareAccessLog[]> {
    try {
      const { data, error } = await supabase
        .from('share_access_logs')
        .select('*')
        .eq('share_token', shareToken)
        .order('accessed_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch access logs: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'getAccessLogs',
        shareToken: shareToken.substring(0, 8) + '...',
      });
      throw error;
    }
  }

  /**
   * Get audit trail for a share link
   */
  async getAuditTrail(shareToken: string): Promise<ShareAuditTrail[]> {
    try {
      // First get the snapshot ID
      const { data: snapshot } = await supabase
        .from('shared_snapshots')
        .select('id')
        .eq('share_token', shareToken)
        .single();

      if (!snapshot) {
        return [];
      }

      const { data, error } = await supabase
        .from('share_audit_trails')
        .select('*')
        .eq('shared_snapshot_id', snapshot.id)
        .order('performed_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch audit trail: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'getAuditTrail',
        shareToken: shareToken.substring(0, 8) + '...',
      });
      throw error;
    }
  }

  /**
   * Bulk revoke expired links
   */
  async revokeExpiredLinks(): Promise<number> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('shared_snapshots')
        .update({
          is_revoked: true,
          revoked_at: now,
          revoked_by: 'system',
        })
        .lt('expires_at', now)
        .is('is_revoked', false)
        .select('id');

      if (error) {
        throw new Error(`Failed to revoke expired links: ${error.message}`);
      }

      // Log audit trail for each revoked link
      for (const link of data || []) {
        await this.logAuditTrail(
          link.id,
          'expired',
          'Link automatically revoked due to expiration',
          'system'
        );
      }

      return (data || []).length;

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'revokeExpiredLinks',
      });
      throw error;
    }
  }

  /**
   * Copy share URL to clipboard
   */
  async copyShareUrl(shareUrl: string): Promise<boolean> {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
      }
    } else {
      // Fallback for insecure contexts or older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } catch (err) {
        console.error('Failed to copy to clipboard (fallback):', err);
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  }
}

export const secureShareService = new SecureShareService();
