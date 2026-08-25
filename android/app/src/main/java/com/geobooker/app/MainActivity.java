package com.geobooker.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MetaAppEventsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
