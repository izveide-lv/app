# mattrbld (frontmatter + build)

Mattrbld is a headless CMS that stores content in Git. It can be used to manage
content for all types of projects, but it is especially useful for Jamstack
websites. It supports a realtime preview of the content being edited, as well as
support for multi-language content. It is not, however, a complete solution to
build websites, as it only focusses on content, which at the moment can be
stored as JSON or Markdown + YAML frontmatter. You can learn more about the
benefits and current limitations of the project on the
[official website](https://mattrbld.com).

![Screenshot of the dashboard of the Mattrbld website displayed within Mattrbld, stylised to show both the light and dark theme. The Dashboard consists of a sidebar with various locations such as “Pages”, “Blog” and “Media Library” and a central area with the options to check for updates, quick access to “Pages” and “Blog” collections, a section for news and announcements and recent updates](/public/img/screenshots/screenshot-light-dark.webp)

What distinguishes Mattrbld from other similar projects is that it runs as much
on the client-side as possible. It also uses the standard Git protocol instead
of proprietary APIs and thus should work with almost all Git servers and
providers. In fact, there is no backend logic in Mattrbld at all, it’s a static
application itself, meaning that it works fully offline until you need to
synchronise changes back to a central Git repository.

It’s built with [Vue.js](https://vuejs.org) and uses [Isomorphic Git](https://isomorphic-git.org) for the Git integration. Mattrbld was initially developed as
part of a BA in communication design at UAS Munich by [Amadeus](https://amxmln.com).
Due to those heavy time constraints, the code is not as clean as it should be
and for the time being, there are no automated tests.

The name is derived from the terms “Frontmatter” and “Build”, as it can be used
— among other things — to manage the frontmatter of Markdown files commonly seen
in Jamstack websites.

If you just want to use Mattrbld and not contribute to its development, take a
look at the [Quickstart Guide](https://mattrbld.com/docs/quickstart/) and have
fun trying out the official instance at
[app.mattrbld.com](https://app.mattrbld.com)!

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Preview the production build
```
npm run preview
```

### Run a local CORS-proxy on port 9999 for testing and development
```
npm run proxy
```

## Technical Documentation

You can learn more about all the concepts and functions of Mattrbld in the official
documentation which is being managed through Mattrbld itself as a testing ground.
You can find it [here](https://mattrbld.com/docs/).

## Contributing

If you wish to report a bug, request a feature, or contribute code or something
else to the project, please see [our contributing guidelines](./CONTRIBUTING.md)
for more information on how to do so.

## Built on the Shoulders of Giants

This project wouldn’t be possible without the absolutely amazing frameworks
and libraries out there. You can find all the dependencies in `package.json`.
Other code that was taken from open-source projects is highlighted as such in a
comment near the code. Here is a non-exhaustive selection:

* [Vite](https://vitejs.dev): the tool that powers the build and development
  experience
* [Vue.js](https://vuejs.org) & related libraries: the UI framework powering
  everything you see and  interact with
* [Isomorphic Git](https://isomorphic-git.org): the library that brings the
  powers of Git into the browser
* [Prosemirror](https://prosemirror.net) & all its modules: the library that
  powers rich-text editors
* [MarkdownIt](https://github.com/markdown-it/markdown-it) &
  [Turndown](https://github.com/mixmark-io/turndown): which turn Markdown to
  HTML and back again
* [Slugify](https://github.com/sindresorhus/slugify): dealing with all sorts of
  user input that needs to be URL-safe
* [DateFns](https://date-fns.org): for making it easier to work with dates and
  times

## Licence

Copyright (C) 2024 Amadeus Maximilian Stadler and Mattrbld Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
