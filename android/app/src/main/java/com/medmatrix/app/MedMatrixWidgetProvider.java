package com.medmatrix.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MedMatrixWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "MedMatrixWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        updateAppWidget(context, appWidgetManager, appWidgetId);
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        RemoteViews views;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Map<SizeF, RemoteViews> viewMapping = new HashMap<>();
            // 2x2: Active Focus Hero (starting from 110dp width x 100dp height)
            viewMapping.put(new SizeF(110f, 100f), build2x2Views(context, prefs, pendingIntent));
            // 4x2: Dual Chapter Desk Banner (starting from 240dp width x 100dp height)
            viewMapping.put(new SizeF(240f, 100f), build4x2Views(context, prefs, pendingIntent));
            // 4x4: Full Day Overview & Revision (starting from 240dp width x 180dp height)
            viewMapping.put(new SizeF(240f, 180f), build4x4Views(context, prefs, pendingIntent));
            views = new RemoteViews(viewMapping);
        } else {
            Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
            int minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 260);
            int minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
            if (minWidth < 220) {
                views = build2x2Views(context, prefs, pendingIntent);
            } else if (minHeight >= 180) {
                views = build4x4Views(context, prefs, pendingIntent);
            } else {
                views = build4x2Views(context, prefs, pendingIntent);
            }
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String getTodayDateFormatted(SharedPreferences prefs) {
        String saved = prefs.getString("todayDate", "");
        if (saved != null && !saved.trim().isEmpty()) {
            return saved;
        }
        return new SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(new Date());
    }

    private static int getBgDrawableRes(String bgStyle, int radius) {
        if ("transparent".equalsIgnoreCase(bgStyle)) {
            if (radius <= 16) return R.drawable.widget_bg_transparent_16;
            if (radius >= 32) return R.drawable.widget_bg_transparent_32;
            return R.drawable.widget_bg_transparent_24;
        } else if ("opaque".equalsIgnoreCase(bgStyle)) {
            if (radius <= 16) return R.drawable.widget_bg_opaque_16;
            if (radius >= 32) return R.drawable.widget_bg_opaque_32;
            return R.drawable.widget_bg_opaque_24;
        } else {
            // frosted default
            if (radius <= 16) return R.drawable.widget_bg_frosted_16;
            if (radius >= 32) return R.drawable.widget_bg_frosted_32;
            return R.drawable.widget_bg_frosted_24;
        }
    }

    private static int getCardDrawableRes(String bgStyle) {
        if ("transparent".equalsIgnoreCase(bgStyle)) {
            return R.drawable.widget_card_transparent;
        } else if ("opaque".equalsIgnoreCase(bgStyle)) {
            return R.drawable.widget_card_opaque;
        } else {
            return R.drawable.widget_card_frosted;
        }
    }

    private static RemoteViews build2x2Views(Context context, SharedPreferences prefs, PendingIntent pendingIntent) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_2x2_layout);

        String bgStyle = prefs.getString("bgStyle", "frosted");
        int cornerRadius = prefs.getInt("cornerRadius", 24);
        int bgRes = getBgDrawableRes(bgStyle, cornerRadius);
        int cardRes = getCardDrawableRes(bgStyle);

        views.setInt(R.id.widget_container, "setBackgroundResource", bgRes);
        views.setInt(R.id.card_ward_mcqs, "setBackgroundResource", cardRes);
        views.setInt(R.id.card_tonight_videos, "setBackgroundResource", cardRes);

        views.setTextViewText(R.id.widget_title, "TODAY");
        views.setTextViewText(R.id.widget_date, "• " + getTodayDateFormatted(prefs));
        views.setTextViewText(R.id.widget_subject_badge, prefs.getString("subject", "Microbiology"));
        views.setTextViewText(R.id.widget_mcq_ch1, prefs.getString("mcqCh1", "Sterilization & Disinfection"));
        views.setTextViewText(R.id.widget_mcq_ch2, prefs.getString("mcqCh2", "Bacterial Culture Media"));
        views.setTextViewText(R.id.widget_video_ch1, prefs.getString("videoCh1", "Bacterial Genetics (34m)"));

        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        return views;
    }

    private static RemoteViews build4x2Views(Context context, SharedPreferences prefs, PendingIntent pendingIntent) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_4x2_layout);

        String bgStyle = prefs.getString("bgStyle", "frosted");
        int cornerRadius = prefs.getInt("cornerRadius", 24);
        int bgRes = getBgDrawableRes(bgStyle, cornerRadius);
        int cardRes = getCardDrawableRes(bgStyle);

        views.setInt(R.id.widget_container, "setBackgroundResource", bgRes);
        views.setInt(R.id.card_ward_mcqs, "setBackgroundResource", cardRes);
        views.setInt(R.id.card_tonight_videos, "setBackgroundResource", cardRes);

        views.setTextViewText(R.id.widget_title, "TODAY");
        views.setTextViewText(R.id.widget_date, "• " + getTodayDateFormatted(prefs));
        views.setTextViewText(R.id.widget_subject_badge, prefs.getString("subject", "Microbiology"));
        views.setTextViewText(R.id.widget_mcq_ch1, prefs.getString("mcqCh1", "Sterilization & Disinfection"));
        views.setTextViewText(R.id.widget_mcq_ch2, prefs.getString("mcqCh2", "Bacterial Culture Media"));
        views.setTextViewText(R.id.widget_video_ch1, prefs.getString("videoCh1", "Bacterial Genetics (34m)"));
        views.setTextViewText(R.id.widget_video_ch2, prefs.getString("videoCh2", "Drug Resistance (21m)"));

        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        return views;
    }

    private static RemoteViews build4x4Views(Context context, SharedPreferences prefs, PendingIntent pendingIntent) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_4x4_layout);

        String bgStyle = prefs.getString("bgStyle", "frosted");
        int cornerRadius = prefs.getInt("cornerRadius", 24);
        int bgRes = getBgDrawableRes(bgStyle, cornerRadius);
        int cardRes = getCardDrawableRes(bgStyle);

        views.setInt(R.id.widget_container, "setBackgroundResource", bgRes);
        views.setInt(R.id.card_ward_mcqs, "setBackgroundResource", cardRes);
        views.setInt(R.id.card_tonight_videos, "setBackgroundResource", cardRes);
        views.setInt(R.id.card_revision, "setBackgroundResource", cardRes);

        views.setTextViewText(R.id.widget_title, "TODAY");
        views.setTextViewText(R.id.widget_date, "• " + getTodayDateFormatted(prefs));
        views.setTextViewText(R.id.widget_subject_badge, prefs.getString("subject", "Microbiology"));
        views.setTextViewText(R.id.widget_mcq_ch1, prefs.getString("mcqCh1", "Sterilization & Disinfection"));
        views.setTextViewText(R.id.widget_mcq_ch2, prefs.getString("mcqCh2", "Bacterial Culture Media"));
        views.setTextViewText(R.id.widget_video_ch1, prefs.getString("videoCh1", "Bacterial Genetics (34m)"));
        views.setTextViewText(R.id.widget_video_ch2, prefs.getString("videoCh2", "Drug Resistance (21m)"));
        views.setTextViewText(R.id.widget_revision_ch1, prefs.getString("revisionCh1", "General Pathology (Anki)"));
        views.setTextViewText(R.id.widget_revision_ch2, prefs.getString("revisionCh2", "Autonomic Pharmacology"));

        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        return views;
    }
}
