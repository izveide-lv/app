<template>
  <div class="components">
    <header>
      <h1>Components</h1>
      <MbToggle v-model="darkMode" :dark="dark" :icons="['sun', 'moon']" />
    </header>
    <MbTabs v-model="activeTab" :dark="dark" :tabs="tabs" show-add-option @add-tab="addTab" />
    <transition mode="out-in">
      <section v-if="activeTabValue === 'toc'" class="tab toc" key="toc">
        <h2>Table of Contents</h2>
        <ul>
          <li v-for="(tab, index) in tabs" :key="index" @click="activeTab = index"><a href="#" @click.prevent>{{tab.label}}</a></li>
        </ul>
      </section>
      <section v-else-if="activeTabValue === 'design'" class="tab" key="design">
        <h2>Styles and Colors</h2>
        <div class="swatches">
          <div v-for="swatch in swatches" :key="swatch" class="swatch-wrapper">
            <div class="swatch" :class="[swatch]">Aa</div>
            <span>{{swatch}}</span>
          </div>
        </div>
        <div class="typography">
          <h1>This is a H1</h1>
          <h2>Which will usually be followed by a H2</h2>
          <p>And then some normal text. Which will look somewhat like this and be a bit wider than normal headlines, which really shouldn’t break the line if at all possible.</p>
          <h2>Another H2</h2>
          <h3>Which will in rarer cases be followed by an H3.</h3>
          <p>Before there’s another paragraph of text.</p>
          <p>Paragraphs are spaced well as well. And obviously they should be pleasant to read. I <em>thought</em> about increasing their size for legibility reasons, but I still feel like UI controls should stick to classic 16px base sizes, we’re not writing a webpage after all.</p>
          <ul>
            <li>There might also be lists</li>
            <li>Both of the <strong>unordered</strong>
              <ul>
                <li>This is an indented bullet</li>
              </ul>
            </li>
            <li>And of the <strong>ordered</strong> kinds</li>
          </ul>
          <p>This is how an ordered list would look like after a paragraph:</p>
          <ol>
            <li>First Point</li>
            <li>Second Point
              <ol>
                <li>This is and indented numbered item</li>
              </ol>
            </li>
            <li>And last but not least: Third Point</li>
          </ol>
          <p>There’s also the rare chance that Blockqoutes might be used. They would look as follows:</p>
          <blockquote>
            <p>This is a very ominous quote. I should make it longer so it is better visible. And perhaps also make it wrap the line.</p>
            <footer>It can also quote someone.</footer>
          </blockquote>
          <p>There might also be, on rare occasions, <a href="#">Links</a>. They should stand out, but not too much.</p>
          <p>Speaking of rare occasions, it wouldn’t hurt to style code blocks and inline code, would it? So this is what <code>inline code</code> looks like.</p>
          <pre>
            <code>And here</code>
            <code>We have some more code in a block.</code>
            <code>Without syntax highlighting, of course.</code>
          </pre>
          <p>And last, but not least (for now), we probably need a way to show keyboard shortcuts like <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>, too.</p>
        </div>
      </section>
      <section v-else-if="activeTabValue === 'tabs'" class="tab" key="tabs">
        <h2>Tabs</h2>
        <p>For a usage-example see the tab strip above.</p>
        <p>The active tab is: {{activeTabValue}}</p>
        <h3>Props</h3>
        <MbTable :data="props.tabs" />
        <h3>Events</h3>
        <MbTable :data="events.tabs" />
        <h3>Notes</h3>
        <p>The <code>tabs</code> array should either by an array of strings, or an array of <code>{ label, value}</code> objects.</p>
        <p>If the <code>add-tab</code> prop is set to <code>true</code> the last tab will always contain a “Plus”-icon for adding a new tab.</p>
        <p>Clicking this tab will <strong>not</strong> automatically create a new tab, it will only send an event, so the parent can handle tab creation as it sees fit.</p>
        <MbButton :dark="dark" rounded type="negative" @click="removeTab">Delete Last Demo Tab</MbButton>
      </section>
      <section v-else-if="activeTabValue === 'inputs'" class="tab inputs" key="inputs">
        <h2>Inputs</h2>
        <MbInput v-model="textTest" :dark="dark" label="Label" placeholder="Placeholder" />
        <MbInput v-model="textTest" :dark="dark" error="With Error" label="Test" />
        <MbInput v-model="textTest" clearable :dark="dark" icon="search" label="With Icon" type="password" />
        <MbInput v-model="textTest" :dark="dark" placeholder="Just a placeholder" />
        <MbInput v-model="textTest" :dark="dark" label="Just a Label" />
        <MbInput v-model="textTest" :dark="dark" label="Label and maximum length" :max-len="20" warn />
        <MbInput v-model="textTest" :dark="dark" placeholder="Just maximum length" :max-len="10" />
        <MbInput v-model="textTest" :dark="dark" disabled placeholder="mattrbld" label="Disabled" />
        <MbInput v-model.number="numTest" :dark="dark" icon="number" label="Number Input" type="number" />
        <h3>Props</h3>
        <MbTable :data="props.inputs" />
        <h3>Events</h3>
        <MbTable :data="events.inputs" />
        <h3>Notes</h3>
        <p>They can be focussed programmatically with a <code>focus()</code> function, if you first optain a <code>$ref</code> for them.</p>
      </section>
      <section v-else-if="activeTabValue === 'buttons'" class="tab buttons" key="buttons">
        <h2>Buttons</h2>
        <MbButton :dark="dark">Secondary Button</MbButton>
        <MbButton :dark="dark" :loading="simulateLoading" :tooltip="{ message: 'Bold <kbd>Cmd</kbd> + <kbd>B</kbd> that is going to be really really long', timeout: 200, position: 'top' }" type="primary">Primary Button</MbButton>
        <MbButton :dark="dark" :loading="simulateLoading" rounded :tooltip="{ message: 'Hi there from <strong>left</strong>', timeout: 200, position: 'left' }">Rounded Button</MbButton>
        <MbButton :dark="dark" :loading="simulateLoading" :tooltip="{ message: 'Hi there from <strong>right</strong>', timeout: 200, position: 'right' }" type="positive">Positive Button</MbButton>
        <MbButton :dark="dark" :loading="simulateLoading" :tooltip="{ message: 'Hi there from <strong>bottom</strong>', timeout: 200, position: 'bottom' }" type="negative">Negative Button</MbButton>
        <MbButton :dark="dark" :loading="simulateLoading" type="warning">Warning Button</MbButton>
        <MbButton :dark="dark" icon="mattrbld" :icon-first="false">Secondary Button</MbButton>
        <MbButton :dark="dark" icon="mattrbld" rounded type="primary">Primary Button</MbButton>
        <MbButton :dark="dark" icon="mattrbld" />
        <MbButton :dark="dark" icon="mattrbld" rounded />
        <MbButton :dark="dark" disabled icon="mattrbld" />
        <MbButton :dark="dark" disabled icon="mattrbld" :loading="simulateLoading" type="primary" />
        <MbButton :dark="dark" disabled icon="mattrbld">Disabled Button</MbButton>
        <MbButton :dark="dark" disabled icon="mattrbld" :loading="simulateLoading" type="negative">Disabled Button</MbButton>
        <MbButton :dark="dark" @click="simulateLoading = !simulateLoading">{{ simulateLoading ? 'Stop' : 'Start' }} loading</MbButton>
        <h3>Props</h3>
        <MbTable :data="props.buttons" />
        <h3>Events</h3>
        <MbTable :data="events.buttons" />
        <h3>Notes</h3>
        <p>Like with normal buttons, the text between the tags will be used as a label.</p>
        <p>If no label is provided, the button will be styled as an icon button, so an icon should be provided.</p>
      </section>
      <section v-else-if="activeTabValue === 'icons'" class="tab icons" key="icons">
        <h2>Icons</h2>
        <p>All of the below icons are automatically fetched and optimized from the <code>@/assets/icons/</code> directory. Hover over them to see their name.</p>
        <MbIcon v-for="icon in availableIcons" :icon="icon" :key="icon" @mouseenter="$store.commit('setTooltip', { message: icon, target: $event.currentTarget })" />
        <h3>Props</h3>
        <MbTable :data="props.icons" />
      </section>
      <section v-else-if="activeTabValue === 'toggles'" class="tab toggles" key="toggles">
        <h2>Toggles</h2>
        <MbToggle v-model="toggleTest" :dark="dark">With Label</MbToggle>
        <MbToggle v-model="toggleTest" :dark="dark" disabled>Disabled</MbToggle>
        <MbToggle v-model="toggleTest" :dark="dark" />
        <MbToggle v-model="toggleTest" :dark="dark" :icons="['sun', 'moon']" />
        <h3>Props</h3>
        <MbTable :data="props.toggles" />
        <h3>Events</h3>
        <MbTable :data="events.toggles" />
        <h3>Notes</h3>
        <p>Supplying text-content between the tags will enable a label for the toggle and make it stretch over the entire width.</p>
        <p>If the <code>icons</code> prop is set, the array should contain two valid icon strings. The first will be used if <code>value === false</code> and the second if <code>value === true</code>.</p>
      </section>
      <section v-else-if="activeTabValue === 'checkboxes'" class="tab checkboxes" key="checkboxes">
        <h2>Checkboxes</h2>
        <p>The value is {{toggleTest}}</p>
        <MbCheckbox v-model="toggleTest" :dark="dark">With Label</MbCheckbox>
        <MbCheckbox v-model="toggleTest" :dark="dark" disabled>Disabled</MbCheckbox>
        <MbCheckbox v-model="toggleTest" :dark="dark" />
        <h3>Props</h3>
        <MbTable :data="props.checkboxes" />
        <h3>Events</h3>
        <MbTable :data="events.checkboxes" />
        <h3>Notes</h3>
        <p>Supplying text-content between the tags will enable a label for the checkbox and make it stretch over the entire width.</p>
      </section>
      <section v-else-if="activeTabValue === 'tooltips'" class="tab tooltips" key="tooltips">
        <h2>Tooltips</h2>
        <p>Hover the new tab button or other buttons in “Buttons” to see a demo of the tooltips</p>
        <h3>Props</h3>
        <MbTable :data="props.tooltips" />
      </section>
      <section v-else-if="activeTabValue === 'textareas'" class="tab textareas" key="textareas">
        <h2>Textareas / Editors</h2>
        <MbEditor v-model="editorTest" :dark="dark" label="Type something" :max-len="200" output-format="text" />
        <MbEditor v-model="editorTest" :allow-new-lines="false" :dark="dark" label="Type something (no returns)" output-format="text" />
        <MbEditor v-model="editorTest" allow-raw :dark="dark" label="This will output HTML" output-format="html" placeholder="Your Text…" />
        <MbEditor v-model="editorTest" :dark="dark" :formats="{ inline: ['em', 'strike', 'link'], block: false }" :input-rule-options="{ autoquotes: '»«›‹'}" label="HTML with limited formats" :link-options="{ collectionsPath: $route.params.id ? `/projects/${$route.params.id}/.mattrbld/collections` : null, forceBlankTarget: true, forceNofollow: false, only: null, urlSuffix: null, urlTemplate: '/:date[year]/:date[month]/:title\\.html', useFilePath: false }" :max-len="200" output-format="html" />
        <MbEditor v-model="editorTest" allow-raw :dark="dark" :formats="{ inline: ['em', 'strong', 'link'], block: ['heading', 'blockquote'] }" :format-options="{ allowNestedLists: false, allowQuoteFooters: true, minHeading: 2, maxHeading: 4 }" label="This will output Markdown" output-format="markdown" />
        <div class="tester" v-html="editorTest" />
        <h3>Props</h3>
        <MbTable :data="props.textareas" />
        <h3>Events</h3>
        <MbTable :data="events.textareas" />
        <h3>Notes</h3>
        <p>Like inputs, editors can be focussed externally by calling <code>focus()</code> on a reference of them.</p>
        <p>The <code>linkOptions</code> prop can, if passed, influence how links are created with the integrated link popover. <code>urlSuffix</code>, <code>urlTemplate</code> and <code>useFilePath</code> can be used to influence how the URL is generated from the selected content item for internal links.</p>
        <p>While <code>useFilePath</code> simply uses the path of the file within the project, slugified and with the optional <code>urlSuffix</code>, <code>urlTemplate</code> can be used to grab field values from the content item as follows:</p>
        <p><code>/blog/:createdAt__year/:createdAt__month/:title</code> would for example look for a <code>createdAt</code> field and test if it is a date, if so it would extract <code>year</code> and <code>month</code> and use those in the respective area of the URL. If it wasn’t a date, it would try to read the properties of the object. <code>title</code> would simply be slufigied and used.</p>
      </section>
      <section v-else-if="activeTabValue === 'loaders'" class="tab loaders" key="loaders">
        <h2>Loaders</h2>
        <MbLoader />
        <MbInlineLoader />
        <h3>Props</h3>
        <p>Loaders don’t support any customization with props at the moment.</p>
      </section>
      <section v-else-if="activeTabValue === 'scrollers'" class="tab scrollers" key="scrollers">
        <h2>Scrollers</h2>
        <p>Scrollers are used to hide scrollbars, but still leave indicators that there’s more content to be scrolled to, like in overflowing editor toolbars and tab bars.</p>
        <p>To facilitate horizontal scrolling on a desktop when no trackpad is available, horizontal scrollers can also be scrolled by clicking &amp; dragging with the left or middle mouse buttons.</p>
        <MbScroller class="horiz">
          <ul>
            <li>First Item</li>
            <li>Second Item</li>
            <li>Third Item</li>
            <li>Fourth Item</li>
            <li>Fifth Item</li>
            <li>Sixth Item</li>
            <li>Seventh Item</li>
            <li>Eighth Item</li>
            <li>Ninth Item</li>
            <li>Tenth Item</li>
          </ul>
        </MbScroller>
        <MbScroller class="vert" direction="vertical">
          <ul>
            <li>First Item</li>
            <li>Second Item</li>
            <li>Third Item</li>
            <li>Fourth Item</li>
            <li>Fifth Item</li>
            <li>Sixth Item</li>
          </ul>
        </MbScroller>
        <h2>Props</h2>
        <MbTable :data="props.scrollers" />
      </section>
      <section v-else-if="activeTabValue === 'popovers'" class="tab popovers" key="popovers">
        <h2>Popovers</h2>
        <p>Popovers form a basic building block for any sort of content that needs to be displayed over other content.</p>
        <MbToggle v-model="centerPopover" :dark="dark">Center Popover</MbToggle>
        <MbToggle v-model="popoverFromRight" :dark="dark">Open Popover from Right</MbToggle>
        <MbButton :dark="dark" type="primary" @click="popover = { x: $event.clientX, y: $event.clientY }">Open Popover</MbButton>
        <MbPopover :center-x="centerPopover" :center-y="centerPopover" :dark="dark" :from-right="popoverFromRight" :visible="Boolean(popover)" :x="popover && popover.x" :y="popover && popover.y" @close="popover = null">
          <template #header>
            <h3>Hello! Looooooooooooooooong</h3>
          </template>
          <p>Hello there!</p>
          <MbPopover :center-x="centerPopover" :center-y="centerPopover" :dark="dark" :from-right="popoverFromRight" :visible="Boolean(popover2)" :x="popover2 && popover2.x" :y="popover2 && popover2.y" @close="popover2 = null">
            <h3>Here’s another one!</h3>
            <p>Cool, right?</p>
          </MbPopover>
          <template #footer>
            <MbButton :dark="dark" @click="popover = null">Cancel</MbButton>
            <MbButton :dark="dark" type="primary" @click="popover2 = { x: $event.clientX, y: $event.clientY }">Add</MbButton>
          </template>
        </MbPopover>
        <h3>Props</h3>
        <MbTable :data="props.popovers" />
        <h3>Events</h3>
        <MbTable :data="events.popovers" />
        <h3>Slots</h3>
        <MbTable :data="slots.popovers" />
        <h3>Notes</h3>
        <p>If <code>stealFocus</code> gets explicitly set to false, the popover will not be focussed on opening (making keyboard shortcuts not work until it’s focussed manually)</p>
        <p>If <code>updateOnResize</code> is set to <code>true</code>, the popover will not close on window resize events, but instead update itself after one tick.</p>
      </section>
      <section v-else-if="activeTabValue === 'selects'" class="tab selects" key="selects">
        <h2>Select Boxes</h2>
        <p>The selected value is: {{selectTest}}</p>
        <MbSelect v-model="selectTest" :dark="dark" :options="selectOptions" />
        <MbSelect v-model="selectTest" :dark="dark" filterable :options="selectOptions" />
        <MbSelect v-model="selectTest" :dark="dark" disabled :options="selectOptions" />
        <h3>Props</h3>
        <MbTable :data="props.selects" />
        <h3>Events</h3>
        <MbTable :data="events.selects" />
      </section>
      <section v-else-if="activeTabValue === 'radios'" class="tab radios" key="radios">
        <h2>Radio Groups</h2>
        <p>The selected value is: {{radioTest}}</p>
        <MbRadioGroup v-model="radioTest" :dark="dark" inline :options="['Administrator', 'Editor', 'Developer', 'Writer', 'Cheesemaker', 'Chessplayer']" />
        <MbRadioGroup v-model="radioTest" :dark="dark" :options="[{ label: 'Administrator Label', value: 'Administrator' }, { label: 'Editor Label', value: 'Editor' }, { label: 'Developer Label', value: 'Developer' }]" />
        <h3>Props</h3>
        <MbTable :data="props.radios" />
        <h3>Events</h3>
        <MbTable :data="events.radios" />
        <h3>Notes</h3>
        <p>The <code>options</code>-array can either be an array of values like strings, or an array of objects in the following format:</p>
        <p><code>{ label: 'Option Label', value: optionValue }</code></p>
      </section>
      <section v-else-if="activeTabValue === 'modals'" class="tab modals" key="modals">
        <h2>Modals</h2>
        <p>Modals get displayed over every other piece of content. They put the user in a new mode. They can also be stacked. Hitting Esc while the focus is within them, closes them.</p>
        <p>Click the button below to open a modal.</p>
        <MbButton :dark="dark" type="primary" @click="modalVisible = true">Open Modal</MbButton>
        <MbModal :dark="dark" permanent title="Permanent Test Modal" :visible="modalVisible" @close="modalVisible = false">
          <p>This is a permanent testing modal. It cannot be closed by clicking outside.</p>
          <p>The document is in <code>{{$store.state.application.mobile ? 'mobile' : 'desktop'}}</code> mode.</p>
          <template #actions>
            <MbButton :dark="dark" @click="modalVisible = false">Close Me</MbButton>
            <MbButton :dark="dark" type="primary" @click="modalVisible2 = true">Open Nested</MbButton>
          </template>
          <MbModal :dark="dark" title="Nested Modal" :visible="modalVisible2" @close="modalVisible2 = false">
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <p>This is a nested modal for testing purposes.</p>
            <template #actions>
              <MbButton :dark="dark" type="primary" @click="modalVisible3 = true">Open Nested</MbButton>
            </template>
            <MbModal :dark="dark" title="Second Nested Modal" :visible="modalVisible3" @close="modalVisible3 = false">
              <p>This is a nested modal for testing purposes.</p>
              <p>This is a nested modal for testing purposes.</p>
              <p>This is a nested modal for testing purposes.</p>
              <p>This is a nested modal for testing purposes.</p>
              <template #actions>
                <MbButton :dark="dark" type="primary" @click="modalVisible4 = true">Open Nested</MbButton>
              </template>
              <MbModal :dark="dark" title="Third Nested Modal" :visible="modalVisible4" @close="modalVisible4 = false">
                <p>This is a nested modal for testing purposes.</p>
              </MbModal>
            </MbModal>
          </MbModal>
        </MbModal>
        <h3>Props</h3>
        <MbTable :data="props.modals" />
        <p><strong>Note:</strong> a permanent modal is a modal that cannot be swiped away or be closed by clicking on the background / the modal before. It has to be closed by setting its visibility prop to false.</p>
        <h3>Events</h3>
        <MbTable :data="events.modals" />
        <h3>Slots</h3>
        <MbTable :data="slots.modals" />
      </section>
      <section v-else-if="activeTabValue === 'progress-bars'" class="tab progress-bars">
        <h2>Progress Bars</h2>
        <MbProgress :colors="['accent']" :dark="dark" indetermined />
        <MbProgress :dark="dark" label="70%" :progress="0.7" />
        <MbProgress :colors="['positive', 'warning', 'negative']" :dark="dark" label="This is a really long label to prove a point" :progress="0.6" />
        <h3>Props</h3>
        <MbTable :data="props.progressBars" />
        <h3>Note</h3>
        <p>The colours passed in the <code>colors</code> prop should be one of the following:</p>
        <ul>
          <li><code>accent</code></li>
          <li><code>negative</code></li>
          <li><code>positive</code></li>
          <li><code>warning</code></li>
        </ul>
        <p>They correspond to the saturated variants of the same name. The default color (when none are given) is <code>positive</code></p>
        <p>If the array contains more than one item, the bar will be that color based on the progress.</p>
      </section>
      <section v-else-if="activeTabValue === 'context-menus'" class="tab context-menus" @contextmenu.prevent="contextMenu.show = true; contextMenu.x = $event.clientX; contextMenu.y = $event.clientY">
        <h2>Context Menus</h2>
        <p>Press <kbd>RMB</kbd> anywhere here to open a context menu.</p>
        <MbContextMenu :dark="dark" :options="[{ label: 'Hi there', icon: 'plus', type: 'positive' }, { label: 'Not so good', type: 'warning', disabled: true, shortcut: ['ctrl', 'q'] }, { icon: 'arrow-right', label: 'Test', shortcut: ['ctrl', 'alt', 'C'] }]" :show="contextMenu.show" :x="contextMenu.x" :y="contextMenu.y" @close="contextMenu.show = false" />
        <h3>Props</h3>
        <MbTable :data="props.contextMenus" />
        <h3>Events</h3>
        <MbTable :data="events.contextMenus" />
        <h3>Notes</h3>
        <p>The <code>options</code> array should consist of objects with the following properties:</p>
        <pre>{{'{\n  action: Function (required),\n  label: String (required),\n  icon: String,\n  type: String,\n  disabled: Boolean,\n  shortcut: Array // for displaying keyboard shortcuts\n}'}}</pre>
        <p>If a <code>target</code> is provided, it will be focussed if the context menu gets closed.</p>
        <p>If <code>stealFocus</code> gets explicitly set to false, the popover will not be focussed on opening (making keyboard shortcuts not work until it’s focussed manually)</p>
      </section>
      <section v-else-if="activeTabValue === 'file-lists'" class="tab file-lists">
        <h2>File Lists</h2>
        <p>This component is a fully fledged file browser that can display the contents of a folder and offers the ability for custom actions on the files.</p>
        <MbFileList :dark="dark" :file-actions="[{ action: previewFile, icon: 'folder-open', label: 'Open', filesOnly: true }, { disabled: true, icon: 'folder-open', label: 'Open', foldersOnly: true }, { action: moveEntity, icon: 'arrow-right', label: 'Move' }, { action: renameEntity, icon: 'text-input', label: 'Rename' }, { action: softDeleteFile, icon: 'trash', label: 'Delete', type: 'negative' }]" :folders-first="true" :folders-only="false" ref="fileList" root="/" show-hidden :action="{ callback: (path) => { currentPath = path; showEntityCreationModal = true; }, label: 'Add', icon: 'plus', type: 'positive'}" @fileclick="previewFile" />
        <EntityCreationModal :dark="dark" :file-extension="['json', 'md', 'txt', 'yaml', 'zip', 'mp4']" :path="currentPath" :visible="showEntityCreationModal" @close="showEntityCreationModal = false" @entity-created="refreshFileList" />
        <EntityMoveModal :dark="dark" :old-path="entityBeingModified" :visible="showEntityMove" @close="showEntityMove = false" @after-close="entityBeingModified = null" @entity-moved="refreshFileList" />
        <EntityRenameModal :dark="dark" :old-path="entityBeingModified" :visible="showEntityRename" @close="showEntityRename = false" @after-close="entityBeingModified = null" @entity-renamed="refreshFileList" />
        <h3>Props</h3>
        <MbTable :data="props.fileLists" />
        <h3>Events</h3>
        <MbTable :data="events.fileLists" />
        <h3>Notes</h3>
        <p>The component offers an async <code>refresh</code> method that can be used to refresh the current directory if needed. To use it you will need a <code>$ref</code> for the component.</p>
        <MbModal class="file-preview-modal" :dark="dark" :title="currentFile" :visible="showFilePreviewModal" @after-close="resetFilePreview" @close="showFilePreviewModal = false">
          <MbEditor v-model="fileContent" :dark="dark" @keyup.ctrl.enter="saveCurrentFileContent" />
        </MbModal>
      </section>
      <section v-else-if="activeTabValue === 'tables'" class="tab">
        <h2>Tables</h2>
        <p>This is a simple wrapper component to display tabular data in a responsive fashion.</p>
        <h3>Props</h3>
        <MbTable :data="props.tables" />
        <h3>Notes</h3>
        <p>The data-array should contain one array for each row of data. The headers for the columns will be automatically generated based on the first entry in the array.</p>
        <p>Items in rows besides the first support special strings at the beginning and end of values for formatting them:</p>
        <ul>
          <li><code>`</code> causes the value to be rendered as in a <code>&lt;code /&gt;</code> tag</li>
          <li><code>*</code> causes the value to be rendered as in a <code>&lt;em /&gt;</code> tag</li>
          <li><code>**</code> causes the value to be rendered as in a <code>&lt;strong /&gt;</code> tag</li>
        </ul>
        <p>Table data could look as follows for example:</p>
        <pre data-lang="javascript"><code>{{"const data = [\n  ['Name', 'Type', 'Default'],\n  ['`data`', 'Array', '`[]`'],\n];"}}</code></pre>
      </section>
      <section v-else-if="activeTabValue === 'color-pickers'" class="tab color-pickers">
        <h2>Color Pickers</h2>
        <p>The currently picked color is: <span class="color-preview" :style="{ backgroundColor: currentColor }" />{{currentColor}}</p>
        <MbColorPicker v-model="currentColor" :dark="dark" removable />
        <MbColorPicker v-model="currentColor" :dark="dark" format="rgba" />
        <MbColorPicker v-model="currentColor" :dark="dark" format="rgba" :palette="colorPalette" />
        <MbColorPicker v-model="currentColor" :dark="dark" format="rgba" :palette="colorPalette" palette-only removable />
        <h3>Props</h3>
        <MbTable :data="props.colorPickers" />
        <h3>Events</h3>
        <MbTable :data="events.colorPickers" />
        <h3>Notes</h3>
        <p>If the format is set to <code>rgba</code> a control for the color’s opacity will be shown.</p>
        <p>With the <code>palette</code> prop an array of valid CSS colors may be passed to be displayed under the color selector / as the available colors up for selection if <code>paletteOnly</code> is also active.</p>
        <p>The <code>palette</code> array may also contain objects in the following shape to add named colors:</p>
        <pre data-lang="javascript"><code>{{JSON.stringify([{ label: 'Color Name', value: 'valid CSS color'}, { label: 'Badass', value: '#bada55' }], null, 2)}}</code></pre>
        <p>If <code>removable</code> is set to <code>true</code> an additional option to clear the color will be shown, causing the value to become <code>null</code>.</p>
      </section>
      <section v-else-if="activeTabValue === 'tag-inputs'" class="tab tag-inputs">
        <h2>Tag Inputs</h2>
        <p>This component allows entering a list of tags with autocompletion, removal and rearrangement.</p>
        <p>The current value is: <code>{{tagList}}</code></p>
        <MbTagInput v-model="tagList" :autocomplete-model="colorPalette" autocomplete-property="label" :allow-unsuggested="true" :dark="dark" label="An advanced tag input" :max="4" :min="3" />
        <MbTagInput v-model="tagList" :autocomplete-model="colorPalette" autocomplete-property="label" :allow-unsuggested="true" :dark="dark" label="An advanced tag input with value prop" value-property="value" />
        <MbTagInput v-model="tagList" :autocomplete-model="['foobar', 'bazlington', 'fizzbuzz', 'crazy']" :dark="dark" label="A simple tag input" value-property="value" />
        <h3>Props</h3>
        <MbTable :data="props.tagInputs" />
        <h3>Events</h3>
        <MbTable :data="events.tagInputs" />
        <h3>Notes</h3>
        <p>If <code>autocompleteModel</code> and <code>autocompleteProperty</code> are provided, the tag input will fetch suggestions based on the typed characters out of the model.</p>
        <p>If a model is provided, the input will only accept tags from that model unless <code>allowUnsuggested</code> is set to <code>true</code>.</p>
        <p>If a <code>valueProperty</code> is provided and a model is present, the model value will only contain the value properties of the items in the supplied model instead of the entire object.</p>
      </section>
      <section v-else-if="activeTabValue === 'date-pickers'" class="tab date-pickers">
        <h2>Date Pickers</h2>
        <p>This component allows picking dates and times visually.</p>
        <p>The current date is: <code>{{testdate}}</code></p>
        <MbDatePicker v-model="testdate" :dark="dark" />
        <MbDatePicker v-model="testdate" :dark="dark" format="iso" :min="1621209600000" placeholder="A custom placeholder" removable show-time />
        <MbDatePicker v-model="testdate" :dark="dark" format="iso" only="past" label="Only past dates" removable show-time />
        <h3>Props</h3>
        <MbTable :data="props.datePickers" />
        <h3>Events</h3>
        <MbTable :data="events.datePickers" />
        <h3>Notes</h3>
        <p>If <code>showTime</code> is not <code>true</code> the resulting date will be at the start of the day (00:00).</p>
        <p>The <code>only</code> prop can only be set to either <code>'past'</code> (for dates only in the past) or <code>'future'</code> (for dates only in the future). Past and future start at the previous / next day.</p>
      </section>
      <section v-else-if="activeTabValue === 'project-avatars'" class="tab project-avatars">
        <h2>Project Avatars</h2>
        <MbProjectAvatar avatar="https://picsum.photos/320/180" project-id="demo-project" />
        <MbProjectAvatar project-id="green-falafel" project-name="Green Falafel" />
        <p>This component either shows a user provided avatar image, or generates a random one based on the provided project ID.</p>
        <p>This method of generation ensures that projects without set avatars look the same accross all devices they might appear on.</p>
        <p>If a project name is passed, it will be printed on the generated avatar, but not appear on provided images.</p>
        <h3>Props</h3>
        <MbTable :data="props.projectAvatars" />
      </section>
      <section v-else-if="activeTabValue === 'project-cards'" class="tab project-cards">
        <h2>Project Cards</h2>
        <p>This component is used to display lists / grids of projects. It has functions to open a project (including in a new tab / window) or its settings, as well as deleting the project.</p>
        <div class="wrapper" :class="{dark}">
          <MbProjectCard :dark="dark" id="green-falafel" name="Green Falafel" :updated-at="1612301667853" />
          <MbProjectCard avatar="https://picsum.photos/seed/demo-project/320/180" :dark="dark" id="demo-project" local-changes name="Demo Project" :updated-at="1612302667853" />
        </div>
        <h3>Props</h3>
        <MbTable :data="props.projectCards" />
        <h3>Events</h3>
        <MbTable :data="events.projectCards" />
      </section>
      <section v-else-if="activeTabValue === 'utility'" class="tab utility">
        <h2>Utility Components</h2>
        <p>A set of one-shot or just plain utility components that don’t need to be listed in a separate category.</p>
        <p>Many of these components are purely functional, meant to appear only once throughout the app, or require special data structures in place in order to function, which is why not all of them have interactive examples.</p>
        <h3>Table of Contents</h3>
        <ol class="toc" :class="{ dark }">
          <li v-for="item in utilityToc" :key="item.hash"><a :href="`#${item.hash}`" @click.prevent="item.el.scrollIntoView()">{{item.label}}</a></li>
        </ol>
        <h3 id="async image">Async Image</h3>
        <p>This component can be used to show a loader and / or a static background color while an image is loading.</p>
        <p>For an example see the <u @click="activeTab = tabs.findIndex((tab) => tab.value === 'project-avatars')">Project Avatar</u> component.</p>
        <h4>Props</h4>
        <MbTable :data="props.asyncImages" />
        <h4>Events</h4>
        <MbTable :data="events.asyncImages" />
        <h3 id="avatar uploader">Avatar Uploader</h3>
        <p>This component crops a user picked image to a square and compresses it to a given resolution and quality.</p>
        <h4>Props</h4>
        <MbTable :data="props.avatarUploaders" />
        <h4>Events</h4>
        <MbTable :data="events.avatarUploaders" />
        <h4>Notes</h4>
        <p>This component has no visual output, it is meant to be used programmatically by another component that then “clicks” it.</p>
        <h3 id="entity creation modal">Entity Creation Modal</h3>
        <p>A reusable modal for creating files or folders at a specific location. Click the “Add” button under “<u @click="activeTab = tabs.findIndex((tab) => tab.value === 'file-lists')">File Lists</u>” to see how it looks and works.</p>
        <h4>Props</h4>
        <MbTable :data="props.entityCreationModals" />
        <h4>Events</h4>
        <MbTable :data="events.entityCreationModals" />
        <h3 id="entity move modal">Entity Move Modal</h3>
        <p>A reusable modal for moving files or folders to a specific location. Try it under “<u @click="activeTab = tabs.findIndex((tab) => tab.value === 'file-lists')">File Lists</u>”.</p>
        <h4>Props</h4>
        <MbTable :data="props.entityMoveModals" />
        <h4>Events</h4>
        <MbTable :data="events.entityMoveModals" />
        <h3 id="entity rename modal">Entity Rename Modal</h3>
        <p>A reusable modal for renaming files or folders. Try it under “<u @click="activeTab = tabs.findIndex((tab) => tab.value === 'file-lists')">File Lists</u>”.</p>
        <h4>Props</h4>
        <MbTable :data="props.entityRenameModals" />
        <h4>Events</h4>
        <MbTable :data="events.entityRenameModals" />
        <h3 id="git login modal">Git Login Modal</h3>
        <p>A component for prompting the user to sign into their Git account. It bundles some common text and input fields with a custom message.</p>
        <MbButton :dark="dark" @click="showGitLoginModal = true">Show Modal</MbButton>
        <GitLoginModal :dark="dark" message="This is a custom message!" :visible="showGitLoginModal" @cancel="handleLoginModal(false)" @submit="handleLoginModal" />
        <h4>Props</h4>
        <MbTable :data="props.gitLoginModals" />
        <h4>Events</h4>
        <MbTable :data="events.gitLoginModals" />
        <h4>Notes</h4>
        <p>This does <strong>not</strong> perform the log-in. It only provides the details input by the user in its <code>submit</code> event!</p>
        <h3 id="global tooltip controller">Global Tooltip Controller</h3>
        <p>This component is supposed to be added <em>once</em> at the topmost level of the app. It handles showing and hiding tooltips that can be attached to components throughout the app.</p>
        <p>It offers no configuration.</p>
        <h3 id="internal link helper">Internal Link Helper</h3>
        <p>A component to generate a link from a file in a collection.</p>
        <InternalLinkHelper v-model="internalLinkTest" :collections-path="$route.params.id ? `/projects/${$route.params.id}/.mattrbld/collections` : '/'" :dark="dark" url-suffix=".html" url-template="/projects/:date[year]/:title\.html" :use-file-path="false" />
        <h4>Props</h4>
        <MbTable :data="props.internalLinkHelpers" />
        <h4>Events</h4>
        <MbTable :data="events.internalLinkHelpers" />
        <h4>Notes</h4>
        <p>If <code>useFilePath</code> and <code>fullPath</code> are <code>true</code>, the returned file path will be the full path of the content item relative to the <em>project directory</em>, otherwise it will be the path with the optional <code>urlSuffix</code> relative to the <em>collection directory</em>.</p>
        <p><code>urlTemplate</code> will be ignored if <code>useFilePath</code> is <code>true</code>. If no <code>lang</code> is passed, localised fields will return <code>undefined</code>.</p>
        <p>Any string between a colon (:) and the first non word character in the <code>urlTemplate</code> will be interpreted as a field-path passed to <code>_.get</code>. The field’s value will be slugified and used in the URL instead.</p>
        <p>If a <code>[year|month|day]</code> modifier is used on a dynamic part of the <code>urlTemplate</code>, the field value will be converted to a date and return the specified modifier or undefined if the date is invalid</p>
        <p><code>limitTo</code> should be an Array of Collection paths (or files) that should be included in the list.</p>
        <p><code>allowUnlikable</code> can be used in situations where even Collections not marked as linkable should be able to selected.</p>
        <h3 id="modal overlay">Modal Overlay</h3>
        <p>In order to only have one modal overlay despite multiple modals stacking on top of each other, the overlay is factored out into its own component that should be included <em>once</em> in the app.</p>
        <h4>Props</h4>
        <MbTable :data="props.modalOverlays" />
        <h3 id="project sidebar">Project Sidebar</h3>
        <p>A component that houses all relevant navigation and the current git status of a project. It only functions within a project, which is why it doesn’t have a demo here.</p>
        <h4>Props</h4>
        <MbTable :data="props.projectSidebars" />
        <h4>Events</h4>
        <MbTable :data="events.projectSidebars" />
        <h4>Notes</h4>
        <p>The component automatially gnerates the upper navigation links based on the sidebar configuration in the current project.</p>
        <p>This configuration option is an array of objects with the following shape:</p>
        <pre><code>{{JSON.stringify({ icon: 'Icon name', label: 'String', target: 'Router target' }, null, 2)}}</code></pre>
        <p>If no <code>target</code> is supplied, just the <code>label</code> is rendered as a separator headline and the <code>icon</code> will be ignored. Otherwise a button with the specified icon and label will be rendered, which will navigate to the supplied <code>target</code> on click.</p>
        <h3 id="snackbar">Snackbar</h3>
        <p>Similarly to the Global Tooltip Controller, this component should be included <em>once</em> at the topmost level of the app and is responsible for showing the toasts emitted by various other components.</p>
        <h4>Props</h4>
        <MbTable :data="props.snackbars" />
        <h3 id="svg sprite">Svg Sprite</h3>
        <p>This component loads all .svg-Files in the <code>/src/assets/icons</code> folder and compiles them into a SVG spritesheet so they can be easily included with a <code>&lt;use /&gt;</code> tag in the entire app.</p>
        <p>It should only be included <em>once</em> at the topmost level of the app and offers no configuration.</p>
        <h3 id="tab content">Tab Content</h3>
        <p>This component can be used to display content in two columns or a single column + a modal on mobile. It’s the base for most views within a project.</p>
        <h4>Props</h4>
        <MbTable :data="props.tabContent" />
        <h4>Events</h4>
        <MbTable :data="events.tabContent" />
        <h3 id="toast">Toast</h3>
        <p>A component to inform the user of things happening throughout the app. It will usually be displayed in a <code>Snackbar</code> component.</p>
        <p>Toasts are meant to be ephemeral, so they will disappear after a configured timeout or can be manually dismissed. This has been disabled for the demo toasts below.</p>
        <MbToast :dark="dark" :toast="{ message: 'I’m a basic toast', permanent: true, timeout: 0 }" />
        <MbToast :dark="dark" :toast="{ action: sayHi, actionLabel: 'Say Hi', message: 'I’m an advanced toast', permanent: true, timeout: 0, type: 'positive' }" />
        <h4>Props</h4>
        <MbTable :data="props.toasts" />
        <h4>Notes</h4>
        <p>The <code>toast</code> object passed should consist of the following properties:</p>
        <pre style="white-space: pre;">{{'{\n  id: String, // will be generated if undefined\n  action: Function,\n  actionLabel: String (required if action),\n  closeOnRouteChange: Boolean, // will close the toast as soon as the route changes\n  message: String (required),\n  onClose: Function, // will be called when the toast is closed or times out, receives one param denoting whether the toast was closed after handling the action or not\n  permanent: Boolean, // hides dismiss action and disables timeout\n  timeout: Number, // default: 5000ms\n  type: String // may be one of error, positive, negative, warning\n}'}}</pre>
        <p>If the <code>type</code> property is set to <code>error</code>, the actual type will be <code>negative</code>, but the timeout will be disabled as well.</p>
        <h3 id="user switcher">User Switcher</h3>
        <p>This component is used for user management. It allows switching the current user, creating new users, modifying user settings and deleting users.</p>
        <p>Since it requires at least one user to function, it cannot be shown here.</p>
        <h4>Props</h4>
        <MbTable :data="props.userSwitchers" />
      </section>
      <section v-else-if="activeTabValue === 'segmented-selectors'" class="tab segmented-selectors">
        <h2>Segmented Selectors</h2>
        <p>These work like radio groups, but follow a design that might be more appropriate in certain situations where Selects, Tabs, or Radio Groups don’t make as much sense visually.</p>
        <p>The currently selected value is: <code>{{segmentedSelectorTest || 'null'}}</code></p>
        <MbSegmentedSelector v-model="segmentedSelectorTest" :dark="dark" :options="['One', 'Two', 'Three']" />
        <MbSegmentedSelector v-model="segmentedSelectorTest" :dark="dark" :options="[{ label: 'Eins', value: 'One' }, { disabled: true, label: 'Zwei', value: 'Two' }, { label: 'Drei', value: 'Three' }, { label: 'Nothing', value: null }]" />
        <h3>Props</h3>
        <MbTable :data="props.segmentedSelectors" />
        <h3>Events</h3>
        <MbTable :data="events.segmentedSelectors" />
        <h3>Notes</h3>
        <p>The <code>options</code>-array can either be an array of values like strings, or an array of objects in the following format:</p>
        <p><code>{ disabled: optional boolean, label: 'Option Label', value: optionValue }</code></p>
      </section>
      <section v-else-if="activeTabValue === 'highlight-boxes'" class="tab highlight-boxes">
        <h2>Highlight Boxes</h2>
        <p>These components can be used to highlight a portion of content, for example notes or warnings.</p>
        <MbHighlightBox :dark="dark">
          <p>Just a default box with no customisation.</p>
        </MbHighlightBox>
        <MbHighlightBox color="warning" :dark="dark" label="Custom Heading">
          <p>This box has a custom color and a custom label.</p>
        </MbHighlightBox>
        <h3>Props</h3>
        <MbTable :data="props.highlightBoxes" />
      </section>
      <section v-else-if="activeTabValue === 'file-pickers'" class="tab file-pickers">
        <h2>File Pickers</h2>
        <p>These components can be used to pick a file or a folder from a given root path.</p>
        <p>The currently picked value is: <code>{{filePickerTest}}</code></p>
        <MbFilePicker v-model="filePickerTest" :dark="dark" />
        <MbFilePicker v-model="filePickerTest" :dark="dark" :filetypes="['json', 'md']" mode="file" relative-to-root removable root="/projects" />
        <h3>Props</h3>
        <MbTable :data="props.filePickers" />
        <h3>Events</h3>
        <MbTable :data="events.filePickers" />
      </section>
      <section v-else-if="activeTabValue === 'chips'" class="tab chips">
        <h2>Chips</h2>
        <p>These components can be used to show the status of something.</p>
        <MbChip label="A basic chip" /><br>
        <MbChip color="positive" label="A chip that can think" :loading="simulateLoading" /><br>
        <MbButton :dark="dark" @click="simulateLoading = !simulateLoading">{{simulateLoading ? 'Stop' : 'Start'}} thinking</MbButton>
        <h3>Props</h3>
        <MbTable :data="props.chips" />
      </section>
      <section v-else-if="activeTabValue === 'checkbox-groups'" class="tab checkbox-groups">
        <h2>Checkbox Grops</h2>
        <p>This component allows to group checkboxes together and returns an array of which have been selected.</p>
        <p>The currently selected checkboxes are: <code>{{checkboxGroupTest}}</code></p>
        <MbCheckboxGroup v-model="checkboxGroupTest" :checkboxes="[{ label: 'First Value', value: 'first' },{ label: 'Second Value', value: 'second' },{ disabled: true, label: 'Disabled Value', value: 'disabled' },{ label: 'Third Value', value: 'third' },]" :dark="dark" />
        <MbCheckboxGroup v-model="checkboxGroupTest" :checkboxes="[{ label: 'First Value', value: 'first' },{ label: 'Second Value', value: 'second' },{ disabled: true, label: 'Disabled Value', value: 'disabled' },{ label: 'Third Value', value: 'third' },]" :dark="dark" inline />
        <h3>Props</h3>
        <MbTable :data="props.checkboxGroups" />
        <h3>Events</h3>
        <MbTable :data="events.checkboxGroups" />
      </section>
      <section v-else-if="activeTabValue === 'palettes'" class="tab palettes">
        <h2>Color Palettes</h2>
        <p>This component allows to create and edit lists of named colors</p>
        <MbPalette v-model="colorPalette" :dark="dark" format="rgba" />
        <h3>Props</h3>
        <MbTable :data="props.palettes" />
        <h3>Events</h3>
        <MbTable :data="events.palettes" />
      </section>
      <section v-else-if="activeTabValue === 'editable-lists'" class="tab editable-lists">
        <h2>Editable Lists</h2>
        <p>This component allows to create and edit simple arrays or label/value object arrays.</p>
        <p>The current value is: <code>{{editableListTest}}</code></p>
        <MbButton :dark="dark" @click="editableListTest = []" style="margin-bottom: 1rem;">Reset Model</MbButton>
        <MbEditableList v-model="editableListTest" :dark="dark" />
        <h3>Props</h3>
        <MbTable :data="props.editableLists" />
        <h3>Events</h3>
        <MbTable :data="events.editableLists" />
      </section>
      <section v-else-if="activeTabValue === 'permissions-lists'" class="tab permissions-lists">
        <h2>Permission Lists</h2>
        <p>This component allows to create and edit lists of custom permissions per custom role.</p>
        <p>The current value is: <code>{{permissionListTest}}</code></p>
        <MbButton :dark="dark" @click="permissionListTest = []" style="margin-bottom: 1rem;">Reset Model</MbButton>
        <MbPermissionsList v-model="permissionListTest" :dark="dark" :permissions="['edit', 'create', 'delete', 'rename']" :roles="['Everybody', 'Admins', 'Developers', 'Editors']" />
        <h3>Props</h3>
        <MbTable :data="props.permissionsLists" />
        <h3>Events</h3>
        <MbTable :data="events.permissionsLists" />
      </section>
      <section v-else-if="activeTabValue === 'item-lists'" class="tab item-lists">
        <h2>Item Lists</h2>
        <p>This component allows to create and edit lists of items chosen from a limited set of predefined items.</p>
        <p>The current value is: <code>{{itemListTest}}</code></p>
        <MbButton :dark="dark" @click="itemListTest = []" style="margin-bottom: 1rem;">Reset Model</MbButton>
        <MbItemList v-model="itemListTest" :dark="dark" :options="[{ label: 'Labelled simple', value: 'simple'}, { label: 'Labelled options', value: 'options'}, { label: 'Labelled first', value: 'first'}]" placeholder="Select an option…"/>
        <h3>Props</h3>
        <MbTable :data="props.itemLists" />
        <h3>Events</h3>
        <MbTable :data="events.itemLists" />
      </section>
      <section v-else-if="activeTabValue === 'icon-pickers'" class="tab icon-pickers">
        <h2>Icon Pickers</h2>
        <p>A component for picking an icon from all available icons.</p>
        <MbIconPicker v-model="iconPickertest" :dark="dark" removable />
        <MbIconPicker v-model="iconPickertest" :dark="dark" />
        <h3>Props</h3>
        <MbTable :data="props.iconPickers" />
        <h3>Events</h3>
        <MbTable :data="events.iconPickers" />
      </section>
      <section v-else-if="activeTabValue === 'sortable-lists'" class="tab sortable-lists">
        <h2>Sortable Lists</h2>
        <p>A base component for creating various forms of lists sortable via drag and drop.</p>
        <MbSortableList v-slot="{ activeItem, item, index }" class="vertical" :class="{ dark }" enable-transitions :items="colorPalette.slice(0, 4)" item-key="label" @itemmove="handleItemMove">
          <div class="sortable-list-item vert" :class="{ active: activeItem === item, dark }">
            <MbIcon data-drag-handle icon="drag-handle" />
            <p><span>{{index}}:</span> <strong>{{item.label}}:</strong> {{item.value}}</p>
          </div>
        </MbSortableList>
        <MbSortableList v-slot="{ activeItem, item, index }" class="horizontal" :class="{ dark }" direction="horizontal" enable-transitions :items="colorPalette.slice(0, 6)" item-key="label" @itemmove="handleItemMove">
          <div class="sortable-list-item" :class="{ active: activeItem === item, dark }">
            <MbIcon data-drag-handle icon="drag-handle" />
            <p><span>{{index}}:</span> <strong>{{item.label}}:</strong> {{item.value}}</p>
          </div>
        </MbSortableList>
        <h3>Props</h3>
        <MbTable :data="props.sortableLists" />
        <h3>Events</h3>
        <MbTable :data="events.sortableLists" />
        <h3>Slots</h3>
        <p>The contents of the default slot will be repeated for every item in <code>items</code>. The slot is passed the following props:</p>
        <ul>
          <li><code>activeItem</code>: the item currently being dragged (if present)</li>
          <li><code>index</code>: the current index in the for-loop</li>
          <li><code>item</code>: the current item in the for-loop</li>
        </ul>
        <h3>Notes</h3>
        <p>Elements with <code>data-drag-handle</code> and their children will become draggable, unless a child has <code>data-ignore-drag</code>. Draggable parts of an item cannot be used to scroll, so don’t apply it to an entire element for touch devices.</p>
      </section>
      <section v-else class="tab" key="exampleTab">
        <p>This is just an empty test-tab.</p>
        <p>To delete it, click the button in the “<u @click="activeTab = tabs.findIndex((tab) => tab.value === 'tabs')">Tabs</u>”-tab.</p>
      </section>
    </transition>
  </div>
