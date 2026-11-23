# Releasing without a Mac

This is the guide for whoever ships the iOS app from Windows (or Linux). You do
not need a Mac, Xcode, Flutter, an Apple account, or the App Store Connect
website. Everything runs on GitHub's macOS runners, which are free for public
repositories.

**You need exactly two things: git, and push access to this repository.**

A release is started by pushing a tag. That is the whole interface.

---

## One-time setup

Install [Git for Windows](https://git-scm.com/download/win). Then:

```bash
git clone https://github.com/Iam-Muslim/Natlu.git
cd Natlu
```

Nothing else. Don't run `flutter pub get`, don't install CocoaPods — the runner
does all of that.

Two Windows notes:

- The default branch has an Arabic name, `ReciteQuran-الحمدلله`. You will never
  need to type it: `git clone` checks it out for you, and `git push origin
  <tag>` pushes a tag without naming the branch. If your terminal renders it
  strangely, that's a display quirk, not a problem.
- If you ever commit code (as opposed to just tagging), set
  `git config core.autocrlf input` first, so Windows line endings don't end up
  in the Dart and YAML files.

Optionally install the [GitHub CLI](https://cli.github.com/) — it lets you watch
a run from the terminal instead of the website. `gh auth login` once.

---

## Starting a release

```bash
git pull
git tag ios-testflight-1.0.4
git push origin ios-testflight-1.0.4
```

That's it. The build starts within about ten seconds.

The tag is `ios-<action>-<version>`:

| Tag you push | What happens | Roughly how long |
|---|---|---|
| `ios-unsigned-3` | Compiles the app and stops. Proves the code still builds. | 6 min |
| `ios-testflight-1.0.4` | Builds a signed app and uploads it to TestFlight. | 6 min |
| `ios-internal-1.0.4` | Reports which build the internal testers have. | 2 min |
| `ios-external-1.0.4` | Sends the last build to the external testers. | 2 min |
| `ios-appstore-1.0.4` | Submits the last build to App Store review. | 2 min |

### Picking the version number

The part after the action becomes the app's version, so it must be a plain
number like `1.0.4` or `2.1`. Anything else is ignored and the version already
in `pubspec.yaml` is used instead — which is why the smoke test can be
`ios-unsigned-3`, where the `3` is just there to make the tag unique.

**Every release needs a version higher than the last one.** Apple refuses to
accept a version it has already seen, and only says so at the very end of an
upload, after a full build. If you are not sure what has been used, ask on the
Mac side for `bundle exec fastlane ios_status`, or look at the App Store Connect
listing.

The build number — the part after the `+` in `pubspec.yaml` — takes care of
itself. You never set it.

### Tag names are used once

If a run fails and you want to retry the same version, you cannot reuse the tag.
Delete it and push it again:

```bash
git push --delete origin ios-testflight-1.0.4
git tag -d ios-testflight-1.0.4
git tag ios-testflight-1.0.4
git push origin ios-testflight-1.0.4
```

---

## Watching a run

With the GitHub CLI:

```bash
gh run watch --repo Iam-Muslim/Natlu
```

Or list recent runs:

```bash
gh run list --repo Iam-Muslim/Natlu --workflow 06_deploy_ios.yml
```

Without it, the Actions tab of the repository shows the same thing, under
**06 - Deploy iOS (signed)**.

Only one release runs at a time. Push a second tag while one is going and it
waits its turn rather than colliding.

---

## The usual sequence

```
ios-testflight-X.Y.Z
        ↓            Apple processes the build (5-30 min). Internal
                     testers can install it as soon as that finishes.
ios-external-X.Y.Z
        ↓            Apple beta review — about a day the first time a
                     group sees a build, then quick after that.
ios-appstore-X.Y.Z   App Store review.
```

Only the first step builds anything. The rest act on the app already sitting on
TestFlight, so they finish in a couple of minutes.

You can stop after the first step. Internal testers get every build
automatically; `ios-external-*` is only needed for testers outside the team.

---

## When something fails

The run goes red and nothing reaches Apple — a failed run cannot half-publish.

```bash
gh run view --repo Iam-Muslim/Natlu --log-failed
```

That prints the failing step. On a build failure the detailed Xcode and fastlane
logs are also attached to the run as an artefact named `fastlane-logs`, kept for
seven days.

Things that are your side, and fixable from Windows:

- **"already exists on App Store Connect"** — the version has been used. Pick a
  higher one and push a new tag.
- **"Unknown action"** — the tag is misspelt. It must be exactly `ios-unsigned-`,
  `ios-testflight-`, `ios-internal-`, `ios-external-` or `ios-appstore-`.
- **The app fails to compile** — a code problem, not a pipeline problem. The log
  names the file and line.

Things that need someone with the Mac:

- **A signing or certificate error.** The CI certificate and the provisioning
  profile both expire on **2027-08-29**. Renewing them means running
  `fastlane make_ci_cert` on the Mac and updating the repository secrets.
- **"metadata file(s) still contain placeholder text"** on `ios-appstore-*` —
  the App Store listing has not been filled in yet. See
  [IOS_DEPLOYMENT.md](IOS_DEPLOYMENT.md#app-store-metadata).

---

## What you cannot do from here

- **Add screenshots.** Apple requires them for App Store submission, and they
  are managed in App Store Connect, not in this repo.
- **Fill in the listing text.** Same place. `ios-appstore-*` refuses to run
  until it is complete, which is deliberate — placeholder text on a live App
  Store page is worse than a failed run.
- **Change the signing setup.** That is a one-time Mac job and it is already
  done.

---

## If you prefer buttons

The workflow can also be started from the repository's **Actions** tab →
**06 - Deploy iOS (signed)** → **Run workflow**, choosing the action from a
dropdown and optionally typing a version. It does exactly the same thing as a
tag. Tags are documented first because they need nothing but git.
