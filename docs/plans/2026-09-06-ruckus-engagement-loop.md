# Ruckus Engagement Loop Scope

## Product language

- `Rucked Up` means going out, drinking, partying, or otherwise getting fucked up.
- `Ricked Up` means romantic, flirty, horny, or chaotic clown energy.
- The app should imply these meanings through playful copy rather than adding explanatory onboarding or explicit notification text.
- Both statuses can create a mixed Ruckus. Neither status is treated as more important.

## Product loop

The core loop is:

1. One member posts a status.
2. The group sees that one more person will start a Ruckus.
3. A second distinct member joins within five minutes.
4. The app creates a group-level Ruckus event.
5. Members react, answer a roll call, and optionally coordinate.
6. The group receives a lightweight recap rather than an endless content feed.

The primary engagement metric is the percentage of first status events that lead to a second distinct member posting within five minutes.

## Phase 0: Two-person Ruckus threshold

### Trigger

- Two distinct members post `rucked` or `ricked` within a rolling five-minute window.
- Mixed and matching statuses both qualify.
- Only each member's latest status in the window determines whether the burst is uniform or mixed.
- Repeated events from one member count once.
- The second member is recorded as the closer.

### Dedupe

- Create exactly one Ruckus when the group crosses from fewer than two qualifying members to two or more.
- Additional posts in the same active window do not create duplicate Ruckus events.
- A later burst can trigger only after the rolling window drops below two and crosses the threshold again.
- Serialize evaluation per group to prevent simultaneous second posts from creating duplicates.

### Surfaces

- Continue sending direct status pushes according to each member's notification mode.
- Send the Ruckus summary to eligible members except the closer.
- Add the existing group-level Ruckus card to the feed.
- Start the existing roll call for the new Ruckus.

### Acceptance criteria

- The first distinct status does not create a Ruckus.
- The second distinct status inside five minutes creates one Ruckus.
- Two events from the same member do not create a Ruckus.
- A third member does not create a duplicate Ruckus.
- Mixed `rucked` and `ricked` events create a Ruckus.
- Muted members receive neither catalytic nor Ruckus pushes.

## Phase 1: "One more starts it" catalytic notification

- Send only after the first distinct status in an otherwise quiet five-minute window.
- Suggested title: `[First name] is [rucked/ricked] up`.
- Suggested body: `One more roo starts a Ruckus.`
- Tap opens the group with the primary status actions visible.
- A future notification action can support one-tap pile-on after authentication and accidental-tap handling are strong enough.
- Do not send the catalytic push to the original poster, muted members, or members configured for Ruckus-only notifications.
- Cancel or suppress stale catalytic notifications when the first status ages out.

## Phase 2: Reaction notifications with aggregation

- Keep the curated set: `⚡`, `🔥`, `🍻`, `🫡`, `💀`.
- One reaction per member per target; changing emoji replaces the prior reaction and tapping the selected emoji removes it.
- Notify the original status poster, never the reacting member.
- Deliver the first reaction immediately.
- Aggregate additional reactions arriving within 60 seconds into one push.
- Suggested aggregate body: `[Name] and 3 others reacted 💀`.
- Notification taps deep-link to the target feed card.
- Respect mute settings and a future reaction-notification preference.
- Store delivery state so retries cannot create duplicate pushes.

## Phase 3: Funny rotating notification copy

- Use curated copy families selected deterministically from the event ID so retries keep the same wording.
- Maintain separate copy for `rucked`, `ricked`, mixed Ruckus, and same-status Ruckus events.
- Keep names and group names prominent; humor should never hide what happened.
- Avoid explicit sexual language in push notifications. The in-app voice can be bolder.
- Examples:
  - `This is developing.`
  - `The group chat has escaped containment.`
  - `Two roos have made a series of choices.`
  - `Romantic judgment is now offline.`
  - `Outside behavior detected.`
- Add a remote kill switch or server-side fallback before expanding the copy library.

## Phase 4: Ruckus feed card and roll call

- The card shows the closer, participant count, status mix, timestamp, reactions, and group streak.
- The roll call remains one tap and expires with the active Ruckus.
- Initial answers:
  - `En route`
  - `Maybe / convince me`
  - `Dead / not happening`
- Rotating display copy can make these clownier without changing the stored response values.
- The card should offer share and invite actions without exposing private member details outside the group.

## Follow-up: Ephemeral location sharing

Location is a coordination layer after someone answers `En route`; it is never part of posting a status by default.

### Consent and visibility

- Ask each member to share location for this Ruckus only.
- Default duration is two hours, capped by the Ruckus expiration.
- Show a persistent in-app indicator while sharing.
- Allow one-tap stop sharing at any time.
- Do not retain location history after expiration.
- Do not request background or always-on access in V1.
- Only current group members participating in the Ruckus can view shared locations.

### Experience

- `En route` reveals an optional `Share my location` action.
- The group sees a temporary map with opted-in participants.
- If two opted-in participants are within a conservative proximity radius, the app may show `[Name] and [Name] are in a Ruckus together`.
- Proximity notifications should not expose an address or precise coordinates.
- Users can share an approximate meetup pin instead of live location.

### Guardrails

- No automatic sharing based on status, roll-call response, or prior consent.
- No public links to the live map.
- Blocked or removed members immediately lose access.
- Rate-limit location updates and use coarse precision until the map is open.
- Run a dedicated privacy and abuse review before implementation.

## Delivery order

1. Two-person threshold and regression coverage.
2. Catalytic notification and conversion instrumentation.
3. Reaction notification delivery and aggregation.
4. Deterministic rotating copy.
5. Feed-card and roll-call polish.
6. Measure notification opt-outs and first-to-second conversion before beginning location work.
