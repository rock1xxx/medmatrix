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
import android.util.Log;
import androidx.core.content.FileProvider;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    public static final String PREFS_NAME = "MedMatrixWidgetPrefs";
    // Kept in SharedPreferences (not WebView localStorage) so the Supabase
    // credentials survive app updates, "clear cache" and Android auto-backup
    // restores. Nothing is ever written into the repository.
    public static final String SYNC_PREFS_NAME = "MedMatrixSyncPrefs";
    // Full study database mirrored into the app's private files dir. WebView
    // localStorage is wiped by "clear storage", a WebView reset or a reinstall;
    // these files are not, and they are covered by Android Auto Backup.
    private static final String DATA_SNAPSHOT_FILE = "medmatrix-data.json";
    private static final String DATA_SNAPSHOT_PREV = "medmatrix-data.prev.json";
    // One dated copy per day, pruned to the newest N, so a bad edit or a botched
    // restore can be walked back several days without any cloud round-trip.
    private static final String DATA_HISTORY_DIR = "medmatrix-backup-history";
    private static final int DATA_HISTORY_LIMIT = 14;

    /** Updates one placed widget. Implemented by each provider's rebuild entry point. */
    private interface WidgetUpdater {
        boolean update(AppWidgetManager manager, int appWidgetId);
    }

    /**
     * Rebuilds every placed widget of one provider class and returns how many succeeded.
     * Each widget is isolated: one size that fails to build can no longer stop the other
     * sizes from refreshing, and nothing here is allowed to throw back into the bridge.
     */
    private static int refreshWidgets(Context context, AppWidgetManager appWidgetManager,
                                      Class<?> providerClass, String label, WidgetUpdater updater) {
        try {
            int[] ids = appWidgetManager.getAppWidgetIds(new ComponentName(context, providerClass));
            if (ids == null || ids.length == 0) return 0;

            int updated = 0;
            for (int id : ids) {
                try {
                    if (updater.update(appWidgetManager, id)) updated++;
                } catch (Exception e) {
                    Log.e("MedMatrixWidget", label + ": widget " + id + " could not be rebuilt", e);
                }
            }
            return updated;
        } catch (Exception e) {
            Log.e("MedMatrixWidget", label + ": could not list placed widgets", e);
            return 0;
        }
    }

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

        // Rebuild every registered home screen widget size.
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int totalWidgetsUpdated = 0;
        totalWidgetsUpdated += refreshWidgets(context, appWidgetManager,
                MedMatrixWidget2x2Provider.class, "2x2",
                (manager, id) -> MedMatrixWidget2x2Provider.updateAppWidget(context, manager, id));
        totalWidgetsUpdated += refreshWidgets(context, appWidgetManager,
                MedMatrixWidget4x1Provider.class, "4x1",
                (manager, id) -> MedMatrixWidget4x1Provider.updateAppWidget(context, manager, id));
        totalWidgetsUpdated += refreshWidgets(context, appWidgetManager,
                MedMatrixWidget4x2Provider.class, "4x2",
                (manager, id) -> MedMatrixWidget4x2Provider.updateAppWidget(context, manager, id));
        totalWidgetsUpdated += refreshWidgets(context, appWidgetManager,
                MedMatrixWidget4x4Provider.class, "4x4",
                (manager, id) -> MedMatrixWidget4x4Provider.updateAppWidget(context, manager, id));
        totalWidgetsUpdated += refreshWidgets(context, appWidgetManager,
                MedMatrixWidgetProvider.class, "legacy",
                (manager, id) -> {
                    MedMatrixWidgetProvider.updateAppWidget(context, manager, id);
                    return true;
                });

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
    public void saveSyncConfig(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(SYNC_PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString("supabaseUrl", call.getString("supabaseUrl", ""))
            .putString("supabaseAnonKey", call.getString("supabaseAnonKey", ""))
            .putString("syncKey", call.getString("syncKey", "dr-med-sync"))
            .apply();

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void loadSyncConfig(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(SYNC_PREFS_NAME, Context.MODE_PRIVATE);

        JSObject ret = new JSObject();
        ret.put("supabaseUrl", prefs.getString("supabaseUrl", ""));
        ret.put("supabaseAnonKey", prefs.getString("supabaseAnonKey", ""));
        ret.put("syncKey", prefs.getString("syncKey", "dr-med-sync"));
        call.resolve(ret);
    }

    /**
     * Writes the whole study database to a file, never in place: the previous copy
     * is rotated to a second slot and the new one is renamed into position after a
     * successful, fsynced write. A crash or a full disk therefore cannot leave the
     * device with zero readable copies.
     */
    @PluginMethod
    public void saveDataSnapshot(PluginCall call) {
        String json = call.getString("json");
        if (json == null || json.isEmpty()) {
            call.reject("Refusing to write an empty data snapshot");
            return;
        }

        Context context = getContext();
        File dir = context.getFilesDir();
        File main = new File(dir, DATA_SNAPSHOT_FILE);
        File prev = new File(dir, DATA_SNAPSHOT_PREV);
        File tmp = new File(dir, DATA_SNAPSHOT_FILE + ".tmp");

        // Disk writes stay off the UI thread; this fires on every study edit.
        new Thread(() -> {
            try {
                try (FileOutputStream out = new FileOutputStream(tmp)) {
                    out.write(json.getBytes(StandardCharsets.UTF_8));
                    out.flush();
                    out.getFD().sync();
                }

                if (main.exists()) {
                    if (prev.exists() && !prev.delete()) {
                        // A stale backup slot is not worth failing the write over.
                    }
                    if (!main.renameTo(prev)) {
                        // Keep the live copy rather than deleting it.
                    }
                }

                if (!tmp.renameTo(main)) {
                    call.reject("Could not move the data snapshot into place");
                    return;
                }

                writeHistoryCopy(context, json);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("bytes", json.getBytes(StandardCharsets.UTF_8).length);
                call.resolve(ret);
            } catch (Exception e) {
                tmp.delete();
                call.reject("Could not write data snapshot: " + e.getMessage(), e);
            }
        }, "MedMatrixSnapshotWrite").start();
    }

    @PluginMethod
    public void loadDataSnapshot(PluginCall call) {
        Context context = getContext();
        File dir = context.getFilesDir();
        JSObject ret = new JSObject();

        File main = new File(dir, DATA_SNAPSHOT_FILE);
        String json = readTextFile(main);
        File source = main;

        if (json == null) {
            File prev = new File(dir, DATA_SNAPSHOT_PREV);
            json = readTextFile(prev);
            source = prev;
        }

        if (json == null) {
            ret.put("json", "");
            ret.put("savedAt", 0);
            call.resolve(ret);
            return;
        }

        ret.put("json", json);
        ret.put("savedAt", source.lastModified());
        call.resolve(ret);
    }

    /**
     * Keeps one dated copy per day and drops the oldest beyond the limit. A failure
     * here is never allowed to affect the live snapshot that was just written.
     */
    private static void writeHistoryCopy(Context context, String json) {
        try {
            File dir = new File(context.getFilesDir(), DATA_HISTORY_DIR);
            if (!dir.exists() && !dir.mkdirs()) return;

            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            File target = new File(dir, today + ".json");
            if (target.exists() && target.length() > 0) return;

            File tmp = new File(dir, today + ".tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                out.flush();
                out.getFD().sync();
            }
            if (!tmp.renameTo(target)) {
                tmp.delete();
                return;
            }

            File[] files = dir.listFiles((d, name) -> name.endsWith(".json"));
            if (files == null || files.length <= DATA_HISTORY_LIMIT) return;

            Arrays.sort(files, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
            for (int i = 0; i < files.length - DATA_HISTORY_LIMIT; i++) {
                files[i].delete();
            }
        } catch (Exception e) {
            // History is a convenience; the live snapshot already succeeded.
        }
    }

    @PluginMethod
    public void listDataSnapshots(PluginCall call) {
        JSArray snapshots = new JSArray();
        File dir = new File(getContext().getFilesDir(), DATA_HISTORY_DIR);
        File[] files = dir.listFiles((d, name) -> name.endsWith(".json"));

        if (files != null) {
            Arrays.sort(files, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
            for (File file : files) {
                JSObject item = new JSObject();
                item.put("name", file.getName());
                item.put("savedAt", file.lastModified());
                item.put("bytes", file.length());
                snapshots.put(item);
            }
        }

        JSObject ret = new JSObject();
        ret.put("snapshots", snapshots);
        call.resolve(ret);
    }

    @PluginMethod
    public void loadDataSnapshotFile(PluginCall call) {
        String name = call.getString("name", "");
        JSObject ret = new JSObject();

        // Only ever read a dated history file from inside the app's own directory.
        if (name == null || !name.matches("\\d{4}-\\d{2}-\\d{2}\\.json")) {
            ret.put("json", "");
            call.resolve(ret);
            return;
        }

        File file = new File(new File(getContext().getFilesDir(), DATA_HISTORY_DIR), name);
        String json = readTextFile(file);
        ret.put("json", json == null ? "" : json);
        call.resolve(ret);
    }

    private static String readTextFile(File file) {
        if (file == null || !file.exists() || file.length() == 0) return null;
        try (FileInputStream in = new FileInputStream(file)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream((int) file.length());
            byte[] buffer = new byte[16384];
            int len;
            while ((len = in.read(buffer)) != -1) {
                out.write(buffer, 0, len);
            }
            String text = new String(out.toByteArray(), StandardCharsets.UTF_8);
            return text.isEmpty() ? null : text;
        } catch (Exception e) {
            return null;
        }
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
