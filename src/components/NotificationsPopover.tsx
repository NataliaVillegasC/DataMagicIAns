import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const NotificationsPopover = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'applications'
        },
        (payload) => {
          handleNewNotification(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      // Get recent applications as notifications
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          *,
          candidates!inner(full_name, company),
          job_openings!inner(title, company)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (applications) {
        const formattedNotifications: Notification[] = applications.map((app: any) => ({
          id: app.id,
          type: app.status === 'applied' ? 'new_application' : 'status_update',
          title: `${app.candidates?.full_name || 'Candidate'} - ${app.job_openings?.title || 'Job'}`,
          message: `Status: ${app.status?.replace('_', ' ') || 'applied'}${app.ai_match_score ? ` • Match: ${app.ai_match_score}%` : ''}`,
          read: false, // We'll track this in localStorage
          created_at: app.created_at
        }));

        setNotifications(formattedNotifications);
        
        // Load read status from localStorage
        const readNotifs = JSON.parse(localStorage.getItem('readNotifications') || '[]');
        const unread = formattedNotifications.filter(n => !readNotifs.includes(n.id)).length;
        setUnreadCount(unread);
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleNewNotification = (payload: any) => {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      loadNotifications();
      toast({
        title: "New Activity",
        description: payload.eventType === 'INSERT' 
          ? "New application received" 
          : "Application status updated",
      });
    }
  };

  const markAsRead = (notificationId: string) => {
    const readNotifs = JSON.parse(localStorage.getItem('readNotifications') || '[]');
    if (!readNotifs.includes(notificationId)) {
      readNotifs.push(notificationId);
      localStorage.setItem('readNotifications', JSON.stringify(readNotifs));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('readNotifications', JSON.stringify(allIds));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    // Return different icons based on notification type
    return '🔔';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const readNotifs = JSON.parse(localStorage.getItem('readNotifications') || '[]');
                const isRead = readNotifs.includes(notification.id);
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !isRead ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm mb-1 truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
