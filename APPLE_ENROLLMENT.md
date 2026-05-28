# Apple Developer Program Enrollment — Step-by-Step

This is the **only** thing standing between you and TestFlight. Plan for 1–2 days because Apple verifies your identity.

---

## Before you start, have ready

- A valid **credit card** (charged $99 USD now, then yearly)
- A **government-issued ID** (passport / national ID — Apple may ask)
- Your **Apple ID** with 2-factor auth enabled (if not, enable at https://appleid.apple.com first)
- **30 minutes** of uninterrupted time
- Your **iPhone** nearby for 2FA codes

---

## Step 1 — Open the enrollment page

Go to **https://developer.apple.com/programs/enroll/**

Click the blue **"Start Your Enrollment"** button.

---

## Step 2 — Sign in with your Apple ID

Use the same Apple ID you use for your iPhone. You'll get a 2FA code on your phone — enter it.

---

## Step 3 — Choose entity type

Apple asks: "Are you enrolling as an Individual or as a Company?"

**Choose "Individual / Sole Proprietor"** unless you have a registered company with a D-U-N-S number. Individual is faster (usually approved in hours instead of days/weeks).

---

## Step 4 — Verify your name and address

Apple shows the legal name on your Apple ID. **This MUST match your government ID exactly** — middle initials, accent marks, everything.

- If it does → click Continue
- If it doesn't → fix it first at https://appleid.apple.com (change your "legal name") then come back

Apple also asks for:
- Country / region
- Phone number (must accept SMS)
- Mailing address (used for tax forms; must be real)

---

## Step 5 — Accept the Apple Developer Agreement

Read it (or scroll to the bottom). Tick the checkbox. Click Continue.

---

## Step 6 — Pay the $99 USD

Enter your credit card. Apple charges **$99 USD per year**, billed today and again every year on this date.

You'll see a confirmation screen with an order number — **screenshot it**.

---

## Step 7 — Wait for approval

Most individual enrollments are approved within **a few hours**. Some take 24–48 hours. Apple emails you when ready.

You can check status at: **https://developer.apple.com/account/**

When approved, you'll see "Membership Status: **Active**" on that page.

---

## Step 8 — Find your Team ID (do this when active)

Once active:

1. Go to **https://developer.apple.com/account/**
2. Scroll to the "Membership details" section
3. Find **"Team ID"** — a 10-character string like `A1B2C3D4E5`
4. **Copy this and send it to me** — I'll wire it into `eas.json`

---

## Step 9 — Register your bundle ID

1. Go to **https://developer.apple.com/account/resources/identifiers/list**
2. Click the blue **"+"** button
3. Pick **App IDs** → Continue
4. Pick **App** → Continue
5. **Description:** Number Hunting
6. **Bundle ID:** Explicit → `com.numberhunting.app`
7. **Capabilities:** scroll down and check:
   - Push Notifications (uncheck if you don't want them — currently not used)
   - Sign In with Apple (uncheck — not used)
   - Leave everything else default
8. Click Continue → Register

---

## Step 10 — Create the App Store Connect entry

1. Go to **https://appstoreconnect.apple.com**
2. Click **My Apps**
3. Click the blue **"+"** → **New App**
4. Fill in:
   - **Platforms:** iOS
   - **Name:** Number Hunting
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** select `com.numberhunting.app` from the dropdown
   - **SKU:** `numberhunting-001` (any unique string)
   - **User Access:** Full Access
5. Click Create

You'll land on the app's dashboard. **Look at the URL** — it contains a number like `/apps/1234567890/…`. **That number is your App Store Connect App ID.** Copy it and send it to me.

---

## What to send me when done

Just reply with these two values:

```
Team ID: XXXXXXXXXX
ASC App ID: XXXXXXXXXX
```

I'll patch `eas.json` and give you the **exact 2 commands** to run on your laptop to build and submit. Expect ~30 minutes total (mostly waiting for the build).

---

## If anything fails

- **"Your Apple ID isn't eligible"** → Make sure 2FA is enabled at https://appleid.apple.com
- **"Payment declined"** → Try a different card; some prepaid cards don't work
- **"Identity verification needed"** → Apple may email you asking to upload a passport photo. Reply within 14 days or enrollment cancels.
- **Stuck for >48 hours** → Email apple-developer@apple.com with your order number

You're paying $99/year for the right to publish — once you're in, the same enrollment covers unlimited apps for the same year.
