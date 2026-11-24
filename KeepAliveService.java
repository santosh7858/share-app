package com.securechat.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

/**
 * Foreground service: app background me jaane par bhi process zinda rakhta hai,
 * taaki chat ka WebSocket chalta rahe aur naye message par notification aa sake.
 * (Notification khud app-bridge.js banata hai - message decrypt sirf JS me hota hai.)
 */
public class KeepAliveService extends Service {

    private static final String CHANNEL = "keepalive";
    private static final int NOTIF_ID = 7711;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL, "Background connection", NotificationManager.IMPORTANCE_MIN);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }

        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        int icon = getResources().getIdentifier("ic_stat_securechat", "drawable", getPackageName());
        if (icon == 0) icon = getApplicationInfo().icon;

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL)
            : new Notification.Builder(this);
        b.setContentTitle("SecureChat")
         .setContentText("Connected - waiting for new messages")
         .setSmallIcon(icon)
         .setContentIntent(pi)
         .setOngoing(true);
        Notification n = b.build();

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIF_ID, n);
        }
        return START_STICKY;
    }
}
