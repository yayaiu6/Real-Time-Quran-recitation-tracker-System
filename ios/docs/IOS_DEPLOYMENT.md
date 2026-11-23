# iOS deployment

Two ways to ship this app to Apple:

- **From a Mac** — `bundle exec fastlane ship_ios`, the fastest loop while iterating.
- **From GitHub Actions** — the *06 - Deploy iOS (signed)* workflow, so someone on Windows
  (or anyone without a Mac) can release without touching one. GitHub's macOS
  runners are free for public repositories.

Both paths run the same fastlane lanes, so they cannot drift apart.

> **Shipping from Windows?** Read
> **[RELEASING_WITHOUT_A_MAC.md](RELEASING_WITHOUT_A_MAC.md)** instead — it is
> the short version, and everything in it needs only git. This page is the
> reference for whoever maintains the signing setup on the Mac.

---

## App identity

| | |
|---|---|
| Bundle ID | `com.recitequran.app` |
| Apple team | `ZKQ5264RUS` — Abdeljawad Almiladi |
| App Store name | Recite Quran - اتلو القران |
| Display name | `Recite Quran` (English), `اتلو القران` (Arabic) |
| Minimum iOS | 15.0 |
| App Store Connect API key | `ZJUS9VF3D6` (shared with the team's other apps) |

The ASR model is **not** in the repo. It is a 69 MB asset on the
[`models-latest`](https://github.com/Iam-Muslim/Natlu/releases/tag/models-latest)
release, fetched automatically by every build path. Upstream it lives in a gated
HuggingFace repo under the Quran-Lab NPL-1.2 licence, which is why it is not
committed.

---

## One-time setup

Do this once, on a Mac, before the first release.

### 1. Install the toolchain

```bash
brew install ruby cocoapods gh
cd ios
PATH="/opt/homebrew/opt/ruby/bin:$PATH" bundle install
```

fastlane 2.236 needs Ruby 3+, so it must run under the Homebrew Ruby rather than
macOS's built-in 2.6. Every command below assumes that `PATH` prefix.

### 2. Put the API key in place

```bash
mkdir -p ios/secrets
cp /path/to/AuthKey_ZJUS9VF3D6.p8 ios/secrets/
chmod 600 ios/secrets/AuthKey_ZJUS9VF3D6.p8
```

`ios/secrets/` is gitignored. Nothing in it may ever be committed.

### 3. Create the App Store Connect record — by hand

The bundle ID `com.recitequran.app` is **already registered** on the developer
portal (`6Y9927RW9W`), so signing works. What is still missing is the App Store
Connect *listing*.

That one step cannot be scripted. fastlane's `produce` action only supports Apple
ID + password authentication — it predates App Store Connect API keys — and
Apple's API has no endpoint for creating an app record at all. So:

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com/apps).
2. **Apps → +  → New App**.
3. Platform **iOS**, bundle ID **com.recitequran.app**, name
   **Recite Quran - اتلو القران**, primary language **Arabic**, SKU
   `com.recitequran.app`.

`bundle exec fastlane ios_status` reports `TestFlight latest build = n/a` until
this exists. Nothing else needs it — the certificate and profile below work
without it.

### 4. Signing identity for CI

```bash
bundle exec fastlane make_ci_cert
```

This is the part that is easy to get wrong, so it is worth knowing what it does.

Xcode manages certificates for you, but only in one direction. Apple never holds
your private key — it only ever signs the public half — so there is no way to
fetch the key back down. The key behind the team's original certificate lives in
the login keychain guarded by a per-item ACL, and exporting it always raises a
GUI prompt. Fine once by hand; useless in a script, and impossible for a
collaborator with no Mac.

So this lane does not try to extract that key. It mints a **second**, CI-only
Apple Distribution certificate, generating the private key locally as a file and
sending Apple only the signing request. No keychain prompt, and it can be re-run
whenever the certificate expires.

It then reissues the `ReciteQuran AppStore` profile with **both** certificates
attached — the one on your Mac and the CI one — writing it to `secrets/`.

Two things it is careful about:

- **Apple caps distribution certificates per team.** The lane refuses to run once
  there are two, and reuses whatever is already in `secrets/ci/` instead of
  minting another. Delete that directory to deliberately start over.
- **Your original certificate is never touched.** Adding a certificate does not
  affect an existing one; only revoking does. Every other app on this Apple
  team keeps signing exactly as before. If the CI certificate is ever
  compromised, revoke just that one — nothing else is affected.

The profile is built through the App Store Connect API rather than `sigh`,
because `sigh` only attaches certificates whose private key it can find in the
local keychain — which would silently leave the CI certificate out and make the
runner's signature invalid.

### 5. Give GitHub Actions the secrets

```bash
bundle exec fastlane ci_bundle upload:true
```

Installs all four secrets with `gh`, reading each value on stdin so it never
reaches a command line or a log. No browser needed.

**This needs `admin` on the repository — write access is not enough.** If you get
a 403, ask the repo owner either to grant you Admin (Settings → Collaborators →
change role) or to run the command himself.

Without `upload:true` the lane writes `secrets/ci_secrets.txt` instead, to add by
hand under **Settings → Secrets and variables → Actions**. Delete it afterwards:

```bash
rm secrets/ci_secrets.txt
```

| Secret | What it is |
|---|---|
| `IOS_DIST_CERT_P12` | the CI certificate and its private key |
| `IOS_DIST_CERT_PASSWORD` | randomly generated by `make_ci_cert` |
| `IOS_PROVISIONING_PROFILE` | the App Store profile, both certificates attached |
| `ASC_KEY_P8` | the App Store Connect API key |

Worth being aware of: these live in the repository's settings, so anyone with
admin there can sign builds as this Apple team. That is inherent to running
releases from someone else's repository, and it is exactly why the CI
certificate is a separate one — it can be revoked on its own without disturbing
any other project.

---

## Releasing from a Mac

```bash
export PATH="/opt/homebrew/opt/ruby/bin:$PATH"

bundle exec fastlane ios_status    # what is on TestFlight right now
bundle exec fastlane ship_ios      # bump build number, build, upload to TestFlight
bundle exec fastlane internal      # confirm the internal group has it
bundle exec fastlane external      # send it to the external testers
bundle exec fastlane release_ios   # submit to App Store review
```

`ship_ios` refuses to start if the marketing version in `pubspec.yaml` is already
on App Store Connect, because Apple only rejects a duplicate version at the very
end of a submission — after a full archive has been built and uploaded. Bump
`version:` in `pubspec.yaml` for each release; the build number after the `+`
is managed automatically.

---

## Releasing from GitHub (no Mac)

Everything runs on GitHub's macOS runners, which are free for public
repositories. Nothing here needs a Mac, and the tag route needs nothing but git.

### By tag — the CLI route

```bash
git tag ios-testflight-1.0.3
git push origin ios-testflight-1.0.3
```

The tag is `ios-<action>-<version>`:

| Tag | What it does | Needs signing secrets |
|---|---|---|
| `ios-unsigned-1` | Compiles only. A smoke test that the app still builds. | no |
| `ios-testflight-1.0.3` | Builds a signed IPA and uploads it to TestFlight. | yes |
| `ios-internal-1.0.3` | Confirms the last build is with the `internal` group. | API key only |
| `ios-external-1.0.3` | Sends the last build to the `external` group. | API key only |
| `ios-appstore-1.0.3` | Submits the last TestFlight build to App Store review. | API key only |

`ios-beta-*` still works as an alias for `ios-external-*`.

### internal vs external

The two TestFlight groups behave quite differently:

**`internal`** — team members on the App Store Connect account, up to 100. It is
configured to receive every build automatically, so a build is with them the
moment Apple finishes processing it, with no review of any kind. There is
nothing to assign: Apple's API actually rejects a manual assignment to such a
group with *"Cannot add internal group to a build"*. The `internal` action
recognises this and reports which build they already have rather than failing.

**`external`** — anyone you invite, up to 10,000. The first build a group sees
has to clear Apple's beta review, usually about a day. This one is a real
assignment, and testers are emailed when it lands.

When the last part looks like a version number it becomes the marketing version,
overriding `pubspec.yaml` for that run. When it does not — `ios-unsigned-1` —
it is just there to keep the tag unique, and the version comes from `pubspec.yaml`.

Watch it with `gh run watch`, or:

```bash
gh run list --repo Iam-Muslim/Natlu --workflow 06_deploy_ios.yml
```

### By button

**Actions → 06 - Deploy iOS (signed) → Run workflow**, then pick the action from
the dropdown and optionally set a marketing version. Same job either way.

A signed build takes roughly 25–40 minutes; most of it is the Xcode archive. The
finished IPA is attached to the run as an artefact for 14 days. On failure, the
gym and fastlane logs are attached instead — that is the first place to look.

### The normal release sequence

```
ios-testflight-X.Y.Z   build and upload; the internal group has it as soon
                       as Apple finishes processing (5-30 min)
        ↓
ios-external-X.Y.Z     hand it to the external testers (Apple beta review,
                       about a day for a group's first build)
        ↓
ios-appstore-X.Y.Z     submit to App Store review
```

Only the first step builds anything. `internal`, `external` and `appstore` act
on the binary already sitting on TestFlight, so they finish in a couple of
minutes.

Before `ios-appstore-*` will do anything, the listing has to be complete — see
**App Store metadata** below. It refuses to submit while placeholders remain.

### Notes

- Runs are serialised by a concurrency group. Two builds at once would race for
  the same TestFlight build number.
- The build number bump happens on the runner and is deliberately **not**
  committed back. The next build number is derived from what TestFlight already
  has, so nothing drifts even though the repo is never written to.
- Signing is switched from automatic to manual on the runner only, because a CI
  machine has no Xcode account to resolve a profile with. Your checkout is
  untouched.

---

## App Store metadata

The listing text lives in `fastlane/metadata/` and is uploaded by the `appstore`
action. It ships as a scaffold: the parts that are simply facts are filled in,
and everything needing a human decision says `TODO`.

```
fastlane/metadata/
├── primary_category.txt          EDUCATION
├── copyright.txt                 TODO
├── ar-SA/                        the listing's only locale
│   ├── name.txt                  Recite Quran - اتلو القران
│   ├── support_url.txt           the repo's issues page
│   ├── marketing_url.txt         recitequran.pages.dev
│   ├── subtitle.txt              TODO   (max 30 chars)
│   ├── description.txt           TODO   (max 4000)
│   ├── keywords.txt              TODO   (max 100 total, comma separated)
│   ├── promotional_text.txt      TODO   (max 170, editable without a new build)
│   ├── release_notes.txt         TODO   (max 4000)
│   └── privacy_url.txt           TODO   (Apple rejects without a reachable page)
└── review_information/
    ├── notes.txt                 how to test the app — written, edit if you like
    ├── demo_user.txt             empty, the app has no accounts
    ├── demo_password.txt         empty
    └── first_name / last_name / phone_number / email_address   TODO
```

**`release_ios` refuses to run while any `TODO` remains**, and lists the files
still to fill. Placeholder text on a public listing is a worse outcome than a
failed lane, so this is deliberate.

To add English alongside Arabic, create `fastlane/metadata/en-US/` with the same
files. Only `ar-SA` exists today because that is the listing's primary language.

**Screenshots are not managed from here.** Apple requires them, but they are far
easier to curate in App Store Connect than to keep in the repo, so
`release_ios` passes `skip_screenshots`. Add them in App Store Connect before
submitting or the submission is rejected.

---

## Notes on the build

**`quran_tajweedformer` comes from GitHub, not pub.dev.** The published 1.0.1 package
runs the ASR model on the plain CPU execution provider on iOS. The CoreML
provider — which uses the Neural Engine — landed in
[`Iam-Muslim/ReciteQuran#4`](https://github.com/Iam-Muslim/ReciteQuran/pull/4)
and has not been released to pub.dev yet, so `pubspec.yaml` points at the
package's default branch. Switch back to a `^x.y.z` constraint once a release
containing it ships.

**`sherpa_onnx` is pinned to 1.13.5, and must stay pinned.** In 1.13.6 the iOS
package renamed its bundle to `sherpa-onnx.xcframework` but left the framework
inside it called `SherpaOnnxC.framework`. CocoaPods derives the linker flag from
the bundle name, so it emits `-framework "sherpa-onnx"` and every iOS archive
fails at link time with `Framework 'sherpa-onnx' not found`. 1.13.5 ships
`SherpaOnnxC.xcframework`, where the two names agree. `sherpa_onnx_ios` is pinned
separately under `dependency_overrides` because `sherpa_onnx` 1.13.5 still
accepts `^1.13.5` for it and would otherwise pull 1.13.6 back in transitively.
Before loosening either pin, build an iOS archive and confirm it links.

**`permission_handler` is compiled down to microphone only.** It otherwise
compiles in every permission it supports, leaving the binary referencing
Contacts, Photos, Camera and Bluetooth APIs that this app never uses and has no
`NS*UsageDescription` for — a routine App Review rejection. The `PERMISSION_MICROPHONE=1`
macro in `ios/Podfile` keeps only the one that is actually needed.

**Export compliance is pre-declared.** `ITSAppUsesNonExemptEncryption` is `false`
in `Info.plist` — the app does no encryption of its own, and recitation never
leaves the device — so TestFlight will not ask about it on every upload.

**A privacy manifest ships in the app.** `ios/Runner/PrivacyInfo.xcprivacy`
declares no tracking and no data collection, and gives Apple's required reasons
for the two API categories the app touches (`UserDefaults` for settings,
file timestamps for the model it extracts from its own bundle).

---

## Troubleshooting

**A newly added workflow does not appear on the Actions tab.** This happened
to `06_deploy_ios.yml` when it was first pushed, and it is a chicken-and-egg
problem rather than a bug in the file: GitHub would not index it, and
`workflow_dispatch` needs an index entry to be dispatchable — so it could not be
started manually, which is what would have indexed it. A deliberately trivial
probe workflow pushed alongside it was not indexed either, which ruled out the
file's contents. Workflows the repository owner adds are indexed immediately, so
it appears to affect files pushed by a collaborator.

Triggering it once by tag broke the deadlock, and it registered straight away.
If you ever add another workflow and it does not show up, give it a trigger you
can fire without the index — a tag push — and run it once.

**`No IPA in build/ios/ipa/`** — the archive succeeded but the export failed,
almost always signing. Locally, open `ios/Runner.xcworkspace` in Xcode and check
the Signing & Capabilities tab. On CI, check that all four secrets are present
and that the provisioning profile has not expired (they last a year).

**`CocoaPods is installed but broken`** during a fastlane build. `flutter build`
shells out to `pod install`, and that subprocess needs opposite handling in the
two places this runs, which `flutter_sh` in the Fastfile takes care of:

- *On a Mac*, fastlane runs under the Homebrew Ruby, whose gem variables leak
  into the subprocess and confuse the system `pod`. Stripping the bundler and
  gem variables is the fix. If you are calling `flutter build` by hand and hit
  this, run it from a plain shell rather than under `bundle exec`.
- *On CI*, `bundle exec` points `GEM_HOME` at the vendored bundle and puts its
  binstubs on `PATH`, so `pod` resolves to the CocoaPods gem in the `Gemfile` —
  which is why it is a dependency there. Scrubbing the environment on a runner
  breaks the thing that makes it work, so `flutter_sh` leaves CI alone.

**Apple rejects the build number** — something else uploaded the same number.
`bundle exec fastlane ios_status` shows what TestFlight has; the next `ship_ios`
picks up from there automatically.

**`The version number has been previously used`** — bump `version:` in
`pubspec.yaml`. `ship_ios` checks this up front, but the `appstore` CI action
submits an already-uploaded binary and cannot.
