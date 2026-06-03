## Problem

`ContactInboxSection` is only rendered inside `/admin/notifications`, but that route has no navigation link anywhere in the app. Admins cannot discover the contact inbox without knowing the URL.

## Fix

Add `ContactInboxSection` as a new tab in the admin dashboard sidebar so it is discoverable alongside other admin features.

### Files to change

1. **src/components/admin/dashboard/AdminSidebar.tsx**
   - Import `ContactInboxSection`
   - Add a new menu item to `adminMenuItems` array: `{ id: 'contact-inbox', label: 'Inbox', icon: Inbox, Component: ContactInboxSection }`

2. **src/components/admin/dashboard/AdminMobileNav.tsx**
   - Add `{ id: 'contact-inbox', label: 'Inbox', icon: Inbox }` to the `adminMenuItems` array
   - Add `'contact-inbox'` to the appropriate `tabGroups` entry (Teams & Players group, alongside `requests`)

### What stays the same

- The `/admin/notifications` route and `NotificationsAdmin` page remain untouched.
- No other admin tabs or routes are affected.