ECLIPSE - App Exporter Package
================================
index.html          Complete app (required at zip root)
app-icon-1024.png   Master icon - use for App Store Connect
app-icon-512.png    512x512 icon for exporters
app-icon-180.png    180x180 home-screen size

App Name: Eclipse  |  Background: #08090C  |  Mode: Standalone  |  Orientation: Portrait

WHAT IS NEW IN THIS BUILD
---------------------------
Workout Timer (Dashboard):
  - Manual start / stop button on the dashboard
  - Live elapsed time in hh:mm:ss
  - Shows start time while running, start+end time when stopped
  - Warning text if session exceeds 90 minutes

Rest Timer (Dashboard + Log):
  - Rest timer card on dashboard with presets (1:00, 1:30, 2:00, 3:00) + custom seconds input
  - Floating pill in the Log screen still works and shares the same timer
  - Sound on/off toggle in Settings (Rest Timer section)
  - Both surfaces stay in sync - start from either, they share state

Goals System (Settings):
  - 7 goals: Build Muscle, Lose Fat, Get Stronger, Maintain, Improve Cardio, Rehab, General Health
  - Primary goal + unlimited secondary goals
  - Primary goal shown as a banner on the dashboard
  - Saved to device storage and included in backups

Consistency Stats (Dashboard):
  - Three-card row: Day Streak | This Week | This Month
  - Replaced the old unequal two-card layout with an even 3-column grid

Notes on features that need native app infrastructure:
  - Haptic feedback: blocked on iOS Safari by design, works on Android Chrome
  - Lock screen widget: requires native iOS WidgetKit
  - Offline mode: already works fully - the app is self-contained
  - Apple Health / Google Fit: require native app entitlements (UI placeholder in Settings)
  - Friends / social: requires a backend server
  - Notifications: iOS web apps cannot receive true push notifications (toggles in Settings clearly labeled)

INSTALL: Email eclipse.html to iPhone, open in Safari, Share -> Add to Home Screen
