# Project specific ProGuard / R8 rules for Geobooker Android App

# 1. Capacitor Core & Bridge
-keep public class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.annotation.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <methods>;
}

# 2. Preserve JavascriptInterface for WebView communication
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 3. Capacitor Official Plugins
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.capgo.** { *; }

# 4. Google Play Services & Google Maps
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# 5. Preserve Line Numbers & Attributes for Google Play crash reporting / de-obfuscation
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod

# 6. Suppress safe warnings during R8 shrinking
-dontwarn android.webkit.**
-dontwarn org.apache.commons.**
