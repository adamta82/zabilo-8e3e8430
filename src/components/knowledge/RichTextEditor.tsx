import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo,
  Redo,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Code,
  Minus,
} from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('הזן כתובת קישור', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2 sticky top-0 z-10">
      <Toggle size="sm" pressed={editor.isActive('heading', { level: 1 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="כותרת 1">
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('heading', { level: 2 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="כותרת 2">
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('heading', { level: 3 })} onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="כותרת 3">
        <Heading3 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} aria-label="מודגש">
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} aria-label="נטוי">
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} aria-label="קו תחתון">
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('strike')} onPressedChange={() => editor.chain().focus().toggleStrike().run()} aria-label="קו חוצה">
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('code')} onPressedChange={() => editor.chain().focus().toggleCode().run()} aria-label="קוד">
        <Code className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} aria-label="רשימה">
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} aria-label="רשימה ממוספרת">
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive('blockquote')} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} aria-label="ציטוט">
        <Quote className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle size="sm" pressed={editor.isActive({ textAlign: 'right' })} onPressedChange={() => editor.chain().focus().setTextAlign('right').run()} aria-label="ימין">
        <AlignRight className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive({ textAlign: 'center' })} onPressedChange={() => editor.chain().focus().setTextAlign('center').run()} aria-label="מרכז">
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle size="sm" pressed={editor.isActive({ textAlign: 'left' })} onPressedChange={() => editor.chain().focus().setTextAlign('left').run()} aria-label="שמאל">
        <AlignLeft className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle size="sm" pressed={editor.isActive('link')} onPressedChange={setLink} aria-label="קישור">
        <LinkIcon className="h-4 w-4" />
      </Toggle>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="קו מפריד">
        <Minus className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} aria-label="בטל">
        <Undo className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} aria-label="חזור">
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'כתוב כאן...' }),
    ],
    content: value,
    editorProps: {
      attributes: {
        dir: 'rtl',
        class: cn(
          'article-content prose prose-sm max-w-none focus:outline-none min-h-[240px] px-4 py-3',
          'rtl:text-right'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync external value changes (e.g. when opening dialog with existing article)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    } else if (!value && current !== '<p></p>') {
      editor.commands.clearContent(false);
    }
  }, [value, editor]);

  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
