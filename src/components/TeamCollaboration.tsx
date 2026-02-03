import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Mail, MessageSquare, Send, X,
  Check, Clock, Trash2, Shield, Eye, Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
}

interface Invitation {
  id: string;
  invitee_email: string;
  role: string;
  status: string;
  created_at: string;
}

interface TeamCollaborationProps {
  workflowId: string;
  workflowName: string;
}

export const TeamCollaboration = ({ workflowId, workflowName }: TeamCollaborationProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newComment, setNewComment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    if (!workflowId || !user) return;
    
    fetchComments();
    fetchInvitations();
  }, [workflowId, user]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('workflow_comments')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data);
    }
    setLoading(false);
  };

  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvitations(data);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;

    const { data, error } = await supabase
      .from('workflow_comments')
      .insert({
        workflow_id: workflowId,
        user_id: user.id,
        content: newComment.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error(isRTL ? "فشل في إضافة التعليق" : "Failed to add comment");
      return;
    }

    setComments([...comments, data]);
    setNewComment("");
    toast.success(isRTL ? "تم إضافة التعليق" : "Comment added");
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase
      .from('workflow_comments')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(isRTL ? "فشل في حذف التعليق" : "Failed to delete comment");
      return;
    }

    setComments(comments.filter(c => c.id !== id));
    toast.success(isRTL ? "تم حذف التعليق" : "Comment deleted");
  };

  const sendInvitation = async () => {
    if (!inviteEmail.trim() || !user) return;

    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        workflow_id: workflowId,
        inviter_id: user.id,
        invitee_email: inviteEmail.trim(),
        role: inviteRole,
      })
      .select()
      .single();

    if (error) {
      toast.error(isRTL ? "فشل في إرسال الدعوة" : "Failed to send invitation");
      return;
    }

    setInvitations([data, ...invitations]);
    setInviteEmail("");
    setIsInviteDialogOpen(false);
    toast.success(isRTL ? "تم إرسال الدعوة" : "Invitation sent");
  };

  const cancelInvitation = async (id: string) => {
    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(isRTL ? "فشل في إلغاء الدعوة" : "Failed to cancel invitation");
      return;
    }

    setInvitations(invitations.filter(i => i.id !== id));
    toast.success(isRTL ? "تم إلغاء الدعوة" : "Invitation cancelled");
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'editor': return <Edit3 className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400';
      case 'editor': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            {isRTL ? "التعليقات" : "Comments"}
            <Badge variant="secondary" className="ms-auto">
              {comments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] mb-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>{isRTL ? "لا توجد تعليقات" : "No comments yet"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-muted/50 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {comment.user_id.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{comment.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: isRTL ? ar : enUS,
                            })}
                          </span>
                          {comment.user_id === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => deleteComment(comment.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isRTL ? "أضف تعليقاً..." : "Add a comment..."}
              className="min-h-[60px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addComment();
                }
              }}
            />
            <Button onClick={addComment} disabled={!newComment.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {isRTL ? "الفريق" : "Team"}
            
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="ms-auto">
                  <UserPlus className="w-4 h-4 me-2" />
                  {isRTL ? "دعوة" : "Invite"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {isRTL ? "دعوة عضو للفريق" : "Invite Team Member"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {isRTL ? "البريد الإلكتروني" : "Email Address"}
                    </label>
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {isRTL ? "الدور" : "Role"}
                    </label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            {isRTL ? "مشاهد" : "Viewer"}
                          </div>
                        </SelectItem>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4" />
                            {isRTL ? "محرر" : "Editor"}
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {isRTL ? "مدير" : "Admin"}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={sendInvitation}
                    disabled={!inviteEmail.trim()}
                  >
                    <Mail className="w-4 h-4 me-2" />
                    {isRTL ? "إرسال الدعوة" : "Send Invitation"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[360px]">
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>{isRTL ? "لا توجد دعوات" : "No invitations yet"}</p>
                <p className="text-sm mt-1">
                  {isRTL ? "ادعُ أعضاء الفريق للتعاون" : "Invite team members to collaborate"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {invitation.invitee_email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invitation.invitee_email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getRoleBadgeColor(invitation.role)}>
                          {getRoleIcon(invitation.role)}
                          <span className="ms-1">
                            {isRTL 
                              ? invitation.role === 'admin' ? 'مدير' : invitation.role === 'editor' ? 'محرر' : 'مشاهد'
                              : invitation.role
                            }
                          </span>
                        </Badge>
                        <Badge className={getStatusBadgeColor(invitation.status)}>
                          {invitation.status === 'pending' && <Clock className="w-3 h-3 me-1" />}
                          {invitation.status === 'accepted' && <Check className="w-3 h-3 me-1" />}
                          {isRTL
                            ? invitation.status === 'pending' ? 'معلق' : invitation.status === 'accepted' ? 'مقبول' : 'مرفوض'
                            : invitation.status
                          }
                        </Badge>
                      </div>
                    </div>

                    {invitation.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => cancelInvitation(invitation.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
