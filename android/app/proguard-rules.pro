# Add project specific ProGuard rules here.
# Keep custom native modules and bridge
-keep class com.pukuai.** { *; }
-keepclassmembers class com.pukuai.** { *; }

# React Native & Hermes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keepattributes *Annotation*, InnerClasses, Signature, EnclosingMethod
-dontwarn com.facebook.react.**

# Expo modules
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**
