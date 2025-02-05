---
currentVersion: 1.1.0
updatedAt: 2025-01-18
---
## Version 1.1.1

### Other Changes

* “Full Name” labels throughout the UI have been shortened to just “Name” to
  better reflect the fact that a username can be anything
* User avatars can now consist of just a single letter if only a first name or
  pseudonym are used as a username
* The link to the Quickstart Guide now shows earlier in the onboarding process

## Version 1.1.0

### New Features

* Allow `width`, `height`, `loading`, and `decoding` values to be passed as
  non-data attributes to images inserted into rich-text fields

### Bugfixes

* The “Refresh to update” notification will only be shown once, even if there
  have been multiple updates since it was last shown
* Using the shortcut ⌘ / Ctrl + Shift + S to enable strikethrough formatting in
  rich text fields no longer also saves the content item you are editing

## Version 1.0.2

### Bugfixes

* Ensure the name in the PWA manifest is set to “Mattrbld” with a capital ‘M’
* Include a .htaccess file which always redirects to index.html for virutal routing

## Version 1.0.1

### New Features

* Mattrbld is using a faster way to extract colours from images
* The custom and default sections of the Project Sidebar have been merged, you
  can now customise and rearrange the Dashboard, Media Library, and Settings
  options. Please note that for projects initialised pre-v1.0, you will have to
  manually add the new entries to the sidebar by editing the `config.json` file
  in your `.mattrbld` directory in a text editor if you want to customise them.
* You can now add separator lines to the Project Sidebar
* The error message in the sync modal is now selectable
* You can now simply highlight one or more words and paste a URL to format that
  selection as a link
* You can now save content, Schemas and custom fields by pressing ⌘ / Ctrl + S
* You can now duplicate Schemas, Collections and custom fields in the project
  settings
* There are more links to the documentation placed in key areas of the UI, for
  example a link to the authentication documentation in the authentication modal
  or a link to the quickstart guide when importing a project for the very first
  time

### Bugfixes

* Setting the `preserveTrailingDash` and `preserveCharacters` options in the
  slugify options of a project now works correctly

### Other Changes

* User names are no longer required to contain a space character
* You can no longer use ⌘ / Ctrl + S to enable the strikethrough format in rich
  text editors, use ⌘ / Ctrl + Shift + S instead
* Umami 2.0 is now supported for collecting basic analytics
* There is now a button for inserting hard line breaks in rich text editors
  which have them enabled, making the feature more discoverable

## Version 0.7.1 Beta

### Bugfixes

* Disabling Smartquotes for rich text fields outputting Markdown will
  no longer cause the editor to crash

## Version 0.7.0 Beta

### New Features

* Link, File, Image and Column fields now show the full file name when
  hovering
* Folders and thumbnails in the file browser now also show the full file
  name when hovering
* The "Prevent double spaces" option for rich text editors no longer
  gets undone when pressing backspace

### Bugfixes

* Files should now be marked as locally changed more reliably
* Dashboard cards for projects still having static project IDs for sidebar
  entries should no longer lead to unexpected behaviours (404 or Access
  Denied screens)

## Version 0.6.0 Beta

### New Features

