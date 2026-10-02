# Usability test plan: farm managers

**Goal:** find out whether farm managers can run a day of irrigation and maintenance in IrrigaIQ
without help, and where they hesitate, before the India–Africa Tech Summit.

**Who:** 5 participants (five usually surface most of the serious problems):

- 3 farm or irrigation managers who plan irrigation today (spreadsheet, WhatsApp or memory);
- 1 maintenance lead or technician responsible for pumps and boreholes;
- 1 owner or agronomist who reviews water use and costs.

Mix of phone-first and laptop users; at least two who work in English as a second language.

**Format:** 45 minutes each, moderated, in person on the farm or by video. Web console on a laptop
for tasks 1 to 5; mobile app for task 6. Use the demo farm (Admin, Load the demo farm) so no one's
real data is at risk. Record the screen and audio with consent.

## Script

1. **Warm-up (5 min).** How do you decide today when and how long to irrigate? What goes wrong?
2. **First impression (2 min).** Open the Overview. "What would you do first today, and why?"
   _Success:_ names the Next up task or the AI insight without prompting.
3. **Plan irrigation (5 min).** "Block B needs water. Plan tonight's run."
   _Success:_ plans the recommended run from Irrigation or Overview in under 2 minutes; can say how
   long it will run and why.
4. **Log what happened (4 min).** "The run finished at 3 am. Record it."
   _Success:_ confirms the planned run, or logs it (including via ⌘K), with the right time.
5. **Act on a pump warning (6 min).** "Something is wrong with a pump. Find it and get it fixed."
   _Success:_ finds P-2 from Alerts or Infrastructure, understands why its health is low, and
   creates a work order.
6. **Report water use (5 min).** "Your owner asks how much water you saved this month and what
   pumping cost."
   _Success:_ reads saved volume, the change against last month and energy cost from Water.
7. **In the field, on the phone (6 min).** "You are at Block A. Record a soil check and see if it
   changes the plan."
   _Success:_ completes a soil check in the mobile app and finds the updated recommendation.
8. **Wrap-up (5 min).** What was confusing? What would you trust, and what would you double-check?
   Would you use this instead of what you do now?

## What to measure

- Task success (unaided, with a hint, failed) and time on task.
- Errors and dead ends: wrong screen, back-tracking, abandoned flows.
- Confidence after each task (1 to 5) and the reason.
- Single Ease Question per task; System Usability Scale at the end.
- Words participants use for things (do they say "refill point", "stress", "work order"?).

## Readout

Within two days: a one-page summary per task (success rate, time, top issues with severity and a
short clip), then a prioritised list of fixes. Re-test the two worst tasks after fixing them.
