import {VnodeDOM} from 'mithril';
import {extend, override} from 'flarum/common/extend';
import app from 'flarum/forum/app';
import Post from 'flarum/common/models/Post';
import extractText from 'flarum/common/utils/extractText';
import ItemList from 'flarum/common/utils/ItemList';
import CommentPost from 'flarum/forum/components/CommentPost';
import TextEditor from 'flarum/common/components/TextEditor';
import TextEditorButton from 'flarum/common/components/TextEditorButton';

const EMOJI_BY_NUMBER = [
    '⚀',
    '⚁',
    '⚂',
    '⚃',
    '⚄',
    '⚅',
];

// Regex used against text nodes during TextFormatter preview
const ONLY_ONE_EMOJI_REGEX = /^[\n\r]*(🎲|[⚀⚁⚂⚃⚄⚅])[\n\r]*$/;

function configureTooltip(element: Element) {
    $(element).tooltip({
        container: document.body,
        placement: 'right',
    });
}

app.initializers.add('roll-die', () => {
    override(Post.prototype, 'contentHtml', function (this: Post, original: () => string) {
        const contentHtml = original();
        const rollsAsString = this.attribute('diceRolls');

        if (!rollsAsString) {
            return contentHtml;
        }

        const rolls = rollsAsString.split('');
        let index = 0;

        // We will match every die emoji alone on its line
        // A line might be wrapped in a paragraph, or have newlines before or after
        // When the <br> is before, there's an additional newline in the HTML in between
        // The first emoji needs to be outside of the [] rule because it's multi-byte
        // Positive lookahead is necessary otherwise a series of emojis separated only by newlines will only match 1/2
        return contentHtml.replace(/(<(?:br|p)>[\n\r]*)(?:🎲|[⚀⚁⚂⚃⚄⚅])(?=<(?:br|\/p)>)/gm, (match, before) => {
            const number = parseInt(rolls[index++]);

            const span = document.createElement('span');
            span.className = 'roll-a-die';
            span.dataset.number = number + '';
            span.title = extractText(app.translator.trans('clarkwinkelmann-roll-die.forum.tooltip.render', {
                number,
            }));
            span.textContent = EMOJI_BY_NUMBER[number - 1] || '⚠';

            return before + span.outerHTML;
        });
    });

    extend(CommentPost.prototype, ['oncreate', 'onupdate'], function (returnValue: any, vnode: VnodeDOM) {
        vnode.dom.querySelectorAll('.roll-a-die').forEach(element => {
            configureTooltip(element);
        });
    });

    // @ts-ignore global variables and many untyped parameters
    override(s9e.TextFormatter, 'preview', (original, text, element) => {
        original(text, element);

        let walk;
        let node;

        // Clean up existing DOM to remove any now invalid span
        walk = document.createTreeWalker(element);
        while (node = walk.nextNode()) {
            if (node instanceof HTMLElement && node.classList.contains('roll-a-die') && !ONLY_ONE_EMOJI_REGEX.test(node.textContent || '')) {
                const text = document.createTextNode(node.textContent || '');
                node.parentNode!.replaceChild(text, node);
            }
        }

        // Convert valid text nodes into the preview span
        walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const replaceQueue = [];
        while (node = walk.nextNode()) {
            // Skip if no text content to please typescript
            if (!node.textContent) {
                continue;
            }

            // Skip if parent is already the result of a span conversion
            if ((node.parentNode as HTMLElement).classList.contains('roll-a-die')) {
                continue;
            }

            if (ONLY_ONE_EMOJI_REGEX.test(node.textContent)) {
                // We have to perform the changes outside of the TreeWalker otherwise the walker just stops going further
                replaceQueue.push(node);
            }
        }

        // Despite being design to only run when new spans are needed, it seems to run on every update
        // there must be something with TextFormatter diffing that resets the spans everytime
        replaceQueue.forEach(node => {
            const span = document.createElement('span');
            span.className = 'roll-a-die preview';
            span.title = app.translator.trans('clarkwinkelmann-roll-die.forum.tooltip.preview');
            span.textContent = '⚀'; // Hard-code emoji. It's not visible anyway, and copying newlines or 3D emoji might mess things up
            node.parentNode!.replaceChild(span, node);

            configureTooltip(span);
        });
    });

    extend(TextEditor.prototype, 'toolbarItems', function (this: TextEditor, items: ItemList) {
        items.add('roll-die', m(TextEditorButton, {
            icon: 'fas fa-dice',
            onclick: () => this.attrs.composer.editor.insertAtCursor('\n🎲\n'),
        }, app.translator.trans('clarkwinkelmann-roll-die.forum.composer.rollDie')));
    });
}, 100);
// Priority must be lower than Flarum's flarum-emoji, which has default priority, so any value could work
