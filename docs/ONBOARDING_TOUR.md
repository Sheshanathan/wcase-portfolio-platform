# Dashboard onboarding tour

The displayed tour wording, target selectors, and preferred card positions all live in one editable document:

`frontend/src/content/dashboard-tour.json`

## Edit tour wording

Change only the `title` or `description` value for the relevant step. Keep valid JSON: use double quotes and leave a comma between items. No component code needs to change for wording updates.

## Move a tour card to another control

Each dashboard control used by the tour has a stable `data-tour-id` attribute. Set a step's `target` to that selector, for example:

`[data-tour-id='portfolio-setup']`

The supported preferred positions are `top`, `right`, `bottom`, and `left`. The card automatically chooses another side when the preferred side does not fit the screen.

## Add or reorder steps

Add or reorder objects inside the `steps` array. Every step requires a unique `id`, a valid `target`, a supported `placement`, a `title`, and a `description`.

## Account behaviour

- Only accounts registered after this feature was deployed are marked as needing the tour.
- Finishing or skipping records completion on that user's database account, so logging out, changing browsers, or using a private window does not show it again.
- Existing accounts are left unchanged and do not receive the tour automatically.
- An authenticated user can preview the tour without changing this rule by opening `/dashboard?tour=1`.

Run `npm run lint`, `npm test`, and `npm run build` in `frontend` after an edit.
