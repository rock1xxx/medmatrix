package com.medmatrix.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;

public class MedMatrixWidget4x1Provider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static boolean updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(MedMatrixWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        PendingIntent pendingIntent = MedMatrixWidgetProvider.getAppPendingIntent(context);
        // Never throws: a failure here would otherwise take the whole app down.
        return MedMatrixWidgetProvider.updateOne(context, appWidgetManager, appWidgetId, "4x1",
                () -> MedMatrixWidgetProvider.build4x1Views(context, prefs, pendingIntent));
    }

}
