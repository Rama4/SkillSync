# Dev History of SkillSync

## Mobile App

### Dropping and re-initializing the local DB upon every app start

Right now, in development mode, so we are dropping the db table and re initializing it upon every app start to keep up with changes in schema during development.

### Prod build configs:

created a keystore file and placed in android folder using the official React Native guide

created `gradle.properties` file to store the keystore passwords in `~/.gradle` folder.

added release signingConfigs in `android/app/build.gradle` :

```
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
```

### Fixed build error in react-native-nitro-modules

Fixed the build error for react-native-nitro-modules, (required for react-native-mmkv): https://github.com/facebook/react-native/issues/49573#issuecomment-2796593338

Edited the `NitroModulesPackage.kt` file in `node_modules:
node_modules\react-native-nitro-modules\android\src\main\java\com\margelo\nitro\NitroModulesPackage.kt`

```kotlin
override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
        val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
        val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        moduleInfos[NitroModules.NAME] =
        ReactModuleInfo(
            name = NitroModules.NAME,
            className = NitroModules.NAME,
            canOverrideExistingModule = false,
            needsEagerInit = false,
            hasConstants = false,
            isCxxModule = false,
            isTurboModule = isTurboModule,
        )
        moduleInfos
    }
}
```

### Fixed long paths error:

Windows - Filename longer than 260 characters error when running android development build

followed these instructions for placing the latest ninja executable in the latest cmake directory: https://github.com/expo/expo/issues/36274#issuecomment-3169176718

followed these instructions for enabling long paths in windows registry, and editing the `android/app/build.gradle` config to pass on the custom cmake options:
https://github.com/ninja-build/ninja/issues/1900#issuecomment-1817532728

### [UI] Icons : serving from svg files

Using `react-native-svg` and `react-native-svg-transformer` to import svg icons located in `mobile-app/src/assets` as react components using [mobile-app/src/declarations.d.ts](mobile-app/src/declarations.d.ts)

Using svg icons from [Open-Iconic](https://www.shadcn.io/icons/oi) and [Lucide](https://www.shadcn.io/icons/lucide)

All SVGs use `fill="currentColor"` for dynamic coloring via `color` prop. See [SVG Icons Guide](mobile-app/docs/SVG_ICONS_GUIDE.md) for adding new icons.
