# Roadmap

- [x] Fix the shift-planner eraser so it remains selected and deletes cells by click or drag.
- [x] Custom temporary role in shift planner
- [x] Employee weekly availability (want to work / cannot) for next week
- [x] Planner notes per day (persist when switching days)

- [ ] Shifts: hide assignment controls from employees without can_manage_shifts (Adam Tuyailee sees scheduler tools)
- [ ] Availability: redesign employee shift availability to marking-based UI (less free text, more intent marking)
- [ ] Permissions: Adam Tuyailee (admin) sees shift scheduler despite can_manage_shifts=false — decide whether admins must also have the toggle
- [x] Custom role: clicking only the custom role opens label editing; other roles unchanged
- [x] Availability card: hide from /shifts for managers, show only on /availability
- [x] Day lock toggle in shift planner; locked days' shifts appear in calendar
- [ ] Export full project package (code, design, DB schema, relations, permissions) as ZIP for Claude to replicate in ERP
