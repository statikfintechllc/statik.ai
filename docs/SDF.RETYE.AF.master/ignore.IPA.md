## **sfti.ipa**
**Purpose:** iOS app package for sideloading (alternative to PWA)  
**Challenge:** IPAs require native iOS code, cannot be generated from pure web tech
**Alternatives:**

**Option 1: PWA Only (Recommended for MVP)**
- User installs via "Add to Home Screen"
- No .ipa needed
- Works immediately
- Limitations: No background processing (iOS restricts PWAs)

**Option 2: Generate .ipa via Capacitor/Cordova**
- Wrap web app in native shell
- Requires:
  - macOS with Xcode
  - Apple Developer account ($99/year)
  - Build process via Capacitor CLI
- **Process:**
  ```bash
  npx cap init StatikAI com.statik.ai
  npx cap add ios
  npx cap copy
  npx cap open ios
  # Build in Xcode, export .ipa
  ```
- Generated .ipa can be sideloaded via AltStore/Sideloadly
- **NOT auto-generated on device** (requires build server)

**Option 3: TestFlight Distribution**
- Upload to App Store Connect
- Beta distribution via TestFlight
- No .ipa sideloading needed
- Requires Apple Developer account

**Recommended approach:**
- MVP: PWA only
- v0.2: Capacitor wrapper if background processing needed
- Future: TestFlight beta for wider distribution

**If .ipa generation is critical:**
- Cannot be done client-side on iPhone
- Requires server-side build process (macOS + Xcode)
- Not feasible for "auto-generate every 30 min"
- Alternative: Generate .iso only, .ipa is manual build
