import { supabase } from '../lib/supabase';

export interface ShareableSnapshot {
  id: string;
  slotId: string;
  slotName: string;
  scheduleType: 'MWF' | 'TT' | 'UNIFIED';
  generatedAt: string;
  data: any;
  shareToken: string;
  expiresAt?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateShareLinkOptions {
  snapshotId: string;
  expiresInDays?: number;
  isPublic?: boolean;
  allowDownload?: boolean;
}

class ShareService {
  private readonly SHARE_TOKEN_LENGTH = 32;

  /**
   * Generate a secure random token
   */
  private generateShareToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < this.SHARE_TOKEN_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a shareable link for a snapshot
   */
  async createShareLink(options: CreateShareLinkOptions): Promise<{
    success: boolean;
    shareUrl?: string;
    token?: string;
    message: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: '로그인이 필요합니다.'
        };
      }

      // Get the snapshot data
      const { data: snapshot, error: snapshotError } = await supabase
        .from('generated_schedules')
        .select('*, slots(name)')
        .eq('id', options.snapshotId)
        .eq('created_by', user.id)
        .single();

      if (snapshotError || !snapshot) {
        return {
          success: false,
          message: '스케줄을 찾을 수 없습니다.'
        };
      }

      const shareToken = this.generateShareToken();
      const expiresAt = options.expiresInDays 
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Create share record
      const { error: shareError } = await supabase
        .from('shared_snapshots')
        .insert({
          snapshot_id: options.snapshotId,
          share_token: shareToken,
          expires_at: expiresAt,
          is_public: options.isPublic || false,
          allow_download: options.allowDownload || false,
          created_by: user.id,
        })
        .select()
        .single();

      if (shareError) {
        throw new Error(`공유 링크 생성 실패: ${shareError.message}`);
      }

      const shareUrl = `${window.location.origin}/shared/${shareToken}`;

      return {
        success: true,
        shareUrl,
        token: shareToken,
        message: '공유 링크가 생성되었습니다.'
      };

    } catch (error) {
      console.error('Share link creation failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '공유 링크 생성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * Get shared snapshot by token
   */
  async getSharedSnapshot(token: string): Promise<{
    success: boolean;
    snapshot?: ShareableSnapshot;
    message: string;
  }> {
    try {
      // Get share record with snapshot data
      const { data: shareRecord, error: shareError } = await supabase
        .from('shared_snapshots')
        .select(`
          *,
          generated_schedules (
            *,
            slots (
              name,
              description,
              day_group
            )
          )
        `)
        .eq('share_token', token)
        .single();

      if (shareError || !shareRecord) {
        return {
          success: false,
          message: '공유 링크를 찾을 수 없습니다.'
        };
      }

      // Check if expired
      if (shareRecord.expires_at && new Date(shareRecord.expires_at) < new Date()) {
        return {
          success: false,
          message: '공유 링크가 만료되었습니다.'
        };
      }

      const snapshot = shareRecord.generated_schedules;
      if (!snapshot) {
        return {
          success: false,
          message: '스케줄 데이터를 찾을 수 없습니다.'
        };
      }

      const shareableSnapshot: ShareableSnapshot = {
        id: snapshot.id,
        slotId: snapshot.slot_id,
        slotName: snapshot.slots?.name || 'Unknown Slot',
        scheduleType: snapshot.schedule_type,
        generatedAt: snapshot.created_at,
        data: snapshot.result,
        shareToken: token,
        expiresAt: shareRecord.expires_at,
        isPublic: shareRecord.is_public,
        createdBy: snapshot.created_by,
        createdAt: shareRecord.created_at,
      };

      return {
        success: true,
        snapshot: shareableSnapshot,
        message: '공유 스케줄을 성공적으로 불러왔습니다.'
      };

    } catch (error) {
      console.error('Failed to get shared snapshot:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '공유 스케줄을 불러오는 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * Get all share links for current user
   */
  async getUserShareLinks(): Promise<{
    success: boolean;
    shareLinks?: Array<{
      id: string;
      snapshotId: string;
      shareToken: string;
      snapshotName: string;
      scheduleType: string;
      createdAt: string;
      expiresAt?: string;
      isActive: boolean;
      accessCount: number;
    }>;
    message: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: '로그인이 필요합니다.'
        };
      }

      const { data: shareLinks, error } = await supabase
        .from('shared_snapshots')
        .select(`
          *,
          generated_schedules (
            id,
            name,
            schedule_type,
            created_at,
            slots (
              name
            )
          )
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`공유 링크 조회 실패: ${error.message}`);
      }

      const formattedLinks = shareLinks?.map(link => ({
        id: link.id,
        snapshotId: link.snapshot_id,
        shareToken: link.share_token,
        snapshotName: link.generated_schedules?.name || link.generated_schedules?.slots?.name || 'Unknown',
        scheduleType: link.generated_schedules?.schedule_type || 'Unknown',
        createdAt: link.created_at,
        expiresAt: link.expires_at,
        isActive: !link.expires_at || new Date(link.expires_at) > new Date(),
        accessCount: link.access_count || 0,
      })) || [];

      return {
        success: true,
        shareLinks: formattedLinks,
        message: '공유 링크를 성공적으로 조회했습니다.'
      };

    } catch (error) {
      console.error('Failed to get user share links:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '공유 링크 조회 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * Delete a share link
   */
  async deleteShareLink(shareToken: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: '로그인이 필요합니다.'
        };
      }

      const { error } = await supabase
        .from('shared_snapshots')
        .delete()
        .eq('share_token', shareToken)
        .eq('created_by', user.id);

      if (error) {
        throw new Error(`공유 링크 삭제 실패: ${error.message}`);
      }

      return {
        success: true,
        message: '공유 링크가 삭제되었습니다.'
      };

    } catch (error) {
      console.error('Failed to delete share link:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '공유 링크 삭제 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * Record access to shared snapshot
   */
  async recordAccess(shareToken: string): Promise<void> {
    try {
      // Get current access count and increment
      const { data: current } = await supabase
        .from('shared_snapshots')
        .select('access_count')
        .eq('share_token', shareToken)
        .single();

      const newCount = (current?.access_count || 0) + 1;

      await supabase
        .from('shared_snapshots')
        .update({ 
          access_count: newCount,
          last_accessed_at: new Date().toISOString()
        })
        .eq('share_token', shareToken);
    } catch (error) {
      console.error('Failed to record access:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Copy share URL to clipboard
   */
  async copyShareUrl(shareUrl: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }
}

export const shareService = new ShareService();
