package com.medmatrix.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.SizeF;
import android.util.TypedValue;
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

    public static PendingIntent getAppPendingIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        PendingIntent pendingIntent = getAppPendingIntent(context);

        RemoteViews views;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Map<SizeF, RemoteViews> viewMapping = new HashMap<>();
            viewMapping.put(new SizeF(110f, 100f), build2x2Views(context, prefs, pendingIntent));
            viewMapping.put(new SizeF(240f, 50f), build4x1Views(context, prefs, pendingIntent));
            viewMapping.put(new SizeF(240f, 100f), build4x2Views(context, prefs, pendingIntent));
            viewMapping.put(new SizeF(240f, 180f), build4x4Views(context, prefs, pendingIntent));
            views = new RemoteViews(viewMapping);
        } else {
            Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
            int minWidth = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 260) : 260;
            int minHeight = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110) : 110;
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

    public static String getTodayDateFormatted(SharedPreferences prefs) {
        String saved = prefs.getString("todayDate", "");
        if (saved != null && !saved.trim().isEmpty()) {
            return saved;
        }
        return new SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(new Date());
    }

    public static int getBgDrawableRes(String bgStyle, int radius) {
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

    public static int getCardDrawableRes(String bgStyle) {
        if ("transparent".equalsIgnoreCase(bgStyle)) {
            return R.drawable.widget_card_transparent;
        } else if ("opaque".equalsIgnoreCase(bgStyle)) {
            return R.drawable.widget_card_opaque;
        } else {
            return R.drawable.widget_card_frosted;
        }
    }

    public static RemoteViews build2x2Views(Context context, SharedPreferences prefs, PendingIntent pendingIntent) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_2x2_layout);

        String bgStyle = prefs.getString("bgStyle", "frosted");
        int cornerRadius = prefs.getInt("cornerRadius", 24);
        int bgRes = getBgDrawableRes(bgStyle, cornerRadius);
        int cardRes = getCardDrawableRes(bgStyle);
        boolean showBorder = prefs.getBoolean("showBorder", true);

        if (!showBorder) {
            views.setInt(R.id.widget_container, "setBackgroundColor", Color.TRANSPARENT);
        } else {
            views.setInt(R.id.widget_container, "setBackgroundResource", bgRes);
        }
        views.setInt(R.id.card_ward_mcqs, "setBackgroundResource", cardRes);
        views.setInt(R.id.card_tonight_videos, "setBackgroundResource", cardRes);

        views.setTextViewText(R.id.widget_title, "TODAY");
        views.setTextViewText(R.id.widget_date, "• " + getTodayDateFormatted(prefs));
        views.setTextViewText(R.id.widget_subject_badge, prefs.getString("subject", "Microbiology"));
        views.setTextViewText(R.id.widget_mcq_ch1, prefs.getString("mcqCh1", "Sterilization & Disinfection"));
        views.setTextViewText(R.id.widget_mcq_ch2, prefs.getString("mcqCh2", "Bacterial Culture Media"));

        String vid1 = prefs.getString("videoCh1", "Bacterial Genetics (34m)");
        if (!prefs.getBoolean("showDuration", true)) {
            vid1 = vid1.replaceAll("(?i)\\s*\\(\\d+m\\)", "");
        }
        views.setTextViewText(R.id.widget_video_ch1, vid1);

        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        return views;
    }

    private static int dpToPx(Context context, float dp) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, dp, context.getResources().getDisplayMetrics()));
    }

    private static void setScaledText(RemoteViews views, int viewId, String text, float sizeSp) {
        views.setTextViewText(viewId, text);
        views.setTextViewTextSize(viewId, TypedValue.COMPLEX_UNIT_SP, sizeSp);
    }

    public static RemoteViews build4x1Views(Context context, SharedPreferences prefs, PendingIntent pendingIntent) {
        String design = prefs.getString("design4x1", "pill-multi");
        boolean denseDesign = "dense-3tier".equals(design);
        boolean typoDesign = "max-typo-multi".equals(design);

        int layoutRes = denseDesign
                ? R.layout.widget_4x1_dense_layout
                : typoDesign
                ? R.layout.widget_4x1_typo_layout
                : R.layout.widget_4x1_layout;
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutRes);

        int cornerRadius = prefs.getInt("cornerRadius", 24);
        boolean showBorder = prefs.getBoolean("showBorder", true);
        boolean showDuration = prefs.getBoolean("showDuration", true);
        boolean edgeToEdge = prefs.getBoolean("edgeToEdge", false);
        int opacity = prefs.getInt("opacity", 85);

        // Slider range in the settings screen is 80% - 135%.
        float scale = Math.max(0.8f, Math.min(1.35f, prefs.getInt("fontScale", 100) / 100f));

        // Continuous opacity: one fully opaque shape, faded to the chosen level. Fading a
        // dedicated background layer keeps the text crisp instead of dimming everything.
        if (!showBorder || opacity <= 0) {
            views.setInt(R.id.widget_bg, "setBackgroundColor", Color.TRANSPARENT);
        } else {
            views.setInt(R.id.widget_bg, "setBackgroundResource", getBgDrawableRes("opaque", cornerRadius));
            views.setFloat(R.id.widget_bg, "setAlpha", Math.max(0f, Math.min(1f, opacity / 100f)));
        }

        // Padding lives on the content row so the background layer stays full-bleed.
        int horizontalPadding = edgeToEdge ? 0 : 10;
        int verticalPadding = edgeToEdge ? 0 : 4;
        views.setViewPadding(
                R.id.widget_row,
                dpToPx(context, horizontalPadding),
                dpToPx(context, verticalPadding),
                dpToPx(context, horizontalPadding),
                dpToPx(context, verticalPadding)
        );

        // The divider sits inside the text row and is sized against the selected font
        // scale, so it stays in step with the text instead of spanning the whole widget.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            float dividerHeightDp = (denseDesign ? 46f : 40f) * scale;
            views.setViewLayoutHeight(R.id.widget_center_divider, dividerHeightDp, TypedValue.COMPLEX_UNIT_DIP);
        }

        String mcq1 = prefs.getString("mcqCh1", "Sterilization & Disinfection");
        String mcq2 = prefs.getString("mcqCh2", "Bacterial Culture Media");
        String mcq3 = prefs.getString("mcqCh3", "Staphylococci & Streptococci");
        String vid1 = prefs.getString("videoCh1", "Bacterial Genetics (34m)");
        String vid2 = prefs.getString("videoCh2", "Drug Resistance (21m)");
        String vid3 = prefs.getString("videoCh3", "Antimicrobial Therapy (18m)");

        if (!showDuration) {
            String durationPattern = "(?i)\\s*\\(\\d+m\\)";
            vid1 = vid1.replaceAll(durationPattern, "");
            vid2 = vid2.replaceAll(durationPattern, "");
            vid3 = vid3.replaceAll(durationPattern, "");
        }

        float labelSp = (typoDesign ? 8.5f : 8f) * scale;
        float primarySp = (denseDesign ? 10.5f : 11.5f) * scale;
        float secondarySp = (denseDesign ? 9.5f : 10.5f) * scale;
        float tertiarySp = 9f * scale;

        if (denseDesign) {
            setScaledText(views, R.id.widget_label_left, "🩺 WARD MCQS", labelSp);
            setScaledText(views, R.id.widget_label_right, "🌙 TONIGHT", labelSp);

            setScaledText(views, R.id.widget_mcq_ch1, "• " + mcq1, primarySp);
            setScaledText(views, R.id.widget_mcq_ch2, "• " + mcq2, secondarySp);
            setScaledText(views, R.id.widget_mcq_ch3, "• " + mcq3, tertiarySp);

            setScaledText(views, R.id.widget_video_ch1, "• " + vid1, primarySp);
            setScaledText(views, R.id.widget_video_ch2, "• " + vid2, secondarySp);
            setScaledText(views, R.id.widget_video_ch3, "• " + vid3, tertiarySp);
        } else if (typoDesign) {
            setScaledText(views, R.id.widget_label_left, "WARD MCQS", labelSp);
            setScaledText(views, R.id.widget_label_right, "TONIGHT'S VIDEOS", labelSp);

            setScaledText(views, R.id.widget_mcq_ch1, "1. " + mcq1, primarySp);
            setScaledText(views, R.id.widget_mcq_ch2, "2. " + mcq2, secondarySp);

            setScaledText(views, R.id.widget_video_ch1, "1. " + vid1, primarySp);
            setScaledText(views, R.id.widget_video_ch2, "2. " + vid2, secondarySp);
        } else {
            setScaledText(views, R.id.widget_label_left, "🩺 WARD MCQ", labelSp);
            setScaledText(views, R.id.widget_label_right, "🌙 TONIGHT", labelSp);

            setScaledText(views, R.id.widget_mcq_ch1, mcq1, primarySp);
            setScaledText(views, R.id.widget_mcq_ch2, mcq2, secondarySp);

            setScaledText(views, R.id.widget_video_ch1, vid1, primarySp);
            setScaledText(views, R.id.widget_video_ch2, vid2, secondarySp);
        }

        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        return views;
    }

    public static RemoteViews build4x2Views(Context context, SharedPreferences prefs, PendingIntent pendingIntent) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_4x2_layout);

        String bgStyle = prefs.getString("bgStyle", "frosted");
        int cornerRadius = prefs.getInt("cornerRadius", 24);
        int bgRes = getBgDrawableRes(bgStyle, cornerRadius);
        int cardRes = getCardDrawableRes(bgStyle);
        boolean showBorder = prefs.getBoolean("showBorder", true);
        boolean showDuration = prefs.getBoolean("showDuration", true);

        if (!showBorder) {
            views.setInt(R.id.widget_container, "setBackgroundColor", Color.TRANSPARENT);
        } else {
            views.setInt(R.id.widget_container, "setBackgroundResource", bgRes);
        }
        views.setInt(R.id.card_ward_mcqs, "setBackgroundResource", cardRes);
        views.setInt(R.id.card_tonight_videos, "setBackgroundResource", cardRes);

        views.setTextViewText(R.id.widget_title, "TODAY");
        views.setTextViewText(R.id.widget_date, "• " + getTodayDateFormatted(prefs));
        views.setTextViewText(R.id.widget_subject_badge, prefs.getString("subject", "Microbiology"));
        views.setTextViewText(R.id.widget_mcq_ch1, prefs.getString("mcqCh1", "Sterilization & Disinfection"));
        views.setTextViewText(R.id.widget_mcq_ch2, prefs.getString("mcqCh2", "Bacterial Culture Media"));

        String vid1 = prefs.getString("videoCh1", "Bacterial Genetics (34m)");
        String vid2 = prefs.getString("videoCh2", "Drug Resistance (21m)");
        if (!showDuration) {
            vid1 = vid1.replaceAll("(?i)\\s*\\(\\d+m\\)", "");
            vid2 = vid2.replaceAll("(?i)\\s*\\(\\d+m\\)", "");
        }
        views.setTextViewText(R.id.widget_video_ch1, vid1);
        views.setTextViewText(R.id.widget_video_ch2, vid2);

        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        return views;
    }

    public static RemoteViews build4x4Views(Context context, SharedPreferences prefs, PendingIntent pendingIntent) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_4x4_layout);

        String bgStyle = prefs.getString("bgStyle", "frosted");
        int cornerRadius = prefs.getInt("cornerRadius", 24);
        int bgRes = getBgDrawableRes(bgStyle, cornerRadius);
        int cardRes = getCardDrawableRes(bgStyle);
        boolean showBorder = prefs.getBoolean("showBorder", true);
        boolean showDuration = prefs.getBoolean("showDuration", true);

        if (!showBorder) {
            views.setInt(R.id.widget_container, "setBackgroundColor", Color.TRANSPARENT);
        } else {
            views.setInt(R.id.widget_container, "setBackgroundResource", bgRes);
        }
        views.setInt(R.id.card_ward_mcqs, "setBackgroundResource", cardRes);
        views.setInt(R.id.card_tonight_videos, "setBackgroundResource", cardRes);
        views.setInt(R.id.card_revision, "setBackgroundResource", cardRes);

        views.setTextViewText(R.id.widget_title, "TODAY");
        views.setTextViewText(R.id.widget_date, "• " + getTodayDateFormatted(prefs));
        views.setTextViewText(R.id.widget_subject_badge, prefs.getString("subject", "Microbiology"));
        views.setTextViewText(R.id.widget_mcq_ch1, prefs.getString("mcqCh1", "Sterilization & Disinfection"));
        views.setTextViewText(R.id.widget_mcq_ch2, prefs.getString("mcqCh2", "Bacterial Culture Media"));

        String vid1 = prefs.getString("videoCh1", "Bacterial Genetics (34m)");
        String vid2 = prefs.getString("videoCh2", "Drug Resistance (21m)");
        if (!showDuration) {
            vid1 = vid1.replaceAll("(?i)\\s*\\(\\d+m\\)", "");
            vid2 = vid2.replaceAll("(?i)\\s*\\(\\d+m\\)", "");
        }
        views.setTextViewText(R.id.widget_video_ch1, vid1);
        views.setTextViewText(R.id.widget_video_ch2, vid2);
        views.setTextViewText(R.id.widget_revision_ch1, prefs.getString("revisionCh1", "General Pathology (Anki)"));
        views.setTextViewText(R.id.widget_revision_ch2, prefs.getString("revisionCh2", "Autonomic Pharmacology"));

        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);
        return views;
    }
}