* There is a new Collection type: Media Collections. They allow users to
  upload media files into dedicated Collections outside the Media Library
  and allow for making these files linkable through link fields. You can
  learn more about the feature in the [official documentation](https://mattrbld.com/docs/media-collections/)

### Other Changes

* File and Image fields no longer have a maximum file size set by default
  since it is usually preferable to use the maximum file size set in the
  Media Library settings

### Bugfixes

* The skeletons of deleted projects will no longer show up again right
  after their deletion
* The project thumbnail of a project is now correctly re-fetched if the
  deletion of a project is undone
* Files uploaded through the file field will now be slugified correctly

## Version 0.5.0 Beta

### New Features

* Uploading a profile image with transparency now uses a background colour
  matching your current theme instead of black
* It’s now possible to add new fields to a Schema by right-clicking another
  field, which makes working on Schemas with many fields more comfortable

### Bugfixes

* Fixed a bug that caused a crash when opening a content item that had an
  unallowed Schema assigned to it
* Content will no longer immediately be validated as soon as a Content
  Languages field is present
* Localised fields will no longer look broken when only one content language
  is active
* Tag fields with complex models will now work more reliably

## Version 0.4.0 Beta

### New Features

* If tracking with Umami is enabled, Mattrbld tracks events using the new syntax
  introduced in Umami 1.37.0
* There are now new UI scaling options for 75%, 87% and 112% to provide finer
  scaling control on certain sceens, mapping to even font sizes at 12, 14 and 18px
* When generating a Schema from existing content, internal fields that might be
  present will be ignored by default, unless it is a repeating field. In that case
  information in `___mb_type` will be used to generate more accurate keys for the
  repeating elements
* It is now possible to disable previews for specific Collections in the Collection
  settings
* It is now possible to change the `preserveTrailingDash` and `preserveCharacters`
  Slugify options in the General Settings
* Content items, Schemas and Custom Fields now show a tooltip with the full title
  when hovered
* While on medium sized screens, the Settings, Preview and Save buttons in editors
  now show a tooltip with the label that would be visible on a larger screen
* It is now possible to add comments to the real-time content previews, you can
  learn more about this feature in the [official documentation](https://mattrbld.com/docs/preview-features/comments/)

### Bugfixes

* Fixed an issue caused by `.gitkeep` files in folders that have their content
  automatically parsed
* Group fields without editable content now show a message informing about that
  in content editors
* Fixed an issue where the active languages for a piece of content weren’t being
  accurately detected
* Fixed an issue that caused wrong selections after inserting an image into a
  rich text field

## Version 0.3.0 Beta

### New Features

* You can now sync selected changes right after entering a message by pressing
  `Ctrl` + `Enter` while the input field is still focussed
* You can now manually pull in the latest remote changes when no local changes
  are selected for sync in the changes modal
* It is now possible to create folders when uploading media while editing content
* If the Live Preview is open in a new tab or window, this tab or window will now
  be closed when the content item being edited is closed
* It is now possible to specify a global maximum file size for the Media Library.
  If specified, users will not be able to upload files with a size greater than
  the one specified. This value can be overwritten on a per-field basis
* File fields were upgraded to allow enabling uploads straight from the file picker.
  **Users will no longer be able to upload unless the field is upgraded and the new option enabled**
* Localised fields will no longer be grouped if the content item has only one
  language enabled
* Adding images to rich text editors is now supported

### Bugfixes

* When modifying the Advanced Media Library Schema, nested and image fields are
  now properly handled during validation
* Newly uploaded media files will now have their names slugified according to the
  slugify settings of the project
* Folders created in the Media Library will now be properly slugified according
  to the slugify settings of the project
* The empty state message when there are no local changes to be synced is now readable
  in dark mode
* The project is now reloaded after discarding changes to the project configuration
  in order to restore the original configuration without having to refresh the page
* The warning messages on input fields should now be more legible
* The `url` property sent to the live preview is now always the final URL, even
  when the content is still marked as a draft
* ID Fields using a `type` of `filepath` will now correctly reflect the path of
  the file within the project, not within Mattrbld. Additionally, the path will
  always reflect the **final** path of the file, even when it is a draft
* Image fields with resolution hints that don’t contain a number will no longer break
* Creating new folders now always adds a `.gitkeep` file in that folder to ensure it's synced.
  This fixes the issue that a folder only containing drafts wasn't visible on other
  devices until it was created there

## Version 0.2.0 Alpha

### New Features

* It is now possible to filter the available options in repeating fields if there
  are more than six

### Bugfixes

* You can now add tel and mailto URLs to Link-fields without causing validation errors
* The linking helper in text editors and Link-fields is now better at determining
  whether a value is an internal or external link
* Any open field groups are now properly closed when the preview is activated
* Users will now be prompted to install Mattrbld only once

## Version 0.1.7 Alpha

### Bugfixes

* Fixed template-based ID generation when a Schema is assigned to a piece of content
* Removed hard-coded references to project IDs to avoid issues with importing
  pre-configured projects
* Ensured that the first user of a project is always set as its owner, even if
  the project was pre-configured

## Version 0.1.6 Alpha

### Bugfixes

* Fixed an issue that prevented saving content with fields in a tab grouped under
  a specific key
* Fixed an issue that could prevent the generation of a Schema from an existing
  file when some nested fields were set to be ignored

## Version 0.1.5 Alpha

### Bugfixes

* Fixed the URL validation of Link fields so simple hashes (e.g. #about-us) are
  recognised as valid URLs

## Version 0.1.4 Alpha

### Bugfixes

* Fixed an issue with top-level container fields in tabs that are grouped as
  objects under a key
* Fixed an issue that was causing duplicated news after a refresh in the News
  and Announcements section

## Version 0.1.3 Alpha

### Bugfixes

* Fixed the Chrome autofill issue (again)
* Ironed out some visual quirks

## Version 0.1.2 Alpha

### Bugfixes

* Fixed an issue where content using repeating fields that had collapsible
  fields as children could not be displayed correctly after having their type
  changed

## Version 0.1.1 Alpha

### Bugfixes

* Attempted to fix an issue where Chrome would autofill login details in unrelated
  input fields, it might not be fully working yet

## Version 0.1.0 Alpha

This is the initial alpha release of Mattrbld. Please note that this is a
pre-release and parts of the application may still change. If you encounter any
bugs, please report them [here](https://twitter.com/mattrbld) (until the
official issue tracker becomes available) and make sure to leave feedback and
feature requests while you’re there. Enjoy managing your content with Mattrbld!
😊
