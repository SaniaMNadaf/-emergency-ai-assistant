# 3-Minute Demo Script & Rehearsal Guide

## Demo Setup (Before you start)
1. Open the web app on your laptop or phone.
2. Ensure you have the 4 demo accounts ready:
   - Bystander: `bystander@demo.com` / `demo1234`
   - Doctor: `doctor@demo.com` / `demo1234`
   - Family: `family@demo.com` / `demo1234`
   - Patient: `patient@demo.com` / `demo1234`

---

## 3-Minute Script

### Minute 0:00 - 0:45 | Offline-First & Bystander Emergency
- Log in as **Bystander**.
- Point out the **Online/Offline banner** at the top. Toggle airplane mode to show offline operation.
- Tap the huge red **EMERGENCY** button.
- Capture GPS location and attach a photo (corroboration rule).
- Tap **Confirm & Broadcast Emergency** → watch the status screen show alerted responders.

### Minute 0:45 - 1:45 | Voice-Assisted First-Aid Protocol (Airplane Mode)
- From the status screen or home, tap **CPR Protocol**.
- Demonstrate hands-free operation: listen to text-to-speech instructions read aloud.
- Use voice recognition (**"Answer by Voice"**) saying "Yes" or "No", or tap big buttons.
- Show that all steps work in airplane mode with no internet.

### Minute 1:45 - 2:30 | Doctor Response & Realtime Handshake
- Switch to a second phone or tab logged in as **Doctor**.
- Show the incoming emergency alert pop up in real time.
- Tap **Accept (10 min)**.
- Switch back to the Bystander phone — notice the status screen updates instantly showing Dr. Sarah Chen is 10 minutes away.

### Minute 2:30 - 3:00 | Family Consent & Demo Panel
- Log in as **Patient** → invite family member → view access logs.
- Log in as **Family** → view patient readings and live emergency status.
- Open the **Demo Control Panel** to show how judges can instantly trigger fake emergencies or reset demo data.

---

## What is Mocked?
- **Real SMS / Cellular Calls:** Replaced by Supabase Realtime web broadcasts and push notifications.
- **Real Doctor License Verification:** Replaced by seed accounts with pre-configured tier and specialty.
- **Outcome-Based Success Scoring:** Deliberately omitted to prevent perverse incentives; participation score measures responsiveness and response count only.
