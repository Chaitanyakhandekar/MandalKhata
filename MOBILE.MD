Improve the visual design of the ENTIRE existing application to make it look professional, polished, production-grade, and mobile-first. This is a UI/UX DESIGN ONLY task. DO NOT change any functionality, business logic, API calls, database logic, authentication, state management, routes, validation behavior, calculations, data structures, or existing workflows. Do not remove, rename, or disable any existing feature. The application must behave exactly as it does now; only the visual presentation and responsive UI should change.

First inspect the complete existing frontend and understand the current design system, reusable components, layouts, pages, forms, tables, cards, navigation, buttons, dropdowns, modals, dialogs, confirmation popups, alerts, toasts, loading states, empty states, error states, charts, filters, and all other UI elements. Then establish a consistent production-grade visual system and apply it throughout the entire application instead of redesigning individual pages inconsistently.

The design should feel like a real production SaaS/admin application: clean, modern, professional, trustworthy, refined, and visually consistent. Avoid excessive gradients, excessive rounded cards, flashy animations, unnecessary decorations, oversized typography, excessive shadows, or "AI-generated dashboard" aesthetics. Prioritize hierarchy, readability, spacing, consistency, usability, and information density. The application is a finance/management application, so the design should feel reliable and organized rather than playful.

Make the entire application MOBILE-FIRST. Design every screen starting from small mobile screens and progressively enhance it for tablets and desktop. The application must be extremely comfortable to use on 320px–430px mobile screens. Nothing should unintentionally overflow horizontally. Do not solve overflow problems by blindly applying overflow-hidden; fix the actual layout. Desktop should remain polished and spacious without making the mobile UI feel like a compressed desktop interface.

Create a consistent design system across the application. Standardize typography, font weights, heading hierarchy, text colors, muted text, borders, backgrounds, spacing, radii, shadows, buttons, inputs, selects, checkboxes, badges, icons, tables, cards, and interactive states. Reuse existing UI components where possible and improve the shared components so changes propagate consistently throughout the application. Do not create several slightly different versions of the same component.

Pay special attention to ALL POPUPS AND MODALS. Every Create, Update, Delete, View, Confirm, Edit, Add, Assign, Select, Import, Export, Filter, and other dialog must receive a professional redesign while preserving its existing functionality exactly.

Create dialogs should have a clean structure with a clear title, optional concise description, logically grouped form fields, consistent labels, appropriate spacing, clear primary and secondary actions, and a properly positioned close button. Forms inside dialogs should be comfortable on mobile and should use a single-column layout on small screens. On larger screens, use multiple columns only where it improves usability.

Update/Edit dialogs should use the same visual structure as Create dialogs so users immediately understand that they are editing an existing record. Clearly distinguish the primary Save/Update action from Cancel. Do not change which fields are editable or how the update works.

Delete dialogs must be visually clear and intentionally communicate that the action is destructive without becoming overly dramatic. Use a clean confirmation layout with the relevant record information, a clearly identifiable destructive action, and a safe Cancel action. Do not change the existing deletion behavior.

Confirmation dialogs should be concise and easy to understand. Do not overload them with unnecessary text. Make primary and secondary actions visually distinct.

On mobile, modals must never extend beyond the viewport. They should use appropriate horizontal margins and nearly full available width where necessary. Long forms should scroll vertically inside the modal without causing the entire page to overflow horizontally. Modal headers and action buttons must wrap correctly. Buttons should become stacked/full-width where appropriate on very small screens. Ensure close buttons remain accessible and touch-friendly.

Make all forms professional and consistent. Inputs, selects, textareas, date fields, number fields, search fields, file upload controls, checkboxes, radio buttons, and other controls should have consistent height, border radius, border treatment, focus state, label spacing, and typography. Make touch targets comfortable on mobile. Do not make inputs unnecessarily tall or visually bulky. Clearly distinguish focused, disabled, error, and read-only states. Preserve all existing validation behavior and error messages.

Improve all buttons. Establish consistent primary, secondary, outline, ghost, destructive, and icon-button styles. Buttons must have clear hover, active, focus, disabled, and loading states. On mobile, buttons must remain easy to tap and must not overflow their containers. Button groups should wrap or stack when necessary. Do not change button functionality or event handlers.

