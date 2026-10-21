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

        // 2. 4x2 widgets
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
