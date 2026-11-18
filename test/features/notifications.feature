@offline @core-runtime @form-workflows @notification-workflows
@covers:src/components/g3w-alerts.js
Feature: Project notifications in the local browser
  Real dialogs, popovers and local storage preserve message preferences.

  Scenario: Read preferences are shared with the notification manager
    Then project messages and their manager preserve read and unread preferences

  Scenario: Notification dialogs can be dragged and dismissed from the keyboard
    Then project message dragging respects interactive controls and Escape closes the dialog

  Scenario: The unread badge caps counts greater than ten
    Then eleven unread project messages keep a capped badge after dismissal
