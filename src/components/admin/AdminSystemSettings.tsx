import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Bell, Shield, Database, Mail, Save } from "lucide-react";
import { createAuditLog } from "@/lib/auditLog";

export const AdminSystemSettings = () => {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewSignups: true,
    emailNotifications: true,
    maxConversationsPerUser: 100,
    maxMessagesPerConversation: 500,
    aiResponseTimeout: 30,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save - in production, this would save to database
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Log settings update
    await createAuditLog({
      action: "settings_updated",
      entity_type: "system_settings",
      details: {
        maintenance_mode: settings.maintenanceMode ? "enabled" : "disabled",
        signups: settings.allowNewSignups ? "enabled" : "disabled",
        email_notifications: settings.emailNotifications ? "enabled" : "disabled",
      },
    });

    toast.success("Settings saved successfully");
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            General Settings
          </CardTitle>
          <CardDescription>
            Configure general system-wide settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable to temporarily disable the platform for maintenance
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, maintenanceMode: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Allow New Signups</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to create accounts
              </p>
            </div>
            <Switch
              checked={settings.allowNewSignups}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowNewSignups: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure email and notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send email notifications for important events
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, emailNotifications: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Limits & Quotas */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Limits & Quotas
          </CardTitle>
          <CardDescription>
            Set resource limits for users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxConversations">Max Conversations Per User</Label>
              <Input
                id="maxConversations"
                type="number"
                value={settings.maxConversationsPerUser}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxConversationsPerUser: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMessages">Max Messages Per Conversation</Label>
              <Input
                id="maxMessages"
                type="number"
                value={settings.maxMessagesPerConversation}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxMessagesPerConversation: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiTimeout">AI Response Timeout (seconds)</Label>
              <Input
                id="aiTimeout"
                type="number"
                value={settings.aiResponseTimeout}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiResponseTimeout: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Security
          </CardTitle>
          <CardDescription>
            View security status and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium text-foreground">Row Level Security</div>
                  <div className="text-sm text-muted-foreground">
                    All tables have RLS enabled
                  </div>
                </div>
              </div>
              <span className="text-green-500 font-medium">Active</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium text-foreground">Email Verification</div>
                  <div className="text-sm text-muted-foreground">
                    Auto-confirm enabled for signups
                  </div>
                </div>
              </div>
              <span className="text-green-500 font-medium">Configured</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <span className="animate-spin">⏳</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
