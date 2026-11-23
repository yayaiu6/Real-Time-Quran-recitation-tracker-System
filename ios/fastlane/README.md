fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### ios_status

```sh
[bundle exec] fastlane ios_status
```

Show what is currently on TestFlight / App Store

### ship_ios

```sh
[bundle exec] fastlane ship_ios
```

iOS: bump build number, build, upload to TestFlight

### retry_upload_ios

```sh
[bundle exec] fastlane retry_upload_ios
```

Re-upload an already-built IPA to TestFlight (no rebuild)

### internal

```sh
[bundle exec] fastlane internal
```

Send the latest build to the 'internal' TestFlight group (no review)

### external

```sh
[bundle exec] fastlane external
```

Send the latest build to the 'external' TestFlight group (Apple beta review)

### beta

```sh
[bundle exec] fastlane beta
```

Alias for `external`, kept so older notes and tags still work

### release_ios

```sh
[bundle exec] fastlane release_ios
```

Submit the latest TestFlight build to App Store review

### make_app

```sh
[bundle exec] fastlane make_app
```

Explain how to create the App Store Connect record (cannot be automated)

### make_profile

```sh
[bundle exec] fastlane make_profile
```

Reissue the App Store provisioning profile and install it locally

### ci_bundle

```sh
[bundle exec] fastlane ci_bundle
```

Install the four GitHub Actions secrets (upload:true), or write them out

### ci_ship_ios

```sh
[bundle exec] fastlane ci_ship_ios
```

CI: build signed and upload to TestFlight (GitHub Actions)

### ci_build_unsigned

```sh
[bundle exec] fastlane ci_build_unsigned
```

CI: build unsigned only (no secrets needed) — compile check

### make_ci_cert

```sh
[bundle exec] fastlane make_ci_cert
```

Mint a CI-only Apple Distribution certificate (no keychain prompt)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