Improve tables throughout the application. Tables should look professional and readable on desktop. On mobile, do not force a huge desktop table into a tiny screen. Where appropriate, transform table rows into mobile-friendly cards/list items. Where a table genuinely needs horizontal scrolling, restrict horizontal scrolling to the table container rather than the entire page. Keep important information easily accessible. Improve row spacing, headers, status badges, action controls, alignment, and visual hierarchy without changing the underlying data or functionality.

Improve dashboard cards and statistics. Use a consistent card structure, sensible padding, clear labels, strong but not oversized values, subtle supporting information, and consistent icon treatment. Make cards stack naturally on mobile and use responsive grids on larger screens. Avoid excessive empty space.

Improve navigation, sidebar, and navbar. Desktop navigation should remain professional and organized. On mobile, use a clean drawer/collapsible navigation pattern. Ensure the mobile header does not become overcrowded. Important actions must remain accessible. Do not change routes or navigation functionality.

Improve all pages including Dashboard, Buildings, Wings, Flats, Residents/Households, External Donors, Donations, Expenses, Payments, Reports, Ledger, Settings, authentication pages, and every other existing page. Do not focus only on the dashboard. Audit every route.

Improve loading states. Replace crude loading indicators with polished, consistent skeletons/spinners appropriate to the component while preserving existing loading behavior.

Improve empty states. When there is no data, provide a clean visual hierarchy with a concise message and the existing relevant action where applicable. Do not change the underlying behavior.

Improve error states and alerts. Make API errors, validation errors, warnings, and success messages visually consistent and easy to understand. Preserve the existing messages and behavior unless only minor visual formatting is required.

Improve badges and status indicators. Paid, unpaid, pending, active, inactive, resident, external donor, etc. should have consistent visual treatment. Do not rely solely on color to communicate meaning.

Improve search and filter interfaces. Desktop filter bars should be clean and compact. On mobile, filters should stack or use a responsive filter panel/drawer where appropriate. Preserve all existing filtering functionality.

Improve charts and analytics visually. Make them responsive and clean. Charts must never overflow on mobile. Preserve all existing chart data and behavior.

Improve spacing throughout the application. Remove inconsistent margins, excessive whitespace, cramped sections, and arbitrary spacing differences. Establish a consistent spacing rhythm. Mobile should use tighter but still comfortable spacing; desktop can progressively increase spacing.

Improve typography. Establish a clear hierarchy for page titles, section headings, card titles, labels, body text, supporting text, table text, and metadata. Avoid excessive font-weight variations. Ensure text remains readable on mobile.

Use subtle visual depth. Prefer clean borders and restrained shadows over heavy shadows. Use consistent corner radius rather than applying random rounded values to different components.

Use icons consistently. Reuse the existing icon library if one exists. Do not introduce random icon styles or emojis. Icon-only controls must have accessible labels/tooltips where appropriate and sufficiently large touch targets.

Make all UI responsive at approximately 320px, 360px, 375px, 390px, 414px, 430px, 768px, 1024px, 1280px, and larger desktop widths. Do not optimize for only one mobile size.

IMPORTANT: Do not change functionality. Do not modify API endpoints, API request/response structures, backend code, database schemas, authentication, state logic, hooks, business rules, calculations, or existing feature behavior. Do not replace existing functionality with mock data or placeholders. Do not remove functionality because it is difficult to make responsive. Only modify frontend presentation, styling, layout, component composition where necessary for responsive presentation, and purely visual UI behavior.

Before modifying each shared component, understand where it is used so that improving it does not unintentionally break another page. Prefer improving shared components over duplicating styles. Keep the existing project architecture and folder structure.

After implementation, perform a complete visual audit of the entire application. Check every page and every popup/modal in both desktop and mobile layouts. Specifically test Create, Update, Delete, View, Confirmation, Filter, Search, Assign Household, Resident, External Donor, Donation, Expense, Payment, Report, and any other existing dialogs. Verify that no modal, dropdown, table, card, form, button, text, chart, or navigation element overflows the viewport.

The final result should look like a cohesive production-grade application built by a professional UI/UX team, not a collection of individually styled pages. The application should be especially polished on mobile because mobile is the primary design constraint. Preserve 100% of the existing functionality while substantially improving the visual quality, consistency, responsiveness, usability, and professional appearance of the entire application.