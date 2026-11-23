source "https://rubygems.org"

# fastlane needs Ruby 3+ (use the Homebrew Ruby, not macOS's built-in 2.6):
#   PATH="/opt/homebrew/opt/ruby/bin:$PATH" bundle exec fastlane ...
gem "fastlane", "~> 2.236"

# CocoaPods belongs in the bundle so that `pod`, which `flutter build ipa`
# invokes for us, resolves against the same gems fastlane is running under.
# Without it, `bundle exec` on CI points GEM_HOME at the vendored bundle while
# `pod` on PATH belongs to the runner's Ruby, and the build dies with
# "CocoaPods is installed but broken".
gem "cocoapods", "~> 1.16"
