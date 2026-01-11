import { useState, useEffect } from "react";
import { 
  Share2, Copy, Link, Trash2, Loader2, Eye, Calendar, 
  CheckCircle, ExternalLink 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface ShareWorkflowDialogProps {
  workflowId: string;
  workflowName: string;
  isSaved: boolean;
}

interface WorkflowShare {
  id: string;
  share_token: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  view_count: number;
}

export const ShareWorkflowDialog = ({ 
  workflowId, 
  workflowName,
  isSaved 
}: ShareWorkflowDialogProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shares, setShares] = useState<WorkflowShare[]>([]);
  const [setExpiration, setSetExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isSaved) {
      loadShares();
    }
  }, [isOpen, workflowId, isSaved]);

  const loadShares = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("workflow_shares")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setShares(data || []);
    } catch (error) {
      console.error("Error loading shares:", error);
      toast.error("فشل في تحميل روابط المشاركة");
    } finally {
      setIsLoading(false);
    }
  };

  const createShare = async () => {
    if (!user) return;

    setCreating(true);
    try {
      const expiresAt = setExpiration 
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("workflow_shares")
        .insert({
          workflow_id: workflowId,
          created_by: user.id,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      setShares([data, ...shares]);
      toast.success("تم إنشاء رابط المشاركة!");
      
      // Auto-copy the new link
      const shareUrl = getShareUrl(data.share_token);
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(data.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Error creating share:", error);
      toast.error("فشل في إنشاء رابط المشاركة");
    } finally {
      setCreating(false);
    }
  };

  const deleteShare = async (shareId: string) => {
    setDeletingId(shareId);
    try {
      const { error } = await supabase
        .from("workflow_shares")
        .delete()
        .eq("id", shareId);

      if (error) throw error;

      setShares(shares.filter(s => s.id !== shareId));
      toast.success("تم حذف رابط المشاركة");
    } catch (error) {
      console.error("Error deleting share:", error);
      toast.error("فشل في حذف رابط المشاركة");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleShareActive = async (share: WorkflowShare) => {
    try {
      const { error } = await supabase
        .from("workflow_shares")
        .update({ is_active: !share.is_active })
        .eq("id", share.id);

      if (error) throw error;

      setShares(shares.map(s => 
        s.id === share.id ? { ...s, is_active: !s.is_active } : s
      ));
      toast.success(share.is_active ? "تم تعطيل الرابط" : "تم تفعيل الرابط");
    } catch (error) {
      console.error("Error toggling share:", error);
      toast.error("فشل في تحديث حالة الرابط");
    }
  };

  const getShareUrl = (token: string) => {
    return `${window.location.origin}/shared-workflow?token=${token}`;
  };

  const copyShareUrl = async (share: WorkflowShare) => {
    const url = getShareUrl(share.share_token);
    await navigator.clipboard.writeText(url);
    setCopiedId(share.id);
    toast.success("تم نسخ الرابط!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="مشاركة سير العمل"
          disabled={!isSaved}
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            مشاركة "{workflowName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Create New Share */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h4 className="font-medium mb-4">إنشاء رابط مشاركة جديد</h4>
            
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="expiration" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                تحديد تاريخ انتهاء
              </Label>
              <Switch
                id="expiration"
                checked={setExpiration}
                onCheckedChange={setSetExpiration}
              />
            </div>

            {setExpiration && (
              <div className="mb-4">
                <Label>ينتهي بعد (أيام)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 7)}
                  className="mt-1"
                />
              </div>
            )}

            <Button 
              onClick={createShare} 
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link className="w-4 h-4 mr-2" />
              )}
              إنشاء رابط مشاركة
            </Button>
          </div>

          {/* Existing Shares */}
          <div>
            <h4 className="font-medium mb-3">روابط المشاركة الحالية</h4>
            
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد روابط مشاركة
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className={`p-3 rounded-lg border transition-all ${
                      !share.is_active || isExpired(share.expires_at)
                        ? "border-border bg-muted/20 opacity-60"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {share.is_active && !isExpired(share.expires_at) ? (
                            <Badge variant="default" className="text-xs">
                              نشط
                            </Badge>
                          ) : isExpired(share.expires_at) ? (
                            <Badge variant="destructive" className="text-xs">
                              منتهي
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              معطل
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {share.view_count}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(share.created_at), "dd MMM yyyy", { locale: ar })}
                          {share.expires_at && (
                            <> · ينتهي {format(new Date(share.expires_at), "dd MMM yyyy", { locale: ar })}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyShareUrl(share)}
                          disabled={!share.is_active || isExpired(share.expires_at)}
                        >
                          {copiedId === share.id ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(getShareUrl(share.share_token), "_blank")}
                          disabled={!share.is_active || isExpired(share.expires_at)}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Switch
                          checked={share.is_active}
                          onCheckedChange={() => toggleShareActive(share)}
                          disabled={isExpired(share.expires_at)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteShare(share.id)}
                          disabled={deletingId === share.id}
                        >
                          {deletingId === share.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
