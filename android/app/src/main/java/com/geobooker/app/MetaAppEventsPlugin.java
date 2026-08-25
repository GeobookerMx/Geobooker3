package com.geobooker.app;

import android.os.Bundle;
import android.content.pm.ApplicationInfo;

import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Iterator;

@CapacitorPlugin(name = "MetaAppEvents")
public class MetaAppEventsPlugin extends Plugin {
    private static final String EXPECTED_APP_ID = "3176918089184321";

    private AppEventsLogger logger;
    private boolean configured = false;
    private boolean enabled = false;
    private boolean activated = false;

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("platform", "android");
        result.put("appId", EXPECTED_APP_ID);
        result.put("debugBuild", isDebugBuild());
        result.put("configured", configured);
        result.put("enabled", enabled);
        call.resolve(result);
    }

    @PluginMethod
    public void configure(PluginCall call) {
        String appId = call.getString("appId", "");
        String clientToken = getContext().getString(R.string.facebook_client_token);

        if (!EXPECTED_APP_ID.equals(appId) || clientToken.trim().isEmpty() || isDebugBuild()) {
            JSObject result = new JSObject();
            result.put("configured", false);
            result.put("reason", isDebugBuild() ? "debug_build" : "missing_meta_client_token");
            call.resolve(result);
            return;
        }

        try {
            FacebookSdk.setApplicationId(appId);
            FacebookSdk.setClientToken(clientToken);
            FacebookSdk.setAutoInitEnabled(false);
            FacebookSdk.setAutoLogAppEventsEnabled(false);
            FacebookSdk.setAdvertiserIDCollectionEnabled(false);
            FacebookSdk.fullyInitialize();

            logger = AppEventsLogger.newLogger(getContext());
            configured = true;

            JSObject result = new JSObject();
            result.put("configured", true);
            call.resolve(result);
        } catch (Exception error) {
            JSObject result = new JSObject();
            result.put("configured", false);
            result.put("reason", "sdk_unavailable");
            call.resolve(result);
        }
    }

    @PluginMethod
    public void enable(PluginCall call) {
        if (!configured || logger == null || isDebugBuild()) {
            JSObject result = new JSObject();
            result.put("enabled", false);
            result.put("reason", isDebugBuild() ? "debug_build" : "not_configured");
            call.resolve(result);
            return;
        }

        FacebookSdk.setAdvertiserIDCollectionEnabled(false);
        enabled = true;

        if (!activated && getActivity() != null) {
            AppEventsLogger.activateApp(getActivity().getApplication());
            activated = true;
        }

        JSObject result = new JSObject();
        result.put("enabled", true);
        call.resolve(result);
    }

    @PluginMethod
    public void disable(PluginCall call) {
        enabled = false;
        FacebookSdk.setAdvertiserIDCollectionEnabled(false);
        JSObject result = new JSObject();
        result.put("enabled", false);
        call.resolve(result);
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        String eventName = call.getString("name", "");
        JSObject params = call.getObject("params", new JSObject());

        if (!enabled || logger == null || eventName.trim().isEmpty()) {
            JSObject result = new JSObject();
            result.put("sent", false);
            result.put("reason", "not_enabled");
            call.resolve(result);
            return;
        }

        try {
            logger.logEvent(eventName, toBundle(params));
            JSObject result = new JSObject();
            result.put("sent", true);
            call.resolve(result);
        } catch (Exception error) {
            JSObject result = new JSObject();
            result.put("sent", false);
            result.put("reason", "log_failed");
            call.resolve(result);
        }
    }

    private Bundle toBundle(JSONObject params) {
        Bundle bundle = new Bundle();
        if (params == null) return bundle;

        Iterator<String> keys = params.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = params.opt(key);

            if (value instanceof Integer) {
                bundle.putInt(key, (Integer) value);
            } else if (value instanceof Long) {
                bundle.putLong(key, (Long) value);
            } else if (value instanceof Float) {
                bundle.putFloat(key, (Float) value);
            } else if (value instanceof Double) {
                bundle.putDouble(key, (Double) value);
            } else if (value instanceof Boolean) {
                bundle.putString(key, String.valueOf(value));
            } else if (value instanceof JSONArray || value instanceof JSArray) {
                bundle.putStringArray(key, jsonArrayToStringArray((JSONArray) value));
            } else if (value != null && value != JSONObject.NULL) {
                bundle.putString(key, String.valueOf(value));
            }
        }
        return bundle;
    }

    private String[] jsonArrayToStringArray(JSONArray array) {
        String[] values = new String[array.length()];
        for (int i = 0; i < array.length(); i++) {
            values[i] = String.valueOf(array.opt(i));
        }
        return values;
    }

    private boolean isDebugBuild() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }
}
