package com.medmatrix.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    public static final String PREFS_NAME = "MedMatrixWidgetPrefs";

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        String todayDate = call.getString("todayDate", "");
        String subject = call.getString("subject", "Microbiology");
        String mcqCh1 = call.getString("mcqCh1", "Sterilization & Disinfection");
        String mcqCh2 = call.getString("mcqCh2", "Bacterial Culture Media");
        String mcqCh3 = call.getString("mcqCh3", "Staphylococci & Streptococci");
        String videoCh1 = call.getString("videoCh1", "Bacterial Genetics (34m)");
        String videoCh2 = call.getString("videoCh2", "Drug Resistance (21m)");
        String videoCh3 = call.getString("videoCh3", "Antimicrobial Therapy (18m)");
        String revisionCh1 = call.getString("revisionCh1", "General Pathology (Anki)");
        String revisionCh2 = call.getString("revisionCh2", "Autonomic Pharmacology");
        String bgStyle = call.getString("bgStyle", "frosted");
        int cornerRadius = call.getInt("cornerRadius", 24);
        int opacity = call.getInt("opacity", 85);
        int blur = call.getInt("blur", 18);
        boolean showBorder = call.getBoolean("showBorder", true);
        boolean showDuration = call.getBoolean("showDuration", true);
        boolean edgeToEdge = call.getBoolean("edgeToEdge", false);
        int fontScale = call.getInt("fontScale", 100);
        String design4x1 = call.getString("design4x1", "pill-multi");

        if (todayDate != null && !todayDate.isEmpty()) {
            editor.putString("todayDate", todayDate);
        }
        editor.putString("subject", subject);
        editor.putString("mcqCh1", mcqCh1);
        editor.putString("mcqCh2", mcqCh2);
        editor.putString("mcqCh3", mcqCh3);
        editor.putString("videoCh1", videoCh1);
        editor.putString("videoCh2", videoCh2);
        editor.putString("videoCh3", videoCh3);
        editor.putString("revisionCh1", revisionCh1);
        editor.putString("revisionCh2", revisionCh2);
        editor.putString("bgStyle", bgStyle);
        editor.putInt("cornerRadius", cornerRadius);
        editor.putInt("opacity", opacity);
        editor.putInt("blur", blur);
        editor.putBoolean("showBorder", showBorder);
        editor.putBoolean("showDuration", showDuration);
        editor.putBoolean("edgeToEdge", edgeToEdge);
        editor.putInt("fontScale", fontScale);
        editor.putString("design4x1", design4x1);
        editor.apply();

        // Broadcast update to all active home screen widgets across all registered sizes
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int totalWidgetsUpdated = 0;

        // 1. 2x2 widgets
        ComponentName comp2x2 = new ComponentName(context, MedMatrixWidget2x2Provider.class);
        int[] ids2x2 = appWidgetManager.getAppWidgetIds(comp2x2);
        if (ids2x2 != null && ids2x2.length > 0) {
            totalWidgetsUpdated += ids2x2.length;
            for (int id : ids2x2) {
                MedMatrixWidget2x2Provider.updateAppWidget(context, appWidgetManager, id);
            }
        }

        // 2. 4x1 widgets
        ComponentName comp4x1 = new ComponentName(context, MedMatrixWidget4x1Provider.class);
        int[] ids4x1 = appWidgetManager.getAppWidgetIds(comp4x1);
        if (ids4x1 != null && ids4x1.length > 0) {
            totalWidgetsUpdated += ids4x1.length;
            for (int id : ids4x1) {
                MedMatrixWidget4x1Provider.updateAppWidget(context, appWidgetManager, id);
            }
        }

        // 3. 4x2 widgets
        ComponentName comp4x2 = new ComponentName(context, MedMatrixWidget4x2Provider.class);
        int[] ids4x2 = appWidgetManager.getAppWidgetIds(comp4x2);
        if (ids4x2 != null && ids4x2.length > 0) {
            totalWidgetsUpdated += ids4x2.length;
            for (int id : ids4x2) {
                MedMatrixWidget4x2Provider.updateAppWidget(context, appWidgetManager, id);
            }
        }

        // 3. 4x4 widgets
        ComponentName comp4x4 = new ComponentName(context, MedMatrixWidget4x4Provider.class);
        int[] ids4x4 = appWidgetManager.getAppWidgetIds(comp4x4);
        if (ids4x4 != null && ids4x4.length > 0) {
            totalWidgetsUpdated += ids4x4.length;
            for (int id : ids4x4) {
                MedMatrixWidget4x4Provider.updateAppWidget(context, appWidgetManager, id);
            }
        }

        // 4. Default widget provider
        ComponentName compDefault = new ComponentName(context, MedMatrixWidgetProvider.class);
        int[] idsDefault = appWidgetManager.getAppWidgetIds(compDefault);
        if (idsDefault != null && idsDefault.length > 0) {
            totalWidgetsUpdated += idsDefault.length;
            for (int id : idsDefault) {
                MedMatrixWidgetProvider.updateAppWidget(context, appWidgetManager, id);
            }
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("widgetsUpdated", totalWidgetsUpdated);
        call.resolve(ret);
    }

    @PluginMethod
    public void getWidgetSettings(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        JSObject ret = new JSObject();
        ret.put("todayDate", prefs.getString("todayDate", ""));
        ret.put("subject", prefs.getString("subject", "Microbiology"));
        ret.put("mcqCh1", prefs.getString("mcqCh1", "Sterilization & Disinfection"));
        ret.put("mcqCh2", prefs.getString("mcqCh2", "Bacterial Culture Media"));
        ret.put("mcqCh3", prefs.getString("mcqCh3", "Staphylococci & Streptococci"));
        ret.put("videoCh1", prefs.getString("videoCh1", "Bacterial Genetics (34m)"));
        ret.put("videoCh2", prefs.getString("videoCh2", "Drug Resistance (21m)"));
        ret.put("videoCh3", prefs.getString("videoCh3", "Antimicrobial Therapy (18m)"));
        ret.put("revisionCh1", prefs.getString("revisionCh1", "General Pathology (Anki)"));
        ret.put("revisionCh2", prefs.getString("revisionCh2", "Autonomic Pharmacology"));
        ret.put("bgStyle", prefs.getString("bgStyle", "frosted"));
        ret.put("cornerRadius", prefs.getInt("cornerRadius", 24));
        ret.put("opacity", prefs.getInt("opacity", 85));
        ret.put("blur", prefs.getInt("blur", 18));
        ret.put("showBorder", prefs.getBoolean("showBorder", true));
        ret.put("showDuration", prefs.getBoolean("showDuration", true));
        ret.put("edgeToEdge", prefs.getBoolean("edgeToEdge", false));
        ret.put("fontScale", prefs.getInt("fontScale", 100));
        ret.put("design4x1", prefs.getString("design4x1", "pill-multi"));
        call.resolve(ret);
    }

    @PluginMethod
    public void checkLaunchIntent(PluginCall call) {
        Intent intent = getActivity().getIntent();
        boolean isWidgetConfig = false;
        if (intent != null) {
            String action = intent.getAction();
            if (AppWidgetManager.ACTION_APPWIDGET_CONFIGURE.equals(action) ||
                intent.getBooleanExtra("open_widget_settings", false) ||
                (intent.getData() != null && intent.getData().toString().contains("widget"))) {
                isWidgetConfig = true;
            }
        }
        JSObject ret = new JSObject();
        ret.put("isWidgetConfig", isWidgetConfig);
        call.resolve(ret);
    }

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        Context context = getContext();
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            long longVersionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? pInfo.getLongVersionCode()
                : pInfo.versionCode;
            JSObject ret = new JSObject();
            ret.put("versionName", pInfo.versionName != null ? pInfo.versionName : "1.0");
            ret.put("versionCode", longVersionCode);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("versionName", "1.0");
            ret.put("versionCode", 1);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String apkUrl = call.getString("apkUrl", "https://github.com/rock1xxx/medmatrix/releases/download/android-latest/MedMatrix.apk");
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available");
            return;
        }

        // Check unknown app install permission on Android 8+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!activity.getPackageManager().canRequestPackageInstalls()) {
                Intent permIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName()));
                activity.startActivity(permIntent);
                JSObject ret = new JSObject();
                ret.put("needsPermission", true);
                ret.put("message", "Permission needed: Please enable 'Allow from this source' for MedMatrix, then tap Update again.");
                call.resolve(ret);
                return;
            }
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL url = new URL(apkUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 MedMatrix-Android");
                conn.connect();

                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_MOVED_TEMP || code == HttpURLConnection.HTTP_MOVED_PERM || code == 307 || code == 308) {
                    String redirectUrl = conn.getHeaderField("Location");
                    conn.disconnect();
                    url = new URL(redirectUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestProperty("User-Agent", "Mozilla/5.0 MedMatrix-Android");
                    conn.connect();
                }

                File downloadDir = activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (downloadDir != null && !downloadDir.exists()) {
                    downloadDir.mkdirs();
                }
                File destFile = new File(downloadDir, "MedMatrix.apk");
                if (destFile.exists()) {
                    destFile.delete();
                }

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(destFile)) {
                    byte[] buffer = new byte[16384];
                    int len;
                    while ((len = in.read(buffer)) != -1) {
                        out.write(buffer, 0, len);
                    }
                    out.flush();
                }

                activity.runOnUiThread(() -> {
                    try {
                        Uri apkUri = FileProvider.getUriForFile(
                                activity,
                                activity.getPackageName() + ".fileprovider",
                                destFile
                        );
                        Intent installIntent = new Intent(Intent.ACTION_VIEW);
                        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                        installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(installIntent);

                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        call.resolve(ret);
                    } catch (Exception ex) {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(browserIntent);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("fallback", true);
                        call.resolve(ret);
                    }
                });
            } catch (Exception e) {
                activity.runOnUiThread(() -> {
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        activity.startActivity(browserIntent);
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("fallback", true);
                        call.resolve(ret);
                    } catch (Exception ex) {
                        call.reject("Download error: " + e.getMessage(), e);
                    }
                });
            } finally {
                if (conn != null) {
                    try { conn.disconnect(); } catch (Exception ignored) {}
                }
            }
        }).start();
    }
}
