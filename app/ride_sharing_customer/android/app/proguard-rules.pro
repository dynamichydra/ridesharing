# --------------------------------------------------------------------------
# Flutter / Dart
# --------------------------------------------------------------------------
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# --------------------------------------------------------------------------
# Google Places SDK (flutter_google_places_sdk_android)
# --------------------------------------------------------------------------
-keep class com.google.android.libraries.places.** { *; }
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-dontwarn com.google.android.libraries.places.**

# --------------------------------------------------------------------------
# Google Maps
# --------------------------------------------------------------------------
-keep class com.google.maps.** { *; }
-dontwarn com.google.maps.**

# --------------------------------------------------------------------------
# Gson (used internally by Google Places SDK)
# --------------------------------------------------------------------------
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.** { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keepclassmembers,allowobfuscation class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# --------------------------------------------------------------------------
# OkHttp / Okio (used by Dio under the hood on Android)
# --------------------------------------------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# --------------------------------------------------------------------------
# Geocoding plugin (geocoding_android)
# --------------------------------------------------------------------------
-keep class com.baseflow.geocoding.** { *; }
-dontwarn com.baseflow.geocoding.**

# --------------------------------------------------------------------------
# Geolocator plugin
# --------------------------------------------------------------------------
-keep class com.baseflow.geolocator.** { *; }
-dontwarn com.baseflow.geolocator.**

# --------------------------------------------------------------------------
# General Android / Kotlin
# --------------------------------------------------------------------------
-dontwarn com.google.j2objc.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.checkerframework.**
-dontwarn kotlin.**
-dontwarn kotlinx.**
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }

# --------------------------------------------------------------------------
# Keep annotations used for reflection
# --------------------------------------------------------------------------
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations
-keepattributes InnerClasses
-keepattributes EnclosingMethod
