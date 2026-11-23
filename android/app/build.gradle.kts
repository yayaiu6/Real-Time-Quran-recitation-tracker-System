import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.recitequran.app"
    compileSdk = maxOf(flutter.compileSdkVersion, 37)
    ndkVersion = flutter.ndkVersion

    val keystoreProperties = Properties()
    val keystorePropertiesFile = rootProject.file("key.properties")
    val hasKeyProperties = keystorePropertiesFile.exists()

    if (hasKeyProperties) {
        keystoreProperties.load(FileInputStream(keystorePropertiesFile))
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    defaultConfig {
        applicationId = "com.recitequran.app"
        minSdk = 26
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (hasKeyProperties) {
                val storePass = keystoreProperties.getProperty("storePassword")
                val keyPass = keystoreProperties.getProperty("keyPassword")
                val alias = keystoreProperties.getProperty("keyAlias")
                val storePath = keystoreProperties.getProperty("storeFile")

                if (storePass != null && keyPass != null && alias != null && storePath != null) {
                    keyAlias = alias
                    keyPassword = keyPass
                    storeFile = file(storePath)
                    storePassword = storePass
                }
            }
        }
    }

    buildTypes {
        getByName("release") {
            // Only apply release signing configuration if the key properties actually exist
            if (hasKeyProperties && 
                keystoreProperties.containsKey("storePassword") && 
                keystoreProperties.containsKey("keyPassword") && 
                keystoreProperties.containsKey("keyAlias") && 
                keystoreProperties.containsKey("storeFile")) {
                signingConfig = signingConfigs.getByName("release")
            } else {
                println("WARNING: key.properties or signing keys missing. Building an UNSIGNED release.")
                signingConfig = null
            }
            
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    packaging {
        jniLibs {
            pickFirsts.add("**/libonnxruntime.so")
            pickFirsts.add("**/libc++_shared.so")
            useLegacyPackaging = true
        }
    }

    androidResources {
        noCompress += listOf("onnx", "txt", "json", "npy")
    }
}

flutter {
    source = "../.."
}