</template>

<script>
import EntityCreationModal from '../components/utility/EntityCreationModal.vue';
import EntityMoveModal from '../components/utility/EntityMoveModal.vue';
import EntityRenameModal from '../components/utility/EntityRenameModal.vue';
import GitLoginModal from '../components/utility/GitLoginModal.vue';
import InternalLinkHelper from '../components/utility/InternalLinkHelper.vue';
import MbToast from '../components/utility/MbToast.vue';

import fs, { pathBasename } from '../fs';
import { rmrf } from '../fs/workerFS';

export default {
  components: {
    EntityCreationModal,
    EntityMoveModal,
    EntityRenameModal,
    GitLoginModal,
    InternalLinkHelper,
    MbToast,
  },
  computed: {
    activeTabValue() {
      return this.tabs[this.activeTab] && (this.tabs[this.activeTab].value || this.tabs[this.activeTab]);
    },
    darkMode: {
      get() {
        const { theme } = this.$store.state.user;
        if (theme === 'dark') return true;
        if (theme === 'light') return false;
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || false;
      },
      set(v) {
        if (v) this.$store.commit('setUserProperty', { key: 'theme', value: 'dark' });
        else if ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) this.$store.commit('setUserProperty', { key: 'theme', value: 'light' });
        else this.$store.commit('setUserProperty', { key: 'theme', value: 'auto' });
      },
    },
  },
  data() {
    return {
      activeTab: 0,
      availableIcons: Object.keys(import.meta.glob('@/assets/icons/**.svg')).map((path) => pathBasename(path).replace(/^(.*)\.\w+$/, '$1')),
      centerPopover: false,
      checkboxGroupTest: [],
      colorPalette: [
        {
          label: 'Accent',
          value: '#6c5ce7',
        },
        {
          label: 'Accent Secondary',
          value: '#A29BFE',
        },
        {
          label: 'Text',
          value: '#111028',
        },
        {
          label: 'Text Secondary',
          value: 'rgba(0, 0, 0, 0.54)',
        },
        {
          label: 'Text Tertiary',
          value: 'rgba(0, 0, 0, 0.38)',
        },
        {
          label: 'Bg',
          value: '#fff',
        },
        {
          label: 'Bg Secondary',
          value: '#f4f3ff',
        },
        {
          label: 'Bg Tertiary',
          value: '#fafaff',
        },
        {
          label: 'Text Dark',
          value: 'white',
        },
        {
          label: 'Text Secondary Dark',
          value: 'rgba(255, 255, 255, 0.7)',
        },
        {
          label: 'Text Tertiary Dark',
          value: 'rgba(255, 255, 255, 0.5)',
        },
        {
          label: 'Bg Dark',
          value: '#1E1D22',
        },
        {
          label: 'Bg Secondary Dark',
          value: '#2B2A32',
        },
        {
          label: 'Bg Tertiary Dark',
          value: '#343244',
        },
        {
          label: 'Negative Saturated',
          value: '#d63031',
        },
        {
          label: 'Negative',
          value: '#ff7675',
        },
        {
          label: 'Positive Saturated',
          value: '#00b894',
        },
        {
          label: 'Positive',
          value: '#55efc4',
        },
        {
          label: 'Warning Saturated',
          value: '#fdcb6e',
        },
        {
          label: 'Warning',
          value: '#ffeaa7',
        },
      ],
      colorPaletteStrings: [
        '#6c5ce7',
        '#A29BFE',
        '#111028',
        'rgba(0, 0, 0, 0.54)',
        'rgba(0, 0, 0, 0.38)',
        '#fff',
        '#f4f3ff',
        '#fafaff',
        'white',
        'rgba(255, 255, 255, 0.7)',
        'rgba(255, 255, 255, 0.5)',
        '#1E1D22',
        '#2B2A32',
        '#343244',
        '#d63031',
        '#ff7675',
        '#00b894',
        '#55efc4',
        '#fdcb6e',
        '#ffeaa7',
      ],
      contextMenu: {
        show: false,
        x: 0,
        y: 0,
      },
      currentColor: 'rgba(123, 255, 213, 0.25)',
      currentPath: '/',
      currentFile: null,
      editableListTest: [],
      entityBeingModified: null,
      events: {
        asyncImages: [
          ['Name', 'Data'],
          ['`load`', 'The native image load event'],
        ],
        avatarUploaders: [
          ['Name', 'Data'],
          ['`ready`', 'A DataURL representing the cropped and compressed image'],
        ],
        buttons: [
          ['Name', 'Data'],
          ['`click`', 'The browser click event'],
        ],
        checkboxes: [
          ['Name', 'Data'],
          ['`update:modelValue`', '`!value`'],
        ],
        checkboxGroups: [
          ['Name', 'Data'],
          ['`update:modelValue`', '`An array containing the values of all checked boxes`'],
        ],
        colorPickers: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new color'],
        ],
        contextMenus: [
          ['Name', 'Data'],
          ['`close`', ''],
        ],
        datePickers: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new date in the specified format'],
        ],
        entityCreationModals: [
          ['Name', 'Data'],
          ['`close`', ''],
          ['`entity-created`', 'The name and type of the newly created entity'],
        ],
        editableLists: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new list array / object'],
        ],
        entityMoveModals: [
          ['Name', 'Data'],
          ['`close`', ''],
          ['`entity-moved`', 'The old and new paths of the modified entity'],
        ],
        entityRenameModals: [
          ['Name', 'Data'],
          ['`close`', ''],
          ['`entity-renamed`', 'The old and new paths of the modified entity'],
        ],
        fileLists: [
          ['Name', 'Data'],
          ['`fileclick`', 'The full path of the clicked file'],
          ['`list-change`', 'A { files: Number, folders: Number } object, containing the amount of files / folders listed'],
          ['`path-change`', 'The full new path'],
        ],
        filePickers: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The absolute path to the picked entity'],
        ],
        gitLoginModals: [
          ['Name', 'Data'],
          ['`cancel`', ''],
          ['`submit`', ' An object with the following structure: { user, password, save\ufeffPassword }'],
        ],
        iconPickers: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new icon'],
        ],
        inputs: [
          ['Name', 'Data'],
          ['`blur`', ''],
          ['`focus`', ''],
          ['`update:modelValue`', 'The new text content'],
        ],
        internalLinkHelpers: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new url and collection picked'],
        ],
        itemLists: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new items array'],
        ],
        modals: [
          ['Name', 'Data'],
          ['`after-close`', ''],
          ['`after-open`', ''],
          ['`close`', ''],
        ],
        palettes: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new palette array'],
        ],
        permissionsLists: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new permissions object'],
        ],
        popovers: [
          ['Name', 'Data'],
          ['`after-close`', ''],
          ['`close`', ''],
        ],
        projectCards: [
          ['Name', 'Data'],
          ['`click`', 'The MouseEvent'],
          ['`deleted`', ''],
          ['`delete-undo`', ''],
        ],
        projectSidebars: [
          ['Name', 'Data'],
          ['`git-status-click`', ''],
        ],
        radios: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The value of the selected option'],
        ],
        segmentedSelectors: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The value of the selected segment'],
        ],
        selects: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The value of the selected option'],
        ],
        sortableLists: [
          ['Name', 'Data'],
          ['`itemclick`', 'The index of the clicked item'],
          ['`itemmove`', 'An object containing the currently active item, the index the item was moved over and whether it’s at the start or end of that item: { activeItem, index, isBottomHalf }'],
        ],
        tabs: [
          ['Name', 'Data'],
          ['`add-tab`', ''],
          ['`update:modelValue`', 'The index of the new active tab'],
        ],
        tabContent: [
          ['Name', 'Data'],
          ['`split-close`', ''],
          ['`split-closed`', ''],
        ],
        tagInputs: [
          ['Name', 'Data'],
          ['`blur`', ''],
          ['`focus`', ''],
          ['`update:modelValue`', 'The new array of tags'],
        ],
        textareas: [
          ['Name', 'Data'],
          ['`update:modelValue`', 'The new content in the specified output format'],
        ],
        toggles: [
          ['Name', 'Data'],
          ['`update:modelValue`', '`!value`'],
        ],
      },
      fileContent: null,
      iconPickertest: null,
      idCounter: 0,
      internalLinkTest: null,
      itemListTest: [],
      modalVisible: false,
      modalVisible2: false,
      modalVisible3: false,
      modalVisible4: false,
      numTest: '',
      permissionListTest: {},
      popover: null,
      popover2: null,
      popoverFromRight: false,
      props: {
        asyncImages: [
          ['Name', 'Type', 'Default', 'Allowed Values'],
          ['`alt`', 'String', '`undefined`', ''],
          ['`placeholderColor`', 'String', '`undefined`', 'A valid CSS color'],
          ['`showLoader`', 'Boolean', '`false`', ''],
          ['`src`', 'String', '`undefined`', 'Path to an image'],
        ],
        avatarUploaders: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`compression`', 'Number', '`0.45`', ''],
          ['`size`', 'Number', '`128`', 'The width of the avatar in px'],
        ],
        buttons: [
          ['Name', 'Type', 'Default', 'Allowed Values'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`disabled`', 'Boolean', '`false`', ''],
          ['`icon`', 'String', '', 'A valid icon name'],
          ['`icon-first`', 'Boolean', '`true`', ''],
          ['`loading`', 'Boolean', '`false`', ''],
          ['`rounded`', 'Boolean', '`false`', ''],
          ['`tooltip`', 'String / Object', '', ''],
          ['`type`', 'String', '', 'negative, positive, primary, warning'],
        ],
        checkboxes: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`disabled`', 'Boolean', '`false`'],
          ['`modelValue`', 'Boolean', '`false`'],
        ],
        checkboxGroups: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`checkboxes`', 'Array', '`[]`', 'Should be an array of { disabled, label, value } objects'],
          ['`dark`', 'Boolean', '`false`'],
          ['`inline`', 'Boolean', '`false`'],
          ['`modelValue`', 'Array', '`undefined`'],
        ],
        chips: [
          ['Name', 'Type', 'Default'],
          ['`color`', 'String', '`\'accent\'`'],
          ['`label`', 'String', '`undefined`'],
          ['`loading`', 'Boolean', '`false`'],
        ],
        colorPickers: [
          ['Name', 'Type', 'Default', 'Allowed Values'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`format`', 'String', '`hex`', 'hex, rgb, rgba'],
          ['`hideLabel`', 'Boolean', '`false`', ''],
          ['`modelValue`', 'String', '', ''],
          ['`palette`', 'Array', '`undefined`', 'Valid hex or rgb colors'],
          ['`paletteOnly`', 'Boolean', '`false`', ''],
          ['`removable`', 'Boolean', '`false`', ''],
        ],
        contextMenus: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`fromRight`', 'Boolean', '`false`'],
          ['`options`', 'Array', '`[]`'],
          ['`show`', 'Boolean', '`false`'],
          ['`stealFocus`', 'Boolean', '`true`'],
          ['`target`', 'HTMLElement', ''],
          ['`x`', 'Number', '`0`'],
          ['`y`', 'Number', '`0`'],
        ],
        datePickers: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`format`', 'String', '`ms`'],
          ['`label`', 'String', '`undefined`'],
          ['`max`', 'String, Number', '`undefined`'],
          ['`min`', 'String, Number', '`undefined`'],
          ['`modelValue`', 'String, Number', ''],
          ['`only`', 'String', '`undefined`'],
          ['`placeholder`', 'String', 'Choose a date…'],
          ['`removable`', 'Boolean', '`false`'],
          ['`showTime`', 'Boolean', '`false`'],
        ],
        editableLists: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`forceMode`', 'String', '`undefined`'],
          ['`modelValue`', 'Array, Object', '`undefined`'],
          ['`relativeToRoot`', 'Boolean', '`false`'],
          ['`rootPath`', 'String', '`\'/\'`'],
        ],
        entityCreationModals: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`fileContent`', 'String', '`undefined`', 'The text-content that should be written into the new file'],
          ['`fileExtension`', 'String or Array', '`undefined`', 'Either a single file extension such as json, or an array of them'],
          ['`only`', 'String', '`undefined`', 'Should be either ‘file’ or ‘directory’, will allow only the creation of the specified entity'],
          ['`path`', 'String, Object', '`/`', 'The path where the entity should be created. Passing an object allows passing different paths based on what entity is created. Format: { file: path, folder: path}'],
          ['`title`', 'String', "`'Create new…'`", ''],
          ['`visible`', 'Boolean', '`false`', ''],
        ],
        entityMoveModals: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`oldPath`', 'String', '`undefined`', 'The path to the entity that is to be modified'],
          ['`prettyFilenames`', 'Boolean', '`false`', 'If active, filenames will have their extensions stripped and dashes converted to spaces'],
          ['`root`', 'String', '`\'/\'`', 'The uppermost path to which entities can be moved'],
          ['`title`', 'String', '`\'Move to…\'`', ''],
          ['`visible`', 'Boolean', '`false`', ''],
        ],
        entityRenameModals: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`oldPath`', 'String', '`undefined`', 'The path to the entity that is to be modified'],
          ['`title`', 'String', '`\'Rename…\'`', ''],
          ['`visible`', 'Boolean', '`false`', ''],
        ],
        fileLists: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`action`', 'Object', '', 'Takes Button Props and a Label and Callback, will be shown at the top right as a primary action such as "create new" and "move here" (called with currentPath)'],
          ['`activeFile`', 'String', '`undefined`', 'Will highlight the file with the given path'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`draftsDir`', 'String', '`undefined`', 'If passed, files in the drafts dir will be shown in the list alongside other content, but marked as drafts'],
          ['`emptyState`', 'String, Object', '`{ noFiles: \'There are no files in this directory\', noFolders: \'There are no folders in this directory\', empty: \'This directory is empty\' }`', 'If a string is passed, all three states will show that string'],
          ['`fileActions`', 'Array', '`[]`', 'Takes objects with Context-Menu options including an action, which will be called with the file’s path. If filesOnly / foldersOnly are specified for an action, it will only show up in the respective type’s menu. If there’s only one, it’ll be displayed instead of the overflow menu'],
          ['`flieListLabel`', 'String', '`\'Files\'`', ''],
          ['`filetypes`', 'Array', '`undefined`', 'Supply an array of file endings (no dot) to limit what types of files will be shown'],
          ['`filterable`', 'Boolean', '`true`', ''],
          ['`foldersFirst`', 'Boolean', '`true`', ''],
          ['`foldersOnly`', 'Boolean', '`false`', ''],
          ['`initialPath`', 'String', '`undefined`', 'Make sure it’s under root, it will not be validated, but allows setting the path the list should initially be on'],
          ['`initialSortBy`', 'String', "`'name'`", 'Allowed values: name, edited'],
          ['`initialReverseSortOrder`', 'Boolean', '`false`', 'If true, the entities will be sorted in descending order initially'],
          ['`onlyImages`', 'Boolean', '`false`', 'If true, only entities matching the image regexp will be shown (filetypes loses its effect)'],
          ['`prettyFilenames`', 'Booelan', '`false`', 'If set, all names will have dashes replaced with spaces and their extension removed'],
          ['`root`', 'String', '`/`', 'The root folder to start in, will not allow going higher than that'],
          ['`showHidden`', 'Boolean', '`false`', 'By default all files starting with a . are hidden. If this is true, they’ll be shown. .git is always hidden'],
          ['`sortable`', 'Boolean', '`true`', ''],
        ],
        filePickers: [
          ['Name', 'Type', 'Default'],
          ['`allowUpload`', 'Boolean', '`false`'],
          ['`dark`', 'Boolean', '`false`'],
          ['`emptyState`', 'String, Object', '`{ noFiles: \'There are no files in this directory\', noFolders: \'There are no folders in this directory\', empty: \'This directory is empty\' }`', 'If a string is passed, all three states will show that string'],
          ['`filetypes`', 'Array', '`undefined`'],
          ['`foldersFirst`', 'Boolean', '`true`'],
          ['`maxSize`', 'Number', '`undefined`'],
          ['`mode`', 'String', '`folder`'],
          ['`modelValue`', 'String', ''],
          ['`placeholder`', 'String', '`undefined`'],
          ['`prettyFilenames`', 'Boolean', '`false`'],
          ['`relativeToRoot`', 'Boolean', '`false`'],
          ['`removable`', 'Boolean', '`false`'],
          ['`root`', 'String', '`/`'],
          ['`showHidden`', 'Boolean', '`false`'],
        ],
        gitLoginModals: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`message`', 'String', '`undefined`', 'If not provided a default message will be shown instead'],
          ['`visible`', 'Boolean', '`false`', ''],
        ],
        highlightBoxes: [
          ['Name', 'Type', 'Default', 'Default / Allowed Values'],
          ['`color`', 'String', '`accent`', 'accent, negative, positive, warning'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`label`', 'String', '`undefined`', 'Please note'],
        ],
        icons: [
          ['Name', 'Type', 'Default'],
          ['`icon`', 'String', "`'mattrbld'`"],
          ['`noTransition`', 'Boolean', '`false`'],
        ],
        iconPickers: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`modelValue`', 'String', '`false`'],
          ['`placeholder`', 'String', "`'mattrbld'`"],
          ['`removable`', 'Boolean', '`false`'],
        ],
        internalLinkHelpers: [
          ['Name', 'Type', 'Default'],
          ['`allowUnlinkable`', 'Boolean', '`false`'],
          ['`collectionsPath`', 'String', '`undefined`'],
          ['`dark`', 'Boolean', '`false`'],
          ['`fullPath`', 'Boolean', '`false`'],
          ['`lang`', 'String', '`undefined`'],
          ['`limitTo`', 'Array', '`undefined`'],
          ['`modelValue`', 'String', '`undefined`'],
          ['`placeholder`', 'String', '`Select a content item…`'],
          ['`removable`', 'Boolean', '`false`'],
          ['`slugify`', 'Boolean', '`true`'],
          ['`urlSuffix`', 'String', '`undefined`'],
          ['`urlTemplate`', 'String', '`undefined`'],
          ['`useFilePath`', 'Boolean', '`undefined`'],
        ],
        inputs: [
          ['Name', 'Type', 'Default'],
          ['`autofocus`', 'Boolean', '`false`'],
          ['`dark`', 'Boolean', '`false`'],
          ['`disabled`', 'Boolean', '`false`'],
          ['`error`', 'String', ''],
          ['`icon`', 'String', ''],
          ['`label`', 'String', ''],
          ['`maxLen`', 'Number', ''],
          ['`modelValue`', 'String', "`''`"],
          ['`name`', 'String', 'Random string'],
          ['`noSpinner`', 'Boolean', 'false'],
          ['`placeholder`', 'String', ''],
          ['`type`', 'String', "`'text'`"],
          ['`warn`', 'Boolean', "`'undefined'`"],
        ],
        itemLists: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`modelValue`', 'Array', '`undefined`'],
          ['`options`', 'Array', '`undefined`'],
          ['`placeholder`', 'String', ''],
        ],
        modals: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`paddedBody`', 'Boolean', '`true`'],
          ['`permanent`', 'Boolean', '`false`'],
          ['`slim`', 'Boolean', '`false`'],
          ['`title`', 'String', '`\'\'`'],
          ['`visible`', 'Boolean', '`false`'],
        ],
        modalOverlays: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
        ],
        palettes: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`format`', 'String', '`undefined`'],
          ['`modelValue`', 'Array', '`undefined`'],
        ],
        permissionsLists: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`modelValue`', 'Object', '`undefined`', 'An object with a role matching to an array of permissions'],
          ['`permissions`', 'Array', '`undefined`', 'Either a string array or a label/value object'],
          ['`roles`', 'Array', '`undefined`', 'Either a string array or a label/value object'],
        ],
        popovers: [
          ['Name', 'Type', 'Default'],
          ['`centerX`', 'Boolean', '`false`'],
          ['`centerY`', 'Boolean', '`false`'],
          ['`dark`', 'Boolean', '`false`'],
          ['`fromRight`', 'Boolean', '`false`'],
          ['`noContentPadding`', 'Boolean', '`false`'],
          ['`stealFocus`', 'Boolean', '`true`'],
          ['`updateOnResize`', 'Boolean', '`undefined`'],
          ['`visible`', 'Boolean', '`false`'],
          ['`x`', 'Number', '`0`'],
          ['`y`', 'Number', '`0`'],
        ],
        progressBars: [
          ['Name', 'Type', 'Default'],
          ['`colors`', 'Array', '`undefined`'],
          ['`dark`', 'Boolean', '`false`'],
          ['`indetermined`', 'Boolean', '`false`'],
          ['`label`', 'String', '`\'\'`'],
          ['`progress`', 'Number', '`0`'],
        ],
        projectAvatars: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`avatar`', 'String', '`undefined`', 'Image URL'],
          ['`projectId`', 'String', '`undefined`', 'The ID of the project (required)'],
          ['`projectName`', 'String', '`undefined`', ''],
        ],
        projectCards: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`avatar`', 'String', '`undefined`', 'Image URL'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`id`', 'String', '`undefined`', 'The ID of the project, used for opening the project, etc. (required)'],
          ['`localChanges`', 'Boolean', '`undefined`', 'Can be used to show a little marker that the project has un-pushed changes'],
          ['`name`', 'String', '`undefined`', 'The name of the project'],
          ['`updatedAt`', 'Number', '`undefined`', 'When the project was last modified'],
        ],
        projectSidebars: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`gitStatus`', 'Object', '`{}`', 'An object of this shape: { color, label, loading, message }'],
        ],
        radios: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`inline`', 'Boolean', '`false`'],
          ['`modelValue`', 'Any', '`undefined`'],
          ['`options`', 'Array', '`undefined`'],
        ],
        scrollers: [
          ['Name', 'Type', 'Default', 'Allowed Values'],
          ['`direction`', 'String', "`'horizontal'`", 'horizontal, vertical'],
        ],
        segmentedSelectors: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`modelValue`', 'Any', '`undefined`'],
          ['`options`', 'Array', '`undefined`'],
        ],
        selects: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`allowNull`', 'Boolean', '`false`', 'If false shows the placeholder when the value is null'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`disabled`', 'Boolean', '`false`', ''],
          ['`filterable`', 'Boolean', '`false`', ''],
          ['`loading`', 'Boolean', '`false`', ''],
          ['`modelValue`', 'Any', '`null`', ''],
          ['`options`', 'Array', '`false`', 'Should be an array of objects like { label: String, value: Any, disabled: Boolean }'],
          ['`placeholder`', 'String', "`'Select something…'`", 'Will only be shown if modelValue === null'],
          ['`refocus`', 'Boolean', '`true`', 'By default the button toggling the popover gets refocussed after the popover closes, but if this causes issues (like in the editor toolbar), this prop can be used to deactivated that behaviour'],
          ['`rounded`', 'Boolean', '`false`', ''],
          ['`tooltip`', 'String / Object', '', ''],
        ],
        snackbars: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
        ],
        sortableLists: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`direction`', 'String', '`\'vertical\'`', 'Allowed values: vertical, horizontal'],
          ['`enableTransitions`', 'Boolean', '`false`', 'If true, move and enter/leave transitions will be added to the items'],
          ['`items`', 'Array', '`undefined`', ''],
          ['`keyName`', 'String', '`undefined`', 'If passed, the items will be keyed according to the value of the property with that key in every item of items'],
        ],
        tables: [
          ['Name', 'Type', 'Default'],
          ['`data`', 'Array', '`[]`'],
        ],
        tabs: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`modelValue`', 'Number', ''],
          ['`showAddOption`', 'Boolean', '`false`'],
          ['`tabs`', 'Array', '`[]`'],
        ],
        tabContent: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`padded`', 'Boolean', '`true`'],
          ['`showSplit`', 'Boolean', '`false`'],
        ],
        tagInputs: [
          ['Name', 'Type', 'Default'],
          ['`allowUnsuggested`', 'Boolean', '`false`'],
          ['`autocompleteModel`', 'Array', '`undefined`'],
          ['`autocompleteProperty`', 'String', '`undefined`'],
          ['`dark`', 'Boolean', '`false`'],
          ['`label`', 'String', '`undefined`'],
          ['`max`', 'Number', '`undefined`'],
          ['`min`', 'Number', '`undefined`'],
          ['`modelValue`', 'Array', '`[]`'],
          ['`placeholder`', 'String', '`New Tag…`'],
          ['`valueProperty`', 'String', '`undefined`'],
        ],
        textareas: [
          ['Name', 'Type', 'Default', 'Notes'],
          ['`allowNewLines`', 'Boolean', '`true`', 'Ignored if outputFormat !== \'text\', use formats in that case'],
          ['`allowRaw`', 'Boolean', '`false`', 'Allow raw code editing when outputFormat !== \'text\''],
          ['`codeLangs`', 'Array', "`['html', 'css', 'javascript', 'markdown']`", 'What code langauges should be available when formatting code blocks'],
          ['`dark`', 'Boolean', '`false`', ''],
          ['`disabled`', 'Boolean', '`false`', ''],
          ['`error`', 'String', '`\'\'`', ''],
          ['`formatOptions`', 'Object', '`{ minHeading: 1, maxHeading: 6, allowQuoteFooters: true, allowNestedLists: true }`', ''],
          ['`formats`', 'Object', "`{ block: ['blockquote', 'codeBlock', 'heading', 'hr', 'orderedList', 'unorderedList'], inline: ['br', 'code', 'em', 'link', 'strike', 'strong'] }`", 'List of allowed formats for non-text editors. Set block to false to get an inline-only editor.'],
          ['`inputRuleOptions`', 'Object', "`{ autoquotes: '“”‘’', dashes: true, ellipsis: true, minHeading: 1, maxHeading: 6, noDoubleCaps: true, noDoubleSpace: true, }`", 'Configuration for input rules.'],
          ['`label`', 'String', '', ''],
          ['`lang`', 'String', '`undefined`', 'If passed can be used to have the LinkPopover look up values in localised fields'],
          ['`linkOptions`', 'Object', '`{ collectionsPath: null, forceBlankTarget: false, forceNofollow: false, only: null, urlSuffix: null, urlTemplate: null, useFilePath: false }`', 'See notes below'],
          ['`maxLen`', 'Number', '', ''],
          ['`modelValue`', 'String', '', 'Will be either text / html / markdown depending on outputFormat'],
          ['`outputFormat`', 'String', "`'text'`", 'Allowed values: text, html, markdown'],
          ['`placeholder`', 'String', '', ''],
          ['`warn`', 'Boolean', '`undefined`', 'Show errors in a warning color'],
        ],
        toasts: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`toast`', 'Object', '`undefined`'],
        ],
        toggles: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
          ['`disabled`', 'Boolean', '`false`'],
          ['`icons`', 'Array', ''],
          ['`modelValue`', 'Boolean', '`false`'],
          ['`tooltip`', 'String', ''],
        ],
        tooltips: [
          ['Name', 'Type', 'Allowed Values'],
          ['`message`', 'String', ''],
          ['`position`', 'String', 'top, left, right, bottom'],
          ['`target`', 'HTMLElement', ''],
        ],
        userSwitchers: [
          ['Name', 'Type', 'Default'],
          ['`dark`', 'Boolean', '`false`'],
        ],
      },
      radioTest: null,
      segmentedSelectorTest: null,
      selectTest: null,
      selectOptions: [
        {
          label: 'Test',
          value: 'foo',
        },
        {
          label: 'Nothing',
          value: null,
        },
        {
          value: 'bar',
        },
        {
          value: 'bar1',
        },
        {
          value: 'bar2',
        },
        {
          value: 'bar3',
        },
        {
          value: 'bar31',
        },
        {
          value: 'bar32',
        },
        {
          value: 'bar33',
        },
        {
          value: 'bar34',
        },
        {
          value: 'bar35',
        },
        {
          value: 'bar36',
        },
        {
          value: 'bar37',
        },
        {
          value: 'bar38',
        },
        {
          value: 'bar39',
        },
        {
          value: 'absolutely crazily long and stuff',
        },
        {
          disabled: true,
          label: 'This is disabled',
          value: 'disabled',
        },
      ],
      showGitLoginModal: false,
      showEntityCreationModal: false,
      showEntityMove: false,
      showEntityRename: false,
      showFilePreviewModal: false,
      simulateLoading: false,
      slots: {
        modals: [
          ['Name', 'Default Content'],
          ['actions', ''],
        ],
        popovers: [
          ['Name', 'Default Content'],
          ['header', ''],
          ['footer', ''],
        ],
      },
      swatches: [
        'accent',
        'accent-secondary',
        'text',
        'text-secondary',
        'text-tertiary',
        'bg',
        'bg-secondary',
        'bg-tertiary',
        'text-dark',
        'text-secondary-dark',
        'text-tertiary-dark',
        'bg-dark',
        'bg-secondary-dark',
        'bg-tertiary-dark',
        'negative',
        'negative-saturated',
        'positive',
        'positive-saturated',
        'warning',
        'warning-saturated',
      ],
      tabs: [
        { label: 'Table of Contents', value: 'toc' },
        { label: 'Styles and Colors', value: 'design' },
        { label: 'Buttons', value: 'buttons' },
        { label: 'Checkboxes', value: 'checkboxes' },
        { label: 'Checkbox Groups', value: 'checkbox-groups' },
        { label: 'Chips', value: 'chips' },
        { label: 'Color Pickers', value: 'color-pickers' },
        { label: 'Color Palettes', value: 'palettes' },
        { label: 'Context Menus', value: 'context-menus' },
        { label: 'Date Pickers', value: 'date-pickers' },
        { label: 'Editable Lists', value: 'editable-lists' },
        { label: 'File Lists', value: 'file-lists' },
        { label: 'File Pickers', value: 'file-pickers' },
        { label: 'Highlight Boxes', value: 'highlight-boxes' },
        { label: 'Icons', value: 'icons' },
        { label: 'Icon Pickers', value: 'icon-pickers' },
        { label: 'Inputs', value: 'inputs' },
        { label: 'Item Lists', value: 'item-lists' },
        { label: 'Loaders', value: 'loaders' },
        { label: 'Modals', value: 'modals' },
        { label: 'Permissions Lists', value: 'permissions-lists' },
        { label: 'Popovers', value: 'popovers' },
        { label: 'Progress Bars', value: 'progress-bars' },
        { label: 'Project Avatars', value: 'project-avatars' },
        { label: 'Project Cards', value: 'project-cards' },
        { label: 'Radio Groups', value: 'radios' },
        { label: 'Scrollers', value: 'scrollers' },
        { label: 'Segmented Selectors', value: 'segmented-selectors' },
        { label: 'Select Boxes', value: 'selects' },
        { label: 'Sortable Lists', value: 'sortable-lists' },
        { label: 'Tables', value: 'tables' },
        { label: 'Tabs', value: 'tabs' },
        { label: 'Tag Inputs', value: 'tag-inputs' },
        { label: 'Textareas', value: 'textareas' },
        { label: 'Toggles', value: 'toggles' },
        { label: 'Tooltips', value: 'tooltips' },
        { label: 'Utility', value: 'utility' },
      ],
      editorTest: '',
      filePickerTest: '',
      tagList: [],
      testdate: null,
      textTest: '',
      toggleTest: false,
      utilityToc: [],
    };
  },
  methods: {
    addTab() {
      this.idCounter += 1;
      this.tabs.push({ label: `Untitled-${this.idCounter}`, value: `untitled-${this.idCounter}` });
      this.$nextTick(() => {
        this.activeTab = this.tabs.length - 1;
      });
    },
    handleItemMove({ activeItem, index, isBottomHalf }) {
      const currentIndex = this.colorPalette.indexOf(activeItem);
      let newIndex;
      if ((currentIndex < index && isBottomHalf) || (currentIndex > index && !isBottomHalf)) newIndex = index;
      else if (currentIndex < index && !isBottomHalf) newIndex = Math.max(0, index - 1);
      else if (currentIndex > index && isBottomHalf) newIndex = Math.min(index + 1, this.colorPalette.length - 1);

      if (newIndex !== currentIndex) this.colorPalette.splice(newIndex, 0, this.colorPalette.splice(currentIndex, 1)[0]);
    },
    handleLoginModal(data) {
      if (data) this.$store.commit('addToast', { message: `Submitted login as ${data.user} opting to ${data.savePassword ? '' : 'not'} save the password.`, type: 'positive' });
      else this.$store.commit('addToast', { message: 'Login cancelled', type: 'negative' });
      this.showGitLoginModal = false;
    },
    moveEntity(path) {
      this.entityBeingModified = path;
      this.showEntityMove = true;
    },
    renameEntity(path) {
      this.entityBeingModified = path;
      this.showEntityRename = true;
    },
    refreshFileList() {
      return this.$refs.fileList.refresh();
    },
    removeTab() {
      const lastTab = this.tabs[this.tabs.length - 1];
      if (lastTab.value.startsWith('untitled')) this.tabs.pop();
    },
    async saveCurrentFileContent() {
      await fs.writeFile(this.currentFile, this.fileContent, 'utf8');
      this.$store.commit('addToast', { message: 'File Saved!', type: 'positive' });
    },
    sayHi() {
      this.$store.commit('addToast', { message: 'Hi from Toast!' });
    },
    resetFilePreview() {
      this.currentFile = null;
      this.fileContent = null;
    },
    async previewFile(path) {
      this.currentFile = path;
      this.showFilePreviewModal = true;
      this.fileContent = await fs.readFile(this.currentFile, 'utf8');
    },
    async softDeleteFile(path) {
      this.$store.commit('addToSoftDeleted', path);
      this.$store.commit('addToast', {
        action: () => {
          this.$store.commit('removeFromSoftDeleted', path);
        },
        actionLabel: 'Undo',
        message: 'The file was soft-deleted',
        onClose: async (undone) => {
          if (undone) return;

          try {
            await rmrf(path);
            await this.refreshFileList();
          } catch (err) {
            this.$store.commit('addToast', { message: `Something went wrong while deleting the file: ${err.message}`, type: 'error' });
          } finally {
            this.$store.commit('removeFromSoftDeleted', path);
          }
        },
        timeout: 5000,
        type: 'warning',
      });
    },
  },
  props: {
    dark: Boolean,
  },
  watch: {
    activeTab(nv) {
      if (nv === this.tabs.findIndex((tab) => tab.value === 'utility') && this.utilityToc.length === 0) {
        window.setTimeout(() => {
          const headings = this.$el.querySelectorAll('h3[id]');
          this.utilityToc = Array.from(headings).map((heading) => ({ label: heading.innerText, hash: heading.id, el: heading }));
        }, 250);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
  @use '../assets/styles/breakpoints' as *;

  .components {
    padding: 2rem;

    >header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;

      >h1 {
        margin: 0;
      }
    }

    .tabs {
      margin-left: -2rem;
      margin-right: -2rem;
      max-width: calc(100% + 4rem);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .tab {
      max-width: 40rem;
      margin: 0 auto;
      padding: 8rem 0;

      &.v-enter-active,
      &.v-leave-active {
        transition: opacity 200ms ease;

        &.v-enter-from,
        &.v-leave-to {
          opacity: 0;
        }
      }

      .table-wrapper {
        @media #{$mobile} {
          padding: 0 2rem;
          margin-left: -2rem;
          margin-right: -2rem;
        }
      }

      .swatches {
        display: grid;
        grid-template-columns: repeat(2, 1fr);

        @media #{$mobile} {
          display: block;
        }
      }

      .swatch-wrapper {
        display: inline-block;

        @media #{$mobile} {
          display: block;
        }

        &:not(:last-child) {
          margin-bottom: 1rem;
        }

        .swatch {
          display: inline-flex;
          width: 4rem;
          height: 4rem;
          border-radius: 2rem;
          border: 1px solid var(--bg-secondary);
          justify-content: center;
          align-items: center;
          margin-right: 1rem;

          &.accent {
            background-color: var(--accent);
            color: var(--bg);
          }

          &.accent-secondary {
            background-color: var(--accent-secondary);
          }

          &.text {
            background-color: var(--text);
            color: var(--bg);
          }

          &.text-secondary {
            background-color: var(--text-secondary);
          }

          &.text-tertiary {
            background-color: var(--text-tertiary);
          }

          &.bg {
            background-color: var(--bg);
            color: var(--text);
          }

          &.bg-secondary {
            background-color: var(--bg-secondary);
            color: var(--text);
          }

          &.bg-tertiary {
            background-color: var(--bg-tertiary);
            color: var(--text);
          }

          &.negative {
            background-color: var(--negative);
          }

          &.negative-saturated {
            background-color: var(--negative-saturated);
            color: var(--bg);
          }

          &.positive {
            background-color: var(--positive);
          }

          &.positive-saturated {
            background-color: var(--positive-saturated);
            color: var(--bg);
          }

          &.warning {
            background-color: var(--warning);
          }

          &.warning-saturated {
            background-color: var(--warning-saturated);
          }

          &.text-dark {
            background-color: var(--text-dark);
            color: var(--text);
          }

          &.text-secondary-dark {
            background-color: var(--text-secondary-dark);
            color: var(--text);
          }

          &.text-tertiary-dark {
            background-color: var(--text-tertiary-dark);
            color: var(--text);
          }

          &.bg-dark {
            background-color: var(--bg-dark);
            color: var(--text-dark);
          }

          &.bg-secondary-dark {
            background-color: var(--bg-secondary-dark);
            color: var(--text-dark);
          }

          &.bg-tertiary-dark {
            background-color: var(--bg-tertiary-dark);
            color: var(--text-dark);
          }
        }
      }

      .typography {
        margin-top: 4rem;
      }

      &.buttons {
        .button {
          margin: 1rem;
        }
      }

      &.icons {
        .icon {
          margin: 0.5rem;
        }
      }

      &.toggles {
        .toggle {
          margin-bottom: 1rem;
        }
      }

      &.inputs {
        .input {
          margin: 1rem;
        }
      }

      &.checkboxes {
        .checkbox {
          margin-bottom: 1rem;
        }
      }

      &.checkbox-groups {
        .checkbox-group {
          margin-bottom: 1rem;
        }
      }

      &.textareas {
        .editor {
          margin-bottom: 3rem;
        }
      }

      &.loaders {

        .loader,
        .inline-loader {
          margin-bottom: 4rem;
        }
      }

      &.scrollers {
        .horiz ul {
          display: flex;
          list-style: none;
          padding: 0;
          margin: 0;

          li {
            margin-right: 1rem;
            flex-shrink: 0;
          }
        }

        .vert {
          max-height: 8rem;
        }
      }

      &.popovers {
        .toggle {
          margin-bottom: 1rem;
        }
      }

      &.selects {
        :deep(.select) {
          margin: 1rem;
        }
      }

      &.radios {
        .radio-group {
          margin-bottom: 1.5rem;
        }
      }

      &.color-pickers {
        .color-preview {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border-radius: 50%;
          margin-left: 1rem;
          margin-right: 0.5rem;
          margin-top: 0.25rem;
          vertical-align: top;
        }

        .color-picker:not(:last-of-type) {
          margin-right: 1rem;
          margin-bottom: 1rem;
        }
      }

      &.date-pickers {
        .date-picker:not(:last-of-type) {
          margin-right: 1rem;
          margin-bottom: 1rem;
        }
      }

      &.project-cards {
        .wrapper {
          display: flex;
          flex-wrap: wrap;
          background-color: var(--bg-secondary);

          &.dark {
            background-color: var(--bg-secondary-dark);
          }

          .project-card {
            margin: 1rem;
            min-width: rem(192);
            max-width: rem(320);
            flex-grow: 1;
            flex-shrink: 1;
          }
        }
      }

      &.file-lists {
        .file-list {
          margin-left: -4rem;
          margin-right: -4rem;

          @media only screen and (max-width: 64rem) {
            margin-left: -1rem;
            margin-right: -1rem;
          }
        }
      }

      &.toc {
        >ul {
          columns: 3;
          column-gap: 1rem;
          margin: 0;
          list-style: none;
          counter-reset: listCounter;

          @media #{$mobile} {
            columns: 1;
          }

          li {
            counter-increment: listCounter;
            margin-bottom: 0.5rem;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;

            &::before {
              content: counters(listCounter, '.') '. ';
              opacity: 0.38;
              font-size: 0.875rem;
            }
          }
        }
      }

      &.utility {
        h3:not(:first-of-type) {
          margin-top: 6rem;
          scroll-margin-top: 6rem;
        }

        .toc {
          &.dark {
            li::marker {
              color: var(--text-tertiary-dark);
            }
          }

          li::marker {
            font-size: 0.875rem;
            color: var(--text-tertiary);
          }
        }
      }

      &.segmented-selectors {
        .segmented-selector {
          margin-bottom: 1rem;
        }
      }

      &.file-pickers {
        .file-picker {
          margin: 0.5rem 0;
        }
      }

      &.chips {
        .chip {
          display: inline-block;
          margin-bottom: 1rem;
        }
      }

      &.sortable-lists {

        .vertical,
        .horizontal {
          border: 0.0625rem solid color-mix(in srgb, var(--text) 12%, transparent);
          border-radius: var(--radius-m);
          margin-bottom: 1rem;

          &.dark {
            border-color: color-mix(in srgb, var(--text-dark) 12%, transparent);
          }

          .sortable-list-item {
            margin: 0.5rem; // these styles only apply to the item in the list, not the clone
          }
        }

        .horizontal {
          padding: 0.25rem;
          display: flex;
          flex-wrap: wrap;

          &:deep(.drag-item) { // this way the drag item can be styled too, although it’s a bit hacky
            flex: 0 0 25%;
          }

          .sortable-list-item {
            margin: 0.25rem;
          }
        }
      }
    }
  }

  .sortable-list-item {
    display: flex;
    margin: 0.25rem;
    padding: 0.5rem;
    border: 0.0625rem solid color-mix(in srgb, var(--text) 12%, transparent);
    border-radius: var(--radius-s);
    background-color: var(--bg);
    height: calc(100% - 0.5rem);

    &.vert {
      height: auto;
      margin: 0 0.5rem; // margin-top needs to be 0 so the clone doesn’t jump when created (because of collapsing margins), but otherwise we can set margins freely
    }

    &.dark {
      border-color: color-mix(in srgb, var(--text-dark) 12%, transparent);
      background-color: var(--bg-dark);
    }

    &.active {
      opacity: 0.5;
    }

    .icon {
      margin-right: 0.5rem;
      flex-shrink: 0;
    }

    p {
      margin: 0;
    }
  }

  .file-preview-modal {
    pre {
      margin: 0;
    }
  }
</style>
