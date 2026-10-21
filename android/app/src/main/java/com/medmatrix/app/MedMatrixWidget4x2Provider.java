package com.medmatrix.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class MedMatrixWidget4x2Provider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(MedMatrixWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        PendingIntent pendingIntent = MedMatrixWidgetProvider.getAppPendingIntent(context);
        RemoteViews views = MedMatrixWidgetProvider.build4x2Views(context, prefs, pendingIntent);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
