package com.medmatrix.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

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
        String videoCh1 = call.getString("videoCh1", "Bacterial Genetics (34m)");
        String videoCh2 = call.getString("videoCh2", "Drug Resistance (21m)");
        String revisionCh1 = call.getString("revisionCh1", "General Pathology (Anki)");
        String revisionCh2 = call.getString("revisionCh2", "Autonomic Pharmacology");
        String bgStyle = call.getString("bgStyle", "frosted");
        int cornerRadius = call.getInt("cornerRadius", 24);

        if (todayDate != null && !todayDate.isEmpty()) {
            editor.putString("todayDate", todayDate);
        }
        editor.putString("subject", subject);
        editor.putString("mcqCh1", mcqCh1);
        editor.putString("mcqCh2", mcqCh2);
        editor.putString("videoCh1", videoCh1);
        editor.putString("videoCh2", videoCh2);
        editor.putString("revisionCh1", revisionCh1);
        editor.putString("revisionCh2", revisionCh2);
        editor.putString("bgStyle", bgStyle);
        editor.putInt("cornerRadius", cornerRadius);
        editor.apply();

        // Broadcast update to all active home screen widgets
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, MedMatrixWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);

        if (appWidgetIds != null && appWidgetIds.length > 0) {
            Intent updateIntent = new Intent(context, MedMatrixWidgetProvider.class);
            updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
            context.sendBroadcast(updateIntent);

            for (int appWidgetId : appWidgetIds) {
                MedMatrixWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId);
            }
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("widgetsUpdated", appWidgetIds != null ? appWidgetIds.length : 0);
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
        ret.put("videoCh1", prefs.getString("videoCh1", "Bacterial Genetics (34m)"));
        ret.put("videoCh2", prefs.getString("videoCh2", "Drug Resistance (21m)"));
        ret.put("revisionCh1", prefs.getString("revisionCh1", "General Pathology (Anki)"));
        ret.put("revisionCh2", prefs.getString("revisionCh2", "Autonomic Pharmacology"));
        ret.put("bgStyle", prefs.getString("bgStyle", "frosted"));
        ret.put("cornerRadius", prefs.getInt("cornerRadius", 24));
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
}
