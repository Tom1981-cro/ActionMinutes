import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import { 
  TextB, TextItalic, TextStrikethrough, List, 
  ListNumbers, Link as LinkIcon, Image as ImageIcon, Quotes
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing...",
  className,
  onImageUpload
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: true }),
      Link.configure({ 
        openOnClick: false,
        autolink: true
      }),
      Placeholder.configure({ placeholder })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] p-3'
      }
    }
  });
  
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);
  
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor || !onImageUpload) return;
    
    try {
      const url = await onImageUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const addLink = () => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };
  
  if (!editor) return null;
  
  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    children 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    children: React.ReactNode 
  }) => (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-muted")}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      type="button"
    >
      {children}
    </Button>
  );
  
  return (
    <div className={cn("border rounded-md", className)}>
      <div className="flex items-center gap-1 border-b p-1 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <TextB className="h-4 w-4" weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <TextItalic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
        >
          <TextStrikethrough className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListNumbers className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <Quotes className="h-4 w-4" />
        </ToolbarButton>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <ToolbarButton onClick={addLink} active={editor.isActive('link')}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        
        {onImageUpload && (
          <>
            <ToolbarButton onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </>
        )}
      </div>
      
      <EditorContent editor={editor} />
    </div>
  );
}
