# Mattrbld Contributing Guide

Welcome! We’re thrilled that you are considering a contribution to Mattrbld.
Before you do, please make sure to read through this document as well as our
[Code of Conduct](./CODE_OF_CONDUCT.md) to ensure you know what kinds of
contributions you can make and how to go about it.

## What kind of project is Mattrbld?

I (Amadeus) am developing Mattrbld mostly in my free time. It is a project that
is very near and dear to me, but it is also only one of many of my projects,
which is why the pace of development, as well as working on issues and checking
merge requests might take longer than in other projects. Please be respectful of
that.

Nonetheless, I’ll try my best to get back to you as soon as possible if you
create an issue or a merge request (also known as a “pull request”).

### Vision

Mattrbld aims to be a content management system (CMS) that makes it easy for
non-technical people to work on content, but keeps designers and developers in
control. This means that certain features and especially the initial setup of a
project aren’t geared towards non-technical people.

Typically, a developer will set up a Mattrbld project for non-technical content
editors to then work on. This has multiple benefits:

* Content editors don’t have to worry about technical questions
* Content editors don’t have to worry about breaking the design or anything else
  while working on content
* Designers can rest assured that their vision for a project is maintained
* Developers can rest assured that the data content editors work on will be in
  the shape they have defined in Schemas

Because of this split between being powerful for technical people and
uncomplicated for non-technical people, Mattrbld doesn’t try to compete with
more visual CMSs or what-you-see-is-what-you-get (WYSIWYG) site-builders.

Additionally, while websites are a primary use-case for Mattrbld, it is not
exclusively built for that purpose. It is meant to be a flexible CMS for all
sorts of structured content.

In general, Mattrbld (and its source code) aim to be lean and simple, thoughtful
and intuitive. Please keep this vision in mind when you are making contributions
and suggesting new features.

## Kinds of Contributions

You can contribute to Mattrbld in many different ways, even if you’re not a
developer.

### Reporting Bugs

Mattrbld is complex and very flexible, which means bugs and unforeseen issues
will come up as more and more people use it for different purposes and on
different devices. If you come across something that doesn’t work right or seems
off, don’t hesitate to report this behaviour.

To do so, head over to the
[list of open issues](https://gitlab.com/mattrbld/mattrbld/-/issues). Once
there, you should first use the search function to see if the issue was already
reported by someone else. If it was not, you may create a new one, otherwise,
feel free to add additional context by replying in the existing issue.

The **title** of the new issue should be a very concise description of the
problem you’re facing. For the **description**, we have prepared a template that
should help guide you through all the information we need to properly address
the issue. To apply the template, please select it from the dropdown above the
text area for the description.

If you can, please link to a stripped-down example repository exhibiting the
problematic behaviour and provide detailed steps to reproduce the issue. This
would be of tremendous help to get to the cause of it.

### Reporting Issues with the Documentation

Mattrbld is [fully documented](https://mattrbld.com/docs), however there may be
outdated information, hard to understand language, or the odd typo in that
documentation. Should you come across such an issue, you may report it the same
way as you do bugs with the software itself.

You may use the default description template for bugs regarding the
documentation, but please add the “documentation” label to it, so it can be more
easily categorised.

### Requesting Features

While the scope of Mattrbld is limited and the current focus of development is
on working on the currently planned features and fixing existing issues, you may
still request features that would make Mattrbld more useful to you.

To do so, open the
[list of open issues](https://gitlab.com/mattrbld/mattrbld/-/issues) like you
would when reporting a bug and use the search function to see if someone else
already requested the feature. If it hasn’t been requested yet, you may create
a new issue for your request.

Like with bug reports, there is a special template for feature requests that you
can select from the dropdown menu above the description text area. This template
should help guide you through requesting the feature and apply the “feature
request” label automatically.

### Opening a Merge Request

If you are a developer, you may, of course, contribute code directly to fix an
open issue or add a new feature. To do so, please create a fork of the software
and add a new branch based on the current `main` branch. The name of the branch
should be prefixed with `fix/` or `feat/` depending on whether you’re working on
a fix or a feature.

Once you have written your code and committed it to your branch, you may open a
[merge request](https://gitlab.com/mattrbld/mattrbld/-/merge_requests)
(also known as a pull request on other Git providers) to merge your branch back
into the Mattrbld code. Before doing so, please ensure that you rebased you
branch to the tip of the current `main` branch.

Your code will be reviewed and merged if it is deemed a good fit for the
project, but please respect that we cannot accept all kinds of contributions, so
it might be wise to create an issue first to discuss a new feature before
putting effort into code. Please also follow the Airbnb style guide for any
JavaScript code and try to match the style of the existing codebase for Vue and
SCSS files.

When contributing code, **please ensure that you have the right to contribute
that code**, as it will be licensed under the AGPL 3.0 like all the other
code in Mattrbld after the merge. This also means that **we cannot accept code
written by large language models or other “AI” tools.**

If you wish, you may include yourself in the “Credits” section of this document
as part of your merge request.

## Development Setup

If you plan on working with the Mattrbld code, you will need a recent version of
[Node.js](https://nodejs.org/en) (v20+). Once that is installed and you have
cloned the Mattrbld source code to your development setup, you need to install
the project’s dependencies by running `npm install` from the root folder.

After the dependencies are installed, you can start the development server by
running `npm run dev`. The development server will run on port 8080, so you can
point your browser of choice to `http://localhost:8080` to open your local copy
of Mattrbld.

In dev mode, Mattrbld defaults to a local
[CORS-Proxy](https://mattrbld.com/docs/cors-proxy/) on port 9999 for new
projects. You can either start that proxy with `npm run proxy` or change the URL
from the Onboarding screen under “Advanced Settings”.

In addition to being able to test features locally, you can also open an overlay
which documents many of the user interface components Mattrbld is built from.
To open the overlay, use <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>C</kbd> on
Windows or Linux, or <kbd>Ctrl</kbd> + <kbd>Option</kbd> + <kbd>C</kbd> on macOS.

If you would like to test how the app behaves in production, first build your
local version with `npm run build` and then start a preview server with
`npm run preview`.

## Credits

Thank you to all the people who have already contributed to Mattrbld!

- [Amadeus Maximilian](https://amxmln.com)
