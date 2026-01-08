import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { 
  Bell, 
  Moon, 
  Sun, 
  Monitor, 
  User, 
  Shield, 
  Trash2, 
  ArrowLeft,
  Home,
  ChevronRight,
  Mail,
  MessageSquare,
  Smartphone
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  
  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [workflowAlerts, setWorkflowAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleNotificationChange = (setting: string, value: boolean) => {
    switch (setting) {
      case 'email':
        setEmailNotifications(value);
        break;
      case 'push':
        setPushNotifications(value);
        break;
      case 'workflow':
        setWorkflowAlerts(value);
        break;
      case 'digest':
        setWeeklyDigest(value);
        break;
    }
    toast.success("Notification settings updated");
  };

  const handleDeleteAccount = async () => {
    toast.error("Account deletion requires contacting support");
  };

  const handleChangePassword = () => {
    navigate("/reset-password");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 sm:pt-32 pb-16">
        {/* Breadcrumb Navigation */}
        <div className="max-w-2xl mx-auto mb-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Home</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8">
            Settings
          </h1>

          <div className="space-y-6">
            {/* Notifications Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="email-notifications" className="font-medium">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={emailNotifications}
                    onCheckedChange={(value) => handleNotificationChange('email', value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="push-notifications" className="font-medium">
                        Push Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive browser push notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={pushNotifications}
                    onCheckedChange={(value) => handleNotificationChange('push', value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="workflow-alerts" className="font-medium">
                        Workflow Alerts
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when workflows complete or fail
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="workflow-alerts"
                    checked={workflowAlerts}
                    onCheckedChange={(value) => handleNotificationChange('workflow', value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="weekly-digest" className="font-medium">
                        Weekly Digest
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive a weekly summary of activity
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="weekly-digest"
                    checked={weeklyDigest}
                    onCheckedChange={(value) => handleNotificationChange('digest', value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Theme Preferences Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5 text-primary" />
                  Appearance
                </CardTitle>
                <CardDescription>
                  Customize how the app looks and feels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-sm">Light</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-sm">Dark</span>
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    className="flex flex-col items-center gap-2 h-auto py-4"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-5 w-5" />
                    <span className="text-sm">System</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Settings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Account
                </CardTitle>
                <CardDescription>
                  Manage your account settings and security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-muted-foreground">
                        Change your account password
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleChangePassword}>
                    Change Password
                  </Button>
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Profile</p>
                      <p className="text-sm text-muted-foreground">
                        Update your profile information
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                    Edit Profile
                  </Button>
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">Delete Account</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and data
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove all of your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
